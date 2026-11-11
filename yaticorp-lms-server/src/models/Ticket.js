/**
 * @author Preethesh Kulal
 * @description Mongoose schema for student support tickets scoped by organization
 */
const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true },
    cardNumber: { type: String },
    subject: { type: String, required: true },
    message: { type: String, required: true },
    page: {
        type: String,
        enum: ['login', 'signup', 'dashboard', 'other'],
        default: 'other'
    },
    // The address the student wrote from (/learn/…, /career/planner), which
    // `page` is too coarse to say: support needs to know where they were stuck.
    path: { type: String, maxlength: 300 },
    status: {
        type: String,
        enum: ['open', 'in-progress', 'resolved'],
        default: 'open'
    },
    adminNotes: { type: String },
    // From an organization's panel or a teacher's dashboard (2026-11-04): who sent it, and its ID.
    from: { type: String, enum: ['student', 'organization', 'teacher'], default: 'student' },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher' },
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
    orgCode: { type: String },
    // The conversation after the first message (2026-11-04): the admin's replies, and the
    // sender's "not resolved, again" on a resolved ticket, which opens the same ticket again.
    thread: [{ by: { type: String, enum: ['user', 'admin'] }, text: { type: String, maxlength: 5000 }, at: { type: Date, default: Date.now } }],
    reopened: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Ticket', ticketSchema);
