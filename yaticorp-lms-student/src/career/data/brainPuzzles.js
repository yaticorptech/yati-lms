/**
 * Question banks for the quiz-style brain games.
 *
 * Every item carries a `level` from 1 to 3 so the difficulty picker filters on
 * something real — a harder level asks harder questions, rather than simply
 * asking more of the same ones.
 *
 * Each item also carries a one-line explanation shown after the answer, so a
 * wrong guess still teaches the rule instead of only being marked wrong.
 */

/** Number patterns for "Next in Sequence". */
export const SEQUENCES = [
  { run: [2, 4, 6, 8], answer: 10, rule: 'Add 2 each time', level: 1 },
  { run: [3, 6, 12, 24], answer: 48, rule: 'Double each time', level: 1 },
  { run: [1, 4, 9, 16], answer: 25, rule: 'Square numbers', level: 1 },
  { run: [5, 10, 20, 40], answer: 80, rule: 'Double each time', level: 1 },
  { run: [50, 45, 40, 35], answer: 30, rule: 'Subtract 5 each time', level: 1 },
  { run: [7, 14, 28, 56], answer: 112, rule: 'Double each time', level: 1 },
  { run: [4, 9, 16, 25], answer: 36, rule: 'Squares from 2 upward', level: 1 },
  { run: [1, 1, 2, 3, 5], answer: 8, rule: 'Each is the sum of the two before it', level: 2 },
  { run: [2, 3, 5, 7, 11], answer: 13, rule: 'Prime numbers', level: 2 },
  { run: [81, 27, 9], answer: 3, rule: 'Divide by 3 each time', level: 2 },
  { run: [1, 8, 27, 64], answer: 125, rule: 'Cube numbers', level: 2 },
  { run: [3, 5, 9, 17], answer: 33, rule: 'Double and subtract 1', level: 2 },
  { run: [100, 90, 81, 73], answer: 66, rule: 'Subtract 10, then 9, then 8, then 7', level: 3 },
  { run: [1, 3, 7, 15], answer: 31, rule: 'Double and add 1', level: 3 },
  { run: [12, 10, 13, 11], answer: 14, rule: 'Subtract 2, then add 3, repeating', level: 3 },
  { run: [6, 11, 21, 41], answer: 81, rule: 'Double and subtract 1', level: 3 },
  { run: [2, 6, 12, 20], answer: 30, rule: 'Gaps grow by 2: +4, +6, +8, +10', level: 3 }
];

/** Synonym questions. Wrong options are close enough to require reading. */
export const SYNONYMS = [
  { word: 'CONCISE', answer: 'Brief', wrong: ['Detailed', 'Confusing', 'Loud'], level: 1 },
  { word: 'DILIGENT', answer: 'Hard-working', wrong: ['Careless', 'Cheerful', 'Distant'], level: 1 },
  { word: 'RESILIENT', answer: 'Tough', wrong: ['Fragile', 'Restless', 'Generous'], level: 1 },
  { word: 'VERSATILE', answer: 'Adaptable', wrong: ['Rigid', 'Verbal', 'Vain'], level: 1 },
  { word: 'NOVICE', answer: 'Beginner', wrong: ['Expert', 'Noble', 'Nomad'], level: 1 },
  { word: 'CANDID', answer: 'Frank', wrong: ['Secretive', 'Nervous', 'Polite'], level: 2 },
  { word: 'AMBIGUOUS', answer: 'Unclear', wrong: ['Obvious', 'Ambitious', 'Formal'], level: 2 },
  { word: 'PRUDENT', answer: 'Cautious', wrong: ['Reckless', 'Proud', 'Prompt'], level: 2 },
  { word: 'METICULOUS', answer: 'Very careful', wrong: ['Hasty', 'Metallic', 'Modest'], level: 2 },
  { word: 'OBSOLETE', answer: 'Out of date', wrong: ['Obvious', 'Essential', 'Absolute'], level: 2 },
  { word: 'TENACIOUS', answer: 'Persistent', wrong: ['Tense', 'Fragile', 'Talkative'], level: 3 },
  { word: 'LUCID', answer: 'Clear', wrong: ['Lucky', 'Dim', 'Loose'], level: 3 },
  { word: 'ARDUOUS', answer: 'Difficult', wrong: ['Easy', 'Arid', 'Eager'], level: 3 },
  { word: 'PRAGMATIC', answer: 'Practical', wrong: ['Idealistic', 'Programmed', 'Proud'], level: 3 },
  { word: 'SCRUTINISE', answer: 'Examine closely', wrong: ['Ignore', 'Scatter', 'Scold'], level: 3 }
];

