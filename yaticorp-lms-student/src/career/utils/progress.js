/**
 * Progress + momentum math.
 *
 * Levels follow the admin's ladder (Rewards → Level thresholds), the same
 * table the server levels students with — see levelFor/levelInfo in
 * yaticorp-lms-server/src/rewards/services/configService.js, which the
 * functions below mirror line for line. This file used to carry its own copy
 * of the ladder; the first time an admin edited theirs, every ring and "XP to
 * next level" in the app read a different number from the server.
 *
 * The thresholds arrive from the server (useLevelProgress fetches them), so
 * pass them in where you have them. Called without, levelProgress uses the
 * last ladder any screen loaded, and before one has loaded it says so
 * (`known: false`) rather than guessing.
 */
import { uiLocale } from '../../i18n/translator';

const isLadder = (t) => Array.isArray(t) && t.length >= 2 && t.every((n) => Number.isFinite(Number(n)));

let lastLadder = null;

/** Keep the ladder a screen just loaded, for callers that cannot pass one. */
export function rememberLevelThresholds(thresholds) {
  if (isLadder(thresholds)) lastLadder = thresholds.map(Number);
}

/** The last ladder loaded this session, or null. */
export const knownLevelThresholds = () => lastLadder;

/** The level an XP total reaches. Past the table each level costs the last gap. */
export function levelFor(xp, thresholds) {
  const t = thresholds;
  const x = Math.max(0, Number(xp) || 0);
  let level = 1;
  for (let i = 0; i < t.length; i++) if (x >= t[i]) level = i + 1;
  if (x >= t[t.length - 1]) {
    const gap = Math.max(1, t[t.length - 1] - t[t.length - 2]);
    level = t.length + Math.floor((x - t[t.length - 1]) / gap);
  }
  return level;
}

/** XP at which `level` begins. */
export function levelFloor(level, thresholds) {
  const t = thresholds;
  if (level <= 1) return 0;
  if (level <= t.length) return t[level - 1];
  const gap = Math.max(1, t[t.length - 1] - t[t.length - 2]);
  return t[t.length - 1] + (level - t.length) * gap;
}

/**
 * Where the user sits inside their current level.
 * Returns the XP earned into this level, the size of the level, and a 0-100
 * percentage suitable for a ring or bar.
 *
 * The level is worked out from the XP, as the server does, so the ring and
 * the "to next level" figure can never disagree with each other; `level` is
 * only the answer to fall back on while the ladder is unknown.
 */
export function levelProgress(xp = 0, level = 1, thresholds) {
  const safeXp = Math.max(0, Number(xp) || 0);
  const ladder = isLadder(thresholds) ? thresholds.map(Number) : lastLadder;

  if (!ladder) {
    // Not loaded yet. An empty ring for a moment, never a made-up distance.
    const current = Math.max(1, Number(level) || 1);
    return {
      known: false, level: current, into: 0, span: 1, xp: safeXp,
      ceiling: safeXp, remaining: 0, nextLevel: current + 1, percent: 0
    };
  }

  const current = levelFor(safeXp, ladder);
  const floor = levelFloor(current, ladder);
  const ceiling = levelFloor(current + 1, ladder);
  const span = Math.max(1, ceiling - floor);
  const into = Math.max(0, safeXp - floor);

  return {
    known: true,
    level: current,
    into,
    span,
    // The same progress said the other way: the student's running total, and
    // the total the next level begins at.
    //
    // Both framings are correct and the app used to mix them — the calendar
    // hero said "90 / 200 XP" while the sidebar beside it said "190 / 300 XP"
    // for the same student at the same moment, which reads as a bug whichever
    // one you trust. Every "X / Y XP" in the app now uses this pair; `into`
    // and `span` stay for the bars, which need a proportion rather than a
    // label.
    xp: safeXp,
    ceiling,
    remaining: Math.max(0, ceiling - safeXp),
    nextLevel: current + 1,
    percent: Math.max(0, Math.min(100, Math.round((into / span) * 100)))
  };
}

/**
 * The platform's timezone: the day Career Path's plan, the rewards streak and
 * the AI allowance all turn over in. Mirrors REWARDS_TIMEZONE on the server
 * (Asia/Kolkata unless a deployment sets otherwise — set
 * VITE_PLATFORM_TIMEZONE to the same value there). Tasks now arrive with
 * their own `day` and `completedDay` worked out by the server, which is the
 * authority; this is only for "today" and for older answers without them.
 */
export const PLATFORM_TIMEZONE = import.meta.env?.VITE_PLATFORM_TIMEZONE || 'Asia/Kolkata';

