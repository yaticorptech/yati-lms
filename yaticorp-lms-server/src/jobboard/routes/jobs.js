const express = require("express");
const mongoose = require("mongoose");
const Job = require("../models/Job.js");
const Search = require("../models/Search.js");
const { isConnected } = require("../config/db.js");
const { ingestAll, INLINE_GEOCODES } = require("../services/providerService.js");
const { resolvePlace, spellingsOf, cityCoverageQuery } = require("../services/geoService.js");
const {
  rankJobs, analyzeGap, resolveRole, normalizeSkillList, norm, getRole, locTokens,
  roleTitlePatterns, applySemantic,
} = require("../services/matchService.js");
const JobEmbedding = require("../models/JobEmbedding.js");
const {
  geminiConfigured, embedOne, cosineSimilarity, profileText, quotaExhausted,
} = require("../services/geminiService.js");
const { coursesForSkills } = require("../services/lmsCourses.js");
const { lastRun, claimRun, markRun } = require("../services/stateService.js");

const router = express.Router();

const OpportunityProfile = require("../models/OpportunityProfile");
const { ageFrom, bandFor } = require("../services/eligibilityRules");

/** True when the student's opportunity profile puts them under 18. */
const isMinor = async (userId) => {
  const profile = await OpportunityProfile.findOne({ userId }).select("dateOfBirth").lean();
  const band = bandFor(ageFrom(profile?.dateOfBirth));
  return !!band && band.id !== "adult";
};

/** Candidate pool size pulled from Mongo before in-memory scoring. */
const POOL_LIMIT = 600;

/* Lazy ingest: the first search on an empty database populates it,
   rather than forcing the user to run `npm run ingest` first.

   Tracked per country, not globally, because "populated" is only answerable
   relative to where the user is — an index holding 400 German listings has
   nothing at all for someone searching from India, and a single global
   timestamp would suppress the very fetch that would fix it.

   The timestamps live in jobboard_state, not in a Map: an in-memory cooldown
   resets on every deploy, and on a two-instance host each instance would
   re-ingest independently — both ways of spending metered provider calls to
   re-fetch what was just fetched. See services/stateService.js. */
const INGEST_COOLDOWN_MS = 15 * 60 * 1000;
const MIN_LOCAL_JOBS = 40;

/**
 * Sources that can be asked about one specific town, and are cheap enough
 * to call while someone waits. Everything else reads whole job boards and
 * takes ten seconds or more.
 */
const CITY_PROVIDERS = ["JSearch", "Adzuna"];

/**
 * Longest a search may wait on a fetch before answering with what it has.
 *
 * A reverse proxy gives an upstream about sixty seconds and then returns
 * 504 to the browser — the request is killed from the front, so no amount
 * of care inside the handler helps once it has been slow for a minute. The
 * cold-start path could reach that on its own: an empty database makes the
 * first search block on a full ingest, which reads eighty company boards,
 * geocodes, and writes thirteen thousand documents.
 *
 * These caps are the promise that a response always comes back. Work that
 * outruns them is not cancelled — the ingest keeps going and its results
 * land for the next search — it just stops being something a user waits on.
 */
const COLD_START_BUDGET_MS = 15_000;
const CITY_FETCH_BUDGET_MS = 8_000;

/** Resolve to `fallback` if `work` hasn't finished in time. */
function withDeadline(work, ms, fallback) {
  let timer;
  const capped = new Promise((resolve) => {
    timer = setTimeout(() => resolve(fallback), ms);
  });
  // Unhandled rejections would crash the process once nobody is awaiting
  // the original promise any more.
  work.catch(() => {});
  return Promise.race([work, capped]).finally(() => clearTimeout(timer));
}

/** Below this many on-site listings, a city counts as uncovered. */
const MIN_CITY_JOBS = 12;

/** Below this many listings for a specific role in a city, fetch that role. */
const MIN_ROLE_JOBS = 4;
const CITY_COOLDOWN_MS = 6 * 60 * 60 * 1000;

