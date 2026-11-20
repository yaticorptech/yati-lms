/**
 * @description The other dashboards a demo (presentation) card opens (2026-11-19).
 *
 * A demo card's scan used to open the student dashboard only. It now offers every dashboard the
 * product has — student, teacher, organisation (parents is yet to be built) — so one card shows
 * the whole platform:
 *
 *   - Teacher: each demo card has its own demo teacher (Teacher.demoCard), made the first time
 *     it is asked for. It has the research tools without an AI card of its own (the card is the
 *     student's), and belongs to the demo organisation, so 360 and Scouts & Guides show too —
 *     and it works as a head of department there, so the Department (HOD) menu shows
 *     (campus/orgAdmin.js demoDepartment).
 *   - Organisation: one demo organisation shared by every demo card, with a demo administrator
 *     whose password nobody knows — the only way in is the hand-over below.
 *
 * The demo organisation (2026-11-19, the owner: "all demo accounts link to Swastika, or an account
 * with all the organisation's details completed"): the organisation whose ID is DEMO_ORG_CODE in
 * the environment — Swastika National Business School unless set — when it exists and is active;
 * otherwise a built-in one, made on first use with every detail filled in. Every demo account
 * belongs to it: the demo students (linkStudent, on each scan) and the demo teachers.
 *
 * Inside any dashboard the presenter can change to another (the owner, the same day): the scan
 * gives a twelve-hour switch pass for the card (switchPass), and POST /api/auth/demo/open trades
 * it for whichever dashboard is asked for (routes/demoDashboardRoutes.js).
 */
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Admin = require('../models/Admin');
const Organization = require('../organizations/models/Organization');
const { Teacher } = require('../teacher/models');
const { normaliseCardNumber } = require('../utils/cardNumber');

// The built-in demo organisation, used only when the chosen one is not in this database.
const DEMO_ORG_CODE = 'demo_institute';
const DEMO_ORG_EMAIL = 'demo.institute@demo.yaticorp.in';
const DEMO_ORG_NAME = 'YATICORPX3 Demo Institute';
const BUILT_IN_DETAILS = {
    contactPerson: 'Demo Administrator', phone: '0000000000', website: 'https://www.yaticorp.com',
    address: 'YATICORPX3 Demo Campus, Mangaluru, Karnataka', state: 'Karnataka', expectedStudents: 500
};
/** The organisation the demo accounts belong to, by its ID. */
const chosenOrgCode = () => String(process.env.DEMO_ORG_CODE || 'swastika_national_school').trim();
/** The demo administrator's sign-in in an organisation: never a real person's address. */
const demoAdminEmail = (orgCode) => (orgCode === DEMO_ORG_CODE ? DEMO_ORG_EMAIL : `demo.${String(orgCode).toLowerCase().replace(/[^a-z0-9._-]/g, '')}@demo.yaticorp.in`);
const isDemoAdmin = (admin) => !!admin && admin.role === 'orgadmin' && /^demo\.[^@]+@demo\.yaticorp\.in$/.test(String(admin.email || ''));
/** The dashboards a demo card opens, in the order the chooser shows them. */
const DASHBOARDS = [
    { id: 'student', label: 'Student', ready: true },
    { id: 'teacher', label: 'Teacher', ready: true },
    { id: 'organization', label: 'Organisation', ready: true },
    { id: 'parent', label: 'Parents', ready: false }
];

// Never told to anyone: nothing signs in with it.
const unusedPassword = () => `${crypto.randomBytes(24).toString('base64url')}Aa1!`;
const duplicate = (error) => error?.code === 11000;

/** The chosen organisation when this database has it, active; null otherwise. */
const chosenOrganization = () => Organization.findOne({ orgCode: chosenOrgCode(), status: 'active' });

