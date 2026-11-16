/**
 * Questions for the group versions of games in the 84-game catalogue (2026-11-14: student app
 * career/components/games/catalog.js). Each maker is (rng, d, zone) → one raw question, the right option first
 * (`answer: 0`) unless it keeps its options in their own order (`fixedOrder`), as banks/solo.js makers do. The ideas
 * and data are ported from the solo games' generators (student app career/data/bands/*.js — copied, not imported).
 *
 * Every question carries `facts`: what a test needs to work the answer out again from scratch (only the raw
 * question has them; quizCore keeps none of it, so nothing here reaches a player before the reveal).
 *
 *   young  animalPairs (Animal Pair Safari), rhymes (Rhyme Detective), numberHop (Number Hop),
 *          missingNumber (Missing Number Race)
 *   smart  analogies (Analogy Master), equationRush (Equation Rush), ratioRelay (Ratio Relay)
 *   master cipherLab (Cipher Lab), probability (Probability Lab), quantArena (Quantitative Arena),
 *          decisions (Decision Theory Arena)
 *
 * `d` is 1–3 (the room's zone, or its difficulty for a room made without one).
 */
const int = (rng, lo, hi) => lo + Math.floor(rng() * (hi - lo + 1));
const pickOne = (rng, list) => list[Math.floor(rng() * list.length)];
const shuffle = (list, rng) => {
    const a = [...list];
    for (let i = a.length - 1; i > 0; i -= 1) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
};
const MINUS = '−';
const num = (v) => (v < 0 ? `${MINUS}${-v}` : String(v));

/** Up to three distinct numbers from `pool` that are not `answer` and pass `ok`, topped up with near numbers. */
const numberWrongs = (rng, answer, pool, ok = () => true) => {
    const out = [];
    for (const v of shuffle(pool, rng)) if (Number.isInteger(v) && v !== answer && ok(v) && !out.includes(v) && out.length < 3) out.push(v);
    for (let k = 1; out.length < 3 && k < 200; k += 1) for (const v of [answer + k, answer - k]) if (v !== answer && ok(v) && !out.includes(v) && out.length < 3) out.push(v);
    return out;
};

/* ─────────────────────────────── Animal Pair Safari (young) ─────────────────────────────── */

// What each animal says, its baby and its home ([word, picture]); `also`: other words a child could link to it.
// A wrong option is never one the asked-about animal could also claim (and a wrong animal never one that claims it).
const ANIMALS = [
    { emoji: '🐄', name: 'cow', sound: 'Moo', baby: 'calf', also: ['barn', 'farm', 'milk'] },
    { emoji: '🐕', name: 'dog', sound: 'Woof', baby: 'puppy', home: ['kennel', '🏠'], also: ['pup', 'bark', 'growl', 'howl'] },
    { emoji: '🐈', name: 'cat', sound: 'Meow', baby: 'kitten', also: ['purr', 'hiss'] },
    { emoji: '🦆', name: 'duck', sound: 'Quack', baby: 'duckling', also: ['pond', 'water', 'nest', 'egg', 'chick'] },
    { emoji: '🐑', name: 'sheep', sound: 'Baa', baby: 'lamb', also: ['farm', 'wool'] },
    { emoji: '🐖', name: 'pig', sound: 'Oink', baby: 'piglet', also: ['sty', 'mud', 'farm'] },
    { emoji: '🐔', name: 'hen', sound: 'Cluck', baby: 'chick', also: ['egg', 'nest', 'coop', 'farm'] },
    { emoji: '🦁', name: 'lion', sound: 'Roar', baby: 'cub', home: ['den', '🪨'], also: ['growl'] },
    { emoji: '🐍', name: 'snake', sound: 'Hiss', also: ['hole', 'egg'] },
    { emoji: '🐝', name: 'bee', sound: 'Buzz', home: ['hive', '🍯'], also: ['honey', 'flower'] },
    { emoji: '🐎', name: 'horse', sound: 'Neigh', baby: 'foal', home: ['stable', '🐴'], also: ['farm'] },
    { emoji: '🐸', name: 'frog', sound: 'Croak', baby: 'tadpole', home: ['pond', '🪷'], also: ['water', 'ribbit'] },
    { emoji: '🦉', name: 'owl', sound: 'Hoot', baby: 'owlet', also: ['tree', 'nest', 'chick'] },
    { emoji: '🐭', name: 'mouse', sound: 'Squeak', also: ['hole', 'burrow'] },
    { emoji: '🐺', name: 'wolf', sound: 'Howl', home: ['den', '🪨'], also: ['growl', 'cub', 'pup'] },
    { emoji: '🐦', name: 'bird', sound: 'Tweet', home: ['nest', '🪺'], also: ['chick', 'tree', 'egg'] },
    { emoji: '🕷️', name: 'spider', home: ['web', '🕸️'], also: [] },
    { emoji: '🐟', name: 'fish', home: ['water', '🌊'], also: ['pond', 'sea'] },
    { emoji: '🐇', name: 'rabbit', home: ['burrow', '🕳️'], also: ['hole', 'bunny'] },
    { emoji: '🐧', name: 'penguin', home: ['ice', '🧊'], also: ['chick', 'snow', 'water', 'sea', 'egg'] },
    { emoji: '🐫', name: 'camel', home: ['desert', '🏜️'], also: ['sand', 'calf'] },
    { emoji: '🐒', name: 'monkey', home: ['tree', '🌳'], also: ['banana'] },
    { emoji: '🐻', name: 'bear', sound: 'Growl', baby: 'cub', home: ['cave', '⛰️'], also: ['den', 'honey', 'roar'] },
    { emoji: '🦋', name: 'butterfly', baby: 'caterpillar', also: ['flower', 'egg'] },
    { emoji: '🦘', name: 'kangaroo', baby: 'joey', also: ['pouch'] }
];
const low = (s) => String(s).toLowerCase();
/** The word an animal has for `kind` ('sound' | 'baby' | 'home'), or null. */
const partnerOf = (animal, kind) => (kind === 'home' ? animal.home?.[0] : animal[kind]) || null;
/** Every word a child could link to this animal. */
const animalFacts = (animal) => new Set([low(animal.name), ...(animal.also || []).map(low), ...['sound', 'baby', 'home'].map((k) => partnerOf(animal, k)).filter(Boolean).map(low)]);
const animalLabel = (a) => `${a.emoji} ${a.name}`;
const KIND_WORDS = {
    sound: { ask: (a) => `What sound does a ${a.name} make?`, back: (w) => `Which animal says “${w}”?`, topic: 'Sounds' },
    baby: { ask: (a) => `What is a baby ${a.name} called?`, back: (w) => `Whose baby is called a ${w}?`, topic: 'Babies' },
    home: { ask: (a) => `Where does a ${a.name} live?`, back: (w) => `Which animal lives in a ${w}?`, topic: 'Homes' }
};
const animalPairs = (rng, d) => {
    const kind = d <= 1 ? pickOne(rng, ['sound', 'sound', 'baby']) : pickOne(rng, ['sound', 'baby', 'home']);
    const animal = pickOne(rng, ANIMALS.filter((a) => partnerOf(a, kind)));
    const word = partnerOf(animal, kind);
    const backwards = d >= 2 && rng() < 0.5;
    const words = KIND_WORDS[kind];
    if (!backwards) {
        // Other animals' words of the same kind that this animal cannot claim.
        const facts = animalFacts(animal);
        const pool = [...new Set(ANIMALS.map((a) => partnerOf(a, kind)).filter((w) => w && !facts.has(low(w))))];
        const wrong = shuffle(pool, rng).slice(0, 3);
        return {
            topic: words.topic, prompt: words.ask(animal), visual: { kind: 'symbols', items: [animal.emoji] },
            options: [word, ...wrong], answer: 0, explain: `A ${animal.name} — ${word}.`,
            facts: { kind: 'animal', dir: 'forward', pair: kind, animal: animal.name }
        };
    }
    // Which animal: the others must not be able to claim the word at all.
    const pool = ANIMALS.filter((a) => a !== animal && !animalFacts(a).has(low(word)));
    const wrong = shuffle(pool, rng).slice(0, 3);
    return {
        topic: words.topic, prompt: words.back(word),
        options: [animalLabel(animal), ...wrong.map(animalLabel)], answer: 0, explain: `A ${animal.name} — ${word}.`,
        facts: { kind: 'animal', dir: 'back', pair: kind, word }
    };
};

/* ─────────────────────────────── Rhyme Detective (young) ─────────────────────────────── */

