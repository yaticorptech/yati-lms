/**
 * geoService — resolves the free-text place a user typed ("Mangalore") into
 * a structured location: canonical city, region, country and coordinates.
 *
 * Matching without this step is pure token overlap against the place names
 * printed on a listing, so a bare city never implies its country —
 * "Mangalore" and "Bengaluru, India" share no tokens and read as different
 * continents. Resolving first turns one word into every term worth matching
 * on, and tells us which continent the user is on.
 *
 * Failure is always soft: a null result puts matching back on the raw text.
 */
const { locTokens } = require("./matchService.js");
const GeoCache = require("../models/GeoCache.js");
const { isConnected } = require("../config/db.js");

const ENDPOINT = "https://nominatim.openstreetmap.org/search";
const TIMEOUT_MS = 6000;

/* Place names are a tiny, highly repetitive key space and cities do not
   move, so an in-process cache removes almost all upstream traffic. Misses
   are cached too — a typo would otherwise re-query on every search. */
const CACHE = new Map();
const CACHE_MAX = 500;

/* ISO-3166 alpha-2 → continent. Remote listings advertise their reach by
   region ("Remote — Americas, Europe, Asia"), so deciding whether one is
   open to a given user means knowing which continent they're on. Countries
   spanning two are filed under the one holding most of their population. */
const CONTINENT_CODES = {
  Africa:
    "DZ AO BJ BW BF BI CV CM CF TD KM CD CG CI DJ EG GQ ER SZ ET GA GM GH GN GW KE LS LR LY MG MW ML MR MU MA MZ NA NE NG RW ST SN SC SL SO ZA SS SD TZ TG TN UG ZM ZW EH RE YT SH",
  Asia:
    "AF AM AZ BH BD BT BN KH CN CY GE HK IN ID IR IQ IL JP JO KZ KW KG LA LB MO MY MV MN MM NP KP OM PK PS PH QA SA SG KR LK SY TW TJ TH TL TR TM AE UZ VN YE",
  Europe:
    "AL AD AT BY BE BA BG HR CZ DK EE FO FI FR DE GI GR GG HU IS IE IM IT JE LV LI LT LU MT MD MC ME NL MK NO PL PT RO RU SM RS SK SI ES SJ SE CH UA GB VA AX",
  "North America":
    "AI AG AW BS BB BZ BM BQ VG CA KY CR CU CW DM DO SV GL GD GP GT HT HN JM MQ MX MS NI PA PR BL KN LC MF PM VC SX TT TC US VI",
  "South America": "AR BO BR CL CO EC FK GF GY PY PE SR UY VE",
  Oceania: "AS AU CK FJ PF GU KI MH FM NR NC NZ NU NF MP PW PG PN WS SB TK TO TV VU WF",
};

const CONTINENT_BY_CODE = new Map(
  Object.entries(CONTINENT_CODES).flatMap(([name, codes]) =>
    codes.split(" ").map((code) => [code, name])
  )
);

/* Cities that job boards still file under an older or local name. The
   geocoder answers with the official one, so without these a search for
   Bengaluru misses every listing that says Bangalore — the same place. */
const CITY_ALIASES = [
  "bengaluru bangalore", "mumbai bombay", "chennai madras", "kolkata calcutta",
  "gurugram gurgaon", "pune poona", "kochi cochin", "mysuru mysore",
  "mangaluru mangalore", "vadodara baroda", "thiruvananthapuram trivandrum",
  "prayagraj allahabad", "varanasi banaras", "puducherry pondicherry",
  // Renamed cities whose older spelling is still what people type — and
  // what job boards still print. Without these the geocoder either misses
  // or, worse, matches something foreign: "Belgaum" resolves to Ypres in
  // Belgium, which would quietly move an Indian search to another continent.
  "belagavi belgaum", "hubballi hubli", "kozhikode calicut", "thrissur trichur",
  "tiruchirappalli trichy", "kanpur cawnpore", "shivamogga shimoga",
  "vijayawada bezawada", "visakhapatnam vizag", "chhatrapati sambhajinagar aurangabad",
  "ballari bellary", "tumakuru tumkur", "belgavi belgaum",
  "munich munchen muenchen", "cologne koln koeln", "nuremberg nurnberg",
  "vienna wien", "prague praha", "warsaw warszawa", "milan milano",
  "rome roma", "florence firenze", "naples napoli", "turin torino",
  "lisbon lisboa", "seville sevilla", "copenhagen kobenhavn",
  "gothenburg goteborg", "zurich zuerich", "geneva geneve genf",
  "brussels bruxelles brussel", "antwerp antwerpen", "the hague den haag",
  "ho chi minh city saigon", "bucharest bucuresti", "athens athina",
].map((group) => group.split(" "));

