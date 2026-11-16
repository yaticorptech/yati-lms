/**
 * Age-band content for three language games (2026-11-13): Word Scramble, Typing Sprint and Spelling Fix.
 * Tense Pick's sentences are in ./tenses.js. Pure — no React — so tests/games/wordBands.test.js loads it under node.
 *
 * Bands: 'foundation' (Classes 1–2), 'developing' (3–5), 'intermediate' (6–8), 'analytical' (9–10),
 * 'advanced' (11–12+). null plays as 'analytical', which is how the games played before bands.
 * Every item carries `level` 1–3, matched against progress.difficulty (zones.js bounds it per band, so the
 * young bands live mostly on 1, borrowing from 2).
 */
import BRAIN_WORDS from '../brainWords.js';
import { buildSpellings, misspell } from '../genSpellings.js';
import { BANDS } from '../../components/games/zones.js';
import { seeded, shuffle } from '../seeded.js';

export const BAND_KEYS = ['foundation', 'developing', 'intermediate', 'analytical', 'advanced'];
export const bandKey = (ageBand) => (BAND_KEYS.includes(ageBand) ? ageBand : 'analytical');
export const isYoung = (ageBand) => ['foundation', 'developing'].includes(bandKey(ageBand));

/** How far through its band a step sits, 0..1, measured against the band's own top step. */
export const bandRamp = (ageBand, levelNo) => {
  const top = BANDS[bandKey(ageBand)]?.maxStep || 30;
  return Math.min(1, Math.max(0, (levelNo - 1) / Math.max(1, top - 1)));
};
const lerp = (from, to, r) => Math.round(from + (to - from) * r);

/**
 * The items a round may use: the difficulty's own level, widening to one level above from a quarter of the
 * way through the band and two above from three quarters (so a young band, held at difficulty 1, still climbs). Falls back to whatever the band has nearest, so a round is never empty.
 */
export const itemsFor = (list, difficulty, r = 0) => {
  const top = difficulty + Math.round(Math.min(1, Math.max(0, r)) * 2);
  const out = list.filter((x) => x.level >= difficulty && x.level <= top);
  if (out.length) return out;
  const nearest = [...list].sort((a, b) => Math.abs(a.level - difficulty) - Math.abs(b.level - difficulty));
  return nearest.filter((x) => x.level === nearest[0]?.level);
};

/* ============================================================ WORD SCRAMBLE == */

const byLength = (len, cuts) => (len <= cuts[0] ? 1 : len <= cuts[1] ? 2 : 3);

/* Foundation: three-letter picture words. Level 1 the short-vowel ones, level 2 the rest. [word, picture, clue, level] */
const FOUNDATION_SCRAMBLE = [
  ['CAT', '🐱', 'It says meow.', 1], ['DOG', '🐶', 'It says woof.', 1], ['SUN', '☀️', 'It shines in the sky.', 1],
  ['PIG', '🐷', 'A pink farm animal.', 1], ['HEN', '🐔', 'It lays eggs.', 1], ['BUS', '🚌', 'A big ride to school.', 1],
  ['BED', '🛏️', 'You sleep in it.', 1], ['CUP', '🥤', 'You drink from it.', 1], ['MUG', '☕', 'Hot tea goes in it.', 1],
  ['HAT', '🎩', 'You wear it on your head.', 1], ['ANT', '🐜', 'A tiny insect.', 1], ['FOX', '🦊', 'An orange wild animal.', 1],
  ['BAT', '🦇', 'It flies at night.', 1], ['RAT', '🐀', 'A small animal with a long tail.', 1], ['MAP', '🗺️', 'It shows the way.', 1],
  ['PEN', '🖊️', 'You write with it.', 1], ['BOX', '📦', 'You put things in it.', 1], ['VAN', '🚐', 'A small bus.', 1],
  ['CAB', '🚕', 'A yellow car you pay to ride.', 1], ['BAG', '👜', 'You carry things in it.', 1], ['LEG', '🦵', 'You walk on it.', 1],
  ['LIP', '👄', 'Part of your mouth.', 1], ['WEB', '🕸️', 'A spider makes it.', 1], ['GEM', '💎', 'A shiny stone.', 1],
  ['NUT', '🥜', 'A squirrel eats it.', 1], ['TUB', '🛁', 'You take a bath in it.', 1], ['PIN', '📌', 'It holds paper on a board.', 1],
  ['SIX', '6️⃣', 'Five and one more.', 1], ['TEN', '🔟', 'All your fingers.', 1], ['RED', '🔴', 'The colour of a tomato.', 1],
  ['HUT', '🛖', 'A small, simple house.', 1], ['JAR', '🫙', 'Jam comes in it.', 1], ['PAN', '🍳', 'You cook an egg in it.', 1],
  ['COW', '🐮', 'It gives us milk.', 2], ['EGG', '🥚', 'A hen lays it.', 2], ['BEE', '🐝', 'It makes honey.', 2],
  ['OWL', '🦉', 'A bird awake at night.', 2], ['KEY', '🔑', 'It opens a lock.', 2], ['ICE', '🧊', 'Very cold, frozen water.', 2],
  ['PIE', '🥧', 'A baked treat with a crust.', 2], ['EAR', '👂', 'You hear with it.', 2], ['EYE', '👁️', 'You see with it.', 2],
  ['ARM', '💪', 'Your hand is at the end of it.', 2], ['BOW', '🎀', 'A ribbon tied in loops.', 2], ['TOY', '🧸', 'A thing you play with.', 2],
  ['TIE', '👔', 'Dad wears it with a shirt.', 2], ['AXE', '🪓', 'It chops wood.', 2], ['SEA', '🌊', 'Big salty water.', 2],
  ['ONE', '1️⃣', 'The first number.', 2], ['TWO', '2️⃣', 'One and one more.', 2], ['BOY', '👦', 'A child who is not a girl.', 2]
].map(([word, picture, clue, level]) => ({ word, picture, clue, level }));

