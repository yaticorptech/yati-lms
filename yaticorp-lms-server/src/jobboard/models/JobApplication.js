/**
 * One student's application to one part-time opportunity, and the guardian
 * permission it may need before it can go anywhere.
 *
 * The board's own guardian record (OpportunityProfile.guardian) says whether a
 * minor may use the section at all. This is a different question, asked per
 * job: may THIS student take THIS job. A guardian answers it themselves,
 * through a link, which is why the decision is recorded here rather than being
 * typed in by an operator.
 *
 * The job is copied in rather than referenced. A guardian is approving the
 * hours, pay and place they were shown; if the listing is edited or withdrawn
 * afterwards, what they agreed to must still be readable.
 */
const crypto = require('node:crypto');
const mongoose = require('mongoose');

/** Under this age a guardian has to agree before the application goes on. */
const GUARDIAN_AGE = 15;

const STATUSES = [
    'ready',              // old enough; nothing to wait for
    'needs-guardian',     // under age, the request has not been sent yet
    'awaiting-guardian',  // sent, waiting on the guardian
    'approved',
    'declined',
    'continued'           // the student has taken it on from here
];

/** A guardian link is long, single-use per application, and expires. */
const newToken = () => crypto.randomBytes(32).toString('base64url');
const LINK_DAYS = 14;

const schema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    opportunityId: { type: String, required: true },

    student: {
        name: { type: String, default: '' },
        age: { type: Number, default: null }
    },

    // What the guardian is shown, frozen at the moment the request was made.
    job: {
        title: { type: String, default: '' },
        company: { type: String, default: '' },
        hours: { type: String, default: '' },
        duration: { type: String, default: '' },
        location: { type: String, default: '' },
        pay: { type: String, default: '' },
        safety: { type: [String], default: [] }
    },

    guardian: {
        name: { type: String, default: '' },
        // Where the request was sent. Stored to reach them, and never sent
        // back to the browser in full.
        email: { type: String, default: '' },
        phone: { type: String, default: '' }
    },

    status: { type: String, enum: STATUSES, default: 'needs-guardian', index: true },
    requestedAt: { type: Date, default: null },
    remindedAt: { type: Date, default: null },
    reminders: { type: Number, default: 0 },
    decidedAt: { type: Date, default: null },
    declineReason: { type: String, default: '' },
    continuedAt: { type: Date, default: null },

    // How the guardian reaches their own copy of this request.
    linkToken: { type: String, default: '', index: true },
    linkExpiresAt: { type: Date, default: null }
}, { timestamps: true });

// One live application per student per job: applying twice is the same act.
schema.index({ userId: 1, opportunityId: 1 }, { unique: true });

/** Put a fresh link on the record, and say when it stops working. */
schema.methods.issueLink = function issueLink() {
    this.linkToken = newToken();
    this.linkExpiresAt = new Date(Date.now() + LINK_DAYS * 86400000);
    return this.linkToken;
};

module.exports = mongoose.model('JobBoardApplication', schema, 'jobboard_job_applications');
module.exports.STATUSES = STATUSES;
module.exports.GUARDIAN_AGE = GUARDIAN_AGE;
module.exports.LINK_DAYS = LINK_DAYS;
