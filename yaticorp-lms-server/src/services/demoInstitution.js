/**
 * The demo cards' institution (2026-11-18, the owner: "without joining an organization show those features, because
 * this is used for demo purposes"). Institution (Campus), Student Ranking (360) and Extra Curricular belong to a
 * student's organization; a demo card is in none. For those three sections only, a demo card counts as a student of
 * "YATICORPX3 Institution": an organization made here the first time it is needed, with Campus and 360 on, sample
 * departments, subjects, fees, exams, a timetable, notices, 360 activities and clubs. The card's account is never
 * joined to it (User.organizationId stays empty): the rest of the app sees a card in no organization, as before.
 *
 * Each demo account gets its own admission there (User.campus) with some attendance and marks, once; a reset
 * (services/demoCards.js) clears it and the next visit gives it again.
 */
const mongoose = require('mongoose');
const Organization = require('../organizations/models/Organization');
const User = require('../models/User');
const { hasFullAccess } = require('./fullAccess');

const CODE = 'yati_demo_institution';
// Its name (2026-11-18, the owner: "make it YATICORPX3 Institution"); one made under an older name takes it on start.
const NAME = 'YATICORPX3 Institution';
const oid = () => new mongoose.Types.ObjectId();

/** The organization as first made: everything the three sections show. */
const blueprint = () => {
    const bca = oid(), bcom = oid();
    const s = { dbms: oid(), web: oid(), maths: oid(), eng: oid(), acc: oid(), eco: oid() };
    const internal = oid(), semExam = oid();
    const day = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
    const periods = [{ n: 1, start: '09:00', end: '09:50' }, { n: 2, start: '10:00', end: '10:50' }, { n: 3, start: '11:10', end: '12:00' }, { n: 4, start: '12:00', end: '12:50' }];
    const order = [s.dbms, s.web, s.maths, s.eng];
    return {
        orgCode: CODE,
        name: NAME,
        organizationType: 'college',
        email: 'demo-institution@demo.yaticorp.in',
        address: 'Bengaluru, Karnataka',
        contactPerson: 'Demo Office',
        status: 'active',
        demoInstitution: true,
        extraCurricularOpen: true,
        campusAllowed: true,
        three60: {
            allowed: true, enabled: true, title: '', targetTotal: 100,
            activityGroups: [
                { name: 'Academics', activities: [
                    { name: 'Certification course', mode: 'each', marks: 5, cap: 20 },
                    { name: 'Paper presentation', mode: 'each', marks: 5, cap: 15 },
                    { name: 'Attendance above 85%', mode: 'max', marks: 10 }
                ] },
                { name: 'Activities', activities: [
                    { name: 'Sports participation', mode: 'each', marks: 5, cap: 15 },
                    { name: 'Cultural event', mode: 'each', marks: 5, cap: 15 },
                    { name: 'Social service (NSS/NCC)', mode: 'max', marks: 15 },
                    { name: 'Internship', mode: 'max', marks: 10, bonusMax: 5 }
                ] }
            ]
        },
        campus: {
            departments: [
                { _id: bca, name: 'Computer Applications', code: 'BCA', semesters: 6, sections: ['A', 'B'], head: 'Dr. Meera Rao' },
                { _id: bcom, name: 'Commerce', code: 'BCOM', semesters: 6, sections: ['A'], head: 'Prof. Arjun Shetty' }
            ],
            subjects: [
                { _id: s.dbms, departmentId: bca, semester: 1, code: 'BCA101', name: 'Database Management Systems', credits: 4 },
                { _id: s.web, departmentId: bca, semester: 1, code: 'BCA102', name: 'Web Programming', credits: 4, kind: 'practical' },
                { _id: s.maths, departmentId: bca, semester: 1, code: 'BCA103', name: 'Discrete Mathematics', credits: 3 },
                { _id: s.eng, departmentId: bca, semester: 1, code: 'BCA104', name: 'English Communication', credits: 2 },
                { _id: s.acc, departmentId: bcom, semester: 1, code: 'BC101', name: 'Financial Accounting', credits: 4 },
                { _id: s.eco, departmentId: bcom, semester: 1, code: 'BC102', name: 'Business Economics', credits: 4 }
            ],
            fees: [
                { departmentId: bca, semester: 0, kind: 'admission', title: 'Admission fee', amount: 5000, dueDate: day(-60) },
                { departmentId: bca, semester: 1, kind: 'tuition', title: 'Tuition fee — Semester 1', amount: 32000, dueDate: day(20) },
                { departmentId: bca, semester: 1, kind: 'exam', title: 'Examination fee', amount: 1500, dueDate: day(30) }
            ],
            exams: [
                { _id: internal, departmentId: bca, semester: 1, name: 'Internal Assessment 1', kind: 'internal', maxMarks: 50, passMarks: 20, published: true, publishedAt: new Date() },
                { _id: semExam, departmentId: bca, semester: 1, name: 'Semester 1 Examination', kind: 'semester', maxMarks: 100, passMarks: 35, fee: 1500,
                    applyUntil: day(25), applicationsOpen: true, hallTickets: false, venue: 'Main Block, Hall 2',
                    schedule: order.map((subjectId, i) => ({ subjectId, date: day(40 + i * 2), start: '10:00', end: '13:00' })) }
            ],
            feedback: [{ departmentId: bca, semester: 1, title: 'Mid-semester feedback', perSubject: true, open: true,
                questions: [{ text: 'The teacher explains the topics clearly', kind: 'rating' }, { text: 'The classes start and end on time', kind: 'rating' }, { text: 'Anything you would like to suggest?', kind: 'text' }] }],
            timetables: [{ departmentId: bca, semester: 1, section: 'A', periods,
                slots: [1, 2, 3, 4, 5, 6].flatMap((d) => periods.map((p, i) => ({ day: d, p: p.n, subjectId: order[(d + i) % order.length], room: `Room ${100 + ((d + i) % 4) + 1}` }))) }],
            announcements: [
                { departmentId: bca, semester: 0, title: 'Welcome to the new semester', body: 'Classes begin at 9:00 every day. Carry your ID card on campus.', pinned: true, by: 'Dr. Meera Rao' },
                { departmentId: bca, semester: 1, title: 'Internal Assessment 1 results are out', body: 'Check your marks under Results. Meet your subject teacher for any doubts.', by: 'Exam Office' }
            ],
            applications: [], admissionsOpen: true, receiptSeq: 0, admissionSeq: 0
        }
    };
};