/* Developing: familiar 4–6 letter words, a simple clue. Level = length (4 / 5 / 6). */
const DEVELOPING_SCRAMBLE = [
  ['FISH', 'It swims and has fins'], ['MILK', 'A white drink from a cow'], ['FROG', 'A green animal that hops'],
  ['DUCK', 'A bird that says quack'], ['BIRD', 'It has wings and feathers'], ['TREE', 'It has a trunk and leaves'],
  ['RAIN', 'Water falling from clouds'], ['CAKE', 'A sweet treat at a birthday'], ['BALL', 'A round toy you kick or throw'],
  ['BOOK', 'You read the pages of it'], ['HAND', 'It has five fingers'], ['KITE', 'It flies on a string in the wind'],
  ['DOOR', 'You open it to go into a room'], ['FARM', 'Cows and hens live here'], ['DRUM', 'You hit it to make a beat'],
  ['GIFT', 'A present for someone'], ['KING', 'He wears a crown'], ['LEAF', 'A green part of a plant'],
  ['COAT', 'You wear it when it is cold'], ['BELL', 'It rings'], ['BABY', 'A very young child'], ['MOON', 'It shines at night'],
  ['TIGER', 'A big cat with stripes'], ['ZEBRA', 'A horse-like animal with black and white stripes'],
  ['CAMEL', 'A desert animal with a hump'], ['CHAIR', 'You sit on it'], ['CLOCK', 'It tells the time'],
  ['CLOUD', 'A white puff in the sky'], ['PLANT', 'It grows in soil'], ['TRAIN', 'It runs on tracks'],
  ['WATER', 'Fish live in it'], ['HAPPY', 'Feeling glad'], ['SUGAR', 'It makes tea sweet'],
  ['BENCH', 'A long seat in a park'], ['BRUSH', 'You clean your teeth with it'], ['JUICE', 'A drink made from fruit'],
  ['QUEEN', 'She wears a crown'], ['SHEEP', 'It gives us wool'], ['TRUCK', 'A big vehicle that carries loads'],
  ['HONEY', 'Bees make it'], ['LEMON', 'A sour yellow fruit'], ['PIZZA', 'A round flat food with cheese on top'],
  ['STORM', 'Wild wind and rain'], ['MONEY', 'You pay with it'], ['UNCLE', 'Your mother\'s or father\'s brother'],
  ['MUSIC', 'You listen to it and dance'], ['PENCIL', 'You write and draw with it'], ['RABBIT', 'It has long ears and hops'],
  ['MONKEY', 'It swings from trees'], ['ORANGE', 'A round fruit and a colour'], ['BANANA', 'A long yellow fruit'],
  ['BUTTON', 'It keeps your shirt closed'], ['WINDOW', 'You look out through it'], ['SCHOOL', 'You learn here'],
  ['DOCTOR', 'Helps you when you are ill'], ['FLOWER', 'A pretty part of a plant'], ['BASKET', 'You carry fruit in it'],
  ['JUNGLE', 'A thick, wild forest'], ['TURTLE', 'It carries its shell'], ['ROCKET', 'It flies into space'],
  ['PILLOW', 'You rest your head on it'], ['KITTEN', 'A baby cat'], ['FAMILY', 'Your parents, brothers and sisters'],
  ['BOTTLE', 'Water comes in it'], ['PUZZLE', 'A game of pieces that fit'], ['DRAGON', 'A fire-breathing animal in stories'],
  ['CARROT', 'An orange vegetable rabbits love'], ['CHEESE', 'It is made from milk'], ['SUMMER', 'The hottest season'],
  ['WINTER', 'The coldest season'], ['YELLOW', 'The colour of a banana'], ['PURPLE', 'Red and blue mixed'],
  ['NUMBER', 'One, two and three are these']
].map(([word, clue]) => ({ word, clue, level: byLength(word.length, [4, 5]) }));

/* Intermediate: school vocabulary, a context clue with a gap. Level = length (≤6 / 7–8 / 9+). */
const INTERMEDIATE_SCRAMBLE = [
  ['ORBIT', 'The Moon takes about a month to ___ the Earth once.'],
  ['MAGNET', 'A ___ pulls iron nails towards it.'],
  ['FOSSIL', 'The ___ in the rock showed the shape of an ancient fish.'],
  ['ISLAND', 'Sri Lanka is an ___ in the Indian Ocean.'],
  ['VOLUME', 'The ___ of a box is its length times width times height.'],
  ['MUSCLE', 'Your heart is a ___ that never stops working.'],
  ['FACTOR', '3 is a ___ of 12 because it divides it exactly.'],
  ['POLLEN', 'Bees carry yellow ___ from flower to flower.'],
  ['LIQUID', 'Water is a ___ at room temperature.'],
  ['SOLID', 'Ice is the ___ form of water.'],
  ['ENERGY', 'Solar panels turn sunlight into electrical ___.'],
  ['LEGEND', 'A ___ is an old story that may be partly true.'],
  ['FABLE', 'A ___ is a short story, often with animals, that teaches a lesson.'],
  ['PLURAL', 'The ___ of "child" is "children".'],
  ['ADVERB', 'In "she ran quickly", the word "quickly" is an ___.'],
  ['PREFIX', '"Un-" in "unhappy" is a ___.'],
  ['SUFFIX', '"-ful" in "helpful" is a ___.'],
  ['VALLEY', 'The river flowed through a ___ between two hills.'],
  ['OXYGEN', 'We breathe in ___ from the air.'],
  ['POETRY', 'Rhyme and rhythm are common in ___.'],
  ['GRAVITY', '___ is the force that makes an apple fall to the ground.'],
  ['PRONOUN', '"She", "they" and "it" are each a ___.'],
  ['CLIMATE', 'The usual weather of a place over many years is its ___.'],
  ['HABITAT', 'A polar bear\'s natural ___ is the icy Arctic.'],
  ['VOLCANO', 'Hot lava poured out of the ___.'],
  ['EQUATOR', 'The ___ is an imaginary line around the middle of the Earth.'],
  ['FRACTION', 'One half is a ___.'],
  ['DECIMAL', '0.5 is the ___ form of one half.'],
  ['SKELETON', 'The ___ is the frame of bones inside your body.'],
  ['MOLECULE', 'A water ___ is made of two hydrogen atoms and one oxygen atom.'],
  ['BIOLOGY', '___ is the study of living things.'],
  ['CHAPTER', 'We read one ___ of the novel each night.'],
  ['HISTORY', 'In ___ we learn about the past.'],
  ['CAPITAL', 'New Delhi is the ___ of India.'],
  ['DIAMETER', 'The ___ of a circle passes through its centre.'],
  ['SYLLABLE', '"Pen-cil" has two of these: each is a ___.'],
  ['NARRATOR', 'The ___ is the voice that tells the story.'],
  ['ADJECTIVE', 'In "a tall tree", the word "tall" is an ___.'],
  ['CONTINENT', 'Asia is the largest ___ on Earth.'],
  ['EVAPORATE', 'Puddles ___ when the sun heats them.'],
  ['PERIMETER', 'The ___ of a square with 2 cm sides is 8 cm.'],
  ['PARAGRAPH', 'Start a new ___ when you change the topic.'],
  ['DEMOCRACY', 'In a ___, citizens choose their leaders by voting.'],
  ['CONDUCTOR', 'Copper is a good ___ of electricity.'],
  ['SATELLITE', 'The Moon is a natural ___ of the Earth.'],
  ['AGRICULTURE', 'Growing crops and raising animals is called ___.'],
  ['PHOTOSYNTHESIS', 'Plants make their own food from sunlight by ___.'],
  ['DICTIONARY', 'Look up the meaning of a word in a ___.'],
  ['ECOSYSTEM', 'A pond, with all the plants and animals in it, is an ___.'],
  ['RECTANGLE', 'A ___ has four right angles and opposite sides equal.'],
  ['VERTEBRATE', 'An animal with a backbone is a ___.'],
  ['ATMOSPHERE', 'The layer of gases around the Earth is the ___.'],
  ['HEMISPHERE', 'India lies in the northern ___.'],
  ['CONSONANT', '"B", "C" and "D" are each a ___, not a vowel.']
].map(([word, clue]) => ({ word, clue, level: byLength(word.length, [6, 8]) }));