// Rhyme families: words in a family rhyme; words in different families do not. Each word's spelled ending too, so the
// youngest only meet rhymes spelled alike (cat/hat).
const RHYME_FAMILIES = [
    [['cat', '🐱', 'at'], ['hat', '🎩', 'at'], ['bat', '🦇', 'at'], ['rat', '🐀', 'at']],
    [['dog', '🐶', 'og'], ['frog', '🐸', 'og'], ['log', '🪵', 'og']],
    [['bee', '🐝', 'ee'], ['tree', '🌳', 'ee'], ['key', '🔑', 'ey'], ['tea', '🍵', 'ea']],
    [['car', '🚗', 'ar'], ['star', '⭐', 'ar'], ['jar', '🫙', 'ar'], ['guitar', '🎸', 'ar']],
    [['cake', '🎂', 'ake'], ['snake', '🐍', 'ake'], ['lake', '🏞️', 'ake']],
    [['sun', '☀️', 'un'], ['run', '🏃', 'un']],
    [['ring', '💍', 'ing'], ['king', '🤴', 'ing'], ['sing', '🎤', 'ing']],
    [['fox', '🦊', 'ox'], ['box', '📦', 'ox'], ['socks', '🧦', 'ocks']],
    [['bell', '🔔', 'ell'], ['shell', '🐚', 'ell']],
    [['boat', '⛵', 'oat'], ['goat', '🐐', 'oat'], ['coat', '🧥', 'oat']],
    [['bed', '🛏️', 'ed'], ['sled', '🛷', 'ed'], ['bread', '🍞', 'ead']],
    [['snail', '🐌', 'ail'], ['mail', '📬', 'ail'], ['whale', '🐳', 'ale']],
    [['house', '🏠', 'ouse'], ['mouse', '🐭', 'ouse']],
    [['train', '🚆', 'ain'], ['rain', '🌧️', 'ain'], ['chain', '⛓️', 'ain'], ['plane', '✈️', 'ane']],
    [['light', '💡', 'ight'], ['night', '🌃', 'ight'], ['kite', '🪁', 'ite']],
    [['moon', '🌙', 'oon'], ['spoon', '🥄', 'oon'], ['balloon', '🎈', 'oon']],
    [['clock', '🕰️', 'ock'], ['lock', '🔒', 'ock'], ['rock', '🪨', 'ock']],
    [['van', '🚐', 'an'], ['pan', '🍳', 'an'], ['man', '👨', 'an']],
    [['hen', '🐔', 'en'], ['pen', '🖊️', 'en'], ['ten', '🔟', 'en']],
    [['bear', '🐻', 'ear'], ['pear', '🍐', 'ear'], ['chair', '🪑', 'air']],
    [['fish', '🐟', 'ish'], ['dish', '🍽️', 'ish']]
];
const RHYME_WORDS = RHYME_FAMILIES.flatMap((fam, family) => fam.map(([word, emoji, rime]) => ({ word, emoji, rime, family })));
const rhymeLabel = (w) => `${w.emoji} ${w.word}`;
/** One word from each of `n` different families, none of them `not`. */
const fromOtherFamilies = (rng, not, n) => shuffle(RHYME_FAMILIES.map((_, f) => f).filter((f) => !not.includes(f)), rng)
    .slice(0, n).map((f) => pickOne(rng, RHYME_WORDS.filter((w) => w.family === f)));
const rhymes = (rng, d) => {
    if (d >= 2 && rng() < 0.4) {
        // Odd one out: three that rhyme, one that does not.
        const f = pickOne(rng, RHYME_FAMILIES.map((_, i) => i).filter((i) => RHYME_FAMILIES[i].length >= 3));
        const three = shuffle(RHYME_WORDS.filter((w) => w.family === f), rng).slice(0, 3);
        const [odd] = fromOtherFamilies(rng, [f], 1);
        return {
            topic: 'Odd one out', prompt: 'Which word does NOT rhyme with the others?',
            options: [rhymeLabel(odd), ...three.map(rhymeLabel)], answer: 0,
            explain: `${three.map((w) => w.word).join(', ')} rhyme; ${odd.word} does not.`,
            facts: { kind: 'rhyme', mode: 'odd', words: [odd, ...three].map((w) => w.word) }
        };
    }
    // Rhymes with: the youngest only meet rhymes spelled alike.
    const partnersOf = (t) => RHYME_WORDS.filter((w) => w.family === t.family && w.word !== t.word && (d >= 2 || w.rime === t.rime));
    const target = pickOne(rng, RHYME_WORDS.filter((w) => partnersOf(w).length));
    const right = pickOne(rng, partnersOf(target));
    const wrong = fromOtherFamilies(rng, [target.family], 3);
    return {
        topic: 'Rhymes', prompt: `Which word rhymes with “${target.word}”?`, visual: { kind: 'symbols', items: [target.emoji] },
        options: [rhymeLabel(right), ...wrong.map(rhymeLabel)], answer: 0, explain: `${target.word} and ${right.word} rhyme.`,
        facts: { kind: 'rhyme', mode: 'with', target: target.word, words: [right, ...wrong].map((w) => w.word) }
    };
};
const familyOf = (word) => RHYME_WORDS.find((w) => w.word === word)?.family ?? null;

/* ─────────────────────────────── Number Hop (young) ─────────────────────────────── */

/** `d` 1: numbers to 20 (add, take away, one after or before, count by 2s); 2–3: to 100, tens and skip counting. */
const numberHop = (rng, d) => {
    const max = d <= 1 ? 20 : 100;
    const modes = d <= 1 ? ['add', 'sub', 'after', 'before', 'skip2'] : ['add', 'sub', 'tens', 'skip', 'skip2'];
    const mode = pickOne(rng, modes);
    let a; let b = null; let step = null; let answer; let prompt; let explain;
    if (mode === 'add') {
        b = int(rng, 1, d <= 1 ? 9 : 9 + 5 * d);
        a = int(rng, 0, max - b);
        answer = a + b; prompt = `The frog is on ${a}. It hops ${b} forward. Where does it land?`; explain = `${a} + ${b} = ${answer}.`;
    } else if (mode === 'sub') {
        b = int(rng, 1, d <= 1 ? 9 : 9 + 5 * d);
        a = int(rng, b, max);
        answer = a - b; prompt = `The frog is on ${a}. It hops ${b} back. Where does it land?`; explain = `${a} − ${b} = ${answer}.`;
    } else if (mode === 'after' || mode === 'before') {
        a = mode === 'after' ? int(rng, 0, max - 1) : int(rng, 1, max);
        answer = mode === 'after' ? a + 1 : a - 1;
        prompt = `Hop to the number just ${mode} ${a}.`; explain = `Just ${mode} ${a} comes ${answer}.`;
    } else if (mode === 'tens') {
        const hops = int(rng, 1, 4);
        b = 10 * hops; a = int(rng, 1, max - b); step = 10;
        answer = a + b; prompt = `The frog is on ${a}. It makes ${hops} jump${hops === 1 ? '' : 's'} of 10. Where does it land?`; explain = `${a} + ${b} = ${answer}.`;
    } else {
        step = mode === 'skip2' ? 2 : pickOne(rng, d === 2 ? [2, 5, 10] : [3, 4, 5, 6, 10]);
        const hops = int(rng, 2, 4);
        b = hops;
        a = step * int(rng, 0, Math.floor((max - step * hops) / step));
        answer = a + step * hops;
        prompt = `Start at ${a}. Count on in ${step}s — make ${hops} hops. Where do you land?`;
        explain = `${[...Array(hops + 1).keys()].map((i) => a + step * i).join(', ')}.`;
    }
    const pool = [answer + 1, answer - 1, answer + 2, answer - 2, ...(step ? [answer + step, answer - step] : []), ...(b ? [answer + b, answer - b, a] : [])];
    return {
        topic: 'Number hop', prompt, visual: { kind: 'symbols', items: ['🐸'] },
        options: [answer, ...numberWrongs(rng, answer, pool, (v) => v >= 0 && v <= max)].map(String), answer: 0, explain,
        facts: { kind: 'hop', mode, a, b, step, max }
    };
};

/* ─────────────────────────────── Missing Number Race (young) ─────────────────────────────── */

/** A train of five numbers counting on (or back) in one step, with one car missing (never the first two). */
const missingNumber = (rng, d) => {
    const steps = d <= 1 ? [1, 1, 2, -1] : d === 2 ? [2, 5, 10, -2, -5, -10, 3] : [3, 4, 6, 25, -3, -4, -10];
    const max = d <= 1 ? 20 : 100;
    for (;;) {
        const step = pickOne(rng, steps);
        const span = Math.abs(step) * 4;
        if (span > max) continue;
        let start = step > 0 ? int(rng, 0, max - span) : int(rng, span, max);
        if ([5, 10, 25].includes(Math.abs(step))) start -= start % Math.abs(step);
        const seq = Array.from({ length: 5 }, (_, i) => start + step * i);
        if (seq.some((v) => v < 0 || v > max)) continue;
        const gap = int(rng, 2, 4);
        const answer = seq[gap];
        const shown = seq.map((v, i) => (i === gap ? '?' : String(v)));
        const pool = [answer + 1, answer - 1, answer + 2, answer - 2, answer + 10, answer - 10, answer + step * 2, answer - step * 2];
        return {
            topic: 'Number train', prompt: `Which number is missing? ${shown.join(', ')}`,
            options: [answer, ...numberWrongs(rng, answer, pool, (v) => v >= 0 && v <= max && !seq.includes(v))].map(String), answer: 0,
            explain: step > 0 ? `Count on in ${step}s: ${seq.join(', ')}.` : `Count back in ${-step}s: ${seq.join(', ')}.`,
            facts: { kind: 'train', seq: shown }
        };
    }
};

/* ─────────────────────────────── Analogy Master (smart) ─────────────────────────────── */

