/* How to play, and the briefing line, for Master Minds' relaxed set (2026-11-17). */

export const COACH = {
  'jigsaw': {
    steps: [
      'The picture shows for a few seconds — remember it — then it hides.',
      'Drag each piece onto its place on the board (or tap a piece, then tap its place). Edge pieces have a flat side.',
      'You can peek at the picture 2 times. Too many pieces in the wrong place and the puzzle is lost.'
    ],
    tip: 'Do the corners and edges first — their flat sides tell you where they go.'
  },
  'arrow-escape': {
    steps: [
      'Tap an arrow: if nothing is between its head and the edge, it slides off the board.',
      'A blocked arrow costs a heart — you have 3. Each arrow that leaves opens lanes for others.',
      'Clear the whole board. Stuck? Use a hint, or press and hold an arrow to see its way out.'
    ],
    tip: 'Start with arrows on the outside pointing out — then look for the ones they were blocking.'
  },
  'speak-up': {
    steps: [
      'Tap the 🎤 and speak; tap ■ when you finish. Allow the microphone when the browser asks.',
      'Four rounds: read a paragraph aloud, race a tongue twister, answer an interview question for 30 seconds, retell a story.',
      'Each round is scored out of 100 — 60 passes, and you get a second try. Tap a red word to hear how it is said.'
    ],
    tip: 'Speak at a steady pace and pause at full stops — clear beats fast, except in the twister.'
  },
  'wordcraft': {
    steps: [
      'Every level is three challenges: the Tongue Twister (compulsory) and two of Don\'t Say That!, Caption Clash, Talk for 60, Plot Twist and Sell the Impossible.',
      'Tap the 🎤 and speak — allow the microphone when the browser asks. The twister needs five correct in a row.',
      'Each challenge is scored out of 100; 60 passes. Pass challenges for stars — the level clears only with the twister done.'
    ],
    tip: 'Pause silently instead of saying “um” — and reach for the precise word, not the easy one.'
  },
  'final-vault': {
    steps: [
      'Five temple chambers, one puzzle each: the ancient lock, the hidden mechanism, the secret code, the light path and the final trial.',
      'Solve each one to walk on to the next. A wrong answer adds 30 seconds and jams the door for a moment.',
      'Open the vault within 7 minutes. Clues from earlier chambers help with the final trial.'
    ],
    tip: 'Note each relic and number as you go — the final trial uses them.'
  },
  'word-search': {
    steps: ['Read the theme and the word list.', 'Drag across a hidden word, or tap its first letter and then its last.', 'Find the words before the clock runs out.'],
    tip: 'Scan for a rare letter in the word — a Z, K, V or double letter — then look around it.'
  },
  'sum-pop': {
    steps: ['Read the target: ➕ add to it, or ✖️ multiply to it on later levels.', 'Tap two or three bubbles that make it — negatives count!', 'Every pop brings a new target; pop as many as you can.'],
    tip: 'With negatives, pair a big positive with a negative: 45 + (−12) = 33. For products, think factors first.'
  },
  'change-maker': {
    steps: ['Add the bill: each price × its quantity.', 'Take the discount off, then add GST on what is left, and round to the rupee.', 'Hand back the change in notes and coins.'],
    tip: '20% off then 18% GST is × 0.8 × 1.18 = × 0.944 — one multiplication, not two steps.'
  },
  'best-buy': {
    steps: ['Read the two or three offers.', 'Compare per kg or litre, the true discount, the EMI total or the interest earned.', 'Tap the real best deal.'],
    tip: '20% then 10% off is 28% off, not 30%. Buy 2 get 1 free is 33% off. Compound beats simple over time.'
  },
  'number-trail': {
    steps: ['Every bubble is a value written its own way — 3/8, 45%, √10, 2³, log₂ 8.', 'Tap them from smallest to largest.', 'Finish three boards fast; a wrong tap adds a second.'],
    tip: 'Turn everything into a decimal in your head: √10 ≈ 3.16, 3/8 = 0.375, 2⁻¹ = 0.5.'
  },
  'quick-estimate': {
    steps: ['Read the expression — ×, ÷, √, %, growth or a power.', 'Round the numbers and estimate; no exact working.', 'Tap the closest option before the bar runs out.'],
    tip: 'Rule of 72: money at 8% doubles in about 9 years. √ of 4,900 is 70, so √5,000 is a bit over 70.'
  }
};

export const QUOTE = {
  'jigsaw': { lead: 'Every', hot: 'piece', rest: 'has its place.', line: 'Seeing how parts fit a whole is the heart of good thinking.', cheer: 'Piece it together!' },
  'arrow-escape': { lead: 'Order', hot: 'unlocks', rest: 'everything.', line: 'The right first step makes every next step easy.', cheer: 'Clear the board!' },
  'wordcraft': { lead: 'Words are', hot: 'power', rest: '— craft them.', line: 'Explaining, persuading and storytelling are the skills every career runs on.', cheer: 'Mic on, mind sharp!' },
  'speak-up': { lead: 'Say it', hot: 'clearly,', rest: 'say it well.', line: 'Clear speaking opens doors — in interviews, meetings and everywhere else.', cheer: 'Mic on!' },
  'running-total-pro': { lead: 'Keep the', hot: 'count', rest: 'rolling.', line: 'Holding numbers in your head is the base of every quick decision.', cheer: 'Steady and sharp!' },
  'data-chart-quiz': { lead: 'Charts', hot: 'speak', rest: 'numbers.', line: 'Reading a chart fast is a skill every office and newsroom needs.', cheer: 'Read it, then answer!' },
  'speed-distance': { lead: 'Every', hot: 'journey', rest: 'is maths.', line: 'Speed, time and distance plan every trip, train and delivery.', cheer: 'Drag it to the spot!' },
  'final-vault': { lead: 'Five', hot: 'chambers,', rest: 'one treasure.', line: 'Great escapes are many small puzzles, solved in order.', cheer: 'The vault is waiting!' },
  'word-search': { lead: 'Words', hot: 'hide', rest: 'in plain sight.', line: 'Every field has its own words — science, business, art and more.', cheer: 'Sharp eyes find them all.' },
  'sum-pop': { lead: 'Find the', hot: 'pair,', rest: 'pop the pair.', line: 'Number bonds are the quiet engine of mental maths.', cheer: 'Pop, pop, pop!' },
  'change-maker': { lead: 'Maths', hot: 'pays', rest: 'every day.', line: 'Counting change is a skill every job and every shop needs.', cheer: 'Count up, hand over.' },
  'best-buy': { lead: 'Smart', hot: 'buyers', rest: 'compare.', line: 'Price per unit is the secret behind every good deal.', cheer: 'Spot the saving!' },
  'number-trail': { lead: 'Eyes', hot: 'ahead,', rest: 'finger follows.', line: 'Focus is looking for the next thing while doing this one.', cheer: 'Smooth and steady.' },
  'quick-estimate': { lead: 'Close', hot: 'enough', rest: 'is clever.', line: 'Good estimates catch big mistakes before they happen.', cheer: 'Trust your instinct.' }
};