/**
 * Fetch listings for the city the user actually named.
 *
 * Country-level coverage says nothing about a particular town. India holds
 * over seven hundred on-site listings, so the country check below always
 * passes — and yet Kochi, Vijayawada and Coimbatore have almost none,
 * because the company boards only publish where employers keep offices.
 * The effect was that a configured JSearch key sat unused: every search
 * looked "populated" and no city was ever fetched.
 *
 * So coverage is measured where the user is standing, and only the
 * city-capable sources are called — one request, a second or two, cheap
 * enough to run before the response rather than after it. The cooldown is
 * per city and long, because these are metered and a city does not fill up
 * again within the hour.
 */
async function ensureCityCovered(search, place, titlePatterns = []) {
  if (!place?.city || !isConnected()) return null;

  // Keyed by city *and* role. A city is not covered in general, only for
  // the kinds of work we happen to have fetched: every city was warmed with
  // the query "developer", so Mangaluru held 57 listings and not one that a
  // search for Executive Assistant could match. Measuring coverage without
  // the role made the city look full and the fetch never ran, which is how
  // a configured key still produced "no listings here".
  const roleKey = titlePatterns.length ? String(titlePatterns[0]) : "*";
  const key = `city-ingest:${place.city}|${place.countryCode}|${roleKey}`.toLowerCase();
  const last = await lastRun(key);
  if (last && Date.now() - last.getTime() < CITY_COOLDOWN_MS) return null;

  const here = cityCoverageQuery(place);
  if (!here) return null;

  const scope = { active: true, remote: false, ...here };
  if (titlePatterns.length) scope.title = { $in: titlePatterns };

  // A city-wide gap needs a dozen listings to close; a single role in one
  // city is a much narrower question, and a handful is a real answer.
  const threshold = titlePatterns.length ? MIN_ROLE_JOBS : MIN_CITY_JOBS;
  const count = await Job.countDocuments(scope);
  if (count >= threshold) return null;

  // Atomic: on a lost race another request or instance is already fetching
  // this exact city-and-role, and doubling a metered call helps nobody.
  const { claimed } = await claimRun(key, CITY_COOLDOWN_MS);
  if (!claimed) return null;
  try {
    // JSearch returns coordinates itself, so nothing here needs geocoding.
    return await withDeadline(
      ingestAll({ search, place, only: CITY_PROVIDERS, maxGeocodes: 0 }),
      CITY_FETCH_BUDGET_MS,
      { timedOut: true }
    );
  } catch (err) {
    return { error: err.message };
  }
}

/**
 * Add the Gemini signal to the listings that survived ranking.
 *
 * Costs one embedding request per search — the profile's — because the
 * listings were embedded ahead of time and are looked up by key. Returns
 * the original results untouched if there's no key, no budget, or no
 * vectors, so this can fail entirely without the endpoint noticing.
 */
/** A refinement gets this long and no longer. */
const SEMANTIC_DEADLINE_MS = 2500;

async function rescoreSemantically(results, profile, sortBy) {
  if (!results.length || !geminiConfigured() || !isConnected() || quotaExhausted()) {
    return { results, applied: false, covered: 0 };
  }

  // Wrapped in a deadline as well as a try/catch. "Never fail a search over
  // a refinement" was only half the guarantee — the pass could still *delay*
  // one indefinitely, and it did: with the daily embedding allowance spent,
  // the retry logic turned a 90ms search into 130 seconds of politely
  // waiting out a rate limit. Slow is its own kind of broken.
  const deadline = new Promise((resolve) =>
    setTimeout(() => resolve({ results, applied: false, covered: 0 }), SEMANTIC_DEADLINE_MS)
  );

  return Promise.race([deadline, semanticPass(results, profile, sortBy)]);
}

async function semanticPass(results, profile, sortBy) {
  try {
    const ids = results.map((r) => r.job.externalId).filter(Boolean);
    const rows = await JobEmbedding.find({ externalId: { $in: ids } })
      .select("externalId vector")
      .lean();
    if (!rows.length) return { results, applied: false, covered: 0 };

    const profileVector = await embedOne(profileText(profile));
    if (!profileVector) return { results, applied: false, covered: 0 };

    const vectors = new Map(rows.map((r) => [r.externalId, r.vector]));
    return {
      results: applySemantic(results, profile, profileVector, vectors, cosineSimilarity, sortBy),
      applied: true,
      covered: rows.length,
    };
  } catch {
    // A ranking refinement is never worth failing a search over.
    return { results, applied: false, covered: 0 };
  }
}