let cachedId = null;
let making = null;
/** The demo institution's id, made the first time. */
const demoOrgId = async () => {
    if (cachedId) return cachedId;
    if (!making) {
        making = (async () => {
            let org = await Organization.findOne({ orgCode: CODE }).select('_id name').lean();
            if (org && org.name !== NAME) {
                await Organization.updateOne({ _id: org._id }, { $set: { name: NAME } });
                const { ScoutUnit, NccNssMember } = require('../nccnss/models');
                await ScoutUnit.updateOne({ organizationId: org._id, name: { $in: ['1st YATI Demo Scout Troop', '1st YATICORPX3 Scout Troop'] } }, { $set: { name: '1st YATICORPX3 Scout Troop' } }).catch(() => {});
                await NccNssMember.updateMany({ organizationId: org._id, unit: { $in: ['1st YATI Demo Scout Troop', '1st YATICORPX3 Scout Troop'] } }, { $set: { unit: '1st YATICORPX3 Scout Troop' } }).catch(() => {});
            }
            if (!org) {
                try {
                    org = await Organization.create(blueprint());
                    const { NccNssClub } = require('../nccnss/models');
                    await NccNssClub.insertMany([
                        { organizationId: org._id, name: 'Coding Club', category: 'technical', description: 'Hackathons, coding contests and project nights.' },
                        { organizationId: org._id, name: 'Music & Dance Club', category: 'cultural', description: 'Practice sessions and the annual fest.' },
                        { organizationId: org._id, name: 'Sports Club', category: 'sports', description: 'Cricket, football, athletics and inter-college meets.' }
                    ]).catch((e) => console.error('[demo-institution] clubs:', e.message));
                } catch (e) {
                    if (e?.code !== 11000) throw e;
                    org = await Organization.findOne({ orgCode: CODE }).select('_id').lean();
                }
            }
            cachedId = org._id;
            return cachedId;
        })().finally(() => { making = null; });
    }
    return making;
};