// 'A|B|C|D|relation|wrong1,wrong2,wrong3': A is to B as C is to D. No wrong word stands to C as B to A.
const RELATION = { synonym: 'Same meaning', antonym: 'Opposites', part: 'Part → whole', tool: 'Tool → user', cause: 'Cause → effect', degree: 'Stronger degree', category: 'Kind → group', purpose: 'Object → job' };
const ANALOGIES_EASY = [
    'happy|glad|big|large|synonym|small,tiny,tall', 'quick|fast|angry|mad|synonym|calm,cheerful,sad', 'shout|yell|whisper|murmur|synonym|scream,sing,listen',
    'brave|courageous|clever|intelligent|synonym|foolish,careful,quiet', 'tired|sleepy|ill|sick|synonym|healthy,strong,hungry', 'begin|start|finish|end|synonym|open,early,first',
    'hot|cold|up|down|antonym|above,high,top', 'day|night|early|late|antonym|soon,morning,first', 'full|empty|rich|poor|antonym|wealthy,money,happy',
    'push|pull|give|take|antonym|send,share,offer', 'wide|narrow|deep|shallow|antonym|low,water,long', 'victory|defeat|success|failure|antonym|win,prize,effort',
    'page|book|petal|flower|part|garden,bee,colour', 'wheel|car|wing|bird|part|fly,feather,nest', 'finger|hand|toe|foot|part|shoe,sock,walk',
    'key|keyboard|string|guitar|part|music,drum,song', 'room|house|classroom|school|part|teacher,desk,lesson', 'brick|wall|link|chain|part|metal,rope,lock',
    'stethoscope|doctor|brush|painter|tool|canvas,colour,wall', 'scissors|barber|needle|tailor|tool|thread,cloth,button', 'spade|gardener|chalk|teacher|tool|board,lesson,school',
    'hammer|carpenter|camera|photographer|tool|photo,lens,film', 'ladle|cook|whistle|referee|tool|football,goal,crowd', 'wand|magician|baton|conductor|tool|music,orchestra,drum',
    'rain|flood|fire|smoke|cause|water,match,wood', 'cut|bleeding|joke|laughter|cause|funny,comedian,story', 'exercise|fitness|study|knowledge|cause|school,book,exam',
    'heat|melting|cold|freezing|cause|warm,winter,wind', 'carelessness|mistake|practice|improvement|cause|lazy,teacher,game',
    'warm|hot|cool|cold|degree|mild,wet,wind', 'big|huge|small|tiny|degree|large,thin,short', 'like|love|dislike|hate|degree|enjoy,like,angry',
    'tired|exhausted|hungry|starving|degree|thirsty,full,food', 'damp|soaked|breeze|gale|degree|calm,sunny,rain',
    'rose|flower|oak|tree|category|leaf,wood,acorn', 'mango|fruit|cobra|snake|category|poison,bite,mongoose', 'sparrow|bird|salmon|fish|category|river,swim,pink',
    'hockey|sport|Mars|planet|category|red,space,rocket', 'sitar|instrument|cotton|fabric|category|white,field,shirt',
    'pen|write|knife|cut|purpose|sharp,fork,kitchen', 'eye|see|ear|hear|purpose|sound,nose,loud', 'broom|sweep|soap|wash|purpose|bubble,water,towel',
    'chair|sit|bed|sleep|purpose|pillow,night,room', 'key|unlock|phone|call|purpose|battery,number,screen', 'oven|bake|fridge|chill|purpose|kitchen,door,milk'
];
const ANALOGIES_HARD = [
    'benevolent|kind|candid|frank|synonym|secretive,cruel,quiet', 'abundant|plentiful|scarce|rare|synonym|many,common,cheap',
    'diligent|hardworking|frugal|thrifty|synonym|wasteful,wealthy,generous', 'obstinate|stubborn|lucid|clear|synonym|confused,liquid,dark',
    'ominous|threatening|tranquil|peaceful|synonym|noisy,sleepy,stormy',
    'verbose|concise|transparent|opaque|antonym|clear,glass,bright', 'ally|adversary|expand|contract|antonym|grow,stretch,swell',
    'ascend|descend|humble|arrogant|antonym|modest,poor,simple', 'generous|stingy|frequent|rare|antonym|often,regular,usual',
    'permanent|temporary|novice|expert|antonym|beginner,student,learner',
    'stanza|poem|scene|play|part|actor,stage,audience', 'piston|engine|lens|camera|part|photograph,picture,light',
    'atom|molecule|cell|tissue|part|nucleus,microscope,virus', 'note|melody|letter|alphabet|part|write,vowel,post', 'island|archipelago|star|galaxy|part|planet,sun,telescope',
    'scalpel|surgeon|chisel|sculptor|tool|marble,statue,carve', 'telescope|astronomer|microscope|biologist|tool|lens,cell,laboratory',
    'loom|weaver|anvil|blacksmith|tool|iron,horseshoe,metal', 'quill|scribe|lasso|cowboy|tool|rope,horse,ranch', 'pickaxe|miner|harpoon|whaler|tool|whale,ocean,ship',
    'drought|famine|deforestation|erosion|cause|trees,rainfall,forest', 'friction|heat|vaccination|immunity|cause|injection,doctor,disease',
    'pollution|smog|overeating|obesity|cause|hunger,diet,food', 'insomnia|drowsiness|flattery|vanity|cause|praise,honesty,insult',
    'earthquake|tsunami|negligence|accident|cause|careful,driver,hospital',
    'annoyed|furious|content|ecstatic|degree|sad,satisfied,calm', 'chilly|frigid|warm|scorching|degree|tepid,cool,cold',
    'drizzle|downpour|breeze|hurricane|degree|wind,calm,rain', 'sip|gulp|nibble|devour|degree|taste,chew,snack', 'dislike|loathe|like|adore|degree|hate,enjoy,ignore',
    'whale|mammal|frog|amphibian|category|pond,tadpole,reptile', 'granite|rock|copper|metal|category|coin,wire,mine',
    'tornado|storm|sonnet|poem|category|rhyme,poet,line', 'oxygen|element|salt|compound|category|sea,crystal,food', 'oboe|woodwind|violin|strings|category|bow,orchestra,cello',
    'thermometer|temperature|barometer|pressure|purpose|weather,rain,altitude', 'microscope|magnify|scale|weigh|purpose|heavy,balance,kitchen',
    'anaesthetic|numb|brake|slow|purpose|car,fast,pedal', 'sieve|strain|funnel|pour|purpose|liquid,narrow,kitchen', 'compass|navigate|ruler|measure|purpose|straight,line,school'
];
const parseAnalogy = (line) => { const [a, b, c, dd, rel, wrong] = line.split('|'); return { a, b, c, d: dd, rel, wrong: wrong.split(',') }; };
const ANALOGIES = { easy: ANALOGIES_EASY.map(parseAnalogy), hard: ANALOGIES_HARD.map(parseAnalogy) };
const analogies = (rng, d) => {
    const pool = d <= 1 ? ANALOGIES.easy : d === 2 ? (rng() < 0.7 ? ANALOGIES.easy : ANALOGIES.hard) : ANALOGIES.hard;
    const it = pickOne(rng, pool);
    return {
        topic: RELATION[it.rel], prompt: `${it.a} is to ${it.b} as ${it.c} is to …?`,
        options: [it.d, ...it.wrong], answer: 0, explain: `${RELATION[it.rel]}: ${it.a} → ${it.b}, so ${it.c} → ${it.d}.`,
        facts: { kind: 'analogy', a: it.a, c: it.c, d: it.d }
    };
};

/* ─────────────────────────────── Equation Rush (smart) ─────────────────────────────── */