async function ensurePopulated(search, place) {
  if (!isConnected()) return { triggered: false };

  const key = `ingest:${place?.countryCode || "GLOBAL"}`;
  const last = await lastRun(key);
  const stale = !last || Date.now() - last.getTime() > INGEST_COOLDOWN_MS;

  const scope = place?.country
    ? { active: true, country: new RegExp(escapeRegex(place.country), "i") }
    : { active: true };
  const count = await Job.countDocuments(scope);

  if (count > MIN_LOCAL_JOBS && !stale) return { triggered: false, count };

  // Atomic claim: exactly one request — on one instance — refreshes this
  // scope per cooldown window. Losing means someone else's refresh is in
  // flight; for a healthy index that is nothing, for an empty one it is
  // worth telling the student their next search will have more.
  const { claimed } = await claimRun(key, INGEST_COOLDOWN_MS);
  if (!claimed) {
    return count > MIN_LOCAL_JOBS
      ? { triggered: false, count }
      : { triggered: false, count, refreshing: true };
  }

  // Reading eighty company boards takes upwards of ten seconds, and the
  // geocoding behind it is rate-limited to about one place per second. That
  // is fine as maintenance and unacceptable as latency, so only block when
  // the index genuinely cannot answer this search. A merely stale index can
  // answer it now and refresh behind the response.
  if (count > MIN_LOCAL_JOBS) {
    ingestAll({ search, place, maxGeocodes: INLINE_GEOCODES }).catch(() => {});
    return { triggered: false, count, refreshing: true };
  }

  try {
    // Bounded. The index being empty is exactly when the ingest is slowest
    // and exactly when someone is waiting on it, so answer with whatever
    // exists once the budget is spent and let the rest arrive behind us.
    const result = await withDeadline(
      ingestAll({ search, place, maxGeocodes: INLINE_GEOCODES }),
      COLD_START_BUDGET_MS,
      { stillRunning: true }
    );
    return { triggered: true, ...result };
  } catch (err) {
    return { triggered: true, error: err.message };
  }
}

/**
 * A Mongo clause matching listings the user could plausibly take, given
 * where they are — the pre-filter counterpart of `locationEligible`.
 *
 * Without it the pool is drawn globally and only then filtered by place,
 * which starves exactly the searches that need it most: the index holds 38
 * on-site Hyderabad jobs, but a Software Engineer search matched 1,672
 * titles worldwide, and the 600 most recent of those contained almost none
 * of them. Deliberately looser than the in-memory gate — this only has to
 * get the right candidates into the room.
 */
function localClause(place) {
  if (!place) return null;

  // Deliberately no bare `remote: true` here. The index holds ~3,600 remote
  // listings against 38 on-site Hyderabad ones, so admitting them all to the
  // "local" draw and sorting by date buries the local jobs entirely — the
  // exact starvation this clause exists to prevent. Remote roles come in
  // through their own bounded draw below.
  const or = [];

  if (place.coords) {
    // $geoWithin rather than $near: it composes inside $or, and the exact
    // distance is re-checked in memory anyway.
    or.push({
      geo: { $geoWithin: { $centerSphere: [place.coords, COMMUTE_KM / EARTH_RADIUS_KM] } },
    });
  }
  for (const term of [place.city, place.country].filter(Boolean)) {
    const rx = new RegExp(escapeRegex(term), "i");
    or.push({ city: rx }, { location: rx });
  }

  return { $or: or };
}

const EARTH_RADIUS_KM = 6378.1;
const COMMUTE_KM = 150;   // mirrors matchService; kept local to avoid an import cycle

/** How many remote listings ride alongside a located search. */
const REMOTE_SLICE = 150;

