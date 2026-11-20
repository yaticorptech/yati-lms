/**
 * The department, semester and section a student asking to join an organization most likely belongs in, from what
 * their profile already says (2026-11-19, the user: "verify and fetch data from the profile like class, section … if
 * he didn't fill the section, give a drop down of the sections and classes present in that organization").
 *
 * In turn, the first that answers each:
 *   1. their own last admission at this organization (campusHistory, or the admission they still hold);
 *   2. their Career Path profile (CareerGoal: degree, specialization, current year, semester);
 *   3. the class an administrator set on their account (User.className, e.g. "BCA 2nd year A").
 * Only what matches the organization's own departments and sections is suggested; the rest the student chooses.
 * Read only.
 */
const User = require('../../models/User');

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const ordinal = (s) => { const m = String(s || '').match(/(\d+)\s*(?:st|nd|rd|th)?\s*(?:year|yr)/i) || String(s || '').match(/(?:year|yr)\s*(\d+)/i); return m ? Number(m[1]) : null; };
const semesterIn = (s) => { const m = String(s || '').match(/(?:sem(?:ester)?)\s*(\d{1,2})|(\d{1,2})\s*(?:st|nd|rd|th)?\s*sem/i); return m ? Number(m[1] || m[2]) : null; };
const sectionIn = (s) => { const m = String(s || '').match(/\b(?:sec(?:tion)?)\s*[-:]?\s*([A-Z0-9]{1,3})\b/i) || String(s || '').match(/\s([A-Z])\s*$/); return m ? m[1].toUpperCase() : ''; };

/** The department a piece of text names: its code or its whole name in it, best (longest) match first. */
const deptIn = (departments, ...texts) => {
    const hay = ` ${texts.map(norm).filter(Boolean).join(' ')} `;
    if (!hay.trim()) return null;
    let best = null; let score = 0;
    for (const d of departments) {
        for (const key of [d.code, d.name]) {
            const k = norm(key);
            if (k && hay.includes(` ${k} `) && k.length > score) { best = d; score = k.length; }
        }
    }
    return best;
};

const suggestJoin = async (userId, organizationId, departments) => {
    if (!departments?.length) return null;
    const out = { departmentId: '', semester: '', section: '', from: {} };
    const put = (field, value, from) => { if (value !== '' && value != null && !out[field]) { out[field] = value; out.from[field] = from; } };
    const deptOk = (id) => departments.find((d) => String(d._id) === String(id));
    const semOk = (d, n) => (d && Number.isInteger(n) && n >= 1 && n <= (d.semesters || 1) ? String(n) : '');
    const secOk = (d, s) => (d && s && (d.sections || []).map((x) => String(x).toUpperCase()).includes(String(s).toUpperCase()) ? (d.sections || []).find((x) => String(x).toUpperCase() === String(s).toUpperCase()) : '');

    const user = await User.findById(userId).select('+campus +campusHistory className organizationId').lean();
    // 1. Their own admission here, the newest.
    const mine = [...(user?.campusHistory || [])].filter((h) => String(h.organizationId) === String(organizationId))
        .sort((a, b) => new Date(b.archivedAt || b.endedAt || 0) - new Date(a.archivedAt || a.endedAt || 0));
    if (user?.campus?.departmentId && String(user.organizationId) === String(organizationId)) mine.unshift(user.campus);
    for (const h of mine) {
        const d = deptOk(h.departmentId);
        if (!d) continue;
        put('departmentId', String(d._id), 'your last admission here');
        put('semester', semOk(d, Number(h.semester)), 'your last admission here');
        put('section', secOk(d, h.section), 'your last admission here');
        break;
    }
    // 2. Career Path profile, 3. the class set on the account.
    const goal = await require('../../career/models/Goal').findOne({ userId }).select('degree specialization currentYear semester currentClass stream').lean().catch(() => null);
    const sources = [
        goal && { from: 'your Career Path profile', dept: [goal.degree, goal.specialization, goal.stream, goal.currentClass], sem: semesterIn(goal.semester) || (Number(goal.semester) || null), year: ordinal(goal.currentYear), sec: '' },
        user?.className && { from: 'your class on your account', dept: [user.className], sem: semesterIn(user.className), year: ordinal(user.className), sec: sectionIn(user.className) }
    ].filter(Boolean);
    for (const s of sources) {
        const d = out.departmentId ? deptOk(out.departmentId) : deptIn(departments, ...s.dept);
        if (!d) continue;
        put('departmentId', String(d._id), s.from);
        // A year, as its first semester: "2nd year" is semester 3.
        put('semester', semOk(d, s.sem || (s.year ? s.year * 2 - 1 : null)), s.from);
        put('section', secOk(d, s.sec), s.from);
    }
    // One section only: that one.
    const d = deptOk(out.departmentId);
    if (d && !out.section && (d.sections || []).length === 1) put('section', d.sections[0], 'the only section');
    return out.departmentId ? out : null;
};

/** A class's name, bare: "Class 9", "9th", "Std 9" → "9"; "1st PUC" → "1 puc". */
const bare = (x) => norm(x).replace(/\b(class|std|standard|grade)\b/g, ' ').replace(/\b(\d+)(st|nd|rd|th)\b/g, '$1').replace(/\s+/g, ' ').trim();
const sameClass = (a, b) => Boolean(bare(a)) && bare(a) === bare(b);

/** Before a student leaves or is removed: their class there, kept so joining again fills it in. */
const rememberClass = async (userId, organizationId) => {
    const u = await User.findById(userId).select('orgClassId').lean();
    if (!u?.orgClassId) return;
    const org = await require('../models/Organization').findById(organizationId).select('campus.classes').lean();
    const c = (org?.campus?.classes || []).find((x) => String(x._id) === String(u.orgClassId));
    if (c) await User.updateOne({ _id: userId }, { $set: { lastOrgClass: { organizationId, name: c.name, section: c.section || '' } } });
};

/**
 * The class (Organization.campus.classes, 2026-11-19) a student asking to join is most likely in: their class there
 * before (User.lastOrgClass), else their Career Path profile's class or degree, else the class set on their account;
 * the section from that, the class name on the account ("9 A"), or the class's only section. { classId, name, from }.
 */
const suggestClass = async (userId, organizationId, classes) => {
    if (!classes?.length) return null;
    const user = await User.findById(userId).select('className lastOrgClass').lean();
    const goal = await require('../../career/models/Goal').findOne({ userId }).select('currentClass degree').lean().catch(() => null);
    const names = [...new Set(classes.map((c) => c.name))];
    let name = ''; let section = ''; let from = '';
    const last = user?.lastOrgClass;
    if (last && String(last.organizationId) === String(organizationId)) {
        name = names.find((n) => sameClass(n, last.name)) || ''; section = last.section || ''; from = 'your class here before';
    }
    for (const [text, src] of [[goal?.currentClass, 'your Career Path profile'], [goal?.degree, 'your Career Path profile'], [user?.className, 'your class on your account']]) {
        if (name || !text) continue;
        name = names.find((n) => sameClass(n, text)) || '';
        if (name) from = src;
    }
    if (!name) return null;
    const sections = classes.filter((c) => c.name === name);
    if (!section) section = sectionIn(user?.className) || '';
    const hit = sections.find((c) => (c.section || '').toUpperCase() === String(section).toUpperCase()) || (sections.length === 1 ? sections[0] : null);
    return { name, classId: hit ? String(hit._id) : '', from, sectionFrom: hit ? (sections.length === 1 && !section ? 'the only section' : from) : '' };
};

module.exports = { suggestJoin, suggestClass, rememberClass, deptIn, sectionIn, semesterIn, ordinal };