/** "Odd One Out": three items share something the fourth does not. */
export const ODD_ONE_OUT = [
  { items: ['Cat', 'Dog', 'Horse', 'Oak'], answer: 'Oak', why: 'The others are animals', level: 1 },
  { items: ['2', '4', '9', '16'], answer: '9', why: 'The others are even', level: 1 },
  { items: ['Python', 'Java', 'Linux', 'Ruby'], answer: 'Linux', why: 'The others are languages; Linux is an operating system', level: 1 },
  { items: ['Red', 'Blue', 'Loud', 'Green'], answer: 'Loud', why: 'The others are colours', level: 1 },
  { items: ['Square', 'Circle', 'Cube', 'Triangle'], answer: 'Cube', why: 'The others are 2D shapes', level: 2 },
  { items: ['Mercury', 'Venus', 'Europa', 'Mars'], answer: 'Europa', why: 'The others are planets; Europa is a moon', level: 2 },
  { items: ['HTTP', 'FTP', 'HTML', 'SMTP'], answer: 'HTML', why: 'The others are protocols; HTML is a markup language', level: 2 },
  { items: ['Mean', 'Median', 'Mode', 'Matrix'], answer: 'Matrix', why: 'The others are averages', level: 2 },
  { items: ['11', '13', '17', '21'], answer: '21', why: 'The others are prime; 21 is 3 x 7', level: 2 },
  { items: ['Stack', 'Queue', 'Quicksort', 'Tree'], answer: 'Quicksort', why: 'The others are data structures; quicksort is an algorithm', level: 3 },
  { items: ['Kilogram', 'Metre', 'Second', 'Newton'], answer: 'Newton', why: 'The others are SI base units; the newton is derived', level: 3 },
  { items: ['64', '81', '100', '128'], answer: '128', why: 'The others are perfect squares', level: 3 },
  { items: ['Encapsulation', 'Inheritance', 'Compilation', 'Polymorphism'], answer: 'Compilation', why: 'The others are principles of object-oriented design', level: 3 }
];

/**
 * "Sentence Gap": choose the word that fits the sentence.
 *
 * Usage in context rather than definition — a different skill from the synonym
 * game, and the wrong options are real words that almost fit.
 */
export const SENTENCE_GAPS = [
  { text: 'She gave a ___ answer: just three words.', answer: 'concise', wrong: ['spacious', 'gradual', 'hollow'], level: 1 },
  { text: 'The plan is ___ — we can actually build it.', answer: 'viable', wrong: ['visible', 'vital', 'violent'], level: 1 },
  { text: 'They had to ___ the terms before signing.', answer: 'negotiate', wrong: ['navigate', 'nominate', 'neglect'], level: 1 },
  { text: 'A ___ engineer can move between teams easily.', answer: 'versatile', wrong: ['verbose', 'veritable', 'vertical'], level: 1 },
  { text: 'The deadline is ___, so we start today.', answer: 'imminent', wrong: ['immune', 'immense', 'imitated'], level: 2 },
  { text: 'He was ___ about the mistake and owned it.', answer: 'candid', wrong: ['candied', 'canny', 'cordial'], level: 2 },
  { text: 'Her notes were ___, covering every case.', answer: 'thorough', wrong: ['throughout', 'thoughtful', 'throwaway'], level: 2 },
  { text: 'The old format is now ___ and unsupported.', answer: 'obsolete', wrong: ['obscure', 'absolute', 'obstinate'], level: 2 },
  { text: 'She stayed ___ after three rejections.', answer: 'resilient', wrong: ['reluctant', 'resistant', 'resentful'], level: 2 },
  { text: 'The evidence was ___, pointing two ways at once.', answer: 'ambiguous', wrong: ['ambitious', 'amiable', 'amplified'], level: 3 },
  { text: 'We should ___ the results before publishing.', answer: 'scrutinise', wrong: ['scatter', 'sanction', 'summarise'], level: 3 },
  { text: 'His ___ approach ignored the theory entirely.', answer: 'pragmatic', wrong: ['dogmatic', 'systematic', 'emphatic'], level: 3 }
];

/**
 * "Deduction": does the conclusion follow from the two statements?
 *
 * Validity only — several are true-sounding but do not follow, which is the
 * whole point. `why` names the flaw so a wrong answer teaches the rule.
 */
