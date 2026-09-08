/**
 * What the mascot says on each CareerPath page, and what it points at.
 *
 * `target` names a `data-guide` attribute on the element. A step whose
 * element is not on the page (a card that renders only with data) is
 * skipped rather than shown pointing at nothing. Wording lives here alone,
 * so changing what the mascot says never touches a page.
 */
export const GUIDE = {
  '/career': [
    { text: "Hi! I'm your CareerPath guide. Let me show you around 👋" },
    { target: 'build-roadmap', pet: true, text: 'Click here to build your roadmap and begin your journey.' },
    // `hold`: keeps pointing until the button is actually clicked.
    { target: 'quest', pet: true, hold: true, text: "Ready for today's quest? Let's get started!" },
    { target: 'journey', text: 'This is your journey. Green stages are done and the violet one is where you are now.' },
    { target: 'unlock', pet: true, text: "Click here to do today's task and unlock the next phase." },
    { target: 'tab-planner', text: "Today's Plan is where each day begins." }
  ],
  // No tour on Today's Plan: the page is the instruction, and the guide
  // simply rests there.
  '/career/calendar': [
    { target: 'cal-toggle', text: 'Flip between your learning calendar and your class timetable here.' },
    { target: 'day-panel', text: 'Click any day to see its tasks, and add exams or events for that day.' }
  ],
  // No tour on the Roadmap either: the map explains itself.
  // No tour on Skills: the hero already says what to press.
  '/career/badges': [
    { target: 'earn', pet: true, text: 'Click here to earn 10 XP now.' },
    { target: 'badge-task', pet: true, text: 'Click here to get 10 XP closer to your next badge.' }
  ],
  '/career/games': [
    { text: 'Brain games! No XP at stake — pick one and sharpen up for a few minutes.' }
  ],
  '/career/profile': [
    { text: 'Check your progress here: streak, level, skills, and anything you skipped.' }
  ],
  '/career/recommendations': [
    { text: 'Courses, books and revision picked for your goal live here.' }
  ]
};
