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
  '/career/planner': [
    { target: 'mission', pet: true, text: "Here's your plan for today! Click Start and let's begin." },
    { target: 'tasks', text: 'Open a task, read the lesson and pass the quiz — it ticks itself off when you do.' },
    { target: 'tab-calendar', text: 'Got an exam coming up? Add it in the Calendar and the evening before stays clear.' }
  ],
  '/career/calendar': [
    { target: 'cal-toggle', text: 'Flip between your learning calendar and your class timetable here.' },
    { target: 'day-panel', text: 'Click any day to see its tasks, and add exams or events for that day.' }
  ],
  '/career/roadmap': [
    { target: 'here', text: 'This is the phase you are on right now.' },
    { target: 'next-step', pet: true, text: "Let's take this one step at a time. Your next step is here!" },
    { target: 'work-today', pet: true, text: 'Click here to work on this phase today and earn 10 XP.' }
  ],
  '/career/skills': [
    { target: 'skills-start', pet: true, text: "Click here to start today's task and move a skill forward." },
    { target: 'skill-rail', text: 'Your overall progress, XP and badges sit here.' }
  ],
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

/** Short lines offered while resting, once a page's tour is done. */
export const TIPS = [
  "Finish today's task to keep your streak alive 🔥",
  'Every task is +10 XP. Show up daily to level up faster.',
  'Stuck? The AI Mentor knows your roadmap.',
  "Add your exams to the Calendar and I'll clear the evening before.",
  'Your next badge is closer than you think. Check Rewards!',
  "Let's learn, grow, together! 💙"
];

/** The help menu: where each option takes the student. */
export const HELP = [
  { label: 'Career Path', to: '/career', tour: true },
  { label: 'Courses', to: '/enrolled-courses' },
  { label: 'Assessment', to: '/career/planner', tour: true },
  { label: 'Progress', to: '/career/profile', tour: true },
  { label: 'Calendar', to: '/career/calendar', tour: true }
];

export const CHEERS = [
  'Great job! 🎉 You completed this step!',
  'Nice one! 🎉 That is +10 XP in the bag.',
  'Done! 🎉 One step closer to your goal.'
];
