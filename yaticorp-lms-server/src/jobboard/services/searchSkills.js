/**
 * The skills a job search runs on — for the demo cards (services/fullAccess.js)
 * only; every other student's search runs on what was sent, as it always has.
 *
 * What the student typed (or the page filled in for them), each entry opened
 * out into the skills it names: Career Path writes its skills the way a
 * syllabus does — "HTML5 / CSS3 / Tailwind CSS" — and a listing asks for
 * "HTML". A plain skill stays itself.
 *
 * When nothing was given, the student's own skills stand in: what their
 * uploaded resume says, their Career Path roadmap's skills, and what the
 * courses here taught them (jobsProfileFor below).
 */
const { expandSkillPhrase, normalizeSkillList } = require('./matchService');
const { hasFullAccess } = require('../../services/fullAccess');

/**
 * Several skill lists made into one, taking from each in turn, so a long list
 * from one place cannot crowd the others out. Case-insensitive duplicates
 * keep their first spelling.
 */
const interleave = (lists, cap = 30) => {
    const out = [];
    const seen = new Set();
    const queues = lists.map((l) => [...(l || [])]);
    while (out.length < cap && queues.some((q) => q.length)) {
        for (const q of queues) {
            while (q.length) {
                const s = String(q.shift() || '').trim();
                if (s && !seen.has(s.toLowerCase())) { seen.add(s.toLowerCase()); out.push(s); break; }
            }
            if (out.length >= cap) break;
        }
    }
    return out;
};

/** The target role the student set in Career Path, or ''. */
const targetRoleFor = async (user) => {
    if (!user?._id) return '';
    const CareerGoal = require('../../career/models/Goal');
    const goal = await CareerGoal.findOne({ userId: user._id }).select('careerGoal').lean().catch(() => null);
    return String(goal?.careerGoal || '').trim();
};

/**
 * What the Jobs section starts from for a demo card: the target role from
 * Career Path, and the skills — every skill on the role's roadmap, started or
 * not (a demo card shows what the role asks for; most have not begun it),
 * opened out into the skills a listing names, with the uploaded resume's and
 * the courses', each source in turn, up to 30.
 * @returns {Promise<{ role: string, skills: string[], sources: { resume: string[], career: string[], course: string[] } }>}
 */
const jobsProfileFor = async (user) => {
    const empty = { role: '', skills: [], sources: { resume: [], career: [], course: [] } };
    if (!user?._id) return empty;
    const SkillProgress = require('../../career/models/SkillProgress');
    const ResumeProfile = require('../models/ResumeProfile');
    const { buildResumeData } = require('../../services/atsResumeService');
    const [role, rows, resume, ats] = await Promise.all([
        targetRoleFor(user),
        SkillProgress.find({ userId: user._id }).select('skillName progress').sort({ progress: -1 }).lean().catch(() => []),
        ResumeProfile.findOne({ userId: user._id }).select('skills').lean().catch(() => null),
        buildResumeData(user._id).catch(() => null)
    ]);
    const career = normalizeSkillList(rows.flatMap((r) => expandSkillPhrase(r.skillName)));
    const resumeSkills = normalizeSkillList(resume?.skills || []);
    const course = (ats?.skills || []).filter((s) => (s.sources || []).includes('course')).map((s) => s.name);
    return { role, skills: interleave([resumeSkills, career, course]), sources: { resume: resumeSkills, career, course } };
};

/** Typed skills, opened out and cleaned. */
const openOut = (raw) => normalizeSkillList(
    (Array.isArray(raw) ? raw : String(raw || '').split(',')).flatMap((s) => expandSkillPhrase(s))
);

/**
 * @param {string[]|string} raw  the search's skills, as sent
 * @param {object} [user]        the signed-in student (req.user)
 * @returns {Promise<{ skills: string[], fromProfile: boolean }>}
 */
const searchSkills = async (raw, user) => {
    if (!hasFullAccess(user)) {
        return { skills: normalizeSkillList(Array.isArray(raw) ? raw : String(raw || '').split(',')), fromProfile: false };
    }
    const skills = openOut(raw);
    if (skills.length || !user?._id) return { skills, fromProfile: false };
    try {
        const { skills: own } = await jobsProfileFor(user);
        return { skills: own, fromProfile: own.length > 0 };
    } catch (err) {
        console.warn('[jobs] profile skills unavailable:', err.message);
        return { skills: [], fromProfile: false };
    }
};

module.exports = { searchSkills, openOut, jobsProfileFor, targetRoleFor, interleave };
