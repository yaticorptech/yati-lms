/**
 * Games hours (2026-11-14): an organization sets when its students may play the brain games and the
 * group games — which days, and on each an optional window (4:00 pm to 6:00 pm) and/or a number of
 * minutes (45 minutes a day). Outside them the games answer 423 GAMES_CLOSED, and the student sees
 * when they next open, or asks the organization to let them play; a grant opens them until a time.
 *
 * Organization.gamesSchedule / gamesRequests. India time, like the rest of the platform. The
 * minutes count the brain games and the group games together (career_game_play_time and
 * career_group_play_time, the heartbeats both already send).
 *
 * Org admin:  GET|PUT /api/organizations/me/games-hours, POST /me/games-hours/requests/:id
 * Student:    GET /api/career/games/time (as `organization`), POST /api/organizations/student/games-access
 */
const express = require('express');
const Organization = require('../organizations/models/Organization');
const User = require('../models/User');

const TIME = /^([01]\d|2[0-3]):([0-5]\d)$/;
const IST = 330;                          // minutes ahead of UTC
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MAX_REQUESTS = 300;
const mins = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
const clock = (m) => { const h = Math.floor(m / 60) % 24; return `${((h + 11) % 12) + 1}:${String(m % 60).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`; };

/** India's day (0 = Sunday), minute of the day and that day's midnight (a Date), at `now`. */
const here = (now) => {
    const t = new Date(now.getTime() + IST * 60000);
    return { day: t.getUTCDay(), minute: t.getUTCHours() * 60 + t.getUTCMinutes(), midnight: new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate()) - IST * 60000) };
};
const windowOf = (d) => ({ from: d.start ? mins(d.start) : 0, to: d.end ? mins(d.end) : 1440 });

/** A checked schedule from what the organization sent, or { error }. */
const clean = (input = {}) => {
    const enabled = Boolean(input.enabled);
    const seen = new Set();
    const days = [];
    for (const raw of Array.isArray(input.days) ? input.days : []) {
        const day = Number(raw?.day);
        if (!Number.isInteger(day) || day < 0 || day > 6 || seen.has(day)) continue;
        const start = String(raw.start || '').trim();
        const end = String(raw.end || '').trim();
        const minutes = Math.round(Number(raw.minutes) || 0);
        if ((start && !TIME.test(start)) || (end && !TIME.test(end))) return { error: `${DAY_NAMES[day]}: enter the times as hours and minutes.` };
        if (start && end && mins(end) <= mins(start)) return { error: `${DAY_NAMES[day]}: the end time must be after the start time.` };
        if (minutes < 0 || minutes > 1440) return { error: `${DAY_NAMES[day]}: 0 to 1440 minutes.` };
        // One rule a day (2026-11-14): a time window, or minutes — not both.
        if ((start || end) && minutes > 0) return { error: `${DAY_NAMES[day]}: choose between times or minutes a day, not both.` };
        seen.add(day);
        days.push({ day, start, end, minutes });
    }
    if (enabled && !days.length) return { error: 'Open at least one day, or turn games hours off.' };
    return { schedule: { enabled, days: days.sort((a, b) => a.day - b.day) } };
};

/** "4:00 pm – 6:00 pm · 45 min", "All day", for one day. */
const dayWords = (d) => {
    const parts = [];
    if (d.start || d.end) parts.push(`${clock(windowOf(d).from)} – ${clock(windowOf(d).to)}`);
    else parts.push('All day');
    if (d.minutes) parts.push(`${d.minutes} min`);
    return parts.join(' · ');
};
const week = (schedule) => [1, 2, 3, 4, 5, 6, 0].map((day) => {
    const d = (schedule?.days || []).find((x) => x.day === day);
    return { day, name: DAY_NAMES[day], open: Boolean(d), words: d ? dayWords(d) : 'Closed', ...(d && (d.start || d.end) ? windowOf(d) : {}), ...(d?.minutes ? { minutes: d.minutes } : {}) };
});

/** The next moment games open after `now`, skipping today when `skipToday` (its minutes are used up). */
const nextOpening = (schedule, now, skipToday) => {
    const h = here(now);
    for (let k = 0; k <= 7; k += 1) {
        const day = (h.day + k) % 7;
        const d = schedule.days.find((x) => x.day === day);
        if (!d || (k === 0 && skipToday)) continue;
        const { from, to } = windowOf(d);
        const at = new Date(h.midnight.getTime() + (k * 1440 + from) * 60000);
        if (k === 0) { if (h.minute < from) return at; if (h.minute < to) return now; continue; }
        return at;
    }
    return null;
};

