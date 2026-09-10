const mongoose = require('mongoose');

/**
 * The handful of facts scholarship schemes actually ask for, which the career
 * goal does not already hold.
 *
 * Nothing here is required. A student who fills in none of it still gets a
 * list; they get a broader one. That is deliberate: category, religion,
 * disability and household income are sensitive, and a feature that will not
 * work until a student discloses their caste is a feature that excludes the
 * people it was built to help.
 *
 * Education level, class, stream, board, career goal, country and state are
 * NOT here. They are already on the Goal, and asking twice is how forms get
 * abandoned.
 */
const scholarshipProfileSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },

    // The single biggest filter on Indian schemes: most central and state
    // awards are category-specific.
    category: { type: String, enum: ['', 'General', 'OBC', 'SC', 'ST', 'EWS'], default: '' },

    // Held apart from category because minority schemes run alongside it: a
    // student can be OBC and Muslim and eligible for both tracks.
    minority: {
      type: String,
      enum: ['', 'Not applicable', 'Muslim', 'Christian', 'Sikh', 'Buddhist', 'Jain', 'Parsi', 'Other'],
      default: ''
    },

    // A band rather than a figure. Schemes publish thresholds, not exact
    // incomes, and a band is far less intrusive to hand over.
    familyIncome: {
      type: String,
      enum: ['', 'Below ₹1 lakh', '₹1–2.5 lakh', '₹2.5–5 lakh', '₹5–8 lakh', 'Above ₹8 lakh'],
      default: ''
    },

    gender: { type: String, enum: ['', 'Female', 'Male', 'Other', 'Prefer not to say'], default: '' },

    disability: { type: Boolean, default: false },
    disabilityPercent: { type: Number, min: 0, max: 100, default: 0 },

    // Free text, because a school student says "82%" and a degree student says
    // "8.4 CGPA", and forcing one shape on both loses the meaning.
    lastScore: { type: String, default: '', trim: true, maxlength: 20 },

    institutionType: {
      type: String,
      enum: ['', 'Government', 'Government-aided', 'Private', 'Not studying right now'],
      default: ''
    },

    /**
     * The special tracks. Each opens a set of schemes nothing else reaches,
     * and none of them are guessable from anything already on file.
     */
    circumstances: {
      type: [String],
      default: [],
      validate: {
        validator: (list) =>
          list.every((c) =>
            [
              'Single girl child',
              'Orphan',
              'Ward of ex-serviceman',
              'Farmer family',
              'First in family to study',
              'Parent is a construction or unorganised worker'
            ].includes(c)
          ),
        message: 'Unknown circumstance'
      }
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('CareerScholarshipProfile', scholarshipProfileSchema, 'career_scholarship_profiles');