async function buildPool({ skills, roleName, roleText, jobType, remoteOnly, strictType, place }) {
  const base = { active: true };
  if (remoteOnly) base.remote = true;

  // Push the type filter into Mongo when it's a hard requirement. Filtering
  // only after selection would spend the whole pool budget on listings the
  // ranker is about to discard.
  const typeLocked = strictType && jobType && jobType !== "Any";
  if (typeLocked) base.type = jobType;

  const role = roleName ? getRole(roleName) : null;

  // The role is a hard requirement downstream, so make it one here too.
  // Selecting the pool on skills and *then* dropping everything not titled
  // as the role spends the entire budget on listings the ranker is about to
  // discard: a search for Data Analyst in Bengaluru would pull 600 jobs that
  // merely mention SQL, find 25 in the city, and reject all of them on
  // title — reporting no analyst jobs when the index holds plenty.
  //
  // Same patterns the ranker uses, so the pool can't be selected on one
  // definition of the role and then emptied by another.
  const titlePatterns = roleTitlePatterns(roleName, roleText);
  const roleScoped = titlePatterns.length ? { ...base, title: { $in: titlePatterns } } : base;

  const or = [];
  if (skills.length) or.push({ skills: { $in: skills } });
  if (role) or.push({ skills: { $in: role.core } });

  const draw = async (filter) => {
    let found = or.length
      ? await Job.find({ ...filter, $or: or }).sort({ postedAt: -1 }).limit(POOL_LIMIT).lean({ virtuals: true })
      : [];

    // Top up with recent listings so the ranker always has something to
    // work with; relaxes the skill overlap, never the caller's filter.
    if (found.length < POOL_LIMIT) {
      const seen = new Set(found.map((j) => String(j._id)));
      const filler = await Job.find(filter)
        .sort({ postedAt: -1 })
        .limit(POOL_LIMIT - found.length)
        .lean({ virtuals: true });
      found = found.concat(filler.filter((j) => !seen.has(String(j._id))));
    }
    return found;
  };

  // Right role, right area — what the search is actually asking for.
  const local = localClause(place);
  let pool = local ? await draw({ ...roleScoped, ...local }) : await draw(roleScoped);

  // A fully-remote role names no place, so no place-based clause can reach
  // it. Add a bounded slice of them: enough that working from this city
  // stays an option, few enough that they can't swamp the local jobs.
  if (local) {
    const seen = new Set(pool.map((j) => String(j._id)));
    const remotes = await Job.find({ ...roleScoped, remote: true })
      .sort({ postedAt: -1 })
      .limit(REMOTE_SLICE)
      .lean({ virtuals: true });
    pool = pool.concat(remotes.filter((j) => !seen.has(String(j._id))));
  }

  // Nothing local. Widen to the role worldwide so the ranker can count how
  // many matched everything except the place — that count is what turns a
  // blank page into "23 jobs matched, all elsewhere".
  if (!pool.length && local) pool = await draw(roleScoped);

  // No listing anywhere carries that title — "Blockchain Developer" is a
  // real job that no board in the index spells that way. Returning an empty
  // pool would surface as "no jobs cleared the match threshold", which is
  // both wrong and unactionable, so fall back to the unscoped draw and let
  // the ranker sort it out by role fit.
  if (!pool.length && titlePatterns.length) pool = await draw(base);

  // When the type is a soft preference, surface exact matches first so the
  // pool cap can't crowd them out before scoring.
  if (!typeLocked && jobType && jobType !== "Any") {
    pool = [...pool.filter((j) => j.type === jobType), ...pool.filter((j) => j.type !== jobType)];
  }

  return pool;
}

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/* ---------------- misspelled place names ---------------- */

/**
 * Levenshtein distance, abandoned once it exceeds `max`.
 *
 * Only ever called on short city names, so the quadratic cost is
 * irrelevant; the bound is there to skip obviously unrelated pairs early
 * rather than to make this fast.
 */
function editDistance(a, b, max) {
  if (Math.abs(a.length - b.length) > max) return max + 1;

  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    let best = i;
    for (let k = 1; k <= b.length; k++) {
      const cost = a[i - 1] === b[k - 1] ? 0 : 1;
      row[k] = Math.min(prev[k] + 1, row[k - 1] + 1, prev[k - 1] + cost);
      if (row[k] < best) best = row[k];
    }
    if (best > max) return max + 1;   // no cell on this row can recover
    prev = row;
  }
  return prev[b.length];
}

/* The correction vocabulary is the index's own city names, refreshed
   periodically. Using what we actually hold — rather than a bundled
   gazetteer — means a correction can only ever point at a place we have
   jobs for, and the list grows by itself as new sources are ingested. */
let cityVocab = { at: 0, names: [] };
const CITY_VOCAB_TTL_MS = 10 * 60 * 1000;

