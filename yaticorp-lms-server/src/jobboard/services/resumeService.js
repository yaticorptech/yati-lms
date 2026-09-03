/**
 * Resume → structured profile, via Gemini.
 *
 * The one place in the job board that reads a document a student wrote about
 * themselves, so two rules are absolute:
 *
 *   - Extraction, never invention. The prompt forbids inference, the schema
 *     bounds the shape, and the caller shows the result back to the student
 *     for review before anything uses it. A parser that "helpfully" rounds a
 *     student up is writing fiction into their job matching.
 *   - The file dies with the request. Only the extracted facts persist (see
 *     models/ResumeProfile.js), and the student can delete those.
 *
 * Runs on the job board's Gemini keys (JOBS_GEMINI_API_KEY when set, the
 * shared key otherwise — same rule as embeddings), with its own monthly meter
 * so a run on resumes cannot silently spend the embedding allowance's books.
 */
const ApiUsage = require('../models/ApiUsage');
const { isConnected } = require('../config/db');
const { geminiKeys } = require('./geminiService');
const { normalizeSkillList } = require('./matchService');

const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';
// Parsing a document is a heavier ask than embedding a paragraph — default to
// the full flash model rather than lite, overridable like everything else.
const MODEL = process.env.JOBS_RESUME_MODEL || 'gemini-flash-latest';
// Tried when the primary answers 503 — "high demand" on one model is routinely
// quiet on its sibling, and a student mid-upload should not eat that lottery.
const FALLBACK_MODEL = process.env.JOBS_RESUME_FALLBACK_MODEL || 'gemini-flash-lite-latest';
const TIMEOUT_MS = 60_000;
const MONTHLY_LIMIT = Number(process.env.JOBS_RESUME_MONTHLY_LIMIT || 300);

const SENIORITY = ['Student', 'Fresher', 'Junior', 'Mid-level', 'Senior', 'Lead'];

const PROMPT = `You are extracting structured facts from a resume for job matching.

Extract ONLY what the resume actually states. Never infer, estimate, or embellish — a fact that is not on the page does not exist. If a field is not stated, leave it empty (or 0).

- skills: individual, concrete skills — technologies, tools, languages, frameworks, methods. Split compound phrases into separate skills. At most 20, most prominent first.
- experienceYears: total FULL-TIME professional experience in years. Internships and coursework count as 0. Round to the nearest whole year.
- seniority: "Student" if currently studying with no full-time work; "Fresher" if graduated but no full-time role yet; otherwise "Junior" (<2y), "Mid-level" (2-5y), "Senior" (5-10y), "Lead" (10y+ or a leadership title).
- education: the HIGHEST level stated. level is one of: "High School", "Diploma", "Undergraduate", "Postgraduate". degree is the qualification name (e.g. "B.Tech"). specialization is the field (e.g. "Computer Science").
- pastRoles: job titles actually held (including internships), most recent first, at most 5.
- headline: one factual sentence describing this person, drawn only from the resume. No praise words.`;

const RESPONSE_SCHEMA = {
    type: 'object',
    properties: {
        skills: { type: 'array', items: { type: 'string' } },
        experienceYears: { type: 'number' },
        seniority: { type: 'string', enum: SENIORITY },
        education: {
            type: 'object',
            properties: {
                level: { type: 'string' },
                degree: { type: 'string' },
                specialization: { type: 'string' }
            }
        },
        pastRoles: { type: 'array', items: { type: 'string' } },
        headline: { type: 'string' }
    },
    required: ['skills', 'seniority', 'headline']
};

/* ---- metering: parses are generation calls, booked apart from embeds ---- */

const monthKey = () => `resume:${new Date().toISOString().slice(0, 7)}`;

const monthSpent = async () => {
    if (!isConnected()) return 0;
    try {
        const row = await ApiUsage.findOne({ key: monthKey() }).lean();
        return row?.calls ?? 0;
    } catch {
        return 0;
    }
};

