/**
 * @author Preethesh Kulal
 * @description Mongoose schema for global platform settings per organization
 */
const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema({
    isCreditSystemEnabled: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

module.exports = mongoose.model('Setting', settingSchema);