/* Analytical: advanced vocabulary, a definition. Level = length (≤8 / 9–10 / 11+). */
const ANALYTICAL_SCRAMBLE = [
  ['AMBIGUOUS', 'Open to more than one meaning'], ['METICULOUS', 'Showing great attention to detail'],
  ['BENEVOLENT', 'Kind and wishing good for others'], ['HYPOTHESIS', 'A testable explanation proposed before the evidence is in'],
  ['PHENOMENON', 'An observable fact or event, often an unusual one'], ['PERSEVERANCE', 'Keeping going despite difficulty'],
  ['ELOQUENT', 'Fluent and persuasive in speech'], ['PRAGMATIC', 'Dealing with things sensibly and practically'],
  ['RESILIENT', 'Able to recover quickly from setbacks'], ['INEVITABLE', 'Certain to happen; unavoidable'],
  ['UBIQUITOUS', 'Found everywhere'], ['PARADOX', 'A statement that seems to contradict itself yet may be true'],
  ['ARDUOUS', 'Needing great effort; hard and tiring'], ['FRUGAL', 'Careful not to waste money or resources'],
  ['TENACIOUS', 'Holding on firmly; refusing to give up'], ['VIGILANT', 'Watchful for possible danger'],
  ['NOSTALGIA', 'A fond longing for the past'], ['SCEPTICAL', 'Doubtful; not easily convinced'],
  ['EPHEMERAL', 'Lasting a very short time'], ['ARTICULATE', 'Able to express ideas clearly'],
  ['CONSCIENTIOUS', 'Careful to do work well and thoroughly'], ['CONTEMPLATE', 'Think about deeply and at length'],
  ['DILEMMA', 'A choice between two difficult options'], ['EMPIRICAL', 'Based on observation and experiment'],
  ['FEASIBLE', 'Possible and practical to do'], ['IMPARTIAL', 'Treating all sides fairly'],
  ['INNOVATIVE', 'Introducing new ideas or methods'], ['JUXTAPOSE', 'Place side by side to compare'],
  ['LETHARGIC', 'Sluggish and lacking energy'], ['MAGNANIMOUS', 'Generous, especially towards a rival'],
  ['OBSOLETE', 'No longer used; out of date'], ['PLAUSIBLE', 'Seeming reasonable or likely to be true'],
  ['PROFOUND', 'Very deep in insight or feeling'], ['REDUNDANT', 'No longer needed; more than necessary'],
  ['SUBSTANTIATE', 'Provide evidence to support a claim'], ['SUCCINCT', 'Brief and clearly expressed'],
  ['VERSATILE', 'Able to adapt to many uses'], ['ZEALOUS', 'Full of eager enthusiasm'],
  ['INFERENCE', 'A conclusion reached from evidence and reasoning'],
  ['ALLITERATION', 'Repeating the same first sound in nearby words'],
  ['METAPHOR', 'Describing something as if it were something else'],
  ['CHRONOLOGICAL', 'Arranged in the order of time'], ['ANALOGY', 'A comparison that explains one thing through another'],
  ['CATALYST', 'Something that speeds up a change without being used up'],
  ['EXTRAPOLATE', 'Extend known data to estimate the unknown'], ['MITIGATE', 'Make less severe'],
  ['RHETORIC', 'Persuasive language, sometimes without real substance'],
  ['PERSPECTIVE', 'A particular way of seeing something'], ['DISCREPANCY', 'A difference between things that should match']
].map(([word, clue]) => ({ word, clue, level: byLength(word.length, [8, 10]) }));

/* Advanced: words built from parts. The clue names the prefix and suffix, never the root. */
const MORPHOLOGY = [
  ['UNBELIEVABLE', 'un- … -able', 'So surprising it is hard to accept as true'],
  ['IRRESPONSIBLE', 'ir- … -ible', 'Not showing proper care or duty'],
  ['INTERNATIONAL', 'inter- … -al', 'Between or involving several countries'],
  ['DISAPPOINTMENT', 'dis- … -ment', 'Sadness when hopes are not met'],
  ['UNDENIABLE', 'un- … -able', 'Too clearly true to be disputed'],
  ['COUNTERPRODUCTIVE', 'counter- … -ive', 'Having the opposite effect to the one intended'],
  ['MISINTERPRET', 'mis- …', 'Understand something wrongly'],
  ['OVERESTIMATE', 'over- …', 'Judge something to be bigger or better than it is'],
  ['UNDERESTIMATE', 'under- …', 'Judge something to be smaller or weaker than it is'],
  ['PREDETERMINED', 'pre- … -ed', 'Decided in advance'],
  ['ANTIBACTERIAL', 'anti- … -al', 'Working against germs that cause infection'],
  ['AUTOBIOGRAPHY', 'auto- … -graphy', 'The story of a person\'s life, written by that person'],
  ['TRANSFORMATION', 'trans- … -ation', 'A complete change in form or character'],
  ['INDISPENSABLE', 'in- … -able', 'Absolutely necessary; impossible to do without'],
  ['UNPRECEDENTED', 'un- … -ed', 'Never done or known before'],
  ['ACCOUNTABILITY', '… -abil- -ity', 'Being answerable for your actions'],
  ['SUSTAINABILITY', '… -abil- -ity', 'Meeting today\'s needs without harming the future'],
  ['DECENTRALISE', 'de- … -ise', 'Move power away from one central place'],
  ['INTERDEPENDENT', 'inter- … -ent', 'Relying on each other'],
  ['SUBCONSCIOUS', 'sub- … -ous', 'Below the level of awareness'],
  ['SUPERNATURAL', 'super- … -al', 'Beyond the laws of nature'],
  ['HYPERACTIVE', 'hyper- … -ive', 'Unusually or excessively active'],
  ['MULTICULTURAL', 'multi- … -al', 'Made up of many cultures'],
  ['POSTGRADUATE', 'post- … -ate', 'Studying after a first degree'],
  ['OUTPERFORM', 'out- …', 'Do better than another'],
  ['IMMEASURABLE', 'im- … -able', 'Too large to be measured'],
  ['ILLEGIBLE', 'il- … -ible', 'Impossible to read'],
  ['INCOMPREHENSIBLE', 'in- … -ible', 'Impossible to understand'],
  ['MALFUNCTION', 'mal- …', 'A failure to work properly'],
  ['BIODEGRADABLE', 'bio- … -able', 'Able to be broken down naturally by living things'],
  ['SEMICIRCLE', 'semi- …', 'Half of a round shape'],
  ['PREOCCUPIED', 'pre- … -ied', 'Lost in thought about something else'],
  ['RECONSIDER', 're- …', 'Think again about a decision'],
  ['DISPROPORTIONATE', 'dis- … -ate', 'Too large or too small compared with something else'],
  ['INTERCONTINENTAL', 'inter- … -al', 'Between continents'],
  ['MISCALCULATION', 'mis- … -ation', 'A mistake in working something out'],
  ['EMPOWERMENT', 'em- … -ment', 'Being given the confidence and authority to act'],
  ['INEXPLICABLE', 'in- … -able', 'Impossible to explain'],
  ['NONCOMMITTAL', 'non- … -al', 'Avoiding a clear opinion or decision'],
  ['UNDERSTATEMENT', 'under- … -ment', 'Saying something is less than it really is'],
  ['MICROSCOPIC', 'micro- … -ic', 'So small it can only be seen with magnification'],
  ['TELECOMMUNICATION', 'tele- … -ation', 'Sending information over a distance']
].map(([word, parts, meaning]) => ({ word, clue: `${parts}: ${meaning}`, level: word.length <= 12 ? 2 : 3 }));