// Schedules kept 15 seconds per organization: every heartbeat asks.
const cache = new Map();
const scheduleOf = async (orgId) => {
    const key = String(orgId);
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < 15000) return hit.value;
    const org = await Organization.findById(orgId).select('name status gamesSchedule').lean();
    const value = org && org.status === 'active' ? { name: org.name, schedule: org.gamesSchedule } : null;
    cache.set(key, { at: Date.now(), value });
    return value;
};
const forget = (orgId) => cache.delete(String(orgId));

/** Seconds of brain + group games played today. */
const usedToday = async (userId) => {
    const { dayKey } = require('../rewards/config/constants');
    const day = dayKey();
    const [a, b] = await Promise.all([
        require('../career/models/GamePlayTime').findOne({ userId, day }).select('seconds').lean(),
        require('../career/models/GroupPlayTime').findOne({ userId, day }).select('seconds').lean()
    ]);
    return Math.round((a?.seconds || 0) + (b?.seconds || 0));
};

/**
 * One student's answer: { applies:false } with no organization or no hours, else
 * { applies, open, reason: 'closed-day'|'before'|'after'|'time-up'|null, opensAt, closesAt,
 *   limitSeconds, usedSeconds, remainingSeconds, today, week, organization, request, grantedUntil }.
 */
const statusFor = async (userOrId, now = new Date()) => {
    const user = userOrId?.organizationId !== undefined ? userOrId : await User.findById(userOrId).select('organizationId').lean();
    if (!user?.organizationId) return { applies: false, open: true };
    const org = await scheduleOf(user.organizationId);
    const schedule = org?.schedule;
    if (!schedule?.enabled || !schedule.days?.length) return { applies: false, open: true };

    const h = here(now);
    const today = schedule.days.find((x) => x.day === h.day) || null;
    const used = today?.minutes ? await usedToday(user._id) : 0;
    const limit = today?.minutes ? today.minutes * 60 : 0;
    const base = { applies: true, organization: org.name, week: week(schedule), today: today ? dayWords(today) : 'Closed today', limitSeconds: limit, usedSeconds: used, remainingSeconds: limit ? Math.max(0, limit - used) : null };

    // A request today, and a grant still running.
    const reqDoc = await Organization.findById(user.organizationId).select('gamesRequests').lean();
    const mine = (reqDoc?.gamesRequests || []).filter((r) => String(r.userId) === String(user._id));
    const latest = mine.filter((r) => r.at >= h.midnight).pop() || null;
    const grantedUntil = mine.filter((r) => r.status === 'granted' && r.until > now).map((r) => r.until).sort((x, y) => y - x)[0] || null;
    base.request = latest ? { status: latest.status, at: latest.at, until: latest.until } : null;
    base.grantedUntil = grantedUntil;
    if (grantedUntil) return { ...base, open: true, reason: 'granted', opensAt: null, closesAt: grantedUntil, remainingSeconds: null };

    let reason = null;
    if (!today) reason = 'closed-day';
    else {
        const { from, to } = windowOf(today);
        if (h.minute < from) reason = 'before';
        else if (h.minute >= to) reason = 'after';
        else if (limit && used >= limit) reason = 'time-up';
    }
    if (reason) return { ...base, open: false, reason, opensAt: nextOpening(schedule, now, reason === 'time-up' || reason === 'after'), closesAt: null };
    const { to } = windowOf(today);
    const endOfWindow = new Date(h.midnight.getTime() + to * 60000);
    const endOfMinutes = limit ? new Date(now.getTime() + (limit - used) * 1000) : null;
    return { ...base, open: true, reason: null, opensAt: null, closesAt: endOfMinutes && endOfMinutes < endOfWindow ? endOfMinutes : endOfWindow };
};

/** The words a refusal carries. */
const closedMessage = (s) => {
    const when = s.opensAt ? ` They open again ${new Date(s.opensAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'long', hour: 'numeric', minute: '2-digit' })}.` : '';
    if (s.reason === 'time-up') return `Today's games time from ${s.organization} is used up.${when}`;
    return `${s.organization} has closed the games for now.${when}`;
};
/** 423 when the student's organization has closed the games; true when it answered. */
const refuseIfClosed = async (req, res) => {
    try {
        const s = await statusFor(req.user);
        if (s.applies && !s.open) { res.status(423).json({ code: 'GAMES_CLOSED', message: closedMessage(s), organization: s }); return true; }
    } catch (err) { console.error('[games hours] check failed:', err.message); }
    return false;
};

