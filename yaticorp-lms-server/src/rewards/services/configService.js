/**
 * Read and write the admin rulebook, cached for 30s the way the feature gates
 * are. Any write clears the cache directly; the TTL only covers a second
 * server process holding a stale copy.
 */
const Setting = require('../../models/Setting');
const { RewardConfig, RewardBadge } = require('../models');
const C = require('../config/constants');

const TTL_MS = 30 * 1000;
let cached = null;
let cachedAt = 0;

const invalidate = () => { cached = null; cachedAt = 0; };

const toPlain = (doc) => {
  const o = doc.toObject ? doc.toObject() : doc;
  return { ...o, xpRules: Object.fromEntries(doc.xpRules instanceof Map ? doc.xpRules : Object.entries(o.xpRules || {})) };
};

const getConfig = async () => {
  if (cached && Date.now() - cachedAt < TTL_MS) return cached;
  let doc = await RewardConfig.findOne();
  if (!doc) doc = await RewardConfig.create({});
  const settings = await Setting.findOne().select('isRewardsEnabled').lean();
  cached = { ...toPlain(doc), enabled: settings ? settings.isRewardsEnabled !== false : true };
  cachedAt = Date.now();
  return cached;
};

const isEnabled = async () => (await getConfig()).enabled;

// Only the keys an admin may set, each checked, so a typo in the panel cannot
// wipe the rulebook or store a negative payout.
const num = (v, min = 0) => { const n = Number(v); return Number.isFinite(n) && n >= min ? n : null; };

const updateConfig = async (body) => {
  const doc = (await RewardConfig.findOne()) || new RewardConfig();
  const errors = [];

  if (body.xpRules && typeof body.xpRules === 'object') {
    for (const [k, v] of Object.entries(body.xpRules)) {
      if (!C.ACTIVITY_TYPES.includes(k)) continue;
      const n = num(v); if (n === null) { errors.push(`xpRules.${k} must be a number ≥ 0`); continue; }
      doc.xpRules.set(k, Math.round(n));
    }
  }
  if (Array.isArray(body.levelThresholds)) {
    const t = body.levelThresholds.map((v) => num(v));
    if (t.length < 2 || t.some((v) => v === null) || t[0] !== 0 || t.some((v, i) => i > 0 && v <= t[i - 1])) {
      errors.push('levelThresholds must start at 0 and strictly increase');
    } else doc.levelThresholds = t.map(Math.round);
  }
  if (Array.isArray(body.streakMilestones)) {
    const ms = body.streakMilestones.map((m) => ({ days: num(m.days, 1), rewardPoints: num(m.rewardPoints), xp: num(m.xp) }));
    if (ms.some((m) => m.days === null || m.rewardPoints === null || m.xp === null)) errors.push('streakMilestones entries need days ≥ 1 and non-negative points/xp');
    else {
      const days = new Set();
      for (const m of ms) { if (days.has(m.days)) errors.push(`duplicate streak milestone for ${m.days} days`); days.add(m.days); }
      if (!errors.length) doc.streakMilestones = ms.sort((a, b) => a.days - b.days);
    }
  }
  if (body.leaderboardRewards && typeof body.leaderboardRewards === 'object') {
    for (const period of ['weekly', 'monthly']) {
      if (!Array.isArray(body.leaderboardRewards[period])) continue;
      const rs = body.leaderboardRewards[period].map((r) => ({ rank: num(r.rank, 1), rewardPoints: num(r.rewardPoints) }));
      if (rs.some((r) => r.rank === null || r.rewardPoints === null)) errors.push(`leaderboardRewards.${period} entries need rank ≥ 1 and points ≥ 0`);
      else doc.leaderboardRewards[period] = rs.sort((a, b) => a.rank - b.rank);
    }
  }
  if (body.conversion && typeof body.conversion === 'object') {
    const c = body.conversion;
    if (c.pointsPerUnit !== undefined) { const n = num(c.pointsPerUnit, 1); n === null ? errors.push('conversion.pointsPerUnit must be ≥ 1') : (doc.conversion.pointsPerUnit = Math.round(n)); }
    if (c.unitValue !== undefined) { const n = num(c.unitValue); n === null ? errors.push('conversion.unitValue must be ≥ 0') : (doc.conversion.unitValue = n); }
    if (c.minRedeemPoints !== undefined) { const n = num(c.minRedeemPoints); n === null ? errors.push('conversion.minRedeemPoints must be ≥ 0') : (doc.conversion.minRedeemPoints = Math.round(n)); }
    if (typeof c.currency === 'string' && c.currency.trim()) doc.conversion.currency = c.currency.trim().toUpperCase().slice(0, 3);
  }
  if (body.limits && typeof body.limits === 'object') {
    for (const k of ['monthlyCashCap', 'minWithdrawal', 'maxWithdrawal']) {
      if (body.limits[k] === undefined) continue;
      const n = num(body.limits[k]); n === null ? errors.push(`limits.${k} must be ≥ 0`) : (doc.limits[k] = n);
    }
  }
  if (body.walletAccess && Array.isArray(body.walletAccess.allowedAccountTypes)) {
    const bad = body.walletAccess.allowedAccountTypes.filter((t) => !C.ACCOUNT_TYPES.includes(t));
    if (bad.length) errors.push(`unknown account types: ${bad.join(', ')}`);
    else doc.walletAccess.allowedAccountTypes = [...new Set(body.walletAccess.allowedAccountTypes)];
  }

  if (errors.length) { const e = new Error(errors.join('; ')); e.status = 400; throw e; }
  await doc.save();
  invalidate();
  return getConfig();
};

