/**
 * Which months the learning calendar can page through.
 *
 * The arrows used to run backwards forever, into month after month of empty
 * squares from before the student had an account. The range is bounded at both
 * ends instead: the first month is the one their first plan was assigned to,
 * and the last is this month, because plans are generated a day at a time and
 * there is nothing ahead of today either.
 *
 * Months are compared as a single integer — year * 12 + month — so December to
 * January needs no special case and no date arithmetic.
 */

/** YYYY-MM-DD to a comparable month number. */
export const monthIndexOf = (dayKey) => {
  const [year, month] = String(dayKey).split('-').map(Number);
  if (!Number.isFinite(year) || !Number.isFinite(month)) return null;
  return year * 12 + (month - 1);
};

export const monthIndexOfDate = (date) => date.getFullYear() * 12 + date.getMonth();

/**
 * @param {string[]} dayKeys every YYYY-MM-DD a plan was assigned to
 * @param {Date} today
 * @returns {{min: number, max: number, firstKey: string|null}}
 */
export function monthBounds(dayKeys = [], today = new Date()) {
  const nowIndex = monthIndexOfDate(today);

  // Keys are YYYY-MM-DD, so a plain lexicographic sort is chronological.
  const valid = dayKeys.filter((key) => monthIndexOf(key) !== null).sort();
  if (valid.length === 0) {
    return { min: nowIndex, max: nowIndex, firstKey: null, lastKey: null };
  }

  const first = monthIndexOf(valid[0]);
  const last = monthIndexOf(valid[valid.length - 1]);

  return {
    // The window runs from the first month with work to the last, and always
    // contains today. So a task already sitting in next month is reachable,
    // and a student whose last plan was weeks ago can still page forward to
    // now rather than being stranded in the past.
    min: Math.min(first, nowIndex),
    max: Math.max(last, nowIndex),
    firstKey: valid[0],
    lastKey: valid[valid.length - 1]
  };
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/** "August 2026" from a YYYY-MM-DD key. */
export function monthLabel(dayKey) {
  const index = monthIndexOf(dayKey);
  if (index === null) return null;
  return `${MONTH_NAMES[index % 12]} ${Math.floor(index / 12)}`;
}

/** "09:00" → "9:00 am", so a timetable column reads like a printed one. */
export const clockLabel = (hhmm = '') => {
  const [h, m] = String(hhmm).split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return hhmm;
  const suffix = h >= 12 ? 'pm' : 'am';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${suffix}`;
};