/** The built-in demo organisation, made on first use with every detail filled in. */
const builtInOrganization = async () => {
    let organization = await Organization.findOne({ orgCode: DEMO_ORG_CODE });
    // One made under the old name takes the new one (2026-11-20, the brand is YATICORPX3).
    if (organization && organization.name === 'YATICORP Demo Institute') {
        await Organization.updateOne({ _id: organization._id }, { $set: { name: DEMO_ORG_NAME, address: BUILT_IN_DETAILS.address } });
        organization.name = DEMO_ORG_NAME;
    }
    if (!organization) {
        try {
            organization = await Organization.create({
                orgCode: DEMO_ORG_CODE,
                name: DEMO_ORG_NAME,
                organizationType: 'college',
                email: DEMO_ORG_EMAIL,
                ...BUILT_IN_DETAILS,
                status: 'active',
                approvedAt: new Date(),
                statusHistory: [{ status: 'active', reason: 'Made for the demo cards', at: new Date() }],
                // A presentation shows everything an organisation can be given.
                courseAccess: { enabled: true, limit: 5 },
                canHostCompetitions: true,
                campusAllowed: true
            });
        } catch (error) {
            // Two scans at once: the other one made it.
            if (!duplicate(error)) throw error;
            organization = await Organization.findOne({ orgCode: DEMO_ORG_CODE });
        }
    }
    // One made before its details were filled in (2026-11-19) gets them now; nothing typed since is replaced.
    const missing = Object.fromEntries(Object.entries(BUILT_IN_DETAILS).filter(([k]) => organization[k] == null || organization[k] === ''));
    if (!organization.campusAllowed) missing.campusAllowed = true;
    if (Object.keys(missing).length) {
        await Organization.updateOne({ _id: organization._id }, { $set: missing });
        Object.assign(organization, missing);
    }
    // A department to show Campus with, and for the demo teachers to head (campus/orgAdmin.js demoDepartment).
    // (Campus is not read with the organisation: asked for by itself.)
    const campus = require('../campus/core');
    if (!(await campus.loadCampus(organization._id)).campus.departments.length) {
        await campus.pushItem(organization._id, 'departments', { name: 'Computer Science', code: 'CS', semesters: 6, sections: ['A'], head: '' });
    }
    return organization;
};

/** The demo organisation and its demo administrator (made on first use). */
const ensureOrganization = async () => {
    const organization = await chosenOrganization() || await builtInOrganization();
    const email = demoAdminEmail(organization.orgCode);
    const mine = { role: 'orgadmin', organizationId: organization._id, email };
    let admin = await Admin.findOne(mine);
    if (!admin) {
        try {
            admin = await Admin.create({ name: 'Demo Administrator', email, password: unusedPassword(), role: 'orgadmin', organizationId: organization._id });
        } catch (error) {
            if (!duplicate(error)) throw error;
            admin = await Admin.findOne(mine);
        }
    }
    return { organization, admin };
};

/**
 * A demo student belongs to the demo organisation: brought in when it has none, or is still in
 * the built-in one while another is chosen. One a presenter moved to some other organisation is
 * left there. Never throws: the sign-in stands either way.
 */
const linkStudent = async (user) => {
    try {
        if (!user?._id) return null;
        const { organization } = await ensureOrganization();
        if (String(user.organizationId || '') === String(organization._id)) return organization;
        const builtIn = organization.orgCode === DEMO_ORG_CODE ? null : await Organization.findOne({ orgCode: DEMO_ORG_CODE }).select('_id').lean();
        const from = [null, ...(builtIn ? [builtIn._id] : [])];
        const User = require('../models/User');
        const joined = await User.updateOne({ _id: user._id, organizationId: { $in: from } }, { $set: { organizationId: organization._id, organizationJoinedAt: new Date() } });
        if (joined.modifiedCount) { user.organizationId = organization._id; return organization; }
        return null;
    } catch (error) {
        console.error('[demo-cards] could not link the student to the demo organisation:', error.message);
        return null;
    }
};

/** The demo teacher of a demo card, made on first use and kept in the demo organisation. */
const ensureTeacher = async (cardNumber) => {
    const n = normaliseCardNumber(cardNumber);
    if (!n) return null;
    const { organization } = await ensureOrganization();
    const existing = await Teacher.findOne({ demoCard: n });
    if (existing) {
        // A demo teacher is the demo organisation's, whichever organisation that now is.
        if (String(existing.organizationId || '') !== String(organization._id)) {
            existing.organizationId = organization._id;
            existing.organizationJoinedAt = new Date();
            existing.institution = organization.name;
            await Teacher.updateOne({ _id: existing._id }, { $set: { organizationId: organization._id, organizationJoinedAt: existing.organizationJoinedAt, institution: organization.name } });
        }
        return existing;
    }
    try {
        return await Teacher.create({
            name: `Demo Teacher ${n.slice(-4)}`,
            email: `demo.teacher.${n}@demo.yaticorp.in`,
            // Its own number, as every teacher needs — and one no real mobile can have (they start 6–9).
            phone: `00${n.slice(-8).padStart(8, '0')}`,
            password: unusedPassword(),
            status: 'active',
            createdBy: 'admin',
            demoCard: n,
            organizationId: organization._id,
            organizationJoinedAt: new Date(),
            institution: organization.name,
            department: 'Computer Science',
            designation: 'Assistant Professor',
            researchArea: 'Artificial Intelligence in Education',
            mentor360: true,
            scouts: true
        });
    } catch (error) {
        if (!duplicate(error)) throw error;
        return Teacher.findOne({ demoCard: n });
    }
};

