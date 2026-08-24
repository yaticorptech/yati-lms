const mongoose = require('mongoose');

const goalSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
      unique: true // Ensure 1:1 relationship
    },
    educationLevel: {
      type: String,
      required: [true, 'Please provide an education level'],
      enum: [
        'Primary School (Class 1–5)',
        'Middle School (Class 6–8)',
        'High School (Class 9–10)',
        'Higher Secondary (Class 11–12)',
        'Diploma',
        'Undergraduate',
        'Postgraduate',
        'Working Professional'
      ]
    },
    currentClass: {
      type: String, // e.g., 'Class 10', 'Class 12'
      required: function () {
        // Guarded: with no level at all this validator used to throw a
        // TypeError, which surfaces as a 500 and hides the real problem —
        // that the level itself is missing.
        const level = this.educationLevel || '';
        return level.includes('School') || level.includes('Secondary');
      }
    },
    // CBSE / ICSE / a state board / IB. Only school students have one, and it
    // changes what they are actually taught and which exams they sit, so the
    // roadmap needs it — a Class 10 syllabus is not the same under CBSE as it
    // is under the Tamil Nadu board. Optional: a student who does not know it
    // should not be blocked from finishing their profile.
    board: {
      type: String
    },
    // Class 11–12 only. The subject combination decides which degrees are even
    // open to them — a PCB student cannot sit JEE, a PCM student cannot sit
    // NEET — so a roadmap written without it can plan a route through a door
    // that is already closed. Optional, like the board.
    stream: {
      type: String
    },
    degree: {
      type: String, // e.g., 'B.Tech', 'B.Sc'
      required: function () {
        return this.educationLevel === 'Undergraduate' || this.educationLevel === 'Postgraduate';
      }
    },
    specialization: {
      type: String, // e.g., 'Computer Science'
      required: function () {
        return this.educationLevel === 'Undergraduate' || this.educationLevel === 'Postgraduate';
      }
    },
    currentYear: {
      type: String, // e.g., '3rd Year'
      required: function () {
        return this.educationLevel === 'Undergraduate' || this.educationLevel === 'Postgraduate' || this.educationLevel === 'Diploma';
      }
    },
    semester: {
      type: String // Optional additional field
    },
    currentJob: {
      type: String,
      required: function () {
        return this.educationLevel === 'Working Professional';
      }
    },
    experience: {
      type: Number,
      required: function () {
        return this.educationLevel === 'Working Professional';
      }
    },
    careerGoal: {
      type: String,
      required: [true, 'Please provide a career goal']
    },
    dreamCompany: {
      type: String // Optional
    },
    country: {
      type: String // Optional
    },
    state: {
      type: String // Optional
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('CareerGoal', goalSchema, 'career_goals');
