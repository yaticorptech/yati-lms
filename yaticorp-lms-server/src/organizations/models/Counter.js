/**
 * @description The running number at the end of an organization ID.
 *
 * One document per year, incremented with $inc inside findOneAndUpdate so two
 * registrations arriving together cannot read the same value. Counting existing
 * organizations instead would do exactly that.
 */
const mongoose = require('mongoose');

const counterSchema = new mongoose.Schema({
    // 'org-2026'
    _id: { type: String },
    seq: { type: Number, default: 0 }
}, { versionKey: false });

module.exports = mongoose.model('OrgCounter', counterSchema, 'org_counters');
