/**
 * Putting the student's own calendar entries into their own Google Calendar.
 *
 * Everything lands on one secondary calendar the app creates. Because the
 * grant is `calendar.app.created`, this code physically cannot read or write
 * the calendars a student already keeps — their personal one, a family one, a
 * school timetable someone shared with them. That is the point: they get their
 * exam dates on their phone without handing over the rest of their life, and
 * they can hide, recolour or delete our calendar without disturbing anything.
 */
const GoogleLink = require('./models/GoogleLink');
const { CALENDAR_NAME, CALENDAR_SCOPE } = require('./config');
const { accessTokenFor } = require('./oauth');
const { fireCalendarReset } = require('./hooks');

const BASE = 'https://www.googleapis.com/calendar/v3';

const call = async (url, token, init = {}) => {
  const res = await fetch(url, { ...init, headers: { Authorization: `Bearer ${token}`, ...(init.headers || {}) } });
  // A successful delete has no body at all, so do not try to read one.
  if (res.status === 204) return {};
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error?.message || `Google Calendar refused the request (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
};

/**
 * The link, but only when it can actually be used for calendars.
 *
 * A student who connected before calendar sync existed granted us Drive and
 * nothing else, as did one who unticked the calendar box on the consent
 * screen. Their link is perfectly valid and their certificates still save;
 * they simply have no calendar permission until they grant it. That is a quiet
 * no, not an error, so nothing here shouts about it.
 */
const usableLink = async (userId) => {
  const link = await GoogleLink.findOne({ userId }).lean();
  if (!link || link.needsReconnect) return null;
  if (!(link.scopes || []).includes(CALENDAR_SCOPE)) return null;
  return link;
};

/**
 * The app's calendar, made once and remembered. If the student deleted it we
 * make it again rather than failing: their account is theirs to tidy.
 */
const ensureCalendar = async (link, token) => {
  if (link.calendarId) {
    const still = await fetch(`${BASE}/calendars/${encodeURIComponent(link.calendarId)}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((r) => r.ok)
      .catch(() => false);
    if (still) return link.calendarId;

    // It was there and now it is not: the student deleted it. Every id we hold
    // for an event on it is dead, and anything holding one has to be told
    // before it decides those events are already synced. Google gives us no
    // way to look the old calendar up again — `calendar.app.created` cannot
    // list calendars — so a replacement is the only thing left to do.
    await fireCalendarReset(link.userId);
  }

  const made = await call(`${BASE}/calendars`, token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      summary: CALENDAR_NAME,
      description: 'Exams, deadlines and holidays you added in YATICORP Learning.'
    })
  });
  await GoogleLink.updateOne({ userId: link.userId }, { calendarId: made.id });
  return made.id;
};

/**
 * Google's `end.date` on an all-day event is exclusive: a single day ends on
 * the morning after. Send the same date twice and the event does not render.
 */
const dayAfter = (ymd) => {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
};

/**
 * All-day, always. A CalendarEvent stores 'YYYY-MM-DD' because the student
 * meant a square on a grid rather than an instant — see CalendarEvent.js — and
 * turning that into a timed event here would reintroduce exactly the timezone
 * drift that decision avoids.
 */
const bodyFor = (event) => ({
  summary: event.title,
  description: [event.type, event.notes].filter(Boolean).join('\n\n'),
  start: { date: event.date },
  end: { date: dayAfter(event.date) }
});

/**
 * Everything needed to write to one student's calendar, worked out once.
 *
 * Resolving it per event was a quiet waste: syncing thirty events meant thirty
 * link lookups, thirty token checks and thirty "does that calendar still
 * exist" round trips to Google before a single event was written — the fastest
 * way to be rate-limited for no benefit. Callers touching one event pay for
 * one setup; callers touching thirty pay for one as well.
 *
 * `create: false` for callers that only remove, so tidying up after a student
 * can never be the thing that conjures a calendar into their account.
 *
 * Returns null when this student has no usable calendar permission.
 */
const openCalendar = async (userId, { create = true } = {}) => {
  const link = await usableLink(userId);
  if (!link) return null;
  if (!create && !link.calendarId) return null;

  const token = await accessTokenFor(userId);
  if (!token) return null;

  const calendarId = await ensureCalendar(link, token);
  const path = `${BASE}/calendars/${encodeURIComponent(calendarId)}/events`;
  const headers = { 'Content-Type': 'application/json' };

  return {
    calendarId,

    /** Mirror one event across. Returns the Google event id to remember. */
    push: async (event) => {
      const body = JSON.stringify(bodyFor(event));

      if (event.googleEventId) {
        try {
          const updated = await call(`${path}/${encodeURIComponent(event.googleEventId)}`, token, {
            method: 'PATCH',
            headers,
            body
          });
          return { ok: true, id: updated.id };
        } catch (error) {
          // Gone from Google because the student deleted it there, or left
          // over from a calendar they have since disconnected. Make a fresh
          // one rather than leaving the two permanently out of step.
          if (error.status !== 404 && error.status !== 410) throw error;
        }
      }

      const made = await call(path, token, { method: 'POST', headers, body });
      return { ok: true, id: made.id };
    },

    /** Take one back off the calendar. Already gone counts as done. */
    remove: async (googleEventId) => {
      try {
        await call(`${path}/${encodeURIComponent(googleEventId)}`, token, { method: 'DELETE' });
      } catch (error) {
        if (error.status !== 404 && error.status !== 410) throw error;
      }
      return { ok: true };
    }
  };
};

/** One event, for the ordinary case of a student saving a single date. */
const pushEvent = async (userId, event) => {
  const calendar = await openCalendar(userId);
  if (!calendar) return { ok: false, reason: 'not-connected' };
  return calendar.push(event);
};

/**
 * One event, removed. Nothing to remove — no id, no calendar, no permission —
 * is success: the event is not on their calendar, which is what was asked.
 */
const removeEvent = async (userId, googleEventId) => {
  if (!googleEventId) return { ok: true };
  const calendar = await openCalendar(userId, { create: false });
  if (!calendar) return { ok: true };
  return calendar.remove(googleEventId);
};

/**
 * Take the app's calendar back out of the student's account.
 *
 * Called when they disconnect, before the grant is revoked — after revocation
 * there is no token left to do it with. It is a mirror, not their data: the
 * events still sit in this LMS, and a calendar left behind would quietly stop
 * updating while still looking authoritative on their phone. Removing it is
 * also what stops a reconnect from stacking up a second one, since the scope
 * gives us no way to find the old one again.
 */
const deleteCalendar = async (userId) => {
  const link = await usableLink(userId);
  if (!link || !link.calendarId) return { ok: true };

  const token = await accessTokenFor(userId);
  if (!token) return { ok: false, reason: 'not-connected' };

  try {
    await call(`${BASE}/calendars/${encodeURIComponent(link.calendarId)}`, token, { method: 'DELETE' });
  } catch (error) {
    // Already gone is the outcome we wanted anyway.
    if (error.status !== 404 && error.status !== 410) throw error;
  }
  await GoogleLink.updateOne({ userId }, { calendarId: '' });
  return { ok: true };
};

module.exports = { openCalendar, pushEvent, removeEvent, deleteCalendar };
