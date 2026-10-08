/**
 * Who may open the Jobs section, and who may open it before they have earned it.
 *
 * The rule (the account owner's, 2026-10-02): the section opens once at least
 * five of the student's Career Path skills are each at 25% or more. It used to
 * be a quarter of the way through their enrolled courses. A short list of
 * accounts is exempt — the people building and demonstrating the product
 * (both Bhagyashree accounts and Yaticorp), who carry the flag below.
 *
 * This lives on the server, keyed to the account, for two reasons the previous
 * arrangement got wrong. It was a build-time flag (VITE_JOBS_GATE_BYPASS) baked
 * into whatever machine ran the dev server: every account that signed in on
 * that machine got Jobs, and the same account got nothing on any other machine.
 * Access belongs to a person, not to a computer.
 *
 * The account's own `jobsAlwaysOpen` field is the real switch. JOBS_ALWAYS_OPEN
 * in .env is a convenience on top of it: a comma-separated list matched,
 * case-insensitively, against the account's name, email or card number:
 *
 *   JOBS_ALWAYS_OPEN=Yaticorp,Bhagyashree
 *   JOBS_ALWAYS_OPEN=yati@example.com,YC-1029
 *
 * Unset or empty means nobody is exempt, which is the right default for
 * production: the progress rule then applies to everyone.
 */

/** The list as written in the environment, lowercased and trimmed. */
const allowList = () => String(process.env.JOBS_ALWAYS_OPEN || '')
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);

/**
 * Is this account exempt from the progress rule?
 * @param {{name?: string, email?: string, cardNumber?: string}} user
 */
const jobsAlwaysOpen = (user) => {
    if (!user) return false;
    // The demo cards see everything (services/fullAccess.js).
    if (require('./fullAccess').hasFullAccess(user)) return true;
    // The account's own flag comes first: it lives in the database, so it
    // travels with the card to any machine and any server pointed at that
    // database. The environment list below is only a convenience for setting
    // accounts up, and a server without it changes nothing.
    if (user.jobsAlwaysOpen === true) return true;

    const list = allowList();
    if (!list.length) return false;
    // Name, email and card number are all accepted so the list can be written
    // with whichever of them the person running it actually knows.
    const mine = [user.name, user.email, user.cardNumber]
        .map((v) => String(v || '').trim().toLowerCase())
        .filter(Boolean);
    return mine.some((value) => list.includes(value));
};

/** The rule: at least SKILLS_REQUIRED Career Path skills, each at SKILL_PERCENT or more. */
const SKILLS_REQUIRED = 5;
const SKILL_PERCENT = 25;

/**
 * Whether this account may open the Jobs section, with what the locked page
 * needs to say how far along the student is.
 *
 * Skills come from the Career Path tracker, highest first. A skill stored
 * twice under different capitalisation counts once, at its better figure —
 * the tracker has drifted that way before (see SkillProgress.MAX_TRACKED).
 * @returns {Promise<{open: boolean, alwaysOpen: boolean, ready: number,
 *   required: {skills: number, percent: number}, skills: {name: string, progress: number}[]}>}
 */
const jobsAccessFor = async (user) => {
    const SkillProgress = require('../career/models/SkillProgress');
    const rows = user?._id ? await SkillProgress.find({ userId: user._id }).select('skillName progress').lean() : [];
    const best = new Map();
    for (const r of rows) {
        const name = String(r.skillName || '').trim();
        if (!name) continue;
        const progress = Math.max(0, Math.min(100, Math.round(Number(r.progress) || 0)));
        const key = name.toLowerCase();
        if (!best.has(key) || best.get(key).progress < progress) best.set(key, { name, progress });
    }
    const skills = [...best.values()].sort((a, b) => b.progress - a.progress || a.name.localeCompare(b.name));
    const ready = skills.filter((s) => s.progress >= SKILL_PERCENT).length;
    const alwaysOpen = jobsAlwaysOpen(user);
    return {
        open: alwaysOpen || ready >= SKILLS_REQUIRED,
        alwaysOpen,
        // One of the demo cards (services/fullAccess.js): the Jobs section
        // reads their skills from Career Path and their resume in full.
        fullAccess: require('./fullAccess').hasFullAccess(user),
        ready,
        required: { skills: SKILLS_REQUIRED, percent: SKILL_PERCENT },
        skills
    };
};

module.exports = { jobsAlwaysOpen, allowList, jobsAccessFor, SKILLS_REQUIRED, SKILL_PERCENT };