/*
 * The workplace bank minus words whose letters spell another everyday word (ASSET/SEATS, DEFER/FREED,
 * SCOPE/COPSE, ETHICS/ITCHES, TENURE/TUREEN, PRECISE/RECIPES, BRIEF/FIBER, MILESTONE/LIMESTONE): a right
 * unscramble would be marked wrong.
 */
const AMBIGUOUS = new Set(['ASSET', 'DEFER', 'SCOPE', 'ETHICS', 'TENURE', 'PRECISE', 'BRIEF', 'MILESTONE']);
const WORKPLACE = BRAIN_WORDS.filter((w) => !AMBIGUOUS.has(w.word));

const morphWords = new Set(MORPHOLOGY.map((w) => w.word));
const ADVANCED_SCRAMBLE = [
  ...WORKPLACE.filter((w) => !morphWords.has(w.word)).map((w) => ({ ...w, level: byLength(w.word.length, [7, 9]) })),
  ...MORPHOLOGY
];
/* Analytical keeps the workplace bank too (today's game), graded by length, after its own list. */
const analyticalOwn = new Set(ANALYTICAL_SCRAMBLE.map((w) => w.word));
const ANALYTICAL_ALL = [
  ...ANALYTICAL_SCRAMBLE,
  ...WORKPLACE.filter((w) => !analyticalOwn.has(w.word)).map((w) => ({ ...w, level: byLength(w.word.length, [6, 8]) }))
];

export const SCRAMBLE = {
  foundation: FOUNDATION_SCRAMBLE,
  developing: DEVELOPING_SCRAMBLE,
  intermediate: INTERMEDIATE_SCRAMBLE,
  analytical: ANALYTICAL_ALL,
  advanced: ADVANCED_SCRAMBLE
};

/** Shuffle the letters, never handing back the word itself. */
export const scramble = (word, rng = Math.random) => {
  const letters = word.split('');
  if (new Set(letters).size < 2) return word;
  for (let attempt = 0; attempt < 30; attempt++) {
    for (let i = letters.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [letters[i], letters[j]] = [letters[j], letters[i]];
    }
    const out = letters.join('');
    if (out !== word) return out;
  }
  // Unlucky run: rotate by one, which differs whenever two letters differ.
  return word.slice(1) + word[0] === word ? word : word.slice(1) + word[0];
};

/** One round's rules for Word Scramble. `tiles`: tap letter tiles (young) instead of typing. */
export const scrambleConfig = (ageBand, difficulty, levelNo) => {
  const band = bandKey(ageBand);
  const r = bandRamp(band, levelNo);
  const base = {
    foundation: { seconds: [150, 120], target: [3, 6] },
    developing: { seconds: [120, 90], target: [4, 7] },
    intermediate: { seconds: [100, 70], target: [4, 8] },
    analytical: { seconds: [90, 60], target: [3, 8] },
    advanced: { seconds: [90, 60], target: [3, 8] }
  }[band];
  return {
    band,
    tiles: band === 'foundation' || band === 'developing',
    seconds: lerp(base.seconds[0], base.seconds[1], r),
    target: lerp(base.target[0], base.target[1], r) + (band === 'foundation' || band === 'developing' ? 0 : difficulty - 1),
    pool: itemsFor(SCRAMBLE[band], difficulty, r)
  };
};

/* ============================================================= TYPING SPRINT == */

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((t) => ({ text: t, level: 1 }));
const TINY_WORDS = [
  ['at'], ['in'], ['on'], ['up'], ['is'], ['it'], ['go'], ['no'], ['me'], ['we'], ['he'], ['my'], ['so'], ['to'],
  ['cat', '🐱'], ['dog', '🐶'], ['sun', '☀️'], ['hat', '🎩'], ['red', '🔴'], ['big'], ['run', '🏃'], ['hop', '🐇'],
  ['fun'], ['bus', '🚌'], ['pen', '🖊️'], ['cup', '🥤'], ['bed', '🛏️'], ['box', '📦'], ['map', '🗺️'], ['top'],
  ['yes'], ['zoo'], ['jam'], ['leg', '🦵'], ['fox', '🦊'], ['van', '🚐'], ['wet'], ['six', '6️⃣'], ['ten', '🔟'],
  ['mix'], ['egg', '🥚'], ['pig', '🐷'], ['ant', '🐜'], ['bee', '🐝']
].map(([text, picture]) => ({ text, level: 2, ...(picture ? { picture } : {}) }));

const DEVELOPING_WORDS = [
  'apple', 'bird', 'book', 'blue', 'cake', 'cold', 'duck', 'fish', 'frog', 'game', 'green', 'happy', 'house',
  'jump', 'kite', 'lamp', 'lion', 'milk', 'moon', 'nest', 'park', 'play', 'rain', 'ring', 'shoe', 'sing',
  'smile', 'snow', 'star', 'swim', 'tree', 'water', 'wind', 'yellow', 'zebra', 'train', 'plant', 'bread',
  'chair', 'clock', 'paper', 'pencil'
].map((text) => ({ text, level: 1 }));

const DEVELOPING_SENTENCES = [
  'I can run fast.', 'The cat is on the mat.', 'We like to play.', 'The sun is hot.', 'I see a red bus.',
  'My dog can swim.', 'The bird sings.', 'I have a blue pen.', 'We go to school.', 'The sky is blue.',
  'I like green apples.', 'The fish is in the pond.', 'Mum made a cake.', 'It is a sunny day.', 'The frog can jump.',
  'I read a book.', 'Look at the moon.', 'The tree is tall.', 'We play in the park.', 'My hat is red.',
  'The baby is asleep.', 'I can see a star.', 'The rain is cold.', 'We eat lunch at noon.', 'My bag is full.',
  'The kite is high.', 'Ducks like water.', 'I drink milk.', 'The bell rings.', 'Dad can cook.',
  'The lion is big.', 'I wash my hands.', 'The door is open.', 'We sing a song.', 'The shop is shut.',
  'I love my mum.', 'The ball is round.', 'A cow eats grass.', 'The box is heavy.', 'I brush my teeth.',
  'Snow is white.', 'The train is fast.'
].map((text) => ({ text, level: 2 }));

const INTERMEDIATE_SENTENCES = [
  // Level 1: short sentences.
  'Water boils at one hundred degrees.', 'The Moon goes round the Earth.', 'Plants need light to grow.',
  'Bees make honey from nectar.', 'A square has four equal sides.', 'Delhi is the capital of India.',
  'Read the question twice.', 'The river flows to the sea.', 'Ice floats on water.', 'Our heart pumps blood.',
  'A spider has eight legs.', 'The Sun is a star.', 'Practice makes us better.', 'Rain falls from clouds.',
  // Level 2: medium sentences.
  'The library opens at nine and closes at five.', 'A noun names a person, a place or a thing.',
  'Mount Everest is the highest mountain in the world.', 'We planted ten trees near the school gate.',
  'Light travels much faster than sound.', 'Fish breathe through gills, not lungs.',
  'Always check your answers before you hand in the paper.', 'The children walked to the museum together.',
  'A triangle has three sides and three angles.', 'Our team won the match by two goals.',
  'The Ganga is one of the longest rivers in India.', 'Frogs lay their eggs in water.',
  'Please switch off the fan when you leave.', 'My grandmother tells the best stories.',
  // Level 3: longer sentences with commas.
  'When it rains heavily, the streets near our school flood quickly.',
  'The scientist recorded the temperature every hour for three days.',
  'Before you start the experiment, read all of the instructions carefully.',
  'Although the path was steep, the hikers reached the top before sunset.',
  'The Earth takes about three hundred and sixty-five days to orbit the Sun.',
  'Our class collected old newspapers, plastic bottles and cans for recycling.',
  'If you mix blue and yellow paint, you get green.',
  'The museum guide explained how people lived thousands of years ago.',
  'Healthy food, regular exercise and enough sleep keep us strong.',
  'The captain thanked every player, even those who stayed on the bench.',
  'Volcanoes form where hot rock from deep inside the Earth breaks through.',
  'She practised the speech in front of a mirror until she felt confident.',
  'The tallest tree in the park is more than two hundred years old.',
  'We wrote a letter to the mayor asking for a safer crossing.'
].map((text, i) => ({ text, level: i < 14 ? 1 : i < 28 ? 2 : 3 }));