/** A demo account's own admission there: Computer Applications, semester 1, section A, with attendance and marks. */
const admit = async (user, orgId) => {
    const { campus } = await require('../campus/core').loadCampus(orgId);
    const dept = campus.departments.find((d) => d.code === 'BCA');
    if (!dept) return;
    const subjects = campus.subjects.filter((x) => String(x.departmentId) === String(dept._id) && x.semester === 1);
    const internal = campus.exams.find((e) => e.kind === 'internal');
    const attendance = [];
    for (let back = 30; back >= 1; back--) {
        const d = new Date(); d.setDate(d.getDate() - back);
        if (d.getDay() === 0) continue;
        subjects.forEach((x, i) => attendance.push({ s: x._id, d: d.toISOString().slice(0, 10), p: i + 1, ok: (back + i) % 7 !== 0 }));
    }
    const n = String(user.cardNumber || user._id).replace(/\D/g, '').slice(-4).padStart(4, '0');
    await User.updateOne({ _id: user._id, 'campus.departmentId': null }, { $set: { campus: {
        departmentId: dept._id, semester: 1, section: 'A', rollNo: `BCA-A-${n}`, admissionNo: `DEMO/2026/${n}`,
        academicYear: '2026-27', admittedAt: new Date(), status: 'studying', details: {}, journey: [],
        attendance, marks: internal ? subjects.map((x, i) => ({ e: internal._id, s: x._id, m: [42, 38, 45, 36][i % 4] })) : []
    } } }, { strict: false });
};

/*
 * Already in Scouts & Guides (2026-11-18, the owner: "all demo cards should be already joined to Scouts and Guides"):
 * the demo institution's Scout troop, a demo card a member of it from its first visit. Asked once per account
 * while the server runs; a reset (services/demoCards.js) deletes the membership and forgets it here.
 */
const TROOP = '1st YATICORPX3 Scout Troop';
const inScouts = new Set();
const joinScouts = async (userId, orgId) => {
    const key = String(userId);
    if (inScouts.has(key)) return;
    const { ScoutUnit, NccNssMember } = require('../nccnss/models');
    const unit = await ScoutUnit.findOneAndUpdate({ organizationId: orgId, name: TROOP },
        { $setOnInsert: { organizationId: orgId, name: TROOP, section: 'scouts', status: 'active', note: 'The demo cards\' troop.' } },
        { upsert: true, new: true, collation: { locale: 'en', strength: 2 } }).lean()
        .catch(async (e) => { if (e?.code === 11000) return ScoutUnit.findOne({ organizationId: orgId, name: TROOP }).lean(); throw e; });
    const live = await NccNssMember.exists({ userId, scheme: 'SCOUTS', status: { $in: ['active', 'pending'] } });
    if (!live) {
        await NccNssMember.create({ organizationId: orgId, userId, scheme: 'SCOUTS', unit: unit.name, unitId: unit._id, section: unit.section, year: 1, status: 'active', addedBy: 'organization' })
            .catch((e) => { if (e?.code !== 11000) throw e; });
    }
    inScouts.add(key);
};
const forgetScouts = (userId) => { inScouts.delete(String(userId)); withProofs.delete(String(userId)); };

/*
 * Three proofs already sent for Student Ranking (2026-11-18, the owner: "add 3 uploaded proofs in all the demo
 * cards"): two accepted with their marks, one waiting. The certificates are pictures in the student app
 * (public/demo-proofs). Only for an account with no proofs yet; once per account while the server runs.
 */
