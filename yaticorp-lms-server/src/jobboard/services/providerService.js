/**
 * providerService — pulls listings from global job boards and upserts
 * them into MongoDB.
 *
 * Running server-side removes the browser's CORS constraint and keeps
 * API keys out of the client. Each provider normalizes into the Job
 * model's shape and returns an array; `ingestAll` handles persistence.
 *
 * Adding a keyed source (Adzuna, Jooble, JSearch/RapidAPI) is just
 * another entry in PROVIDERS that reads its key from process.env and
 * returns the same shape — nothing else changes.
 */
const crypto = require("node:crypto");
const Job = require("../models/Job.js");
const { extractSkills, norm } = require("./matchService.js");
const ApiUsage = require("../models/ApiUsage.js");
const { isConnected } = require("../config/db.js");
const { COMPANIES, lookupCompany } = require("../data/companies.js");
const { geocodePlace } = require("./geoService.js");

const TIMEOUT_MS = 12000;

async function fetchJSON(url, init = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      ...init,
      signal: ctrl.signal,
      headers: { Accept: "application/json", "User-Agent": "CareerCompass/1.0", ...init.headers },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

/* ---------------- metered-provider accounting ---------------- */

/** Calendar month in UTC, the bucket a plan's allowance resets on. */
const usageKey = (provider) => `${provider}:${new Date().toISOString().slice(0, 7)}`;

/**
 * How many calls this provider has left this month. Errs generous when the
 * database is unreachable: a metered source going quiet because the counter
 * couldn't be read would be a confusing way to lose coverage, and the
 * per-run cap still bounds the damage.
 */
async function remainingCalls(provider, limit) {
  if (!isConnected()) return limit;
  try {
    const row = await ApiUsage.findOne({ key: usageKey(provider) }).lean();
    return Math.max(0, limit - (row?.calls ?? 0));
  } catch {
    return limit;
  }
}

async function recordCall(provider) {
  if (!isConnected()) return;
  const month = new Date().toISOString().slice(0, 7);
  try {
    await ApiUsage.updateOne(
      { key: usageKey(provider) },
      { $inc: { calls: 1 }, $setOnInsert: { provider, month } },
      { upsert: true }
    );
  } catch {
    /* losing one tick of the counter is better than failing the ingest */
  }
}

/** What a metered provider has spent this month, for the ingest report. */
async function meteredUsage() {
  if (!isConnected()) return [];
  try {
    const month = new Date().toISOString().slice(0, 7);
    const rows = await ApiUsage.find({ month }).lean();
    return rows.map((r) => ({ provider: r.provider, calls: r.calls, month }));
  } catch {
    return [];
  }
}

/**
 * Stable identity for a listing that has no stable id of its own.
 *
 * Tracking parameters differ between fetches of the same posting, so they
 * are stripped before hashing — otherwise the "stable" id changes with the
 * URL and we are back to duplicating.
 */
function stableId(url) {
  let clean = String(url ?? "").trim();
  try {
    const u = new URL(clean);
    for (const k of [...u.searchParams.keys()]) {
      if (/^(utm_|ref|src|source|gh_src|campaign)/i.test(k)) u.searchParams.delete(k);
    }
    clean = u.toString();
  } catch {
    /* not a parseable URL — hash it as-is */
  }
  return crypto.createHash("sha1").update(clean).digest("hex").slice(0, 24);
}

/**
 * GeoJSON point for a coordinate pair, or nothing.
 *
 * `Number(null)` is 0 and passes Number.isFinite, so a listing with no
 * coordinates was being pinned to [0, 0] — Null Island, in the Gulf of
 * Guinea. Coordinates decide the location gate outright, so those listings
 * measured seven thousand kilometres from every Indian city and were
 * silently dropped from every located search. Ten Mangaluru jobs vanished
 * this way while their location text said "Mangaluru, Karnataka".
 */
function toGeo(rawLat, rawLon) {
  const lat = Number(rawLat);
  const lon = Number(rawLon);
  if (rawLat == null || rawLon == null) return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (lat === 0 && lon === 0) return null;                 // no job is at Null Island
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
  return { type: "Point", coordinates: [lon, lat] };
}

const stripHTML = (html) =>
  String(html ?? "").replace(/<[^>]*>/g, " ").replace(/&[a-z]+;/gi, " ").replace(/\s+/g, " ").trim();

function toDate(v) {
  if (!v) return null;
  if (typeof v === "number") return new Date(v < 1e12 ? v * 1000 : v);
  const t = Date.parse(v);
  return Number.isNaN(t) ? null : new Date(t);
}

/** Map assorted provider type strings onto our enum. */
function canonicalType(raw) {
  const n = norm(Array.isArray(raw) ? raw.join(" ") : raw);
  if (!n) return "Unknown";
  if (/(^|\s)(intern|internship|trainee|apprentice|praktikum|werkstudent)/.test(n)) return "Internship";
  if (/part.?time|teilzeit|minijob/.test(n)) return "Part-time";
  if (/full.?time|vollzeit|permanent|festanstellung/.test(n)) return "Full-time";
  if (/contract|freelance|temporary/.test(n)) return "Contract";
  return "Unknown";
}

/** Last comma-separated chunk of a location string is usually the country. */
function splitLocation(location) {
  const parts = String(location ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (!parts.length) return { city: "", country: "" };
  // A bare "Darmstadt" is a city, not a country — leave country empty so
  // the provider's own default (its home market) applies instead.
  if (parts.length === 1) return { city: parts[0], country: "" };
  return { city: parts.slice(0, -1).join(", "), country: parts[parts.length - 1] };
}

/**
 * Beyond this many tags, the poster is keyword-stuffing rather than
 * describing the role — staffing agencies routinely tag one listing with
 * their entire tech stack, which would make a graphic-design job look like
 * a Node.js opening. Past the limit we ignore tags and trust the text.
 */
const MAX_TRUSTED_TAGS = 20;

/**
 * Titles, and tags in reasonable numbers, are curated — ambiguous terms
 * there are trustworthy. The description is prose and gets the strict pass.
 */
function skillsFrom({ tags = [], title = "", description = "" }) {
  const trusted = tags.length <= MAX_TRUSTED_TAGS ? tags.join(" ") : "";
  return [
    ...new Set([
      ...extractSkills(`${trusted} ${title}`, { strict: false }),
      ...extractSkills(description),
    ]),
  ].slice(0, 16);
}

/* ---------------- Provider: Remotive ---------------- */

async function remotive({ search } = {}) {
  const params = new URLSearchParams({ limit: "100" });
  if (search) params.set("search", search);
  const data = await fetchJSON(`https://remotive.com/api/remote-jobs?${params}`);

  return (data?.jobs ?? []).map((j) => {
    const desc = stripHTML(j.description).slice(0, 5000);
    const where = j.candidate_required_location || "Worldwide";
    const { country } = splitLocation(where);

    return {
      externalId: `remotive:${j.id}`,
      title: j.title || "Untitled role",
      company: j.company_name || "—",
      description: desc.slice(0, 600),
      location: /remote/i.test(where) ? where : `Remote — ${where}`,
      city: "Remote",
      country,
      remote: true,
      type: canonicalType(j.job_type) === "Unknown" ? "Full-time" : canonicalType(j.job_type),
      skills: skillsFrom({ tags: j.tags ?? [], title: j.title, description: desc.slice(0, 2500) }),
      salary: j.salary || "",
      url: j.url,
      source: "Remotive",
      postedAt: toDate(j.publication_date) ?? new Date(),
    };
  });
}

/* ---------------- Provider: Arbeitnow ---------------- */

async function arbeitnow() {
  const data = await fetchJSON("https://www.arbeitnow.com/api/job-board-api");

  return (data?.data ?? []).map((j) => {
    const desc = stripHTML(j.description).slice(0, 5000);
    const { city, country } = splitLocation(j.location);
    const fromTypes = canonicalType(j.job_types);
    const type = fromTypes !== "Unknown" ? fromTypes : canonicalType(j.title);

    return {
      externalId: `arbeitnow:${j.slug || j.url}`,
      title: j.title || "Untitled role",
      company: j.company_name || "—",
      description: desc.slice(0, 600),
      location: j.location || (j.remote ? "Remote" : ""),
      city,
      country: country || "Germany",
      remote: !!j.remote,
      type: type === "Unknown" ? "Full-time" : type,
      skills: skillsFrom({ tags: j.tags ?? [], title: j.title, description: desc.slice(0, 2500) }),
      salary: "",
      url: j.url,
      source: "Arbeitnow",
      postedAt: toDate(j.created_at) ?? new Date(),
    };
  });
}

/* ---------------- Provider: Adzuna (keyed) ---------------- */

/**
 * The only source here that can be asked "jobs within N km of this city",
 * and the only one that returns coordinates — which is what makes ranking
 * by real distance possible rather than guessing from place names.
 *
 * Needs a free key pair (ADZUNA_APP_ID / ADZUNA_APP_KEY from
 * developer.adzuna.com). Without them it contributes nothing and the other
 * providers carry on, so the app runs unconfigured.
 */
const ADZUNA_COUNTRIES = new Set(
  "at au be br ca ch de es fr gb in it mx nl nz pl sg us za".split(" ")
);

/** How wide a ring around the user's city to pull listings from, in km. */
const ADZUNA_RADIUS_KM = 50;
const ADZUNA_PER_PAGE = 50;

function adzunaType(j) {
  if (j.contract_time === "part_time") return "Part-time";
  if (j.contract_type === "contract") return "Contract";
  if (j.contract_time === "full_time") return "Full-time";
  const fromTitle = canonicalType(j.title);
  return fromTitle === "Unknown" ? "Full-time" : fromTitle;
}

function adzunaSalary(j) {
  const lo = Number(j.salary_min);
  const hi = Number(j.salary_max);
  if (!Number.isFinite(lo) && !Number.isFinite(hi)) return "";
  const fmt = (n) => Math.round(n).toLocaleString("en-US");
  if (Number.isFinite(lo) && Number.isFinite(hi) && lo !== hi) return `${fmt(lo)}–${fmt(hi)}`;
  return fmt(Number.isFinite(lo) ? lo : hi);
}

async function adzuna({ search, place } = {}) {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;
  if (!appId || !appKey) return [];

  const country = (place?.countryCode ?? "").toLowerCase();
  if (!ADZUNA_COUNTRIES.has(country)) return [];

  const base = (extra) =>
    `https://api.adzuna.com/v1/api/jobs/${country}/search/1?` +
    new URLSearchParams({
      app_id: appId,
      app_key: appKey,
      results_per_page: String(ADZUNA_PER_PAGE),
      content_type: "application/json",
      ...(search ? { what: search } : {}),
      ...extra,
    });

  // Two passes: tight around the user's city, then country-wide. The first
  // is what a "near me" search actually needs; the second keeps the index
  // usable when they clear the location box.
  const urls = [base({ where: place.city || place.label, distance: String(ADZUNA_RADIUS_KM) }), base({})];

  const pages = await Promise.allSettled(urls.map((u) => fetchJSON(u)));
  const out = new Map();

  for (const p of pages) {
    if (p.status !== "fulfilled") continue;

    for (const j of p.value?.results ?? []) {
      if (!j.id || !j.title || !j.redirect_url) continue;

      const desc = stripHTML(j.description).slice(0, 5000);
      const area = Array.isArray(j.location?.area) ? j.location.area : [];
      const geo = toGeo(j.latitude, j.longitude);

      out.set(j.id, {
        externalId: `adzuna:${j.id}`,
        title: j.title,
        company: j.company?.display_name || "—",
        description: desc.slice(0, 600),
        location: j.location?.display_name || area.join(", "),
        city: area[area.length - 1] || "",
        country: area[0] || place.country,
        // Adzuna publishes coordinates, so these listings support true
        // distance ranking instead of place-name guesswork.
        ...(geo ? { geo } : {}),
        remote: /\bremote\b/i.test(`${j.title} ${j.location?.display_name ?? ""}`),
        type: adzunaType(j),
        skills: skillsFrom({
          tags: j.category?.label ? [j.category.label] : [],
          title: j.title,
          description: desc.slice(0, 2500),
        }),
        salary: adzunaSalary(j),
        url: j.redirect_url,
        source: "Adzuna",
        postedAt: toDate(j.created) ?? new Date(),
      });
    }
  }

  return [...out.values()];
}

/* ---------------- Provider: JSearch (keyed, metered) ---------------- */

/**
 * JSearch reads Google for Jobs, which is the only index here that reaches
 * past the metros — it can answer "developer in Mangalore" with listings
 * that actually exist there, where every keyless source returns nothing.
 * It also hands back coordinates and the employer's own website, so its
 * listings arrive ready for distance ranking and for the company link.
 *
 * What makes it different from the other providers is the meter. The free
 * tier is about 200 requests a month, so a request is a resource to be
 * spent deliberately rather than a thing to do on every ingest:
 *
 *   - nothing is spent unless the search names a place, because
 *     metro coverage is already handled by the keyless boards
 *   - one request per ingest run by default
 *   - a persistent monthly ceiling, so a restart loop can't drain the plan
 *
 * Without a key it contributes nothing and the rest of the ingest is
 * unaffected, exactly like Adzuna.
 */
const JSEARCH_DEFAULT_HOST = "jsearch.p.rapidapi.com";

/** Stay under the free tier rather than exactly on it. */
const JSEARCH_MONTHLY_LIMIT = Number(process.env.JSEARCH_MONTHLY_LIMIT || 180);
const JSEARCH_CALLS_PER_RUN = Number(process.env.JSEARCH_CALLS_PER_RUN || 1);

/** JSearch's own employment-type vocabulary. */
function jsearchType(job) {
  const raw = job.job_employment_type ?? (job.job_employment_types ?? []).join(" ");
  const n = norm(raw);
  if (/intern/.test(n)) return "Internship";
  if (/parttime|part time/.test(n)) return "Part-time";
  if (/contractor|contract|temporary/.test(n)) return "Contract";
  if (/fulltime|full time/.test(n)) return "Full-time";
  const fromTitle = canonicalType(job.job_title);
  return fromTitle === "Unknown" ? "Full-time" : fromTitle;
}

function jsearchSalary(j) {
  /* Number(null) is 0, and 0 is finite — so an absent salary sailed through
     the guard below and was written out as the string "0", which the card
     then printed as a confident figure. 961 listings carried it. A salary
     of zero is not a salary. */
  const amount = (v) => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : null;
  };
  const lo = amount(j.job_min_salary);
  const hi = amount(j.job_max_salary);
  if (lo == null && hi == null) return "";
  const unit = norm(j.job_salary_period) === "hour" ? "/hr" : norm(j.job_salary_period) === "month" ? "/mo" : "";
  const cur = j.job_salary_currency ? `${j.job_salary_currency} ` : "";
  const fmt = (n) => Math.round(n).toLocaleString("en-US");
  if (lo != null && hi != null && lo !== hi) return `${cur}${fmt(lo)}\u2013${fmt(hi)}${unit}`;
  return `${cur}${fmt(lo ?? hi)}${unit}`;
}

/**
 * Map one row of `data.jobs` onto the Job shape.
 *
 * `job_country` is a two-letter code ("IN"), not a name, and the rest of
 * the index stores names — so take the resolved place's country, which is
 * the same country by construction: the request is scoped to it.
 */
function jsearchRow(j, place) {
  const desc = stripHTML(j.job_description).slice(0, 5000);
  const city = j.job_city || "";
  const country = place.country || j.job_country || "";
  const geo = toGeo(j.job_latitude, j.job_longitude);
  const url = j.job_apply_link || j.job_google_link;

  return {
    // Keyed on the apply link, not on job_id. Google for Jobs mints a fresh
    // job_id for the same posting on every query, so an id-keyed upsert
    // inserts rather than updates — one Mangalore listing turned up three
    // times with three ids and one identical URL. The link is what actually
    // identifies the job.
    externalId: `jsearch:${stableId(url)}`,
    title: j.job_title,
    company: j.employer_name || "—",
    // Straight from the source, so these listings carry a real company link
    // even when the employer is nowhere near our registry — which is the
    // normal case here, since the point of this source is small local firms.
    companyUrl: j.employer_website || "",
    companyLocation: j.job_location || [city, j.job_state, country].filter(Boolean).join(", "),
    description: desc.slice(0, 600),
    location: j.job_location || [city, j.job_state, country].filter(Boolean).join(", "),
    city,
    country,
    ...(geo ? { geo } : {}),
    remote: !!j.job_is_remote,
    type: jsearchType(j),
    skills: skillsFrom({
      tags: Array.isArray(j.job_required_skills) ? j.job_required_skills : [],
      title: j.job_title,
      description: desc.slice(0, 2500),
    }),
    salary: j.job_salary_string || jsearchSalary(j),
    url,
    source: "JSearch",
    postedAt:
      toDate(j.job_posted_at_timestamp) ?? toDate(j.job_posted_at_datetime_utc) ?? new Date(),
  };
}

async function jsearch({ search, place } = {}) {
  const key = process.env.JSEARCH_RAPIDAPI_KEY;
  if (!key) return [];

  // The whole reason to spend a metered request is local coverage. Without
  // a place there is nothing to ask that the free boards don't already
  // answer, so asking would burn quota for no new listings.
  if (!place?.city) return [];

  // One spare beyond the per-run depth, held back for the broader retry
  // below. The monthly ceiling still caps everything.
  const remaining = await remainingCalls("jsearch", JSEARCH_MONTHLY_LIMIT);
  const budget = Math.min(JSEARCH_CALLS_PER_RUN, remaining);
  if (budget < 1) return [];

  const host = process.env.JSEARCH_RAPIDAPI_HOST || JSEARCH_DEFAULT_HOST;
  const where = [place.city, place.country].filter(Boolean).join(", ");

  // A role-specific query finds nothing in a small market — "developer in
  // Itanagar" returns zero where a plain "jobs in Itanagar" returns real
  // listings. Those are exactly the places with no other coverage, so an
  // empty answer earns one broader retry rather than being taken as proof
  // the town has no work.
  const queries = [`${search || "developer"} in ${where}`];
  if (search) queries.push(`jobs in ${where}`);

  const out = [];
  let spent = 0;

  for (const [i, query] of queries.entries()) {
    if (out.length) break;   // the broader retry is only for an empty result

    // The primary query may page up to the configured depth; the fallback
    // gets exactly one call, and only because nothing came back. Reserving
    // it this way means a city that answers normally never pays for it.
    const allowance = i === 0 ? budget : Math.min(spent + 1, remaining);
    if (spent >= allowance) break;

    let cursor = "";

    // One request is one page of about ten listings, and pages are chained
    // by cursor rather than numbered. Each is billed, so the per-run budget
    // is spent as depth: raising JSEARCH_CALLS_PER_RUN buys more of this city.
    while (spent < allowance) {
      const url =
        `https://${host}/search-v2?` +
        new URLSearchParams({
          // The endpoint parses "<role> in <place>" out of one free-text
          // field; there is no separate location parameter.
          query,
          ...(place.countryCode ? { country: place.countryCode.toLowerCase() } : {}),
          ...(cursor ? { cursor } : {}),
        });

      let data;
      spent++;
      try {
        data = await fetchJSON(url, {
          headers: { "X-RapidAPI-Key": key, "X-RapidAPI-Host": host },
        });
      } catch (err) {
        // Count the attempt regardless: a 429 or a timeout still billed
        // upstream, and treating those as free is how a retry loop quietly
        // spends a month's allowance. Then stop — a failing page means the
        // next one fails too, and each attempt costs.
        await recordCall("jsearch");
        if (!out.length) throw err;    // nothing salvaged; let the report say why
        return out;
      }
      await recordCall("jsearch");

      const rows = data?.data?.jobs ?? [];
      for (const j of rows) {
        if (j.job_title && (j.job_apply_link || j.job_google_link)) out.push(jsearchRow(j, place));
      }

      cursor = data?.data?.cursor ?? "";
      if (!cursor || !rows.length) break;
    }
  }

  return out;
}

/* ---------------- Provider: The Muse ---------------- */

/**
 * Keyless, so it works before any signup. It matches against its own city
 * list rather than resolving place names, so "Bangalore" returns results
 * where "Bengaluru" and "Mangalore" return none — hence the hub map, which
 * at least pulls listings from the user's country.
 */
const MUSE_HUBS = {
  IN: ["Bangalore", "Mumbai", "Hyderabad", "Chennai", "Pune", "Gurgaon", "New Delhi", "Noida"],
  US: ["New York", "San Francisco", "Seattle", "Austin", "Chicago", "Boston"],
  GB: ["London", "Manchester", "Edinburgh", "Cambridge"],
  DE: ["Berlin", "Munich", "Hamburg", "Frankfurt"],
  CA: ["Toronto", "Vancouver", "Montreal"],
  AU: ["Sydney", "Melbourne", "Brisbane"],
  FR: ["Paris", "Lyon"], ES: ["Madrid", "Barcelona"], NL: ["Amsterdam"],
  IE: ["Dublin"], PL: ["Warsaw", "Krakow"], SG: ["Singapore"], JP: ["Tokyo"],
  AE: ["Dubai", "Abu Dhabi"], BR: ["Sao Paulo"], MX: ["Mexico City"],
  IL: ["Tel Aviv"], CH: ["Zurich"], SE: ["Stockholm"], IT: ["Milan"],
  PT: ["Lisbon"], CZ: ["Prague"], RO: ["Bucharest"], PH: ["Manila"],
  ID: ["Jakarta"], MY: ["Kuala Lumpur"], ZA: ["Cape Town"], AR: ["Buenos Aires"],
  NZ: ["Auckland"], KR: ["Seoul"], HK: ["Hong Kong"], TR: ["Istanbul"],
  NG: ["Lagos"], KE: ["Nairobi"], EG: ["Cairo"], TH: ["Bangkok"],
  NO: ["Oslo"], DK: ["Copenhagen"], FI: ["Helsinki"], BE: ["Brussels"],
  AT: ["Vienna"], GR: ["Athens"], VN: ["Ho Chi Minh City"],
};

const MUSE_CITIES = 4;
const escapeRx = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

async function themuse({ place } = {}) {
  if (!place?.country) return [];

  const cities = [...new Set([place.city, ...(MUSE_HUBS[place.countryCode] ?? [])].filter(Boolean))]
    .slice(0, MUSE_CITIES);
  if (!cities.length) return [];

  // Its location filter is loose — a query for one city also returns a lot
  // of unrelated "Flexible / Remote" roles — so re-check what comes back.
  const wanted = new RegExp(`\\b(${[place.country, ...cities].map(escapeRx).join("|")})\\b`, "i");

  const pages = await Promise.allSettled(
    cities.map((city) =>
      fetchJSON(
        "https://www.themuse.com/api/public/jobs?" +
          new URLSearchParams({ page: "0", location: `${city}, ${place.country}` })
      )
    )
  );

  const out = new Map();

  for (const p of pages) {
    if (p.status !== "fulfilled") continue;

    for (const j of p.value?.results ?? []) {
      const names = (j.locations ?? []).map((l) => l.name).filter(Boolean);
      const here = names.find((n) => wanted.test(n));
      const url = j.refs?.landing_page;
      if (!here || !j.id || !j.name || !url) continue;

      const desc = stripHTML(j.contents).slice(0, 5000);
      const { city, country } = splitLocation(here);
      const levels = (j.levels ?? []).map((l) => l.name).join(" ");
      const type = canonicalType(levels) !== "Unknown" ? canonicalType(levels) : canonicalType(j.name);

      out.set(j.id, {
        externalId: `themuse:${j.id}`,
        title: j.name,
        company: j.company?.name || "—",
        description: desc.slice(0, 600),
        location: here,
        city,
        country: country || place.country,
        remote: names.some((n) => /flexible|remote/i.test(n)),
        type: type === "Unknown" ? "Full-time" : type,
        skills: skillsFrom({
          tags: (j.categories ?? []).map((c) => c.name),
          title: j.name,
          description: desc.slice(0, 2500),
        }),
        salary: "",
        url,
        source: "The Muse",
        postedAt: toDate(j.publication_date) ?? new Date(),
      });
    }
  }

  return [...out.values()];
}

/* ---------------- Provider: company boards (Greenhouse / Ashby) ---------------- */

/**
 * Reads employers' own applicant-tracking boards instead of an aggregator.
 *
 * This is the only source here where we know *who is hiring* before we know
 * what the job is, and that changes what a listing can carry. An aggregator
 * hands over a company name and an apply link back to itself; a company
 * board hands over the employer's real careers URL, so the company name on
 * a card can lead somewhere real instead of nowhere.
 *
 * Keyless and uncapped, unlike Adzuna — but it only ever sees the employers
 * in the registry, so it broadens the index without ever making it complete.
 */

/** How many boards to have in flight at once. */
const BOARD_CONCURRENCY = 8;

async function mapPool(items, limit, fn) {
  const out = [];
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const i = cursor++;
      out[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return out;
}

/**
 * Boards state location as free text ("Bengaluru, India", "Remote - India",
 * "Hybrid - Bangalore, India"). Strip the working-arrangement prefix so
 * what's left is an actual place the geocoder can resolve.
 */
function boardLocation(raw, company) {
  const text = String(raw ?? "").trim();
  const remote = /\b(remote|anywhere|distributed|work from home|wfh)\b/i.test(text);

  // Multi-site roles are listed as one string ("Bengaluru, India; Mumbai,
  // India" or "London | Dublin"). A pin can only go in one place, and the
  // first named office is the one the posting is anchored to — keeping the
  // whole string would geocode to nothing and collapse thousands of
  // listings into as many un-resolvable place names.
  const primary = text.split(/\s*[;|/]\s*|\s+(?:or|and)\s+/i)[0] ?? text;

  const cleaned = primary
    .replace(/\b(remote|hybrid|on-?site|in-?office|flexible)\b/gi, " ")
    .replace(/^[\s,\-–—/|]+|[\s,\-–—/|]+$/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  // A listing that says only "Remote" names no place at all. Attributing it
  // to head office would plant a San Francisco pin on a job open worldwide,
  // so leave it placeless and let the remote handling take over.
  const place = cleaned && !/^(remote|worldwide|global|anywhere)$/i.test(cleaned) ? cleaned : "";
  const { city, country } = splitLocation(place);

  return {
    remote,
    location: text || company.hq || "",
    place,
    city: city || place,
    country,
  };
}

async function greenhouseBoard(company) {
  const data = await fetchJSON(
    `https://boards-api.greenhouse.io/v1/boards/${company.token}/jobs?content=true`
  );

  return (data?.jobs ?? []).map((j) => {
    const desc = stripHTML(j.content).slice(0, 5000);
    const where = boardLocation(j.location?.name, company);
    const depts = (j.departments ?? []).map((d) => d.name).filter(Boolean);

    return {
      externalId: `greenhouse:${company.token}:${j.id}`,
      title: j.title || "Untitled role",
      company: company.name,
      companyUrl: company.site,
      companyLocation: where.place || company.hq || "",
      description: desc.slice(0, 600),
      location: where.location,
      city: where.city,
      country: where.country,
      remote: where.remote,
      type: canonicalType(j.title) === "Unknown" ? "Full-time" : canonicalType(j.title),
      skills: skillsFrom({ tags: depts, title: j.title, description: desc.slice(0, 2500) }),
      salary: "",
      url: j.absolute_url,
      source: "Company boards",
      postedAt: toDate(j.updated_at ?? j.first_published) ?? new Date(),
      _geoQuery: where.place,
    };
  });
}

async function ashbyBoard(company) {
  const data = await fetchJSON(
    `https://api.ashbyhq.com/posting-api/job-board/${company.token}?includeCompensation=true`
  );

  return (data?.jobs ?? []).map((j) => {
    const desc = stripHTML(j.descriptionHtml ?? j.descriptionPlain).slice(0, 5000);
    const where = boardLocation(j.location, company);
    const tags = [j.department, j.team].filter(Boolean);
    const fromType = canonicalType(j.employmentType);

    return {
      externalId: `ashby:${company.token}:${j.id}`,
      title: (j.title || "Untitled role").trim(),
      company: company.name,
      companyUrl: company.site,
      companyLocation: where.place || company.hq || "",
      description: desc.slice(0, 600),
      location: where.location,
      city: where.city,
      country: where.country,
      remote: where.remote || !!j.isRemote,
      type: fromType !== "Unknown" ? fromType : "Full-time",
      skills: skillsFrom({ tags, title: j.title, description: desc.slice(0, 2500) }),
      salary: j.compensation?.compensationTierSummary ?? "",
      url: j.jobUrl || j.applyUrl,
      source: "Company boards",
      postedAt: toDate(j.publishedAt ?? j.updatedAt) ?? new Date(),
      _geoQuery: where.place,
    };
  });
}

async function leverBoard(company) {
  const data = await fetchJSON(`https://api.lever.co/v0/postings/${company.token}?mode=json`);

  return (Array.isArray(data) ? data : []).map((j) => {
    const desc = stripHTML(j.descriptionPlain ?? j.description).slice(0, 5000);
    const where = boardLocation(j.categories?.location, company);
    const tags = [j.categories?.team, j.categories?.department].filter(Boolean);
    const fromType = canonicalType(j.categories?.commitment);

    return {
      externalId: `lever:${company.token}:${j.id}`,
      title: (j.text || "Untitled role").trim(),
      company: company.name,
      companyUrl: company.site,
      companyLocation: where.place || company.hq || "",
      description: desc.slice(0, 600),
      location: where.location,
      city: where.city,
      country: where.country,
      // Lever states the arrangement in its own field rather than inside
      // the location string, so the text-based guess needs the override.
      remote: where.remote || /remote/i.test(j.workplaceType ?? ""),
      type: fromType !== "Unknown" ? fromType : "Full-time",
      skills: skillsFrom({ tags, title: j.text, description: desc.slice(0, 2500) }),
      salary: j.salaryRange
        ? [j.salaryRange.min, j.salaryRange.max].filter(Boolean).map((n) => Number(n).toLocaleString("en-US")).join("–")
        : "",
      url: j.hostedUrl || j.applyUrl,
      source: "Company boards",
      postedAt: toDate(j.createdAt) ?? new Date(),
      _geoQuery: where.place,
    };
  });
}

/** SmartRecruiters paginates, and its enterprise tenants run to thousands. */
const SR_PAGE = 100;
const SR_MAX_PAGES = 5;

async function smartRecruitersBoard(company) {
  const out = [];

  for (let page = 0; page < SR_MAX_PAGES; page++) {
    const data = await fetchJSON(
      `https://api.smartrecruiters.com/v1/companies/${company.token}/postings?` +
        new URLSearchParams({ limit: String(SR_PAGE), offset: String(page * SR_PAGE) })
    );

    const batch = data?.content ?? [];
    if (!batch.length) break;

    for (const j of batch) {
      const loc = j.location ?? {};
      const placeText = [loc.city, loc.region, loc.country].filter(Boolean).join(", ");
      const where = boardLocation(placeText, company);

      out.push({
        externalId: `smartrecruiters:${company.token}:${j.id}`,
        title: (j.name || "Untitled role").trim(),
        company: company.name,
        companyUrl: company.site,
        companyLocation: where.place || company.hq || "",
        // This endpoint returns no body text; the title and department are
        // all there is to extract skills from.
        description: "",
        location: where.location,
        city: loc.city || where.city,
        country: loc.country || where.country,
        remote: where.remote || !!loc.remote,
        type: canonicalType(j.typeOfEmployment?.label) === "Unknown"
          ? "Full-time"
          : canonicalType(j.typeOfEmployment?.label),
        skills: skillsFrom({
          tags: [j.department?.label, j.function?.label].filter(Boolean),
          title: j.name,
          description: "",
        }),
        salary: "",
        url: j.ref ? `https://jobs.smartrecruiters.com/${company.token}/${j.id}` : "",
        source: "Company boards",
        postedAt: toDate(j.releasedDate) ?? new Date(),
        _geoQuery: where.place,
      });
    }

    if (batch.length < SR_PAGE) break;
  }

  return out;
}

const BOARD_READERS = {
  greenhouse: greenhouseBoard,
  ashby: ashbyBoard,
  lever: leverBoard,
  smartrecruiters: smartRecruitersBoard,
};

async function companyBoards() {
  const results = await mapPool(COMPANIES, BOARD_CONCURRENCY, async (company) => {
    const read = BOARD_READERS[company.ats] ?? greenhouseBoard;
    try {
      return await read(company);
    } catch {
      // One employer renaming its board must not cost us the other eighty.
      return [];
    }
  });

  return results.flat();
}

const PROVIDERS = [
  { name: "Company boards", fn: companyBoards },
  { name: "Remotive", fn: remotive },
  { name: "Arbeitnow", fn: arbeitnow },
  { name: "The Muse", fn: themuse },
  { name: "JSearch", fn: jsearch },
  { name: "Adzuna", fn: adzuna },
];

/* ---------------- Ingestion ---------------- */

/**
 * A listing from an aggregator names its employer but tells us nothing
 * about them. When that name is one we know, lend it the registry's real
 * homepage so its card can link somewhere. Unknown employers keep an empty
 * companyUrl on purpose: the UI has a location-based fallback, and inventing
 * a plausible domain would send people to the wrong company's site.
 */
function withCompanyProfile(job) {
  if (job.companyUrl) return job;

  const known = lookupCompany(job.company);
  if (!known) return job;

  return {
    ...job,
    companyUrl: known.site,
    companyLocation: job.companyLocation || [job.city, job.country].filter(Boolean).join(", ") || known.hq,
  };
}

/**
 * Distance ranking needs coordinates, and only Adzuna supplies them. Every
 * other source names a place in prose, so resolve those names once per
 * ingest and attach the result.
 *
 * Lookups are capped per run rather than per job. The geocoder allows about
 * one request a second, and the cache behind geocodeCity is persistent, so
 * the cap costs only latency on the first few runs — each one converts
 * another slice of the index to distance-rankable, permanently.
 */
const MAX_NEW_GEOCODES = 60;

/** Upsert batch size — one bulkWrite per this many listings. */
const WRITE_BATCH = 1000;

/**
 * Same idea, but for an ingest running inside a search request. At roughly
 * a second per uncached place, the figure above is over a minute of latency
 * on someone's search — so a request-triggered run does a token amount and
 * leaves the rest to `npm run geocode`.
 */
const INLINE_GEOCODES = 5;

async function attachCoordinates(jobs, budget = MAX_NEW_GEOCODES) {
  const needed = new Map();

  for (const job of jobs) {
    if (job.geo || job.remote) continue;
    const query = job._geoQuery || [job.city, job.country].filter(Boolean).join(", ");
    if (!query) continue;
    if (!needed.has(query)) needed.set(query, []);
    needed.get(query).push(job);
  }

  let spent = 0;
  for (const [query, group] of needed) {
    let found;
    try {
      // Already-known places are free, so they never touch the budget —
      // otherwise a re-ingest against a warm cache would stop after sixty
      // and leave the rest of the index unplaced despite the answers
      // already sitting in the collection.
      found = await geocodePlace(query, { allowLookup: false });
      if (found === undefined) {
        if (spent >= budget) continue;
        spent++;
        found = await geocodePlace(query);
      }
    } catch {
      found = null;
    }
    if (!found) continue;

    for (const job of group) {
      job.geo = { type: "Point", coordinates: found.coords };

      // Boards write "Bangalore, Karnataka" and bare "bengaluru", so the
      // comma-splitting parse upstream files a state — or nothing — as the
      // country. The geocoder is authoritative on which is which, and it
      // has just answered, so take its word over the guess.
      if (found.country) job.country = found.country;
      if (!job.city && found.city) job.city = found.city;
    }
  }

  return jobs;
}

/**
 * Fetch every provider in parallel and upsert into MongoDB.
 * `externalId` is the natural key, so repeated runs refresh rather
 * than duplicate. Returns a per-source report.
 */
async function ingestAll({ search, place, maxGeocodes = MAX_NEW_GEOCODES, only } = {}) {
  const chosen = only?.length ? PROVIDERS.filter((p) => only.includes(p.name)) : PROVIDERS;
  const settled = await Promise.allSettled(chosen.map((p) => p.fn({ search, place })));

  const report = [];
  let upserted = 0;
  let located = 0;

  for (let i = 0; i < chosen.length; i++) {
    const { name } = chosen[i];
    const outcome = settled[i];

    if (outcome.status !== "fulfilled") {
      report.push({ source: name, ok: false, error: outcome.reason?.message ?? "failed", count: 0 });
      continue;
    }

    const fetched = outcome.value.filter((j) => j.externalId && j.title && j.url);
    const jobs = await attachCoordinates(fetched.map(withCompanyProfile), maxGeocodes);
    located += jobs.filter((j) => j.geo).length;

    if (!jobs.length) {
      report.push({ source: name, ok: true, count: 0 });
      continue;
    }

    const ops = jobs.map(({ _geoQuery, ...j }) => ({
      updateOne: {
        filter: { externalId: j.externalId },
        update: { $set: { ...j, fetchedAt: new Date(), active: true } },
        upsert: true,
      },
    }));

    try {
      // Reading eighty company boards yields tens of thousands of listings,
      // well past what one bulkWrite should carry, so send it in batches.
      let n = 0;
      for (let k = 0; k < ops.length; k += WRITE_BATCH) {
        const res = await Job.bulkWrite(ops.slice(k, k + WRITE_BATCH), { ordered: false });
        n += (res.upsertedCount ?? 0) + (res.modifiedCount ?? 0);
      }
      upserted += n;
      report.push({ source: name, ok: true, count: jobs.length, written: n });
    } catch (err) {
      report.push({ source: name, ok: false, error: err.message, count: jobs.length });
    }
  }

  return { upserted, located, report };
}

/** Retire listings we haven't seen from their source in a while. */
async function deactivateStale(days = 45) {
  const cutoff = new Date(Date.now() - days * 86400000);
  const res = await Job.updateMany(
    { source: { $ne: "CareerCompass index" }, fetchedAt: { $lt: cutoff }, active: true },
    { $set: { active: false } }
  );
  return res.modifiedCount ?? 0;
}

module.exports = { meteredUsage, canonicalType, PROVIDERS, INLINE_GEOCODES, ingestAll, deactivateStale };
