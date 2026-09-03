/**
 * @description The small daily activity a student meets on the dashboard.
 *
 * Hand-written rather than generated. A puzzle per student per day would be a
 * Gemini call per student per day, against an allowance of 30 where a single
 * onboarding already costs three — and it would put a several-second wait in
 * front of the dashboard. These are instant, free, and the same quality every
 * time.
 *
 * Banded by how far along the student is, because "what is 7 x 8" and "what
 * does this Python slice return" are not the same invitation. The band comes
 * from the education level they gave Career Path; a student with no level gets
 * no activity, because guessing one would land a Class 5 child on an aptitude
 * question meant for a final-year engineer.
 *
 * `answer` is the index into `options`. Every item carries a `why` — the
 * activity is a moment of learning, not a score, so the explanation shows
 * whether they got it right or wrong.
 */

// Bands, in the order a student passes through them.
const JUNIOR = 'junior';   // Primary and Middle school
const SCHOOL = 'school';   // Class 9 to 12
const HIGHER = 'higher';   // Diploma, UG, PG, working

const BAND_BY_LEVEL = {
  'Primary School (Class 1–5)': JUNIOR,
  'Middle School (Class 6–8)': JUNIOR,
  'High School (Class 9–10)': SCHOOL,
  'Higher Secondary (Class 11–12)': SCHOOL,
  Diploma: HIGHER,
  Undergraduate: HIGHER,
  Postgraduate: HIGHER,
  'Working Professional': HIGHER
};