async function knownCities() {
  if (cityVocab.names.length && Date.now() - cityVocab.at < CITY_VOCAB_TTL_MS) return cityVocab.names;

  // Counted, not just listed. Employers misspell their own city — this index
  // contains one listing filed under "Banglore" — so a name existing is no
  // evidence it's the right spelling. Frequency is what separates the
  // canonical form from someone's typo.
  const raw = await Job.aggregate([
    { $match: { active: true, city: { $ne: "" } } },
    { $group: { _id: "$city", n: { $sum: 1 } } },
  ]);

  const seen = new Map();
  for (const { _id, n } of raw) {
    // Stored values carry all sorts of tails — "Bengaluru, Karnataka",
    // "Bengaluru - BLR1". The first comma segment, minus any site code, is
    // the name a person would actually type.
    const head = String(_id).split(",")[0].replace(/[-–—]\s*\S+$/, "").trim();
    const key = norm(head);
    if (key.length <= 2) continue;

    const prior = seen.get(key);
    if (prior) prior.count += n;
    else seen.set(key, { key, display: head, count: n });
  }

  cityVocab = { at: Date.now(), names: [...seen.values()] };
  return cityVocab.names;
}

/**
 * Best-guess correction for a location the geocoder couldn't place, or null.
 *
 * The geocoder is unforgiving and inconsistent about spelling: "Mangalor"
 * resolves, "Hydrabadh" and "Chenai" return nothing, and "Banglore" comes
 * back as an expressway. A failed lookup used to disable the location
 * filter altogether, so a single slip turned a Hyderabad search into a
 * worldwide one.
 *
 * Only close matches count. One or two edits is a typo; more is a different
 * place, and quietly searching a city the user did not ask for would be a
 * worse failure than admitting we couldn't read it.
 */
/**
 * Does the geocoder's answer actually look like the place that was typed?
 *
 * It answers a misspelling with whatever it can find rather than with
 * nothing — "Banglore" comes back as an expressway in Tamil Nadu — and a
 * confidently wrong answer is worse than no answer, because it redirects
 * the search without anyone noticing. A containment check covers the
 * legitimate widenings ("London" → "Greater London"); everything else has
 * to be within a typo's distance.
 */
function resembles(input, place) {
  if (!place) return false;

  const parts = String(input).split(",").map((s) => norm(s.trim())).filter(Boolean);

  // If the input named a country, the answer has to be in it. "Belgaum,
  // India" resolves to Ypres in Belgium — a confident, well-formed answer
  // on the wrong continent, which no amount of city-name comparison
  // catches because the city names genuinely don't resemble each other.
  if (parts.length > 1) {
    const tail = parts[parts.length - 1];
    const country = norm(place.country ?? "");
    const known = [country, ...(place.countryAliases ?? []).map(norm)].filter(Boolean);
    if (known.length && !known.some((c) => c === tail || c.includes(tail) || tail.includes(c))) {
      return false;
    }
  }

  const typed = parts[0] ?? "";
  const got = norm(place.city ?? "");
  if (!typed || !got) return true;

  // Alias table first — it's the authoritative answer for the cities that
  // have two real names, and character distance gets those wrong in both
  // directions. Note this asks what the *resolved* place is called, not
  // what was typed: place.cityTerms echoes the query back and would call
  // any spelling a match, including the wrong ones.
  if (spellingsOf(place.city).includes(typed)) return true;

  if (got.includes(typed) || typed.includes(got)) return true;

  const limit = typed.length <= 6 ? 1 : 2;
  return editDistance(typed, got, limit) <= limit;
}

/** Present a corrected place the way a person would write it. */
const titleCase = (s) =>
  String(s).replace(/\b[a-z]/g, (c) => c.toUpperCase());

async function correctLocation(input) {
  const parts = String(input).split(",").map((s) => s.trim()).filter(Boolean);
  const typed = norm(parts[0] ?? "");
  if (typed.length < 4) return null;      // too short to correct confidently

  const limit = typed.length <= 6 ? 1 : 2;

  const candidates = [];
  for (const { key, display, count } of await knownCities()) {
    // The spelling as typed is never the answer here: this runs only when
    // that spelling already failed to place, or placed somewhere unrelated.
    // Skipping it is what lets "Banglore" — which one employer really did
    // file a job under — fall through to "Bangalore".
    if (key === typed) continue;
    const d = editDistance(typed, key, limit);
    if (d <= limit) candidates.push({ display, d, count });
  }

  if (!candidates.length) return null;

  // Closest first; among equals, the spelling more listings agree on.
  candidates.sort((a, b) => a.d - b.d || b.count - a.count);
  return titleCase([candidates[0].display, ...parts.slice(1)].join(", "));
}

