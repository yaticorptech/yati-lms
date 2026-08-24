/**
 * Roadmap reading helpers.
 *
 * The AI returns `educationRoadmap` as an ordered array running from the user's
 * current stage to their target job. Two things that ordering implies, which a
 * flat list does not surface:
 *   - exactly one phase is "now", and
 *   - some phase titles are decisions, not instructions.
 */

/** Phase title, whatever shape the AI returned. */
export function phaseTitle(stage) {
  if (typeof stage === 'string') return stage;
  return stage?.phase || 'Untitled phase';
}

/**
 * A chunk that ends in an abbreviation rather than a sentence.
 *
 * The roadmap is full of "B.Tech", "M.Sc.", "e.g." and "Ph.D." — splitting
 * naively on ". " chops those in half and produces fragments that read as
 * broken text, which is worse than the wall of prose we are trying to fix.
 */
const ABBREVIATION_END =
  /(?:\be\.g|\bi\.e|\betc|\bvs|\bDr|\bMr|\bMrs|\bMs|\bProf|\bSc|\bTech|\bPhil|\bEd|\bapprox|\bNo|\bInc|\bLtd|\bSt)\.$/i;

/**
 * Break a paragraph into sentences.
 *
 * Split first, then repair: any chunk whose predecessor ended in a known
 * abbreviation is glued back on. Doing it in that order keeps the rule list
 * short — the alternative is one unreadable regex that has to get every case
 * right on the first pass.
 */
