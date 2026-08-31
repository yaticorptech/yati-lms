/**
 * matchService — skill normalization, role resolution, ranking and
 * skill-gap analysis. Pure functions; no database access, so it is
 * cheap to unit-test and safe to call per-request.
 */
const { ROLES, SKILL_ALIASES, ALL_SKILLS } = require("../data/roles.js");

/**
 * Scoring weights. Sum to 1 — skills dominate, the rest re-rank.
 *
 * `semantic` is the Gemini signal and is often absent: no API key, or a
 * listing that hasn't been embedded yet. Rather than treating a missing
 * vector as a zero — which would punish exactly the listings we know least
 * about — the weights of whichever signals *are* present get renormalised,
 * so a job with no embedding is scored on the other four exactly as before.
 */
const WEIGHTS = { skills: 0.38, role: 0.22, semantic: 0.15, type: 0.12, location: 0.13 };

/* ---------------- text helpers ---------------- */

const norm = (s) =>
  String(s ?? "")
    .toLowerCase()
    .replace(/[._/\\]/g, " ")
    .replace(/[^a-z0-9+#\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/* Alias keys are written naturally ("ui/ux", "react.js"), so index them
   by normalized form — otherwise norm() mangles the input past matching. */
const NORM_ALIASES = Object.fromEntries(
  Object.entries(SKILL_ALIASES).map(([k, v]) => [norm(k), v])
);

const CANON_BY_NORM = new Map(ALL_SKILLS.map((s) => [norm(s), s]));

/** Map a free-text skill to its canonical name. */
function normalizeSkill(raw) {
  const n = norm(raw);
  if (!n) return null;

  if (NORM_ALIASES[n]) return NORM_ALIASES[n];
  if (CANON_BY_NORM.has(n)) return CANON_BY_NORM.get(n);

  // Tolerate simple plurals: "APIs" → "API" → REST APIs.
  const singular = n.replace(/s$/, "");
  if (NORM_ALIASES[singular]) return NORM_ALIASES[singular];
  if (CANON_BY_NORM.has(singular)) return CANON_BY_NORM.get(singular);
  if (CANON_BY_NORM.has(n + "s")) return CANON_BY_NORM.get(n + "s");

  // Unknown but valid — keep the user's wording, title-cased.
  return String(raw).trim().replace(/\s+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Normalize + dedupe a list of raw skill strings. */
function normalizeSkillList(list) {
  const out = [];
  const seen = new Set();
  for (const raw of list ?? []) {
    const s = normalizeSkill(raw);
    if (!s) continue;
    const k = norm(s);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(s);
  }
  return out;
}

/**
 * Terms that are real skills when a user types them, but ordinary English
 * (or ordinary German, on EU boards) inside a job description. Matching
 * these in prose produces confident nonsense — a graphic-design post that
 * happens to say "node" should not read as a Node.js role.
 */
const AMBIGUOUS_IN_PROSE = new Set([
  "node", "go", "r", "ui", "ux", "ds", "ai", "ml", "dl", "rest", "api", "apis",
  "tf", "torch", "py", "xd", "spring", "testing", "sales", "editing", "migration",
  "security", "networking", "monitoring", "documentation", "compliance",
  // Section headings, not skills. Nearly every posting has a "Qualifications"
  // or "Responsibilities" block, so matching these in prose tags thousands of
  // unrelated jobs and then reports them back as skills the market is asking
  // for — "Qualification" showed up as a trending frontend skill.
  "qualification", "qualifications", "responsibilities", "requirements",
  "benefits", "experience", "integration", "operations", "management",
]);

/**
 * Pull known skills out of free text.
 * `strict` (the default) skips the ambiguous terms above — use it for
 * descriptions. Pass false for tag lists, which are already curated.
 */
function extractSkills(text, { strict = true } = {}) {
  const hay = " " + norm(text) + " ";
  const found = new Set();
  const allowed = (term) => !strict || !AMBIGUOUS_IN_PROSE.has(term);

  for (const skill of ALL_SKILLS) {
    const ns = norm(skill);
    if (ns.length < 2 || !allowed(ns)) continue;
    if (hay.includes(" " + ns + " ")) found.add(skill);
  }
  for (const [alias, canonical] of Object.entries(NORM_ALIASES)) {
    if (alias.length < 2 || !allowed(alias)) continue;
    if (hay.includes(" " + alias + " ")) found.add(canonical);
  }
  return [...found];
}

/* ---------------- role resolution ---------------- */

const ROLE_BY_NAME = new Map(ROLES.map((r) => [r.name, r]));

/**
 * Spaces removed, for comparing titles people write inconsistently.
 *
 * "MERN stack developer", "mernstack developer" and "mern stack developer"
 * are one job title with three spellings, and comparing them literally
 * matched none of them — a user typing the second got "no role matches"
 * while the first resolved fine. Nobody agrees where the space goes in
 * fullstack / full stack, frontend / front end, nodejs / node js either.
 */
const squash = (s) => norm(s).replace(/\s+/g, "");

/** Resolve typed text ("ui ux", "sde") to a canonical role name, or null. */
function resolveRole(input) {
  const n = norm(input);
  if (!n) return null;
  const flat = squash(input);

  for (const r of ROLES) {
    if (norm(r.name) === n || squash(r.name) === flat) return r.name;
    if (r.aliases.some((a) => norm(a) === n || squash(a) === flat)) return r.name;
  }

  // Substring pass — "senior data analyst" → Data Analyst. Longest wins.
  // Run on the squashed forms as well, so "senior fullstack developer" finds
  // the "full stack developer" it obviously means.
  let best = null;
  let bestLen = 0;
  for (const r of ROLES) {
    for (const c of [r.name, ...r.aliases]) {
      const nc = norm(c);
      const fc = squash(c);
      const hit = n.includes(nc) || nc.includes(n) || flat.includes(fc) || fc.includes(flat);
      if (hit && fc.length > bestLen) {
        best = r.name;
        bestLen = fc.length;
      }
    }
  }
  return best;
}

const getRole = (name) => ROLE_BY_NAME.get(name) ?? null;

const escapeRx = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Words the industry uses interchangeably for the same job.
 *
 * The taxonomy is written in "Developer"; job boards overwhelmingly post in
 * "Engineer". Taken literally that difference is fatal to an exact-title
 * match — this index holds zero titles containing "frontend developer" and
 * twenty containing "frontend engineer", zero "backend developer" and
 * ninety-two "backend engineer". Matching the words as written would report
 * no frontend jobs while showing a hundred of them to anyone who searched
 * without a role.
 */
const OCCUPATION = "(?:developer|engineer|programmer|dev)";
const OCCUPATION_WORDS = /\b(?:developer|engineer|programmer|dev)\b/g;

/**
 * Other word families that differ only by ending.
 *
 * Same failure as Developer/Engineer, one step subtler: Mangaluru holds an
 * "Administration Assistant" and an "Administrative Executive", and a
 * pattern built from the literal alias "administrative assistant" matches
 * neither — so the app reported no Executive Assistant jobs in a city that
 * had them. Matching the stem covers every ending without loosening the
 * pattern to bare "assistant", which would drag in every Assistant Manager.
 */
const WORD_FAMILIES = [
  [/\b(?:administrative|administration|admin)\b/g, "(?:administrative|administration|admin)"],
  [/\bmarketing\b/g, "(?:marketing|marketer)"],
  [/\banalyst\b/g, "(?:analyst|analytics)"],
  [/\bmanager\b/g, "(?:manager|management|lead)"],
  [/\bdesigner\b/g, "(?:designer|design)"],
  [/\brecruiter\b/g, "(?:recruiter|recruiting|recruitment)"],
];

/* Patterns are rebuilt per (role, text) pair and reused: rankJobs tests
   every candidate in the pool against them, and recompiling a dozen regexes
   several hundred times per search is pure waste. */
const PATTERN_CACHE = new Map();

/**
 * Regexes that recognise a title as naming this role.
 *
 * Shared by the database pre-filter and the in-memory gate on purpose — if
 * the two disagreed, the pool would be selected on one definition of the
 * role and then emptied by another.
 */
function roleTitlePatterns(roleName, roleText) {
  const key = `${roleName ?? ""}|${roleText ?? ""}`;
  const hit = PATTERN_CACHE.get(key);
  if (hit) return hit;

  const role = roleName ? getRole(roleName) : null;
  const typed = String(roleText ?? "").trim();
  const terms = role ? [role.name, ...role.aliases] : typed ? [typed] : [];

  const patterns = terms
    .map((t) => norm(t))
    .filter((t) => t.length > 1)
    .map((t) => {
      let rx = escapeRx(t).replace(OCCUPATION_WORDS, OCCUPATION);
      for (const [family, alternation] of WORD_FAMILIES) rx = rx.replace(family, alternation);
      // Spaces between words become optional, so "full stack developer"
      // recognises "Fullstack Engineer" and "front end" recognises
      // "Frontend". Employers split these words however they like.
      rx = rx.replace(/ (?![^(]*\))/g, "\\s*");
      return new RegExp(rx, "i");
    });

  PATTERN_CACHE.set(key, patterns);
  return patterns;
}

/**
 * Does this listing's title actually name the role the user asked for?
 *
 * A yes/no gate, deliberately separate from scoreRole. Scoring lets a job
 * compensate: share enough of a Frontend Developer's skills and a "Technical
 * Support Specialist" post outranks a real frontend opening further down the
 * list, because skills carry 45% of the total and role fit only 25%. Someone
 * who names a target role is not expressing a preference to be weighed — the
 * role is the search. So the title has to say so.
 *
 * Matching is on the role's own vocabulary, not string equality: aliases
 * plus the occupation synonyms above mean "Frontend Developer" admits
 * "Senior Frontend Engineer" and "Full Stack Developer" admits "Staff
 * Fullstack Engineer". What it excludes is everything that merely shares a
 * technology.
 */
function roleEligible(job, profile) {
  const patterns = roleTitlePatterns(profile.roleName, profile.roleText);
  if (!patterns.length) return true;   // no role named — nothing to be exact about

  const title = norm(job.title);
  return patterns.some((p) => p.test(title));
}

/** Vocabulary of the requested role: the taxonomy's, or the user's own. */
function roleVocabulary(profile) {
  const role = profile.roleName ? getRole(profile.roleName) : null;
  const typed = String(profile.roleText ?? "").trim();
  return role ? [role.name, ...role.aliases] : typed ? [typed] : [];
}

/**
 * A weaker test than roleEligible: does the title share any word with the
 * role at all?
 *
 * This is the bar for the relaxed pass. Dropping the role requirement
 * outright is not "recommending related jobs" — with an unrecognised role
 * every listing scores the same neutral role fit, so the ranking collapses
 * onto skills alone and a search for Blockchain Developer returns senior
 * accountants that happen to mention JavaScript. Requiring one shared word
 * keeps the fallback honest: "Developer" and "Blockchain" roles qualify,
 * accountants do not.
 */
function roleRelated(job, profile) {
  const terms = roleVocabulary(profile);
  if (!terms.length) return true;

  const titleWords = new Set(norm(job.title).split(" ").filter((w) => w.length > 2));
  return terms.some((t) =>
    norm(t).split(" ").some((w) => w.length > 2 && titleWords.has(w))
  );
}

/* ---------------- location ---------------- */

const STOP_LOC = new Set([
  "remote", "hybrid", "onsite", "on", "site", "anywhere", "worldwide",
  "global", "area", "metro", "region", "city", "and", "or", "the",
  // "Remote in Germany" must not contribute "in" — as a token it is a
  // prefix of half the place names on earth, India's included.
  "in", "at", "of",
]);

const locTokens = (s) =>
  norm(s).split(/[\s,]+/).filter((t) => t.length > 1 && !STOP_LOC.has(t));

/**
 * Country forms the tokenizer would otherwise erase.
 *
 * norm() turns "U.S." into "u s" and locTokens drops single letters, so a
 * role advertised as "Remote U.S." comes out naming no place whatsoever —
 * which reads as "open worldwide" and offers a US-only job to someone in
 * Mangalore. Expanding to the spelled-out name fixes it in both directions:
 * the listing is correctly withheld from India, and correctly matched for
 * anyone actually in the States. Longest forms first so "U.S.A." isn't
 * consumed by the "U.S." pattern.
 */
const PLACE_ABBREVIATIONS = [
  [/\bu\.?\s?s\.?\s?a\.?(?=\s|$|,)/gi, " united states usa "],
  [/\bu\.?\s?s\.?(?=\s|$|,)/gi, " united states usa "],
  [/\bu\.?\s?k\.?(?=\s|$|,)/gi, " united kingdom uk "],
  [/\bu\.?\s?a\.?\s?e\.?(?=\s|$|,)/gi, " united arab emirates uae "],
  [/\bind\b/gi, " india "],
  [/\b(deu|ger)\b/gi, " germany "],
  [/\bnl\b/gi, " netherlands "],
];

/** Tokenize a listing's stated place, abbreviations expanded first. */
function placeTokens(text) {
  let s = String(text ?? "");
  for (const [pattern, expanded] of PLACE_ABBREVIATIONS) s = s.replace(pattern, expanded);
  return locTokens(s);
}

/** Great-circle distance in km between two [lng, lat] pairs. */
function haversineKm(a, b) {
  if (!a || !b) return null;
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const [lng1, lat1] = a;
  const [lng2, lat2] = b;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * How far out we'll go before calling a job "somewhere else".
 *
 * Naming a city is a request to commute, not to relocate, so the gate has
 * to stay tight. But drawing it at the city limits fails the tier-2 case
 * badly: ask from Mangalore and every real opening in Udupi or Manipal —
 * an hour up the coast, the same labour market — disappears, leaving an
 * empty page next to a "247 jobs elsewhere" counter. This is the radius at
 * which "nearby" stops being true; jobs inside it are admitted and ranked
 * by real distance, so the closest still come first.
 */
const COMMUTE_KM = 150;

/**
 * Can this user take this job *in the place they named, or near it*?
 *
 * A yes/no gate, not a score: asked for Mangalore, a Delhi role is not a
 * weaker match, it's the wrong end of the country. Sharing a country is
 * explicitly not enough — that is the whole point of naming a city.
 */
/**
 * How directly a listing answers "jobs in the place I named".
 *
 *   0 — physically there, or near enough to commute
 *   1 — remote, but hiring specifically in that country or region
 *   2 — remote from anywhere
 *
 * Used as the primary sort key ahead of score, because weighting could not
 * do this job. Location carries 13% of the total, so a work-from-anywhere
 * listing with marginally better skill overlap outranked every real opening
 * in Mangalore — arithmetically fine, and not what someone who typed a city
 * is asking for. Tiering puts the answer to the question they asked first
 * and lets score order things within each tier.
 *
 * The remote roles are still returned and still ranked, just underneath.
 */
function locationTier(job, profile) {
  const want = profile.cityTerms?.length ? profile.cityTerms : profile.locationTerms ?? [];
  if (!want.length || profile.remoteOnly) return 0;   // no place named, or remote was the request

  const have = new Set(placeTokens(`${job.location ?? ""} ${job.city ?? ""} ${job.country ?? ""}`));

  if (!job.remote) {
    const jobGeo = job.geo?.coordinates;
    if (profile.coords && jobGeo?.length === 2) {
      const km = haversineKm(profile.coords, jobGeo);
      if (km != null) return km <= COMMUTE_KM ? 0 : 1;
    }
    return want.some((w) => have.has(w)) ? 0 : 1;
  }

  // Remote, but scoped to somewhere that includes the user.
  const stated = ` ${[...have].join(" ")} `;
  const country = norm(profile.country ?? "");
  if (country && stated.includes(` ${country} `)) return 1;
  if ((profile.countryAliases ?? []).some((a) => have.has(a))) return 1;
  if (profile.continent && locTokens(profile.continent).some((t) => have.has(t))) return 1;

  return 2;
}

function locationEligible(job, profile, radiusKm = COMMUTE_KM) {
  // Fall back to the full term list when the caller didn't resolve a city,
  // so callers that only supply raw tokens still behave sensibly.
  const want = profile.cityTerms?.length ? profile.cityTerms : profile.locationTerms ?? [];
  if (!want.length) return true;              // no location given — no gate

  const rawText = `${job.location ?? ""} ${job.city ?? ""} ${job.country ?? ""}`;
  const have = new Set(placeTokens(rawText));

  // Note there is deliberately no "we couldn't resolve the place, so let
  // everything through" branch here. That escape hatch meant one typo —
  // "Hydrabadh" — silently switched the location filter off entirely and
  // offered London jobs to someone in Hyderabad. An unrecognised string is
  // still evidence: the words in it have to appear somewhere in the
  // listing's own place, which at minimum keeps the search in the right
  // country. Callers should try correcting the spelling first.

  // A remote role isn't *in* anywhere, so measuring it against a city is the
  // wrong question — the right one is whether the user is inside the region
  // it hires from. Judging these by distance is what made a "Remote, India"
  // job invisible to someone in Mangalore, which is close to the worst
  // possible miss: remote work is the main thing a tier-2 city can reach.
  if (job.remote) {
    // Names the user's own city — "Bangalore, India; Remote".
    if (want.some((w) => have.has(w))) return true;

    // Hires from the user's country. Matched as a whole phrase, never token
    // by token: "United Kingdom" and "United States" share the word
    // "united", so a loose match offers London-only remote roles to New
    // York. The aliases are the distinctive short forms, safe as tokens.
    const stated = ` ${[...have].join(" ")} `;
    const country = norm(profile.country ?? "");
    if (country && stated.includes(` ${country} `)) return true;
    if ((profile.countryAliases ?? []).some((a) => have.has(a))) return true;

    // Advertised by continent ("Remote — Asia") rather than by country.
    if (profile.continent && locTokens(profile.continent).some((t) => have.has(t))) return true;

    // No place named at all: open to anyone, so open to this user.
    const named = [...have].filter((t) => !/^(remote|hybrid|onsite|flexible|friendly|travel)$/.test(t));
    if (!named.length) return true;

    return false;
  }

  // Coordinates decide it outright when both sides have them — including
  // when they say no. Place names collide constantly (London Ontario,
  // Cambridge Massachusetts, the dozen Springfields), and a listing that
  // merely shares a word with the user's city is not evidence against a
  // measured 600 km. Distance is the thing actually being asked about, so
  // where it's known it outranks the spelling.
  const jobGeo = job.geo?.coordinates;
  if (profile.coords && jobGeo?.length === 2) {
    const km = haversineKm(profile.coords, jobGeo);
    if (km != null) return km <= radiusKm;
  }

  // No coordinates on one side or the other, so fall back to place names.
  // Exact terms only: scoreLocation can afford prefix matching to soften a
  // score, but a gate cannot — "indiana" starts with "india", and admitting
  // Indianapolis to an Indian search would be plainly wrong.
  return want.some((w) => have.has(w));
}


/**
 * 0..1 location fit. When the user shared coordinates we use real
 * distance; otherwise we fall back to token overlap on place names.
 */
function scoreLocation(job, profile) {
  const isRemote = !!job.remote;

  if (profile.remoteOnly) return isRemote ? 1 : 0.05;

  // Distance-based when both sides have coordinates.
  const jobGeo = job.geo?.coordinates;
  if (profile.coords && jobGeo?.length === 2) {
    const km = haversineKm(profile.coords, jobGeo);
    if (km != null) {
      if (km <= 25) return 1;
      if (km <= 75) return 0.9;
      if (km <= 200) return 0.75;
      if (km <= 800) return 0.5;
      return isRemote ? 0.7 : 0.2;
    }
  }

  const pref = profile.location;
  if (!pref) return isRemote ? 0.9 : 0.6;

  // Prefer the geocoder's expansion when the caller resolved the place:
  // "Mangalore" alone shares nothing with "Bengaluru, India", but its
  // resolved terms carry the country that makes the two comparable.
  const want = profile.locationTerms?.length ? profile.locationTerms : locTokens(pref);
  const have = locTokens(`${job.location ?? ""} ${job.city ?? ""} ${job.country ?? ""}`);
  if (!want.length) return isRemote ? 0.9 : 0.6;

  const overlap = want.filter((w) =>
    have.some((h) => h === w || h.startsWith(w) || w.startsWith(h))
  );

  if (overlap.length >= Math.min(2, want.length)) return 1;   // city + country
  if (overlap.length === 1) return isRemote ? 0.95 : 0.82;    // same country
  return isRemote ? 0.7 : 0.15;                               // elsewhere
}

/* ---------------- job type ---------------- */

const ADJACENT_TYPES = {
  Internship: ["Part-time", "Contract"],
  "Part-time": ["Internship", "Contract"],
  "Full-time": ["Contract"],
  Contract: ["Full-time", "Part-time"],
};

function scoreType(job, wantType) {
  if (!wantType || wantType === "Any") return 0.85;
  if (!job.type || job.type === "Unknown") return 0.5;
  if (job.type === wantType) return 1;
  if ((ADJACENT_TYPES[wantType] ?? []).includes(job.type)) return 0.45;
  return 0.1;
}

/* ---------------- skills ---------------- */

/**
 * Blends coverage (how much of the job I can do) with utilization
 * (how much of my toolkit the job actually uses).
 */
function scoreSkills(jobSkills, userSkills, roleName) {
  const js = jobSkills ?? [];
  if (!userSkills.length) return { score: 0.5, matched: [], missing: js.slice(0, 8) };

  // We couldn't extract requirements from this listing, so we can neither
  // confirm nor rule out a fit. Score it below a genuine partial match but
  // near a known mismatch, and let role fit break the tie.
  if (!js.length) return { score: 0.3, matched: [], missing: [] };

  const userSet = new Set(userSkills.map(norm));
  const matched = js.filter((s) => userSet.has(norm(s)));
  const missing = js.filter((s) => !userSet.has(norm(s)));

  // Listings vary wildly in how many skills we can extract. Dividing by a
  // raw count lets a sparse post ("Excel" and nothing else) claim 100%
  // coverage off a single incidental keyword, so treat thin listings as if
  // they had at least MIN_REQUIREMENTS requirements.
  const MIN_REQUIREMENTS = 4;
  const coverage = matched.length / Math.max(js.length, MIN_REQUIREMENTS);
  const utilization = Math.min(1, matched.length / Math.max(3, userSkills.length * 0.6));

  let score = 0.7 * coverage + 0.3 * utilization;

  // Reward overlap on skills the target role treats as core. Multiplicative
  // on purpose: it should amplify an already-good match, not rescue a job
  // that shares two keywords out of sixteen.
  const role = roleName ? getRole(roleName) : null;
  if (role) {
    const core = new Set(role.core.map(norm));
    const coreHits = matched.filter((s) => core.has(norm(s))).length;
    if (coreHits) score = Math.min(1, score * (1 + 0.12 * coreHits));
  }

  return { score: Math.min(1, score), matched, missing };
}

/* ---------------- role / title fit ---------------- */

function scoreRole(job, roleName, rawRoleText) {
  if (!roleName && !rawRoleText) return 0.7;      // no preference — neutral

  const title = norm(job.title);
  const role = roleName ? getRole(roleName) : null;
  const names = role ? [role.name, ...role.aliases] : [rawRoleText];

  // Take the best of several independent signals rather than returning
  // early — a generic token hit ("product") must not outrank real
  // skill-family evidence.
  let best = 0;

  for (const nm of names) {
    const nn = norm(nm);
    if (!nn) continue;
    if (title === nn) return 1;
    if (title.includes(nn)) best = Math.max(best, 0.92);
  }

  // Token overlap: "Senior Backend Developer" vs "Backend Developer".
  const titleTokens = new Set(title.split(" ").filter((w) => w.length > 2));
  let tokenBest = 0;
  for (const nm of names) {
    const nTok = norm(nm).split(" ").filter((w) => w.length > 2);
    if (!nTok.length) continue;
    tokenBest = Math.max(tokenBest, nTok.filter((w) => titleTokens.has(w)).length / nTok.length);
  }
  // Deliberately shallow: a half-match on one generic word is weak evidence.
  if (tokenBest > 0) best = Math.max(best, 0.2 + 0.4 * tokenBest);

  // Same skill family — share of the role's core skills the job asks for.
  if (role) {
    const core = new Set(role.core.map(norm));
    const jobSk = (job.skills ?? []).map(norm);
    const share = jobSk.filter((s) => core.has(s)).length / Math.max(1, core.size);
    if (share > 0) best = Math.max(best, Math.min(0.6, 0.2 + share));
  }

  if (best > 0) return best;

  // An unrecognised role tells us nothing about this job — stay neutral
  // rather than flattening every score to the floor.
  return role ? 0.1 : 0.45;
}

/* ---------------- freshness ---------------- */

function freshnessBoost(daysAgo) {
  if (daysAgo == null) return 0;
  if (daysAgo <= 3) return 0.03;
  if (daysAgo <= 7) return 0.015;
  if (daysAgo >= 30) return -0.03;
  return 0;
}

/* ---------------- scoring ---------------- */

function scoreJob(job, profile, semantic = null) {
  const sk = scoreSkills(job.skills, profile.skills, profile.roleName);
  const role = scoreRole(job, profile.roleName, profile.roleText);
  const type = scoreType(job, profile.jobType);
  const loc = scoreLocation(job, profile);

  // Weighted mean over the signals we actually have. Dividing by the weight
  // present rather than by 1 is what makes the semantic signal optional:
  // without it every score is identical to the four-signal version, instead
  // of every job losing a flat 15% for a vector nobody computed.
  const signals = [
    [WEIGHTS.skills, sk.score],
    [WEIGHTS.role, role],
    [WEIGHTS.type, type],
    [WEIGHTS.location, loc],
    ...(semantic == null ? [] : [[WEIGHTS.semantic, semantic]]),
  ];
  const available = signals.reduce((sum, [w]) => sum + w, 0);

  let total = signals.reduce((sum, [w, v]) => sum + w * v, 0) / available;

  total += freshnessBoost(job.daysAgo);

  // A user who listed skills should not see a job sharing none of them
  // ranked as a strong match, however well it scores elsewhere.
  if (profile.skills.length && sk.matched.length === 0) total = Math.min(total, 0.45);

  total = Math.max(0, Math.min(1, total));

  const distanceKm =
    profile.coords && job.geo?.coordinates?.length === 2
      ? Math.round(haversineKm(profile.coords, job.geo.coordinates))
      : null;

  return {
    total: Math.round(total * 100),
    parts: {
      skills: Math.round(sk.score * 100),
      role: Math.round(role * 100),
      type: Math.round(type * 100),
      location: Math.round(loc * 100),
      // Absent when there's no vector for this listing. The card renders a
      // fixed four, so this rides along for the API without changing the UI.
      ...(semantic == null ? {} : { semantic: Math.round(semantic * 100) }),
    },
    matched: sk.matched,
    missing: sk.missing,
    distanceKm,
    // Sort key, not a score — see locationTier. Carried on the match so the
    // semantic re-rank can reorder without recomputing it.
    locationTier: locationTier(job, profile),
  };
}

/**
 * Re-score an already-ranked slice with the semantic signal and re-sort.
 *
 * Applied after ranking rather than during it, and only to what survived,
 * because the vectors have to be loaded from the database: doing it inside
 * scoreJob would mean fetching an embedding for all six hundred pool
 * candidates to change the order of the twenty that get shown.
 *
 * `vectors` maps externalId → number[]. Anything missing keeps its original
 * score, so partial embedding coverage degrades smoothly instead of
 * reshuffling the list around whichever listings happen to be embedded.
 */
function applySemantic(results, profile, profileVector, vectors, similarity, sortBy = "relevance") {
  if (!profileVector || !vectors?.size) return results;

  const rescored = results.map(({ job, match }) => {
    const vector = vectors.get(job.externalId);
    const semantic = vector ? similarity(profileVector, vector) : null;
    return semantic == null ? { job, match } : { job, match: scoreJob(job, profile, semantic) };
  });

  // Only "best match" is a statement about score; the other orderings are
  // about recency, skill overlap or distance, and re-sorting them here
  // would quietly override what the user asked for.
  if (sortBy === "relevance") {
    rescored.sort((a, b) => a.match.locationTier - b.match.locationTier || b.match.total - a.match.total);
  }
  return rescored;
}

/** Score, filter and sort a set of listings. */
function rankJobs(jobs, profile, opts = {}) {
  const { minScore = 15, strictType = false, sortBy = "relevance", limit = 60 } = opts;

  let ranked = jobs.map((job) => ({ job, match: scoreJob(job, profile) }));

  if (strictType && profile.jobType && profile.jobType !== "Any") {
    ranked = ranked.filter((r) => r.job.type === profile.jobType);
  }
  if (profile.remoteOnly) ranked = ranked.filter((r) => r.job.remote);

  // A named place is a boundary, not a preference: drop what's outside it
  // rather than ranking it below what's inside. Count the casualties — an
  // empty result set means something very different depending on this
  // number, and the UI has no way to tell the difference otherwise.
  //
  // Widen only when the tight pass genuinely came up short. Trying the
  // radii in order means a city with real local coverage never sees
  // results from four hundred kilometres away.
  const scored = ranked.filter((r) => r.match.total >= minScore);

  // The role is a requirement, not a preference. Applied before the location
  // gate so the "matched elsewhere" count below means what it says: jobs
  // that were right in every respect except where they are.
  let onRole = scored.filter((r) => roleEligible(r.job, profile));
  let excludedByRole = scored.length - onRole.length;

  // Unless insisting on it would leave the page blank. A title is a naming
  // convention, not a specification — nobody searching "Blockchain
  // Developer" wants to be told there are no jobs when the index holds
  // openings that match their skills and their city and merely call
  // themselves something else. Fall back to ranking by role fit, which
  // already knows how to put the closest titles first, and flag it so the
  // UI can say these are related rather than exact.
  let roleRelaxed = false;
  let roleIgnored = false;
  if (!onRole.length && excludedByRole > 0) {
    const related = scored.filter((r) => roleRelated(r.job, profile));
    if (related.length) {
      onRole = related;
      excludedByRole = scored.length - related.length;
      roleRelaxed = true;
    } else {
      // Not even a shared word. "Yoga instructor" and "astronaut" are real
      // jobs that no title in this index resembles, and returning nothing
      // tells the user only that we couldn't help — while their skills still
      // match plenty of work. Rank on skills alone and label it as such, so
      // the page is useful without pretending these are the role they asked
      // for. This is the last tier; there is nothing below it but empty.
      onRole = scored;
      excludedByRole = 0;
      roleIgnored = true;
    }
  }

  const kept = onRole.filter((r) => locationEligible(r.job, profile, COMMUTE_KM));
  // Counted against the jobs that were good enough to show, not the whole
  // pool — "12 matches, all elsewhere" is the useful statement; folding in
  // everything that failed the score threshold would just inflate it.
  const excludedByLocation = onRole.length - kept.length;
  ranked = kept;

  ranked.sort((a, b) => {
    if (sortBy === "recent") {
      const da = a.job.daysAgo ?? 999;
      const db = b.job.daysAgo ?? 999;
      return da - db || b.match.total - a.match.total;
    }
    if (sortBy === "skills") {
      return b.match.parts.skills - a.match.parts.skills || b.match.total - a.match.total;
    }
    if (sortBy === "distance") {
      const da = a.match.distanceKm ?? Infinity;
      const db = b.match.distanceKm ?? Infinity;
      return da - db || b.match.total - a.match.total;
    }
    // "Best match" against a named place means best match *there* first.
    return a.match.locationTier - b.match.locationTier || b.match.total - a.match.total;
  });

  return {
    total: ranked.length,
    excludedByLocation,
    // Good matches whose title isn't the role asked for. Lets the UI
    // distinguish "nothing here" from "nothing by that name".
    excludedByRole,
    // Nothing carried the exact title, so these are the nearest equivalents
    // by role fit. The UI must not present them as exact.
    roleRelaxed,
    // Nothing even resembled it — ranked on skills alone.
    roleIgnored,
    radiusKm: COMMUTE_KM,
    results: ranked.slice(0, limit),
  };
}

/* ---------------- skill-gap analysis ---------------- */

/**
 * What the user has for a role, what they must learn, and what makes
 * them competitive. `demand` is a Map of skill → count observed in live
 * listings for the role, surfacing real market signal beyond the taxonomy.
 */
function analyzeGap(roleName, userSkills, demand = new Map()) {
  const role = getRole(roleName);
  if (!role) return null;

  const userSet = new Set(userSkills.map(norm));
  const have = [];
  const learn = [];
  const nice = [];

  for (const s of role.core) (userSet.has(norm(s)) ? have : learn).push(s);
  for (const s of role.preferred) (userSet.has(norm(s)) ? have : nice).push(s);

  // Core skills carry 75% of readiness, preferred the remaining 25%.
  const coreHave = role.core.filter((s) => userSet.has(norm(s))).length;
  const prefHave = role.preferred.filter((s) => userSet.has(norm(s))).length;
  const readiness = Math.round(
    100 *
      (0.75 * (coreHave / Math.max(1, role.core.length)) +
        0.25 * (prefHave / Math.max(1, role.preferred.length)))
  );

  // Skills employers ask for that aren't already covered by the taxonomy.
  const known = new Set([...role.core, ...role.preferred].map(norm));
  const trending = [...demand.entries()]
    .sort((a, b) => b[1] - a[1])
    .filter(([skill, n]) => n >= 2 && !userSet.has(norm(skill)) && !known.has(norm(skill)))
    .slice(0, 6)
    .map(([skill]) => skill);

  const nextUp = learn.slice(0, 3);

  return {
    role: role.name,
    blurb: role.blurb,
    readiness,
    have,
    learn,
    nice,
    trending,
    advice: nextUp.length
      ? `Focus first on ${nextUp.join(", ")} — these are the core requirements you're missing.`
      : "You cover every core skill for this role. Add the nice-to-haves to stand out.",
  };
}

module.exports = { WEIGHTS, norm, normalizeSkill, normalizeSkillList, extractSkills, resolveRole, getRole, roleTitlePatterns, roleEligible, roleRelated, locTokens, placeTokens, haversineKm, locationTier, locationEligible, scoreLocation, scoreType, scoreSkills, scoreRole, scoreJob, applySemantic, rankJobs, analyzeGap };
