/**
 * Gemini discovery — job LEADS found by a language model with Google Search
 * grounding, for the cities and kinds of work the keyless boards never
 * reach (an internship in Mangaluru is on a college notice board and a
 * company's own page, not on Greenhouse).
 *
 * These are leads, not verified postings: the model reads search results
 * and reports what it found, with the link it found it at. Every row is
 * labelled "Gemini (AI-discovered)" so the card can say so, and nothing is
 * kept without a URL. Off unless JOBS_GEMINI_DISCOVERY=true.
 *
 * Spend is bounded by JOBS_GEMINI_DISCOVERY_MONTHLY_LIMIT (default 300
 * calls) and shares the key rotation in geminiService — including its rule
 * that a JOBS_GEMINI_API_KEY, when set, keeps the job board off Career
 * Path's allowance.
 */
const ApiUsage = require("../models/ApiUsage.js");
const { isConnected } = require("../config/db.js");
const { geminiKeys, geminiConfigured } = require("./geminiService.js");

const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";
const MODEL = process.env.JOBS_GEMINI_DISCOVERY_MODEL || "gemini-2.5-flash";
const MONTHLY_LIMIT = Number(process.env.JOBS_GEMINI_DISCOVERY_MONTHLY_LIMIT || 300);
// A grounded generation reads several search results before answering;
// forty seconds is normal and ninety is the ceiling worth waiting for.
const TIMEOUT_MS = 90000;
const MAX_ROWS = 20;

const enabled = () => String(process.env.JOBS_GEMINI_DISCOVERY || "").toLowerCase() === "true" && geminiConfigured();

const usageKey = () => `gemini-discovery:${new Date().toISOString().slice(0, 7)}`;

async function remainingCalls() {
  if (!isConnected()) return MONTHLY_LIMIT;
  try {
    const row = await ApiUsage.findOne({ key: usageKey() }).lean();
    return Math.max(0, MONTHLY_LIMIT - (row?.calls ?? 0));
  } catch { return MONTHLY_LIMIT; }
}

async function recordCall() {
  if (!isConnected()) return;
  try {
    await ApiUsage.updateOne(
      { key: usageKey() },
      { $inc: { calls: 1 }, $setOnInsert: { provider: "gemini-discovery", month: new Date().toISOString().slice(0, 7) } },
      { upsert: true }
    );
  } catch { /* accounting must never fail a fetch */ }
}

const prompt = ({ search, place, limit }) => `You are a job-search assistant. Use Google Search to find CURRENTLY OPEN "${search}" positions located in ${place.city}, ${place.country} (including "${place.city}" spelled other ways).
Look at company career pages, Internshala, LinkedIn, Naukri, Indeed, Glassdoor, college placement notices and local news.

Return ONLY a JSON array (no prose, no markdown fences) of up to ${limit} objects, each shaped exactly:
{"title": string, "company": string, "companyUrl": string, "url": string, "location": string, "type": "Internship" | "Full-time" | "Part-time" | "Contract", "remote": boolean, "salary": string, "description": string, "skills": string[]}

Rules:
- "url" must be the page where you found the posting. Skip anything without a URL.
- Only include postings that appear to be open now, in or near ${place.city}. Never invent a company or a posting.
- "description" is at most 300 characters, in plain English. "skills" are 1 to 8 short skill names.
- If "${search}" mentions internship, "type" must be "Internship".`;

/**
 * A link the model made up rather than found: a placeholder id, an example
 * domain, or a bare site root. A lead is only as good as its link.
 */
const PLACEHOLDER_URL = /(?:^|[/-])(?:123456|1234567?|000000|xxxx+|abc123)(?:[/?#]|$)|example\.(?:com|org)|localhost/i;
const looksReal = (url) => /^https?:\/\/[^/\s]+\/\S+/i.test(url) && !PLACEHOLDER_URL.test(url);

/** Pull a JSON array out of a model answer that may wrap it in text or fences. */
function parseRows(text) {
  const cleaned = String(text || "").replace(/```(?:json)?/gi, "").trim();
  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");
  if (start < 0 || end <= start) return [];
  try {
    const arr = JSON.parse(cleaned.slice(start, end + 1));
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

/**
 * Ask Gemini for leads. Resolves to [] when disabled, out of allowance, or
 * when nothing usable came back; throws on a hard API failure so the
 * ingest report can say why.
 */
async function discoverJobs({ search, place, limit = MAX_ROWS } = {}) {
  if (!enabled() || !place?.city || !search) return [];
  if ((await remainingCalls()) < 1) return [];

  const keys = geminiKeys();
  let lastError;
  for (const key of keys) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(`${ENDPOINT}/${MODEL}:generateContent`, {
        method: "POST",
        signal: ctrl.signal,
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt({ search, place, limit }) }] }],
          tools: [{ google_search: {} }],
          generationConfig: { temperature: 0.2 }
        })
      });
      await recordCall();
      if (res.status === 429) { lastError = new Error("Gemini discovery: rate limited"); continue; }
      if (!res.ok) throw new Error(`Gemini discovery HTTP ${res.status}: ${(await res.text().catch(() => "")).slice(0, 160)}`);
      const data = await res.json();
      const text = (data?.candidates?.[0]?.content?.parts ?? []).map((p) => p.text || "").join("\n");
      const rows = parseRows(text).filter((r) => r && r.title && r.company && looksReal(String(r.url || "").trim()));
      return rows.slice(0, limit).map((r) => ({
        title: String(r.title).trim().slice(0, 160),
        company: String(r.company).trim().slice(0, 120),
        companyUrl: /^https?:\/\//i.test(String(r.companyUrl || "")) ? String(r.companyUrl).trim() : "",
        url: String(r.url).trim(),
        location: String(r.location || `${place.city}, ${place.country}`).trim().slice(0, 160),
        type: String(r.type || "").trim(),
        remote: !!r.remote,
        salary: String(r.salary || "").trim().slice(0, 80),
        description: String(r.description || "").trim().slice(0, 600),
        skills: Array.isArray(r.skills) ? r.skills.map((s) => String(s).trim()).filter(Boolean).slice(0, 8) : []
      }));
    } catch (err) {
      // A timeout is the model being slow, not this key being spent: the
      // next key would wait just as long, so stop here rather than burn
      // every key's allowance on the same slow question.
      if (err.name === "AbortError") throw new Error("Gemini discovery: timed out");
      lastError = err;
    } finally {
      clearTimeout(timer);
    }
  }
  if (lastError) throw lastError;
  return [];
}

module.exports = { discoverJobs, discoveryEnabled: enabled, DISCOVERY_MODEL: MODEL };