// An equation is built forwards from its answer: x, then a chain of operations, so every answer is a whole number
// and every division exact. Trees: { t: 'x' } | { t: 'num', v } | { t: 'add'|'mul'|'div', k, e } | { t: 'xside', c, d }.
const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a || 1; };
const applyOp = (v, [type, k]) => (type === 'add' ? v + k : type === 'mul' ? v * k : v % k === 0 ? v / k : null);
const chainTree = (ops) => ops.reduce((e, [t, k]) => ({ t, k, e }), { t: 'x' });
const isTerm = (n) => n.t === 'x' || (n.t === 'mul' && n.e.t === 'x');
const treeText = (n) => {
    if (n.t === 'x') return 'x';
    if (n.t === 'num') return num(n.v);
    if (n.t === 'mul') return n.e.t === 'x' ? (n.k === -1 ? `${MINUS}x` : `${num(n.k)}x`) : `${num(n.k)}(${treeText(n.e)})`;
    if (n.t === 'add') return `${treeText(n.e)} ${n.k >= 0 ? '+' : MINUS} ${Math.abs(n.k)}`;
    if (n.t === 'div') return isTerm(n.e) ? `${treeText(n.e)}/${n.k}` : `(${treeText(n.e)})/${n.k}`;
    if (n.t === 'xside') return `${n.c === 1 ? '' : n.c === -1 ? MINUS : num(n.c)}x ${n.d >= 0 ? '+' : MINUS} ${Math.abs(n.d)}`;
    return '';
};
const EQ_KINDS = { 1: ['one', 'linear', 'linear', 'divadd'], 2: ['linear', 'divadd', 'bracket', 'bracketdiv'], 3: ['bracket', 'frac', 'bracketconst', 'both'] };
const equationRush = (rng, d) => {
    const neg = d >= 3;
    const signed = (lo, hi, allow) => (allow && rng() < 0.45 ? -1 : 1) * int(rng, lo, hi);
    for (;;) {
        const kind = pickOne(rng, EQ_KINDS[d] || EQ_KINDS[2]);
        const x = neg ? int(rng, -12, 15) : int(rng, 1, 12 + 4 * d);
        if (x === 0) continue;
        let left; let right; let wrongTries = [];
        if (kind === 'both') {
            // ax + b = cx + e, a − c a usable coefficient.
            const c = signed(2, 6, true); const diff = signed(2, 5, true); const a = c + diff;
            if ([0, 1, -1].includes(a)) continue;
            const b = signed(1, 15, true); const e = diff * x + b;
            if (Math.abs(e) > 80) continue;
            left = { t: 'add', k: b, e: { t: 'mul', k: a, e: { t: 'x' } } }; right = { t: 'xside', c, d: e };
            wrongTries = [(e - b) / a, (e + b) / diff, (e - b) / (a + c)];
        } else {
            const ops = {
                one: () => [pickOne(rng, [['add', int(rng, 2, 20)], ['add', -int(rng, 2, 15)], ['mul', int(rng, 2, 9)], ['div', int(rng, 2, 6)]])],
                linear: () => [['mul', signed(2, 9, neg)], ['add', signed(1, 20, neg || rng() < 0.4)]],
                divadd: () => [['div', int(rng, 2, 6)], ['add', signed(1, 15, neg || rng() < 0.4)]],
                bracket: () => [['add', signed(1, 9, neg || rng() < 0.4)], ['mul', signed(2, 6, neg)]],
                bracketdiv: () => [['add', signed(1, 12, neg || rng() < 0.4)], ['div', int(rng, 2, 5)]],
                frac: () => { const q = int(rng, 2, 5); let p = int(rng, 2, 7); while (gcd(p, q) !== 1) p += 1; return [['mul', neg && rng() < 0.3 ? -p : p], ['div', q], ['add', signed(1, 12, neg)]]; },
                bracketconst: () => [['add', signed(1, 9, neg)], ['mul', signed(2, 5, neg)], ['add', signed(1, 15, neg)]]
            }[kind]();
            let v = x; let ok = true;
            for (const op of ops) { v = applyOp(v, op); if (v === null || (!neg && v <= 0) || Math.abs(v) > 120) { ok = false; break; } }
            if (!ok) continue;
            left = chainTree(ops); right = { t: 'num', v };
            // Tempting slips: undoing in the wrong order, or doing an operation again instead of undoing it.
            const undo = (val, [t, k]) => (t === 'add' ? val - k : t === 'mul' ? val / k : val * k);
            const redo = (val, [t, k]) => (t === 'add' ? val + k : t === 'mul' ? val * k : val / k);
            wrongTries = [ops.reduce(undo, v), [...ops].reverse().reduce(redo, v), undo(v, ops[ops.length - 1])];
        }
        const pool = [...wrongTries, x + 1, x - 1, -x, x + 2, x - 2];
        const options = [x, ...numberWrongs(rng, x, pool, (w) => neg || w > 0)];
        return {
            topic: 'Solve for x', prompt: `Solve for x: ${treeText(left)} = ${treeText(right)}`,
            options: options.map(num), answer: 0, explain: `x = ${num(x)}: put it back in and both sides match.`,
            facts: { kind: 'equation', left, right }
        };
    }
};
/** The value of a tree at x (tests). */
const evalTree = (n, x) => {
    if (n.t === 'x') return x;
    if (n.t === 'num') return n.v;
    if (n.t === 'add') return evalTree(n.e, x) + n.k;
    if (n.t === 'mul') return evalTree(n.e, x) * n.k;
    if (n.t === 'div') return evalTree(n.e, x) / n.k;
    if (n.t === 'xside') return n.c * x + n.d;
    return NaN;
};

/* ─────────────────────────────── Ratio Relay (smart) ─────────────────────────────── */

const PART = [
    ['Paint is mixed blue to yellow', 'litres of blue', 'litres of yellow'], ['A juice is mixed concentrate to water', 'cups of concentrate', 'cups of water'],
    ['Mortar is mixed cement to sand', 'buckets of cement', 'buckets of sand'], ['A cake uses flour to sugar', 'spoons of flour', 'spoons of sugar'],
    ['A garden is planted roses to tulips', 'roses', 'tulips']
];
const GROUP = [['A club has boys to girls', 'boys', 'members'], ['A farm has hens to ducks', 'hens', 'birds'], ['A shelf has novels to comics', 'novels', 'books']];
const SHARE = [['marbles', 'Asha', 'Ben'], ['stickers', 'Ravi', 'Meera'], ['rupees', 'Kabir', 'Zoya'], ['cards', 'Neha', 'Arjun']];
const RATE = [['A printer prints', 'pages', 'seconds'], ['A tap fills', 'litres', 'minutes'], ['A cyclist rides', 'km', 'hours'], ['A machine packs', 'boxes', 'minutes']];
const PERCENTS = [10, 20, 25, 30, 40, 50, 60, 75, 80, 90, 120, 150];
/** The answer to a ratio leg (tests work it again from the same numbers). */
const ratioAnswer = ({ kind, a, b, q }) => ({
    part: (q * b) / a, total: (q * (a + b)) / a, share: (q * b) / (a + b), rate: (q * a) / b, scale: (q * b) / a, inverse: (a * q) / b, percent: (q * b) / 100
}[kind]);
const RATIO_KINDS = { 1: ['part', 'total', 'share'], 2: ['part', 'total', 'share', 'rate', 'scale'], 3: ['part', 'total', 'share', 'rate', 'scale', 'percent', 'inverse'] };
const ratioRelay = (rng, d) => {
    const R = 4 + d;
    for (;;) {
        const kind = pickOne(rng, RATIO_KINDS[d] || RATIO_KINDS[2]);
        const q = int(rng, 6, 24 + 18 * d);
        let a; let b;
        if (kind === 'percent') { a = 100; b = pickOne(rng, PERCENTS); } else {
            a = int(rng, 1, R); b = int(rng, 1, R);
            if (a === b || gcd(a, b) !== 1) continue;
        }
        const f = { kind, a, b, q };
        const answer = ratioAnswer(f);
        if (!Number.isInteger(answer) || answer < 2 || answer === q || answer > 400) continue;
        if (['rate', 'scale', 'inverse'].includes(kind) && b === 1) continue;
        if (kind === 'inverse' && a === 1) continue;
        let text;
        if (kind === 'part') { const [ctx, ua, ub] = pickOne(rng, PART); text = `${ctx} in the ratio ${a} : ${b}. With ${q} ${ua}, how many ${ub} are needed?`; }
        if (kind === 'total') { const [ctx, ua, all] = pickOne(rng, GROUP); text = `${ctx} in the ratio ${a} : ${b}. There are ${q} ${ua}. How many ${all} are there in all?`; }
        if (kind === 'share') { const [thing, p1, p2] = pickOne(rng, SHARE); text = `${q} ${thing} are shared between ${p1} and ${p2} in the ratio ${a} : ${b}. How many does ${p2} get?`; }
        if (kind === 'rate') { const [ctx, unit, per] = pickOne(rng, RATE); text = `${ctx} ${a} ${unit} every ${b} ${per}. How many ${unit} in ${q} ${per}?`; }
        if (kind === 'scale') text = `On a map, ${a} cm stands for ${b} km. A road is ${q} cm long on the map. How many km long is it?`;
        if (kind === 'inverse') text = `${a} workers paint a school in ${q} days. Working at the same rate, how many days would ${b} workers take?`;
        if (kind === 'percent') text = b > 100 ? `A shop had ${q} visitors on Monday. On Tuesday it had ${b}% of Monday’s number. How many visitors on Tuesday?` : `${b}% of the ${q} students in a year walk to school. How many walk?`;
        // Slips: the ratio the wrong way round, the whole instead of the part, the part instead of the whole.
        const slips = [(q * a) / b, (q * (a + b)) / b, (q * a) / (a + b), (q * b) / (a + b), (q * (a + b)) / a, q * a, q * b, answer + b, answer - a];
        return {
            topic: 'Ratio', prompt: text,
            options: [answer, ...numberWrongs(rng, answer, slips, (v) => v > 0)].map(String), answer: 0,
            explain: `Scale by the ratio ${a} : ${b} — the answer is ${answer}.`, facts: { kind: 'ratio', ...f }
        };
    }
};

/* ─────────────────────────────── Cipher Lab (master) ─────────────────────────────── */

