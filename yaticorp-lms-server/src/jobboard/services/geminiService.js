/**
 * geminiService — semantic matching via Gemini text embeddings.
 *
 * The deterministic scorers answer "does this listing use the words the
 * user used". They are precise and completely literal: a React developer
 * scores zero against a job that asks for Vue and describes the same work,
 * and a listing that spells out responsibilities without naming a single
 * technology extracts no skills at all. Neither is a weak match; both are
 * invisible.
 *
 * An embedding turns a listing and a profile into vectors positioned by
 * meaning rather than by vocabulary, so the angle between them measures
 * whether the job *is* the kind of work the person does. That signal sits
 * alongside the literal ones rather than replacing them — it is good at
 * recognising related work and bad at hard requirements, which is exactly
 * the opposite of keyword matching.
 *
 * Everything here degrades to nothing without a key: no key, no vectors,
 * and the ranker falls back to the four deterministic signals with their
 * weights renormalised. The feature is additive, never load-bearing.
 */
const ApiUsage = require("../models/ApiUsage.js");
const { isConnected } = require("../config/db.js");

const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";
const TIMEOUT_MS = 20000;

/* Model and dimension are configurable because Google has shipped several
   generations under different names — gemini-embedding-001 is the generally
   available one, gemini-embedding-2 the newer. Pinning a name in code would
   make an upgrade a code change. */
const MODEL = process.env.GEMINI_EMBED_MODEL || "gemini-embedding-001";

/* 768 rather than the 3072 maximum. Quality is near-identical for short
   texts like these, and the vector is stored per listing and loaded per
   search — at 3072 the pool alone would move tens of megabytes a query. */
const DIMENSIONS = Number(process.env.GEMINI_EMBED_DIMENSIONS || 768);

/** Requests per calendar month, mirroring the JSearch ceiling's purpose. */
const MONTHLY_LIMIT = Number(process.env.GEMINI_MONTHLY_LIMIT || 1000);

/** Texts per batchEmbedContents call. */
const EMBED_BATCH = 50;

/**
 * Every configured key, in order.
 *
 * `GEMINI_API_KEYS` takes a comma-separated list; `GEMINI_API_KEY` remains
 * the single-key form. Read fresh each call so a key can be added to .env
 * without a restart.
 *
 * Worth being precise about what this does and doesn't buy. Google's own
 * quota identifiers are `GenerateRequestsPerDayPerProjectPerModel` and
 * `EmbedContentRequestsPerDayPerUserPerProjectPerModel` — the limit is per
 * *project*, so several keys minted inside one project share one allowance
 * and rotating between them changes nothing at all.
 *
 * What a list is genuinely for: continuing to work when a key is revoked or
 * rotated, and letting a paid key take over when a free one is spent.
 *
 * Inside the LMS there is a second consumer of Gemini: Career Path's mentor,
 * roadmaps and daily tasks, which run on GEMINI_API_KEY. Google meters per
 * PROJECT per day, so a big embedding backfill here could spend the very
 * allowance a mentor conversation needs mid-class. JOBS_GEMINI_API_KEY (and
 * its _N / plural forms) exists for that: when ANY jobs-scoped key is set,
 * this module uses ONLY those keys and never touches the shared ones —
 * separation is the point, so there is no quiet fallback that would undo it.
 * With no jobs-scoped key, the shared keys are used as before.
 */
const MAX_NUMBERED_KEYS = 10;

function collectKeys(prefix) {
  const found = [];

  // Numbered slots first, in order, so <PREFIX>_1 is the primary. Gaps are
  // skipped rather than stopping the scan — deleting key 2 of three
  // shouldn't silently hide key 3.
  for (let i = 1; i <= MAX_NUMBERED_KEYS; i++) {
    const value = String(process.env[`${prefix}_${i}`] ?? "").trim();
    if (value) found.push(value);
  }

  // Then the comma-separated form, then the single-key name.
  for (const value of String(process.env[`${prefix}S`] ?? "").split(",")) {
    const trimmed = value.trim();
    if (trimmed) found.push(trimmed);
  }
  const single = String(process.env[prefix] ?? "").trim();
  if (single) found.push(single);

  // Deduped: the same key pasted into two slots would otherwise be tried
  // twice and count as two places to fall back to when it is really one.
  return [...new Set(found)];
}

function geminiKeys() {
  const dedicated = collectKeys("JOBS_GEMINI_API_KEY");
  return dedicated.length ? dedicated : collectKeys("GEMINI_API_KEY");
}

/** Whether the job board runs on its own keys or shares Career Path's. */
const keyScope = () =>
  collectKeys("JOBS_GEMINI_API_KEY").length ? "dedicated" : "shared";

const geminiConfigured = () => geminiKeys().length > 0;

/* ---------------- accounting ---------------- */

const usageKey = () => `gemini:${new Date().toISOString().slice(0, 7)}`;

