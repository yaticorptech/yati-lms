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
 * `orgCode` — not `_id` — is the identifier people see, type and print. It is
 * generated once (see ../services/orgCode.js), marked immutable, and never
 * accepted from a request body, because students who already hold a code on a
 * handout cannot be told it has changed.
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
    // The public, human-readable identifier: ABC-2026-0001, built from the
    // organization's own first word. See ../services/orgCode.js.
    orgCode: {
        type: String,
        required: true,
        unique: true,
        immutable: true,
        uppercase: true,
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
    }
}, { timestamps: true });

// The superadmin list searches on name and code, and filters on type.
organizationSchema.index({ name: 1 });
organizationSchema.index({ organizationType: 1 });

/** Only an active organization may be joined or administered. */
organizationSchema.methods.isUsable = function () {
    return this.status === 'active';
};

const Organization = mongoose.model('Organization', organizationSchema, 'organizations');

Organization.TYPES = ORGANIZATION_TYPES;
Organization.TYPE_LABELS = ORGANIZATION_TYPE_LABELS;
Organization.STATUSES = ORGANIZATION_STATUSES;

module.exports = Organization;
