/** How to play in three short, simple sentences per game (2026-11-14): shown in the in-game How to play box. */
export const SHORT_STEPS = {
  // Master Minds' relaxed set (2026-11-17)
  'word-search': ['Read the word list.', 'Find a word in the grid.', 'Drag across it, or tap its first and last letter.'],
  'sum-pop': ['Read the target — add, or (later) multiply.', 'Tap bubbles that make it; watch the negatives.', 'Each pop brings a new target.'],
  'change-maker': ['Add up the bill: price × quantity.', 'Take off the discount, add GST, round to ₹1.', 'Tap notes and coins for the change.'],
  'best-buy': ['Read the three offers.', 'Compare per kg, true % off, EMI totals or interest.', 'Tap the real best deal.'],
  'number-trail': ['Each bubble is a value: 3/8, 45%, √10, 2³…', 'Tap them smallest to largest.', 'Be quick — a wrong tap costs a second.'],
  'quick-estimate': ['Read the sum: ×, ÷, √, %, growth, powers.', 'Round smartly — no exact working.', 'Tap the closest before the bar runs out.'],
  // Young Thinkers: memory
  'memory-match': ['Tap a card to turn it over.', 'Tap one more card. Same picture? It stays open!', 'Not the same? They turn back. Remember where they were.'],
  'colour-match': ['A word shows up, like RED written in blue.', 'Look at the colour of the letters (blue).', 'Tap that colour button. Be quick!'],
  'animal-pair-safari': ['Tap a card to turn it over and listen.', 'Tap one more card to find its match.', 'Find all the pairs to win.'],
  'whats-missing': ['Look at all the pictures and remember them.', 'They hide, and then one is gone.', 'Tap the picture that is missing.'],
  'light-up-garden': ['Watch the pictures pop up.', 'They hide. Remember where each one was.', 'Level 1: tap where they were. Then pick each picture below and put it back.'],
  'shadow-detective': ['Look at the black shadow.', 'Look at the pictures below it.', 'Tap the one with the same shape.'],
  'flash-sequence': ['Watch the pictures light up, one by one.', 'Wait until they stop.', 'Tap them in the same order.'],
  // Young Thinkers: logic
  'tic-tac-toe': ['You are X. Tap an empty square.', 'The computer puts an O.', 'Make a line of three X: across, down or slanting.'],
  'picture-logic': ['Look at the coloured picture for 7 seconds.', 'It hides — pick a crayon below it.', 'Tap each part to colour it from memory. Peek shows the colours again.'],
  'treasure-path': ['Find the explorer 🧒, the gems 💎 and the chest 🔐.', 'Tap arrow cards ⬆️ ➡️ ⬇️ ⬅️, one per step — pick up every gem first, around rocks 🪨 and water 🌊.', 'Press Go: with all the gems, the chest opens 💰.'],
  'odd-one-out': ['Look at the four pictures.', 'Three follow a secret rule — kind, colour, number, shape…', 'Tap the odd one, then read why!'],
  'shape-builder': ['Tap a coloured piece.', 'Tap the grey spot where it fits.', 'Cover all the grey to finish.'],
  'pattern-path': ['Look at the row, like 🔴 🔵 🔴 🔵.', 'See what repeats.', 'Tap what comes next (🔴).'],
  'mini-maze-mission': ['Find the rabbit 🐰 and the carrot 🥕.', 'Tap the arrows to move — hedges and the stone 🪨 block the way.', 'Lions 🦁 and the bee 🐝 catch you — the level starts again!'],
  // Young Thinkers: vocabulary
  'spelling-fix': ['Look at the four words.', 'Only one is spelled the right way.', 'Tap that one.'],
  'sound-alike': ['Read the sentence with a gap ___.', 'The words sound the same but mean different things.', 'Tap the word that makes sense.'],
  'typing-sprint': ['Look at the word.', 'Type it on the keyboard.', 'Press Enter. Then do the next one.'],
  'picture-word-hunt': ['Look at the pictures. Their names are hidden in the letters.', 'Tap the first letter of a word, then its last letter.', 'Find all the words to win.'],
  'rhyme-detective': ['Read the big word at the top, like bear.', 'Tap every word that ends with the same sound, like pear and chair.', 'Press Check.'],
  'letter-builder': ['Look at the picture, like 🐶.', 'Tap the letters in order: D, O, G.', 'Spell it right to win.'],
  'word-balloon-pop': ['Look at the picture at the top.', 'Read the words on the balloons.', 'Tap the balloon that names the picture.'],
  // Young Thinkers: maths
  'math-sprint': ['Read the sum, like 2 + 3.', 'Tap or type the answer (5).', 'Keep going until the time runs out.'],
  'speed-sort': ['Look at all the numbers.', 'Tap the smallest one first.', 'Then the next one, all the way to the biggest.'],
  'number-hop': ['Read the question, like 4 + 1.', 'Find the lily pad with the answer (5).', 'Tap it. The frog 🐸 hops there!'],
  'fruit-shop': ['Read the shopping list.', 'Tap the fruits to put them in the basket.', 'Add up the prices and type the total.'],
  'count-and-catch': ['Work out the sum, like 3 + 2.', 'Move the basket to catch that many of the right fruit.', 'Leave the others, then press Done.'],
  'missing-number-race': ['Look at the train, like 3, 4, __, 6.', 'The numbers go up or down by one.', 'Tap the missing number (5).'],
  'shape-count-dash': ['Read the station number, like 12.', 'Tap carriages to hook them on, like 5 + 7.', 'Press Go when they add up. Choo choo!'],
  // Rising Brains: memory
  'sequence-recall': ['Watch the tiles light up, one by one.', 'Tap them in the same order.', 'Each round adds one more tile.'],
  'number-recall': ['A number shows for a few seconds.', 'It hides. Type the number you saw.', 'Get it right and the next number is longer.'],
  'sequence-vault': ['Each round is a new vault: study the door codes.', 'The doors lock. Change a code when a change card shows.', 'Type the code of the door you are asked for.'],
  'grid-navigator': ['Read the mission: count, catch or remember.', 'Press Start and listen closely — no lights to help.', 'Answer from what you heard.'],
  'focus-filter': ['Which way is the MIDDLE fish swimming? Tap Left or Right.', 'A golden school 🐠 means answer the opposite way.', 'Then find every target letter on the board.'],
  'dual-image-recall': ['Remember the first picture grid.', 'A second grid shows with some tiles changed.', 'Tap every tile that changed.'],
  // Rising Brains: logic
  'next-in-sequence': ['Four problems in every level: numbers, pictures, odd one out, matchsticks.', 'Type, tap or drag — each one is answered in its own way.', 'Get 3 of the 4 right to clear the level.'],
  'mini-sudoku': ['Tap an empty square, then tap a number.', 'Each row and each column has 1, 2, 3, 4 once.', 'Each 2×2 box has them once too.'],
  'clue-chain': ['One crown in every row, column and coloured garden.', 'Crowns can never touch, not even corner to corner.', 'Tap once for ✕, twice for a crown.'],
  'sudoku-challenge': ['Tap an empty square, then tap a number.', 'Each row and each column has 1 to 9 once.', 'Each 3×3 box has 1 to 9 once too.'],
  'tower-strategy': ['Tap a peg to lift its top ring.', 'Drop it on the NEXT peg (1 ⇄ 2 or 2 ⇄ 3) — no jumping.', 'Sort them: one colour on each peg.'],
  'constraint-grid': ['Tap a pipe to turn it a quarter turn.', 'Join the pipes from the tap to the plant.', 'Water flows and the plant blooms!'],
  // Rising Brains: vocabulary
  'word-scramble': ['Read the clue and the mixed-up letters.', 'Work out the word.', 'Type it and press Enter.'],
  'sentence-gap': ['Read the sentence with a gap ___.', 'Read the word choices.', 'Tap the one that makes the best sense.'],
  'tense-pick': ['Read the verb, like go.', 'Look at the four choices.', 'Tap the past tense (went).'],
  'word-ladder': ['Read the clue on the next rung.', 'Change ONE letter of the word below to make it.', 'Climb rung by rung to the goal word at the top!'],
  'chess-challenge': ['Choose White or Black — each side gets 30 minutes.', 'Tap a piece, then a marked square to move it.', 'Checkmate the other king (or win on time)!'],
  'chess-master': ['Choose White or Black — each side gets 30 minutes.', 'Tap a piece, then a marked square to move it.', 'Checkmate the other king (or win on time)!'],
  'analogy-master': ['Read the first pair, like hot : cold.', 'Work out the link (they are opposites).', 'Pick the word that gives the same link: up : ___ (down).'],
  'context-detective': ['Read the short passage with the new word.', 'Tap the words that help explain it.', 'Pick the meaning that fits.'],
  'word-association-grid': ['Look at all 16 words.', 'Tap 4 words that belong together.', 'Find all 4 groups to win.'],
  // Rising Brains: maths
  'running-total': ['Numbers show one at a time.', 'Keep adding them in your head.', 'Type the total at the end.'],
  'equation-rush': ['Look at the equation, like x + 3 = 7.', 'Pick the step that undoes it (take away 3).', 'Type x (4).'],
  'number-pattern-lab': ['Read the maze rule at the top.', 'Slide from 🚩, one square at a time, keeping the rule.', 'Reach 🏁 to solve the maze.'],
  'ratio-relay': ['Read the ratio question.', 'Type your answer and press Pass.', 'Answer every leg to finish.'],
  'data-dash': ['Look at the chart or table.', 'Read the question.', 'Pick or type the answer.'],
  'mental-math-circuit': ['A number starts at IN.', 'At each split, pick one operation, like +2 or ×3.', 'Make the number at OUT equal the target.'],
  // Master Minds: memory
  'grid-recall': ['Some tiles light up, then go dark.', 'Tap every tile that lit up.', 'Each round has more tiles.'],
  'reverse-recall': ['A number shows for a few seconds, like 3 8 1.', 'It hides. Type it backwards (1 8 3).', 'Get it right and the next number is longer.'],
  'departure-board': ['Memorise the airport departure board.', 'Read any announcement — a gate or time may change.', 'Answer questions about the board as it is NOW.'],
  'rule-switch': ['A colour word shows in a coloured ink.', 'Read the rule at the top: INK or WORD.', 'Tap the answer. Watch out, the rule switches.'],
  'interference-recall': ['Learn the first list of words.', 'A second list of similar words follows.', 'Tap only the words from the first list.'],
  // Master Minds: logic
  'network-logic': ['Read the task.', 'Tap the stops or the links to build your answer.', 'Press Submit. Cheaper answers score more.'],
  // Master Minds: vocabulary
  'synonym-match': ['Read the word.', 'Check if the question asks for same or opposite.', 'Tap the right word.'],
  'idiom-sense': ['Read the saying, like “break the ice”.', 'Read the four meanings.', 'Tap the real meaning (start a friendly talk).'],
  'word-relation-matrix': ['Read the headings and the filled row.', 'Put words from the pool into the empty cells.', 'Make every row and column fit to win.'],
  // Master Minds: maths
  'percent-snap': ['Read the question, like 10% of 50.', 'Work it out in your head (5).', 'Answer before time runs out.'],
  'number-forge': ['Look at the target and the number tiles.', 'Join two tiles with +, −, × or ÷.', 'Keep going until you make the target.'],
  // Kept games outside the 84
  'code-breaker': ['A secret code of 4 colours is hidden.', 'Pick 4 colours and press Guess.', 'Use the hints to crack it in few guesses.'],
  'lights-out': ['Tap a light. It and its neighbours flip.', 'Plan which lights to tap.', 'Turn every light off to win.'],
  'shape-matrix': ['Look at the grid of shapes.', 'Find the rule across each row.', 'Tap the shape that fits the gap.'],
  'word-roots': ['Read the word part, like “bio”.', 'Look at the choices.', 'Tap its meaning (life).'],
  'antonym-match': ['Read the word, like happy.', 'Look at the four choices.', 'Tap the opposite (sad).'],
  'binary-blitz': ['Read the binary number, like 101.', 'Work out its value (5).', 'Give your answer.'],
  'number-bonds': ['Read the target, like 10.', 'Tap two tiles that add up to it (3 and 7).', 'Make as many pairs as you can.'],
  'rounding-rush': ['Read the number and what to round to.', 'Round it, like 47 to the nearest 10 is 50.', 'Give your answer.'],
  'clock-read': ['Look at the short hand for the hour.', 'Look at the long hand for the minutes.', 'Tap the time the clock shows.'],
  'final-vault': ['Solve the puzzle in each temple chamber.', 'A wrong answer adds 30 seconds.', 'Solve all five to open the vault.'],
  'running-total-pro': ['Watch the numbers arrive one at a time.', 'Keep the total in your head (sometimes two totals).', 'Pick the total at the end.'],
  'data-chart-quiz': ['Read the chart: title, labels and scale.', 'Answer each question about it.', 'Be quick — the clock is running.'],
  'jigsaw': ['Look at the picture before it hides.', 'Drag each piece to its place (or tap a piece, then its place).', 'Peek at the picture twice if you need to.'],
  'arrow-escape': ['Tap an arrow with a clear way to the edge.', 'It slides off — a blocked tap costs a heart.', 'Clear the board; hold an arrow to see its way out.'],
  'speak-up': ['Tap the microphone and speak.', 'Read, race the twister, answer, retell.', '60 passes a round; tap red words to hear them.'],
  'wordcraft': ['Three challenges a level, the twister always one.', 'Tap the microphone and speak (or type where you must).', 'Twister: 5 in a row. Others: 60 passes.'],
  'speed-distance': ['Read the journey.', 'Drag the 📍 along the track or clock line to your answer.', 'Press Check and watch the vehicles drive it out.']
};

const YOUNG_STEPS = { 'treasure-path': ['Find the explorer 🧒 on the ancient map.', 'Read the riddle and tap the answer.', 'Right answers walk on to the treasure 💰.'] };
export const shortStepsOf = (id, young = false) => (young && YOUNG_STEPS[id]) || SHORT_STEPS[id] || null;