const recordParse = async () => {
    if (!isConnected()) return;
    try {
        await ApiUsage.updateOne(
            { key: monthKey() },
            { $inc: { calls: 1 }, $setOnInsert: { provider: 'resume', month: new Date().toISOString().slice(0, 7) } },
            { upsert: true }
        );
    } catch { /* a lost tick is better than a failed parse */ }
};

/**
 * Parse one PDF resume into the profile shape.
 *
 * Throws with a student-readable message on every failure — the route hands
 * these straight through, so they are written for the person who uploaded.
 */
const parseResume = async (buffer, filename = 'resume.pdf') => {
    const keys = geminiKeys();
    if (!keys.length) {
        const err = new Error('Resume parsing is not configured on this server.');
        err.status = 503;
        throw err;
    }
    if ((await monthSpent()) >= MONTHLY_LIMIT) {
        const err = new Error('Resume parsing is temporarily unavailable — the monthly allowance is spent. Fill the form by hand for now.');
        err.status = 503;
        throw err;
    }

    const body = {
        contents: [{
            parts: [
                { inline_data: { mime_type: 'application/pdf', data: buffer.toString('base64') } },
                { text: PROMPT }
            ]
        }],
        generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: RESPONSE_SCHEMA,
            temperature: 0
        }
    };

    let lastError;
    // Bounded and interactive: at most four attempts, walking model × key —
    // the primary model on each key, then the fallback model — with a short
    // pause before retrying an "overloaded" answer. A student watching a
    // spinner gets resilience, not a polite quarter-minute of backoff.
    const attempts = [];
    for (const model of [MODEL, FALLBACK_MODEL]) {
        for (const key of keys.slice(0, 2)) attempts.push({ model, key });
    }

    for (const [i, { model, key }] of attempts.slice(0, 4).entries()) {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
        try {
            const res = await fetch(`${ENDPOINT}/${model}:generateContent`, {
                method: 'POST',
                signal: ctrl.signal,
                headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
                body: JSON.stringify(body)
            });
            const text = await res.text();
            if (!res.ok) {
                lastError = new Error(`Gemini HTTP ${res.status}: ${text.slice(0, 200)}`);
                // 503 is "come back in a moment" — give the next attempt a
                // beat rather than re-asking inside the same demand spike.
                if (res.status === 503 && i < attempts.length - 1) {
                    await new Promise((r) => setTimeout(r, 2000));
                }
                continue;
            }

            await recordParse();

            const payload = JSON.parse(text);
            const raw = payload?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!raw) throw new Error('empty response');
            const parsed = JSON.parse(raw);

            const skillsRaw = (parsed.skills ?? []).map((s) => String(s).trim()).filter(Boolean).slice(0, 20);
            return {
                // Canonical spellings so they slot straight into the ranking;
                // unknown skills pass through as typed.
                skills: normalizeSkillList(skillsRaw),
                skillsRaw,
                experienceYears: Math.max(0, Math.round(Number(parsed.experienceYears) || 0)),
                seniority: SENIORITY.includes(parsed.seniority) ? parsed.seniority : 'Fresher',
                education: {
                    level: String(parsed.education?.level ?? '').slice(0, 60),
                    degree: String(parsed.education?.degree ?? '').slice(0, 80),
                    specialization: String(parsed.education?.specialization ?? '').slice(0, 80)
                },
                pastRoles: (parsed.pastRoles ?? []).map((r) => String(r).trim()).filter(Boolean).slice(0, 5),
                headline: String(parsed.headline ?? '').slice(0, 200),
                filename: String(filename).slice(0, 120)
            };
        } catch (err) {
            lastError = err;
        } finally {
            clearTimeout(timer);
        }
    }

    const err = new Error('Could not read that resume — try re-exporting it as a text-based PDF.');
    err.status = 422;
    err.cause = lastError;
    throw err;
};

module.exports = { parseResume };