/* ---- The organization's side --------------------------------------------- */
const orgAdmin = express.Router();
const answer = async (orgId) => {
    const org = await Organization.findById(orgId).select('gamesSchedule gamesRequests').lean();
    const schedule = { enabled: Boolean(org?.gamesSchedule?.enabled), days: org?.gamesSchedule?.days || [] };
    const recent = (org?.gamesRequests || []).slice(-60).reverse();
    const users = await User.find({ _id: { $in: recent.map((r) => r.userId) } }).select('name email cardNumber profilePicture').lean();
    const who = Object.fromEntries(users.map((u) => [String(u._id), u]));
    return {
        schedule, week: week(schedule),
        requests: recent.filter((r) => who[String(r.userId)]).map((r) => ({ _id: r._id, note: r.note, status: r.status, until: r.until, at: r.at, decidedAt: r.decidedAt, student: { _id: r.userId, name: who[String(r.userId)].name, cardNumber: who[String(r.userId)].cardNumber || '', picture: who[String(r.userId)].profilePicture || '' } }))
    };
};
orgAdmin.get('/', async (req, res) => {
    try { res.json(await answer(req.organization._id)); }
    catch (err) { console.error('[games hours] load:', err.message); res.status(500).json({ message: 'The games hours could not be loaded.' }); }
});
orgAdmin.put('/', async (req, res) => {
    try {
        const { schedule, error } = clean(req.body || {});
        if (error) return res.status(400).json({ message: error });
        await Organization.updateOne({ _id: req.organization._id }, { $set: { gamesSchedule: schedule } });
        forget(req.organization._id);
        await require('../organizations/models/OrgAuditLog').record({ orgId: req.organization._id, admin: req.admin, action: 'games-hours', req, details: schedule }).catch(() => {});
        res.json({ ...(await answer(req.organization._id)), message: schedule.enabled ? 'Saved. Students can play only in these hours.' : 'Saved. Games are open at any time.' });
    } catch (err) { console.error('[games hours] save:', err.message); res.status(500).json({ message: 'The games hours could not be saved.' }); }
});
// { decision: 'grant' | 'decline', minutes? } — a grant opens the games for that many minutes
// (default: to the end of the day).
orgAdmin.post('/requests/:id', async (req, res) => {
    try {
        const { decision } = req.body || {};
        if (!['grant', 'decline'].includes(decision)) return res.status(400).json({ message: 'Choose allow or decline.' });
        const org = await Organization.findOne({ _id: req.organization._id, 'gamesRequests._id': req.params.id }).select({ 'gamesRequests.$': 1 }).lean();
        const r = org?.gamesRequests?.[0];
        if (!r) return res.status(404).json({ message: 'That request was not found.' });
        if (r.status !== 'pending') return res.status(409).json({ message: 'That request was already answered.' });
        const now = new Date();
        const minutes = Math.round(Number(req.body.minutes) || 0);
        const endOfDay = new Date(here(now).midnight.getTime() + 1440 * 60000);
        const until = decision === 'grant' ? (minutes > 0 ? new Date(Math.min(now.getTime() + minutes * 60000, now.getTime() + 24 * 3600000)) : endOfDay) : null;
        await Organization.updateOne({ _id: req.organization._id, 'gamesRequests._id': r._id },
            { $set: { 'gamesRequests.$.status': decision === 'grant' ? 'granted' : 'declined', 'gamesRequests.$.until': until, 'gamesRequests.$.decidedAt': now } });
        const u = await User.findById(r.userId).select('name').lean();
        res.json({ ...(await answer(req.organization._id)), message: decision === 'grant' ? `${u?.name || 'The student'} can play until ${until.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit' })}.` : 'Declined.' });
    } catch (err) { console.error('[games hours] decide:', err.message); res.status(500).json({ message: 'That did not go through.' }); }
});

/* ---- The student's side --------------------------------------------------- */
// POST /api/organizations/student/games-access { note } — one waiting request at a time.
const askToPlay = async (req, res) => {
    try {
        const s = await statusFor(req.user);
        if (!s.applies || s.open) return res.status(400).json({ message: 'The games are open for you now.' });
        if (s.request?.status === 'pending') return res.status(409).json({ message: 'You already asked. Your organization will answer soon.' });
        const note = String(req.body?.note || '').trim().slice(0, 200);
        await Organization.updateOne({ _id: req.user.organizationId }, { $push: { gamesRequests: { $each: [{ userId: req.user._id, note, status: 'pending', at: new Date() }], $slice: -MAX_REQUESTS } } });
        res.status(201).json({ message: 'Asked. You can play as soon as your organization allows it.', organization: await statusFor(req.user) });
    } catch (err) { console.error('[games hours] ask:', err.message); res.status(500).json({ message: 'Your request could not be sent.' }); }
};

module.exports = { statusFor, refuseIfClosed, closedMessage, orgAdmin, askToPlay, clean, forget };
