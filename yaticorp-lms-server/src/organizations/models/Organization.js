/**
 * @description An institution that brings its own students to the LMS — a
 *              school, a college, a training centre, a company.
 *
 * Registration is public and self-service, so a new document starts `pending`
 * and can do nothing until a superadmin approves it. The organization's admin
 * account lives in the ordinary `Admin` collection with role `orgadmin` and an
 * `organizationId` pointing here, so there is one set of credentials, one login
 * endpoint and one token format for every kind of administrator.
 *
 * `orgCode` — not `_id` — is the identifier people see, type and print. The
 * organization chooses it once, when it registers (see ../services/orgCode.js);
 * after that it is immutable and never accepted from an edit, because students
 * who already hold it on a handout cannot be told it has changed.
 */
const mongoose = require('mongoose');

/** The kinds of institution the registration form offers. */
const ORGANIZATION_TYPES = [
    'school',
    'college',
    'university',
    'training_institute',
    'company',
    'ngo',
    'government',
    'other'
];

/** Human wording for each type, so the label lives beside the value. */
const ORGANIZATION_TYPE_LABELS = {
    school: 'School',
    college: 'College',
    university: 'University',
    training_institute: 'Training Institute',
    company: 'Company',
    ngo: 'NGO',
    government: 'Government Organization',
    other: 'Other'
};

/**
 * pending   — registered, waiting for a superadmin to look at it
 * active    — approved; the only status students may join and admins may use
 * rejected  — turned down at registration; kept, never deleted
 * suspended — was active, access withdrawn; memberships and progress untouched
 * inactive  — retired by an administrator; same effect as suspended
 */
const ORGANIZATION_STATUSES = ['pending', 'active', 'rejected', 'suspended', 'inactive'];

