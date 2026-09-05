/**
 * How each game is played, in the mascot's words — two or three short steps
 * and a tip, per game. Shown on the level briefing so the student never
 * starts a level without knowing what to do.
 */
export const GAME_COACH = {
  'memory-match': {
    steps: ['Tap a card to turn it over.', 'Tap another — a match stays face up.', 'Pair every card within the move limit.'],
    tip: 'Remember where you saw each picture.'
  },
  'sequence-recall': {
    steps: ['Watch the tiles light up in order.', 'Tap them back in the same order.', 'Each round adds one more.'],
    tip: 'Say the sequence in your head as it plays.'
  },
  'number-recall': {
    steps: ['A number flashes for a moment.', 'Type it back from memory.', 'Numbers get longer as you go.'],
    tip: 'Chunk it: 4829 is easier as 48 and 29.'
  },
  'colour-match': {
    steps: ['A word appears in a coloured ink.', 'Tap the colour of the ink, not the word.', 'Keep going until the timer runs out.'],
    tip: "Ignore what it says — look only at the colour."
  },
  'spot-the-change': {
    steps: ['Study the grid of tiles.', 'One tile changes — spot which.', 'Tap it before the clock ends.'],
    tip: 'Scan row by row instead of staring at one spot.'
  },
  'code-breaker': {
    steps: ['Pick four colours and submit a guess.', 'Feedback tells you what is right and where.', 'Crack the code in as few guesses as you can.'],
    tip: 'Change one colour at a time to learn more from each guess.'
  },
  'next-in-sequence': {
    steps: ['Look at the numbers in the run.', 'Work out the rule behind them.', 'Pick what comes next.'],
    tip: 'Check the gaps between numbers first.'
  },
  'odd-one-out': {
    steps: ['Four items appear.', 'Three belong together.', 'Tap the one that does not.'],
    tip: 'Ask what the three share, then find the outsider.'
  },
  deduction: {
    steps: ['Read the two statements.', 'Decide if the conclusion follows.', 'Answer yes or no.'],
    tip: 'Only the statements count — not what you already know.'
  },
  'lights-out': {
    steps: ['Tap a light to flip it and its neighbours.', 'Turn every light off.', 'Fewer taps earns more stars.'],
    tip: 'Work from the top row down.'
  },
  'word-scramble': {
    steps: ['Read the clue.', 'Unscramble the letters into a word.', 'Type your answer.'],
    tip: 'Find the vowels first and build around them.'
  },
  'synonym-match': {
    steps: ['A word appears.', 'Pick the option that means the same.', 'Beat the clock for more stars.'],
    tip: 'Rule out the one that clearly does not fit.'
  },
  'sentence-gap': {
    steps: ['Read the sentence with a gap.', 'Pick the word that fits.', 'Keep the run going.'],
    tip: 'Read the whole sentence before choosing.'
  },
  'spelling-fix': {
    steps: ['Four spellings of one word appear.', 'Only one is correct.', 'Tap it.'],
    tip: 'Sound it out slowly.'
  },
  'word-roots': {
    steps: ['A prefix or root appears.', 'Pick what it means.', 'Keep going for more.'],
    tip: 'Think of a word you know that uses it.'
  },
  'math-sprint': {
    steps: ['Sixty seconds on the clock.', 'Answer as many sums as you can.', 'Wrong answers cost time.'],
    tip: 'Skip the hard one — speed beats perfection here.'
  },
  'quick-compare': {
    steps: ['Two values appear side by side.', 'Tap the larger one.', 'Faster taps, more stars.'],
    tip: 'Estimate — you rarely need the exact answer.'
  },
  'missing-operator': {
    steps: ['An equation is missing its sign.', 'Pick + − × or ÷ to make it true.', 'Keep the streak alive.'],
    tip: 'Try × and ÷ first when the numbers jump a lot.'
  },
  'percent-snap': {
    steps: ['A percentage question appears.', 'Work it out in your head.', 'Answer before the clock ends.'],
    tip: '10% first, then scale up or down.'
  },
  'running-total': {
    steps: ['Numbers arrive one at a time.', 'Keep the running total in your head.', 'Enter the total at the end.'],
    tip: 'Say the total out loud after each number.'
  }
};

export const coachFor = (gameId) =>
  GAME_COACH[gameId] || {
    steps: ['Read the objective above.', 'Press Start when you are ready.', 'Stars come with a better run.'],
    tip: 'Take your time on the first level.'
  };
