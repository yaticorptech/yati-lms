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
      enum: ['Exam', 'Assignment', 'Class', 'Holiday', 'Competition', 'Other'],
      default: 'Exam'
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Keep the notes under 500 characters']
    },
    /**
     * The same event on the student's Google Calendar, when they have linked
     * an account. Empty for everyone else, and empty again once they
     * disconnect. It is a mirror, never the record: this row is the truth.
     */
    /**
     * A time on the day and a reminder (2026-11-04, the Competitions calendar): `time` as 'HH:MM' on the student's
     * clock; `remindAt`, the instant the reminder pops up (worked out on their device, where their clock is);
     * `reminderShownAt`, once it has, so it shows once on any device. `link`: the competition's page in the app.
     */
    time: { type: String, default: '', match: [/^$|^([01]\d|2[0-3]):[0-5]\d$/, 'time must be HH:MM'] },
    remindAt: { type: Date, default: null },
    reminderShownAt: { type: Date, default: null },
    link: { type: String, default: '', maxlength: 300 },
    googleEventId: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

// Reading one student's whole calendar is the only query this serves.
calendarEventSchema.index({ userId: 1, date: 1 });

module.exports = mongoose.model('CareerCalendarEvent', calendarEventSchema, 'career_calendar_events');
