/**
 * Part-time jobs near a place, from Google Jobs through the JSearch API —
 * the same metered provider the job board ingests from. One question per
 * place per few hours; the answer is cached so browsing costs nothing.
 */
const ApiUsage = require('../models/ApiUsage');
const PartTimeWebCache = require('../models/PartTimeWebCache');
const { resolvePlace } = require('./geoService');

const HOST_DEFAULT = 'jsearch.p.rapidapi.com';
const MONTHLY_LIMIT = Number(process.env.JSEARCH_MONTHLY_LIMIT || 180);
const FRESH_MS = 6 * 60 * 60 * 1000;
// A student is waiting on this one with a spinner, so it gets longer than the
// background ingest: Google Jobs regularly takes 10–15s to answer a fresh place.
const TIMEOUT_MS = 25000;
const PAGES = Number(process.env.JSEARCH_PARTTIME_PAGES || 1);

const usageKey = () => `jsearch:${new Date().toISOString().slice(0, 7)}`;
const remaining = async () => { try { const row = await ApiUsage.findOne({ key: usageKey() }).lean(); return Math.max(0, MONTHLY_LIMIT - (row?.calls ?? 0)); } catch { return MONTHLY_LIMIT; } };
const record = async () => { try { await ApiUsage.updateOne({ key: usageKey() }, { $inc: { calls: 1 }, $setOnInsert: { provider: 'jsearch', month: new Date().toISOString().slice(0, 7) } }, { upsert: true }); } catch { /* one lost tick */ } };

const stableId = (s) => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h.toString(36); };
const daysAgo = (ts) => { const t = ts ? Number(ts) * 1000 : NaN; return Number.isFinite(t) ? Math.max(0, Math.round((Date.now() - t) / 86400000)) : null; };
const salaryOf = (j) => {
  if (j.job_salary_string) return j.job_salary_string;
  const { job_min_salary: min, job_max_salary: max, job_salary_currency: cur, job_salary_period: per } = j;
  if (!min && !max) return '';
  const f = (n) => Number(n).toLocaleString('en-IN');
  return `${cur || ''} ${min && max ? `${f(min)}–${f(max)}` : f(min || max)}${per ? ` / ${String(per).toLowerCase()}` : ''}`.trim();
};
// A listing's own words, trimmed to a couple of lines. The full text runs to
// pages of boilerplate; the card only needs enough to tell what the work is.
const summarise = (text) => {
  const clean = String(text || '').replace(/\s+/g, ' ').replace(/^[-•*\s]+/, '').trim();
  if (!clean) return '';
  if (clean.length <= 210) return clean;
  const cut = clean.slice(0, 210);
  const stop = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '));
  return (stop > 120 ? cut.slice(0, stop + 1) : `${cut.trimEnd()}…`);
};

// "Qualifications" reads as the closest thing to what the local cards call
// requirements, and is far shorter than the description.
const highlightsOf = (j) => {
  const h = j.job_highlights || {};
  const list = h.Qualifications || h.Responsibilities || [];
  return list.slice(0, 3).map((x) => summarise(x)).filter(Boolean);
};

// Some employers paste a bulleted list into the title field. One line, no
// leading dashes, and short enough to sit on a card.
const cleanTitle = (t) => {
  const one = String(t || '').replace(/\s*[\r\n]+\s*/g, ' · ').replace(/\s+/g, ' ').replace(/^[\s·\-–—•*]+/, '').trim();
  return one.length > 90 ? `${one.slice(0, 88).trimEnd()}…` : one;
};

const row = (j) => ({
  id: `g:${stableId(j.job_apply_link || j.job_google_link || j.job_id)}`,
  title: cleanTitle(j.job_title),
  company: j.employer_name || '',
  logo: j.employer_logo || '',
  location: [j.job_city, j.job_state, j.job_country].filter(Boolean).join(', '),
  type: 'Part-time',
  remote: !!j.job_is_remote,
  salary: salaryOf(j),
  daysAgo: daysAgo(j.job_posted_at_timestamp),
  description: summarise(j.job_description),
  highlights: highlightsOf(j),
  publisher: j.job_publisher || '',
  url: j.job_apply_link || j.job_google_link,
  googleUrl: j.job_google_link || '',
  source: 'Google Jobs'
});

const placeLabel = (p) => p.label || [p.city, p.state, p.country].filter(Boolean).join(', ');