export const SYLLOGISMS = [
  { premises: ['All cats are mammals.', 'All mammals are animals.'], conclusion: 'All cats are animals.', answer: 'Follows', why: 'The chain links up: cats → mammals → animals', level: 1 },
  { premises: ['All roses are flowers.', 'Some flowers fade quickly.'], conclusion: 'Some roses fade quickly.', answer: 'Does not follow', why: 'The flowers that fade need not be the roses', level: 1 },
  { premises: ['No fish are birds.', 'All sparrows are birds.'], conclusion: 'No sparrows are fish.', answer: 'Follows', why: 'Sparrows are inside birds, which is excluded from fish', level: 1 },
  { premises: ['Some students are athletes.', 'All athletes train daily.'], conclusion: 'Some students train daily.', answer: 'Follows', why: 'The student-athletes are athletes, so they train', level: 2 },
  { premises: ['All squares are rectangles.', 'Some rectangles are tall.'], conclusion: 'Some squares are tall.', answer: 'Does not follow', why: 'The tall rectangles need not include any square', level: 2 },
  { premises: ['If it rains, the match is cancelled.', 'The match was cancelled.'], conclusion: 'It rained.', answer: 'Does not follow', why: 'Something else could have cancelled it', level: 2 },
  { premises: ['If it rains, the match is cancelled.', 'It rained.'], conclusion: 'The match was cancelled.', answer: 'Follows', why: 'The condition was met, so the result holds', level: 2 },
  { premises: ['No reptiles are warm-blooded.', 'Some pets are reptiles.'], conclusion: 'Some pets are not warm-blooded.', answer: 'Follows', why: 'Those pets are reptiles, which are excluded', level: 3 },
  { premises: ['All engineers can code.', 'Priya can code.'], conclusion: 'Priya is an engineer.', answer: 'Does not follow', why: 'Coding does not make someone an engineer', level: 3 },
  { premises: ['Every book here is old.', 'Nothing old is for sale.'], conclusion: 'No book here is for sale.', answer: 'Follows', why: 'Books here are old, and nothing old is for sale', level: 3 },
  { premises: ['Some managers are engineers.', 'No engineers work weekends.'], conclusion: 'No managers work weekends.', answer: 'Does not follow', why: 'Only the engineer-managers are excluded', level: 3 }
];

/** "Spelling Fix": one of these four is spelled correctly. */
export const SPELLINGS = [
  { answer: 'necessary', wrong: ['neccessary', 'necesary', 'neccesary'], level: 1 },
  { answer: 'definitely', wrong: ['definately', 'definatly', 'definitley'], level: 1 },
  { answer: 'separate', wrong: ['seperate', 'seperete', 'separete'], level: 1 },
  { answer: 'received', wrong: ['recieved', 'receievd', 'recived'], level: 1 },
  { answer: 'occurred', wrong: ['occured', 'ocurred', 'occurrd'], level: 2 },
  { answer: 'accommodate', wrong: ['acommodate', 'accomodate', 'acomodate'], level: 2 },
  { answer: 'privilege', wrong: ['priviledge', 'privelege', 'privilage'], level: 2 },
  { answer: 'maintenance', wrong: ['maintainance', 'maintenence', 'maintanence'], level: 2 },
  { answer: 'conscientious', wrong: ['consciencious', 'conscentious', 'conscientous'], level: 3 },
  { answer: 'entrepreneur', wrong: ['entreprenuer', 'entrepeneur', 'enterpreneur'], level: 3 },
  { answer: 'liaison', wrong: ['liason', 'liaision', 'liasion'], level: 3 },
  { answer: 'perseverance', wrong: ['perseverence', 'persaverance', 'perserverance'], level: 3 }
];

/**
 * "Word Roots": what a prefix or root means.
 *
 * Worth more than the twelve words themselves — a student who knows "bene-"
 * can read a hundred words they have never met.
 */
export const WORD_ROOTS = [
  { part: 'RE-', answer: 'again', wrong: ['against', 'before', 'without'], example: 'rebuild, revisit', level: 1 },
  { part: 'PRE-', answer: 'before', wrong: ['after', 'around', 'under'], example: 'preview, predict', level: 1 },
  { part: 'SUB-', answer: 'under', wrong: ['over', 'beside', 'through'], example: 'submarine, subway', level: 1 },
  { part: 'UN-', answer: 'not', wrong: ['very', 'again', 'together'], example: 'unfair, unknown', level: 1 },
  { part: 'BENE-', answer: 'good', wrong: ['bad', 'small', 'many'], example: 'benefit, benevolent', level: 2 },
  { part: 'MAL-', answer: 'bad', wrong: ['good', 'large', 'equal'], example: 'malfunction, malice', level: 2 },
  { part: 'AUTO-', answer: 'self', wrong: ['other', 'machine', 'sound'], example: 'autonomy, autograph', level: 2 },
  { part: 'CHRON-', answer: 'time', wrong: ['colour', 'place', 'shape'], example: 'chronology, synchronise', level: 2 },
  { part: 'VER-', answer: 'truth', wrong: ['green', 'toward', 'life'], example: 'verify, veracity', level: 3 },
  { part: 'LOQU-', answer: 'speak', wrong: ['listen', 'write', 'move'], example: 'eloquent, soliloquy', level: 3 },
  { part: 'MAGN-', answer: 'great', wrong: ['magnet', 'middle', 'weak'], example: 'magnify, magnanimous', level: 3 },
  { part: 'TEN-', answer: 'hold', wrong: ['ten', 'stretch', 'end'], example: 'tenacious, retain', level: 3 }
];
