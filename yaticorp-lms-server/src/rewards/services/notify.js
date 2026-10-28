/**
 * Two channels for a reward moment: the student bell (the career notification
 * feed the layout already merges) and the celebration queue the app polls
 * for popups. Both are best-effort — a notification failing must never fail
 * the activity that earned it.
 */
const Notification = require('../../career/models/Notification');
const { RewardEvent } = require('../models');

/*
 * Where the bell sends the student for each kind of reward notice. Every one
 * is a page the student app always has, whatever is locked: the wallet and the
 * leaderboard are cards on the dashboard, and XP, level and streak are the
 * "Your Progress" card on the profile. The badges page is Career Path's, so it
 * is only used while Career Path is open (see linkFor and noticeLink).
 */
const LINKS = {
  wallet: '/enrolled-courses#wallet',   // Wallet & Rewards is at the top of My Courses
  leaderboard: '/#leaderboard',
  progress: '/profile',
  competitions: '/competitions',
  badges: '/career/badges'
};

const careerOpen = async () => {
  try { return await require('../../career/middleware/featureGate').isCareerPathEnabled(); } catch { return false; }
};

/** The link for a kind of notice, as of now. */
const linkFor = async (kind) => {
  if (kind === 'badges') return (await careerOpen()) ? LINKS.badges : LINKS.progress;
  return LINKS[kind] || LINKS.progress;
};

/*
 * The kind of a notice that came without a link: the ones written before
 * links existed, and the callers outside this module that pass only a title
 * (Games & Competitions). Judged from the title, which is all they carry.
 */
const kindOf = (title = '') => {
  if (/wallet|withdrawal/i.test(title)) return 'wallet';
  if (/rank #\d+ last/i.test(title)) return 'leaderboard';
  if (/place!|competition|team|starts in/i.test(title)) return 'competitions';
  if (/badge|level up/i.test(title)) return 'badges';
  return 'progress';
};

/**
 * The link a stored reward notice should open, repaired at read time: one
 * saved without a link gets the one its title implies, and a Career Path link
 * becomes the profile while Career Path is locked (it would open a locked
 * screen otherwise).
 */
const noticeLink = (n, { careerIsOpen = true } = {}) => {
  let link = n.link || LINKS[kindOf(n.title)];
  if (!careerIsOpen && String(link).startsWith('/career')) link = LINKS.progress;
  return link;
};

// `type` is 'reward' for the rewards module's own notices; Games & Competitions
// passes 'competition', so the bell can say so and open the competition.
const notify = async (userId, title, message, link = null, type = 'reward') => {
  try {
    await Notification.create({ userId, title, message, type, link: link || (await linkFor(kindOf(title))) });
  } catch (e) { console.error('[rewards] notify failed:', e.message); }
};

const celebrate = async (userId, kind, title, message, payload = {}) => {
  try { return await RewardEvent.create({ userId, kind, title, message, payload }); } catch (e) { console.error('[rewards] event failed:', e.message); return null; }
};

module.exports = { notify, celebrate, linkFor, noticeLink, LINKS };