const ANALYTICAL_SENTENCES = [
  'The experiment showed that plants grown in sunlight were taller than those kept in the dark.',
  'A good argument states a clear claim, supports it with evidence and answers the strongest objection.',
  'The population of the city doubled in twenty years, putting pressure on water and transport.',
  'Before drawing a conclusion, check whether the sample is large enough to be reliable.',
  'The author uses the storm as a symbol of the conflict growing inside the main character.',
  'An atom has a small, dense nucleus surrounded by a cloud of electrons.',
  'Renewable energy sources, such as wind and solar power, will not run out.',
  'The treaty ended the war, but it left many questions about borders unanswered.',
  'Correlation does not prove causation, however strong the pattern appears.',
  'The function rises steeply at first and then levels off as x increases.',
  'Rainforests cover a small part of the planet yet hold a large share of its species.',
  'Her report summarised the data clearly and recommended three practical changes.',
  'A balanced diet includes carbohydrates, proteins, fats, vitamins, minerals and fibre.',
  'Newton showed that the same force pulls an apple down and keeps the Moon in orbit.',
  'Good notes are short, organised and written in your own words.',
  'The committee postponed its decision until all the evidence had been reviewed.',
  'Freshwater is precious because only a tiny fraction of Earth\'s water is fresh and easy to reach.',
  'The poem moves from despair to hope as the seasons change from winter to spring.',
  'Inflation means that the same amount of money buys fewer goods over time.',
  'Each cell in your body carries instructions written in the code of DNA.',
  'The debate was lively, but both speakers listened carefully and stayed respectful.',
  'Satellites orbiting the Earth help us forecast the weather and find our way.'
].map((text) => ({ text, level: 1 }));

const ANALYTICAL_PASSAGES = [
  'Sound needs a medium to travel. It moves through air, water and solids, but it cannot cross the vacuum of space.',
  'The printing press made books cheaper. As more people could read, new ideas spread faster than ever before.',
  'Volcanic soil is often very fertile. That is why farms are found on the slopes of some active volcanoes.',
  'Honeybees communicate with a dance. The angle and length of the dance tell other bees where food can be found.',
  'A budget is a plan, not a prison. It shows where money goes, so you can decide where it should go.',
  'Deserts are not always hot. Antarctica is the largest desert on Earth, because so little snow or rain falls there.',
  'Good questions drive learning. When you ask why something happens, you begin to understand it rather than memorise it.',
  'Mangrove forests protect coastlines. Their tangled roots slow down waves and give shelter to young fish.',
  'Exercise strengthens the heart. Over time, a fit heart pumps more blood with each beat and rests at a slower rate.',
  'Maps are always simplified. A map that showed every detail would be as large and as confusing as the land itself.',
  'Bamboo is one of the fastest-growing plants in the world. Some kinds can grow almost a metre in a single day.',
  'Rivers shape the land. Over thousands of years, a river can carve a deep valley through solid rock.',
  'Sleep is when the brain sorts the day. Memories are strengthened, so a good night\'s rest helps you learn.',
  'Recycling one aluminium can saves energy. Making a can from recycled metal uses far less power than starting from ore.',
  'The Moon has no air to scatter light. That is why its sky looks black, even when the Sun is shining.',
  'Fair tests change one thing at a time. If two factors change together, you cannot tell which caused the result.',
  'Coral reefs are built by tiny animals. Over centuries, their skeletons pile up into vast underwater structures.',
  'Language changes over time. Words drop out of use, new ones are invented, and meanings slowly shift.',
  'Clouds form when warm, moist air rises and cools. The water vapour condenses into tiny droplets that we see as cloud.',
  'Trust is built slowly and lost quickly. Keeping small promises is the surest way to earn it.',
  'Many medicines come from plants. Aspirin, for example, is related to a substance first found in willow bark.',
  'Your skin is your largest organ. It keeps out germs, holds in water and helps to control your temperature.'
].map((text, i) => ({ text, level: i < 11 ? 2 : 3 }));

