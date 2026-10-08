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

/** Local YYYY-MM-DD key. Deliberately not toISOString, which shifts to UTC and
 *  can move a late-evening completion onto the following day. */
export function dayKey(date) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

/** The date a task should be credited to. Tasks completed before `completedAt`
 *  existed fall back to updatedAt, which is the best signal available. */
function completionDate(task) {
  return task.completedAt || task.updatedAt || task.createdAt;
}

/** Set of day keys on which at least one task was completed. */
export function activeDays(tasks = []) {
  const days = new Set();
  for (const task of tasks) {
    if (task.status !== 'Completed') continue;
    const key = dayKey(completionDate(task));
    if (key) days.add(key);
  }
  return days;
}

function shiftDays(date, delta) {
  const d = new Date(date);
  d.setDate(d.getDate() + delta);
  return d;
}

/**
 * Consecutive days ending today. A gap yesterday but activity today still
 * counts as 1; a gap today with activity yesterday keeps the streak alive
 * (it is not broken until a full day passes with nothing done).
 */
export function currentStreak(tasks = []) {
  const days = activeDays(tasks);
  if (days.size === 0) return 0;

  const today = new Date();
  // Anchor on today if there's activity, otherwise yesterday — so a streak
  // isn't reported as broken simply because it's early in the day.
  let cursor = days.has(dayKey(today)) ? today : shiftDays(today, -1);
  if (!days.has(dayKey(cursor))) return 0;

  let streak = 0;
  while (days.has(dayKey(cursor))) {
    streak += 1;
    cursor = shiftDays(cursor, -1);
  }
  return streak;
}

/** Last `count` days, oldest first, each flagged with whether work happened. */
export function recentActivity(tasks = [], count = 7) {
  const days = activeDays(tasks);
  const today = new Date();

  return Array.from({ length: count }, (_, i) => {
    const date = shiftDays(today, -(count - 1 - i));
    return {
      key: dayKey(date),
      label: date.toLocaleDateString(undefined, { weekday: 'narrow' }),
      active: days.has(dayKey(date)),
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
  const today = new Date();
  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

  const todayStart = startOfDay(today);
  const dayMs = 86400000;
  const recentFrom = todayStart - 6 * dayMs;
  const priorFrom = todayStart - 13 * dayMs;

  let recent = 0;
  let prior = 0;

  for (const task of tasks) {
    if (task.status !== 'Completed') continue;
    const when = task.completedAt || task.updatedAt || task.createdAt;
    if (!when) continue;
    const at = startOfDay(new Date(when));
    if (Number.isNaN(at)) continue;

    if (at >= recentFrom && at <= todayStart) recent += 1;
    else if (at >= priorFrom && at < recentFrom) prior += 1;
  }

  return { recent, prior, ahead: recent - prior };
}