const ACTIVITIES = [
  // ── Junior ────────────────────────────────────────────────────────────────
  { id: 'j-seq-1', band: JUNIOR, kind: 'Pattern', prompt: 'What comes next?  2, 4, 8, 16, ___', options: ['20', '24', '32', '18'], answer: 2, why: 'Each number doubles the one before it, so 16 x 2 = 32.' },
  { id: 'j-odd-1', band: JUNIOR, kind: 'Odd one out', prompt: 'Which one does not belong?', options: ['Triangle', 'Square', 'Circle', 'Cube'], answer: 3, why: 'A cube is a solid shape. The others are flat shapes you can draw on paper.' },
  { id: 'j-math-1', band: JUNIOR, kind: 'Quick maths', prompt: 'A shop sells pencils at ₹5 each. You have ₹37. How many can you buy?', options: ['6', '7', '8', '9'], answer: 1, why: '7 pencils cost ₹35, leaving ₹2 — not enough for an eighth.' },
  { id: 'j-word-1', band: JUNIOR, kind: 'Word puzzle', prompt: 'Unscramble:  T A E R W', options: ['WATER', 'WRATE', 'TAWER', 'RETAW'], answer: 0, why: 'The letters spell WATER.' },
  { id: 'j-riddle-1', band: JUNIOR, kind: 'Riddle', prompt: 'I have hands but cannot clap. What am I?', options: ['A tree', 'A clock', 'A river', 'A book'], answer: 1, why: 'A clock has hour and minute hands.' },
  { id: 'j-logic-1', band: JUNIOR, kind: 'Logic', prompt: 'All cats have tails. Simba is a cat. So Simba…', options: ['might have a tail', 'has a tail', 'has no tail', 'is not a cat'], answer: 1, why: 'If every cat has a tail and Simba is a cat, Simba must have one.' },
  { id: 'j-seq-2', band: JUNIOR, kind: 'Pattern', prompt: 'What comes next?  1, 4, 9, 16, ___', options: ['20', '24', '25', '30'], answer: 2, why: 'These are square numbers: 1², 2², 3², 4², so next is 5² = 25.' },
  { id: 'j-math-2', band: JUNIOR, kind: 'Quick maths', prompt: 'Half of a number is 18. What is one third of it?', options: ['6', '9', '12', '18'], answer: 2, why: 'The number is 36, and a third of 36 is 12.' },
  { id: 'j-odd-2', band: JUNIOR, kind: 'Odd one out', prompt: 'Which one does not belong?', options: ['Ganga', 'Yamuna', 'Godavari', 'Himalaya'], answer: 3, why: 'The Himalaya is a mountain range. The rest are rivers.' },
  { id: 'j-riddle-2', band: JUNIOR, kind: 'Riddle', prompt: 'The more you take away from me, the bigger I get. What am I?', options: ['A shadow', 'A hole', 'A cloud', 'A balloon'], answer: 1, why: 'Taking soil away from a hole makes the hole larger.' },

  // ── School ────────────────────────────────────────────────────────────────
  { id: 's-apt-1', band: SCHOOL, kind: 'Aptitude', prompt: 'A train 120 m long runs at 60 km/h. How long to pass a pole?', options: ['6.2 s', '7.2 s', '8.0 s', '9.6 s'], answer: 1, why: '60 km/h = 16.67 m/s. 120 ÷ 16.67 ≈ 7.2 seconds.' },
  { id: 's-logic-1', band: SCHOOL, kind: 'Logic', prompt: 'If some A are B, and all B are C, which must be true?', options: ['All A are C', 'Some A are C', 'No A is C', 'All C are A'], answer: 1, why: 'The A that are B must also be C — so at least some A are C.' },
  { id: 's-seq-1', band: SCHOOL, kind: 'Series', prompt: 'What comes next?  3, 6, 11, 18, 27, ___', options: ['36', '38', '40', '42'], answer: 1, why: 'The gaps grow 3, 5, 7, 9 — so the next gap is 11, and 27 + 11 = 38.' },
  { id: 's-sci-1', band: SCHOOL, kind: 'Science', prompt: 'Why does a heavy stone and a light stone fall together in a vacuum?', options: ['No air resistance', 'Gravity is stronger', 'They weigh the same', 'They do not'], answer: 0, why: 'Without air resistance, gravity accelerates every mass equally.' },
  { id: 's-apt-2', band: SCHOOL, kind: 'Aptitude', prompt: 'A price rises 20%, then falls 20%. The final price is…', options: ['unchanged', '4% lower', '4% higher', '2% lower'], answer: 1, why: '100 → 120 → 96. A fall of 20% is taken from the larger number.' },
  { id: 's-word-1', band: SCHOOL, kind: 'Verbal', prompt: 'PEN is to WRITER as BRUSH is to…', options: ['Paint', 'Canvas', 'Painter', 'Colour'], answer: 2, why: 'A pen is the tool of a writer; a brush is the tool of a painter.' },
  { id: 's-math-1', band: SCHOOL, kind: 'Quick maths', prompt: 'What is the sum of the first 20 natural numbers?', options: ['190', '200', '210', '220'], answer: 2, why: 'n(n+1)/2 = 20 × 21 ÷ 2 = 210.' },
  { id: 's-logic-2', band: SCHOOL, kind: 'Logic', prompt: 'Five friends sit in a row. Anu is exactly in the middle. How many sit to her left?', options: ['1', '2', '3', '4'], answer: 1, why: 'In a row of five, the middle seat is third — two on each side.' },
  { id: 's-sci-2', band: SCHOOL, kind: 'Science', prompt: 'Which travels fastest?', options: ['Sound in air', 'Sound in water', 'Light in air', 'Sound in steel'], answer: 2, why: 'Light moves at about 300,000 km/s — far faster than sound in any medium.' },
  { id: 's-apt-3', band: SCHOOL, kind: 'Aptitude', prompt: 'Two taps fill a tank in 6 h and 3 h. Together they take…', options: ['1.5 h', '2 h', '2.5 h', '4.5 h'], answer: 1, why: 'Rates add: 1/6 + 1/3 = 1/2 of the tank per hour, so 2 hours.' },

  // ── Higher ────────────────────────────────────────────────────────────────
  { id: 'h-code-1', band: HIGHER, kind: 'Code output', prompt: 'In Python, what does  [1,2,3,4,5][1:4]  return?', options: ['[1,2,3]', '[2,3,4]', '[2,3,4,5]', '[1,2,3,4]'], answer: 1, why: 'Slicing takes indices 1, 2 and 3 — the end index is excluded.' },
  { id: 'h-apt-1', band: HIGHER, kind: 'Aptitude', prompt: 'Work done by 6 people in 12 days. How long for 9 people?', options: ['6 days', '8 days', '9 days', '18 days'], answer: 1, why: 'The job is 72 person-days; 72 ÷ 9 = 8 days.' },
  { id: 'h-logic-1', band: HIGHER, kind: 'Logic', prompt: 'You have 8 balls, one heavier. Fewest weighings on a balance to find it?', options: ['2', '3', '4', '7'], answer: 0, why: 'Weigh 3 v 3. If equal, weigh the last two. If not, weigh two from the heavy side. Two weighings.' },
  { id: 'h-cs-1', band: HIGHER, kind: 'Computer science', prompt: 'Average time to find an item in a balanced binary search tree of n items?', options: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'], answer: 1, why: 'Each comparison halves the remaining tree, giving logarithmic time.' },
  { id: 'h-code-2', band: HIGHER, kind: 'Code output', prompt: 'In JavaScript, what is  typeof null ?', options: ["'null'", "'object'", "'undefined'", "'boolean'"], answer: 1, why: "A long-standing quirk of the language: typeof null returns 'object'." },
  { id: 'h-apt-2', band: HIGHER, kind: 'Aptitude', prompt: 'A sum doubles in 8 years at simple interest. The annual rate is…', options: ['8%', '10%', '12.5%', '15%'], answer: 2, why: 'Interest equals the principal over 8 years, so 100 ÷ 8 = 12.5% a year.' },
  { id: 'h-cs-2', band: HIGHER, kind: 'Computer science', prompt: 'Which HTTP status means "you are asking for something that is not there"?', options: ['400', '401', '404', '500'], answer: 2, why: '404 is Not Found. 400 is a malformed request, 401 unauthenticated, 500 a server fault.' },
  { id: 'h-logic-2', band: HIGHER, kind: 'Logic', prompt: 'Three switches downstairs, one bulb upstairs. Fewest trips upstairs to identify the switch?', options: ['1', '2', '3', 'Impossible'], answer: 0, why: 'Turn on switch A for ten minutes, then off; turn on B and go up. Lit = B, off but warm = A, off and cold = C.' },
  { id: 'h-cs-3', band: HIGHER, kind: 'Computer science', prompt: 'What does a database index mainly cost you?', options: ['Read speed', 'Write speed and storage', 'Accuracy', 'Nothing'], answer: 1, why: 'Reads get faster; every write must also update the index, and it occupies disk.' },
  { id: 'h-apt-3', band: HIGHER, kind: 'Aptitude', prompt: 'In how many ways can the letters of LEVEL be arranged?', options: ['20', '30', '60', '120'], answer: 1, why: '5! ÷ (2! × 2!) = 120 ÷ 4 = 30, because L and E each repeat.' }
];

/** The band a student falls in, or null when we cannot tell. */
const bandFor = (educationLevel) => BAND_BY_LEVEL[educationLevel] || null;

const forBand = (band) => ACTIVITIES.filter((a) => a.band === band);

/** Never send the answer to the browser — it is one keystroke from the console. */
const publicShape = (a) => ({ id: a.id, kind: a.kind, prompt: a.prompt, options: a.options });

module.exports = { ACTIVITIES, BAND_BY_LEVEL, bandFor, forBand, publicShape, JUNIOR, SCHOOL, HIGHER };
