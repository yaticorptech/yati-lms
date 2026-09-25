/**
 * @description A student asking to be counted as a member of an organization.
 *
 * Membership is never granted by typing a code — the organization's own admin
 * decides. Until then the student holds a `pending` row here and their
 * `User.organizationId` stays null, so nothing about their account changes if
 * the request is refused or ignored.
 *
 * Rows are kept after a decision: the student needs to see "rejected" rather
 * than a form that looks untouched, and a later re-application should not erase
 * the earlier answer.
 */
const mongoose = require('mongoose');

const JOIN_REQUEST_STATUSES = ['pending', 'approved', 'rejected', 'cancelled'];

const joinRequestSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
        // No `index: true` here. The two indexes at the foot of this file cover
        // userId between them, and a third on the same key made Mongoose warn
        // about a duplicate — one more index to write on every insert, serving
        // queries the others already serve.
    },
    organizationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: true,
        index: true
    },
    status: {
        type: String,
        enum: JOIN_REQUEST_STATUSES,
        default: 'pending',
        index: true
    },
    // Filled in on rejection so the student is told why, not just "no".
    decisionReason: {
        type: String,
        default: '',
        trim: true,
        maxlength: 500
    },
    decidedAt: {
        type: Date,
        default: null
    },
    // The organization admin who approved or rejected. Null when the student
    // cancelled their own request.
    decidedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
        default: null
    }
}, { timestamps: true });

/**
 * One student may have at most one request in flight, anywhere.
 *
 * A partial unique index rather than application-level checking, because two
 * taps on a slow connection are two concurrent inserts, and only the database
 * can settle that. It covers both rules the feature needs at once: no duplicate
 * pending request to the same organization, and no simultaneous applications to
 * two different organizations.
 */
joinRequestSchema.index(
    { userId: 1 },
    { unique: true, partialFilterExpression: { status: 'pending' } }
);

// The organization admin's queue: their pending rows, oldest first.
joinRequestSchema.index({ organizationId: 1, status: 1, createdAt: 1 });

// "This student's latest request", which is what the student's own view asks
// for. Compound rather than a plain userId index, so the sort is served too.
joinRequestSchema.index({ userId: 1, createdAt: -1 });

const JoinRequest = mongoose.model('OrgJoinRequest', joinRequestSchema, 'org_join_requests');

JoinRequest.STATUSES = JOIN_REQUEST_STATUSES;

module.exports = JoinRequest;