const ADVANCED_PASSAGES = [
  // Level 1: two sentences.
  'Clear writing comes from clear thinking. Before you write, decide what you want the reader to understand.',
  'Markets reward scarcity. When supply falls and demand stays the same, prices usually rise.',
  'Evidence should change our minds. A belief that no fact could ever alter is not a conclusion but a habit.',
  'Every system has a bottleneck. Improving anything other than the slowest step rarely speeds up the whole.',
  'Feedback is a gift when it is specific. Vague praise feels pleasant but teaches very little.',
  'Compound interest rewards patience. Money invested early grows on its own growth, year after year.',
  'A hypothesis must be testable. If no experiment could ever prove it wrong, it is not a scientific claim.',
  'Good leaders listen first. People commit more readily to a plan they have helped to shape.',
  'Data without context can mislead. A rise of fifty per cent sounds large until you learn it went from two to three.',
  'Habits shape outcomes. Small actions repeated daily often matter more than rare bursts of effort.',
  'The best time to fix a mistake is early. Problems found at the design stage cost far less to correct.',
  'Curiosity is a skill. Asking one more question often reveals the assumption that everyone else missed.',
  'Negotiation is not a contest. The strongest agreements leave both sides better off than when they began.',
  'Memory is reconstructive. Each time we recall an event, we rebuild it, and small details can quietly change.',
  // Level 2: three sentences.
  'Photosynthesis turns light into chemical energy. Plants take in carbon dioxide and water and release oxygen. Almost every food chain on Earth depends on this process.',
  'A strong essay has a clear thesis. Each paragraph should support that thesis with evidence. The conclusion then shows why the argument matters.',
  'Supply chains link producers across the world. A delay at one port can hold up factories on another continent. Resilient firms plan for such disruptions.',
  'Antibiotics kill bacteria but not viruses. Using them when they are not needed helps resistant bacteria spread. Doctors therefore prescribe them with care.',
  'Opportunity cost is the value of the next best choice. If you spend an evening studying, you give up an evening of rest. Every decision has such a cost.',
  'The Industrial Revolution began in Britain in the eighteenth century. Steam power transformed factories, transport and cities. Its effects are still felt today.',
  'Biodiversity makes ecosystems stable. When many species share a habitat, the loss of one is less likely to cause collapse. Protecting variety protects resilience.',
  'An algorithm is a precise set of steps. Computers follow algorithms exactly, without judgement. That is why a small error in the steps can cause a large error in the result.',
  'Interest rates influence spending. When borrowing becomes expensive, people and businesses tend to spend less. Central banks use this to manage inflation.',
  'Good research begins with a narrow question. A broad question invites vague answers. A focused one can actually be tested.',
  'Climate is not the same as weather. Weather changes from day to day, while climate describes patterns over decades. One cold week does not disprove a warming trend.',
  'Persuasion works best with three elements. Credibility earns trust, logic earns agreement and emotion earns action. Skilled speakers balance all three.',
  'The human brain uses about a fifth of the body\'s energy. It is only around two per cent of body weight. Thinking, it seems, is expensive work.',
  // Level 3: three or four longer sentences.
  'Peer review is the backbone of modern science. Before a study is published, independent experts examine its methods and conclusions. The process is imperfect, but it catches many errors and keeps standards high.',
  'Constitutions limit power as much as they grant it. By separating the legislature, the executive and the judiciary, they make it harder for any one group to act unchecked. Each branch can question the others.',
  'Statistics can be honest and still mislead. Choosing a convenient starting year, or leaving out a key comparison, can make a modest change look dramatic. Careful readers always ask what the numbers leave out.',
  'Entrepreneurs succeed less by avoiding failure than by failing cheaply. They test small versions of an idea, learn from customers and change course quickly. Each experiment reduces uncertainty before larger sums are committed.',
  'The water cycle moves water continuously between the oceans, the air and the land. Evaporation lifts it, condensation forms clouds and precipitation returns it. Groundwater may stay hidden for thousands of years before it flows back to the sea.',
  'Ethical decisions are rarely between right and wrong. More often they are between two goods, such as honesty and kindness, or loyalty and fairness. Thinking through who is affected helps us choose well.',
  'Machine learning systems learn patterns from data. If the data reflects past unfairness, the system may repeat it at scale. Designers must therefore test their models for bias as carefully as for accuracy.',
  'Urban trees do more than decorate streets. They cool the air, soak up rainwater and filter pollution. Studies suggest that people living near green spaces also report lower stress.',
  'Translation is never a simple swap of words. Idioms, tone and cultural references rarely have exact equivalents. A good translator carries meaning across, not just vocabulary.',
  'Vaccines train the immune system without causing the disease. They present a harmless piece or form of a germ, and the body learns to recognise it. If the real germ appears later, the defence is ready.',
  'Time management is really attention management. Hours are fixed, but focus is not. Protecting a few undisturbed blocks each day often achieves more than a long, distracted schedule.',
  'Plate tectonics explains why earthquakes cluster along certain lines. The Earth\'s crust is broken into plates that move a few centimetres a year. Where they collide, separate or slide past each other, stress builds and is suddenly released.',
  'Writing a summary tests understanding. You must decide what is essential and what can be left out. If you cannot state the main idea briefly, you may not yet have grasped it.'
].map((text, i) => ({ text, level: i < 14 ? 1 : i < 27 ? 2 : 3 }));

export const TYPING = {
  foundation: [...LETTERS, ...TINY_WORDS],
  developing: [...DEVELOPING_WORDS, ...DEVELOPING_SENTENCES],
  intermediate: INTERMEDIATE_SENTENCES,
  analytical: [...ANALYTICAL_SENTENCES, ...ANALYTICAL_PASSAGES],
  advanced: ADVANCED_PASSAGES
};

/**
 * One Typing Sprint round. `mode`: 'keys' (foundation: on-screen keyboard, no text box), 'items' (count items
 * typed), 'speed' (advanced: WPM and accuracy). `caseless`: young typists are not marked down for capitals.
 */
export const typingConfig = (ageBand, difficulty, levelNo) => {
  const band = bandKey(ageBand);
  const r = bandRamp(band, levelNo);
  const pool = itemsFor(TYPING[band], difficulty, r);
  switch (band) {
    case 'foundation':
      return { band, mode: 'keys', caseless: true, keyboard: true, seconds: lerp(120, 90, r), target: lerp(5, 10, r), pool };
    case 'developing':
      return { band, mode: 'items', caseless: true, keyboard: true, seconds: lerp(120, 90, r), target: lerp(5, 8, r), pool };
    case 'intermediate':
      return { band, mode: 'items', caseless: false, seconds: lerp(100, 75, r), target: lerp(3, 6, r) + (difficulty - 1), pool };
    case 'analytical':
      return { band, mode: 'items', caseless: false, showAccuracy: true, seconds: lerp(120, 90, r), target: lerp(3, 5, r) + (difficulty === 1 ? 1 : 0), pool };
    default:
      // Advanced: the score is a mix, accuracy weighted more. Target rises with the band.
      return { band, mode: 'speed', caseless: false, showAccuracy: true, seconds: lerp(120, 90, r), passages: 2, target: lerp(35, 50, r) + Math.max(0, difficulty - 2) * 5, pool };
  }
};

/** Words per minute, counting five correct characters as a word. */
export const wpmOf = (correctChars, ms) => (ms <= 0 ? 0 : Math.round(correctChars / 5 / (ms / 60000)));
/** Correct keystrokes over all keystrokes, as a whole percentage (100 before anything is typed). */
export const accuracyOf = (right, wrong) => (right + wrong === 0 ? 100 : Math.round((100 * right) / (right + wrong)));
/**
 * Advanced score, 0–100: 40% speed (80 WPM scores full), 60% accuracy. The accuracy share is earned over the
 * first 150 correct characters, so two careful keystrokes are not worth sixty points.
 */
export const speedScore = (wpm, accuracy, correctChars = 150) =>
  Math.round(0.4 * Math.min(100, (wpm / 80) * 100) + 0.6 * accuracy * Math.min(1, correctChars / 150));

/** Normalise typed text: smart quotes from phone keyboards become plain ones. */
export const cleanTyped = (s) => s.replace(/[‘’]/g, "'").replace(/[“”]/g, '"');

/* ============================================================== SPELLING FIX == */