const ABC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const code = (ch) => ch.charCodeAt(0) - 65;
const chr = (i) => ABC[((i % 26) + 26) % 26];
const isLetter = (ch) => ch >= 'A' && ch <= 'Z';
// Words to hide, by length (at least four of each length, so the wrong options are real words of the same length).
const CIPHER_WORDS = [
    'BRAIN', 'LOGIC', 'TIGER', 'OCEAN', 'PLANT', 'RIVER', 'STONE', 'CLOUD', 'LIGHT', 'MUSIC', 'ORBIT', 'PRISM', 'HONEY', 'SPARK', 'QUEST',
    'PLANET', 'GARDEN', 'ROCKET', 'BRIDGE', 'SILVER', 'FOREST', 'CASTLE', 'PUZZLE', 'MIRROR', 'ANCHOR', 'MARBLE', 'CIPHER', 'SECRET', 'LEGEND',
    'COMPASS', 'LIBRARY', 'MYSTERY', 'DIAMOND', 'THUNDER', 'HARVEST', 'JOURNEY', 'LANTERN', 'MACHINE', 'PICTURE', 'VOLCANO', 'BALANCE', 'KINGDOM'
];
const caesar = (text, k) => [...text].map((ch) => (isLetter(ch) ? chr(code(ch) + k) : ch)).join('');
const atbash = (text) => [...text].map((ch) => (isLetter(ch) ? chr(25 - code(ch)) : ch)).join('');
const substitute = (text, map) => [...text].map((ch) => (isLetter(ch) ? map[ch] || '?' : ch)).join('');
const cipherLab = (rng, d) => {
    const kind = pickOne(rng, d <= 1 ? ['caesar', 'caesar', 'atbash'] : d === 2 ? ['caesar', 'atbash', 'sub'] : ['caesar', 'atbash', 'sub', 'sub']);
    const plain = pickOne(rng, CIPHER_WORDS);
    const wrong = shuffle(CIPHER_WORDS.filter((w) => w.length === plain.length && w !== plain), rng).slice(0, 3);
    let cipher; let rule; let key;
    if (kind === 'caesar') {
        const k = int(rng, d <= 1 ? 1 : 2, d <= 1 ? 5 : 13);
        cipher = caesar(plain, k);
        rule = `Caesar cipher: every letter was moved ${k} place${k === 1 ? '' : 's'} forward in the alphabet (Z wraps round to A).`;
        key = { shift: k };
    } else if (kind === 'atbash') {
        cipher = atbash(plain);
        rule = 'Atbash cipher: the alphabet is flipped — A↔Z, B↔Y, C↔X, and so on.';
        key = {};
    } else {
        // A full random key with no letter left in place; the player is given the part of it this word uses.
        let perm;
        do perm = shuffle([...ABC], rng); while (perm.some((c, i) => c === ABC[i]));
        cipher = [...plain].map((ch) => perm[code(ch)]).join('');
        const decode = {};
        for (const ch of plain) decode[perm[code(ch)]] = ch;
        rule = `Substitution cipher. Key (code letter = real letter): ${Object.keys(decode).sort().map((c) => `${c}=${decode[c]}`).join(', ')}.`;
        key = { decode };
    }
    return {
        topic: { caesar: 'Caesar shift', atbash: 'Atbash', sub: 'Substitution' }[kind],
        prompt: `${rule} Decode ${cipher}.`, visual: { kind: 'digits', text: cipher },
        options: [plain, ...wrong], answer: 0, explain: `${cipher} decodes to ${plain}.`,
        facts: { kind: 'cipher', cipher: kind, key, text: cipher }
    };
};
/** Decode a cipher question's text from its facts (tests). */
const decodeCipher = (f) => (f.cipher === 'caesar' ? caesar(f.text, -f.key.shift) : f.cipher === 'atbash' ? atbash(f.text) : substitute(f.text, f.key.decode));

/* ─────────────────────────────── Probability Lab (master) ─────────────────────────────── */

