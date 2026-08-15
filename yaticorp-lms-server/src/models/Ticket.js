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
    status: {
        type: String,
        enum: ['open', 'in-progress', 'resolved'],
        default: 'open'
    },
    adminNotes: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Ticket', ticketSchema);
