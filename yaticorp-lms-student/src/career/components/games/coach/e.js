/** How-to-play steps, tips and card lines for group E (Rising Brains maths, Master Minds memory). */
export const COACH = {
  'running-total-pro': {
    steps: ['Numbers arrive one at a time: +, −, ×, ÷ in turn, or two totals (Blue and Orange) at once.', 'Keep each total in your head — you cannot write anything down.', 'At the end, pick the total you were asked for.'],
    tip: 'Say the new total quietly after every number; for two totals, keep one in each hand.'
  },
  'data-chart-quiz': {
    steps: ['Read the chart first: its title, the labels and the scale.', 'Answer each question — totals, differences, averages, percentages.', 'Three charts per level, against the clock.'],
    tip: 'Check the scale before reading a bar: one gridline may stand for 10, 25 or 50.'
  },
  'speed-distance': {
    steps: ['Read the journey: speed, time, distance — or two vehicles at once.', 'Drag the 📍 along the track (km) or the clock line (time) to your answer, then press Check.', 'Watch the vehicles drive it out. Get 4 of 6 right to clear the level.'],
    tip: 'Distance = speed × time. When two vehicles close in, add their speeds; when one chases, subtract them.'
  },
  'number-pattern-lab': {
    steps: [
      'Read the maze rule at the top — like “every step goes to a bigger number”.',
      'Start on 🚩. Slide your finger (or tap) to a square next to you: up, down, left or right.',
      'Keep the rule on every step and reach 🏁. Tap an earlier square to go back.'
    ],
    tip: 'Look from the 🏁 backwards too — the squares next to the exit tell you where you must come from.'
  },
  'ratio-relay': {
    steps: [
      'Each leg is a ratio or proportion problem. The baton number is what the leg starts from.',
      'Type your answer and press Pass — it becomes the baton for the next leg.',
      'A wrong answer breaks the relay: retry the leg for 1 point instead of 2.'
    ],
    tip: 'Find what one part is worth first: with 2 : 3 and 8 blue, one part is 4, so yellow is 3 × 4 = 12.'
  },
  'data-dash': {
    steps: [
      'Read the chart, table or pie — values are printed on it.',
      'Answer each question: type a number on the pad, or tap the right label.',
      'You get one try per question, so check your sum before pressing Answer.'
    ],
    tip: 'For the mean, add every value and divide by how many there are; for a pie, percent × total ÷ 100.'
  },
  'mental-math-circuit': {
    steps: [
      'A number enters at IN and passes one operation at every junction on its way to OUT.',
      'Tap one switch at each junction so OUT equals the target, then press Run.',
      'On a fixed circuit, just work the number down and type what comes out.'
    ],
    tip: 'Work backwards from the target: which last operation could give it, and from what number?'
  },
  'departure-board': {
    steps: [
      'An airport departure board is shown for a few seconds: destinations, times, flight numbers and gates.',
      'At higher levels an announcement changes a gate or delays a flight — remember the NEW detail.',
      'The board goes blank: answer each question from memory. 60% right clears the level.'
    ],
    tip: 'Link each city to its gate as a pair ("Tokyo–B4"), and read the board top to bottom — it is sorted by time.'
  }
};

export const BLURB = {
  'running-total-pro': 'Keep the running total — with bigger numbers and two totals at once.',
  'data-chart-quiz': 'Read real-world charts — sales, population, money — and answer fast.',
  'speed-distance': 'Drag along the timeline: how far, when, and where they meet.',
  'number-pattern-lab': 'Find the path that keeps the rule!',
  'ratio-relay': 'Ratio problems in a relay — each answer runs the next leg.',
  'data-dash': 'Read charts and tables, then total, compare and average.',
  'mental-math-circuit': 'Switch the circuit so the number arrives on target.',
  'departure-board': 'Memorise the flights — then keep up with the changes.'
};
