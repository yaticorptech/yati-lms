/**
 * @description The device limit for students: one mobile and one computer (laptop, desktop or
 * tablet), plus a second computer when their organization gives them a residential card (a
 * computer lab and a home machine). A device is the browser or app that sent X-Device-Id (a
 * random id it keeps for good); without one, its user agent stands in.
 *
 * A device the student already has is let in; a new one takes a free slot of its kind; with no
 * slot free the sign-in is refused with the devices in that slot, and the student may remove one
 * (and so take its place) once a year. An administrator can clear them all (resetDevices).
 *
 * Exempt: an administrator viewing as the student, the demo/full-access cards, and the developer
 * test cards in DEVICE_LIMIT_EXEMPT_CARDS.
 */
const crypto = require('crypto');
const User = require('../models/User');

const YEAR_MS = 365 * 24 * 60 * 60 * 1000;

// "This student's devices changed" — for their open pages, on the live stream (src/live, topic 'devices').
const { EventEmitter } = require('events');
const bus = new EventEmitter();
bus.setMaxListeners(0);
const devicesChanged = (userId) => { if (userId) bus.emit(String(userId)); };
const onDevicesChange = (userId, fn) => { const k = String(userId); bus.on(k, fn); return () => bus.off(k, fn); };
const SEEN_EVERY_MS = 10 * 60 * 1000;   // how often lastSeenAt is written, at most

/** The device the request came from: { deviceId, kind, name }. */
const deviceOf = (req) => {
    const ua = String(req.headers['user-agent'] || '');
    const header = String(req.headers['x-device-id'] || '').trim();
    const deviceId = /^[A-Za-z0-9-]{8,80}$/.test(header) ? header : `ua-${crypto.createHash('sha256').update(ua).digest('hex').slice(0, 24)}`;
    // A tablet is a computer here; a phone is the mobile.
    const tablet = /iPad|Tablet|Nexus (7|9|10)|SM-T|Kindle|Silk/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua));
    const kind = !tablet && /Mobi|iPhone|iPod|Android.*Mobile|Windows Phone/i.test(ua) ? 'mobile' : 'computer';
    const sent = String(req.headers['x-device-name'] || '').replace(/[^\w .,()·+/-]/g, '').trim().slice(0, 60);
    return { deviceId, kind, name: sent || nameFromAgent(ua, kind), named: !!sent };
};

/** "Chrome on Windows", "Safari on iPhone" — from the user agent when the app sent no name. */
const nameFromAgent = (ua, kind) => {
    const browser = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'Browser';
    const os = /iPhone/.test(ua) ? 'iPhone' : /iPad/.test(ua) ? 'iPad' : /Android/.test(ua) ? 'Android' : /Windows/.test(ua) ? 'Windows' : /Mac OS X/.test(ua) ? 'Mac' : /CrOS/.test(ua) ? 'Chromebook' : /Linux/.test(ua) ? 'Linux' : kind === 'mobile' ? 'phone' : 'computer';
    return `${browser} on ${os}`;
};

const limitsFor = (user) => ({ mobile: 1, computer: user.residentialCard ? 2 : 1 });

/** When the student may next remove a device themselves, or null when they may now. */
const nextRemovalAt = (user) => {
    const last = user.deviceRemovedAt ? new Date(user.deviceRemovedAt).getTime() : 0;
    return last && Date.now() - last < YEAR_MS ? new Date(last + YEAR_MS) : null;
};

// Developer test cards with no device limit: DEVICE_LIMIT_EXEMPT_CARDS in .env, comma-separated.
const exemptCards = () => String(process.env.DEVICE_LIMIT_EXEMPT_CARDS || '').split(',').map((c) => c.trim()).filter(Boolean);

const exempt = async (user, impersonatedBy) => {
    if (impersonatedBy) return true;
    const cards = exemptCards();
    if (cards.length) {
        const card = user.cardNumber ?? (await User.findById(user._id).select('cardNumber').lean())?.cardNumber;
        if (card && cards.includes(String(card))) return true;
    }
    try { return require('./fullAccess').hasFullAccess(user); } catch { return false; }
};

const view = (d) => ({ deviceId: d.deviceId, kind: d.kind, name: d.name, addedAt: d.addedAt, lastSeenAt: d.lastSeenAt });

/**
 * Let this device in, registering it when a slot of its kind is free.
 * Returns { ok: true } or { ok: false, conflict } with what the popup needs.
 */