/* ── What to ask Google ───────────────────────────────────────────────────

   Google's job search answers one topic at a time. "catering OR packing OR
   event helper" returns nothing; "packing jobs in Mangalore" returns picker,
   packer and packaging-boy listings — exactly the hands-on local work this
   section is for. The place has to be the plain city name too: "Mangaluru,
   Karnataka, India" finds far less than "Mangalore".

   So: one broad part-time question every time, plus one local trade per
   fetch, taken in turn. Each fetch costs two metered calls, and the answers
   accumulate on the place's cache row — so a town builds up a spread of
   catering, packing, event and shop work over a day rather than paying for
   ten questions at once.
------------------------------------------------------------------------- */
const LOCAL_TRADES = [
  'packing helper', 'catering', 'event', 'delivery', 'shop assistant',
  'housekeeping cleaning', 'promoter', 'kitchen helper', 'data entry', 'receptionist',
  // The local trades a neighbourhood actually posts, rotated the same way.
  'house help', 'cook', 'babysitter', 'caretaker', 'dog walker', 'gardener',
  'farm worker', 'car wash', 'laundry ironing', 'tailor', 'salon helper', 'bakery helper',
  'canteen helper', 'tea stall', 'vegetable shop', 'newspaper delivery', 'milk delivery',
  'xerox shop', 'mobile repair shop', 'painter helper', 'construction helper', 'loading unloading',
  'tent house', 'security guard', 'parking attendant', 'survey field', 'typist', 'gym helper'
];

// Below this, a town is not carrying the section on its own and the search
// widens to the state around it. Small places genuinely have little posted
// online; an empty page is worse than a handful from thirty miles away.
const THIN_RESULT = 6;

// How long an accumulated listing is worth keeping. Google only answers for
// the last month, so anything older than this was posted before that window
// and is very likely filled.
const KEEP_DAYS = 21;

// A vacancy a student can actually take alongside their studies. The broad
// query is already filtered to part-time; the trade queries are not, because
// filtering them returns nothing at all — so they are judged on what they say.
const STUDENT_SUITABLE = /\b(part[\s-]?time|parttime|daily wage|per day|hourly|weekend|evening|shift basis|freelance|intern|trainee|temporary|contract|helper|walk[\s-]?in)\b/i;
const SUITABLE_TYPES = new Set(['PARTTIME', 'CONTRACTOR', 'INTERN', 'TEMPORARY']);

const typeOf = (j) => {
  const raw = String(j.job_employment_type || (j.job_employment_types || []).join(' ')).toUpperCase();
  if (raw.includes('PARTTIME') || raw.includes('PART_TIME')) return 'PARTTIME';
  for (const t of SUITABLE_TYPES) if (raw.includes(t)) return t;
  return raw.includes('FULLTIME') ? 'FULLTIME' : '';
};

const TYPE_LABEL = { PARTTIME: 'Part-time', CONTRACTOR: 'Contract', INTERN: 'Internship', TEMPORARY: 'Temporary', FULLTIME: 'Full-time' };

const suitable = (j) => {
  const type = typeOf(j);
  if (type && type !== 'FULLTIME') return true;
  return STUDENT_SUITABLE.test(`${j.job_title || ''} ${String(j.job_description || '').slice(0, 600)}`);
};

/** One page of one question. Returns the rows it could use. */
const askGoogle = async ({ host, key, query, partTimeOnly, countryCode, cursor }) => {
  const url = `https://${host}/search-v2?` + new URLSearchParams({
    query,
    ...(partTimeOnly ? { employment_types: 'PARTTIME' } : {}),
    date_posted: 'month',
    ...(countryCode ? { country: countryCode.toLowerCase() } : {}),
    ...(cursor ? { cursor } : {})
  });
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { Accept: 'application/json', 'X-RapidAPI-Key': key, 'X-RapidAPI-Host': host } });
    await record();
    if (!res.ok) throw new Error(`Google Jobs answered HTTP ${res.status}`);
    const data = await res.json();
    return { jobs: data?.data?.jobs ?? [], cursor: data?.data?.cursor ?? '' };
  } finally {
    clearTimeout(timer);
  }
};

/**
 * Part-time work near a place: Google's answer, accumulated and cached.
 * @returns {{ place, results, fetchedAt, cached, unavailable }}
 */
