/**
 * Interview Readiness: one number and five parts, from how the student does
 * in their mock interviews — and nothing before the first one (the account
 * owner's rule, 2026-10-08). It used to start from guesses: communication and
 * confidence at 50–60% before a single answer, and technical skill and
 * problem solving from courses and projects, so a student who had never been
 * interviewed was already a fifth of the way to "ready".
 *
 *   Communication    the interviews' communication score
 *   Technical        the interviews' technical score
 *   Problem solving  the interviews' problem-solving score
 *   Confidence       the interviews' confidence score
 *   Practice         questions practised and mock interviews completed
 *
 * Every part is 0 until a mock interview has been completed and scored; from
 * then on each follows the last three interviews, the most recent counting
 * most, so improvement shows up quickly. A report without one of the scores
 * stands in with its overall score.
 */
const { InterviewSession, InterviewPrep } = require('./models');

const clamp = (n) => Math.max(0, Math.min(100, Math.round(n)));
const WEIGHTS = [3, 2, 1];

/** Weighted mean of the last three interviews' figure, or null when none has it. */
const recentMean = (sessions, pick) => {
    const rows = sessions.map(pick).filter((v) => v != null && Number.isFinite(Number(v))).slice(0, 3);
    if (!rows.length) return null;
    let sum = 0, w = 0;
    rows.forEach((v, i) => { sum += Number(v) * WEIGHTS[i]; w += WEIGHTS[i]; });
    return sum / w;
};

/** One dimension from the interviews; the report's overall where it lacks that score. */
const fromInterviews = (sessions, key) =>
    recentMean(sessions, (s) => s.report?.scores?.[key]) ?? recentMean(sessions, (s) => s.report?.overall) ?? 0;

const readiness = async (userId, context) => {
    const [sessions, prep] = await Promise.all([
        InterviewSession.find({ userId, status: 'completed' }).sort({ completedAt: -1 }).select('report type completedAt').lean(),
        InterviewPrep.findOne({ userId }).select('practiced questions').lean()
    ]);
    // Only an interview that was scored counts.
    const scored = sessions.filter((s) => s.report && (s.report.overall != null || s.report.scores));
    const interviewed = scored.length > 0;

    const communication = interviewed ? clamp(fromInterviews(scored, 'communication')) : 0;
    const technical = interviewed ? clamp(fromInterviews(scored, 'technical')) : 0;
    const problemSolving = interviewed ? clamp(fromInterviews(scored, 'problemSolving')) : 0;
    const confidence = interviewed ? clamp(fromInterviews(scored, 'confidence')) : 0;

    const practicedCount = prep?.practiced?.length || 0;
    const practice = interviewed ? clamp(Math.min(100, practicedCount * 4 + sessions.length * 25)) : 0;

    const overall = clamp(technical * 0.3 + communication * 0.2 + problemSolving * 0.2 + confidence * 0.15 + practice * 0.15);

    const breakdown = [
        { key: 'communication', label: 'Communication', value: communication },
        { key: 'technical', label: 'Technical Skills', value: technical },
        { key: 'problemSolving', label: 'Problem Solving', value: problemSolving },
        { key: 'confidence', label: 'Confidence', value: confidence },
        { key: 'practice', label: 'Interview Practice', value: practice }
    ];
    const weakest = [...breakdown].sort((a, b) => a.value - b.value).slice(0, 2);
    const improvements = weakest.map((b) => ({
        communication: 'Practise answering out loud with a clear structure: situation, action, result.',
        technical: `Deepen ${context.learningSkills[0] || 'your core skills'} with the practice questions and a course.`,
        problemSolving: 'Walk through problems step by step — practise the situational questions.',
        confidence: 'Take a mock interview: confidence grows with every one you complete.',
        practice: 'Take a mock interview this week — every one you finish lifts this score.'
    }[b.key]));
    // The last report's own improvement notes come first: they are specific.
    // Before any interview there is one thing to do.
    const lastReport = sessions[0]?.report;
    const areas = interviewed
        ? [...(lastReport?.improvements || []).slice(0, 2), ...improvements].slice(0, 4)
        : ['Take your first mock interview: your readiness is worked out from how you do in it.'];

    return {
        overall, breakdown,
        prep: { practiced: practicedCount, total: prep?.questions?.length || 0, mocks: sessions.length },
        history: sessions.slice(0, 10).map((s) => ({ id: String(s._id), type: s.type, score: s.report?.overall ?? null, date: s.completedAt })).reverse(),
        best: sessions.reduce((m, s) => Math.max(m, s.report?.overall ?? 0), 0),
        areas,
        badge: { threshold: 75, earned: overall >= 75 }
    };
};

module.exports = { readiness };