/* Mongo .lean() skips virtuals unless the plugin is present, so derive
   daysAgo here — the scorer's freshness boost depends on it. */
function withDaysAgo(job) {
  const posted = job.postedAt ? new Date(job.postedAt).getTime() : null;
  return { ...job, daysAgo: posted ? Math.max(0, Math.round((Date.now() - posted) / 86400000)) : null };
}

/**
 * POST /api/jobs/recommend
 * The main endpoint: rank listings against a user profile and, when a
 * role is given, return the skill gap alongside.
 */
router.post("/recommend", async (req, res, next) => {
  try {
    const {
      skills: rawSkills = [],
      role: rawRole = "",
      jobType = "Any",
      location = "",
      coords = null,
      remoteOnly = false,
      strictType = true,
      sortBy = "relevance",
      limit = 60,
      sessionId = "",
      // True for machine-made queries — the Career Path "Jobs for you" tile.
      // A quiet search is ranked exactly like a real one but never logged:
      // logging it would pollute the admin demand charts, fill the student's
      // recent-search chips with queries they never typed, and — worst —
      // become their "latest search", which is what the daily job alerts
      // re-run. An alert should chase what the student last asked for, not
      // what a dashboard tile asked on their behalf.
      quiet = false,
    } = req.body ?? {};

    const skills = normalizeSkillList(Array.isArray(rawSkills) ? rawSkills : String(rawSkills).split(","));
    const roleText = String(rawRole).trim();
    const roleName = resolveRole(roleText);

    // Skills are what the ranking is mostly built on — without any, the skill
    // scorer hands every listing the same neutral score. A recognised role is
    // the one honest substitute: ranking on title fit, type and location is a
    // real "who is hiring for this role" answer (it is what the Career Path
    // tile asks). Free text alone is neither, so that still gets refused
    // rather than quietly returning noise.
    if (!skills.length && !roleName) {
      return res.status(400).json({ error: "Add at least one skill — searches are ranked on your skills." });
    }

    if (!isConnected()) {
      return res.status(503).json({
        error: "Database unavailable. Start MongoDB or set MONGODB_URI, then retry.",
      });
    }

    // The scraped board carries no age data, so it is closed to anyone whose
    // opportunity profile says they are under 18 — at the API, not only in
    // the UI that hides the tab. See services/eligibilityRules.js.
    if (await isMinor(req.user._id)) {
      return res.status(403).json({
        code: "JOBS_MINOR",
        error: "The global job board is for students aged 18 and over. Your Opportunities tab has what's open to you.",
      });
    }

    // Resolve what the user typed into a real place before anything reads it.
    // A bare city carries no country of its own, so without this the ranker
    // judges "Mangalore" against "Bengaluru, India" as a total mismatch.
    // Resolving first also lets the ingest below go and fetch listings *for
    // that place*, rather than whatever the boards happened to have.
    const locationInput = String(location).trim();
    let place = locationInput ? await resolvePlace(locationInput) : null;

    // The geocoder is intolerant of misspellings, and the location filter is
    // strict — so without this a typo means either no results or, worse, the
    // wrong ones. Correct against city names we hold jobs for, then resolve
    // again. Reported below so the UI can show what was actually searched.
    //
    // A failed lookup isn't the only case that needs this. Asked for
    // "Banglore" the geocoder returns an expressway in Tamil Nadu — a real
    // place, confidently wrong, and one that would silently redirect the
    // whole search. So the answer is also checked for resemblance to what
    // was typed, and a close known city wins over a distant stranger.
    let locationCorrected = null;
    if (locationInput && !resembles(locationInput, place)) {
      const suggestion = await correctLocation(locationInput);
      const corrected = suggestion ? await resolvePlace(suggestion) : null;

      if (corrected && resembles(suggestion, corrected)) {
        place = corrected;
        locationCorrected = suggestion;
      } else {
        // Nothing better available — so drop the bad answer rather than
        // search it. An unresolved place still gates on the words the user
        // typed, which keeps an Indian search in India; keeping Ypres would
        // not. Better to admit we couldn't place it.
        place = null;
      }
    }

    const searchTerm = roleName || roleText || skills.slice(0, 2).join(" ");
    const ingest = await ensurePopulated(searchTerm, place);

    // Then top up this specific city, which the country-wide check above
    // can't see is empty. Runs before the pool is drawn so anything fetched
    // is available to *this* search rather than the next one.
    const cityFetch = await ensureCityCovered(
      searchTerm,
      place,
      roleTitlePatterns(roleName, roleText)
    );

    const pool = (
      await buildPool({ skills, roleName, roleText, jobType, remoteOnly, strictType: !!strictType, place })
    ).map(withDaysAgo);

    const profile = {
      skills,
      roleName,
      roleText,
      jobType,
      location: locationInput,
      locationTerms: place?.terms ?? locTokens(locationInput),
      cityTerms: place?.cityTerms ?? locTokens(locationInput),
      locationKnown: !!place,
      // Both feed the remote-reach test: whether a work-from-anywhere role
      // is open to someone in this country.
      country: place?.country ?? "",
      countryAliases: place?.countryAliases ?? [],
      continent: place?.continent ?? null,
      // Coordinates the browser measured beat the ones a city name implies.
      coords:
        Array.isArray(coords) && coords.length === 2
          ? coords.map(Number)
          : place?.coords ?? null,
      remoteOnly: !!remoteOnly,
    };

    const { total, excludedByLocation, excludedByRole, roleRelaxed, roleIgnored, radiusKm, results } = rankJobs(pool, profile, {
      strictType: !!strictType,
      sortBy,
      limit: Math.min(Number(limit) || 60, 100),
      minScore: 15,
    });

    // Semantic pass over the survivors. One embedding call for the profile,
    // one indexed read for their vectors — the listings were embedded ahead
    // of time by `npm run embed`. Silent no-op without a Gemini key.
    const semantic = await rescoreSemantically(results, profile, sortBy);

    // Skill demand observed in listings whose title matches the role —
    // this is what makes "trending skills" reflect the real market.
    let gap = null;
    if (roleName) {
      const role = getRole(roleName);
      const names = [role.name, ...role.aliases].map(norm);
      const demand = new Map();
      for (const j of pool) {
        const t = norm(j.title);
        if (!names.some((n) => t.includes(n))) continue;
        for (const s of j.skills ?? []) demand.set(s, (demand.get(s) ?? 0) + 1);
      }
      gap = analyzeGap(roleName, skills, demand);
      // The LMS's own answer to the gap: which published courses teach the
      // skills this student is missing. Decoration only — an empty list just
      // means the card has no course links, never a failed search.
      gap.teach = await coursesForSkills([...(gap.learn ?? []), ...(gap.nice ?? [])]);
    }

    // Fire-and-forget analytics; never let logging fail a search.
    if (!quiet) Search.create({
      userId: req.user?._id,
      sessionId: String(sessionId).slice(0, 64),
      skills, role: roleName || roleText, jobType,
      location: profile.location, remoteOnly: profile.remoteOnly,
      resultCount: total, topScore: results[0]?.match.total ?? 0,
    }).catch(() => {});

    res.json({
      query: {
        skills, role: roleName, roleText, jobType,
        location: profile.location,
        // What the location was actually understood to be, so the UI can
        // show the user we read them correctly.
        locationResolved: place?.label ?? null,
        // Set when the typed place didn't resolve and we searched a
        // corrected spelling instead — the user has to be told, because the
        // results are for a place they didn't literally type.
        locationCorrected,
        // Typed, unresolvable, and not correctable. Results are gated on the
        // raw words, so they're narrow and the UI should say why.
        locationUnresolved: !!locationInput && !place,
        remoteOnly, sortBy,
      },
      roleRecognized: !!roleName,
      total,
      // How many otherwise-good matches sit outside the named place. Lets
      // the UI say "none here, N elsewhere" instead of a bare "no matches".
      excludedByLocation,
      // Matched on skills and location but not titled as the role asked
      // for. Distinguishes "nowhere near you" from "not that job".
      excludedByRole,
      // Nothing was titled as the role asked for, so these are the closest
      // equivalents by role fit rather than exact matches.
      roleRelaxed: !!roleRelaxed,
      // No title in the index resembled the role, so these are ranked on
      // skills alone — the UI says so rather than implying a role match.
      roleIgnored: !!roleIgnored,
      // Whether the Gemini pass ran, and for how many of the shown listings.
      semanticApplied: semantic.applied,
      semanticCovered: semantic.covered,
      locationRadiusKm: profile.locationKnown && profile.location ? radiusKm : null,
      returned: results.length,
      poolSize: pool.length,
      ingest: ingest.triggered ? ingest.report ?? { error: ingest.error } : undefined,
      // True when this answer came from the stored index while a refresh runs
      // behind it — the client says so, or the next search finding more
      // results looks like a bug.
      refreshing: ingest.refreshing || ingest.stillRunning ? true : undefined,
      // Listings pulled for this city just now, so the UI can say the index
      // was extended rather than leaving a thin result looking like a bug.
      cityFetch: cityFetch?.report ?? undefined,
      gap,
      results: semantic.results.map(({ job, match }) => ({
        id: job._id,
        title: job.title,
        company: job.company,
        // Empty when we can't identify the employer — the client falls back
        // to a map lookup rather than linking somewhere that may not be them.
        companyUrl: job.companyUrl || "",
        companyLocation: job.companyLocation || "",
        location: job.location || [job.city, job.country].filter(Boolean).join(", "),
        country: job.country,
        remote: job.remote,
        type: job.type,
        salary: job.salary,
        url: job.url,
        source: job.source,
        skills: job.skills,
        daysAgo: job.daysAgo,
        match,
      })),
    });
  } catch (err) {
    next(err);
  }
});

