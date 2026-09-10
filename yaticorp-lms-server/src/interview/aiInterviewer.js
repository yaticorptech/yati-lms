/**
 * The AI interviewer. Three jobs, each a Gemini call answering JSON:
 *   nextQuestion   — the next thing to ask, given the transcript so far
 *   evaluate       — the report, once the interview is over
 *   generateQuestions — a personalised practice bank
 *
 * Each falls back to templateInterviewer when Gemini is not configured,
 * over its daily budget, or answers with something unusable — so the
 * section always works, and says which interviewer it used.
 *
 * Calls run through Career Path's AI quota and usage ledger, like the
 * Learning Bio: a student regenerating in a loop is bounded the same way.
 */
const aiQuota = require('../career/services/aiQuota');
const { runFor } = require('../career/services/aiContext');
const template = require('./templateInterviewer');

const MODEL = process.env.INTERVIEW_AI_MODEL || process.env.GEMINI_MODEL || 'gemini-flash-lite-latest';
const configured = () => String(process.env.INTERVIEW_AI || '').toLowerCase() !== 'template' && !!String(process.env.GEMINI_API_KEY || '').trim();

const parse = (text) => {
    const cleaned = String(text || '').replace(/```(?:json)?/gi, '').trim();
    const start = cleaned.search(/[[{]/);
    const end = Math.max(cleaned.lastIndexOf('}'), cleaned.lastIndexOf(']'));
    return JSON.parse(cleaned.slice(start, end + 1));
};

const call = async (prompt, { userId, kind, maxOutputTokens = 900 }) => {
    const { GoogleGenAI } = require('@google/genai');
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const started = Date.now();
    let ok = false;
    try {
        await aiQuota.assertWithinBudget();
        const res = await runFor(userId, () => ai.models.generateContent({
            model: MODEL, contents: prompt,
            config: { responseMimeType: 'application/json', maxOutputTokens, temperature: 0.5 }
        }));
        const text = typeof res.text === 'function' ? res.text() : res.text || res?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || '';
        const out = parse(text);
        ok = true;
        return out;
    } finally {
        aiQuota.record({ kind, model: MODEL, ok, ms: Date.now() - started });
    }
};

const profile = (c) => JSON.stringify({
    name: c.name, audience: c.audience, education: c.education, experience: c.experience, goal: c.goal,
    strongSkills: c.strongSkills, learningSkills: c.learningSkills, completedCourses: c.completedCourses, ongoingCourses: c.ongoingCourses,
    projects: c.projects.map((p) => ({ name: p.name, description: p.description, skills: p.skills })),
    assessments: c.assessments, certificates: c.certificates, interests: c.interests
});

const STAGE_GUIDE = {
    intro: 'Greet the candidate by first name, welcome them to the mock interview, and ask them to tell you about themselves — all in ONE message.',
    about: 'Ask about who they are and what drew them to their field or goal.',
    background: 'Ask about their education or courses — pick something specific from the profile.',
    skills: 'Ask about their skills — name a specific skill from the profile.',
    technical: 'Ask a real technical question on one of their strong or learning skills, pitched to their level. Explain-this, compare-these, or a debugging scenario.',
    project: 'Ask about a specific project from the profile by name: goal, role, decisions, difficulties.',
    problem: 'Pose a short problem-solving scenario relevant to their field and ask how they would approach it.',
    behavioral: 'Ask a behavioural question (a time when…) suited to their level.',
    situational: 'Pose a situational question (imagine that…) about teamwork, deadlines or communication.',
    candidate: 'Say you are almost done and ask if they have any questions for you.',
    closing: 'Thank them by name and say the interview is complete and the evaluation follows.'
};

/* ── nextQuestion ─────────────────────────────────────────────────────── */

/**
 * The next thing the interviewer says.
 *
 * When the last answer plainly did not respond to the question — the design
 * question answered with "I am a housekeeper" — this comes back as
 * `{ addressed: false, redirect }`: the interviewer's own words saying so and
 * asking again. The caller decides whether to use it, and one judgement rides
 * along with the question the model was going to write anyway, so it costs no
 * extra call. `answerCheck.js` catches the same thing without the AI, but only
 * where a keyword test can be trusted; this covers every stage.
 */
const nextQuestion = async ({ session, context, nextStage, canFollowUp, lastTurn, userId, judge = false }) => {
    const fallback = () => template.nextQuestion({ session, context, nextStage, canFollowUp, lastTurn });
    if (!configured()) return { ...fallback(), interviewer: 'template' };
    const stage = nextStage;
    const transcript = session.turns.map((t) => `Q${t.index + 1} [${t.stage}]: ${t.question}\nA${t.index + 1}: ${t.answer || '(no answer)'}`).join('\n');
    const prompt = `You are a warm, professional interviewer conducting a ${session.type === 'full' ? 'full mock' : session.type} interview${session.role ? ` for the role of ${session.role}` : ''}. Speak naturally, one question at a time, as a human interviewer would. Never use bullet points. Never repeat a question already asked.

CANDIDATE PROFILE (use it — name their actual skills, courses and projects):
${profile(context)}

TRANSCRIPT SO FAR:
${transcript || '(nothing yet)'}

${judge && lastTurn?.answer ? `FIRST, judge the answer just given:
  You asked: "${lastTurn.question}"
  They said: "${lastTurn.answer}"
Set "addressed" false ONLY if that plainly does not respond to what you asked — a different subject altogether, or a statement that ignores the question. A short, vague, weak, partial or mistaken answer still counts as addressed: set true. When it is false, leave "question" empty and write "redirect": one or two warm sentences in your own voice saying that this does not answer what you asked, and putting the same question again more plainly. Otherwise set addressed true, leave redirect empty, and ask the next thing:

` : ''}NOW: ${canFollowUp && lastTurn
        ? `The candidate just answered a "${lastTurn.stage}" question. If that answer mentions something worth probing (a project, a decision, a claim, something vague), ask ONE natural follow-up about it and set isFollowUp true and stage "${lastTurn.stage}". Otherwise move on: stage "${stage}" — ${STAGE_GUIDE[stage]} — with isFollowUp false and stage "${stage}".`
        : `Stage "${stage}". ${STAGE_GUIDE[stage]} isFollowUp is false and stage is "${stage}".`}
Adjust difficulty to their answers so far: stronger answers earn harder questions. Keep the message under 60 words.

Answer ONLY with JSON: {${judge && lastTurn?.answer ? '"addressed": boolean, "redirect": string, ' : ''}"question": string, "stage": string, "isFollowUp": boolean, "difficulty": "easy" | "medium" | "hard"}`;
    try {
        const out = await call(prompt, { userId, kind: 'interview-question', maxOutputTokens: 400 });
        // Off topic: hand back the redirect instead of a question. A missing
        // redirect means the model only half-answered, so the answer stands.
        const redirect = String(out.redirect || '').trim();
        if (judge && lastTurn?.answer && out.addressed === false && redirect && redirect.length <= 600) {
            return { addressed: false, redirect, interviewer: MODEL };
        }
        const question = String(out.question || '').trim();
        if (!question || question.length > 600) throw new Error('empty question');
        const isFollowUp = !!(canFollowUp && lastTurn && out.isFollowUp);
        return { addressed: true, question, stage: isFollowUp ? lastTurn.stage : stage, isFollowUp, difficulty: ['easy', 'medium', 'hard'].includes(out.difficulty) ? out.difficulty : 'medium', interviewer: MODEL };
    } catch (err) {
        console.warn('[interview] question fell back to the template interviewer:', err.message);
        return { addressed: true, ...fallback(), interviewer: 'template' };
    }
};

/* ── evaluate ─────────────────────────────────────────────────────────── */

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, Math.round(Number(n) || 0)));

const evaluate = async ({ session, context, userId, delivery = '' }) => {
    const fallback = () => template.evaluate({ session, context });
    if (!configured()) return fallback();
    const answered = session.turns.filter((t) => t.answer);
    if (!answered.length) return fallback();
    // The repeats are this session's own record of an answer that did not land:
    // the interviewer had already told the candidate so at the time.
    const transcript = answered.map((t) => {
        const nudges = t.clarifications || 0;
        const note = nudges ? ` (the interviewer had to put this question again ${nudges === 1 ? 'once' : `${nudges} times`}: the first repl${nudges === 1 ? 'y' : 'ies'} did not answer it)` : '';
        return `Q${t.index + 1} [${t.stage}]${note}: ${t.question}\nA${t.index + 1}: ${t.answer}`;
    }).join('\n\n');
    const repeated = answered.filter((t) => (t.clarifications || 0) > 0).length;
    const prompt = `You are an experienced interviewer writing an honest evaluation of a mock ${session.type} interview${session.role ? ` for the role of ${session.role}` : ''}. Judge only what the candidate actually said, and judge it as an interviewer deciding whether to hire — not as a teacher being kind. This is practice: a soft score teaches nothing, and the candidate would rather read it here than be turned down without knowing why. Be specific, be direct, and stay respectful.

SCORE HONESTLY, USING THE WHOLE RANGE:
  85-100  thorough, specific answers that address the questions, with real examples and reasoning
  70-84   solid answers with gaps
  50-69   thin or vague answers, or a few that miss the point
  30-49   one-line answers, or answers with no substance behind them
  0-29    almost nothing usable, or answers about something else entirely
An answer the interviewer had to ask for again scores 0-3 out of 10 for that question, and drags relevance down.${repeated ? ` That happened ${repeated} time${repeated === 1 ? '' : 's'} here, so relevance cannot be high.` : ''}
Do NOT invent strengths, and never praise the candidate for turning up or for completing the interview. If there was genuinely little to praise, say so plainly in one sentence instead.

CANDIDATE PROFILE:
${profile(context)}

TRANSCRIPT:
${transcript}
${delivery ? `\nDELIVERY (measured from the spoken answers; weigh it in the communication and confidence scores): ${delivery}\n` : ''}
Answer ONLY with JSON of this exact shape:
{
 "overall": 0-100,
 "scores": {"communication": 0-100, "technical": 0-100, "answerQuality": 0-100, "problemSolving": 0-100, "confidence": 0-100, "relevance": 0-100},
 "strengths": [1 to 3 short specific sentences about what actually went well — fewer, honest items beat three generous ones],
 "improvements": [3 short specific, actionable sentences naming what was missing],
 "feedback": "one paragraph (60-100 words) addressed to ${context.firstName}, saying plainly how the interview went and why, quoting or naming what they actually said",
 "perQuestion": [ for EVERY question index in the transcript: {"index": number (0-based, matching Q number minus 1), "score": 0-10, "feedback": "2 sentences on this answer", "betterAnswer": "a concise example of a stronger answer (40-80 words), using the candidate's real skills or projects where possible"} ],
 "plan": [3 to 4 items: {"title": "Improve …", "action": "one concrete practice step", "skill": "the single skill name this targets, from the profile, or empty"}]
}`;
    try {
        const out = await call(prompt, { userId, kind: 'interview-evaluate', maxOutputTokens: 2400 });
        const s = out.scores || {};
        const scores = {
            communication: clamp(s.communication, 0, 100), technical: clamp(s.technical, 0, 100), answerQuality: clamp(s.answerQuality, 0, 100),
            problemSolving: clamp(s.problemSolving, 0, 100), confidence: clamp(s.confidence, 0, 100), relevance: clamp(s.relevance, 0, 100)
        };
        const byIndex = new Map((out.perQuestion || []).map((p) => [Number(p.index), p]));
        const perQuestion = answered.map((t) => {
            const p = byIndex.get(t.index) || {};
            return { index: t.index, score: clamp(p.score, 0, 10), feedback: String(p.feedback || 'No feedback returned for this answer.').slice(0, 600), betterAnswer: String(p.betterAnswer || '').slice(0, 900) };
        });
        return {
            overall: clamp(out.overall ?? Object.values(scores).reduce((a, b) => a + b, 0) / 6, 0, 100),
            scores,
            strengths: (out.strengths || []).map(String).slice(0, 4),
            improvements: (out.improvements || []).map(String).slice(0, 4),
            feedback: String(out.feedback || '').slice(0, 1200),
            perQuestion,
            plan: (out.plan || []).slice(0, 4).map((p) => ({ title: String(p.title || '').slice(0, 80), action: String(p.action || '').slice(0, 200), skill: String(p.skill || '').slice(0, 60) })),
            model: MODEL
        };
    } catch (err) {
        console.warn('[interview] evaluation fell back to the template interviewer:', err.message);
        return fallback();
    }
};

/* ── practice bank ────────────────────────────────────────────────────── */

const generateQuestions = async ({ context, userId }) => {
    const fallback = () => ({ questions: template.generateQuestions(context), topics: template.recommendTopics(context), model: 'template' });
    if (!configured()) return fallback();
    const prompt = `Create a personalised interview practice bank for this candidate${context.goal ? `, who wants to become a ${context.goal}` : ''}. Base every technical and project question on the profile's real skills, courses and projects; do not invent technologies.

PROFILE:
${profile(context)}

Answer ONLY with JSON: {"topics": [5-6 of {"topic": string, "reason": "why it matters for them, under 12 words"}], "questions": [18-24 of {"category": "hr"|"technical"|"project"|"behavioral"|"situational", "topic": string, "question": string, "hint": "how to answer well, one sentence", "difficulty": "easy"|"medium"|"hard"}]}
Mix: about 4 hr, 8-10 technical across their skills, 3-4 project, 3 behavioral, 2 situational.`;
    try {
        const out = await call(prompt, { userId, kind: 'interview-bank', maxOutputTokens: 3000 });
        const cats = ['hr', 'technical', 'project', 'behavioral', 'situational'];
        const questions = (out.questions || []).filter((q) => q && q.question && cats.includes(q.category)).slice(0, 24)
            .map((q, i) => ({ id: `${q.category}-${i + 1}`, category: q.category, topic: String(q.topic || '').slice(0, 60), question: String(q.question).slice(0, 400), hint: String(q.hint || '').slice(0, 300), difficulty: ['easy', 'medium', 'hard'].includes(q.difficulty) ? q.difficulty : 'medium' }));
        if (questions.length < 8) throw new Error('too few questions');
        const topics = (out.topics || []).slice(0, 6).map((t) => ({ topic: String(t.topic || '').slice(0, 60), reason: String(t.reason || '').slice(0, 120) }));
        return { questions, topics: topics.length ? topics : template.recommendTopics(context), model: MODEL };
    } catch (err) {
        console.warn('[interview] practice bank fell back to the template:', err.message);
        return fallback();
    }
};

module.exports = { nextQuestion, evaluate, generateQuestions, configured, MODEL };
