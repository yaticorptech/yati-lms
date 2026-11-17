/** How-to-play steps, tips and card lines for group E (Rising Brains maths, Master Minds memory). */
export const COACH = {
  'number-pattern-lab': {
    steps: [
      'Read the rule line above the board: pyramid, magic square, step grid, growth grid or totals grid.',
      'Tap a ? cell and type its number with the pad or your keyboard; Enter jumps to the next gap.',
      'Press Check board. Right first time scores 2, after one fix 1.'
    ],
    tip: 'Start where a row, column or brick has only one gap — that number is forced, and it unlocks the next one.'
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
  'matrix-recall': {
    steps: [
      'Study the matrix of digits while the bar runs down — or press “I have it” early.',
      'The grid goes blank. Answer each question: a cell’s digit, where a digit was, or a row or column total.',
      'For highlighted cells, tap each one and type its digit, then Check.'
    ],
    tip: 'Read the matrix row by row as short numbers (e.g. 4-7-2-9) and keep a running sum of each row as you go.'
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
  'number-pattern-lab': 'Crack hidden rules in pyramids, magic squares and grids.',
  'ratio-relay': 'Ratio problems in a relay — each answer runs the next leg.',
  'data-dash': 'Read charts and tables, then total, compare and average.',
  'mental-math-circuit': 'Switch the circuit so the number arrives on target.',
  'matrix-recall': 'Memorise a digit matrix and rebuild it — values and places.',
  'departure-board': 'Memorise the flights — then keep up with the changes.'
};