const organizationSchema = new mongoose.Schema({
    // The public identifier people see, type and print, chosen by the
    // organization itself: st_agnes_college. Older ones were generated
    // (ABC-2026-0001) and keep their capitals. See ../services/orgCode.js.
    orgCode: {
        type: String,
        required: true,
        unique: true,
        immutable: true,
        trim: true
    },
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 150
    },
    organizationType: {
        type: String,
        enum: ORGANIZATION_TYPES,
        default: 'other'
    },
    logo: {
        type: String,
        default: ''
    },
    // Certificate templates the organisation uploaded (Certificate Configuration, 2026-10-31): each a picture (JPEG
    // data URL) the certificates' words are written on. Never selected by default — they are large.
    // Its certificate defaults (the Smart Certificate Builder, 2026-10-31): logo, seal, signatures, lines, layout.
    certificateDefaults: { type: mongoose.Schema.Types.Mixed, default: null, select: false },
    certificateTemplates: {
        type: [{ name: { type: String, default: '', maxlength: 80 }, image: { type: String, required: true }, addedAt: { type: Date, default: Date.now } }],
        default: [],
        select: false
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    phone: {
        type: String,
        default: '',
        trim: true
    },
    address: {
        type: String,
        default: '',
        trim: true,
        maxlength: 400
    },
    website: {
        type: String,
        default: '',
        trim: true,
        maxlength: 200
    },
    contactPerson: {
        type: String,
        default: '',
        trim: true,
        maxlength: 120
    },
    // What the applicant told us at registration. Never a limit, only context
    // for whoever reviews the application.
    expectedStudents: {
        type: Number,
        default: null,
        min: 0
    },
    status: {
        type: String,
        enum: ORGANIZATION_STATUSES,
        default: 'pending',
        index: true
    },
    // Why the last rejection/suspension happened, shown to the organization.
    statusReason: {
        type: String,
        default: '',
        trim: true,
        maxlength: 500
    },
    /**
     * Every status change, oldest first.
     *
     * This LMS has no general audit-log service, and inventing one for a single
     * feature would leave two logging systems to keep in step. Approval,
     * rejection and suspension are the decisions anyone would ever ask about,
     * and they belong to this document, so they are recorded on it.
     */
    statusHistory: [{
        _id: false,
        status: { type: String, enum: ORGANIZATION_STATUSES },
        reason: { type: String, default: '' },
        at: { type: Date, default: Date.now },
        byAdminId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
        byName: { type: String, default: '' }
    }],
    // Set once, when a superadmin first approves. Kept through later
    // suspensions so "approved on" stays answerable.
    approvedAt: {
        type: Date,
        default: null
    },
    // The state or union territory it is in (nccnss/bsg.js INDIA_STATES), or
    // blank. A BSG state office's notices reach the Scouts and Guides of the
    // institutions in its state.
    state: { type: String, default: '', trim: true, maxlength: 60 },
    /**
     * A Bharat Scouts & Guides office rather than an institution: 'national'
     * or 'state' (blank for every institution). Made by a superadmin, one per
     * state and one national, each with one user. An office publishes exams,
     * camps and events for Scouts and Guides to see (nccnss/notices.js). The
     * national office is also where Scouts and Guides with no institution
     * belong: they join it with its code, as they would a school.
     */
    bsgOffice: { type: String, enum: ['', 'national', 'state'], default: '' },
    // Whether this organization may publish its own courses, and how many.
    // Only a superadmin changes it. Off until they switch it on.
    courseAccess: {
        enabled: { type: Boolean, default: false },
        limit: { type: Number, default: 5, min: 1, max: 500 }
    },
    // Whether this organization may host its own inter-college competitions
    // (Games & Competitions). Only a superadmin changes it. Off until they
    // switch it on; any organization can still enter its team in others'.
    canHostCompetitions: { type: Boolean, default: false },
    // Games hours (2026-11-14, src/games/orgHours.js): when its students may play the brain and
    // group games — the days that are open, each with an optional window and an optional number of
    // minutes. Off: games follow the platform's own rules only.
    gamesSchedule: {
        enabled: { type: Boolean, default: false },
        days: [new mongoose.Schema({
            day: { type: Number, min: 0, max: 6, required: true },      // 0 = Sunday
            start: { type: String, default: '' },                         // HH:MM; '' = from midnight
            end: { type: String, default: '' },                           // HH:MM; '' = to midnight
            minutes: { type: Number, min: 0, max: 1440, default: 0 }      // 0 = no daily limit
        }, { _id: false })]
    },
    // Students asking to play outside those hours, and what the organization answered (newest kept).
    gamesRequests: [new mongoose.Schema({
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        note: { type: String, trim: true, maxlength: 200, default: '' },
        status: { type: String, enum: ['pending', 'granted', 'declined'], default: 'pending' },
        until: { type: Date, default: null },                             // a grant, until then
        at: { type: Date, default: Date.now },
        decidedAt: { type: Date, default: null }
    })],
    // Access hours: when this organization's students may use the platform
    // (services/accessSchedule.js). Off until the organization sets them.
    accessSchedule: {
        enabled: { type: Boolean, default: false },
        days: { type: [Number], default: [1, 2, 3, 4, 5] },          // 0 = Sunday
        start: { type: String, default: '09:00' },                   // HH:MM, the organization's time
        end: { type: String, default: '17:00' },
        timezone: { type: String, default: 'Asia/Kolkata' }
    },
    // Its courses and 360 (2026-10-30, src/three60): the courses it offers
    // (BBA, BCA…, "programs") each in sections, listed by the organization
    // (Teachers → Courses & sections); each teacher marks the section and
    // subject they teach in their 360 dashboard. Kept here, not in a
    // collection of its own: the cluster is at its collection limit. Students
    // see 360 once `enabled`.
    three60: {
        // Whether the platform's superadmin has unlocked 360 for this
        // organization (2026-11-04). Off until they do: its 360 Activities page
        // is locked, its teachers keep only What I teach, its students do not
        // see 360. The organization's own switch below counts only once this is on.
        allowed: { type: Boolean, default: false },
        enabled: { type: Boolean, default: false },
        // What the institution calls it (2026-11-13): shown to its teachers and students in
        // place of "Student Ranking" — e.g. "Star Scholar", "Merit Index". Blank: Student Ranking.
        title: { type: String, trim: true, maxlength: 40, default: '' },
        programs: [new mongoose.Schema({
            name: { type: String, required: true, trim: true, maxlength: 80 },
            sections: [new mongoose.Schema({
                name: { type: String, required: true, trim: true, maxlength: 40 },
                // Who teaches this section, and what — each teacher adds their own.
                teachers: [new mongoose.Schema({
                    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
                    subject: { type: String, trim: true, maxlength: 80, default: '' },
                    // Which years of the course they teach it to (1st, 2nd, 3rd), one or more.
                    years: { type: [Number], default: [] }
                })]
            })],
            // The subjects of each semester of the course (Settings → Institution, 2026-11-04):
            // { year: 1–3, semester: 1–6, name }. Teachers pick theirs from these.
            subjects: [new mongoose.Schema({
                year: { type: Number, required: true, min: 1, max: 3 },
                semester: { type: Number, min: 1, max: 6 },
                name: { type: String, required: true, trim: true, maxlength: 80 }
            }, { _id: false })]
        }, { timestamps: true })],
        // The activities of 360 (the 360 Activities page, 2026-10-31): in
        // categories, each worth "up to N marks" (mode max) or "N points per
        // proof" (mode each). Its students upload proof for them; their 360
        // teachers check it and give the marks (src/three60/activities.js).
        activityGroups: [new mongoose.Schema({
            name: { type: String, required: true, trim: true, maxlength: 80 },
            activities: [new mongoose.Schema({
                name: { type: String, required: true, trim: true, maxlength: 120 },
                mode: { type: String, enum: ['max', 'each'], default: 'max' },
                marks: { type: Number, min: 0, max: 1000, default: 10 },
                // "Per proof" only (2026-11-06): the most the activity can give however
                // many proofs are accepted (1 per presentation, at most 5). null: no limit.
                cap: { type: Number, min: 0, max: 100000, default: null },
                // Bonus (2026-11-06): on accepting proof the teacher may add up to this much more,
                // in all, on top of the marks (the sheet's "Bonus" column). Not part of the total.
                bonusMax: { type: Number, min: 0, max: 1000, default: 0 },
                // Extra (2026-11-06): bonus or year-specific (Mock Interview, final year):
                // adds to the student's score, but not to the organization's maximum.
                bonus: { type: Boolean, default: false },
                // "Per proof" (2026-11-14): what a proof may be — pdf, image, video — and the most
                // pictures a student can send for it (0: no limit). Empty: a picture or a PDF, as before.
                proofKinds: { type: [String], default: undefined },
                maxImages: { type: Number, min: 0, max: 100, default: 0 }
            })]
        })],
        // The maximum the organization means its list to add up to, e.g. 360 (2026-11-06).
        // Only a check: the 360 Activities page warns while the list does not add up to it.
        targetTotal: { type: Number, min: 0, max: 100000, default: null }
    },
    // Campus (2026-11-13, src/campus): the student management system — departments
    // with their own sign-ins, admissions, subjects, attendance, internal marks,
    // fees, exam applications, admit cards, results and feedback. Off until the
    // platform's superadmin switches it on. Its set-up lives here (the cluster is at
    // its collection limit); each student's own record is on the student (User.campus).
    campusAllowed: { type: Boolean, default: false },
    // Extra-curricular for every student (2026-11-16): on (the default — not set counts as on), all its students get
    // the Extra Curricular tab, to ask to join its NCC, NSS, Scouts and clubs. Off: only those already in one see it.
    extraCurricularOpen: { type: Boolean, default: true },
    campus: {
        type: new mongoose.Schema({
            departments: [new mongoose.Schema({
                name: { type: String, required: true, trim: true, maxlength: 100 },
                code: { type: String, trim: true, maxlength: 12, default: '' },
                semesters: { type: Number, min: 1, max: 12, default: 6 },
                sections: { type: [String], default: ['A'] },
                head: { type: String, trim: true, maxlength: 100, default: '' },
                // The head's teacher account: they set the timetable and post announcements from the teacher dashboard.
                headId: { type: mongoose.Schema.Types.ObjectId, default: null }
            }, { timestamps: true })],
            subjects: [new mongoose.Schema({
                departmentId: { type: mongoose.Schema.Types.ObjectId, required: true },
                semester: { type: Number, min: 1, max: 12, required: true },
                code: { type: String, trim: true, maxlength: 20, default: '' },
                name: { type: String, required: true, trim: true, maxlength: 120 },
                credits: { type: Number, min: 0, max: 20, default: 4 },
                kind: { type: String, enum: ['theory', 'practical'], default: 'theory' },
                // The staff sign-ins (Teachers → Organisation dashboard) who teach it.
                teacherIds: { type: [mongoose.Schema.Types.ObjectId], default: [] }
            })],
            fees: [new mongoose.Schema({
                departmentId: { type: mongoose.Schema.Types.ObjectId, required: true },
                semester: { type: Number, min: 0, max: 12, default: 0 },   // 0: every semester
                kind: { type: String, enum: ['admission', 'tuition', 'exam', 'hostel', 'transport', 'other'], default: 'tuition' },
                title: { type: String, required: true, trim: true, maxlength: 120 },
                amount: { type: Number, min: 0, required: true },
                dueDate: { type: String, default: '' }
            })],
            exams: [new mongoose.Schema({
                departmentId: { type: mongoose.Schema.Types.ObjectId, required: true },
                semester: { type: Number, min: 1, max: 12, required: true },
                name: { type: String, required: true, trim: true, maxlength: 120 },
                kind: { type: String, enum: ['internal', 'semester'], default: 'internal' },
                maxMarks: { type: Number, min: 1, max: 1000, default: 100 },
                passMarks: { type: Number, min: 0, max: 1000, default: 35 },
                fee: { type: Number, min: 0, default: 0 },
                applyUntil: { type: String, default: '' },
                applicationsOpen: { type: Boolean, default: false },
                hallTickets: { type: Boolean, default: false },
                published: { type: Boolean, default: false },
                publishedAt: { type: Date, default: null },
                venue: { type: String, trim: true, maxlength: 200, default: '' },
                instructions: { type: String, trim: true, maxlength: 2000, default: '' },
                schedule: [{ _id: false, subjectId: mongoose.Schema.Types.ObjectId, date: String, start: String, end: String }]
            }, { timestamps: true })],
            feedback: [new mongoose.Schema({
                departmentId: { type: mongoose.Schema.Types.ObjectId, required: true },
                semester: { type: Number, min: 0, max: 12, default: 0 },
                title: { type: String, required: true, trim: true, maxlength: 150 },
                perSubject: { type: Boolean, default: true },
                open: { type: Boolean, default: true },
                questions: [{ _id: false, text: { type: String, maxlength: 300 }, kind: { type: String, enum: ['rating', 'text'], default: 'rating' } }]
            }, { timestamps: true })],
            // A class's weekly timetable, set by its department (HOD): the period times and
            // which subject is taught in each period of each day (1 Monday … 6 Saturday).
            timetables: [new mongoose.Schema({
                departmentId: { type: mongoose.Schema.Types.ObjectId, required: true },
                semester: { type: Number, min: 1, max: 12, required: true },
                section: { type: String, default: '' },
                periods: [{ _id: false, n: Number, start: String, end: String }],
                slots: [{ _id: false, day: Number, p: Number, subjectId: mongoose.Schema.Types.ObjectId, room: String }]
            }, { timestamps: true })],
            // Notices from a department (its HOD or office) to its students; semester 0 / section '' mean all.
            announcements: [new mongoose.Schema({
                departmentId: { type: mongoose.Schema.Types.ObjectId, required: true },
                semester: { type: Number, min: 0, max: 12, default: 0 },
                section: { type: String, default: '' },
                title: { type: String, required: true, trim: true, maxlength: 150 },
                body: { type: String, trim: true, maxlength: 3000, default: '' },
                pinned: { type: Boolean, default: false },
                // Who it is for: the department's students, its teachers (those teaching its subjects), or both.
                toStudents: { type: Boolean, default: true },
                toTeachers: { type: Boolean, default: false },
                by: { type: String, default: '' }
            }, { timestamps: true })],
            // Online admission applications (2026-11-16): sent from the college's public admission link
            // (src/campus/apply.js). Removed once admitted or rejected, so only those waiting are kept here.
            applications: [new mongoose.Schema({
                departmentId: { type: mongoose.Schema.Types.ObjectId, required: true },
                section: { type: String, default: '' },
                name: { type: String, required: true, trim: true, maxlength: 100 },
                email: { type: String, trim: true, lowercase: true, maxlength: 120, default: '' },
                phone: { type: String, trim: true, maxlength: 20, default: '' },
                details: { type: mongoose.Schema.Types.Mixed, default: {} }
            }, { timestamps: true })],
            // The public admission link takes applications while this is on.
            admissionsOpen: { type: Boolean, default: true },
            // The college's own version of that form (2026-11-16): a note on top, and each detail field
            // 'off', 'optional' or 'required' (missing: the default in src/campus/apply.js FORM_DEFAULTS).
            admissionForm: {
                intro: { type: String, trim: true, maxlength: 1000, default: '' },
                fields: { type: mongoose.Schema.Types.Mixed, default: {} },
                // Its own questions (2026-11-16): [{ id: 'q_…', label, type, options[], required }] — see campus/core.js.
                custom: { type: [mongoose.Schema.Types.Mixed], default: [] },
                // Its own words on the page and its own names for the fields (campus/apply.js cleanText, cleanLabels).
                text: { type: mongoose.Schema.Types.Mixed, default: {} },
                labels: { type: mongoose.Schema.Types.Mixed, default: {} }
            },
            receiptSeq: { type: Number, default: 0 },
            admissionSeq: { type: Number, default: 0 },
            // Admission numbers (2026-11-14, Settings): prefix + a running number from `start`, `digits` long.
            // Not set: the old DEPT/YEAR/0001.
            admissionFormat: { prefix: { type: String, default: '' }, start: { type: Number, default: 0 }, digits: { type: Number, default: 4 } }
        }, { _id: false }),
        default: undefined,
        select: false
    }
}, { timestamps: true });

// The superadmin list searches on name and code, and filters on type.
organizationSchema.index({ name: 1 });
organizationSchema.index({ organizationType: 1 });
// One national office, and one office per state.
organizationSchema.index({ bsgOffice: 1, state: 1 }, { unique: true, name: 'one_bsg_office', partialFilterExpression: { bsgOffice: { $in: ['national', 'state'] } } });

/** Only an active organization may be joined or administered. */
organizationSchema.methods.isUsable = function () {
    return this.status === 'active';
};

const Organization = mongoose.model('Organization', organizationSchema, 'organizations');

Organization.TYPES = ORGANIZATION_TYPES;
Organization.TYPE_LABELS = ORGANIZATION_TYPE_LABELS;
Organization.STATUSES = ORGANIZATION_STATUSES;

module.exports = Organization;
