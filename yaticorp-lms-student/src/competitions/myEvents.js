/**
 * My own calendar events (2026-11-04): the Career Path calendar's events (server: career CalendarEvent, /api/career/
 * events), with a time, a reminder and, for a competition, its page. Added from the Competitions calendar; their
 * reminders pop up anywhere in the app (ReminderPopup.jsx).
 */
import careerApi from '../career/services/api';

export const CHANGED = 'yati:my-events-changed';
const changed = () => window.dispatchEvent(new Event(CHANGED));

export const REMINDERS = [['', 'No reminder'], ['0', 'At the time'], ['10', '10 minutes before'], ['30', '30 minutes before'], ['60', '1 hour before'], ['1440', '1 day before']];

/** The instant on my own clock: the day, at its time (or 9 am without one). */
export const whenOf = (date, time) => { const [y, m, d] = date.split('-').map(Number); const [h, mi] = (time || '09:00').split(':').map(Number); return new Date(y, m - 1, d, h, mi); };

export const myEvents = {
    list: () => careerApi.get('/events').then((r) => (Array.isArray(r.data) ? r.data : [])),
    add: ({ title, date, time, remindBefore, link, notes }) => {
        const remindAt = remindBefore === '' || remindBefore == null ? null : new Date(whenOf(date, time).getTime() - Number(remindBefore) * 60000).toISOString();
        return careerApi.post('/events', { title, date, time: time || '', remindAt, link: link || '', notes: notes || '', type: 'Competition' }).then((r) => { changed(); return r.data; });
    },
    remove: (id) => careerApi.delete(`/events/${id}`).then(() => changed()),
    reminded: (id) => careerApi.post(`/events/${id}/reminded`).then(() => changed()).catch(() => {})
};
