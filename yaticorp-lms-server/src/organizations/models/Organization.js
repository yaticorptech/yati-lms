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
        programs: [new mongoose.Schema({
            name: { type: String, required: true, trim: true, maxlength: 80 },
            sections: [new mongoose.Schema({
                name: { type: String, required: true, trim: true, maxlength: 40 },
                // Who teaches this section, and what — each teacher adds their own.
                teachers: [new mongoose.Schema({
                    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
                    subject: { type: String, trim: true, maxlength: 80, default: '' }
                })]
            })]
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
                marks: { type: Number, min: 0, max: 1000, default: 10 }
            })]
        })]
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