const ALIASES_BY_TERM = new Map();
for (const group of CITY_ALIASES) {
  for (const name of group) ALIASES_BY_TERM.set(name, group);
}

/** Expand a set of place tokens with every known alias of the same city. */
const withCityAliases = (tokens) => [
  ...new Set(tokens.flatMap((t) => ALIASES_BY_TERM.get(t) ?? [t])),
];

/**
 * Every spelling this place is known by, itself included.
 *
 * Callers comparing what a user typed against what the geocoder returned
 * need this: the two legitimately differ where a city has an official name
 * and a common one. "Bangalore" and "Bengaluru" are three edits apart and
 * the same place, so character distance alone reads a correct spelling as a
 * mistake — and would then "fix" it into something else entirely.
 */
const spellingsOf = (name) => withCityAliases(locTokens(name));

/* Commute radius, mirroring matchService. Duplicated rather than imported
   because matchService is pure scoring and importing it here for one
   constant would tangle two modules that otherwise share nothing. */
const COVERAGE_KM = 150;
const EARTH_RADIUS_KM = 6378.1;
const escapeRx = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * A Mongo filter for "listings actually in this city".
 *
 * Deliberately excludes any country fallback. Asked whether Kochi has
 * coverage, a country-wide clause answers with Bangalore's jobs and the
 * city never gets filled — which is exactly how a configured metered key
 * ended up never being called. Callers add `active` and `remote` as needed.
 */
function cityCoverageQuery(place) {
  if (!place?.city) return null;

  const or = [];
  if (place.coords) {
    or.push({
      geo: { $geoWithin: { $centerSphere: [place.coords, COVERAGE_KM / EARTH_RADIUS_KM] } },
    });
  }
  // Every known spelling, so Bengaluru's listings count towards Bangalore.
  for (const name of new Set([place.city, ...spellingsOf(place.city)])) {
    const rx = new RegExp(escapeRx(name), "i");
    or.push({ city: rx }, { location: rx });
  }

  return or.length ? { $or: or } : null;
}

/* Countries whose listings are commonly filed under a name the geocoder
   doesn't return. Matching is exact by term, so "Manchester, UK" would
   otherwise miss a search resolved to "United Kingdom". */
const COUNTRY_ALIASES = {
  GB: "uk britain england scotland wales",
  US: "usa america",
  AE: "uae emirates",
  NL: "holland",
  DE: "deutschland",
  KR: "korea",
  CZ: "czechia",
  CH: "schweiz",
  AT: "osterreich",
};

/* The upstream service asks for no more than one request per second, so
   lookups are queued rather than fired in parallel. Cache hits skip the
   queue entirely, so this is rarely the thing a user waits on. */
const MIN_GAP_MS = 1100;
let gate = Promise.resolve();
const inflight = new Map();

function scheduled(fn) {
  const result = gate.then(fn);
  gate = result.catch(() => {}).then(() => new Promise((r) => setTimeout(r, MIN_GAP_MS)));
  return result;
}

function remember(key, value, into = CACHE) {
  // Plain FIFO eviction: the key space is small enough that tracking
  // recency would cost more than the occasional avoidable miss.
  if (into.size >= CACHE_MAX) into.delete(into.keys().next().value);
  into.set(key, value);
  return value;
}

