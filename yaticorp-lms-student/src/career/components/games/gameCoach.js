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
  },
  'dot-count': {
    steps: ['A board of coloured dots appears.', 'Count the dots of the colour asked.', 'Tap the number, then the next board comes.'],
    tip: 'Sweep the rows in order — the eye skips when it jumps about.'
  },
  'match-back': {
    steps: ['Letters arrive one at a time.', 'Say if each one matches the letter a step or more back.', 'Same or different — then the next letter.'],
    tip: 'Keep repeating the last few letters under your breath.'
  },
  'spin-match': {
    steps: ['A shape is shown at the top.', 'Four candidates appear below it.', 'Tap the one that is the same shape, just turned.'],
    tip: 'A flipped shape is a different shape. Only turning counts.'
  },
  'last-stone': {
    steps: ['You and the computer take turns.', 'Take one, two or three stones each turn.', 'Whoever takes the last stone wins the game.'],
    tip: 'Leave a multiple of four and you cannot lose.'
  },
  'tense-pick': {
    steps: ['A verb appears — go, eat, take.', 'Pick its past tense from four options.', 'The right form shows after each answer.'],
    tip: 'Say the sentence aloud: "Yesterday, I…"'
  },
  'sound-alike': {
    steps: ['A sentence has one gap.', 'The options all sound the same.', 'Pick the spelling that fits the meaning.'],
    tip: 'Swap in the long form: "they are" fits only where they’re does.'
  },
  'fraction-match': {
    steps: ['A fraction is shown.', 'Pick the one worth the same amount.', 'From level 31, some ask for the simplest form.'],
    tip: 'Top and bottom must be scaled by the same number.'
  },
  'clock-read': {
    steps: ['A clock face is shown.', 'Pick the time it says.', 'Later levels use every minute, not just the fives.'],
    tip: 'Short hand first for the hour, then the long hand for the minutes.'
  },
  'grid-recall': {
    steps: ['Some tiles light up, then go dark.', 'Tap every tile that was lit.', 'More tiles light each round.'],
    tip: 'Remember the pattern as a shape, not as separate tiles.'
  },
  'reverse-recall': {
    steps: ['A number flashes for a moment.', 'Type it back in reverse order.', 'Numbers get longer as you go.'],
    tip: 'Read it forwards, then picture it flipping.'
  },
  'seen-before': {
    steps: ['A set of symbols flashes up.', 'It disappears and options appear.', 'Tap the one that was in the set.'],
    tip: 'Name each symbol as it shows — words stick better than shapes.'
  },
  'tic-tac-toe': {
    steps: ['You are X and go first.', 'Get three in a row before the computer does.', 'Wins score more than draws; keep playing until the clock ends.'],
    tip: 'Take the centre, then block before you attack.'
  },
  'mini-sudoku': {
    steps: ['Fill the 4×4 grid with 1 to 4.', 'No repeats in any row, column or 2×2 box.', 'Solve every puzzle before the clock ends.'],
    tip: 'Start with the row or box that already has three numbers.'
  },
  'scale-balance': {
    steps: ['Two or three scales are shown.', 'Work out which object is heaviest.', 'Tap it before the clock runs out.'],
    tip: 'Whatever the low side holds is heavier than the high side.'
  },
  'shape-matrix': {
    steps: ['A grid of shapes has one gap.', 'Work out the rule across the rows.', 'Tap the shape that fills the gap.'],
    tip: 'Check colour, shape and count separately.'
  },
  'typing-sprint': {
    steps: ['A word and its meaning appear.', 'Type the word exactly and press Enter.', 'Each correct word scores; typos do not.'],
    tip: 'Look at the word once, then type without looking back.'
  },
  'antonym-match': {
    steps: ['A word appears.', 'Four options are offered.', 'Pick the one that means the opposite.'],
    tip: 'Put "not" in front of the word and see which option fits.'
  },
  'idiom-sense': {
    steps: ['An everyday phrase appears.', 'Four meanings are offered.', 'Pick what the phrase really means.'],
    tip: 'Idioms are never literal — rule out the obvious reading first.'
  },
  'binary-blitz': {
    steps: ['A binary number is shown.', 'Type or tap its decimal value.', 'The numbers grow as levels climb.'],
    tip: 'Read the bits from the right: 1, 2, 4, 8, 16…'
  },
  'speed-sort': {
    steps: ['A board of numbers appears.', 'Tap them from smallest to largest.', 'Clear as many boards as you can.'],
    tip: 'Find the smallest first, then scan for the next.'
  },
  'number-bonds': {
    steps: ['A target number is shown.', 'Tap two tiles that add up to it.', 'Keep pairing until the clock ends.'],
    tip: 'Pick one tile, then look for its partner.'
  },
  'rounding-rush': {
    steps: ['A number and a place value appear.', 'Round the number to that place.', 'Tap the answer before the clock ends.'],
    tip: 'Look one digit to the right: 5 or more rounds up.'
  }
};

