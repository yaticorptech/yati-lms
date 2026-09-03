/**
 * Registry of real employers whose job boards we read directly.
 *
 * Aggregators tell us a company's *name*; they never tell us where that
 * company actually is or what its website is. That gap is why a listing
 * could only ever link back to the aggregator. Reading an employer's own
 * applicant-tracking board closes it: we know the company before we know
 * the job, so every listing carries a real careers URL, a real homepage
 * and a real head-office location.
 *
 *   ats    "greenhouse" | "ashby" | "lever" | "smartrecruiters" — which
 *          public board API serves them
 *   token  that board's identifier, e.g. boards-api.greenhouse.io/…/{token}
 *   site   the company's own homepage (what "about the company" links to)
 *   hq     head office, used only as a last-resort location for a listing
 *          that names no city of its own
 *
 * Every token here was checked against its live endpoint; boards 404 when a
 * company renames or migrates ATS, so `npm run ingest` reports per-company
 * failures rather than silently thinning the index. Adding an employer is
 * one row — nothing else changes.
 */

const COMPANIES = [
  /* ---- strong India presence: these are what make a search from an
         Indian city return real, local, applyable roles ---- */

  /* Indian employers beyond pure tech — fintech with sales/ops/finance
     desks, logistics, SaaS — because the cohort's goals are broader than
     software. Each token verified live on 2026-08-24. What could NOT be
     verified matters too: Indian hospitals and pharma (Practo, Tata 1mg,
     PharmEasy, Apollo, Medibuddy, Pristyn) publish on none of these ATSes —
     a student aiming at medicine is only reachable through JSearch/Adzuna. */
  { name: "Paytm",          ats: "lever",           token: "paytm",       site: "https://paytm.com",             hq: "Noida, India" },
  { name: "Freshworks",     ats: "smartrecruiters", token: "Freshworks",  site: "https://www.freshworks.com",    hq: "Chennai, India" },
  { name: "InMobi",         ats: "greenhouse",      token: "inmobi",      site: "https://www.inmobi.com",        hq: "Bengaluru, India" },
  { name: "Porter",         ats: "lever",           token: "porter",      site: "https://porter.in",             hq: "Bengaluru, India" },
  { name: "CRED",           ats: "lever",           token: "cred",        site: "https://cred.club",             hq: "Bengaluru, India" },
  { name: "Cars24",         ats: "smartrecruiters", token: "Cars24",      site: "https://www.cars24.com",        hq: "Gurugram, India" },
  { name: "ServiceNow",     ats: "smartrecruiters", token: "ServiceNow",  site: "https://www.servicenow.com",    hq: "Santa Clara, United States" },

  { name: "Databricks",     ats: "greenhouse", token: "databricks",    site: "https://www.databricks.com",    hq: "San Francisco, United States" },
  { name: "Zscaler",        ats: "greenhouse", token: "zscaler",       site: "https://www.zscaler.com",       hq: "San Jose, United States" },
  { name: "PhonePe",        ats: "greenhouse", token: "phonepe",       site: "https://www.phonepe.com",       hq: "Bengaluru, India" },
  { name: "Sarvam AI",      ats: "ashby",      token: "sarvam",        site: "https://www.sarvam.ai",         hq: "Bengaluru, India" },
  { name: "Stripe",         ats: "greenhouse", token: "stripe",        site: "https://stripe.com",            hq: "South San Francisco, United States" },
  { name: "GitLab",         ats: "greenhouse", token: "gitlab",        site: "https://about.gitlab.com",      hq: "Remote" },
  { name: "Rubrik",         ats: "greenhouse", token: "rubrik",        site: "https://www.rubrik.com",        hq: "Palo Alto, United States" },
  { name: "Twilio",         ats: "greenhouse", token: "twilio",        site: "https://www.twilio.com",        hq: "San Francisco, United States" },
  { name: "Fivetran",       ats: "greenhouse", token: "fivetran",      site: "https://www.fivetran.com",      hq: "Oakland, United States" },
  { name: "Roblox",         ats: "greenhouse", token: "roblox",        site: "https://www.roblox.com",        hq: "San Mateo, United States" },
  { name: "ClickHouse",     ats: "greenhouse", token: "clickhouse",    site: "https://clickhouse.com",        hq: "Amsterdam, Netherlands" },
  { name: "ElevenLabs",     ats: "ashby",      token: "elevenlabs",    site: "https://elevenlabs.io",         hq: "London, United Kingdom" },
  { name: "Khan Academy",   ats: "greenhouse", token: "khanacademy",   site: "https://www.khanacademy.org",   hq: "Mountain View, United States" },
  { name: "Agoda",          ats: "greenhouse", token: "agoda",         site: "https://www.agoda.com",         hq: "Singapore, Singapore" },
  { name: "Coinbase",       ats: "greenhouse", token: "coinbase",      site: "https://www.coinbase.com",      hq: "Remote" },
  { name: "Airbnb",         ats: "greenhouse", token: "airbnb",        site: "https://www.airbnb.com",        hq: "San Francisco, United States" },
  { name: "Sumo Logic",     ats: "greenhouse", token: "sumologic",     site: "https://www.sumologic.com",     hq: "Redwood City, United States" },
  { name: "Elastic",        ats: "greenhouse", token: "elastic",       site: "https://www.elastic.co",        hq: "Mountain View, United States" },
  { name: "Postman",        ats: "greenhouse", token: "postman",       site: "https://www.postman.com",       hq: "San Francisco, United States" },
  { name: "Datadog",        ats: "greenhouse", token: "datadog",       site: "https://www.datadoghq.com",     hq: "New York, United States" },
  { name: "Groww",          ats: "greenhouse", token: "groww",         site: "https://groww.in",              hq: "Bengaluru, India" },
  { name: "Adyen",          ats: "greenhouse", token: "adyen",         site: "https://www.adyen.com",         hq: "Amsterdam, Netherlands" },
  { name: "Samsara",        ats: "greenhouse", token: "samsara",       site: "https://www.samsara.com",       hq: "San Francisco, United States" },
  { name: "Waymo",          ats: "greenhouse", token: "waymo",         site: "https://waymo.com",             hq: "Mountain View, United States" },
  { name: "Flexport",       ats: "greenhouse", token: "flexport",      site: "https://www.flexport.com",      hq: "San Francisco, United States" },
  { name: "Cockroach Labs", ats: "greenhouse", token: "cockroachlabs", site: "https://www.cockroachlabs.com", hq: "New York, United States" },
  { name: "Thoughtworks",   ats: "greenhouse", token: "thoughtworks",  site: "https://www.thoughtworks.com",  hq: "Chicago, United States" },
  { name: "Coursera",       ats: "greenhouse", token: "coursera",      site: "https://www.coursera.org",      hq: "Mountain View, United States" },
  { name: "Cloudflare",     ats: "greenhouse", token: "cloudflare",    site: "https://www.cloudflare.com",    hq: "San Francisco, United States" },
  { name: "Starburst",      ats: "greenhouse", token: "starburst",     site: "https://www.starburst.io",      hq: "Boston, United States" },
  { name: "Vercel",         ats: "greenhouse", token: "vercel",        site: "https://vercel.com",            hq: "San Francisco, United States" },
  { name: "OpenAI",         ats: "ashby",      token: "openai",        site: "https://openai.com",            hq: "San Francisco, United States" },
  { name: "Anthropic",      ats: "greenhouse", token: "anthropic",     site: "https://www.anthropic.com",     hq: "San Francisco, United States" },
  { name: "Scale AI",       ats: "greenhouse", token: "scaleai",       site: "https://scale.com",             hq: "San Francisco, United States" },
  { name: "Figma",          ats: "greenhouse", token: "figma",         site: "https://www.figma.com",         hq: "San Francisco, United States" },
  { name: "LaunchDarkly",   ats: "greenhouse", token: "launchdarkly",  site: "https://launchdarkly.com",      hq: "Oakland, United States" },
  { name: "Mixpanel",       ats: "greenhouse", token: "mixpanel",      site: "https://mixpanel.com",          hq: "San Francisco, United States" },
  { name: "Amplitude",      ats: "greenhouse", token: "amplitude",     site: "https://amplitude.com",         hq: "San Francisco, United States" },
  { name: "Replit",         ats: "ashby",      token: "replit",        site: "https://replit.com",            hq: "Foster City, United States" },
  { name: "Neon",           ats: "ashby",      token: "neon",          site: "https://neon.tech",             hq: "Remote" },
  { name: "Zip",            ats: "ashby",      token: "zip",           site: "https://ziphq.com",             hq: "San Francisco, United States" },

  /* ---- global spread: keeps the index useful outside India ---- */
  { name: "Reddit",         ats: "greenhouse", token: "reddit",        site: "https://www.redditinc.com",     hq: "San Francisco, United States" },
  { name: "Pinterest",      ats: "greenhouse", token: "pinterest",     site: "https://www.pinterest.com",     hq: "San Francisco, United States" },
  { name: "Lyft",           ats: "greenhouse", token: "lyft",          site: "https://www.lyft.com",          hq: "San Francisco, United States" },
  { name: "Instacart",      ats: "greenhouse", token: "instacart",     site: "https://www.instacart.com",     hq: "San Francisco, United States" },
  { name: "Robinhood",      ats: "greenhouse", token: "robinhood",     site: "https://robinhood.com",         hq: "Menlo Park, United States" },
  { name: "Affirm",         ats: "greenhouse", token: "affirm",        site: "https://www.affirm.com",        hq: "Remote" },
  { name: "Brex",           ats: "greenhouse", token: "brex",          site: "https://www.brex.com",          hq: "New York, United States" },
  { name: "Gusto",          ats: "greenhouse", token: "gusto",         site: "https://gusto.com",             hq: "San Francisco, United States" },
  { name: "Asana",          ats: "greenhouse", token: "asana",         site: "https://asana.com",             hq: "San Francisco, United States" },
  { name: "Discord",        ats: "greenhouse", token: "discord",       site: "https://discord.com",           hq: "San Francisco, United States" },
  { name: "Twitch",         ats: "greenhouse", token: "twitch",        site: "https://www.twitch.tv",         hq: "San Francisco, United States" },
  { name: "Duolingo",       ats: "greenhouse", token: "duolingo",      site: "https://www.duolingo.com",      hq: "Pittsburgh, United States" },
  { name: "Mozilla",        ats: "greenhouse", token: "mozilla",       site: "https://www.mozilla.org",       hq: "San Francisco, United States" },
  { name: "Wikimedia",      ats: "greenhouse", token: "wikimedia",     site: "https://wikimediafoundation.org", hq: "San Francisco, United States" },
  { name: "Ripple",         ats: "greenhouse", token: "ripple",        site: "https://ripple.com",            hq: "San Francisco, United States" },
  { name: "Carta",          ats: "greenhouse", token: "carta",         site: "https://carta.com",             hq: "San Francisco, United States" },
  { name: "Verkada",        ats: "greenhouse", token: "verkada",       site: "https://www.verkada.com",       hq: "San Mateo, United States" },
  { name: "Nuro",           ats: "greenhouse", token: "nuro",          site: "https://www.nuro.ai",           hq: "Mountain View, United States" },
  { name: "Monzo",          ats: "greenhouse", token: "monzo",         site: "https://monzo.com",             hq: "London, United Kingdom" },
  { name: "N26",            ats: "greenhouse", token: "n26",           site: "https://n26.com",               hq: "Berlin, Germany" },
  { name: "Squarespace",    ats: "greenhouse", token: "squarespace",   site: "https://www.squarespace.com",   hq: "New York, United States" },
  { name: "Udemy",          ats: "greenhouse", token: "udemy",         site: "https://www.udemy.com",         hq: "San Francisco, United States" },
  { name: "Airtable",       ats: "greenhouse", token: "airtable",      site: "https://www.airtable.com",      hq: "San Francisco, United States" },
  { name: "Calendly",       ats: "greenhouse", token: "calendly",      site: "https://calendly.com",          hq: "Atlanta, United States" },
  { name: "Netlify",        ats: "greenhouse", token: "netlify",       site: "https://www.netlify.com",       hq: "Remote" },
  { name: "CircleCI",       ats: "greenhouse", token: "circleci",      site: "https://circleci.com",          hq: "San Francisco, United States" },
  { name: "Cohere",         ats: "ashby",      token: "cohere",        site: "https://cohere.com",            hq: "Toronto, Canada" },
  { name: "Supabase",       ats: "ashby",      token: "supabase",      site: "https://supabase.com",          hq: "Remote" },
  { name: "Linear",         ats: "ashby",      token: "linear",        site: "https://linear.app",            hq: "Remote" },
  { name: "Ramp",           ats: "ashby",      token: "ramp",          site: "https://ramp.com",              hq: "New York, United States" },
  { name: "Vanta",          ats: "ashby",      token: "vanta",         site: "https://www.vanta.com",         hq: "San Francisco, United States" },
  { name: "PostHog",        ats: "ashby",      token: "posthog",       site: "https://posthog.com",           hq: "Remote" },
  { name: "Modal",          ats: "ashby",      token: "modal",         site: "https://modal.com",             hq: "New York, United States" },
  { name: "Hex",            ats: "ashby",      token: "hex",           site: "https://hex.tech",              hq: "San Francisco, United States" },
  { name: "Warp",           ats: "ashby",      token: "warp",          site: "https://www.warp.dev",          hq: "New York, United States" },
  { name: "Railway",        ats: "ashby",      token: "railway",       site: "https://railway.app",           hq: "Remote" },
  { name: "Runway",         ats: "ashby",      token: "runway",        site: "https://runwayml.com",          hq: "New York, United States" },

  /* ---- India-headquartered employers, which the US-centric boards above
         barely touch. These are where an Indian city search finds roles
         actually based in the country rather than a satellite office ---- */
  { name: "Meesho",         ats: "lever",      token: "meesho",        site: "https://www.meesho.io",         hq: "Bengaluru, India" },
  { name: "Mindtickle",     ats: "lever",      token: "mindtickle",    site: "https://www.mindtickle.com",    hq: "Pune, India" },
  { name: "CRED",           ats: "lever",      token: "cred",          site: "https://cred.club",             hq: "Bengaluru, India" },
  { name: "Sutherland",     ats: "smartrecruiters", token: "Sutherland", site: "https://www.sutherlandglobal.com", hq: "Rochester, United States" },
  { name: "Visa",           ats: "smartrecruiters", token: "Visa",     site: "https://www.visa.com",          hq: "Foster City, United States" },
  { name: "Match Group",    ats: "lever",      token: "matchgroup",    site: "https://mtch.com",              hq: "Dallas, United States" },
  { name: "Porter",         ats: "lever",      token: "porter",        site: "https://porter.in",             hq: "Bengaluru, India" },
];