const admitDevice = async (user, device, { impersonatedBy = null } = {}) => {
    if (await exempt(user, impersonatedBy)) return { ok: true };
    const fresh = await User.findById(user._id).select('devices deviceRemovedAt residentialCard').lean();
    const devices = fresh?.devices || [];
    const mine = devices.find((d) => d.deviceId === device.deviceId);
    if (mine) {
        // A better name from the app (a phone's maker and model, learnt after its first request) replaces the old one.
        const rename = device.named && device.name && device.name !== mine.name;
        if (rename || Date.now() - new Date(mine.lastSeenAt || 0).getTime() > SEEN_EVERY_MS) {
            User.updateOne({ _id: user._id, 'devices.deviceId': device.deviceId }, { $set: { 'devices.$.lastSeenAt': new Date(), ...(rename ? { 'devices.$.name': device.name } : {}) } })
                .then(() => rename && devicesChanged(user._id)).catch(() => {});
        }
        return { ok: true };
    }
    const limit = limitsFor(fresh || user)[device.kind];
    const sameKind = devices.filter((d) => d.kind === device.kind);
    if (sameKind.length < limit) {
        // Conditional on the count, so two new devices at once cannot both take the last slot.
        const added = await User.updateOne(
            { _id: user._id, [`devices.${devices.length}`]: { $exists: false }, 'devices.deviceId': { $ne: device.deviceId } },
            { $push: { devices: { deviceId: device.deviceId, kind: device.kind, name: device.name, addedAt: new Date(), lastSeenAt: new Date() } } }
        );
        if (added.modifiedCount) { devicesChanged(user._id); return { ok: true }; }
        return admitDevice(user, device, { impersonatedBy });
    }
    return {
        ok: false,
        conflict: {
            kind: device.kind,
            newDevice: device.name,
            devices: sameKind.map(view),
            canRemoveAt: nextRemovalAt(fresh || user),
            residential: !!fresh?.residentialCard
        }
    };
};

/** Remove one of the student's devices (their yearly removal) and register this one in its place. */
const replaceDevice = async (userId, removeId, device) => {
    const user = await User.findById(userId).select('devices deviceRemovedAt residentialCard');
    if (!user) return { error: 'Account not found.', status: 404 };
    const at = nextRemovalAt(user);
    if (at) return { error: `You have already removed a device this year. You can remove one again on ${at.toDateString()}, or ask your organization to reset your devices.`, status: 403, canRemoveAt: at };
    const target = user.devices.find((d) => d.deviceId === removeId);
    if (!target) return { error: 'That device is not on your account.', status: 404 };
    if (target.kind !== device.kind) return { error: `Remove your ${device.kind === 'mobile' ? 'mobile' : 'computer'} to use this ${device.kind === 'mobile' ? 'mobile' : 'computer'}.`, status: 400 };
    user.devices = user.devices.filter((d) => d.deviceId !== removeId && d.deviceId !== device.deviceId);
    user.devices.push({ deviceId: device.deviceId, kind: device.kind, name: device.name, addedAt: new Date(), lastSeenAt: new Date() });
    user.deviceRemovedAt = new Date();
    await user.save({ validateBeforeSave: false });
    devicesChanged(userId);
    return { ok: true, removed: target.name };
};

// ─── One active sign-in at a time ───────────────────────────────────────────
// Every sign-in starts a new session and the token carries its id (sid); a request with an older
// one is refused, so a card shared with a friend cannot be used by two people at once. The
// previous device hears it at once on the live stream (topic 'session') and signs out.
const sessionBus = new EventEmitter();
sessionBus.setMaxListeners(0);
const onSessionChange = (userId, fn) => { const k = String(userId); sessionBus.on(k, fn); return () => sessionBus.off(k, fn); };

/** A new session for this sign-in: its id for the token, or null for an exempt account. */
const startSession = async (user) => {
    if (await exempt(user)) return null;
    const sid = crypto.randomBytes(12).toString('hex');
    await User.updateOne({ _id: user._id }, { $set: { activeSessionId: sid } });
    sessionBus.emit(String(user._id));
    return sid;
};

/** Whether this token's session is still the active one. */
const sessionCurrent = async (user, sid, impersonatedBy) => {
    if (impersonatedBy || !user.activeSessionId) return true;
    if (sid && sid === user.activeSessionId) return true;
    return exempt(user);
};

/** An administrator clears every device and the yearly removal, so the student starts afresh. */
const resetDevices = async (userId) => {
    await User.updateOne({ _id: userId }, { $set: { devices: [], deviceRemovedAt: null } });
    devicesChanged(userId);
};

/** The student's own view (Profile → My devices): theirs, which one this is, the limits. */
const myDevices = async (userId, currentId) => {
    const u = await User.findById(userId).select('devices deviceRemovedAt residentialCard').lean();
    return {
        devices: (u?.devices || []).map((d) => ({ ...view(d), current: [].concat(currentId).includes(d.deviceId) })),
        limits: limitsFor(u || {}),
        residentialCard: !!u?.residentialCard,
        canRemoveAt: u ? nextRemovalAt(u) : null
    };
};

/** The student removes another of their devices themselves: their one removal this year. */
const removeMyDevice = async (userId, deviceId, currentId) => {
    if ([].concat(currentId).includes(deviceId)) return { error: 'This is the device you are using. Sign out here instead.', status: 400 };
    const user = await User.findById(userId).select('devices deviceRemovedAt');
    if (!user) return { error: 'Account not found.', status: 404 };
    const at = nextRemovalAt(user);
    if (at) return { error: `You can remove a device once a year. Next on ${at.toDateString()}, or ask your organization to reset your devices.`, status: 403 };
    const target = user.devices.find((d) => d.deviceId === deviceId);
    if (!target) return { error: 'That device is not on your account.', status: 404 };
    user.devices = user.devices.filter((d) => d.deviceId !== deviceId);
    user.deviceRemovedAt = new Date();
    await user.save({ validateBeforeSave: false });
    devicesChanged(userId);
    return { ok: true, removed: target.name };
};

module.exports = { startSession, sessionCurrent, onSessionChange, devicesChanged, onDevicesChange, deviceOf, admitDevice, replaceDevice, resetDevices, limitsFor, nextRemovalAt, view, myDevices, removeMyDevice };