/** GET /api/jobs — browse/paginate the stored index. */
router.get("/", async (req, res, next) => {
  try {
    if (!isConnected()) return res.status(503).json({ error: "Database unavailable." });

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Number(req.query.limit) || 20);
    const q = { active: true };

    if (req.query.type && req.query.type !== "Any") q.type = req.query.type;
    if (req.query.remote === "true") q.remote = true;
    if (req.query.country) q.country = new RegExp(escapeRegex(req.query.country), "i");
    if (req.query.q) q.$text = { $search: String(req.query.q) };

    const [items, total] = await Promise.all([
      Job.find(q).sort({ postedAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      Job.countDocuments(q),
    ]);

    res.json({ page, limit, total, pages: Math.ceil(total / limit), items });
  } catch (err) {
    next(err);
  }
});

/** GET /api/jobs/stats — index health, shown in the UI footer. */
router.get("/stats", async (_req, res, next) => {
  try {
    if (!isConnected()) return res.json({ connected: false, total: 0, sources: [] });

    const [total, sources, types, newest] = await Promise.all([
      Job.countDocuments({ active: true }),
      Job.aggregate([{ $match: { active: true } }, { $group: { _id: "$source", count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
      Job.aggregate([{ $match: { active: true } }, { $group: { _id: "$type", count: { $sum: 1 } } }]),
      Job.findOne({ active: true }).sort({ postedAt: -1 }).select("postedAt").lean(),
    ]);

    res.json({
      connected: true,
      total,
      sources: sources.map((s) => ({ name: s._id, count: s.count })),
      types: Object.fromEntries(types.map((t) => [t._id, t.count])),
      newestPostedAt: newest?.postedAt ?? null,
    });
  } catch (err) {
    next(err);
  }
});

/** GET /api/jobs/:id */
router.get("/:id", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: "Invalid id." });
    const job = await Job.findById(req.params.id).lean({ virtuals: true });
    if (!job) return res.status(404).json({ error: "Job not found." });
    res.json(job);
  } catch (err) {
    next(err);
  }
});

/**
 * Refresh the index from all global sources.
 *
 * Not a route on this router any more. Ingestion spends real money — JSearch
 * and Adzuna are metered — so inside the LMS it belongs to an administrator,
 * and admin routes have to be mounted ahead of the student guard. It stamps
 * the same jobboard_state key the lazy-ingest path reads, so a manual refresh
 * satisfies that cooldown too and the next student search does not
 * immediately re-fetch everything an admin just pulled.
 */
const runIngest = async ({ search, location } = {}) => {
  const place = location ? await resolvePlace(String(location)) : null;
  const result = await ingestAll({ search, place });
  await markRun(`ingest:${place?.countryCode || "GLOBAL"}`);
  return result;
};

module.exports = router;
module.exports.runIngest = runIngest;
