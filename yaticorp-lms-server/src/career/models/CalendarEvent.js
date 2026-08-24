const mongoose = require('mongoose');

/**
 * Something the student put on their own calendar: an exam, an assignment
 * deadline, a holiday.
 *
 * Distinct from Task, which the AI generates and the app completes on their
 * behalf. These are theirs — typed in, edited and deleted by hand — and nothing
 * else in the system writes to them.
 *
 * The day is stored as a plain 'YYYY-MM-DD' string rather than a Date. A Date
 * is a point in time, and a point in time shifts across timezones: an exam
 * entered as 14 August in India, stored as midnight local and read back on a
 * server running UTC, becomes 13 August. The student did not mean an instant,
 * they meant a square on a grid, so that is what is stored.
 */
const calendarEventSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
      index: true
    },
    date: {
      type: String,
      required: true,
      match: [/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD']
    },
    title: {
      type: String,
      required: [true, 'Give this event a name'],
      trim: true,
      maxlength: [120, 'Keep the title under 120 characters']
    },
    type: {
      type: String,
      enum: ['Exam', 'Assignment', 'Class', 'Holiday', 'Other'],
      default: 'Exam'
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Keep the notes under 500 characters']
    }
  },
  {
    timestamps: true
  }
);

// Reading one student's whole calendar is the only query this serves.
calendarEventSchema.index({ userId: 1, date: 1 });

module.exports = mongoose.model('CareerCalendarEvent', calendarEventSchema, 'career_calendar_events');
