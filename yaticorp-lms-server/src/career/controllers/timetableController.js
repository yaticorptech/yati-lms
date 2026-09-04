const Timetable = require('../models/Timetable');
const { errorBody: aiAwareBody, statusFor } = require('../services/aiErrors');

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const MAX_SLOTS = 60;

/**
 * Check a submitted timetable and hand back clean slots, or the first thing
 * wrong with it in words the student can act on.
 */
const readSlots = (body) => {
  const slots = Array.isArray(body?.slots) ? body.slots : null;
  if (!slots) return { error: 'Send the timetable as a list of slots.' };
  if (slots.length > MAX_SLOTS) return { error: `Keep it under ${MAX_SLOTS} classes a week.` };

  const clean = [];
  for (const [i, s] of slots.entries()) {
    const n = i + 1;
    const day = Number(s?.day);
    if (!Number.isInteger(day) || day < 0 || day > 6) return { error: `Class ${n}: pick a day.` };
    const start = String(s?.start || '').trim();
    const end = String(s?.end || '').trim();
    if (!TIME.test(start) || !TIME.test(end)) return { error: `Class ${n}: times must be HH:MM.` };
    if (end <= start) return { error: `Class ${n}: it has to end after it starts.` };
    const subject = String(s?.subject || '').trim();
    if (!subject) return { error: `Class ${n}: give it a name.` };
    if (subject.length > 80) return { error: `Class ${n}: keep the subject under 80 characters.` };
    const location = String(s?.location || '').trim().slice(0, 80);
    clean.push({ day, start, end, subject, location: location || undefined });
  }

  // Stored in the order the week reads, so every reader gets it sorted.
  clean.sort((a, b) => a.day - b.day || a.start.localeCompare(b.start));
  return { slots: clean };
};

// @desc    This student's weekly timetable
// @route   GET /api/career/timetable
// @access  Private
const getTimetable = async (req, res) => {
  try {
    const doc = await Timetable.findOne({ userId: req.user._id }).lean();
    res.status(200).json({ slots: doc?.slots || [], updatedAt: doc?.updatedAt || null });
  } catch (error) {
    res.status(statusFor(error)).json(aiAwareBody(error));
  }
};

// @desc    Replace the timetable with the one sent
// @route   PUT /api/career/timetable
// @access  Private
const saveTimetable = async (req, res) => {
  try {
    const { error, slots } = readSlots(req.body);
    if (error) return res.status(400).json({ message: error });

    const doc = await Timetable.findOneAndUpdate(
      { userId: req.user._id },
      { $set: { slots } },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    ).lean();
    res.status(200).json({ slots: doc.slots, updatedAt: doc.updatedAt });
  } catch (error) {
    res.status(statusFor(error)).json(aiAwareBody(error));
  }
};

module.exports = { getTimetable, saveTimetable, readSlots };
