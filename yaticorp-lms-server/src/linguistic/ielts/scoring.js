/**
 * IELTS scoring (2026-11-17).
 *
 * Listening and Reading: marked here, then the raw score is scaled to the 40 questions of a real paper and turned
 * into a band with the published Academic conversion tables (approximate: the real tables shift slightly per paper).
 * Writing and Speaking: marked by Gemini against the four public band descriptors, on the platform key or the
 * student's own (utils/userAiKey.js), as the AI interview is. Overall: the mean of the four, rounded the IELTS way —
 * .25 up to .5, .75 up to the next whole band.
 */
const { geminiClient, describeKeyError, aiConfiguredFor } = require('../../utils/userAiKey');
const { runFor } = require('../../career/services/aiContext');
const aiQuota = require('../../career/services/aiQuota');

const MODEL = process.env.IELTS_AI_MODEL || process.env.GEMINI_MODEL || 'gemini-flash-lite-latest';

/* ── Listening and Reading ─────────────────────────────────────────── */

const norm = (s) => String(s ?? '').toLowerCase().replace(/[’']/g, "'").replace(/[.,;:!?"]+$/g, '').replace(/\s+/g, ' ').trim();
const correct = (q, given) => {
    // Choose TWO: both letters, in any order.
    if (q.kind === 'multi') {
        const set = (x) => [...new Set(String(x).toUpperCase().split(/[\s,]+/).filter(Boolean))].sort().join(',');
        return set(given) === set(q.answer.join(','));
    }
    if (Array.isArray(q.answer)) {
        const g = norm(given).replace(/^(the|a|an) /, '');
        return q.answer.some((a) => { const n = norm(a); return n === norm(given) || n.replace(/^(the|a|an) /, '') === g || n.replace(/\s/g, '') === g.replace(/\s/g, ''); });
    }
    return norm(given).toUpperCase() === String(q.answer).toUpperCase();
};

// [lowest raw score out of 40, band]
const LISTENING = [[39, 9], [37, 8.5], [35, 8], [32, 7.5], [30, 7], [26, 6.5], [23, 6], [18, 5.5], [16, 5], [13, 4.5], [10, 4], [8, 3.5], [6, 3], [4, 2.5], [2, 2], [1, 1], [0, 0]];
const READING = [[39, 9], [37, 8.5], [35, 8], [33, 7.5], [30, 7], [27, 6.5], [23, 6], [19, 5.5], [15, 5], [13, 4.5], [10, 4], [8, 3.5], [6, 3], [4, 2.5], [2, 2], [1, 1], [0, 0]];
const bandFrom = (table, raw, total) => {
    const of40 = Math.round((raw / Math.max(total, 1)) * 40);
    return table.find(([min]) => of40 >= min)[1];
};

/** Mark a set of questions: { raw, total, band, review: [{ id, given, correct, answer }] }. */
const markObjective = (section, questions, answers = {}) => {
    const review = questions.map((q) => {
        const given = String(answers[q.id] ?? '').slice(0, 200);
        const ok = !!given.trim() && correct(q, given);
        return { id: q.id, given, correct: ok, answer: q.kind === 'multi' ? q.answer.join(', ') : Array.isArray(q.answer) ? q.answer[0] : q.answer };
    });
    const raw = review.filter((r) => r.correct).length;
    return { raw, total: questions.length, band: bandFrom(section === 'listening' ? LISTENING : READING, raw, questions.length), review };
};

/** IELTS rounding: x.25 → x.5, x.75 → x+1. */
const roundBand = (x) => {
    const whole = Math.floor(x), frac = x - whole;
    return frac < 0.25 ? whole : frac < 0.75 ? whole + 0.5 : whole + 1;
};
const clampBand = (b) => Math.max(0, Math.min(9, Math.round(Number(b) * 2) / 2 || 0));
const overallOf = (bands) => (bands.every((b) => typeof b === 'number') ? roundBand(bands.reduce((a, b) => a + b, 0) / bands.length) : null);

