/**
 * Interview Readiness: one number and five parts, from what the LMS knows.
 *
 *   Technical        skills by evidence-backed status, blended with quiz scores
 *   Problem solving  assessments passed, projects built, and past interview scores
 *   Communication    past interviews' communication score; a modest default before any
 *   Confidence       past interviews' confidence score; a modest default before any
 *   Practice         questions practised and mock interviews completed
 *
 * Interview scores count for more the more recent they are, so improvement
 * shows up quickly.
 */
const { InterviewSession, InterviewPrep } = require('./models');

const STATUS_SCORE = { Advanced: 100, Proficient: 75, Developing: 50, Learning: 25 };
const clamp = (n) => Math.max(0, Math.min(100, Math.round(n)));

/** Weighted mean of the last three interviews' score for one dimension. */
const recentScore = (sessions, key) => {
    const rows = sessions.filter((s) => s.report?.scores?.[key] != null).slice(0, 3);
    if (!rows.length) return null;
    const weights = [3, 2, 1];
    let sum = 0, w = 0;
    rows.forEach((s, i) => { sum += s.report.scores[key] * weights[i]; w += weights[i]; });
    return sum / w;
};

const readiness = async (userId, context) => {
    const [sessions, prep] = await Promise.all([
        InterviewSession.find({ userId, status: 'completed' }).sort({ completedAt: -1 }).select('report type completedAt').lean(),
        InterviewPrep.findOne({ userId }).select('practiced questions').lean()
    ]);
    const skills = context.skills.slice(0, 10);
    const skillScore = skills.length ? skills.reduce((a, s) => a + STATUS_SCORE[s.status], 0) / skills.length : 0;
    const quiz = context.assessments.averageScore;
    const technical = clamp(quiz != null ? skillScore * 0.7 + quiz * 0.3 : skillScore * 0.9);

    const evidence = clamp(Math.min(100, context.assessments.passed * 12 + context.projects.length * 15));
    const psInterview = recentScore(sessions, 'problemSolving');
    const problemSolving = clamp(psInterview != null ? evidence * 0.4 + psInterview * 0.6 : evidence * 0.8);

    const comm = recentScore(sessions, 'communication');
    const communication = clamp(comm != null ? comm : 55 + (context.projects.length ? 5 : 0) + (context.completedCourses.length ? 5 : 0));
    const conf = recentScore(sessions, 'confidence');
    const confidence = clamp(conf != null ? conf : 50 + Math.min(10, context.strongSkills.length * 3));

    const practicedCount = prep?.practiced?.length || 0;
    const practice = clamp(Math.min(100, practicedCount * 4 + sessions.length * 25));

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
        practice: 'Practise a few questions a day and take a mock interview this week.'
    }[b.key]));
    // The last report's own improvement notes come first: they are specific.
    const lastReport = sessions[0]?.report;
    const areas = [...(lastReport?.improvements || []).slice(0, 2), ...improvements].slice(0, 4);

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