const frac = (n, dd = 1) => { const s = dd < 0 ? -1 : 1; const g = gcd(n, dd); return { n: (s * n) / g, d: (s * dd) / g }; };
const fadd = (a, b) => frac(a.n * b.d + b.n * a.d, a.d * b.d);
const fsub = (a, b) => frac(a.n * b.d - b.n * a.d, a.d * b.d);
const fmul = (a, b) => frac(a.n * b.n, a.d * b.d);
const fdiv = (a, b) => frac(a.n * b.d, a.d * b.n);
const fmt = (a) => (a.d === 1 ? `${a.n}` : `${a.n}/${a.d}`);
const ONE = frac(1);
const comp = (a) => fsub(ONE, a);
const choose = (n, k) => { if (k < 0 || k > n) return 0; let r = 1; for (let i = 1; i <= k; i += 1) r = (r * (n - k + i)) / i; return Math.round(r); };
const COLOUR_KEYS = ['red', 'blue', 'gold', 'green'];
const marbles = (counts) => Object.entries(counts).flatMap(([c, k]) => Array(k).fill(c));
const total = (counts) => Object.values(counts).reduce((s, k) => s + k, 0);
const countsText = (counts) => Object.entries(counts).filter(([, k]) => k > 0).map(([c, k]) => `${k} ${c}`).join(', ');
const tuples = (values, k) => (k === 0 ? [[]] : tuples(values, k - 1).flatMap((t) => values.map((v) => [...t, v])));
const DIE = [1, 2, 3, 4, 5, 6];
const orderedDraws = (n, k) => { const out = []; const go = (pre) => { if (pre.length === k) { out.push(pre); return; } for (let i = 0; i < n; i += 1) if (!pre.includes(i)) go([...pre, i]); }; go([]); return out; };
const subsets = (n, r) => { const out = []; const go = (start, pre) => { if (pre.length === r) { out.push(pre); return; } for (let i = start; i < n; i += 1) go(i + 1, [...pre, i]); }; go(0, []); return out; };
// The equally likely outcomes of each experiment: a test counts them to work every answer out again.
const SPACE = {
    dice: (k) => tuples(DIE, k),
    coins: (k) => tuples(['H', 'T'], k),
    spinner: (sectors, k) => tuples(sectors, k),
    bag: (counts, k, replace) => { const list = marbles(counts); return replace ? tuples(list, k) : orderedDraws(list.length, k).map((ix) => ix.map((i) => list[i])); },
    committee: (names, r) => subsets(names.length, r).map((ix) => ix.map((i) => names[i]))
};
const sum = (o) => o.reduce((s, v) => s + v, 0);
const PEOPLE = ['Asha', 'Ben', 'Chen', 'Dev', 'Esha', 'Farah', 'Gopal', 'Hana'];
const spinnerSectors = (rng, n, colours) => {
    const counts = {}; let left = n;
    colours.forEach((c, i) => { const k = i === colours.length - 1 ? left : int(rng, 1, left - (colours.length - 1 - i)); counts[c] = k; left -= k; });
    return { counts, sectors: marbles(counts) };
};
const bagCounts = (rng, colours, lo, hi) => Object.fromEntries(colours.map((c) => [c, int(rng, lo, hi)]));
const PROB_EASY = [
    (rng) => { const k = int(rng, 2, 4); return { space: ['dice', 1], text: `Roll one die. P(a number greater than ${k})?`, judge: (o) => o[0] > k, exact: frac(6 - k, 6), explain: `${6 - k} of the 6 faces are above ${k}.` }; },
    (rng) => {
        const w = pickOne(rng, [
            { t: 'a prime number', f: (v) => [2, 3, 5].includes(v), c: 3, why: 'The primes are 2, 3 and 5' },
            { t: 'a multiple of 3', f: (v) => v % 3 === 0, c: 2, why: 'Only 3 and 6' },
            { t: 'NOT a multiple of 3', f: (v) => v % 3 !== 0, c: 4, why: '1 − P(3 or 6)' },
            { t: 'NOT a 6', f: (v) => v !== 6, c: 5, why: '1 − 1/6' }
        ]);
        return { space: ['dice', 1], text: `Roll one die. P(${w.t})?`, judge: (o) => w.f(o[0]), exact: frac(w.c, 6), explain: `${w.why}: ${fmt(frac(w.c, 6))}.` };
    },
    (rng) => {
        const n = int(rng, 6, 10);
        const [x, y, z] = shuffle(COLOUR_KEYS, rng);
        const { counts, sectors } = spinnerSectors(rng, n, [x, y, z]);
        const not = rng() < 0.5; const p = frac(counts[x], n);
        return { space: ['spinner', sectors, 1], text: `A spinner has ${n} equal sectors: ${countsText(counts)}. Spin once. P(it ${not ? 'does NOT land' : 'lands'} on ${x})?`, judge: (o) => (o[0] === x) !== not, exact: not ? comp(p) : p, explain: `${counts[x]} of ${n} sectors are ${x}.` };
    },
    (rng) => {
        const w = pickOne(rng, [
            () => { const s = int(rng, 4, 10); const c = 6 - Math.abs(s - 7); return { t: `the total is ${s}`, f: (o) => sum(o) === s, x: frac(c, 36), why: `${c} of the 36 ordered pairs add to ${s}` }; },
            () => ({ t: 'both dice are even', f: (o) => o.every((v) => v % 2 === 0), x: frac(1, 4), why: '1/2 × 1/2' }),
            () => ({ t: 'a double', f: (o) => o[0] === o[1], x: frac(6, 36), why: '6 doubles out of 36 pairs' }),
            () => ({ t: 'at least one six', f: (o) => o.includes(6), x: comp(frac(25, 36)), why: '1 − (5/6)²' })
        ])();
        return { space: ['dice', 2], text: `Roll two dice. P(${w.t})?`, judge: w.f, exact: w.x, explain: `${w.why} = ${fmt(w.x)}.` };
    },
    (rng) => {
        const [x, y] = shuffle(COLOUR_KEYS, rng);
        const counts = bagCounts(rng, [x, y], 2, 6); const n = total(counts);
        const p = frac(counts[x], n); const q = comp(p);
        const m = pickOne(rng, [
            { t: `both are ${x}`, f: (o) => o.every((c) => c === x), x: fmul(p, p) },
            { t: `neither is ${x}`, f: (o) => o.every((c) => c !== x), x: fmul(q, q) },
            { t: `at least one is ${x}`, f: (o) => o.includes(x), x: comp(fmul(q, q)) }
        ]);
        return { space: ['bag', counts, 2, true], text: `A bag holds ${countsText(counts)}. Draw one, put it back, draw again. P(${m.t})?`, judge: m.f, exact: m.x, explain: `Replaced, so the draws are independent: ${fmt(m.x)}.` };
    },
    (rng) => {
        const k = int(rng, 2, 4); const all = rng() < 0.5;
        return { space: ['coins', k], text: all ? `Toss ${k} coins. P(all tails)?` : `Toss ${k} coins. P(at least one head)?`, judge: all ? (o) => o.every((c) => c === 'T') : (o) => o.includes('H'), exact: all ? frac(1, 2 ** k) : comp(frac(1, 2 ** k)), explain: all ? `(1/2)^${k}.` : `1 − (1/2)^${k}.` };
    }
];
const PROB_HARD = [
    (rng) => {
        const [x, y] = shuffle(COLOUR_KEYS, rng);
        const counts = bagCounts(rng, [x, y], 2, 6); const n = total(counts); const cx = counts[x]; const cy = counts[y];
        const m = pickOne(rng, [
            { t: `both are ${x}`, f: (o) => o[0] === x && o[1] === x, x: frac(cx * (cx - 1), n * (n - 1)) },
            { t: `one ${x} and one ${y} (either order)`, f: (o) => o.includes(x) && o.includes(y), x: frac(2 * cx * cy, n * (n - 1)) },
            { t: `at least one ${x}`, f: (o) => o.includes(x), x: comp(frac(cy * (cy - 1), n * (n - 1))) }
        ]);
        return { space: ['bag', counts, 2, false], text: `A bag holds ${countsText(counts)}. Draw two without putting the first back. P(${m.t})?`, judge: m.f, exact: m.x, explain: `Without replacement the second draw has one fewer: ${fmt(m.x)}.` };
    },
    (rng) => {
        const [x, y] = shuffle(COLOUR_KEYS, rng);
        const counts = bagCounts(rng, [x, y], 2, 6); const n = total(counts); const cx = counts[x]; const cy = counts[y];
        const kind = pickOne(rng, ['second', 'first', 'bothGiven']);
        if (kind === 'second') return { space: ['bag', counts, 2, false], text: `Bag: ${countsText(counts)}. Two draws, no replacement. Given the first is ${x}, P(the second is ${x})?`, judge: (o) => (o[0] !== x ? null : o[1] === x), exact: frac(cx - 1, n - 1), explain: `${cx - 1} of the ${n - 1} left are ${x}.` };
        if (kind === 'first') return { space: ['bag', counts, 2, false], text: `Bag: ${countsText(counts)}. Two draws, no replacement. Given the SECOND is ${x}, P(the first was ${x})?`, judge: (o) => (o[1] !== x ? null : o[0] === x), exact: frac(cx - 1, n - 1), explain: `By symmetry, the same as the other way round: ${fmt(frac(cx - 1, n - 1))}.` };
        const both = frac(cx * (cx - 1), n * (n - 1)); const any = comp(frac(cy * (cy - 1), n * (n - 1)));
        return { space: ['bag', counts, 2, false], text: `Bag: ${countsText(counts)}. Two draws, no replacement. Given AT LEAST ONE is ${x}, P(both are ${x})?`, judge: (o) => (!o.includes(x) ? null : o[0] === x && o[1] === x), exact: fdiv(both, any), explain: `P(both) ÷ P(at least one) = ${fmt(fdiv(both, any))}.` };
    },
    (rng) => {
        const kind = pickOne(rng, ['firstK', 'sumT', 'even']);
        if (kind === 'firstK') {
            const k = int(rng, 2, 5); const s = int(rng, k + 3, k + 6); const c = Math.max(0, Math.min(6, 7 - (s - k)));
            return { space: ['dice', 2], text: `Two dice. Given the first shows ${k}, P(the total is at least ${s})?`, judge: (o) => (o[0] !== k ? null : sum(o) >= s), exact: frac(c, 6), explain: `The second die needs ${s - k} or more: ${fmt(frac(c, 6))}.` };
        }
        if (kind === 'sumT') {
            const t = int(rng, 8, 10); const ways = 13 - t;
            return { space: ['dice', 2], text: `Two dice. Given the total is ${t}, P(at least one die shows 6)?`, judge: (o) => (sum(o) !== t ? null : o.includes(6)), exact: frac(2, ways), explain: `${ways} ordered pairs make ${t}; two contain a six.` };
        }
        return { space: ['dice', 2], text: 'Two dice. Given at least one is even, P(both are even)?', judge: (o) => (!o.some((v) => v % 2 === 0) ? null : o.every((v) => v % 2 === 0)), exact: frac(1, 3), explain: '9 of the 27 pairs with an even die are both even.' };
    },
    (rng) => {
        const n = int(rng, 3, 5); const k = int(rng, 1, n - 1);
        return { space: ['coins', n], text: `Toss ${n} coins. P(exactly ${k} head${k === 1 ? '' : 's'})?`, judge: (o) => o.filter((c) => c === 'H').length === k, exact: frac(choose(n, k), 2 ** n), explain: `C(${n},${k}) = ${choose(n, k)} ways out of ${2 ** n}.` };
    },
    (rng) => {
        const n = int(rng, 5, 8); const r = int(rng, 2, Math.min(4, n - 2)); const names = PEOPLE.slice(0, n); const all = choose(n, r);
        const m = pickOne(rng, [
            { t: 'Asha and Ben are both picked', f: (o) => o.includes('Asha') && o.includes('Ben'), c: choose(n - 2, r - 2) },
            { t: 'Asha is picked', f: (o) => o.includes('Asha'), c: choose(n - 1, r - 1) },
            { t: 'neither Asha nor Ben is picked', f: (o) => !o.includes('Asha') && !o.includes('Ben'), c: choose(n - 2, r) }
        ]);
        return { space: ['committee', names, r], text: `A team of ${r} is chosen at random from ${n} people (${names.join(', ')}). P(${m.t})?`, judge: m.f, exact: frac(m.c, all), explain: `${m.c} of the C(${n},${r}) = ${all} teams: ${fmt(frac(m.c, all))}.` };
    }
];
const probability = (rng, d) => {
    const pool = d <= 1 ? PROB_EASY : d === 2 ? [...PROB_EASY, ...PROB_HARD] : PROB_HARD;
    const t = pickOne(rng, pool)(rng);
    const x = t.exact;
    // Near misses: the complement, one off top or bottom, the "with replacement" square, half and double.
    const near = [comp(x), frac(x.n + 1, x.d), frac(Math.max(1, x.n - 1), x.d), frac(x.n, x.d + 1), frac(x.n, Math.max(1, x.d - 1)), fmul(x, x), frac(x.n, 2 * x.d), frac(2 * x.n, x.d), frac(x.n + 1, x.d + 1)];
    const seen = new Set([fmt(x)]); const wrong = [];
    for (const f of shuffle(near, rng)) {
        if (f.n <= 0 || f.n > f.d || seen.has(fmt(f)) || wrong.length >= 3) continue;
        seen.add(fmt(f)); wrong.push(fmt(f));
    }
    for (let k = 2; wrong.length < 3; k += 1) { const f = frac(1, x.d * k); if (!seen.has(fmt(f))) { seen.add(fmt(f)); wrong.push(fmt(f)); } }
    return {
        topic: 'Probability', prompt: t.text, options: [fmt(x), ...wrong], answer: 0, explain: t.explain,
        facts: { kind: 'probability', space: t.space, judge: t.judge }
    };
};
/** The equally likely outcomes of a probability question's experiment (tests). */
const spaceOf = ([kind, ...args]) => SPACE[kind](...args);

/* ─────────────────────────────── Quantitative Arena (master) ─────────────────────────────── */