async function lookup(query) {
  const params = new URLSearchParams({
    q: query, format: "json", limit: "1", addressdetails: "1",
    // Without this the service answers in the place's own language, and
    // "Deutschland" matches none of the listings that say "Germany".
    "accept-language": "en",
  });

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${ENDPOINT}?${params}`, {
      signal: ctrl.signal,
      // The usage policy requires an identifying User-Agent.
      headers: { Accept: "application/json", "User-Agent": "CareerCompass/1.0" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const hit = (await res.json())?.[0];
    if (!hit) return null;

    const a = hit.address ?? {};
    const city = a.city || a.town || a.village || a.municipality || hit.name || "";
    const region = a.state || a.province || "";
    const country = a.country || "";
    if (!country && !city) return null;

    const lat = Number(hit.lat);
    const lon = Number(hit.lon);
    const countryCode = (a.country_code || "").toUpperCase();

    /* Everything in the typed string that names something larger than the
       city. People type "Mangalore, India", not "Mangalore", so without
       this the country rides along into cityTerms — and the strict gate,
       which exists precisely to reject same-country-different-city, admits
       every job in India to a search for Mangalore. */
    const widerThanCity = new Set([
      ...locTokens(region),
      ...locTokens(country),
      ...locTokens(COUNTRY_ALIASES[countryCode] ?? ""),
    ]);

    return {
      // A city often shares its region's name ("Indiana, Indiana"); show it once.
      label: [...new Set([city, region, country].filter(Boolean))].join(", "),
      city,
      region,
      country,
      countryCode,
      // Distinctive stand-ins for the country ("usa", "uk", "britain").
      // Kept apart from `terms` because matching a remote role's reach on
      // loose tokens is what lets "United Kingdom" answer a search from the
      // United States — they share the word "united".
      countryAliases: locTokens(COUNTRY_ALIASES[countryCode] ?? ""),
      continent: CONTINENT_BY_CODE.get(countryCode) ?? null,
      coords: Number.isFinite(lat) && Number.isFinite(lon) ? [lon, lat] : null,
      // Every name worth matching a listing against, including whatever the
      // user actually typed — a job may well say "Mangalore" where the
      // geocoder's canonical spelling is "Mangaluru".
      terms: withCityAliases([...new Set([
        ...locTokens(query), ...locTokens(city), ...locTokens(region), ...locTokens(country),
        ...locTokens(COUNTRY_ALIASES[countryCode] ?? ""),
      ])]),
      // Just the place itself, with no region or country attached. "Show me
      // Mangalore jobs" must not be satisfied by anything that merely shares
      // the country, so the strict gate matches on these alone.
      //
      // The city name is kept unconditionally even when it repeats the
      // country ("Singapore, Singapore"): filtering there would empty the
      // list and disable the gate entirely, which is the opposite of strict.
      cityTerms: withCityAliases([...new Set([
        ...locTokens(query).filter((t) => !widerThanCity.has(t)),
        ...locTokens(city),
      ])]),
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Resolve free text to a place, or null when it can't be identified.
 * Never throws — callers treat this as an enrichment, not a dependency.
 */
async function resolvePlace(query) {
  const key = locTokens(query).join(" ");
  if (!key) return null;
  if (CACHE.has(key)) return CACHE.get(key);
  if (inflight.has(key)) return inflight.get(key);

  const pending = scheduled(() => lookup(query))
    .then((place) => remember(key, place))
    // A miss is cached; a *failure* is not. `lookup` returns null only when
    // the geocoder answered and had nothing, and throws when the request
    // timed out, was rate-limited or the network was down. Caching the
    // second as if it were the first is permanent: one 6s hiccup during
    // startup pins "mangalore india" to null for the life of the process,
    // and every later search silently drops the location filter and returns
    // jobs from the whole country. Answer null for this call, ask again next.
    .catch(() => null)
    .finally(() => inflight.delete(key));

  inflight.set(key, pending);
  return pending;
}

/* ---------------- coordinates for ingested listings ---------------- */

/* Kept apart from resolvePlace's CACHE deliberately. That one holds fully
   expanded places (alias terms and all); this one holds bare coordinates
   rehydrated from the collection. Sharing a map would let a coords-only
   entry answer a resolvePlace call and silently strip the alias terms the
   location gate matches on. */
const COORD_CACHE = new Map();
const COORD_INFLIGHT = new Map();

/**
 * Resolve a listing's stated place to `{ coords, city, region, country,
 * countryCode }`, or null.
 *
 * Separate from resolvePlace because the two have opposite cost profiles.
 * A user's location is one lookup per search against a handful of distinct
 * cities, so an in-process cache covers it. Ingest asks about every city on
 * every board — hundreds of distinct names, once each — and at the
 * geocoder's ~1 req/s that is minutes of budget we must not re-spend after
 * a restart. Hence the collection behind this one.
 *
 * It returns the whole record rather than just coordinates because the
 * administrative fields are worth as much as the point. Boards write
 * locations as "Bangalore, Karnataka" or bare "bengaluru", and a parser
 * splitting on commas reads the state as the country — so the index ends up
 * filing 76 Indian jobs under a country named Karnataka. The geocoder
 * already knows the real answer; this hands it back so ingest can use it.
 *
 * Never throws: a listing without coordinates still ranks on place names,
 * it just can't take part in distance ranking.
 */
async function geocodePlace(place, { allowLookup = true } = {}) {
  const key = locTokens(place).join(" ");
  if (!key) return null;

  if (COORD_CACHE.has(key)) return COORD_CACHE.get(key);
  if (COORD_INFLIGHT.has(key)) return COORD_INFLIGHT.get(key);

  const stored = await readCache(key);
  if (stored !== undefined) {
    remember(key, stored, COORD_CACHE);
    return stored;
  }

  // Known-only caller and we don't know it. `undefined` rather than null so
  // the caller can tell "never asked" from "asked, no such place" — the
  // first costs a request, the second must not be retried.
  if (!allowLookup) return undefined;

  const pending = (async () => {
    let resolved = null;
    let failed = false;
    try {
      resolved = await scheduled(() => lookup(place));
    } catch {
      // Transient: timeout, rate limit, no network. Not evidence about the
      // place, so it must not be written to either cache — the MongoDB one
      // would outlive the process and make the mistake permanent.
      failed = true;
    }

    const record = resolved?.coords ? toRecord(resolved) : null;
    if (!failed) {
      remember(key, record, COORD_CACHE);
      await persist(key, place, resolved);
    }
    return record;
  })()
    .catch(() => null)
    .finally(() => COORD_INFLIGHT.delete(key));

  COORD_INFLIGHT.set(key, pending);
  return pending;
}

const toRecord = (r) => ({
  coords: r.coords,
  city: r.city ?? "",
  region: r.region ?? "",
  country: r.country ?? "",
  countryCode: r.countryCode ?? "",
});

/** Stored answer for a key: a record, null for a known miss, undefined if unasked. */
async function readCache(key) {
  if (!isConnected()) return undefined;
  try {
    const stored = await GeoCache.findOne({ key }).lean();
    if (!stored) return undefined;
    return stored.found && stored.coordinates?.length === 2
      ? toRecord({ ...stored, coords: stored.coordinates })
      : null;
  } catch {
    // A cache read failure is not evidence about the place itself.
    return undefined;
  }
}

/** Just the point, for callers that only need to place a pin. */
async function geocodeCity(place) {
  return (await geocodePlace(place))?.coords ?? null;
}

/** Record what the geocoder said — including that it found nothing. */
async function persist(key, place, resolved) {
  if (!isConnected()) return;

  try {
    await GeoCache.updateOne(
      { key },
      {
        $set: {
          key,
          query: String(place).slice(0, 200),
          found: !!resolved,
          label: resolved?.label ?? "",
          city: resolved?.city ?? "",
          region: resolved?.region ?? "",
          country: resolved?.country ?? "",
          countryCode: resolved?.countryCode ?? "",
          ...(resolved?.coords ? { coordinates: resolved.coords } : {}),
        },
      },
      { upsert: true }
    );
  } catch {
    /* a cache miss next run is the only consequence */
  }
}

module.exports = { spellingsOf, cityCoverageQuery, resolvePlace, geocodePlace, geocodeCity };
