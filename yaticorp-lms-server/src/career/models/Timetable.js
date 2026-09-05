const mongoose = require('mongoose');

/**
 * The student's weekly college or school timetable, typed in by hand.
 *
 * One document per student holding every slot, because a timetable is edited
 * as a whole — "my Tuesday changed" — rather than one class at a time, and a
 * single replace is simpler to reason about than forty tiny writes.
 *
 * Times are 'HH:MM' strings, not Dates: a class at 09:00 every Monday is a
 * time of day, not an instant, and an instant would drift with timezones.
 * `day` follows JavaScript's getDay(): 0 is Sunday, 6 is Saturday.
 */
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

const slotSchema = new mongoose.Schema(
  {
    day: { type: Number, required: true, min: 0, max: 6 },
    start: { type: String, required: true, match: [TIME, 'start must be HH:MM'] },
    end: { type: String, required: true, match: [TIME, 'end must be HH:MM'] },
    subject: {
      type: String,
      required: [true, 'Give the class a name'],
      trim: true,
      maxlength: [80, 'Keep the subject under 80 characters']
    },
    location: { type: String, trim: true, maxlength: [80, 'Keep the room under 80 characters'] }
  },
  { _id: true }
);

const timetableSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User', unique: true },
    slots: { type: [slotSchema], default: [] }
  },
  { timestamps: true }
);

module.exports = mongoose.model('CareerTimetable', timetableSchema, 'career_timetables');