export function toSentences(text) {
  if (!text) return [];

  const rough = String(text)
    .trim()
    .split(/(?<=[.!?])\s+(?=[A-Z(])/);

  const merged = [];
  for (const piece of rough) {
    const previous = merged[merged.length - 1];
    if (previous && ABBREVIATION_END.test(previous)) merged[merged.length - 1] = `${previous} ${piece}`;
    else merged.push(piece);
  }

  return merged.map((s) => s.trim()).filter(Boolean);
}

/**
 * One line saying what this phase asks of the student.
 *
 * `focus` is written to be exactly that — "one sentence naming the single most
 * important thing in this phase" — so it is used first. Roadmaps generated
 * before that field existed fall back to the opening sentence of the
 * description, which is usually the same claim in more words.
 */
export function phaseBrief(stage) {
  if (typeof stage !== 'object' || stage === null) return null;
  if (stage.focus) return stage.focus;
  return toSentences(stage.description)[0] || null;
}

/**
 * Regroup a long description into short paragraphs.
 *
 * The prompt asks for four to six sentences, which arrives as one dense block.
 * Nobody reads a six-sentence paragraph on a phone; the same words in pairs are
 * read. Purely a presentation change — not a word is altered.
 */
export function toParagraphs(text, sentencesPer = 2) {
  const sentences = toSentences(text);
  const paragraphs = [];

  for (let i = 0; i < sentences.length; i += sentencesPer) {
    paragraphs.push(sentences.slice(i, i + sentencesPer).join(' '));
  }

  // A trailing orphan sentence looks like a mistake — fold it into the one
  // before it instead.
  if (paragraphs.length > 1 && toSentences(paragraphs[paragraphs.length - 1]).length === 1) {
    const orphan = paragraphs.pop();
    paragraphs[paragraphs.length - 1] += ` ${orphan}`;
  }

  return paragraphs;
}

/**
 * Splits a title into its lead-in and the options it offers.
 *
 * The roadmap prompt asks the AI to offer multiple viable paths using slashes —
 * "College Year 1: B.Tech CSE / BCA / B.Sc IT". Rendered as one string that
 * reads as a single instruction; split apart it reads as a choice the student
 * has to make, which is what it actually is.
 *
 * Returns null when the title carries no choice.
 */
export function parseChoices(title) {
  if (typeof title !== 'string' || !title.includes('/')) return null;

  // Only treat the text after a colon as options — "Class 11/12" has a slash
  // but no colon, and is a label rather than a decision.
  const colon = title.indexOf(':');
  if (colon === -1) return null;

  const lead = title.slice(0, colon).trim();
  const tail = title.slice(colon + 1).trim();

  // Split only on slashes at the top level. A bracketed aside can contain one
  // of its own — "MCA / M.Sc CS (Specialization & Master's Thesis / Capstone)"
  // is two routes, and splitting blindly turned it into three, two of which
  // were sentence fragments with a dangling bracket.
  //
  // A slash only separates when it is spaced. "M.Tech CS/IT" is one course
  // written with a slash in its name, not two routes — the prompt asks for
  // alternatives separated by " / ", and the tight form is how a single name
  // carrying a slash tells itself apart.
  const options = [];
  let depth = 0;
  let current = '';
  for (let i = 0; i < tail.length; i++) {
    const char = tail[i];
    if (char === '(' || char === '[') depth += 1;
    else if (char === ')' || char === ']') depth = Math.max(0, depth - 1);

    const spaced = /\s/.test(tail[i - 1] || '') || /\s/.test(tail[i + 1] || '');
    if (char === '/' && depth === 0 && spaced) {
      options.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  options.push(current.trim());

  const cleaned = options.filter(Boolean);
  if (cleaned.length < 2) return null;

  return { lead, options: cleaned };
}



/**
 * Where each phase sits relative to the user's progress.
 *
 * "current" is the first phase not yet ticked off — the single thing to do
 * next. Everything before it is done, everything after is upcoming.
 */
export function phaseStates(total, completed = []) {
  const done = new Set(completed);
  const current = Array.from({ length: total }, (_, i) => i).find((i) => !done.has(i));

  return Array.from({ length: total }, (_, i) => {
    if (done.has(i)) return 'done';
    if (i === current) return 'current';
    return 'upcoming';
  });
}

/** Completion percentage across the whole journey. */
export function journeyPercent(total, completed = []) {
  if (!total) return 0;
  const done = new Set(completed).size;
  return Math.round((Math.min(done, total) / total) * 100);
}

/** Tiers in the order a student should read them: aim high, then realistic, then safe. */
export const COLLEGE_TIERS = ['Reach', 'Target', 'Safe'];

/**
 * Entries that name no actual institution.
 *
 * Older roadmaps filled this field with things like "Your Current University
 * (MCA Program)" — a restatement of where the student already is, not a place
 * to apply. Rendering those is worse than rendering nothing: it occupies the
 * space where a real shortlist belongs and tells the student to apply to a
 * college the model could not name. Anchored patterns only, so a genuine name
 * is never dropped.
 */
const PLACEHOLDER_PATTERNS = [
  /^(your|the|his|her|their)\s+(current|existing|present|own)\b/i,
  /^(current|existing)\s+(university|college|institute|institution)\b/i,
  // `\s+` rather than `\b`, so an initial survives: "A. C. Patil College of
  // Engineering" is a real college, and `^a\b` would swallow it.
  /^(a|an|any|some|various|multiple|several)\s+/i,
  // Plural only. A real institution is singular — "Top Institute of Engineering
  // Science" is a name, "Top Engineering Colleges in India" is a non-answer.
  /^top\s+[\w\s]*\b(colleges|universities|institutes)\b/i,
  /^(good|reputed|local|nearby|leading|best)\s+[\w\s]*\b(colleges|universities|institutes)\b/i,
  /^(n\/?a|none|tbd|to be decided|not applicable)$/i
];

const isPlaceholderName = (name) => PLACEHOLDER_PATTERNS.some((re) => re.test(name.trim()));

/**
 * Colleges, whatever shape the roadmap stored them in.
 *
 * Roadmaps generated before college suggestions carried any detail hold plain
 * strings. A real name still renders — a student should not have to regenerate,
 * and lose all their tasks, just to read this page — but placeholders are
 * dropped entirely.
 */
export function normalizeColleges(colleges) {
  if (!Array.isArray(colleges)) return [];

  return colleges
    .map((entry) => {
      if (typeof entry === 'string') {
        const name = entry.trim();
        if (!name || isPlaceholderName(name)) return null;
        return { name, detailed: false };
      }
      if (!entry || typeof entry !== 'object' || !entry.name) return null;
      if (isPlaceholderName(String(entry.name))) return null;

      // "detailed" drives the layout: a name on its own does not deserve a card
      // with empty rows where the fees and cutoff should be.
      const detailed = Boolean(
        entry.location || entry.programme || entry.entranceExam || entry.whyThisFits
      );
      return { ...entry, detailed };
    })
    .filter(Boolean);
}

/** Group colleges by tier, keeping anything untiered in a trailing bucket. */
/**
 * Two lists of colleges reduced to one.
 *
 * The roadmap names colleges with a tier and admission detail; the mentor's
 * recommendations name them with a stage and an outbound link. Shown as two
 * sections they read as two different shortlists and force the student to
 * cross-reference by eye — and a college that appears in both is simply listed
 * twice.
 *
 * Merged by name, so an institution present in both keeps its honest tier from
 * the roadmap AND gains the link from the recommendations. Roadmap entries lead
 * because tier ordering (Reach → Target → Safe) is the useful way to read a
 * shortlist; recommendation-only entries follow.
 */
// Punctuation and spacing are stripped entirely rather than collapsed, because
// the two sources are generated by separate prompts and spell the same place
// differently: "P.E.S. University" and "PES University" are one college, and a
// key that keeps the dots as spaces lists it twice.
const collegeKey = (name) =>
  String(name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

export function mergeColleges(fromRoadmap, fromRecommendations) {
  const merged = new Map();

  const tiered = groupCollegesByTier(normalizeColleges(fromRoadmap)).flatMap(({ tier, items }) =>
    items.map((college) => ({ ...college, tier }))
  );

  for (const college of tiered) {
    const key = collegeKey(college.name);
    if (key) merged.set(key, { ...college });
  }

  // Recommendations run through the same placeholder filter — "a good local
  // college" is no more useful for having come from a different prompt.
  for (const college of normalizeColleges(fromRecommendations)) {
    const key = collegeKey(college.name);
    if (!key) continue;

    const existing = merged.get(key);
    merged.set(key, {
      ...existing,
      name: existing?.name || college.name,
      // Roadmap values win where both have one: they were written against this
      // student's specific path rather than as a general suggestion.
      tier: existing?.tier,
      stage: existing?.stage || college.stage,
      location: existing?.location || college.location,
      programme: existing?.programme || college.programme || college.programs,
      whyThisFits: existing?.whyThisFits || college.whyThisFits || college.why,
      approxFees: existing?.approxFees || college.approxFees || college.fees,
      requirements: existing?.requirements || college.requirements,
      link: college.link || existing?.link
    });
  }

  return [...merged.values()];
}

export function groupCollegesByTier(colleges) {
  const groups = COLLEGE_TIERS.map((tier) => ({
    tier,
    items: colleges.filter((c) => c.tier === tier)
  })).filter((g) => g.items.length);

  const untiered = colleges.filter((c) => !COLLEGE_TIERS.includes(c.tier));
  if (untiered.length) groups.push({ tier: null, items: untiered });

  return groups;
}
