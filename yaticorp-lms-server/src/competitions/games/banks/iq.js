/**
 * Questions for the Group Brain quiz games (asked 2026-10-27): Pattern
 * Master, Number Logic, Word Logic, Deduction Detective and Spatial IQ. The
 * number series come from ./generate.js; the rest are made here.
 *
 * As in ./generate.js, every maker takes the game's rng and returns a raw
 * question with the right option first (`answer: 0`); the game shuffles the
 * options. Made questions carry `facts`, the numbers they were made from, so
 * tests/competitions/groupBrain.banks.test.js can work each answer out again.
 * The word sets (Word Logic) are written by hand. A maker may take the
 * game's difficulty as its second argument: 'easy' | 'medium' | 'hard'.
 */
const { int, pickOne, isPrime } = require('./generate');

/** `n` different items of `list`, in a random order. */
const some = (rng, list, n) => {
    const a = [...list];
    for (let i = a.length - 1; i > 0; i -= 1) {
        const j = Math.floor(rng() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a.slice(0, n);
};

/* ── Reasoning (Deduction Detective) ─────────────────────────────────────────────────────────── */

const NAMES = ['Asha', 'Ravi', 'Meera', 'Kiran', 'Arjun', 'Divya', 'Farhan', 'Neha', 'Vikram', 'Sana'];
const COMPARE = [['taller', 'tallest', 'shortest'], ['older', 'oldest', 'youngest'], ['faster', 'fastest', 'slowest'], ['heavier', 'heaviest', 'lightest']];

/** Four people in an order, three clues that fix it: who is first or last? */
const ordering = (rng) => {
    const people = some(rng, NAMES, 4);                   // most first
    const [more, most, least] = pickOne(rng, COMPARE);
    const clues = some(rng, [0, 1, 2], 3).map((i) => `${people[i]} is ${more} than ${people[i + 1]}.`);
    const top = rng() < 0.5;
    const ans = top ? people[0] : people[3];
    return {
        topic: 'Ordering',
        prompt: `${clues.join(' ')} Who is the ${top ? most : least}?`,
        options: [ans, ...people.filter((p) => p !== ans)],
        answer: 0,
        explain: `In order: ${people.join(' > ')}.`,
        facts: { kind: 'ordering', people, top }
    };
};

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/** Today is a day; what day is it n days on? */
const daysAhead = (rng) => {
    const today = int(rng, 0, 6);
    const n = int(rng, 10, 99);
    const ans = DAYS[(today + n) % 7];
    const wrong = [1, 6, 2].map((k) => DAYS[(today + n + k) % 7]);
    return {
        topic: 'Calendar',
        prompt: `Today is ${DAYS[today]}. What day will it be ${n} days from today?`,
        options: [ans, ...wrong],
        answer: 0,
        explain: `${n} days is ${Math.floor(n / 7)} weeks and ${n % 7} days.`,
        facts: { kind: 'days', today, n }
    };
};

const COMPASS = ['North', 'East', 'South', 'West'];
const TURNS = [['turn right', 1], ['turn left', 3], ['turn around', 2]];

/** Facing a way, three turns: which way now? */
const directions = (rng) => {
    const start = int(rng, 0, 3);
    const turns = [0, 1, 2].map(() => pickOne(rng, TURNS));
    const end = turns.reduce((d, [, k]) => (d + k) % 4, start);
    return {
        topic: 'Directions',
        prompt: `You face ${COMPASS[start]}. You ${turns[0][0]}, then ${turns[1][0]}, then ${turns[2][0]}. Which way do you face now?`,
        options: [COMPASS[end], ...COMPASS.filter((_, i) => i !== end)],
        answer: 0,
        facts: { kind: 'directions', start, turns: turns.map(([, k]) => k) }
    };
};

const WORDS = ['CAT', 'DOG', 'SUN', 'PEN', 'MAP', 'BOOK', 'RAIN', 'FISH', 'LAMP', 'GOLD', 'TREE', 'STAR', 'MILK', 'ROAD'];
const shift = (word, k) => word.split('').map((c) => String.fromCharCode(65 + ((c.charCodeAt(0) - 65 + k + 26) % 26))).join('');

/** CAT is written DBU: how is another word written in the same code? */
const letterCode = (rng) => {
    const k = int(rng, 1, 3);
    const [shown, asked] = some(rng, WORDS, 2);
    const ans = shift(asked, k);
    const wrong = [...new Set([shift(asked, k + 1), shift(asked, k === 1 ? 2 : k - 1), shift(asked, -k), asked.split('').reverse().join('')])].filter((w) => w !== ans).slice(0, 3);
    return {
        topic: 'Coding',
        prompt: `If ${shown} is written as ${shift(shown, k)}, how is ${asked} written in the same code?`,
        options: [ans, ...wrong],
        answer: 0,
        explain: `Each letter moves ${k} place${k === 1 ? '' : 's'} on.`,
        facts: { kind: 'code', shown, asked, k }
    };
};


/* ── Odd one out (Number Logic and Word Logic) ───────────────────────────────────────────────────────── */

/** Three multiples of k and one that is not. */
const notMultiple = (rng) => {
    const k = pickOne(rng, [3, 4, 6, 7, 8, 9]);
    const multiples = some(rng, Array.from({ length: 12 }, (_, i) => k * (i + 3)), 3);
    let odd;
    do { odd = int(rng, k * 3, k * 14); } while (odd % k === 0);
    return {
        topic: 'Numbers',
        prompt: `Three of these are multiples of ${k}. Which one is not?`,
        options: [String(odd), ...multiples.map(String)],
        answer: 0,
        explain: `${odd} ÷ ${k} leaves a remainder of ${odd % k}.`,
        facts: { kind: 'not-multiple', k, numbers: [odd, ...multiples] }
    };
};

/** Three perfect squares and one that is not. */
const notSquare = (rng) => {
    const squares = some(rng, Array.from({ length: 15 }, (_, i) => (i + 4) ** 2), 3);
    let odd;
    do { odd = int(rng, 20, 330); } while (Number.isInteger(Math.sqrt(odd)));
    return {
        topic: 'Numbers',
        prompt: 'Three of these are perfect squares. Which one is not?',
        options: [String(odd), ...squares.map(String)],
        answer: 0,
        facts: { kind: 'not-square', numbers: [odd, ...squares] }
    };
};

/** Three primes and one that is not. */
const notPrimeOdd = (rng) => {
    const primes = some(rng, Array.from({ length: 80 }, (_, i) => i + 20).filter(isPrime), 3);
    let odd;
    do { odd = int(rng, 21, 99); } while (isPrime(odd) || odd % 2 === 0 || odd % 5 === 0);
    return {
        topic: 'Numbers',
        prompt: 'Three of these are prime numbers. Which one is not?',
        options: [String(odd), ...primes.map(String)],
        answer: 0,
        facts: { kind: 'not-prime', numbers: [odd, ...primes] }
    };
};

/**
 * Word sets: three of a kind and the one that is not, with why. Each set is
 * chosen so that only the odd one breaks the rule.
 */
const ODD_WORDS = [
    { kind: 'planets', same: ['Mars', 'Venus', 'Jupiter', 'Saturn', 'Mercury'], odd: ['the Moon', 'the Sun', 'Pluto'] },
    { kind: 'mammals', same: ['Dolphin', 'Elephant', 'Bat', 'Whale', 'Tiger'], odd: ['Shark', 'Crocodile', 'Penguin'] },
    { kind: 'metals', same: ['Iron', 'Copper', 'Silver', 'Aluminium', 'Zinc'], odd: ['Glass', 'Rubber', 'Wood'] },
    { kind: 'primary colours of light', same: ['Red', 'Green', 'Blue'], odd: ['Purple', 'Pink', 'Brown'] },
    { kind: 'string instruments', same: ['Violin', 'Sitar', 'Guitar', 'Veena', 'Cello'], odd: ['Flute', 'Tabla', 'Trumpet'] },
    { kind: 'Indian states', same: ['Kerala', 'Gujarat', 'Punjab', 'Odisha', 'Assam'], odd: ['Delhi', 'Chandigarh', 'Puducherry'] },
    { kind: 'continents', same: ['Asia', 'Africa', 'Europe', 'Australia', 'Antarctica'], odd: ['Greenland', 'India', 'Arabia'] },
    { kind: 'programming languages', same: ['Python', 'Java', 'JavaScript', 'C++', 'Kotlin'], odd: ['HTML', 'Linux', 'Excel'] },
    { kind: 'body organs', same: ['Heart', 'Liver', 'Lungs', 'Kidney', 'Brain'], odd: ['Elbow', 'Knee', 'Ankle'] },
    { kind: 'birds', same: ['Sparrow', 'Eagle', 'Parrot', 'Peacock', 'Crow'], odd: ['Bat', 'Butterfly', 'Bee'] },
    { kind: 'vowels', same: ['A', 'E', 'I', 'O', 'U'], odd: ['B', 'K', 'T'] },
    { kind: 'insects', same: ['Ant', 'Bee', 'Butterfly', 'Mosquito', 'Beetle'], odd: ['Spider', 'Scorpion', 'Snail'] },
    { kind: 'units of length', same: ['Metre', 'Inch', 'Mile', 'Kilometre', 'Foot'], odd: ['Litre', 'Gram', 'Second'] },
    { kind: 'cricket terms', same: ['Wicket', 'Over', 'Innings', 'Bowler', 'Boundary'], odd: ['Goalkeeper', 'Touchdown', 'Dribble'] }
];

const oddWord = (rng) => {
    const set = pickOne(rng, ODD_WORDS);
    const same = some(rng, set.same, 3);
    const odd = pickOne(rng, set.odd);
    return {
        topic: 'Words',
        prompt: 'Which one does not belong with the others?',
        options: [odd, ...same],
        answer: 0,
        explain: `${same.join(', ')} are ${set.kind}; ${odd} is not.`,
        facts: { kind: 'odd-word', set: set.kind }
    };
};


/* ── Words (Word Logic, written by hand) ─────────────────────────────────────── */

const WORD = [
    { topic: 'Analogy', prompt: 'Bird is to nest as bee is to…', options: ['Hive', 'Den', 'Burrow', 'Stable'] },
    { topic: 'Analogy', prompt: 'Doctor is to hospital as teacher is to…', options: ['School', 'Court', 'Farm', 'Factory'] },
    { topic: 'Analogy', prompt: 'Hand is to glove as foot is to…', options: ['Sock', 'Hat', 'Belt', 'Scarf'] },
    { topic: 'Analogy', prompt: 'Puppy is to dog as kitten is to…', options: ['Cat', 'Cow', 'Horse', 'Goat'] },
    { topic: 'Analogy', prompt: 'Pen is to write as knife is to…', options: ['Cut', 'Draw', 'Cook', 'Sew'] },
    { topic: 'Analogy', prompt: 'Day is to night as summer is to…', options: ['Winter', 'Spring', 'Rain', 'Heat'] },
    { topic: 'Analogy', prompt: 'Book is to read as song is to…', options: ['Listen', 'Watch', 'Write', 'Paint'] },
    { topic: 'Analogy', prompt: 'Fish is to swim as bird is to…', options: ['Fly', 'Run', 'Crawl', 'Dig'] },
    { topic: 'Analogy', prompt: 'Eye is to see as ear is to…', options: ['Hear', 'Smell', 'Taste', 'Touch'] },
    { topic: 'Analogy', prompt: 'Cow is to milk as hen is to…', options: ['Egg', 'Wool', 'Honey', 'Silk'] },
    { topic: 'Analogy', prompt: 'Painter is to brush as writer is to…', options: ['Pen', 'Easel', 'Chisel', 'Camera'] },
    { topic: 'Analogy', prompt: 'Lion is to roar as dog is to…', options: ['Bark', 'Hiss', 'Neigh', 'Chirp'] },
    { topic: 'Synonym', prompt: 'Which word means the same as "rapid"?', options: ['Quick', 'Calm', 'Late', 'Heavy'] },
    { topic: 'Synonym', prompt: 'Which word means the same as "huge"?', options: ['Enormous', 'Tiny', 'Narrow', 'Quiet'] },
    { topic: 'Synonym', prompt: 'Which word means the same as "begin"?', options: ['Start', 'Finish', 'Pause', 'Wait'] },
    { topic: 'Synonym', prompt: 'Which word means the same as "brave"?', options: ['Courageous', 'Timid', 'Lazy', 'Clever'] },
    { topic: 'Synonym', prompt: 'Which word means the same as "honest"?', options: ['Truthful', 'Proud', 'Angry', 'Polite'] },
    { topic: 'Synonym', prompt: 'Which word means the same as "difficult"?', options: ['Hard', 'Simple', 'Plain', 'Soft'] },
    { topic: 'Synonym', prompt: 'Which word means the same as "silent"?', options: ['Quiet', 'Loud', 'Bright', 'Busy'] },
    { topic: 'Synonym', prompt: 'Which word means the same as "wealthy"?', options: ['Rich', 'Poor', 'Kind', 'Weak'] },
    { topic: 'Antonym', prompt: 'Which word is the opposite of "ancient"?', options: ['Modern', 'Old', 'Historic', 'Antique'] },
    { topic: 'Antonym', prompt: 'Which word is the opposite of "expand"?', options: ['Shrink', 'Grow', 'Widen', 'Stretch'] },
    { topic: 'Antonym', prompt: 'Which word is the opposite of "victory"?', options: ['Defeat', 'Success', 'Triumph', 'Win'] },
    { topic: 'Antonym', prompt: 'Which word is the opposite of "generous"?', options: ['Selfish', 'Kind', 'Giving', 'Warm'] },
    { topic: 'Antonym', prompt: 'Which word is the opposite of "accept"?', options: ['Reject', 'Receive', 'Take', 'Allow'] },
    { topic: 'Antonym', prompt: 'Which word is the opposite of "rare"?', options: ['Common', 'Unusual', 'Scarce', 'Special'] },
    { topic: 'Antonym', prompt: 'Which word is the opposite of "fragile"?', options: ['Sturdy', 'Delicate', 'Weak', 'Thin'] },
    { topic: 'Antonym', prompt: 'Which word is the opposite of "arrive"?', options: ['Depart', 'Reach', 'Enter', 'Land'] },
    { topic: 'Spelling', prompt: 'Which word is spelt correctly?', options: ['Necessary', 'Neccessary', 'Necesary', 'Neccesary'] },
    { topic: 'Spelling', prompt: 'Which word is spelt correctly?', options: ['Separate', 'Seperate', 'Separete', 'Seprate'] },
    { topic: 'Spelling', prompt: 'Which word is spelt correctly?', options: ['Receive', 'Recieve', 'Receeve', 'Resieve'] },
    { topic: 'Spelling', prompt: 'Which word is spelt correctly?', options: ['Environment', 'Enviroment', 'Envirnment', 'Enviornment'] },
    { topic: 'Spelling', prompt: 'Which word is spelt correctly?', options: ['Definitely', 'Definately', 'Defenitely', 'Definitly'] },
    { topic: 'Spelling', prompt: 'Which word is spelt correctly?', options: ['Accommodate', 'Accomodate', 'Acommodate', 'Acomodate'] },
    { topic: 'Word sense', prompt: 'A group of lions is called a…', options: ['Pride', 'Herd', 'Flock', 'Swarm'] },
    { topic: 'Word sense', prompt: 'A person who writes poems is a…', options: ['Poet', 'Sculptor', 'Pilot', 'Chemist'] },
    { topic: 'Word sense', prompt: 'A word that names a person, place or thing is a…', options: ['Noun', 'Verb', 'Adverb', 'Preposition'] },
    { topic: 'Word sense', prompt: 'What is the plural of "child"?', options: ['Children', 'Childs', 'Childes', 'Childrens'] }
].map((q, i) => ({ id: `ww-${i + 1}`, ...q, answer: 0 }));

/* ── Missing signs (Number Logic) ─────────────────────────────────────────────────────── */

const OPS = ['+', '−', '×', '÷'];
const apply = (a, op, b) => ({ '+': a + b, '−': a - b, '×': a * b, '÷': b && a % b === 0 ? a / b : NaN })[op];

/**
 * a ? b = c, where exactly one of + − × ÷ makes it true (2 ? 2 = 4 is never
 * asked: + and × both fit).
 */
const missingOperator = (rng) => {
    for (;;) {
        const op = pickOne(rng, OPS);
        let a; let b;
        if (op === '÷') { b = int(rng, 2, 12); a = b * int(rng, 2, 12); }
        else if (op === '×') { a = int(rng, 3, 15); b = int(rng, 3, 12); }
        else if (op === '−') { a = int(rng, 20, 99); b = int(rng, 2, a - 1); }
        else { a = int(rng, 10, 90); b = int(rng, 2, 60); }
        const c = apply(a, op, b);
        if (OPS.filter((o) => apply(a, o, b) === c).length !== 1) continue;
        return {
            topic: 'Missing operator',
            prompt: `Which sign makes it true: ${a} ? ${b} = ${c}`,
            options: [op, ...OPS.filter((o) => o !== op)],
            answer: 0,
            explain: `${a} ${op} ${b} = ${c}.`,
            facts: { kind: 'operator', a, b, c, op }
        };
    }
};

/** (a ? b) + c = d: the sign in the bracket. */
const bracketOperator = (rng) => {
    for (;;) {
        const q = missingOperator(rng);
        const { a, b, c, op } = q.facts;
        const k = int(rng, 2, 20);
        if (OPS.filter((o) => apply(a, o, b) + k === c + k).length !== 1) continue;
        return { ...q, prompt: `Which sign makes it true: (${a} ? ${b}) + ${k} = ${c + k}`, explain: `${a} ${op} ${b} = ${c}, and ${c} + ${k} = ${c + k}.`, facts: { ...q.facts, k } };
    }
};


/** A grid of rows a, b, a + b (or a × b): the missing number in the last row. */
const missingNumber = (rng) => {
    const times = rng() < 0.4;
    const rows = [0, 1, 2].map(() => {
        const a = int(rng, 2, times ? 9 : 40); const b = int(rng, 2, times ? 9 : 40);
        return [a, b, times ? a * b : a + b];
    });
    const ans = rows[2][2];
    const shown = rows.map((r, i) => (i === 2 ? `${r[0]}, ${r[1]}, ?` : r.join(', '))).join('   |   ');
    return {
        topic: 'Missing number',
        prompt: `Each row follows the same rule. What is the missing number?   ${shown}`,
        options: [...new Set([ans, times ? rows[2][0] + rows[2][1] : rows[2][0] * rows[2][1], ans + 1, ans - 2, ans + 3, ans + 5])].filter((v) => v > 0).slice(0, 4).map(String),
        answer: 0,
        explain: `In each row the third number is the first two ${times ? 'multiplied' : 'added'}.`,
        facts: { kind: 'missing-number', rows, times }
    };
};

/* ── Patterns (Pattern Master) ─────────────────────────────────────────── */

const SHAPES = ['▲', '●', '■', '◆', '★', '✚'];
const ARROWS = ['↑', '↗', '→', '↘', '↓', '↙', '←', '↖'];

/** A cycle of 2–4 shapes, one place left blank (the next, or one in the middle). */
const shapeCycle = (rng, level = 'medium') => {
    const period = level === 'easy' ? 2 : level === 'hard' ? 4 : int(rng, 3, 4);
    const cycle = some(rng, SHAPES, period);
    const length = period * 2 + 2;
    const terms = Array.from({ length }, (_, i) => cycle[i % period]);
    const gap = rng() < 0.5 ? length - 1 : int(rng, 1, length - 2);
    const ans = terms[gap];
    const shown = terms.map((t, i) => (i === gap ? '?' : t)).join('  ');
    return {
        topic: 'Shapes',
        prompt: `Which shape replaces the question mark?   ${shown}`,
        options: [ans, ...some(rng, SHAPES.filter((x) => x !== ans), 3)],
        answer: 0,
        explain: `The shapes repeat every ${period}: ${cycle.join(' ')}.`,
        facts: { kind: 'cycle', cycle, gap }
    };
};

/** An arrow turning the same amount each step: where does it point next? */
const arrowTurn = (rng) => {
    const step = pickOne(rng, [1, 2, 3, -1, -2]);
    const start = int(rng, 0, 7);
    const at = (i) => ARROWS[(((start + step * i) % 8) + 8) % 8];
    const terms = [0, 1, 2, 3].map(at);
    const ans = at(4);
    const near = [at(5), at(3), ARROWS[(ARROWS.indexOf(ans) + 4) % 8], ARROWS[(ARROWS.indexOf(ans) + 1) % 8], ARROWS[(ARROWS.indexOf(ans) + 7) % 8]];
    return {
        topic: 'Rotation',
        prompt: `The arrow turns the same way each step. What comes next?   ${terms.join('  ')}  ?`,
        options: [ans, ...[...new Set(near)].filter((x) => x !== ans).slice(0, 3)],
        answer: 0,
        explain: `Each step turns ${Math.abs(step) * 45}° ${step > 0 ? 'clockwise' : 'anticlockwise'}.`,
        facts: { kind: 'arrow', start, step }
    };
};

/** Groups of a shape growing by the same number each time. */
const growing = (rng) => {
    const shape = pickOne(rng, ['●', '★', '■']);
    const a = int(rng, 1, 2); const d = int(rng, 1, 2);
    const group = (n) => shape.repeat(n);
    const terms = [0, 1, 2].map((i) => group(a + d * i));
    const n = a + d * 3;
    return {
        topic: 'Growth',
        prompt: `What comes next?   ${terms.join('   ')}   ?`,
        options: [group(n), group(n + 1), group(n - 1), group(n + 2)],
        answer: 0,
        explain: `Each group has ${d} more ${shape} than the one before.`,
        facts: { kind: 'growing', a, d, n }
    };
};

/* ── Words (Word Logic) ────────────────────────────────────────────────── */

// No word here is an anagram of another, so only one option fits the letters.
const ANAGRAMS = ['PLANET', 'WATER', 'GARDEN', 'BRIDGE', 'CASTLE', 'FOREST', 'ORANGE', 'PENCIL', 'ROCKET', 'SCHOOL', 'TEACHER', 'WINDOW', 'MARKET', 'NUMBER', 'PUZZLE', 'SPIDER', 'TIGER', 'CAMERA', 'LIBRARY', 'MONKEY', 'JUNGLE', 'FLOWER', 'ISLAND', 'DOCTOR'];
const sorted = (w) => w.split('').sort().join('');

/** A scrambled word: which word is it? */
const anagram = (rng) => {
    const word = pickOne(rng, ANAGRAMS);
    let scrambled;
    do { scrambled = some(rng, word.split(''), word.length).join(''); } while (scrambled === word);
    const others = some(rng, ANAGRAMS.filter((w) => sorted(w) !== sorted(word)), 3);
    return {
        topic: 'Anagram',
        prompt: `Unscramble the letters: ${scrambled}`,
        options: [word, ...others],
        answer: 0,
        facts: { kind: 'anagram', scrambled, word }
    };
};

/* ── Logic grids (Deduction Detective) ─────────────────────────────────── */

const PETS = ['cat', 'dog', 'parrot', 'rabbit'];
const COLOURS = ['red', 'blue', 'green', 'yellow'];
const SPORTS = ['chess', 'cricket', 'tennis', 'football'];

const perms = (n) => {
    if (n === 1) return [[0]];
    return perms(n - 1).flatMap((p) => Array.from({ length: n }, (_, i) => [...p.slice(0, i), n - 1, ...p.slice(i)]));
};

/**
 * n people, two lists of n things, one of each per person. Clues are added
 * one at a time, each ruling out at least one arrangement, until only the
 * true one is left; then one question about it.
 */
const logicGrid = (rng, level = 'medium') => {
    const n = level === 'easy' ? 3 : 4;
    const people = some(rng, NAMES, n);
    const [listA, listB] = some(rng, [PETS, COLOURS, SPORTS], 2).map((l) => some(rng, l, n));
    const nameA = PETS.includes(listA[0]) ? 'pet' : COLOURS.includes(listA[0]) ? 'colour' : 'sport';
    const nameB = PETS.includes(listB[0]) ? 'pet' : COLOURS.includes(listB[0]) ? 'colour' : 'sport';
    const truthA = some(rng, [...Array(n).keys()], n);     // person i has listA[truthA[i]]
    const truthB = some(rng, [...Array(n).keys()], n);
    const say = (kind, x) => (kind === 'pet' ? `has the ${x}` : kind === 'colour' ? `likes ${x}` : `plays ${x}`);
    const sayThe = (kind, x) => (kind === 'pet' ? `The one with the ${x}` : kind === 'colour' ? `The one who likes ${x}` : `The one who plays ${x}`);
    // Every clue that is true of the answer, as a test on an arrangement.
    const pool = [];
    for (let i = 0; i < n; i += 1) {
        for (let k = 0; k < n; k += 1) {
            if (truthA[i] === k) pool.push({ text: `${people[i]} ${say(nameA, listA[k])}.`, ok: (A) => A[i] === k });
            else pool.push({ text: `${people[i]} does not ${say(nameA, listA[k]).replace(/^has/, 'have').replace(/^likes/, 'like').replace(/^plays/, 'play')}.`, ok: (A) => A[i] !== k });
            if (truthB[i] === k) pool.push({ text: `${people[i]} ${say(nameB, listB[k])}.`, ok: (A, B) => B[i] === k });
            else pool.push({ text: `${people[i]} does not ${say(nameB, listB[k]).replace(/^has/, 'have').replace(/^likes/, 'like').replace(/^plays/, 'play')}.`, ok: (A, B) => B[i] !== k });
        }
        pool.push({ text: `${sayThe(nameA, listA[truthA[i]])} ${say(nameB, listB[truthB[i]])}.`, ok: (A, B) => B[A.indexOf(truthA[i])] === truthB[i] });
    }
    const all = perms(n).flatMap((A) => perms(n).map((B) => [A, B]));
    let left = all;
    const clues = [];
    // Direct "X has Y" clues are kept for last, so the puzzle needs some thought.
    const order = some(rng, pool, pool.length).sort((x, y) => (/ does not |^The one/.test(y.text) ? 1 : 0) - (/ does not |^The one/.test(x.text) ? 1 : 0));
    for (const clue of order) {
        if (left.length === 1) break;
        const next = left.filter(([A, B]) => clue.ok(A, B));
        if (next.length < left.length) { clues.push(clue.text); left = next; }
    }
    // Ask about someone or something: who has X, or what does Y like.
    const target = int(rng, 0, n - 1);
    const askWho = rng() < 0.5;
    const ans = askWho ? people[target] : listB[truthB[target]];
    const question = askWho ? `Who ${say(nameA, listA[truthA[target]])}?` : `Which ${nameB} goes with ${people[target]}?`;
    const options = askWho ? [ans, ...people.filter((p) => p !== ans)].slice(0, 4) : [ans, ...listB.filter((x) => x !== ans)].slice(0, 4);
    while (options.length < 4) options.push(askWho ? some(rng, NAMES.filter((p) => !options.includes(p)), 1)[0] : 'None of them');
    return {
        topic: 'Logic grid',
        prompt: `${people.join(', ')} each have one ${nameA} and one ${nameB}, all different. ${clues.join(' ')} ${question}`,
        options,
        answer: 0,
        explain: people.map((p, i) => `${p}: ${listA[truthA[i]]}, ${listB[truthB[i]]}`).join('; ') + '.',
        facts: { kind: 'logic-grid', solutions: left.length }
    };
};

/* ── Spatial (Spatial IQ) ──────────────────────────────────────────────── */

// A picture is a square grid of 0 and 1, drawn with ⬛ and ⬜ a row a line.
const draw = (g) => g.map((row) => row.map((c) => (c ? '⬛' : '⬜')).join('')).join('\n');
const rotateCW = (g) => g[0].map((_, c) => g.map((row) => row[c]).reverse());
const rotateCCW = (g) => rotateCW(rotateCW(rotateCW(g)));
const flipLR = (g) => g.map((row) => [...row].reverse());
const flipTB = (g) => [...g].reverse();

/** A random picture that looks different under every turn and flip. */
const asymmetric = (rng, n) => {
    for (;;) {
        const g = Array.from({ length: n }, () => Array.from({ length: n }, () => (rng() < 0.45 ? 1 : 0)));
        const forms = [g, rotateCW(g), rotateCW(rotateCW(g)), rotateCCW(g), flipLR(g), flipTB(g), flipLR(rotateCW(g)), flipTB(rotateCW(g))].map(draw);
        if (new Set(forms).size === 8 && g.flat().some(Boolean)) return g;
    }
};

const rotation = (rng, level = 'medium') => {
    const g = asymmetric(rng, level === 'easy' ? 3 : 4);
    const cw = rng() < 0.5;
    const turned = cw ? rotateCW(g) : rotateCCW(g);
    const wrong = [cw ? rotateCCW(g) : rotateCW(g), flipLR(g), rotateCW(rotateCW(g))];
    return {
        topic: 'Rotation',
        prompt: `Which option is this picture turned 90° ${cw ? 'clockwise' : 'anticlockwise'}?`,
        code: draw(g),
        options: [draw(turned), ...wrong.map(draw)],
        answer: 0,
        facts: { kind: 'rotation', g, cw }
    };
};

const mirror = (rng, level = 'medium') => {
    const g = asymmetric(rng, level === 'easy' ? 3 : 4);
    const sideways = rng() < 0.6;
    const ans = sideways ? flipLR(g) : flipTB(g);
    const wrong = [sideways ? flipTB(g) : flipLR(g), rotateCW(g), rotateCW(rotateCW(g))];
    return {
        topic: 'Mirror image',
        prompt: sideways ? 'A mirror stands on the right of this picture. Which option is its reflection?' : 'The picture stands on a mirror lying flat below it. Which option is its reflection?',
        code: draw(g),
        options: [draw(ans), ...wrong.map(draw)],
        answer: 0,
        facts: { kind: 'mirror', g, sideways }
    };
};

/**
 * A square sheet folded in half, left onto right; a hole punched through
 * both layers. Unfolded, where are the holes?
 */
const paperFold = (rng, level = 'medium') => {
    const n = 4;
    const punches = level === 'hard' ? 2 : 1;
    const holes = Array.from({ length: n }, () => Array(n).fill(0));
    for (let p = 0; p < punches; p += 1) holes[int(rng, 0, n - 1)][int(rng, n / 2, n - 1)] = 1;
    // Unfolded: each hole, and its mirror in the left half.
    const unfolded = holes.map((row) => row.map((v, c) => v || row[n - 1 - c]));
    const wrong = [holes, flipLR(holes), flipTB(unfolded), flipTB(holes), rotateCW(unfolded), rotateCW(holes)].map(draw);
    const options = [...new Set([draw(unfolded), ...wrong])].slice(0, 4);
    return {
        topic: 'Paper folding',
        prompt: 'A square sheet is folded in half, the left half onto the right. A hole is punched where shown (on the folded sheet, right half). Unfolded, which option shows the holes?',
        code: draw(holes),
        options,
        answer: 0,
        facts: { kind: 'fold', holes }
    };
};

/**
 * A cross-shaped net of a cube, its faces numbered: which face is opposite
 * a given one? In the net  .A.. / BCDE / .F..  A faces F, B faces D, C faces E.
 */
const cubeNet = (rng) => {
    const [a, b, c, d, e, f] = some(rng, [1, 2, 3, 4, 5, 6], 6);
    const net = `      ${a}\n${b}  ${c}  ${d}  ${e}\n      ${f}`;
    const opposite = { [a]: f, [f]: a, [b]: d, [d]: b, [c]: e, [e]: c };
    const asked = pickOne(rng, [a, b, c, d, e, f]);
    const ans = opposite[asked];
    const wrong = some(rng, [a, b, c, d, e, f].filter((x) => x !== asked && x !== ans), 3);
    return {
        topic: 'Cube net',
        prompt: `This net is folded into a cube. Which number is on the face opposite ${asked}?`,
        code: net,
        options: [String(ans), ...wrong.map(String)],
        answer: 0,
        explain: 'Faces two apart in a row of the net are opposite, and so are the faces above and below it.',
        facts: { kind: 'cube', net: [a, b, c, d, e, f], asked }
    };
};

/* ── The games' question sets ──────────────────────────────────────────── */

const { SERIES, PUZZLES } = require('./generate');
const NUMBER_PUZZLES = PUZZLES.filter((m) => !SERIES.includes(m) && m.name !== 'multiply');
const PATTERNS = [shapeCycle, ...SERIES.slice(0, 3), arrowTurn, ...SERIES.slice(3), growing];
// Number Logic: the number series (not the letter one), missing numbers and signs, and number puzzles.
const NUMBERS = [missingNumber, ...SERIES.slice(0, 2), notMultiple, missingOperator, ...NUMBER_PUZZLES, ...SERIES.slice(2, 5), notSquare, bracketOperator, notPrimeOdd];
const WORDS_GAME = [anagram, oddWord, anagram, oddWord];
const DEDUCTION = [logicGrid, ordering, logicGrid, daysAhead, logicGrid, directions, letterCode];
const SPATIAL = [rotation, mirror, paperFold, cubeNet];

module.exports = { PATTERNS, NUMBERS, WORDS_GAME, WORD, DEDUCTION, SPATIAL, ODD_WORDS, ANAGRAMS, shift, apply, DAYS, COMPASS, draw, rotateCW, flipLR, flipTB,
    // One by one, for the adventure games (adventure.js).
    shapeCycle, arrowTurn, missingNumber, missingOperator, bracketOperator, ordering, letterCode, logicGrid, daysAhead };
