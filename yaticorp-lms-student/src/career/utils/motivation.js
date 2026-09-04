/**
 * One short line of encouragement a day, shared by every Career Path page
 * that greets the student.
 *
 * Picked by the date rather than at random, so it is the same across pages
 * and refreshes — a line that changes every time a page loads reads as a
 * slot machine, not a message. Kept short and concrete; none of them promise
 * anything the pages cannot show.
 */
const DAILY_BOOST = [
  'Small steps every day beat big plans someday.',
  "You don't need to finish the journey today. Just this task.",
  'Progress is quiet. It looks like this.',
  'Every expert was once exactly where you are now.',
  'One task done today is one fewer between you and the goal.',
  'Consistency is the skill behind every other skill.',
  'Show up, do the task, let the streak do the rest.',
  'Future you is built out of days like today.',
  'Done is better than perfect. Start.',
  'The plan is small on purpose. Finish it and win the day.'
];

export function dailyBoost(date = new Date()) {
  const start = new Date(date.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((date - start) / 86400000);
  return DAILY_BOOST[dayOfYear % DAILY_BOOST.length];
}

/** What to say once today's plan is cleared. */
export const DAY_DONE_LINE = 'You showed up and finished. That is the whole secret.';
