/**
 * An organization's access hours (Dashboard → Access hours): the days and the
 * daily window when its students may use YATICORP. Outside them a student
 * can still sign in, but every student API answers 423 PLATFORM_CLOSED and
 * the app shows when the platform opens (the user's ask, 2026-10-26).
 *
 * Times are the organization's wall clock (India by default), worked out
 * with Intl so the server's own time zone never matters. A window whose end
 * is before its start runs overnight (22:00–06:00), and belongs to the day
 * it starts on.
 */
const Organization = require('../models/Organization');

const DEFAULT_TIMEZONE = 'Asia/Kolkata';
const TIME = /^([01]\d|2[0-3]):([0-5]\d)$/;
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const minutesOf = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };

/** The organization's local date, day (0 = Sunday) and minute of the day, at `date`. */
const localParts = (date, timezone) => {
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
        .formatToParts(date).map((x) => [x.type, x.value]));
    return {
        y: Number(p.year), m: Number(p.month), d: Number(p.day),
        day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday),
        minute: Number(p.hour) * 60 + Number(p.minute)
    };
};

/** A checked schedule from what an admin sent, or { error }. */
const cleanSchedule = (input = {}) => {
    const enabled = Boolean(input.enabled);
    const days = [...new Set((Array.isArray(input.days) ? input.days : []).map(Number).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))].sort();
    const start = String(input.start || '');
    const end = String(input.end || '');
    if (enabled) {
        if (!days.length) return { error: 'Choose at least one day.' };
        if (!TIME.test(start) || !TIME.test(end)) return { error: 'Enter the opening and closing times.' };
        if (start === end) return { error: 'The closing time must differ from the opening time.' };
    }
    return { schedule: { enabled, days, start: TIME.test(start) ? start : '09:00', end: TIME.test(end) ? end : '17:00', timezone: DEFAULT_TIMEZONE } };
};

/**
 * Whether the platform is open under this schedule at `now`, and when it
 * next opens (or closes). { open, opensAt, closesAt } — a Date or null.
 */
const statusAt = (schedule, now = new Date()) => {
    if (!schedule?.enabled || !schedule.days?.length) return { open: true, opensAt: null, closesAt: null };
    const tz = schedule.timezone || DEFAULT_TIMEZONE;
    const start = minutesOf(schedule.start);
    const end = minutesOf(schedule.end);
    const overnight = end < start;
    const inWindow = (at) => {
        const { day, minute } = localParts(at, tz);
        if (!overnight) return schedule.days.includes(day) && minute >= start && minute < end;
        // Overnight: the evening of an open day, or the morning after one.
        return (schedule.days.includes(day) && minute >= start) || (schedule.days.includes((day + 6) % 7) && minute < end);
    };
    const open = inWindow(now);

    // The state changes only at an opening or closing time: try each of
    // those over the next eight days, in order, for the first that flips it.
    const here = localParts(now, tz);
    const offset = Math.round((Date.UTC(here.y, here.m - 1, here.d, Math.floor(here.minute / 60), here.minute % 60) - now.getTime()) / 60000);
    const midnight = Date.UTC(here.y, here.m - 1, here.d) - offset * 60000;
    const candidates = [];
    for (let k = 0; k <= 8; k += 1) for (const m of [start, end]) candidates.push(new Date(midnight + (k * 1440 + m) * 60000));
    const next = candidates.filter((c) => c > now).sort((x, y) => x - y).find((c) => inWindow(c) !== open) || null;
    return open ? { open, opensAt: null, closesAt: next } : { open, opensAt: next, closesAt: null };
};

/** "Monday to Friday, 9:00 am to 5:00 pm" for messages. */
const describe = (schedule) => {
    if (!schedule?.enabled) return 'Open all the time';
    const d = [...schedule.days].sort();
    const run = d.length > 2 && d.every((x, i) => i === 0 || x === d[i - 1] + 1);
    const days = d.length === 7 ? 'Every day' : run ? `${DAY_NAMES[d[0]]} to ${DAY_NAMES[d[d.length - 1]]}` : d.map((x) => DAY_NAMES[x]).join(', ');
    const fmt = (hhmm) => { const m = minutesOf(hhmm); const h = Math.floor(m / 60); return `${((h + 11) % 12) + 1}:${String(m % 60).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`; };
    return `${days}, ${fmt(schedule.start)} to ${fmt(schedule.end)}`;
};

// Organizations' schedules, kept 15 seconds: every student request asks. A
// change is dropped from this server's copy at once (forget); other server
// copies follow within the 15 seconds.
const cache = new Map();
const TTL = 15 * 1000;
const scheduleOf = async (organizationId) => {
    const key = String(organizationId);
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < TTL) return hit.value;
    const org = await Organization.findById(organizationId).select('name status accessSchedule').lean();
    const value = org && org.status === 'active' ? { name: org.name, schedule: org.accessSchedule || null } : null;
    cache.set(key, { at: Date.now(), value });
    return value;
};
const forget = (organizationId) => cache.delete(String(organizationId));

/** The access answer for one student: { applies, open, opensAt, closesAt, organization, hours }. */
const studentAccess = async (user, now = new Date()) => {
    if (!user?.organizationId) return { applies: false, open: true };
    const org = await scheduleOf(user.organizationId);
    if (!org?.schedule?.enabled) return { applies: false, open: true };
    return { applies: true, ...statusAt(org.schedule, now), organization: org.name, hours: describe(org.schedule) };
};

module.exports = { cleanSchedule, statusAt, describe, studentAccess, forget, DEFAULT_TIMEZONE };
