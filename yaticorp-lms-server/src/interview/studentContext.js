/**
 * What the interviewer knows about the student: the same learning data the
 * Learning Bio is written from, cut down to what an interviewer would read
 * before a candidate walks in.
 */
const { collect } = require('../learningbio/learningDataService');

const buildContext = async (userId) => {
    const d = await collect(userId);
    if (!d) return null;
    // Skills most worth asking about first: the roadmap's (they point at the
    // goal), then the courses', then the resume's — and stronger before weaker
    // within each. Without this an alphabetical resume puts Adobe tools ahead
    // of React for a would-be full-stack developer.
    const RANK = { career: 0, course: 1, resume: 2 };
    const STRENGTH = { Advanced: 0, Proficient: 1, Developing: 2, Learning: 3 };
    const skills = [...d.skills]
        .sort((a, b) => Math.min(...a.sources.map((x) => RANK[x] ?? 3)) - Math.min(...b.sources.map((x) => RANK[x] ?? 3)) || STRENGTH[a.status] - STRENGTH[b.status])
        .slice(0, 16).map((s) => ({ name: s.name, status: s.status, sources: s.sources }));
    return {
        name: d.user.name,
        firstName: d.user.name.split(' ')[0],
        audience: d.audience,
        education: d.education.map((e) => e.title).filter(Boolean),
        experience: d.experience.map((e) => e.title).filter(Boolean),
        goal: d.learningGoal,
        headline: d.headlineHint,
        skills,
        strongSkills: skills.filter((s) => ['Advanced', 'Proficient'].includes(s.status)).map((s) => s.name),
        learningSkills: skills.filter((s) => ['Developing', 'Learning'].includes(s.status)).map((s) => s.name),
        completedCourses: d.courses.completed.map((c) => c.title),
        ongoingCourses: d.courses.ongoing.map((c) => c.title),
        assessments: { passed: d.assessments.passed, averageScore: d.assessments.averageScore },
        projects: d.projects.slice(0, 6).map((p) => ({ name: p.name, description: p.description, skills: p.skills })),
        certificates: d.certificates.map((c) => c.title),
        interests: d.interestsAuto.map((i) => i.label),
        hash: d.hash
    };
};

module.exports = { buildContext };