const partTimeNear = async (locationInput, { refresh = false } = {}) => {
  const key = process.env.JSEARCH_RAPIDAPI_KEY;
  const place = await resolvePlace(String(locationInput || '').trim());
  if (!place || !place.city) return { place: null, results: [], fetchedAt: null, cached: false, unavailable: 'That place was not recognised. Try the nearest town or city.' };
  const plc = { city: place.city, state: place.state || '', country: place.country || '', countryCode: place.countryCode || '', label: placeLabel(place) };
  const cacheKey = `${plc.city}|${plc.state}|${plc.countryCode || plc.country}`.toLowerCase();

  const hit = await PartTimeWebCache.findOne({ key: cacheKey }).lean().catch(() => null);
  const kept = (hit?.results || []).filter((r) => (r.daysAgo == null || r.daysAgo <= KEEP_DAYS));
  if (hit && !refresh && Date.now() - new Date(hit.fetchedAt).getTime() < FRESH_MS) {
    return { place: hit.place, results: kept, fetchedAt: hit.fetchedAt, cached: true, widened: hit.widened || '' };
  }
  if (!key) return { place: plc, results: kept, fetchedAt: hit?.fetchedAt || null, cached: !!hit, unavailable: kept.length ? '' : 'Google Jobs is not configured on this server.' };
  if ((await remaining()) < 1) return { place: plc, results: kept, fetchedAt: hit?.fetchedAt || null, cached: !!hit, unavailable: kept.length ? '' : "This month's allowance for Google Jobs is used up. Try again next month." };

  const host = process.env.JSEARCH_RAPIDAPI_HOST || HOST_DEFAULT;
  // The plain city name: Google's job index knows "Mangalore", not
  // "Mangaluru, Karnataka, India".
  const where = plc.city;
  const rotation = Number(hit?.rotation || 0);
  const trade = LOCAL_TRADES[rotation % LOCAL_TRADES.length];

  const questions = [
    { query: `part time jobs in ${where}`, partTimeOnly: true },
    { query: `${trade} jobs in ${where}`, partTimeOnly: false }
  ];

  const fresh = [];
  const seen = new Set(kept.map((r) => r.id));
  let failure = null;
  let widened = '';

  const ask = async (q, wider) => {
    if ((await remaining()) < 1) return;
    let cursor = '';
    for (let page = 0; page < Math.max(1, PAGES); page++) {
      let answer;
      try {
        answer = await askGoogle({ host, key, ...q, countryCode: plc.countryCode, cursor });
      } catch (err) {
        failure = err;
        return;
      }
      for (const j of answer.jobs) {
        if (!j.job_title || !(j.job_apply_link || j.job_google_link)) continue;
        if (!suitable(j)) continue;
        const r = { ...row(j), typeLabel: TYPE_LABEL[typeOf(j)] || 'Part-time', wider: wider || false };
        if (seen.has(r.id)) continue;
        seen.add(r.id);
        fresh.push(r);
      }
      cursor = answer.cursor;
      if (!cursor || !answer.jobs.length) break;
    }
  };

  for (const q of questions) await ask(q, false);

  // A thin answer means the town is small, not that there is no work. One
  // more question over the state around it, and those rows say where they
  // came from so nobody drives to the wrong district expecting a shift.
  // resolvePlace does not always fill `state`, but the label it builds
  // usually reads "Town, State, Country" — the middle of it is what a
  // student can realistically travel to.
  const labelParts = String(plc.label || '').split(',').map((x) => x.trim()).filter(Boolean);
  const around = plc.state || (labelParts.length >= 3 ? labelParts[labelParts.length - 2] : '') || plc.country;
  if (fresh.length + kept.length < THIN_RESULT && around && around !== where) {
    await ask({ query: `part time jobs in ${around}`, partTimeOnly: true }, true);
    if (fresh.some((r) => r.wider)) widened = around;
  }

  if (!fresh.length && failure && !kept.length) {
    const e = new Error(failure.name === 'AbortError' ? 'Google Jobs took too long to answer. Try again in a moment.' : failure.message);
    e.status = 502;
    throw e;
  }

  // New answers join what the place already had, newest first, so a town
  // gathers a spread of trades instead of swapping one for the next.
  const merged = [];
  const ids = new Set();
  for (const r of [...fresh, ...kept]) {
    if (ids.has(r.id)) continue;
    ids.add(r.id);
    merged.push(r);
  }
  merged.sort((a, b) => (a.daysAgo ?? 99) - (b.daysAgo ?? 99));

  const fetchedAt = new Date();
  await PartTimeWebCache.updateOne(
    { key: cacheKey },
    { $set: { place: plc, results: merged.slice(0, 60), fetchedAt, rotation: rotation + 1, widened } },
    { upsert: true }
  ).catch(() => {});
  return { place: plc, results: merged, fetchedAt, cached: false, widened, unavailable: '' };
};

module.exports = { partTimeNear };

/**
 * Which of the local vocabulary's categories a web listing belongs to, from
 * its title and employer. Google Jobs has no category of its own, and a
 * merged list is only useful if both sources file under the same headings.
 */
