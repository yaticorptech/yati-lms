const mongoose = require('mongoose');

/**
 * The scholarships found for one student: a list the AI builds from their
 * goal, stage and country, kept so the page opens instantly and the list only
 * changes when the student asks for a fresh one.
 */
const scholarshipSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    items: { type: Array, default: [] },
    // What the list was built for, so a changed goal can be noticed.
    builtFor: { type: String, default: '' },
    generatedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

module.exports = mongoose.model('CareerScholarship', scholarshipSchema, 'career_scholarships');