/**
 * What the briefing says to a student before each game, and it is a different
 * thing for each: a headline with one word lit, a sentence about why this
 * game is worth a minute, and a cheer. Honest and short — none of them
 * promise anything the level cannot deliver.
 */
export const GAME_QUOTE = {
  'shape-matrix': { lead: "You're", hot: 'closer', rest: 'than you think!', line: 'Every correct answer builds your skills and brings you one step closer to your goals.', cheer: "Keep going, you've got this!" },
  'colour-match': { lead: 'Trust your', hot: 'eyes,', rest: 'not the word.', line: 'Fast, focused looking is a skill — and it sharpens a little every round.', cheer: 'Colour first, words second.' },
  'math-sprint': { lead: 'Quick maths,', hot: 'quicker', rest: 'you.', line: 'Speed comes from practice, and practice is exactly what this is.', cheer: 'One sum at a time.' },
  'memory-match': { lead: 'Your memory', hot: 'remembers', rest: 'more than you think.', line: 'Every pair you find trains the recall you use everywhere else.', cheer: 'Picture where each card sits.' },
  'sequence-recall': { lead: 'Follow the', hot: 'pattern,', rest: 'own the pattern.', line: 'Repeating a sequence back is how every skill starts.', cheer: 'Say it as it plays.' },
  'number-recall': { lead: 'Numbers', hot: 'stick', rest: 'when you chunk them.', line: 'Holding digits in mind is a muscle. This is the gym.', cheer: 'Two by two beats all at once.' },
  'spot-the-change': { lead: 'Notice the', hot: 'small', rest: 'things.', line: 'Attention to detail is a quiet superpower. Sharpen it here.', cheer: "Scan, don't stare." },
  'code-breaker': { lead: 'Think it', hot: 'through,', rest: 'crack it open.', line: 'Every guess teaches you something. Use what it says.', cheer: 'Change one colour at a time.' },
  'lights-out': { lead: 'Every move', hot: 'matters.', rest: 'Plan it.', line: 'Puzzles like this build the planning you use on real problems.', cheer: 'Fewer moves, brighter win.' },
  'word-scramble': { lead: 'Words hide.', hot: 'You', rest: 'find them.', line: 'Untangling letters builds vocabulary and speed together.', cheer: 'Look for the vowels first.' },
  'quick-compare': { lead: 'See it,', hot: 'decide,', rest: 'move on.', line: 'Fast judgement is a skill, and it gets faster with reps.', cheer: "Don't overthink — look." },
  'missing-operator': { lead: 'Find the', hot: 'logic', rest: 'in the gap.', line: 'Working out how numbers connect is the heart of maths.', cheer: 'Try the easy ones first.' },
  'percent-snap': { lead: 'Percentages,', hot: 'snapped', rest: 'in seconds.', line: 'Once these feel quick, a lot of everyday maths gets easy.', cheer: '10% first, then scale it.' },
  'running-total': { lead: 'Keep the', hot: 'count', rest: 'rolling.', line: 'Holding a running total is mental maths at its most useful.', cheer: 'Add as you go — never wait.' },
  'binary-blitz': { lead: 'Ones and zeros,', hot: 'your', rest: 'way.', line: 'Reading binary is a small skill with a big payoff in computing.', cheer: 'Powers of two, right to left.' },
  'grid-recall': { lead: 'Hold the', hot: 'grid', rest: 'in your head.', line: 'Spatial memory grows with every round you play.', cheer: 'Picture the shape the tiles made.' },
  'mini-sudoku': { lead: 'Logic', hot: 'wins.', rest: 'Every time.', line: 'Sudoku is pure reasoning — no guessing, just clear thinking.', cheer: "Fill what's certain first." },
  'number-bonds': { lead: 'Numbers that', hot: 'belong', rest: 'together.', line: 'Knowing your bonds by heart makes all arithmetic quicker.', cheer: 'Aim for the pair, not the sum.' },
  'reverse-recall': { lead: 'Backwards is', hot: 'harder.', rest: 'Good.', line: 'Reversing a sequence stretches your working memory further.', cheer: 'Say it forwards, then flip it.' },
  'rounding-rush': { lead: 'Round it,', hot: 'rush', rest: 'it.', line: 'Estimating fast is how you sanity-check any number.', cheer: 'Nearest ten first.' },
  'scale-balance': { lead: 'Balance the', hot: 'scales', rest: 'with reason.', line: 'Weighing both sides is algebra in disguise.', cheer: 'Same on both sides, always.' },
  'seen-before': { lead: 'Have you', hot: 'seen', rest: 'this one?', line: 'Recognition memory is what makes revision stick.', cheer: 'Trust your first instinct.' },
  'speed-sort': { lead: 'Sort it', hot: 'fast,', rest: 'sort it right.', line: "Quick categorising is a thinking skill you'll use daily.", cheer: 'Decide the rule, then fly.' },
  'tic-tac-toe': { lead: 'Three in a', hot: 'row.', rest: 'Outthink it.', line: 'Even a small game teaches you to plan two moves ahead.', cheer: 'Take the centre when you can.' },
  'typing-sprint': { lead: 'Fingers,', hot: 'faster.', rest: 'Fewer typos.', line: 'Typing well is a skill every course and job rewards.', cheer: 'Accuracy first, speed follows.' },
  'dot-count': { lead: 'Every dot', hot: 'counts.', rest: 'Literally.', line: 'Careful counting under a clock is attention in its purest form.', cheer: 'Row by row, no skipping.' },
  'match-back': { lead: 'Hold it in', hot: 'mind,', rest: 'then compare.', line: 'Working memory is the desk your thinking happens on — this widens it.', cheer: 'Whisper the last few letters.' },
  'spin-match': { lead: 'Turn it', hot: 'over', rest: 'in your head.', line: 'Rotating shapes mentally is the skill behind maps, diagrams and design.', cheer: 'Flipped is not turned.' },
  'last-stone': { lead: 'Plan the', hot: 'ending', rest: 'first.', line: 'Thinking backwards from the finish is how every good strategy starts.', cheer: 'Count what you leave behind.' },
  'tense-pick': { lead: 'Went, not', hot: 'goed.', rest: 'Every time.', line: 'Irregular verbs are the first thing a reader notices in your writing.', cheer: '"Yesterday, I…" — say it aloud.' },
  'sound-alike': { lead: 'Same', hot: 'sound,', rest: 'different word.', line: 'Homophones are the mistakes spellcheck never catches — you have to.', cheer: 'Read the meaning, not the sound.' },
  'fraction-match': { lead: 'Same', hot: 'amount,', rest: 'different name.', line: 'Equivalent fractions are the hinge for ratios, percentages and odds.', cheer: 'Scale top and bottom together.' },
  'clock-read': { lead: 'Read the', hot: 'hands.', rest: 'Tell the time.', line: 'Telling time on a face is arithmetic in twelfths and sixtieths.', cheer: 'Short hand first.' },
  'next-in-sequence': { lead: 'Find the', hot: 'rule,', rest: 'then the next.', line: 'Spotting patterns in numbers is the start of every kind of analysis.', cheer: 'Check the gaps first.' },
  'odd-one-out': { lead: 'Three belong.', hot: 'One', rest: "doesn't.", line: 'Sorting what fits from what does not is how categories get built.', cheer: 'Name what the three share.' },
  deduction: { lead: 'Does it', hot: 'follow?', rest: 'Decide.', line: 'Telling a valid argument from a tempting one is the core of clear thinking.', cheer: 'Ignore whether it sounds true.' },
  'synonym-match': { lead: 'Same', hot: 'meaning,', rest: 'new word.', line: 'A wider vocabulary is a wider set of things you can say precisely.', cheer: 'Try each option in a sentence.' },
  'sentence-gap': { lead: 'One word', hot: 'fits.', rest: 'Find it.', line: 'Choosing the exact word is what makes writing read as confident.', cheer: 'Read the whole sentence first.' },
  'spelling-fix': { lead: 'Spot the', hot: 'right', rest: 'spelling.', line: 'Spelling is the first thing a reader judges and the easiest to fix.', cheer: 'Say it slowly, syllable by syllable.' },
  'word-roots': { lead: 'Roots', hot: 'unlock', rest: 'whole words.', line: 'Know a few dozen roots and unfamiliar words start explaining themselves.', cheer: 'Think of a word you already know with it.' },
  'antonym-match': { lead: 'Find the', hot: 'opposite.', rest: 'Fast.', line: 'Opposites sharpen the edges of what a word actually means.', cheer: 'Put "not" in front and test.' },
  'idiom-sense': { lead: 'Say what it', hot: 'really', rest: 'means.', line: 'Idioms are how fluent speakers sound fluent — and how learners get lost.', cheer: 'Never take it literally.' }
};

/* For a game without a line of its own: three that rotate with the level,
   so the same words are not read at the start of every level. */
const FALLBACK_QUOTES = [
  { lead: 'Small steps.', hot: 'Big', rest: 'dreams.', line: 'Every level you clear is a skill you keep.', cheer: "Ready when you are." },
  { lead: 'Practice', hot: 'beats', rest: 'talent.', line: 'A few focused minutes now is how the hard things get easy.', cheer: 'Just this level. Go.' },
  { lead: 'Sharper', hot: 'every', rest: 'round.', line: 'Nobody starts fast. Everybody who keeps going gets there.', cheer: 'One more than last time.' }
];

export const quoteFor = (gameId, level = 1) =>
  GAME_QUOTE[gameId] || FALLBACK_QUOTES[(Math.max(1, level) - 1) % FALLBACK_QUOTES.length];

export const coachFor = (gameId) =>
  GAME_COACH[gameId] || {
    steps: ['Read the objective above.', 'Press Start when you are ready.', 'Stars come with a better run.'],
    tip: 'Take your time on the first level.'
  };
