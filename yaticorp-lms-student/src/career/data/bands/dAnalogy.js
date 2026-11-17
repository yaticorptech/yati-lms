/**
 * Analogy Master — a hand-written bank of A : B :: C : D analogies, each tagged
 * with the relation that links A to B (and C to D), and three tempting wrong
 * words for D. Pure and seeded.
 *
 * Bank lines: 'A|B|C|D|relation|wrong1,wrong2,wrong3'. The wrong words are
 * chosen so that none of them stands to C in the same relation as B to A
 * (they are usually the near miss: the opposite, a neighbour, a reversal).
 */
import { sample, shuffle } from '../seeded.js';

export const RELATIONS = [
  { key: 'synonym', label: 'Synonyms', hint: 'same meaning' },
  { key: 'antonym', label: 'Antonyms', hint: 'opposite meaning' },
  { key: 'part', label: 'Part → whole', hint: 'A is part of B' },
  { key: 'tool', label: 'Tool → user', hint: 'B uses A' },
  { key: 'cause', label: 'Cause → effect', hint: 'A leads to B' },
  { key: 'degree', label: 'Degree', hint: 'B is a stronger A' },
  { key: 'category', label: 'Type → group', hint: 'A is a kind of B' },
  { key: 'purpose', label: 'Object → job', hint: 'A is used to B' }
];
export const RELATION_KEYS = RELATIONS.map((r) => r.key);

const INTERMEDIATE = [
  // synonym
  'happy|glad|big|large|synonym|small,tiny,tall',
  'quick|fast|angry|mad|synonym|calm,cheerful,sad',
  'shout|yell|whisper|murmur|synonym|scream,sing,listen',
  'brave|courageous|clever|intelligent|synonym|foolish,careful,quiet',
  'tired|sleepy|ill|sick|synonym|healthy,strong,hungry',
  'begin|start|finish|end|synonym|open,early,first',
  // antonym
  'hot|cold|up|down|antonym|above,high,top',
  'day|night|early|late|antonym|soon,morning,first',
  'full|empty|rich|poor|antonym|wealthy,money,happy',
  'push|pull|give|take|antonym|send,share,offer',
  'wide|narrow|deep|shallow|antonym|low,water,long',
  'victory|defeat|success|failure|antonym|win,prize,effort',
  // part -> whole
  'page|book|petal|flower|part|garden,bee,colour',
  'wheel|car|wing|bird|part|fly,feather,nest',
  'finger|hand|toe|foot|part|shoe,sock,walk',
  'key|keyboard|string|guitar|part|music,drum,song',
  'room|house|classroom|school|part|teacher,desk,lesson',
  'brick|wall|link|chain|part|metal,rope,lock',
  // tool -> user
  'stethoscope|doctor|brush|painter|tool|canvas,colour,wall',
  'scissors|barber|needle|tailor|tool|thread,cloth,button',
  'spade|gardener|chalk|teacher|tool|board,lesson,school',
  'hammer|carpenter|camera|photographer|tool|photo,lens,film',
  'ladle|cook|whistle|referee|tool|football,goal,crowd',
  'wand|magician|baton|conductor|tool|music,orchestra,drum',
  // cause -> effect
  'rain|flood|fire|smoke|cause|water,match,wood',
  'cut|bleeding|joke|laughter|cause|funny,comedian,story',
  'exercise|fitness|study|knowledge|cause|school,book,exam',
  'heat|melting|cold|freezing|cause|warm,winter,wind',
  'carelessness|mistake|practice|improvement|cause|lazy,teacher,game',
  // degree
  'warm|hot|cool|cold|degree|mild,wet,wind',
  'big|huge|small|tiny|degree|large,thin,short',
  'like|love|dislike|hate|degree|enjoy,like,angry',
  'tired|exhausted|hungry|starving|degree|thirsty,full,food',
  'damp|soaked|breeze|gale|degree|calm,sunny,rain',
  // type -> group
  'rose|flower|oak|tree|category|leaf,wood,acorn',
  'mango|fruit|cobra|snake|category|poison,bite,mongoose',
  'sparrow|bird|salmon|fish|category|river,swim,pink',
  'hockey|sport|Mars|planet|category|red,space,rocket',
  'sitar|instrument|cotton|fabric|category|white,field,shirt',
  // object -> job
  'pen|write|knife|cut|purpose|sharp,fork,kitchen',
  'eye|see|ear|hear|purpose|sound,nose,loud',
  'broom|sweep|soap|wash|purpose|bubble,water,towel',
  'chair|sit|bed|sleep|purpose|pillow,night,room',
  'key|unlock|phone|call|purpose|ring,number,screen',
  'oven|bake|fridge|chill|purpose|kitchen,door,milk'
];

