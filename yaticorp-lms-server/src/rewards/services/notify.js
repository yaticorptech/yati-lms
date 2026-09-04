/**
 * Two channels for a reward moment: the student bell (the career notification
 * feed the layout already merges) and the celebration queue the app polls
 * for popups. Both are best-effort — a notification failing must never fail
 * the activity that earned it.
 */
const Notification = require('../../career/models/Notification');
const { RewardEvent } = require('../models');

const notify = async (userId, title, message) => {
  try { await Notification.create({ userId, title, message, type: 'reward' }); } catch (e) { console.error('[rewards] notify failed:', e.message); }
};

const celebrate = async (userId, kind, title, message, payload = {}) => {
  try { return await RewardEvent.create({ userId, kind, title, message, payload }); } catch (e) { console.error('[rewards] event failed:', e.message); return null; }
};

module.exports = { notify, celebrate };
