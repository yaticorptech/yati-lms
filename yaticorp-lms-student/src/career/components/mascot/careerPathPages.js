/**
 * What the companion says on each Career Path page, and what it points at.
 *
 * One table, ten screens. A page contributes nothing: it does not import the
 * mascot, does not hold a pose and does not own a timer. It only has to name
 * the element worth looking at, with `data-guide="…"`, and the companion
 * finds it by name at the moment it needs it (see mascotTargets.js).
 *
 * Everything here is declarative on purpose. Rewording a line, repointing a
 * page at a different element or dropping a page from the tour is an edit to
 * this file alone — which is what keeps ten pages from growing ten copies of
 * the same behaviour.
 *
 * `show` is the whole of a page's entry: the element to appear beside and
 * the line to say there. A page may have none, and a page that has one
 * still works when the element is not on screen — an empty planner has no
 * task list, an ungenerated roadmap has no milestone. In both cases the
 * companion simply does not appear, which is the correct answer: a guide
 * with nothing to point at is a mascot in the way.
 */

/**
 * Poses come from mascotStates.js; only states that exist there are named.
 *
 * `at` is the element the companion appears beside, named `data-guide="…"` on
 * the page itself. `say` is what it says once it gets there, and it says it
 * for as long as the student is looking at that element — the line is
 * cleared by scrolling past it or leaving the page, never by a timer.
 *
 * A page whose element is not on screen gets no companion at all. That is
 * deliberate: a guide with nothing to point at is a mascot standing in the
 * corner, which is the thing this replaced.
 */
export const CAREER_PAGES = [
  {
    route: '/career',
    exact: true,
    key: 'overview',
    // The button already in the hero (CurrentMission). It points at it; it
    // never renders one of its own.
    show: { at: 'quest', state: 'pointing', say: 'Ready? Click Start today’s quest!' }
  },
  {
    route: '/career/planner',
    key: 'planner',
    // The Start button on the next unfinished task, not the list around it.
    show: { at: 'task-start', state: 'pointing', say: 'Ready? Click Start to begin today’s tasks.' }
  },
  {
    route: '/career/calendar',
    key: 'calendar',
    show: { at: 'cal-toggle', state: 'presenting', say: 'Switch the view to see your exams, events and deadlines.' }
  },
  {
    route: '/career/roadmap',
    key: 'roadmap',
    // Named only while it is the phase being stood on, so this can never
    // resolve to a locked one further along.
    /*
     * Below, not beside. On a phone the rail runs down the left and the
     * phase cards fill everything to its right, so "beside the platform"
     * is "on top of the phase it is announcing"; the rail underneath it is
     * clear all the way down.
     */
    show: {
      at: 'milestone',
      state: 'pointing',
      prefer: 'below',
      say: 'This is your current phase. Let’s continue your journey!'
    }
  },
  {
    route: '/career/skills',
    key: 'skills',
    show: { at: 'today-task', state: 'determined', say: 'Start today’s task and build your skills!' }
  },
  {
    route: '/career/recommendations',
    key: 'ideas',
    show: { at: 'idea-list', state: 'presenting', say: 'Explore these ideas and discover new ways to grow.' }
  },
  {
    route: '/career/profile',
    key: 'progress',
    show: { at: 'progress-summary', state: 'progressing', say: 'Let’s see how far you’ve come!' }
  },
  {
    route: '/career/badges',
    key: 'rewards',
    show: { at: 'earn', state: 'excited', say: 'You’ve earned this! Check out your rewards.' }
  },
  {
    route: '/career/games',
    key: 'games',
    // The first game in the list. Once a level briefing is open the
    // `mascot:game-start` event takes over and moves it to that screen's
    // own start button.
    show: { at: 'game-play', state: 'presenting', say: 'Ready to play? Click Start!' }
  },
  {
    route: '/career/settings',
    key: 'settings',
    show: { at: 'settings-panel', state: 'happy', say: 'You can customise your Career Path experience here.' }
  }
];

/** The page a path is on, or null for anywhere outside Career Path. */
export const pageFor = (pathname) =>
  CAREER_PAGES.find((p) => (p.exact ? pathname === p.route : pathname.startsWith(p.route))) || null;

/**
 * Turn a page into a sequence for the script runner (mascotScript.js).
 *
 *   appear beside the element ▸ point and explain ▸ stay
 *
 * One step, and no waiting before it. CareerPathMascot only asks for this
 * once the element is measured and on screen, so there is nothing left to
 * settle — and the character no longer travels, so there is no journey
 * to give a head start to.
 *
 * There is no closing step either. The sequence runs with `stay: true`, so
 * the companion is left beside the thing it is explaining, and only
 * CareerPathMascot clears it: when the student scrolls past that thing, or
 * leaves the page.
 */
export const stepsFor = (page) => {
  if (!page?.show) return [];
  return [
    {
      point: page.show.at,
      say: page.show.say,
      state: page.show.state || 'pointing',
      prefer: page.show.prefer || null,
      // Holds until something replaces it; see play() in mascotBus.js.
      ms: 0,
      hold: 0
    }
  ];
};