async function remainingCalls() {
  if (!isConnected()) return MONTHLY_LIMIT;
  try {
    const row = await ApiUsage.findOne({ key: usageKey() }).lean();
    return Math.max(0, MONTHLY_LIMIT - (row?.calls ?? 0));
  } catch {
    return MONTHLY_LIMIT;
  }
}

async function recordCall() {
  if (!isConnected()) return;
  const month = new Date().toISOString().slice(0, 7);
  try {
    await ApiUsage.updateOne(
      { key: usageKey() },
      { $inc: { calls: 1 }, $setOnInsert: { provider: "gemini", month } },
      { upsert: true }
    );
  } catch {
    /* a lost tick is better than a failed ingest */
  }
}

/* ---------------- embedding ---------------- */

/**
 * Requests per minute. The free tier's ceiling is low enough that firing
 * batches back to back fails on the second one — a full backfill died after
 * 50 listings with "you exceeded your current quota", which reads like a
 * hard cap and is really just going too fast. Batch size was never the
 * problem: 1, 5 and 50 all succeed when spaced out.
 */
const RPM = Number(process.env.GEMINI_RPM || 10);
const MIN_GAP_MS = Math.ceil(60000 / Math.max(1, RPM));

/* Serialised through one promise chain, so concurrent callers queue rather
   than all discovering the limit at once. */