const CATEGORY_RULES = [
  ['tutoring', /\b(tutor|tuition|teacher|teaching|trainer|coach|faculty|instructor|lecturer|mentor|academy|classes)\b/i],
  // Rounds and tent work are named before delivery and events, or the broad
  // rules claim them and the student who ticked the specific line never matches.
  ['newspaper', /\b(newspaper|paper delivery|milk|milkman|morning round)\b/i],
  ['tenthouse', /\b(tent|mandap|pandal|shamiana|light ?and ?sound|dj|sound system|stage)\b/i],
  ['delivery', /\b(deliver|delivery|driver|rider|courier|logistic|dispatch|swiggy|zomato|zepto|blinkit)\b/i],
  ['catering', /\b(cater|waiter|waitress|steward|server|kitchen|chef|cook|barista|food|restaurant|hotel)\b/i],
  ['events', /\b(event|wedding|function|usher|anchor|host|hostess|banquet|exhibition)\b/i],
  ['photography', /\b(photo|photograph|videograph|camera|cinemato|editor|editing|design|graphic|content creat)\b/i],
  ['packing', /\b(pack|packing|packer|warehouse|sorting|sorter|label|inventory|stock)\b/i],
  ['shop', /\b(shop|store|retail|counter|cashier|billing|showroom|salesman|sales associate)\b/i],
  ['promotion', /\b(promot|marketing|flyer|brand|sales|telecall|tele-?caller|bpo|customer (support|service)|business development|field executive)\b/i],
  ['decoration', /\b(decor|decoration|balloon|florist|flower)\b/i],
  // Local trades, before the broad rules so "kitchen helper" is not swept
  // into "setup" by the word helper.
  ['babysitting', /\b(babysit|babysitter|nanny|child ?care|creche|day ?care|playschool|play school)\b/i],
  ['eldercare', /\b(elder|elderly|senior citizen|old age|caretaker|care ?giver|attendant for|patient care|nursing aide)\b/i],
  ['petcare', /\b(pet|dog|cat|kennel|dog walk|pet sitter|groomer)\b/i],
  ['gardening', /\b(garden|gardener|gardening|nursery|plant|lawn|landscap)\b/i],
  ['farm', /\b(farm|harvest|dairy|poultry|agri|crop|orchard|plantation|estate work)\b/i],
  ['carwash', /\b(car wash|bike wash|vehicle wash|washing boy|detailing|car clean)\b/i],
  ['laundry', /\b(laundry|ironing|press ?wala|dhobi|dry ?clean|washing)\b/i],
  ['tailoring', /\b(tailor|tailoring|stitch|stitching|sewing|embroider|boutique|garment)\b/i],
  ['salon', /\b(salon|saloon|parlour|parlor|beautician|mehendi|mehndi|makeup|hair|barber|spa)\b/i],
  ['bakery', /\b(bakery|baker|cake|sweet shop|sweets|mithai|confection|pastry)\b/i],
  ['canteen', /\b(canteen|tea stall|chai|coffee shop|mess|snack|juice|dhaba)\b/i],
  ['market', /\b(vegetable|fruit|market|stall|vendor|kirana|grocery|supermarket|mandi)\b/i],
  ['xerox', /\b(xerox|photocopy|print shop|printing|dtp|cyber cafe|stationery)\b/i],
  ['mobilerepair', /\b(mobile repair|phone repair|cycle shop|bicycle|puncture|mechanic|garage|electrician helper|plumber helper)\b/i],
  ['painting', /\b(paint|painter|painting|whitewash|putty|polish)\b/i],
  ['construction', /\b(construction|mason|site helper|building work|civil helper|carpenter|welder)\b/i],
  ['loading', /\b(loading|unloading|loader|hamali|porter|lifting|godown)\b/i],
  ['festival', /\b(temple|festival|pooja|puja|prasad|jatra|fair|mela|church|mosque)\b/i],
  ['security', /\b(security|guard|watchman|bouncer|gatekeeper)\b/i],
  ['parking', /\b(parking|valet|gate attendant|ticket collector|toll)\b/i],
  ['survey', /\b(survey|door[\s-]?to[\s-]?door|census|field survey|enumerator|canvass)\b/i],
  ['dataentry', /\b(data entry|typing|typist|computer operator|back office|excel)\b/i],
  ['sports', /\b(sport|fitness|gym|swimming|cricket|football|yoga|zumba|ground staff|ball boy)\b/i],
  ['househelp', /\b(house ?help|house ?maid|maid|domestic|home help|servant|housekeeping|sweeper|cleaner)\b/i],
  ['cooking', /\b(cook|cooking|tiffin|home food|kitchen help|kitchen helper|meal prep)\b/i],
  ['setup', /\b(setup|set-?up|clean|cleaning|housekeep|maintenance|helper|labour|labor)\b/i]
];

const categoryFor = (job) => {
  const hay = `${job.title || ''} ${job.company || ''}`;
  for (const [id, re] of CATEGORY_RULES) if (re.test(hay)) return id;
  return 'other';
};

module.exports.categoryFor = categoryFor;
