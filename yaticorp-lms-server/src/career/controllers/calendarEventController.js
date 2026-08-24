const CalendarEvent = require('../models/CalendarEvent');
const Task = require('../models/Task');
const { toISODate, startOfDay, addDays } = require('../services/dailyPlanService');
const { errorBody: aiAwareBody } = require('../services/aiErrors');

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Clear the day before an exam that has just been put on the calendar.
 *
 * The planner refuses to build a plan for an exam eve, but an exam added
 * partway through that day arrives too late for that: the task is already
 * sitting there. Only untouched work is removed — anything already finished
 * stays, along with the XP it earned, because the point is to free up the
 * evening, not to erase what the student did with their morning.
 */
const clearEveOfExam = async (userId, date, type) => {
  if (type !== 'Exam') return 0;

  const eve = startOfDay(new Date(`${date}T00:00:00`));
  eve.setDate(eve.getDate() - 1);
  if (toISODate(eve) !== toISODate(startOfDay())) return 0;

  const { deletedCount } = await Task.deleteMany({
    userId,
    assignedDate: { $gte: eve, $lt: addDays(eve, 1) },
    status: 'Pending'
  });
  return deletedCount || 0;
};
const TYPES = ['Exam', 'Assignment', 'Class', 'Holiday', 'Other'];

/**
 * Pull a valid event body out of a request, or say why it is not one.
 *
 * Shared by create and update so the two cannot disagree about what a valid
 * event is — the usual way an update ends up able to write something create
 * would have rejected.
 */
const readEventBody = (body, { requireDate = true } = {}) => {
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  if (!title) return { error: 'Give this event a name.' };
  if (title.length > 120) return { error: 'Keep the title under 120 characters.' };

  const notes = typeof body.notes === 'string' ? body.notes.trim() : '';
  if (notes.length > 500) return { error: 'Keep the notes under 500 characters.' };

  const type = TYPES.includes(body.type) ? body.type : 'Exam';

  const fields = { title, type, notes };

  if (requireDate || body.date !== undefined) {
    if (typeof body.date !== 'string' || !DATE_PATTERN.test(body.date)) {
      return { error: 'Pick a valid date.' };
    }
    fields.date = body.date;
  }

  return { fields };
};

// @desc    Every event this student has put on their calendar
// @route   GET /api/events
// @access  Private
const getEvents = async (req, res) => {
  try {
    const events = await CalendarEvent.find({ userId: req.user._id }).sort({ date: 1, createdAt: 1 });
    res.status(200).json(events);
  } catch (error) {
    res.status(error.status || 500).json(aiAwareBody(error));
  }
};

// @desc    Add an exam or event to a day
// @route   POST /api/events
// @access  Private
const createEvent = async (req, res) => {
  try {
    const { error, fields } = readEventBody(req.body);
    if (error) return res.status(400).json({ message: error });

    const event = await CalendarEvent.create({ userId: req.user._id, ...fields });
    const cleared = await clearEveOfExam(req.user._id, event.date, event.type);
    res.status(201).json({ ...event.toObject(), clearedToday: cleared });
  } catch (error) {
    res.status(error.status || 500).json(aiAwareBody(error));
  }
};

// @desc    Edit one
// @route   PUT /api/events/:id
// @access  Private
const updateEvent = async (req, res) => {
  try {
    const { error, fields } = readEventBody(req.body, { requireDate: false });
    if (error) return res.status(400).json({ message: error });

    // Scoped to the owner in the query itself, so one student can never edit
    // another's event by guessing an id.
    const event = await CalendarEvent.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      fields,
      // `returnDocument` rather than the older `new` flag, which Mongoose 9
      // warns about on every call.
      { returnDocument: 'after', runValidators: true }
    );

    if (!event) return res.status(404).json({ message: 'Event not found.' });
    const cleared = await clearEveOfExam(req.user._id, event.date, event.type);
    res.status(200).json({ ...event.toObject(), clearedToday: cleared });
  } catch (error) {
    res.status(error.status || 500).json(aiAwareBody(error));
  }
};

// @desc    Remove one
// @route   DELETE /api/events/:id
// @access  Private
const deleteEvent = async (req, res) => {
  try {
    const event = await CalendarEvent.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!event) return res.status(404).json({ message: 'Event not found.' });
    res.status(200).json({ message: 'Event deleted', _id: event._id });
  } catch (error) {
    res.status(error.status || 500).json(aiAwareBody(error));
  }
};

module.exports = { getEvents, createEvent, updateEvent, deleteEvent, TYPES };