const QC = ['Quantity A is greater', 'Quantity B is greater', 'The two quantities are equal', 'The relationship cannot be determined'];
const QC_ID = ['A', 'B', 'equal', 'cannot'];
const REALS = [-100, -10, -5, -3, -2, -1.5, -1, -0.9, -0.5, -1 / 3, -0.1, 0, 0.1, 1 / 3, 0.5, 0.9, 1, 1.5, 2, 3, 5, 10, 100];
const INTS = [-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6];
const assignments = (vars, values, cond) => {
    let out = [{}];
    for (const v of vars) out = out.flatMap((o) => values.map((x) => ({ ...o, [v]: x })));
    return out.filter(cond);
};
/** 'A' | 'B' | 'equal' | 'cannot' over every sampled value (null: none). */
const decideBySampling = (samples, fa, fb) => {
    const seen = new Set();
    for (const s of samples) {
        const a = fa(s); const b = fb(s);
        if (!Number.isFinite(a) || !Number.isFinite(b)) continue;
        seen.add(Math.abs(a - b) < 1e-9 * Math.max(1, Math.abs(a), Math.abs(b)) ? 'equal' : a > b ? 'A' : 'B');
    }
    if (seen.size === 1) return [...seen][0];
    return seen.size === 0 ? null : 'cannot';
};
// Each case: [condition, test, textbook answer]. The answer given is the sampled one; a test checks both agree.
const VAR_TEMPLATES = [
    { tier: 1, vars: ['x'], a: 'x²', b: 'x', fa: (s) => s.x * s.x, fb: (s) => s.x, cases: [['x > 1', (s) => s.x > 1, 'A'], ['0 < x < 1', (s) => s.x > 0 && s.x < 1, 'B'], ['x > 0', (s) => s.x > 0, 'cannot'], ['x < 0', (s) => s.x < 0, 'A']] },
    { tier: 1, vars: ['x', 'y'], a: 'x − y', b: 'y − x', fa: (s) => s.x - s.y, fb: (s) => s.y - s.x, cases: [['x > y', (s) => s.x > s.y, 'A'], ['x < y', (s) => s.x < s.y, 'B'], ['x and y are real numbers', () => true, 'cannot']] },
    { tier: 1, vars: ['x'], a: '√x', b: 'x', fa: (s) => Math.sqrt(s.x), fb: (s) => s.x, cases: [['0 < x < 1', (s) => s.x > 0 && s.x < 1, 'A'], ['x > 1', (s) => s.x > 1, 'B'], ['x ≥ 0', (s) => s.x >= 0, 'cannot']] },
    { tier: 2, vars: ['x'], a: 'x³', b: 'x²', fa: (s) => s.x ** 3, fb: (s) => s.x * s.x, cases: [['x < 0', (s) => s.x < 0, 'B'], ['x > 1', (s) => s.x > 1, 'A'], ['0 < x < 1', (s) => s.x > 0 && s.x < 1, 'B'], ['x ≠ 0', (s) => s.x !== 0, 'cannot']] },
    { tier: 2, vars: ['a', 'b'], a: '(a + b)²', b: 'a² + b²', fa: (s) => (s.a + s.b) ** 2, fb: (s) => s.a * s.a + s.b * s.b, cases: [['a > 0 and b > 0', (s) => s.a > 0 && s.b > 0, 'A'], ['ab < 0', (s) => s.a * s.b < 0, 'B'], ['a and b are not zero', (s) => s.a !== 0 && s.b !== 0, 'cannot']] },
    { tier: 2, vars: ['x'], a: '1/x', b: 'x', fa: (s) => 1 / s.x, fb: (s) => s.x, cases: [['x > 1', (s) => s.x > 1, 'B'], ['0 < x < 1', (s) => s.x > 0 && s.x < 1, 'A'], ['x < −1', (s) => s.x < -1, 'A'], ['−1 < x < 0', (s) => s.x > -1 && s.x < 0, 'B'], ['x > 0', (s) => s.x > 0, 'cannot']] },
    { tier: 2, vars: ['x', 'y'], a: 'x / y', b: 'y / x', fa: (s) => s.x / s.y, fb: (s) => s.y / s.x, cases: [['x > y > 0', (s) => s.x > s.y && s.y > 0, 'A'], ['y > x > 0', (s) => s.y > s.x && s.x > 0, 'B'], ['x > 0 and y > 0', (s) => s.x > 0 && s.y > 0, 'cannot']] },
    { tier: 3, vars: ['a', 'b'], a: '√(a + b)', b: '√a + √b', fa: (s) => Math.sqrt(s.a + s.b), fb: (s) => Math.sqrt(s.a) + Math.sqrt(s.b), cases: [['a > 0 and b > 0', (s) => s.a > 0 && s.b > 0, 'B'], ['a ≥ 0 and b ≥ 0', (s) => s.a >= 0 && s.b >= 0, 'cannot']] },
    { tier: 3, vars: ['x', 'y'], a: '|x + y|', b: '|x| + |y|', fa: (s) => Math.abs(s.x + s.y), fb: (s) => Math.abs(s.x) + Math.abs(s.y), cases: [['xy > 0', (s) => s.x * s.y > 0, 'equal'], ['xy < 0', (s) => s.x * s.y < 0, 'B'], ['x and y are real numbers', () => true, 'cannot']] },
    { tier: 3, vars: ['n'], ints: true, a: '(−1)²ⁿ', b: '1', fa: (s) => (-1) ** (2 * s.n), fb: () => 1, cases: [['n is an integer', () => true, 'equal']] },
    { tier: 3, vars: ['n'], ints: true, a: 'n² + n', b: '0', fa: (s) => s.n * s.n + s.n, fb: () => 0, cases: [['n is an integer', () => true, 'cannot'], ['n is a positive integer', (s) => s.n > 0, 'A']] },
    { tier: 3, vars: ['n'], ints: true, a: '(−1)ⁿ', b: '0', fa: (s) => (-1) ** s.n, fb: () => 0, cases: [['n is an integer', () => true, 'cannot'], ['n is an odd integer', (s) => Math.abs(s.n % 2) === 1, 'B']] }
];
const cmpFrac = (p1, q1, p2, q2) => Math.sign(p1 * q2 - p2 * q1);
const rel = (sign) => (sign > 0 ? 'A' : sign < 0 ? 'B' : 'equal');
// Fixed numbers, compared exactly. `check`: the two values (or a range for 'cannot') for a test to compare again.
const NUM_TEMPLATES = [
    { tier: 1, gen: (rng) => {
        const q = pickOne(rng, [3, 6, 7, 9, 11, 12, 13]); const p = int(rng, 1, q - 1);
        const dec = Math.round((p * 100) / q) + pickOne(rng, [-1, 0, 0, 1]);
        return { cond: 'No condition', a: `${p}/${q}`, b: (dec / 100).toFixed(2), answer: rel(cmpFrac(p, q, dec, 100)), why: `${p}/${q} = ${(p / q).toFixed(4)}…`, check: [p / q, dec / 100] };
    } },
    { tier: 1, gen: (rng) => {
        const p = int(rng, 2, 9) * 5; const q = int(rng, 2, 19) * 10;
        if (rng() < 0.5) return { cond: 'No condition', a: `${p}% of ${q}`, b: `${q}% of ${p}`, answer: 'equal', why: `Both are ${(p * q) / 100}.`, check: [p * q, q * p] };
        const r = p + pickOne(rng, [-5, 5]); const s = q + pickOne(rng, [-10, 10]);
        return { cond: 'No condition', a: `${p}% of ${q}`, b: `${r}% of ${s}`, answer: rel(Math.sign(p * q - r * s)), why: `A = ${(p * q) / 100}, B = ${(r * s) / 100}.`, check: [p * q, r * s] };
    } },
    { tier: 1, gen: (rng) => {
        const k = int(rng, 3, 9);
        return rng() < 0.5
            ? { cond: `k = ${k}`, a: '2^(k+1)', b: '2^k + 2^k', answer: 'equal', why: '2^k + 2^k = 2·2^k = 2^(k+1).', check: [2 ** (k + 1), 2 ** k + 2 ** k] }
            : { cond: `k = ${k}`, a: '3^k + 3^k', b: '3^(k+1)', answer: 'B', why: '3^k + 3^k = 2·3^k, but 3^(k+1) = 3·3^k.', check: [3 ** k + 3 ** k, 3 ** (k + 1)] };
    } },
    { tier: 1, gen: (rng) => {
        const r = pickOne(rng, [1, 1.5, 2, 3, 4, 5]);
        return { cond: `A circle has radius ${r}`, a: 'Its circumference', b: 'Its area', answer: rel(Math.sign(2 * r - r * r)), why: `Circumference 2πr = ${2 * r}π, area πr² = ${r * r}π.`, check: [2 * r, r * r] };
    } },
    { tier: 2, gen: (rng) => {
        const P = int(rng, 2, 9) * 1000; const r = pickOne(rng, [5, 8, 10, 12, 15]); const n = pickOne(rng, [2, 3]);
        const compound = P * ((1 + r / 100) ** n) - P;
        return { cond: `₹${P} invested at ${r}% a year for ${n} years`, a: 'Interest, compounded yearly', b: 'Simple interest', answer: 'A', why: `Compound ₹${Math.round(compound * 100) / 100} against simple ₹${(P * r * n) / 100}.`, check: [compound, (P * r * n) / 100] };
    } },
    { tier: 2, gen: (rng) => {
        const m = int(rng, 3, 30); const n = m + int(rng, 4, 9);
        const avg = (m + n) / 2; const median = (m + n) / 2;
        if (rng() < 0.5) return { cond: `The integers from ${m} to ${n}`, a: 'Their average', b: 'Their median', answer: 'equal', why: `Evenly spaced: both are ${avg}.`, check: [avg, median] };
        const other = Math.floor((m + n) / 2) + 1;
        return { cond: `The integers from ${m} to ${n}`, a: 'Their average', b: `${other}`, answer: rel(cmpFrac(m + n, 2, other, 1)), why: `The average is (${m} + ${n})/2 = ${avg}.`, check: [avg, other] };
    } },
    { tier: 3, gen: (rng) => {
        const a = int(rng, 3, 9); const b = int(rng, 3, 9); const lo = Math.abs(a - b); const hi = a + b;
        if (rng() < 0.5) return { cond: `A triangle has sides ${a}, ${b} and c`, a: 'c', b: `${hi}`, answer: 'B', why: `c < ${a} + ${b} = ${hi}.`, range: [lo, hi, hi] };
        const m = int(rng, lo + 1, hi - 1);
        return { cond: `A triangle has sides ${a}, ${b} and c`, a: 'c', b: `${m}`, answer: 'cannot', why: `c can be anything strictly between ${lo} and ${hi}.`, range: [lo, hi, m] };
    } }
];
const pickTier = (rng, list, max) => { const top = list.filter((x) => x.tier === max); const all = list.filter((x) => x.tier <= max); return rng() < 0.6 && top.length ? pickOne(rng, top) : pickOne(rng, all); };
const quantArena = (rng, d) => {
    const tier = Math.max(1, Math.min(3, d));
    let r;
    if (rng() < 0.6) {
        const t = pickTier(rng, VAR_TEMPLATES, tier);
        const ci = int(rng, 0, t.cases.length - 1);
        const [cond, test, expect] = t.cases[ci];
        const answer = decideBySampling(assignments(t.vars, t.ints ? INTS : REALS, test), t.fa, t.fb);
        r = { cond, a: t.a, b: t.b, answer, why: { A: 'For every value the condition allows, A is larger.', B: 'For every value the condition allows, B is larger.', equal: 'The two are the same for every allowed value.', cannot: 'Some allowed values make A larger and others do not — try a fraction, a negative, a large number.' }[answer], facts: { kind: 'qc', template: VAR_TEMPLATES.indexOf(t), caseIndex: ci, expect } };
    } else {
        const t = pickTier(rng, NUM_TEMPLATES, tier);
        const g = t.gen(rng);
        r = { ...g, facts: { kind: 'qc-num', check: g.check || null, range: g.range || null } };
    }
    return {
        topic: 'Quantitative comparison',
        prompt: 'Compare Quantity A with Quantity B.',
        code: `${r.cond === 'No condition' ? '' : `Given:       ${r.cond}\n`}Quantity A:  ${r.a}\nQuantity B:  ${r.b}`,
        options: [...QC], answer: QC_ID.indexOf(r.answer), fixedOrder: true, explain: r.why, facts: r.facts
    };
};