let gate = Promise.resolve();
function paced(fn) {
  const result = gate.then(fn);
  gate = result.catch(() => {}).then(() => new Promise((r) => setTimeout(r, MIN_GAP_MS)));
  return result;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Seconds Google asks us to wait, when it says. */
function retryAfterMs(payload) {
  for (const d of payload?.error?.details ?? []) {
    const delay = d.retryDelay ?? d.retry_delay;
    if (typeof delay === "string") {
      const seconds = Number(delay.replace(/s$/, ""));
      if (Number.isFinite(seconds)) return Math.ceil(seconds * 1000);
    }
  }
  return null;
}

const MAX_ATTEMPTS = 4;

/**
 * When the daily allowance ran out, and so when it is worth asking again.
 *
 * The free tier allows 1000 embedding requests a day. Once that is gone
 * every call returns 429 with a retryDelay, and a retry loop turns each one
 * into a minute of waiting — a search that should take 90ms took 130
 * seconds, because the ranking refinement politely waited its turn four
 * times. Remembering the refusal makes subsequent calls fail instantly
 * instead of re-discovering it.
 */
const exhaustedUntil = new Map();

const keyExhausted = (key) => Date.now() < (exhaustedUntil.get(key) ?? 0);

/** Every key is spent — the caller should stop asking entirely. */
const quotaExhausted = () => {
  const keys = geminiKeys();
  return keys.length > 0 && keys.every(keyExhausted);
};

/** Back off this key for a while; the daily counter resets overnight. */
function noteQuotaExhausted(key, retryMs) {
  exhaustedUntil.set(key, Date.now() + Math.max(retryMs ?? 0, 5 * 60 * 1000));
}

async function post(path, body, { retry = true } = {}) {
  let lastError;
  const attempts = retry ? MAX_ATTEMPTS : 1;

  // Skip keys already known to be spent, so a dead one costs nothing.
  const usable = geminiKeys().filter((k) => !keyExhausted(k));
  const keys = usable.length ? usable : geminiKeys();
  if (!keys.length) throw new Error("No Gemini API key configured");

  for (let attempt = 1; attempt <= attempts; attempt++) {
    // Move to the next key on each retry rather than asking the same
    // exhausted one again — the point of a list is somewhere else to go.
    const key = keys[(attempt - 1) % keys.length];
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);

    try {
      const res = await paced(() =>
        fetch(`${ENDPOINT}/${MODEL}:${path}`, {
          method: "POST",
          signal: ctrl.signal,
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": key,
          },
          body: JSON.stringify(body),
        })
      );

      if (res.ok) return await res.json();

      const text = await res.text().catch(() => "");
      lastError = new Error(`Gemini HTTP ${res.status}: ${text.slice(0, 200)}`);

      let payload = null;
      try {
        payload = JSON.parse(text);
      } catch {
        /* not JSON — fall back to the doubling delay */
      }

      // 429 is "slow down", not "stop" — wait as instructed and try again.
      // Anything else is a real failure and retrying just burns quota.
      if (res.status === 429) noteQuotaExhausted(key, retryAfterMs(payload));
      if (res.status !== 429 || attempt === attempts) throw lastError;

      // Another key may still have allowance — try it immediately rather
      // than sitting out this one's cooldown.
      const another = keys.some((k) => k !== key && !keyExhausted(k));
      await sleep(another ? 0 : retryAfterMs(payload) ?? MIN_GAP_MS * 2 ** attempt);
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastError;
}

/** Pull the vector out of whichever response shape this model version uses. */
const vectorOf = (node) =>
  node?.values ?? node?.embedding?.values ?? node?.embeddings?.[0]?.values ?? null;

/**
 * Embed up to EMBED_BATCH texts in one request. Returns an array aligned
 * with the input, holding `null` wherever a vector couldn't be produced.
 * Never throws for a missing key or an exhausted budget — those are normal
 * states, not errors.
 */
async function embedBatch(texts, { retry = true } = {}) {
  const clean = texts.map((t) => String(t ?? "").trim().slice(0, 8000));
  if (!clean.length) return [];
  if (!geminiConfigured()) return clean.map(() => null);
  // Known out of allowance — don't spend 300ms rediscovering it per search.
  if (quotaExhausted()) return clean.map(() => null);
  if ((await remainingCalls()) < 1) return clean.map(() => null);

  const body = {
    requests: clean.map((text) => ({
      model: `models/${MODEL}`,
      content: { parts: [{ text }] },
      outputDimensionality: DIMENSIONS,
    })),
  };

  try {
    const data = await post("batchEmbedContents", body, { retry });
    const rows = data?.embeddings ?? [];
    return clean.map((_, i) => vectorOf(rows[i]));
  } finally {
    // Counted whether or not it succeeded: a 429 was still a request.
    await recordCall();
  }
}

/**
 * Embed a single text — the user's profile, once per search.
 *
 * `retry` defaults off: this runs inside a request, where waiting out a
 * rate limit is strictly worse than skipping the refinement. The backfill
 * script opts in, because there the wait is the whole point.
 */
async function embedOne(text, { retry = false } = {}) {
  const [vector] = await embedBatch([text], { retry });
  return vector ?? null;
}

/* ---------------- similarity ---------------- */

/**
 * The slice of raw cosine that job-to-profile comparisons actually occupy.
 *
 * Textbook rescaling of cosine is (c + 1) / 2, which assumes the full -1..1
 * range is in play. It isn't: any two English job descriptions share enough
 * structure to score well above zero. Measured against this model, a
 * frontend profile scores 0.687 on a frontend job, 0.576 on a backend one,
 * and 0.469 on a nursing job — the entire signal lives in a 0.22-wide band
 * near the middle.
 *
 * Textbook rescaling flattens that to 0.73..0.84, so a 0.15-weighted signal
 * moved the final score by under two points and changed no rankings at all.
 * Stretching the band that occurs onto 0..1 is what makes the difference
 * between a related job and an unrelated one visible in the output.
 *
 * Widened slightly beyond the measured extremes so an unusual pair clamps
 * rather than distorts. Override if you switch models — the band is a
 * property of the embedding space, not of this app.
 */
const COSINE_FLOOR = Number(process.env.GEMINI_COSINE_FLOOR || 0.40);
const COSINE_CEIL = Number(process.env.GEMINI_COSINE_CEIL || 0.80);

/** Raw cosine, -1..1. */
function rawCosine(a, b) {
  if (!a?.length || !b?.length || a.length !== b.length) return null;

  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (!normA || !normB) return null;

  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/** Cosine rescaled onto 0..1 over the band above, for use as a score. */
function cosineSimilarity(a, b) {
  const cos = rawCosine(a, b);
  if (cos == null) return null;
  const scaled = (cos - COSINE_FLOOR) / (COSINE_CEIL - COSINE_FLOOR);
  return Math.max(0, Math.min(1, scaled));
}

/* ---------------- the texts we embed ---------------- */

/**
 * What a listing means, as one string.
 *
 * Title and skills first because they carry the most signal per token, and
 * the description is truncated — these vectors are compared against a short
 * profile, so a long tail of benefits and boilerplate only adds noise.
 */
function jobText(job) {
  return [
    job.title,
    job.company ? `at ${job.company}` : "",
    (job.skills ?? []).length ? `Skills: ${job.skills.join(", ")}.` : "",
    job.type && job.type !== "Unknown" ? `${job.type}.` : "",
    String(job.description ?? "").slice(0, 900),
  ]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

/** The same, for the person searching. */
function profileText({ roleName, roleText, skills = [], jobType }) {
  const role = roleName || roleText;
  return [
    role ? `Looking for ${role} roles.` : "Looking for work.",
    skills.length ? `Skills: ${skills.join(", ")}.` : "",
    jobType && jobType !== "Any" ? `${jobType}.` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

/** Config summary, for scripts and health output. */
const geminiInfo = () => ({
  configured: geminiConfigured(),
  keys: geminiKeys().length,
  // "shared" means embeddings draw the same per-project allowance Career
  // Path's mentor does — the admin page shows this so the contention is
  // visible before it bites.
  keyScope: keyScope(),
  model: MODEL,
  dimensions: DIMENSIONS,
  monthlyLimit: MONTHLY_LIMIT,
});

module.exports = { EMBED_BATCH, geminiKeys, geminiConfigured, quotaExhausted, embedBatch, embedOne, rawCosine, cosineSimilarity, jobText, profileText, geminiInfo };