const ANALYTICAL = [
  // synonym
  'benevolent|kind|candid|frank|synonym|secretive,cruel,quiet',
  'abundant|plentiful|scarce|rare|synonym|many,common,cheap',
  'diligent|hardworking|frugal|thrifty|synonym|wasteful,wealthy,generous',
  'obstinate|stubborn|lucid|clear|synonym|confused,liquid,dark',
  'ominous|threatening|tranquil|peaceful|synonym|noisy,sleepy,stormy',
  // antonym
  'verbose|concise|transparent|opaque|antonym|clear,glass,bright',
  'ally|adversary|expand|contract|antonym|grow,stretch,swell',
  'ascend|descend|humble|arrogant|antonym|modest,poor,simple',
  'generous|stingy|frequent|rare|antonym|often,regular,usual',
  'permanent|temporary|novice|expert|antonym|beginner,student,learner',
  // part -> whole
  'stanza|poem|scene|play|part|actor,stage,audience',
  'piston|engine|lens|camera|part|photograph,picture,light',
  'atom|molecule|cell|tissue|part|nucleus,microscope,virus',
  'note|melody|letter|alphabet|part|write,vowel,post',
  'island|archipelago|star|galaxy|part|planet,sun,telescope',
  // tool -> user
  'scalpel|surgeon|chisel|sculptor|tool|marble,statue,carve',
  'telescope|astronomer|microscope|biologist|tool|lens,cell,laboratory',
  'loom|weaver|anvil|blacksmith|tool|iron,horseshoe,metal',
  'quill|scribe|lasso|cowboy|tool|rope,horse,ranch',
  'pickaxe|miner|harpoon|whaler|tool|whale,ocean,ship',
  // cause -> effect
  'drought|famine|deforestation|erosion|cause|trees,rainfall,forest',
  'friction|heat|vaccination|immunity|cause|injection,doctor,disease',
  'pollution|smog|overeating|obesity|cause|hunger,diet,food',
  'insomnia|drowsiness|flattery|vanity|cause|praise,honesty,insult',
  'earthquake|tsunami|negligence|accident|cause|careful,driver,hospital',
  // degree
  'annoyed|furious|content|ecstatic|degree|sad,satisfied,calm',
  'chilly|frigid|warm|scorching|degree|tepid,cool,cold',
  'drizzle|downpour|breeze|hurricane|degree|wind,calm,rain',
  'sip|gulp|nibble|devour|degree|taste,chew,snack',
  'dislike|loathe|like|adore|degree|hate,enjoy,ignore',
  // type -> group
  'whale|mammal|frog|amphibian|category|pond,tadpole,reptile',
  'granite|rock|copper|metal|category|coin,wire,mine',
  'tornado|storm|sonnet|poem|category|rhyme,poet,line',
  'oxygen|element|salt|compound|category|sea,crystal,food',
  'oboe|woodwind|violin|strings|category|bow,orchestra,cello',
  // object -> job
  'thermometer|temperature|barometer|pressure|purpose|weather,rain,altitude',
  'microscope|magnify|scale|weigh|purpose|heavy,balance,kitchen',
  'anaesthetic|numb|brake|slow|purpose|car,fast,pedal',
  'sieve|strain|funnel|pour|purpose|liquid,narrow,kitchen',
  'compass|navigate|ruler|measure|purpose|straight,line,school'
];

const parse = (line, band, i) => {
  const [a, b, c, d, rel, wrong] = line.split('|');
  return { id: `${band[0]}${i}`, a, b, c, d, rel, wrong: wrong.split(','), band };
};

export const ANALOGIES = {
  intermediate: INTERMEDIATE.map((l, i) => parse(l, 'intermediate', i)),
  analytical: ANALYTICAL.map((l, i) => parse(l, 'analytical', i))
};

export const analogyBand = (ageBand) => (ageBand === 'analytical' || ageBand === 'advanced' ? 'analytical' : 'intermediate');

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

/**
 * rounds, pass       — fixed run; pass counts rounds won (word right, and relation right where required)
 * relationRequired   — Classes 9–10: the relation must be tagged right for the round to count
 * relationChoices    — how many relation chips to offer
 * mixIn              — Classes 6–8 at difficulty 3 also get some Classes 9–10 items
 */
export const analogyConfig = (ageBand, difficulty = 1, levelNo = 1) => {
  const band = analogyBand(ageBand);
  const d = clamp(difficulty || 1, 1, 3);
  const t = clamp((levelNo - 1) / 29, 0, 1);
  if (band === 'intermediate') {
    const rounds = 8 + (t >= 0.5 ? 1 : 0) + (d >= 3 ? 1 : 0);
    return { band, rounds, pass: Math.ceil(rounds * 0.6), relationRequired: false, relationChoices: d === 1 ? 3 : d === 2 ? 4 : 6, mixIn: d === 3 ? 0.25 : 0 };
  }
  const rounds = 10 + (d >= 2 ? 1 : 0) + (t >= 0.5 ? 1 : 0);
  return { band, rounds, pass: Math.ceil(rounds * 0.6), relationRequired: true, relationChoices: d === 1 ? 4 : d === 2 ? 6 : 8, mixIn: 0 };
};

/**
 * A level's rounds: { item, tiles: [word…] (D + its three wrong words, shuffled), relations: [key…] }.
 * No item repeats inside a level.
 */
export const makeAnalogyLevel = (rng, config) => {
  const own = ANALOGIES[config.band];
  const extra = config.mixIn ? ANALOGIES.analytical : [];
  const nExtra = Math.round(config.rounds * config.mixIn);
  const items = shuffle(rng, [...sample(rng, own, config.rounds - nExtra), ...sample(rng, extra, nExtra)]);
  return items.map((item) => {
    const others = sample(rng, RELATION_KEYS.filter((k) => k !== item.rel), Math.max(0, config.relationChoices - 1));
    const relations = RELATION_KEYS.filter((k) => k === item.rel || others.includes(k));
    return { item, tiles: shuffle(rng, [item.d, ...item.wrong]), relations };
  });
};

/** Points for a round: word 2, relation 1 (bonus); `won` is what counts toward the pass. */
export const scoreAnalogy = (round, word, rel, relationRequired) => {
  const wordOk = word === round.item.d;
  const relOk = rel === round.item.rel;
  return { wordOk, relOk, points: (wordOk ? 2 : 0) + (relOk ? 1 : 0), won: wordOk && (!relationRequired || relOk) };
};

export const relationLabel = (key) => RELATIONS.find((r) => r.key === key)?.label || key;