// Level for an XP total under a threshold table; past the table, each level
// costs the same as the last configured gap so the ladder never ends.
const levelFor = (xp, thresholds = C.DEFAULT_LEVEL_THRESHOLDS) => {
  const t = thresholds && thresholds.length >= 2 ? thresholds : C.DEFAULT_LEVEL_THRESHOLDS;
  const x = Math.max(0, Number(xp) || 0);
  let level = 1;
  for (let i = 0; i < t.length; i++) if (x >= t[i]) level = i + 1;
  if (x >= t[t.length - 1]) {
    const gap = Math.max(1, t[t.length - 1] - t[t.length - 2]);
    level = t.length + Math.floor((x - t[t.length - 1]) / gap);
  }
  return level;
};

const levelFloor = (level, thresholds = C.DEFAULT_LEVEL_THRESHOLDS) => {
  const t = thresholds && thresholds.length >= 2 ? thresholds : C.DEFAULT_LEVEL_THRESHOLDS;
  if (level <= 1) return 0;
  if (level <= t.length) return t[level - 1];
  const gap = Math.max(1, t[t.length - 1] - t[t.length - 2]);
  return t[t.length - 1] + (level - t.length) * gap;
};

// Everything a progress bar needs: where this level starts, where the next
// one does, and how far along the student is.
const levelInfo = (xp, thresholds) => {
  const level = levelFor(xp, thresholds);
  const floor = levelFloor(level, thresholds);
  const ceiling = levelFloor(level + 1, thresholds);
  const span = Math.max(1, ceiling - floor);
  const into = Math.max(0, xp - floor);
  return { level, xp, floor, ceiling, into, span, remaining: Math.max(0, ceiling - xp), nextLevel: level + 1, percent: Math.min(100, Math.max(0, Math.round((into / span) * 100))) };
};

// Keep the badge catalogue populated; upsert by key so a new default badge
// reaches databases that were seeded before it existed. Admin edits win
// because only missing badges are inserted ($setOnInsert).
let badgesSeeded = false;
const seedBadges = async () => {
  if (badgesSeeded) return;
  await Promise.all(C.DEFAULT_BADGES.map((b) => RewardBadge.updateOne({ key: b.key }, { $setOnInsert: b }, { upsert: true })));
  badgesSeeded = true;
};

module.exports = { getConfig, isEnabled, updateConfig, invalidate, levelFor, levelFloor, levelInfo, seedBadges };