const PROOFS = [
    { activity: 'Certification course', file: 'python-certificate.svg', name: 'Python-for-Data-Science-certificate.svg', status: 'approved', marks: 5, days: 12 },
    { activity: 'Sports participation', file: 'inter-college-cricket.svg', name: 'Inter-college-cricket-certificate.svg', status: 'approved', marks: 5, days: 8 },
    { activity: 'Cultural event', file: 'annual-fest-dance.svg', name: 'Annual-fest-group-dance.svg', status: 'pending', marks: 0, days: 2 },
    // Sent back (2026-11-18, "add one sent back proof also"): with the teacher's reason.
    { activity: 'Paper presentation', file: 'paper-presentation.svg', name: 'Paper-presentation-certificate.svg', status: 'rejected', marks: 0, days: 5,
        note: 'The certificate does not show your name. Upload the one with your name on it.' }
];
const withProofs = new Set();
const addProofs = async (userId, orgId) => {
    const key = String(userId);
    if (withProofs.has(key)) return;
    const org = await Organization.findById(orgId).select('three60.activityGroups').lean();
    const find = (name) => { for (const g of org?.three60?.activityGroups || []) { const a = (g.activities || []).find((x) => x.name === name); if (a) return { g, a }; } return null; };
    const at = (days) => new Date(Date.now() - days * 86400000);
    const proofs = PROOFS.map((p) => {
        const hit = find(p.activity);
        if (!hit) return null;
        const reviewed = p.status !== 'pending';
        return {
            activityId: hit.a._id, activityName: hit.a.name, groupName: hit.g.name,
            fileUrl: `/demo-proofs/${p.file}`, fileType: 'image', fileName: p.name, previewUrl: `/demo-proofs/${p.file}`,
            status: p.status, marks: p.marks, reviewerName: reviewed ? 'Dr. Meera Rao' : '', reviewNote: p.note || (reviewed ? 'Well done!' : ''),
            reviewedAt: reviewed ? at(p.days - 1) : null, createdAt: at(p.days), updatedAt: at(reviewed ? p.days - 1 : p.days)
        };
    }).filter(Boolean);
    // Only while it has none of its own: a demo card that sent its own keeps exactly those. One with only the sample
    // proofs gets any sample it is missing (the sent-back one, added later).
    const had = (await User.findById(userId).select('+activityProofs').lean())?.activityProofs || [];
    if (had.some((p) => !String(p.fileUrl || '').startsWith('/demo-proofs/'))) { withProofs.add(key); return; }
    // Each sample once (2026-11-18, the sent-back one showed twice: the menu and the page asked at the same moment
    // and both added it): added only while the account has none at that address — one write, so two at once
    // cannot both add it — and any second copy already there is taken out.
    for (const p of proofs.filter((x) => !had.some((h) => h.fileUrl === x.fileUrl))) {
        await User.updateOne({ _id: userId, 'activityProofs.fileUrl': { $ne: p.fileUrl } }, { $push: { activityProofs: p } }, { strict: false });
    }
    const seen = new Set();
    const extra = had.filter((h) => { const dup = seen.has(h.fileUrl); seen.add(h.fileUrl); return dup; }).map((h) => h._id);
    if (extra.length) await User.updateOne({ _id: userId }, { $pull: { activityProofs: { _id: { $in: extra } } } });
    withProofs.add(key);
};

/**
 * The organization a student counts as in for Institution, Student Ranking and Extra Curricular: their own; for a
 * demo card in none, the demo institution (admitted there on first use). Null otherwise.
 */
const orgIdFor = async (userOrId) => {
    const user = userOrId && typeof userOrId === 'object' && 'cardNumber' in userOrId && 'organizationId' in userOrId
        ? userOrId : await User.findById(userOrId?._id || userOrId).select('organizationId cardNumber campus.departmentId').lean();
    if (!user) return null;
    if (user.organizationId) return user.organizationId;
    if (!hasFullAccess(user)) return null;
    const id = await demoOrgId();
    if (!user.campus?.departmentId) await admit(user, id).catch((e) => console.error('[demo-institution] admit:', e.message));
    await joinScouts(user._id, id).catch((e) => console.error('[demo-institution] scouts:', e.message));
    await addProofs(user._id, id).catch((e) => console.error('[demo-institution] proofs:', e.message));
    return id;
};

/** Whether this organization is the demo one (its 360 needs no ranking teacher). */
const isDemoOrg = (orgId) => !!orgId && !!cachedId && String(orgId) === String(cachedId);

module.exports = { orgIdFor, demoOrgId, isDemoOrg, forgetScouts, CODE };