/** Company name → registry entry, for enriching listings from aggregators. */
const COMPANY_BY_NAME = new Map(
  COMPANIES.map((c) => [c.name.toLowerCase(), c])
);

/**
 * Aggregators print a company name with whatever suffix the employer
 * registered ("Stripe, Inc.", "Adyen N.V."). Strip the corporate tail so
 * those listings still resolve to the registry entry — and therefore still
 * get a real company website rather than a dead link.
 */
const CORPORATE_SUFFIX =
  /\s*(,|\s)\s*(inc|inc\.|llc|ltd|ltd\.|limited|gmbh|b\.?v\.?|n\.?v\.?|s\.?a\.?|plc|corp|corp\.|corporation|co|co\.|pvt|private|technologies|technology|labs|software|solutions|group|holdings)\.?\s*$/i;

function lookupCompany(name) {
  const raw = String(name ?? "").trim();
  if (!raw) return null;

  let key = raw.toLowerCase();
  const direct = COMPANY_BY_NAME.get(key);
  if (direct) return direct;

  // Peel suffixes one at a time — "Foo Technologies Pvt Ltd" needs three.
  let prev;
  do {
    prev = key;
    key = key.replace(CORPORATE_SUFFIX, "").trim();
    const hit = COMPANY_BY_NAME.get(key);
    if (hit) return hit;
  } while (key && key !== prev);

  return null;
}

module.exports = { COMPANIES, COMPANY_BY_NAME, lookupCompany };
