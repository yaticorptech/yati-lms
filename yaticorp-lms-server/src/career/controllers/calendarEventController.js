const CalendarEvent = require('../models/CalendarEvent');
const Task = require('../models/Task');
const { toISODate, startOfDay, addDays } = require('../services/dailyPlanService');
const { errorBody: aiAwareBody, statusFor } = require('../services/aiErrors');
const { openCalendar, pushEvent, removeEvent } = require('../../integrations/google/calendar');

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
 * Copy an event onto the student's Google Calendar, if they have linked one.
 *
 * Best-effort, always: this database is the record and Google is a
 * convenience. A student saving an exam date at midnight must never see it
 * fail because Google was slow, rate-limiting us, or down — so every failure
 * here is logged and swallowed, the row simply keeps no google id, and the
 * next edit tries again.
 *
 * `calendar` is passed in by callers mirroring more than one event, so the
 * whole batch shares a single setup rather than repeating it per event.
 */
const mirror = async (event, calendar = null) => {
  try {
    const result = calendar ? await calendar.push(event) : await pushEvent(event.userId, event);
    if (!result.ok) return false;
    if (!result.id || result.id === event.googleEventId) return true;

    // Claim the row for the copy we just made, and only if nobody has claimed
    // it since we read it. Two tabs opening the calendar at once both find the
    // event unsynced and both create one; without this the loser's copy is
    // orphaned on the student's calendar for ever, since only the id we store
    // is ever deleted. The claim is the arbiter, and the loser tidies up.
    // '' is accepted alongside the id we read because a calendar reset may
    // have blanked the row while this push was in flight — that is our own
    // doing, not another writer's, and must not be mistaken for losing a race.
    const claimed = await CalendarEvent.findOneAndUpdate(
      { _id: event._id, googleEventId: { $in: [event.googleEventId || '', ''] } },
      { googleEventId: result.id }
    );

    if (!claimed) {
      const remove = calendar ? calendar.remove(result.id) : removeEvent(event.userId, result.id);
      await remove.catch(() => {});
      return true;
    }

    event.googleEventId = result.id;
    return true;
  } catch (error) {
    console.error('[google] could not mirror event to calendar:', error.message);
    return false;
  }
};

/** The same, for one that has just been deleted here. */
const unmirror = async (userId, googleEventId) => {
  if (!googleEventId) return;
  try {
    await removeEvent(userId, googleEventId);
  } catch (error) {
    console.error('[google] could not remove event from calendar:', error.message);
  }
};

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

  // An omitted type is an Exam — that is what most students come here to add,
  // and the form opens on it. A type that was *sent* and is not one of ours is
  // a different matter: silently rewriting it to 'Exam' is the one fallback
  // with a side effect, because an exam clears the previous day's work. Every
  // other bad field here is refused with a message, so this one is too.
  if (body.type !== undefined && !TYPES.includes(body.type)) {
    return { error: `Pick one of: ${TYPES.join(', ')}.` };
  }
  const type = body.type ?? 'Exam';

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
    res.status(statusFor(error)).json(aiAwareBody(error));
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
    await mirror(event);
    res.status(201).json({ ...event.toObject(), clearedToday: cleared });
  } catch (error) {
    res.status(statusFor(error)).json(aiAwareBody(error));
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
    await mirror(event);
    res.status(200).json({ ...event.toObject(), clearedToday: cleared });
  } catch (error) {
    res.status(statusFor(error)).json(aiAwareBody(error));
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
    await unmirror(req.user._id, event.googleEventId);
    res.status(200).json({ message: 'Event deleted', _id: event._id });
  } catch (error) {
    res.status(statusFor(error)).json(aiAwareBody(error));
  }
};

/**
 * Push everything already on this calendar across to Google in one go.
 *
 * For the moment a student connects their account: without this, only events
 * they touch afterwards would ever appear, and a calendar that is mysteriously
 * half-full is worse than one that is empty.
 */
// @desc    Copy every event to the student's Google Calendar
// @route   POST /api/events/sync-google
// @access  Private
const syncToGoogle = async (req, res) => {
  try {
    // Resolved once for the whole batch: the link, the token and the calendar.
    const calendar = await openCalendar(req.user._id);
    if (!calendar) {
      return res.status(409).json({
        message: 'Connect your Google account and allow calendar access first.',
        reason: 'not-connected'
      });
    }

    const events = await CalendarEvent.find({ userId: req.user._id }).sort({ date: 1 });
    let synced = 0;
    // One at a time on purpose. A student has tens of events, not thousands,
    // and firing them all at once is the quickest way to be rate-limited.
    for (const event of events) {
      if (await mirror(event, calendar)) synced += 1;
    }
    const failed = events.length - synced;

    res.status(200).json({ ok: true, total: events.length, synced, failed });
  } catch (error) {
    res.status(statusFor(error)).json(aiAwareBody(error));
  }
};

module.exports = { getEvents, createEvent, updateEvent, deleteEvent, syncToGoogle, TYPES };