/** The demo teachers of these cards, by card number (for the admin's list). */
const teachersFor = async (numbers) => {
    const rows = await Teacher.find({ demoCard: { $in: numbers } }).select('name demoCard lastLoginAt loginCount').lean();
    return new Map(rows.map((t) => [t.demoCard, { id: t._id, name: t.name, lastLoginAt: t.lastLoginAt || null, loginCount: t.loginCount || 0 }]));
};

/** The demo organisation as the admin's Demo cards page shows it; null until it is first opened. */
const organizationSummary = async () => {
    const organization = await Organization.findOne({ orgCode: chosenOrgCode(), status: 'active' }).select('name orgCode status').lean()
        || await Organization.findOne({ orgCode: DEMO_ORG_CODE }).select('name orgCode status').lean();
    if (!organization) return null;
    const User = require('../models/User');
    const [students, teachers] = await Promise.all([
        User.countDocuments({ organizationId: organization._id }),
        Teacher.countDocuments({ organizationId: organization._id })
    ]);
    return { name: organization.name, orgCode: organization.orgCode, status: organization.status, students, teachers, builtIn: organization.orgCode === DEMO_ORG_CODE };
};

// Never emptied by a teacher's reset: the accounts themselves and the platform's own records.
const KEEP = new Set(['User', 'Card', 'Admin', 'Organization', 'Teacher', 'AdminAuditLog', 'OrgAuditLog']);

/**
 * A card's reset reaches its demo teacher too: everything the teacher did is deleted — from every
 * collection that points at a teacher — and the account goes with it, made new on the next open.
 */
const resetTeacher = async (cardNumber) => {
    const teacher = await Teacher.findOne({ demoCard: normaliseCardNumber(cardNumber) }).select('_id').lean();
    if (!teacher) return { removed: 0 };
    let removed = 0;
    for (const name of mongoose.modelNames()) {
        if (KEEP.has(name)) continue;
        const model = mongoose.model(name);
        const paths = [];
        model.schema.eachPath((path, type) => {
            if (type.instance === 'ObjectId' && (type.options?.ref === 'Teacher' || /^(teacherId|teacher)$/.test(path.split('.').pop()))) paths.push(path);
        });
        if (!paths.length) continue;
        try {
            const r = await model.deleteMany({ $or: paths.map((p) => ({ [p]: teacher._id })) });
            removed += r.deletedCount || 0;
        } catch (e) {
            console.error(`[demo-cards] teacher reset ${name} failed:`, e.message);
        }
    }
    await Teacher.deleteOne({ _id: teacher._id });
    return { removed };
};

/* ── The hand-over to the organisation panel (another app, another address) ── */

const HANDOVER = 'demo-organization';
/** A two-minute pass for the admin app to trade for the demo organisation's session. Not a session itself. */
const organizationPass = (admin, cardNumber) => jwt.sign(
    { purpose: HANDOVER, demoOrgAdmin: String(admin._id), card: normaliseCardNumber(cardNumber) },
    process.env.JWT_SECRET,
    { expiresIn: '2m' }
);
/** The demo organisation's administrator a pass names, or null for anything else. */
const adminForPass = async (pass) => {
    try {
        const decoded = jwt.verify(String(pass || ''), process.env.JWT_SECRET);
        if (decoded.purpose !== HANDOVER || !decoded.demoOrgAdmin) return null;
        const admin = await Admin.findById(decoded.demoOrgAdmin);
        if (!isDemoAdmin(admin)) return null;
        admin.demoCard = decoded.card || '';
        return admin;
    } catch {
        return null;
    }
};

/* ── Changing dashboard from inside one ───────────────────────────────────── */

const SWITCH = 'demo-switch';
/**
 * A demo card's switch pass: given with its scan, kept by whichever dashboard is open, and traded
 * for another dashboard of the same card. Twelve hours — a day of presenting — and good only while
 * the card is still a demo card. Not a session itself.
 */
const switchPass = (cardNumber) => jwt.sign({ purpose: SWITCH, card: normaliseCardNumber(cardNumber) }, process.env.JWT_SECRET, { expiresIn: '12h' });
/** The demo card a switch pass names, or null for anything else. */
const cardForSwitch = (pass) => {
    try {
        const decoded = jwt.verify(String(pass || ''), process.env.JWT_SECRET);
        if (decoded.purpose !== SWITCH || !decoded.card) return null;
        return require('./fullAccess').isDemoCard(decoded.card) ? normaliseCardNumber(decoded.card) : null;
    } catch {
        return null;
    }
};

module.exports = { DASHBOARDS, DEMO_ORG_CODE, chosenOrgCode, ensureOrganization, linkStudent, ensureTeacher, teachersFor, organizationSummary, resetTeacher, organizationPass, adminForPass, switchPass, cardForSwitch };