/* ── Writing and Speaking (AI) ─────────────────────────────────────── */

const parse = (text) => {
    const cleaned = String(text || '').replace(/```(?:json)?/gi, '').trim();
    return JSON.parse(cleaned.slice(cleaned.search(/[[{]/), Math.max(cleaned.lastIndexOf('}'), cleaned.lastIndexOf(']')) + 1));
};
/*
 * One retry (2026-11-17: "The examiner could not mark this just now" on the live site): a Gemini 429/500/503 or an
 * answer that is not whole JSON is asked once more after a short wait. The day's credits being spent, or a key Google
 * refuses, are not retried — those come back with their own words (routes.js).
 */
const ask = async (userId, kind, prompt) => {
    try { return await askOnce(userId, kind, prompt); } catch (e) {
        if (e?.name === 'AiBudgetError' || e?.name === 'AiKeyError') throw e;
        console.warn(`[ielts] ${kind} failed once, retrying:`, e?.status || '', e?.message?.slice(0, 200));
        await new Promise((r) => setTimeout(r, 2500));
        return askOnce(userId, kind, prompt);
    }
};
const askOnce = async (userId, kind, prompt) => {
    const ai = await runFor(userId, geminiClient);
    const started = Date.now();
    let ok = false;
    try {
        await aiQuota.assertWithinBudget();
        const res = await runFor(userId, () => ai.models.generateContent({
            model: MODEL, contents: prompt,
            config: { responseMimeType: 'application/json', maxOutputTokens: 2500, temperature: 0.2 }
        })).catch((error) => { throw describeKeyError(error, ai.__ownKey); });
        const text = typeof res.text === 'function' ? res.text() : res.text || res?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || '';
        const out = parse(text);
        ok = true;
        return out;
    } finally {
        aiQuota.record({ kind, model: MODEL, ok, ms: Date.now() - started });
    }
};

const words = (t) => (String(t || '').trim().match(/[\p{L}\p{N}'’-]+/gu) || []).length;
const EXAMINER = 'You are a strict, experienced IELTS examiner. Mark exactly as an official examiner would, using the public IELTS band descriptors. Do not be generous: most candidates are between band 4 and 7. Use half bands only for the overall task band, whole bands for each criterion. Reply with JSON only.';

const criteria = (o, keys) => Object.fromEntries(keys.map((k) => [k, Math.max(0, Math.min(9, Math.round(Number(o?.[k]) || 0)))]));
const list = (x, n = 4) => (Array.isArray(x) ? x.filter((s) => typeof s === 'string' && s.trim()).slice(0, n).map((s) => s.trim().slice(0, 400)) : []);

/** Task 1's visual in words, for the examiner: a bar chart's figures, or a process diagram's stages in order. */
const describeVisual = (chart) => (chart.type === 'process'
    ? `Process diagram — ${chart.title}. Stages in order: ${chart.steps.map((st, i) => `${i + 1}. ${st.title}${st.text ? ` (${st.text})` : ''}`).join('; ')}.`
    : `Chart data — ${chart.title}: ${chart.rows.map(([n, x, y]) => `${n}: ${chart.series[0]} ${x}${chart.unit}, ${chart.series[1]} ${y}${chart.unit}`).join('; ')}.`);

/** Writing: both tasks → { task1, task2, band }. Task 2 counts double, as in the real test. */
const markWriting = async (userId, test, { task1 = '', task2 = '' }) => {
    const w1 = words(task1), w2 = words(task2);
    const chart = test.writing.task1.chart;
    const t1 = test.writing.task1;
    const prompt = `${EXAMINER}

${t1.letter
        ? `TASK 1 (General Training letter, at least ${t1.minWords} words; mark tone and purpose too): ${t1.prompt} ${t1.bullets.map((b) => `• ${b}`).join(' ')}`
        : `TASK 1 (Academic, at least ${t1.minWords} words): ${t1.prompt}\n${describeVisual(chart)}`}
Candidate's Task 1 answer (${w1} words):
"""${String(task1).slice(0, 6000)}"""

TASK 2 (at least ${test.writing.task2.minWords} words): ${test.writing.task2.prompt}
Candidate's Task 2 answer (${w2} words):
"""${String(task2).slice(0, 9000)}"""

An answer under the word limit loses marks in Task Achievement / Task Response. An empty or off-topic answer is band 0–2.
Return:
{"task1":{"TA":0-9,"CC":0-9,"LR":0-9,"GRA":0-9,"band":0-9,"strengths":["…"],"improve":["…"],"corrections":[{"wrong":"…","right":"…"}]},
 "task2":{"TR":0-9,"CC":0-9,"LR":0-9,"GRA":0-9,"band":0-9,"strengths":["…"],"improve":["…"],"corrections":[{"wrong":"…","right":"…"}]}}
Keep strengths and improve to 2–3 short, specific points each; up to 4 corrections quoting the candidate's own words.`;
    const out = await ask(userId, 'ielts-writing', prompt);
    const task = (o, keys, n) => ({
        ...criteria(o, keys), band: clampBand(o?.band), words: n,
        strengths: list(o?.strengths, 3), improve: list(o?.improve, 3),
        corrections: (Array.isArray(o?.corrections) ? o.corrections : []).filter((c) => c?.wrong && c?.right).slice(0, 4).map((c) => ({ wrong: String(c.wrong).slice(0, 200), right: String(c.right).slice(0, 200) }))
    });
    const task1Out = task(out.task1, ['TA', 'CC', 'LR', 'GRA'], w1);
    const task2Out = task(out.task2, ['TR', 'CC', 'LR', 'GRA'], w2);
    return { task1: task1Out, task2: task2Out, band: roundBand((task1Out.band + 2 * task2Out.band) / 3) };
};

/**
 * Speaking: the transcripts of every answer → { FC, LR, GRA, band, … }. Pronunciation cannot be judged from text, so
 * it is not scored: the band is the mean of the other three criteria (said so on the result screen).
 */
const markSpeaking = async (userId, test, answers = {}) => {
    const lines = test.speaking.parts.flatMap((p) => p.questions.map((q) => `[${p.title}] Q: ${q.prompt}\nA (transcribed speech): ${String(answers[q.id] || '(no answer)').slice(0, 3000)}`));
    const prompt = `${EXAMINER}
These are speech-to-text transcripts of a candidate's spoken IELTS Speaking test. Ignore missing punctuation and capital letters (the transcriber adds them, not the candidate). Pronunciation cannot be judged from text: do not score it.

${lines.join('\n\n')}

Return:
{"FC":0-9,"LR":0-9,"GRA":0-9,"strengths":["…"],"improve":["…"],"corrections":[{"wrong":"…","right":"…"}],"betterAnswer":{"question":"…","answer":"a band-8 model answer to the weakest question, 60–90 words"}}`;
    const out = await ask(userId, 'ielts-speaking', prompt);
    const c = criteria(out, ['FC', 'LR', 'GRA']);
    return {
        ...c, band: roundBand((c.FC + c.LR + c.GRA) / 3),
        strengths: list(out?.strengths, 3), improve: list(out?.improve, 3),
        corrections: (Array.isArray(out?.corrections) ? out.corrections : []).filter((x) => x?.wrong && x?.right).slice(0, 4).map((x) => ({ wrong: String(x.wrong).slice(0, 200), right: String(x.right).slice(0, 200) })),
        betterAnswer: out?.betterAnswer?.answer ? { question: String(out.betterAnswer.question || '').slice(0, 300), answer: String(out.betterAnswer.answer).slice(0, 900) } : null
    };
};

module.exports = { describeVisual, markObjective, markWriting, markSpeaking, overallOf, roundBand, bandFrom, LISTENING, READING, words, aiConfiguredFor };
