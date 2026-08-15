/**
 * @author Preethesh Kulal
 * @description Mongoose schema for activation cards with QR code, CVV and status lifecycle
 */
const mongoose = require('mongoose');

const cardSchema = new mongoose.Schema({
    CardNumber: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    CVV: {
        type: String,
        required: true
    },
    qrCodeNumber: {
        type: String,
        required: true
    },
    SerialNumber: {
        type: String
    },
    status: {
        type: String,
        enum: ['unactivated', 'activated', 'used', 'inactive'],
        default: 'unactivated'
    }
}, { timestamps: true });

module.exports = mongoose.model('Card', cardSchema);