/* ─────────────────────────────── Decision Theory Arena (master) ─────────────────────────────── */

const ACTION_SETS = [
    ['Expand the factory', 'Run a small pilot', 'Hold cash', 'Sell the unit'], ['Launch now', 'Launch in one city', 'Wait a quarter', 'License the idea'],
    ['Buy growth stocks', 'Buy bonds', 'Keep it in savings', 'Back a start-up'], ['Open a new store', 'Renovate the old one', 'Go online only', 'Partner with a chain']
];
const STATE_SETS = [['Boom', 'Steady', 'Slump'], ['High demand', 'Medium demand', 'Low demand'], ['Rival enters', 'Market flat', 'Rival quits']];
const TREE_ACTIONS = [['Launch the app', 'Run a pilot first', 'Sell the idea'], ['Bid for the contract', 'Subcontract the work', 'Stay out'], ['Build a prototype', 'Buy a licence', 'Fund a study'], ['Enter the export market', 'Grow at home', 'Join a partner']];
const OUTCOMES = [['Success', 'Failure', 'Partial'], ['Strong sales', 'Weak sales', 'Flat sales'], ['Approved', 'Rejected', 'Delayed']];
/** Probabilities (whole %) in steps of `step`, summing to 100, each at least `step`. */
const probs = (rng, k, step) => {
    for (;;) {
        const cuts = Array.from({ length: k - 1 }, () => int(rng, 1, 100 / step - 1) * step).sort((a, b) => a - b);
        const ps = [...cuts, 100].map((c, i) => c - (i ? cuts[i - 1] : 0));
        if (ps.every((p) => p >= step)) return ps;
    }
};
const ret = (rng, lo = -40, hi = 60) => int(rng, lo / 5, hi / 5) * 5;
const pct = (v) => (v > 0 ? `+${v}%` : v < 0 ? `${MINUS}${-v}%` : '0%');
/** Expected return (in hundredths of a %, exact) of a list of [p%, return%]. */
const evOf = (branches) => branches.reduce((s, [p, v]) => s + p * v, 0);
/** Index of the one best value if it beats the next by at least `gap`, else −1. */
const uniqueBest = (vals, gap) => {
    const order = vals.map((_, i) => i).sort((a, b) => vals[b] - vals[a]);
    return vals[order[0]] - vals[order[1]] >= gap ? order[0] : -1;
};
const decisions = (rng, d) => {
    const kind = pickOne(rng, d <= 1 ? ['matrix', 'tree'] : d === 2 ? ['matrix', 'tree', 'tree'] : ['matrix', 'tree', 'cautious']);
    const step = d >= 3 ? 5 : 10;
    for (;;) {
        if (kind === 'tree') {
            const actions = pickOne(rng, TREE_ACTIONS);
            const outs = pickOne(rng, OUTCOMES);
            // Each plan: a sure return, or a gamble with 2–3 outcomes.
            const plans = actions.map(() => {
                if (rng() < 0.3) return [[100, ret(rng, -5, 20)]];
                const ps = probs(rng, rng() < 0.5 || d <= 1 ? 2 : 3, step);
                return ps.map((p) => [p, ret(rng)]);
            });
            const evs = plans.map(evOf);
            const best = uniqueBest(evs, 100);
            if (best < 0) continue;
            const lines = actions.map((a, i) => `${a}: ${plans[i].length === 1 ? `a sure ${pct(plans[i][0][1])}` : plans[i].map(([p, v], j) => `${p}% ${outs[j]} → ${pct(v)}`).join(', ')}`);
            return {
                topic: 'Expected value', prompt: 'Which plan has the highest expected return?', code: lines.join('\n'),
                options: [actions[best], ...actions.filter((_, i) => i !== best)], answer: 0,
                explain: `Expected returns: ${actions.map((a, i) => `${a} ${Math.round(evs[i]) / 100}%`).join('; ')}.`,
                facts: { kind: 'decision', rule: 'ev', actions, plans }
            };
        }
        const nA = kind === 'cautious' ? 3 : d <= 1 ? 2 + (rng() < 0.5 ? 1 : 0) : 3 + (d >= 3 ? 1 : 0);
        const nS = d <= 1 ? 2 : 3;
        const actions = shuffle(pickOne(rng, ACTION_SETS), rng).slice(0, nA);
        const states = pickOne(rng, STATE_SETS).slice(0, nS);
        const ps = probs(rng, nS, step);
        const payoffs = actions.map(() => states.map(() => ret(rng)));
        const evs = payoffs.map((row) => evOf(row.map((v, j) => [ps[j], v])));
        const worst = payoffs.map((row) => Math.min(...row));
        const evBest = uniqueBest(evs, 100);
        const minBest = uniqueBest(worst, 5);
        if (evBest < 0) continue;
        if (kind === 'cautious' && (minBest < 0 || minBest === evBest)) continue;
        const best = kind === 'cautious' ? minBest : evBest;
        const head = `Chance:  ${states.map((s, j) => `${s} ${ps[j]}%`).join(' · ')}`;
        const lines = actions.map((a, i) => `${a}: ${payoffs[i].map((v, j) => `${states[j]} ${pct(v)}`).join(', ')}`);
        return {
            topic: kind === 'cautious' ? 'Play it safe (maximin)' : 'Expected value',
            prompt: kind === 'cautious' ? 'Play it safe: which plan has the best worst case?' : 'Which plan has the highest expected return?',
            code: [head, ...lines].join('\n'),
            options: [actions[best], ...actions.filter((_, i) => i !== best)], answer: 0,
            explain: kind === 'cautious' ? `Worst cases: ${actions.map((a, i) => `${a} ${pct(worst[i])}`).join('; ')}.` : `Expected returns: ${actions.map((a, i) => `${a} ${Math.round(evs[i]) / 100}%`).join('; ')}.`,
            facts: { kind: 'decision', rule: kind === 'cautious' ? 'maximin' : 'ev', actions, plans: payoffs.map((row) => row.map((v, j) => [ps[j], v])) }
        };
    }
};

module.exports = {
    MAKERS: { animalPairs, rhymes, numberHop, missingNumber, analogies, equationRush, ratioRelay, cipherLab, probability, quantArena, decisions },
    // For tests: what each question's answer is worked out from again.
    check: { ANIMALS, animalFacts, partnerOf, familyOf, evalTree, ratioAnswer, decodeCipher, spaceOf, VAR_TEMPLATES, assignments, decideBySampling, QC_ID }
};