let dayFormat = null;
const platformFormat = () => {
  if (dayFormat) return dayFormat;
  try {
    dayFormat = new Intl.DateTimeFormat('en-CA', { timeZone: PLATFORM_TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit' });
  } catch {
    // An unknown zone name: the device's own day, which is what this was before.
    dayFormat = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' });
  }
  return dayFormat;
};

/**
 * The platform day an instant falls on, as 'YYYY-MM-DD'.
 *
 * This used to be the DEVICE's date, while the server stamps every task with
 * the platform's midnight — so on a phone set to any other timezone, a task
 * finished late in the evening landed on tomorrow's square and the streak
 * strip counted it on the wrong day. Deliberately not toISOString, which is
 * UTC and wrong for everyone.
 */
export function dayKey(date) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  return platformFormat().format(d);
}

/** Today, on the platform's calendar. */
export const todayKey = () => dayKey(new Date());

/** Shift a 'YYYY-MM-DD' key by whole days. Plain date arithmetic — no zones. */
export function shiftKey(key, delta) {
  const [y, m, d] = String(key).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + delta)).toISOString().slice(0, 10);
}

/** A key as a Date to label (weekday names and the like), at midday UTC so no zone moves it. */
export const keyAsDate = (key) => new Date(`${key}T12:00:00Z`);

/** The platform day a task belongs to: the server's `day`, or worked out the same way. */
export function taskDay(task) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(task?.day || '')) return task.day;
  const at = task?.assignedDate || task?.createdAt;
  return at ? dayKey(at) : null;
}

/** The date a task should be credited to. Tasks completed before `completedAt`
 *  existed fall back to updatedAt, which is the best signal available. */
function completionDate(task) {
  return task.completedAt || task.updatedAt || task.createdAt;
}

/** The platform day a task was finished on: the server's `completedDay`, or worked out. */
export function completedDay(task) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(task?.completedDay || '')) return task.completedDay;
  return dayKey(completionDate(task));
}

/** Set of day keys on which at least one task was completed. */
export function activeDays(tasks = []) {
  const days = new Set();
  for (const task of tasks) {
    if (task.status !== 'Completed') continue;
    const key = completedDay(task);
    if (key) days.add(key);
  }
  return days;
}

/**
 * Consecutive days ending today. A gap yesterday but activity today still
 * counts as 1; a gap today with activity yesterday keeps the streak alive
 * (it is not broken until a full day passes with nothing done).
 */
export function currentStreak(tasks = []) {
  const days = activeDays(tasks);
  if (days.size === 0) return 0;

  const today = todayKey();
  // Anchor on today if there's activity, otherwise yesterday — so a streak
  // isn't reported as broken simply because it's early in the day.
  let cursor = days.has(today) ? today : shiftKey(today, -1);
  if (!days.has(cursor)) return 0;

  let streak = 0;
  while (days.has(cursor)) {
    streak += 1;
    cursor = shiftKey(cursor, -1);
  }
  return streak;
}

/** Last `count` days, oldest first, each flagged with whether work happened. */
export function recentActivity(tasks = [], count = 7) {
  const days = activeDays(tasks);
  const today = todayKey();

  return Array.from({ length: count }, (_, i) => {
    const key = shiftKey(today, -(count - 1 - i));
    return {
      key,
      label: keyAsDate(key).toLocaleDateString(uiLocale(), { weekday: 'narrow', timeZone: 'UTC' }),
      active: days.has(key),
      isToday: i === count - 1
    };
  });
}

/** Tasks due today (or overdue) and not yet finished — the "what now" list. */
export function todaysFocus(tasks = [], limit = 3) {
  return tasks
    .filter((t) => t.status === 'Pending')
    // No due-date filter. These come from `/tasks`, which returns today's plan
    // and nothing else — so every task here already belongs to today, and
    // dropping the ones carrying a later dueDate hid real work. It produced a
    // dashboard that said "1 still pending today" in one tile and "you're all
    // caught up" in the next, and left "Up next" blank when there was a task
    // sitting right there.
    .sort((a, b) => {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate) - new Date(b.dueDate);
    })
    .slice(0, limit);
}

/** Time-of-day greeting, so the dashboard doesn't read identically at 8am and 11pm. */
export function greeting(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/**
 * Quests finished in the last seven days, against the seven before that.
 *
 * A weekly goal needs a number to aim at, and this product has none to give:
 * the plan is one task a day, nobody sets a weekly target, and the server
 * stores no such thing. Inventing "5 this week" would be a target the student
 * never agreed to and the data cannot justify.
 *
 * So the comparison is against their own previous week. It is a real figure,
 * it moves for reasons they control, and beating it is a goal they set by
 * turning up — which is the only honest weekly loop available here.
 *
 * Rolling windows rather than calendar weeks, so it lines up with the "last 7
 * days" strip beside it and needs no decision about which day a week starts on.
 */
export function weeklyMomentum(tasks = []) {
  // Platform days, compared as 'YYYY-MM-DD' strings — which sort as dates.
  const today = todayKey();
  const recentFrom = shiftKey(today, -6);
  const priorFrom = shiftKey(today, -13);

  let recent = 0;
  let prior = 0;

  for (const task of tasks) {
    if (task.status !== 'Completed') continue;
    const at = completedDay(task);
    if (!at) continue;

    if (at >= recentFrom && at <= today) recent += 1;
    else if (at >= priorFrom && at < recentFrom) prior += 1;
  }

  return { recent, prior, ahead: recent - prior };
}
