/**
 * Profile Strength: how complete the evidence behind the bio is, as a
 * percentage, and what would raise it. Each area has a weight and a target;
 * partial credit is proportional, so one more project moves the number
 * rather than nothing happening until a threshold.
 */
const AREAS = [
    { key: 'profile', label: 'Basic profile', weight: 8, target: 2, hint: 'Add a profile photo to complete your basic profile.' },
    { key: 'education', label: 'Education', weight: 8, target: 1, hint: 'Complete Career Path onboarding to add your education.' },
    { key: 'courses', label: 'Courses', weight: 18, target: 3, hint: (n) => `Complete ${n} more course${n === 1 ? '' : 's'} to strengthen your profile.` },
    { key: 'skills', label: 'Skills', weight: 16, target: 5, hint: (n) => `Develop ${n} more skill${n === 1 ? '' : 's'} through courses or your roadmap.` },
    { key: 'assessments', label: 'Assessments', weight: 10, target: 3, hint: (n) => `Pass ${n} more quiz${n === 1 ? '' : 'zes'} to verify your skills.` },
    { key: 'projects', label: 'Projects', weight: 12, target: 2, hint: (n) => `Add ${n} more project${n === 1 ? '' : 's'} to strengthen your profile.` },
    { key: 'certificates', label: 'Certificates', weight: 10, target: 2, hint: (n) => `Earn ${n} more certificate${n === 1 ? '' : 's'} by finishing courses.` },
    { key: 'achievements', label: 'Achievements', weight: 8, target: 3, hint: (n) => `Unlock ${n} more achievement${n === 1 ? '' : 's'} — streaks and quizzes count.` },
    { key: 'interests', label: 'Interests', weight: 5, target: 2, hint: 'Add your learning interests.' },
    { key: 'goal', label: 'Learning goal', weight: 5, target: 1, hint: 'Set a career or learning goal in Career Path.' }
];

/** The evidence needed before an AI bio is written at all. */
const READY = [
    { key: 'courses', label: 'Courses', need: 1 },
    { key: 'skills', label: 'Skills', need: 3 },
    { key: 'evidence', label: 'Quizzes or projects', need: 1 }
];

const counts = (data, interests) => ({
    profile: (data.user.name ? 1 : 0) + (data.user.avatar ? 1 : 0),
    education: data.education.length ? 1 : 0,
    courses: data.courses.completed.length,
    skills: data.skills.length,
    assessments: data.assessments.passed,
    projects: data.projects.length,
    certificates: data.certificates.length,
    achievements: data.achievements.length,
    interests: interests.length,
    goal: data.learningGoal ? 1 : 0,
    evidence: data.assessments.passed + data.projects.length
});

const strength = (data, interests) => {
    const have = counts(data, interests);
    let total = 0;
    const areas = AREAS.map((a) => {
        const ratio = Math.min(1, (have[a.key] || 0) / a.target);
        total += ratio * a.weight;
        const missing = Math.max(0, a.target - (have[a.key] || 0));
        return { key: a.key, label: a.label, have: have[a.key] || 0, target: a.target, percent: Math.round(ratio * 100), missing, hint: missing ? (typeof a.hint === 'function' ? a.hint(missing) : a.hint) : '' };
    });
    // The most valuable next step: the biggest weight still unfilled.
    const next = areas.filter((a) => a.missing).sort((a, b) => (AREAS.find((x) => x.key === b.key).weight * (1 - b.percent / 100)) - (AREAS.find((x) => x.key === a.key).weight * (1 - a.percent / 100)))[0] || null;
    const readiness = READY.map((r) => ({ key: r.key, label: r.label, have: Math.min(have[r.key] || 0, r.need), need: r.need }));
    return {
        percent: Math.round(total),
        areas,
        nextStep: next ? next.hint : 'Your profile is complete — keep learning to keep it fresh.',
        // The bio is always written from whatever the student has — resume,
        // certificates, roadmap, courses. `readiness` only informs the score.
        ready: true,
        readiness
    };
};

module.exports = { strength, AREAS, READY };