/* Foundation: pick the right spelling of a picture word from three. [answer, picture, wrong, wrong] */
const PICTURE_SPELLINGS = [
  ['cat', '🐱', 'kat', 'catt'], ['dog', '🐶', 'dogg', 'dgo'], ['sun', '☀️', 'sunn', 'snu'], ['pig', '🐷', 'pigg', 'pyg'],
  ['hen', '🐔', 'henn', 'hne'], ['bus', '🚌', 'buse', 'bas'], ['bed', '🛏️', 'bedd', 'bded'], ['cup', '🥤', 'cupp', 'kup'],
  ['hat', '🎩', 'hatt', 'hta'], ['egg', '🥚', 'eg', 'eggg'], ['ant', '🐜', 'antt', 'ent'], ['bee', '🐝', 'bea', 'bie'],
  ['owl', '🦉', 'oul', 'owel'], ['fox', '🦊', 'foks', 'focks'], ['box', '📦', 'boks', 'bocks'], ['key', '🔑', 'kee', 'kie'],
  ['pen', '🖊️', 'penn', 'pne'], ['bag', '👜', 'bagg', 'bage'], ['leg', '🦵', 'legg', 'leeg'], ['ear', '👂', 'eer', 'eare'],
  ['eye', '👁️', 'eie', 'iye'], ['arm', '💪', 'arem', 'amr'], ['web', '🕸️', 'webb', 'wbe'], ['toy', '🧸', 'toi', 'toye'],
  ['six', '6️⃣', 'siks', 'sixx'], ['ten', '🔟', 'tenn', 'tne'], ['red', '🔴', 'redd', 'rde'], ['jar', '🫙', 'jarr', 'jaar'],
  ['van', '🚐', 'vann', 'vaan'], ['pie', '🥧', 'piy', 'pii'], ['nut', '🥜', 'nutt', 'nutte'],
  ['fish', '🐟', 'fesh', 'fich'], ['duck', '🦆', 'duk', 'dukc'], ['frog', '🐸', 'frogg', 'forg'], ['tree', '🌳', 'tre', 'trea'],
  ['ball', '⚽', 'balle', 'baul'], ['cake', '🎂', 'caek', 'kake'], ['book', '📖', 'buk', 'bok'], ['star', '⭐', 'starr', 'stor'],
  ['moon', '🌙', 'mune', 'moone'], ['milk', '🥛', 'milck', 'mlik'], ['lion', '🦁', 'lione', 'lian'], ['bird', '🐦', 'berd', 'burd'],
  ['ship', '🚢', 'shipp', 'shep'], ['coat', '🧥', 'kote', 'coatt'], ['drum', '🥁', 'drumm', 'drom'], ['kite', '🪁', 'kight', 'kiet'],
  ['rain', '🌧️', 'rane', 'rayn'], ['hand', '✋', 'hend', 'handd'], ['door', '🚪', 'dore', 'doar'], ['bell', '🔔', 'bele', 'beel'],
  ['gift', '🎁', 'gifft', 'gyft'], ['leaf', '🍃', 'leef', 'lefe'], ['corn', '🌽', 'korn', 'cornn']
];

const PRIMARY_WORDS = [
  'said', 'was', 'they', 'what', 'when', 'could', 'would', 'many', 'come', 'some', 'does', 'goes', 'once', 'have',
  'give', 'about', 'after', 'again', 'every', 'laugh', 'house', 'light', 'night', 'eight', 'water', 'which', 'write',
  'know', 'very', 'happy', 'friend', 'people', 'school', 'before', 'little', 'mother', 'father', 'brother', 'sister',
  'garden', 'pretty', 'should', 'because', 'caught', 'enough', 'answer', 'animal', 'minute', 'island', 'thought',
  'through', 'believe', 'together', 'tomorrow', 'children', 'everyone', 'favourite', 'sometimes', 'something',
  'different', 'beautiful', 'important', 'yesterday', 'surprise', 'straight'
];

const TRICKY_WORDS = [
  'separate', 'definitely', 'necessary', 'believe', 'receive', 'beginning', 'business', 'calendar', 'different',
  'disappear', 'embarrass', 'environment', 'existence', 'government', 'grammar', 'guarantee', 'immediately',
  'independent', 'interrupt', 'knowledge', 'library', 'lightning', 'occasion', 'occurred', 'parallel', 'possession',
  'privilege', 'pronunciation', 'recommend', 'rhythm', 'sentence', 'surprise', 'tomorrow', 'until', 'weird',
  'achieve', 'argument', 'conscious', 'foreign', 'height', 'neighbour', 'piece', 'truly', 'accidentally', 'address',
  'appearance', 'committee', 'completely', 'conscience', 'desperate', 'especially', 'experience', 'familiar',
  'finally', 'forty', 'generally', 'harass', 'possible', 'probably', 'queue', 'restaurant', 'rhyme', 'secretary',
  'sincerely', 'thorough', 'vegetable'
];

/*
 * Commonly confused pairs: the sentence decides which correctly spelled word belongs. The wrong options are the
 * look-alike (right spelling, wrong word) and a misspelling of the answer. [sentence, answer, look-alike, misspelt, explain]
 */
const PAIRS_A = [
  ['The children forgot ___ bags at school.', 'their', 'there', 'thier', '"Their" means belonging to them.'],
  ['Put the box over ___, by the door.', 'there', 'their', 'thear', '"There" points to a place.'],
  ['I think ___ going to be late.', "they're", 'their', 'theyre', '"They\'re" is short for "they are".'],
  ['I hope ___ ready for the test.', "you're", 'your', 'youre', '"You\'re" is short for "you are".'],
  ['Is this ___ pencil?', 'your', "you're", 'yor', '"Your" means belonging to you.'],
  ['The cat licked ___ paw.', 'its', "it's", 'itts', '"Its" means belonging to it, with no apostrophe.'],
  ['Look outside: ___ raining.', "it's", 'its', 'itts', '"It\'s" is short for "it is".'],
  ['I ate ___ much cake.', 'too', 'two', 'tooo', '"Too" means more than enough.'],
  ['She has ___ brothers.', 'two', 'too', 'twoo', '"Two" is the number 2.'],
  ['My sister is taller ___ me.', 'than', 'then', 'thann', '"Than" is for comparing.'],
  ['Finish your homework, and ___ you can play.', 'then', 'than', 'thenn', '"Then" means next, or after that.'],
  ["Don't ___ your keys again.", 'lose', 'loose', 'luse', '"Lose" means to stop having something.'],
  ['This shirt is too ___ around the neck.', 'loose', 'lose', 'lowse', '"Loose" means not tight.'],
  ['The library is a ___ place to study.', 'quiet', 'quite', 'quiat', '"Quiet" means with little noise.'],
  ['The test was ___ difficult.', 'quite', 'quiet', 'quitte', '"Quite" means fairly or very.'],
  ['Can I have a ___ of cake?', 'piece', 'peace', 'peice', '"Piece" means a part of something. I before E.'],
  ['The two countries signed a ___ treaty.', 'peace', 'piece', 'peece', '"Peace" means no war or fighting.'],
  ['Press the ___ to stop the bike.', 'brake', 'break', 'braik', 'A "brake" slows or stops a vehicle.'],
  ["Let's take a short ___ after this lesson.", 'break', 'brake', 'braek', 'A "break" is a rest.'],
  ['The teacher read the poem ___ to the class.', 'aloud', 'allowed', 'alowd', '"Aloud" means out loud.'],
  ['Phones are not ___ in the exam hall.', 'allowed', 'aloud', 'alowed', '"Allowed" means permitted.'],
  ['We ___ the old library on our way home.', 'passed', 'past', 'passt', '"Passed" is the verb: we went by it.'],
  ['In the ___, people wrote letters by hand.', 'past', 'passed', 'parst', '"The past" is time gone by.'],
  ["I can't ___ to watch sad films.", 'bear', 'bare', 'baer', '"Bear" here means to put up with.'],
  ['He walked on the hot sand with ___ feet.', 'bare', 'bear', 'bair', '"Bare" means uncovered.'],
  ['___ bag is this?', 'Whose', "Who's", 'Whoes', '"Whose" asks who something belongs to.'],
  ['___ coming to the party?', "Who's", 'Whose', 'Whos', '"Who\'s" is short for "who is".']
];

