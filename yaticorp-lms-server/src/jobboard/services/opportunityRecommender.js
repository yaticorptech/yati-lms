/**
 * The Local Jobs recommender.
 *
 *   profile → age eligibility → safety → date match → interest match
 *           → preference history → ranked list
 *
 * The first three stages are filters and the last two are scores, and the
 * order matters: nothing is ever scored that the student may not see, so a
 * high match can never argue a hazardous listing back onto the page.
 *
 * Every number here is deterministic and traceable to a signal the student
 * actually gave — an interest they ticked, a date they asked for, a ♡ they
 * tapped. When no signal fires the score is null and the card says only
 * that the listing is open to them, rather than inventing a percentage.
 */
const { check, EMPLOYMENT_TYPES } = require('./eligibilityRules');
const { INTERESTS, CATEGORIES } = require('../data/opportunityVocab');

const WEIGHTS = { interests: 60, date: 25, soon: 15 };
const HISTORY = { likeBoost: 6, maxBoost: 15, dislikePenalty: 8, maxPenalty: 25 };

const norm = (s) => String(s || '').trim().toLowerCase();
const labelOf = (id) => (INTERESTS.find((x) => x.id === id) || CATEGORIES.find((x) => x.id === id))?.label || id;
const joinNames = (names) => {
  if (names.length <= 1) return names.join('');
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
};
const dayStart = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const dayEnd = (d) => { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; };
const shortDate = (d) => new Date(d).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });

/** Does the job run on any day inside the student's window? */
const inWindow = (opp, profile) => {
  if (!profile?.wantFrom || !profile?.wantTo) return true;
  return new Date(opp.startsAt) <= dayEnd(profile.wantTo) && new Date(opp.endsAt) >= dayStart(profile.wantFrom);
};

const historyDelta = (opp, likes, dislikes) => {
  const similar = (p) => p.category === opp.category
    || (p.interests || []).some((i) => (opp.interests || []).includes(i))
    || (p.opportunityType && p.opportunityType === opp.opportunityType && EMPLOYMENT_TYPES.includes(opp.opportunityType));
  const boost = Math.min(HISTORY.maxBoost, likes.filter(similar).length * HISTORY.likeBoost);
  const penalty = Math.min(HISTORY.maxPenalty, dislikes.filter(similar).length * HISTORY.dislikePenalty);
  return { boost, penalty };
};

/** Score one eligible job. Returns { score, reasons, signals }. */
const scoreOne = (opp, ctx) => {
  const { profile, likes, dislikes } = ctx;
  const reasons = [];
  const signals = {};
  let total = 0;
  let fired = false;

  // Interests
  const mine = new Set(profile?.interests || []);
  const tags = [...new Set([opp.category, ...(opp.interests || [])])];
  if (mine.size && tags.length) {
    const hit = tags.filter((i) => mine.has(i));
    if (hit.length) {
      fired = true;
      total += WEIGHTS.interests * Math.min(1, hit.length / Math.min(tags.length, 2));
      signals.interests = hit;
      reasons.push(`you're interested in ${joinNames(hit.map(labelOf))}`);
    }
  }

  // Dates: inside the window, and how soon
  if (profile?.wantFrom && inWindow(opp, profile)) {
    fired = true;
    total += WEIGHTS.date;
    signals.date = 'in-window';
    const sameDay = dayStart(opp.startsAt).getTime() === dayStart(opp.endsAt).getTime();
    reasons.push(sameDay
      ? `it's on ${shortDate(opp.startsAt)}, one of your dates`
      : `it runs ${shortDate(opp.startsAt)} – ${shortDate(opp.endsAt)}, inside your dates`);
  }
  const daysAway = Math.max(0, (dayStart(opp.startsAt) - dayStart(new Date())) / 86400000);
  total += WEIGHTS.soon * Math.max(0, 1 - daysAway / 60);

  // History: ♡ boosts, ✕ penalises
  const { boost, penalty } = historyDelta(opp, likes, dislikes);
  if (boost) {
    fired = true;
    total += boost;
    signals.history = 'liked-similar';
    reasons.push('it\'s similar to jobs you marked interested');
  }
  if (penalty) {
    total -= penalty;
    signals.history = signals.history ? 'mixed' : 'disliked-similar';
  }

  const score = fired ? Math.max(0, Math.min(100, Math.round(total))) : null;
  return { score, reasons, signals };
};

/**
 * Run the pipeline over a pool. `filters` are the student's own (search box,
 * category, verified-only, "show other dates") and are applied AFTER the
 * safety stages so the exclusion counts describe policy, not taste.
 */
const recommend = (pool, ctx, filters = {}) => {
  const excluded = { age: 0, safety: 0, verification: 0, closed: 0, dates: 0, past: 0, dismissed: 0, filters: 0 };
  const dismissed = new Set(ctx.dislikes.map((p) => String(p.opportunityId)));
  const q = norm(filters.q);
  const today = dayStart(new Date());
  const results = [];

  for (const opp of pool) {
    const gate = check(opp, ctx);
    if (!gate.ok) {
      if (gate.rule === 'age') excluded.age += 1;
      else if (gate.rule === 'safety') excluded.safety += 1;
      else if (gate.rule === 'verification') excluded.verification += 1;
      else excluded.closed += 1;
      continue;
    }
    if (new Date(opp.endsAt) < today) { excluded.past += 1; continue; }
    if (!filters.anyDate && !inWindow(opp, ctx.profile)) { excluded.dates += 1; continue; }
    if (dismissed.has(String(opp._id)) && !filters.includeDismissed) { excluded.dismissed += 1; continue; }

    if (filters.category && opp.category !== filters.category) { excluded.filters += 1; continue; }
    if (filters.type && opp.opportunityType !== filters.type) { excluded.filters += 1; continue; }
    if (filters.verifiedOnly && !opp.verified) { excluded.filters += 1; continue; }
    if (filters.interest && !(opp.interests || []).includes(filters.interest) && opp.category !== filters.interest) { excluded.filters += 1; continue; }
    if (q) {
      const hay = [opp.title, opp.organization?.name, opp.description, opp.location?.area, opp.location?.landmark, opp.category, ...(opp.skills || [])].map(norm).join(' ');
      if (!hay.includes(q)) { excluded.filters += 1; continue; }
    }

    results.push({ opp, ...scoreOne(opp, ctx) });
  }

  results.sort((a, b) => {
    const sa = a.score ?? -1, sb = b.score ?? -1;
    if (sb !== sa) return sb - sa;
    return new Date(a.opp.startsAt) - new Date(b.opp.startsAt);
  });

  return { results, excluded };
};

module.exports = { recommend, scoreOne, inWindow, WEIGHTS };