const PAIRS_B = [
  ['Loud music will ___ your concentration.', 'affect', 'effect', 'afect', '"Affect" is usually the verb.'],
  ['The new rule had a big ___ on the team.', 'effect', 'affect', 'efect', '"Effect" is usually the noun: a result.'],
  ['Please ___ my apology.', 'accept', 'except', 'acept', '"Accept" means to receive or agree to.'],
  ['Everyone came ___ Ravi, who was ill.', 'except', 'accept', 'exept', '"Except" means not including.'],
  ["I don't know ___ it will rain.", 'whether', 'weather', 'wheather', '"Whether" introduces a choice.'],
  ['The ___ forecast says it will be sunny.', 'weather', 'whether', 'weathar', '"Weather" is rain, sun and wind.'],
  ['The school ___ spoke at assembly.', 'principal', 'principle', 'principel', 'A "principal" is the head of a school.'],
  ['Honesty is an important ___.', 'principle', 'principal', 'principel', 'A "principle" is a rule or belief.'],
  ['The car stayed ___ at the red light.', 'stationary', 'stationery', 'stasionary', '"Stationary" means not moving: A for at rest.'],
  ['Pens and paper are kinds of ___.', 'stationery', 'stationary', 'stationry', '"Stationery" is writing material: E for envelope.'],
  ['Chocolate cake is my favourite ___.', 'dessert', 'desert', 'disert', 'A "dessert" is a sweet course: two S for sweet stuff.'],
  ['Camels can cross the ___ for days without drinking.', 'desert', 'dessert', 'dezert', 'A "desert" is a dry, sandy land.'],
  ['Can you give me some ___ about my project?', 'advice', 'advise', 'advyce', '"Advice" is the noun.'],
  ['I would ___ you to leave early.', 'advise', 'advice', 'advize', '"Advise" is the verb.'],
  ['Take a deep ___ and relax.', 'breath', 'breathe', 'breth', '"Breath" is the noun.'],
  ['Fish ___ through their gills.', 'breathe', 'breath', 'breeth', '"Breathe" is the verb.'],
  ['She paid me a kind ___ on my drawing.', 'compliment', 'complement', 'complimant', 'A "compliment" is praise.'],
  ['The red scarf will ___ your green coat.', 'complement', 'compliment', 'complemant', '"Complement" means to complete or suit.'],
  ['The town ___ voted to build a new park.', 'council', 'counsel', 'councel', 'A "council" is a group that governs.'],
  ['She ___ the team to victory last season.', 'led', 'lead', 'ledd', 'The past of "lead" is "led".'],
  ['You need more piano ___.', 'practice', 'practise', 'practis', 'In British English the noun is "practice", the verb "practise".'],
  ['Walk down the ___ to the front of the hall.', 'aisle', 'isle', 'aile', 'An "aisle" is a passage between rows.'],
  ['The ___ of the story is that honesty pays.', 'moral', 'morale', 'morall', 'A "moral" is the lesson of a story.'],
  ['Winning the match lifted the team\'s ___.', 'morale', 'moral', 'moralle', '"Morale" is confidence and spirit.']
];

/** Every word in the confused pairs: real words, right in one sentence and wrong in the other. */
export const CONFUSABLES = new Set([...PAIRS_A, ...PAIRS_B].flatMap((p) => [p[1].toLowerCase(), p[2].toLowerCase()]));

/** Real words that must never be offered as a misspelling (on top of every listed answer). */
export const NOT_MISSPELT = new Set([
  'peg', 'bad', 'son', 'sone', 'lag', 'rad', 'aye', 'sheep', 'loin', 'lien', 'cote', 'bel', 'belle', 'mon', 'loos',
  'wether', 'tow', 'yore', 'dag', 'bass', 'buss', 'lyon', 'sicks', 'bede', 'dor', 'pye', 'kye', 'kyte', 'bal',
  'bawl', 'pea', 'pi', 'ion', 'hoose', 'pas', 'wen', 'wot', 'nite', 'lite', 'thru', 'tho', 'enuf', 'gud', 'sum', 'cum', 'wat', 'tuff', 'hat', 'hen', 'now', 'rite', 'dues', 'ws', 'hose'
]);

const cap = (w) => w[0].toUpperCase() + w.slice(1);

/* Words too short for the generator to find enough non-words. */
const SHORT_MISSPELLINGS = { was: ['woz', 'wass', 'wus'] };

/** Questions built with genSpellings' misspell(): `wrongCount` wrong options each, seeded so they repeat exactly. */
const generated = (words, seed, wrongCount, levelOf, real) => {
  const rng = seeded(seed);
  return [...new Set(words)].map((answer) => {
    const wrong = (SHORT_MISSPELLINGS[answer] || misspell(answer, real)).slice(0, wrongCount);
    return { kind: 'word', answer, options: shuffle(rng, [answer, ...wrong]), level: levelOf(answer), note: `"${answer}" is the correct spelling.` };
  });
};

const pairQuestions = (pairs, levelOf, seed) => {
  const rng = seeded(seed);
  return pairs.map(([sentence, answer, alike, misspelt, explain], i) => ({
    kind: 'pair',
    sentence,
    answer,
    options: shuffle(rng, [answer, alike, misspelt]),
    level: levelOf(i),
    note: explain,
    explain
  }));
};

let spellingCache = null;
/** Every band's Spelling Fix questions, built once. */
export const spellingBands = () => {
  if (spellingCache) return spellingCache;
  const legacy = buildSpellings();
  const real = new Set([...NOT_MISSPELT, ...PICTURE_SPELLINGS.map((p) => p[0]), ...legacy.map((q) => q.answer), ...PRIMARY_WORDS, ...TRICKY_WORDS, ...PAIRS_A.flatMap((p) => [p[1], p[2]]), ...PAIRS_B.flatMap((p) => [p[1], p[2]])]);
  const pictureRng = seeded(4100);
  const foundation = PICTURE_SPELLINGS.map(([answer, picture, a, b]) => ({
    kind: 'picture',
    answer,
    picture,
    options: shuffle(pictureRng, [answer, a, b]),
    level: answer.length <= 3 ? 1 : 2,
    note: `${picture} ${answer}`,
    explain: `${cap(answer)} is spelled ${answer.toUpperCase().split('').join('-')}.`
  }));
  const developing = generated(PRIMARY_WORDS, 4200, 2, (w) => (w.length <= 5 ? 1 : w.length <= 7 ? 2 : 3), real);
  const intermediate = generated(TRICKY_WORDS, 4300, 3, (w) => (w.length <= 7 ? 1 : w.length <= 9 ? 2 : 3), real);
  const from = (band, lo = 0, hi = 1) => {
    const list = legacy.filter((q) => q.level === band);
    return list.slice(Math.floor(lo * list.length), Math.floor(hi * list.length));
  };
  const asWord = (q, level) => ({ kind: 'word', answer: q.answer, options: q.options, level, note: `"${q.answer}" is the correct spelling.` });
  const analytical = [
    ...from(1, 0.5).map((q) => asWord(q, 1)),
    ...from(2).map((q) => asWord(q, 2)),
    ...pairQuestions(PAIRS_A, () => 2, 4400),
    ...from(3).map((q) => asWord(q, 3)),
    ...pairQuestions(PAIRS_B, () => 3, 4500)
  ];
  const advanced = [
    ...from(2).map((q) => asWord(q, 1)),
    ...from(3, 0, 0.5).map((q) => asWord(q, 2)),
    ...pairQuestions(PAIRS_A, () => 2, 4600),
    ...from(3, 0.5).map((q) => asWord(q, 3)),
    ...pairQuestions(PAIRS_B, () => 3, 4700)
  ];
  spellingCache = { foundation, developing, intermediate, analytical, advanced };
  return spellingCache;
};
