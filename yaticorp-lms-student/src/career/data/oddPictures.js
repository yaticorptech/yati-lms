/**
 * Odd One Out, in pictures (2026-11-18, the user: "don't use a question and four text answers every time — use four
 * images as options, keep changing the pattern, students should learn from every play and want to play again").
 *
 * Every round is four picture cards: three share a hidden rule, one breaks it. The rule changes from round to round —
 * a kind of thing, a colour, how many, a picture turned the other way, how many sides, what can fly, what is alive,
 * the first sound of a word, a sum — and after the tap the rule is told, with a short fact, so every round teaches.
 * Pure and seeded so a test can deal thousands.
 */
import { pick, shuffle } from './seeded.js';

/* -------------------------------------------------------------- the bank -- */
// e emoji · n name · k kind · c colour (only where the picture is clearly one colour) · fly · alive
const I = (e, n, k, c = null, extra = {}) => ({ e, n, k, c, ...extra });
export const BANK = [
  I('🍎', 'apple', 'fruit', 'red'), I('🍌', 'banana', 'fruit', 'yellow'), I('🍇', 'grapes', 'fruit', 'purple'), I('🍊', 'orange', 'fruit', 'orange'),
  I('🍓', 'strawberry', 'fruit', 'red'), I('🍉', 'watermelon', 'fruit'), I('🍍', 'pineapple', 'fruit'), I('🥝', 'kiwi', 'fruit', 'green'), I('🍒', 'cherries', 'fruit', 'red'), I('🍐', 'pear', 'fruit', 'green'), I('🥭', 'mango', 'fruit'),
  I('🥕', 'carrot', 'vegetable', 'orange'), I('🥦', 'broccoli', 'vegetable', 'green'), I('🌽', 'corn', 'vegetable', 'yellow'), I('🍆', 'brinjal', 'vegetable', 'purple'), I('🥔', 'potato', 'vegetable', 'brown'), I('🥒', 'cucumber', 'vegetable', 'green'), I('🧅', 'onion', 'vegetable'), I('🫑', 'capsicum', 'vegetable', 'green'),
  I('🚗', 'car', 'road', 'red'), I('🚌', 'bus', 'road'), I('🚲', 'bicycle', 'road'), I('🚜', 'tractor', 'road'), I('🚒', 'fire engine', 'road', 'red'), I('🚕', 'taxi', 'road', 'yellow'), I('🛵', 'scooter', 'road'), I('🚑', 'ambulance', 'road'),
  I('⛵', 'sailboat', 'water'), I('🚢', 'ship', 'water'), I('🛶', 'canoe', 'water'), I('🚤', 'speedboat', 'water'),
  I('✈️', 'aeroplane', 'air', null, { fly: true }), I('🚁', 'helicopter', 'air', null, { fly: true }), I('🚀', 'rocket', 'air', null, { fly: true }), I('🛩️', 'small plane', 'air', null, { fly: true }),
  I('🐟', 'fish', 'sea', 'blue', { alive: true }), I('🐙', 'octopus', 'sea', 'red', { alive: true }), I('🦈', 'shark', 'sea', null, { alive: true }), I('🐳', 'whale', 'sea', 'blue', { alive: true }), I('🦀', 'crab', 'sea', 'red', { alive: true }), I('🐬', 'dolphin', 'sea', 'blue', { alive: true }), I('🦑', 'squid', 'sea', null, { alive: true }),
  I('🐄', 'cow', 'farm', null, { alive: true }), I('🐖', 'pig', 'farm', 'pink', { alive: true }), I('🐑', 'sheep', 'farm', null, { alive: true }), I('🐐', 'goat', 'farm', null, { alive: true }), I('🐎', 'horse', 'farm', 'brown', { alive: true }), I('🐓', 'rooster', 'farm', null, { alive: true }),
  I('🦁', 'lion', 'wild', null, { alive: true }), I('🐯', 'tiger', 'wild', 'orange', { alive: true }), I('🐘', 'elephant', 'wild', null, { alive: true }), I('🦒', 'giraffe', 'wild', null, { alive: true }), I('🦓', 'zebra', 'wild', null, { alive: true }), I('🐒', 'monkey', 'wild', 'brown', { alive: true }), I('🦏', 'rhino', 'wild', null, { alive: true }),
  I('🦅', 'eagle', 'bird', null, { fly: true, alive: true }), I('🦜', 'parrot', 'bird', null, { fly: true, alive: true }), I('🦉', 'owl', 'bird', 'brown', { fly: true, alive: true }), I('🕊️', 'dove', 'bird', null, { fly: true, alive: true }), I('🐧', 'penguin', 'bird', null, { fly: false, alive: true }),
  I('🐝', 'bee', 'insect', 'yellow', { fly: true, alive: true }), I('🦋', 'butterfly', 'insect', 'blue', { fly: true, alive: true }), I('🐞', 'ladybird', 'insect', 'red', { fly: true, alive: true }), I('🐜', 'ant', 'insect', null, { alive: true }),
  I('⚽', 'football', 'ball'), I('🏀', 'basketball', 'ball', 'orange'), I('🏈', 'rugby ball', 'ball', 'brown'), I('⚾', 'baseball', 'ball'), I('🎾', 'tennis ball', 'ball', 'green'), I('🏐', 'volleyball', 'ball'),
  I('🎸', 'guitar', 'music'), I('🎹', 'piano', 'music'), I('🥁', 'drum', 'music'), I('🎺', 'trumpet', 'music', 'yellow'), I('🎻', 'violin', 'music', 'brown'),
  I('👕', 'shirt', 'clothes', 'blue'), I('👖', 'jeans', 'clothes', 'blue'), I('👗', 'dress', 'clothes'), I('🧦', 'socks', 'clothes'), I('🧢', 'cap', 'clothes', 'blue'), I('🧤', 'gloves', 'clothes', 'green'),
  I('✏️', 'pencil', 'school', 'yellow'), I('📏', 'ruler', 'school'), I('📚', 'books', 'school'), I('🎒', 'school bag', 'school', 'red'), I('🖍️', 'crayon', 'school'),
  I('🌳', 'tree', 'plant', 'green', { alive: true }), I('🌻', 'sunflower', 'plant', 'yellow', { alive: true }), I('🌵', 'cactus', 'plant', 'green', { alive: true }), I('🌷', 'tulip', 'plant', 'pink', { alive: true }),
  I('🪨', 'rock', 'thing', null, { alive: false }), I('⏰', 'clock', 'thing', 'red', { alive: false }), I('🪑', 'chair', 'thing', 'brown', { alive: false }), I('🔑', 'key', 'thing', 'yellow', { alive: false }), I('☂️', 'umbrella', 'thing', 'purple', { alive: false })
];

/** What a kind is called in a "why" — "are fruits", "is a vegetable". */
const KIND = {
  fruit: ['fruits', 'a fruit'], vegetable: ['vegetables', 'a vegetable'], road: ['road vehicles', 'a road vehicle'], water: ['boats', 'a boat'],
  air: ['things that fly in the sky', 'an aircraft'], sea: ['sea animals', 'a sea animal'], farm: ['farm animals', 'a farm animal'], wild: ['wild animals', 'a wild animal'],
  bird: ['birds', 'a bird'], insect: ['insects', 'an insect'], ball: ['balls for sport', 'a ball'], music: ['musical instruments', 'an instrument'],
  clothes: ['clothes', 'something we wear'], school: ['school things', 'a school thing'], plant: ['plants', 'a plant'], thing: ['things', 'a thing']
};
/** Kinds that look alike: an odd one from here is harder to spot (older and later levels). */
const NEAR = { fruit: ['vegetable'], vegetable: ['fruit'], road: ['water', 'air'], water: ['road'], air: ['bird'], sea: ['farm', 'wild'], farm: ['wild'], wild: ['farm'], bird: ['insect'], insect: ['bird'], ball: ['music'], clothes: ['school'], school: ['clothes'], music: ['ball'] };

/** A fact told after the round, by kind: every play teaches a little. */
const FACT = {
  fruit: 'Fruits grow from flowers and carry the seeds of the plant.',
  vegetable: 'Vegetables are roots, stems or leaves we eat — a carrot is a root!',
  road: 'Road vehicles have wheels to roll along the ground.',
  water: 'Boats float because they push water out of the way.',
  air: 'Aircraft fly with wings, rotors or rockets.',
  sea: 'Sea animals live in salty ocean water.',
  farm: 'Farm animals are looked after by farmers for milk, eggs or wool.',
  wild: 'Wild animals find their own food and live in forests or grasslands.',
  bird: 'All birds have feathers and lay eggs.',
  insect: 'Every insect has six legs.',
  ball: 'Each sport has a ball made the right size and weight for it.',
  music: 'Instruments make sound by shaking — strings, skins or air.',
  clothes: 'Clothes keep us warm, cool and safe.',
  school: 'These help us write, measure and learn.',
  plant: 'Plants make their own food from sunlight.',
  thing: 'Things like these are made by people or nature but are not alive.'
};

const COLOUR_EMOJI = { red: '🔴', yellow: '🟡', green: '🟢', blue: '🔵', purple: '🟣', orange: '🟠', brown: '🟤', pink: '🩷' };
const list = (items) => items.map((i) => i.e).join(' ');
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/* -------------------------------------------------------------- the rounds -- */
/*
 * A round: { kind, theme, cards: [{ id, face, ... }], odd (index), rule (the rule, said after), fact }.
 * A card's face is one of:
 *   { type: 'pic', e, flip?, turn? }           one big picture (flip = mirrored, turn = degrees)
 *   { type: 'group', items: [e…] }              several pictures — counted
 *   { type: 'shape', sides, hue, size, turn }   a drawn shape
 *   { type: 'sum', a, b }                        a small sum on a card
 */
const card = (face, i) => ({ id: i, face });

const byKind = (rng, near) => {
  const kinds = Object.keys(KIND).filter((k) => k !== 'thing' && BANK.filter((b) => b.k === k).length >= 3);
  const main = pick(rng, kinds);
  const others = near && NEAR[main] ? NEAR[main] : kinds.filter((k) => k !== main && !(NEAR[main] || []).includes(k));
  const odd = pick(rng, others);
  const three = shuffle(rng, BANK.filter((b) => b.k === main)).slice(0, 3);
  const one = pick(rng, BANK.filter((b) => b.k === odd));
  return { three, one, rule: `${list(three)} are ${KIND[main][0]}. ${one.e} ${cap(one.n)} is ${KIND[odd][1]}.`, fact: FACT[main], theme: 'kind' };
};

const byColour = (rng) => {
  const colours = Object.keys(COLOUR_EMOJI).filter((c) => BANK.filter((b) => b.c === c).length >= 3);
  const main = pick(rng, colours);
  const three = shuffle(rng, BANK.filter((b) => b.c === main)).slice(0, 3);
  const one = pick(rng, BANK.filter((b) => b.c && b.c !== main));
  return { three, one, rule: `${list(three)} are all ${main} ${COLOUR_EMOJI[main]}. ${one.e} ${cap(one.n)} is ${one.c} ${COLOUR_EMOJI[one.c]}.`, fact: 'Spotting colour is the first thing our eyes do — it is how we find ripe fruit!', theme: 'colour' };
};

const byFlying = (rng) => {
  const flyers = BANK.filter((b) => b.fly === true);
  const walkers = BANK.filter((b) => b.fly !== true && ['wild', 'farm', 'road', 'sea', 'thing'].includes(b.k));
  const flip = rng() < 0.35; // sometimes three walk and one flies
  const three = shuffle(rng, flip ? walkers : flyers).slice(0, 3);
  const one = pick(rng, flip ? flyers : walkers);
  return flip
    ? { three, one, rule: `${list(three)} cannot fly. ${one.e} ${cap(one.n)} can fly!`, fact: 'Wings push air down, and the air pushes the flyer up.', theme: 'sky' }
    : { three, one, rule: `${list(three)} can fly. ${one.e} ${cap(one.n)} cannot fly.`, fact: 'Wings push air down, and the air pushes the flyer up.', theme: 'sky' };
};

const byAlive = (rng) => {
  const living = BANK.filter((b) => b.alive === true);
  const not = BANK.filter((b) => b.alive === false || ['road', 'water', 'air', 'ball', 'music', 'school', 'clothes'].includes(b.k));
  const flip = rng() < 0.5;
  const three = shuffle(rng, flip ? not : living).slice(0, 3);
  const one = pick(rng, flip ? living : not);
  return flip
    ? { three, one, rule: `${list(three)} are not alive. ${one.e} ${cap(one.n)} is a living thing.`, fact: 'Living things grow, need food and water, and make young ones.', theme: 'garden' }
    : { three, one, rule: `${list(three)} are living things. ${one.e} ${cap(one.n)} is not alive.`, fact: 'Living things grow, need food and water, and make young ones.', theme: 'garden' };
};

const byLetter = (rng) => {
  const letters = [...new Set(BANK.map((b) => b.n[0]))].filter((l) => BANK.filter((b) => b.n[0] === l).length >= 3);
  const main = pick(rng, letters);
  const three = shuffle(rng, BANK.filter((b) => b.n[0] === main)).slice(0, 3);
  const one = pick(rng, BANK.filter((b) => b.n[0] !== main));
  return { three, one, rule: `${three.map((t) => `${t.e} ${t.n}`).join(', ')} all start with “${main.toUpperCase()}”. ${one.e} ${one.n} starts with “${one.n[0].toUpperCase()}”.`, fact: 'Words that start with the same sound are said to alliterate — like “busy bees buzz”.', theme: 'letters' };
};

/** Picture cards from one of the rules above: three and the odd one, shuffled. */
const pictureRound = (rng, made) => {
  const cards = shuffle(rng, [...made.three.map((t) => ({ type: 'pic', e: t.e, name: t.n })), { type: 'pic', e: made.one.e, name: made.one.n, odd: true }]).map(card);
  return { theme: made.theme, cards, odd: cards.findIndex((c) => c.face.odd), rule: made.rule, fact: made.fact };
};

const FACING = ['🐌', '🦒', '🐘', '🚗', '🚲', '🦆', '🐕', '🦖', '🐿️', '🚜', '🐢', '🦔', '🐓', '🛵'];
const byFlip = (rng, hard) => {
  const e = pick(rng, FACING);
  const turned = hard && rng() < 0.5 ? { turn: 180 } : { flip: true };
  const odd = Math.floor(rng() * 4);
  const cards = [0, 1, 2, 3].map((i) => card(i === odd ? { type: 'pic', e, ...turned, odd: true } : { type: 'pic', e }, i));
  return { theme: 'mirror', cards, odd, rule: turned.turn ? `Three ${e} stand the right way up. One is upside down!` : `Three ${e} face the same way. One faces the other way — like in a mirror.`, fact: 'A mirror swaps left and right but not up and down.' };
};

const byCount = (rng, big) => {
  const n = big ? 3 + Math.floor(rng() * 4) : 2 + Math.floor(rng() * 3); // 3–6 or 2–4
  const m = rng() < 0.5 ? n + 1 : Math.max(1, n - 1);
  const pics = shuffle(rng, BANK).slice(0, 4).map((b) => b.e);
  const odd = Math.floor(rng() * 4);
  const cards = pics.map((e, i) => card({ type: 'group', items: Array.from({ length: i === odd ? m : n }, () => e), odd: i === odd }, i));
  return { theme: 'count', cards, odd, rule: `Three cards have ${n} each. The odd one has ${m}.`, fact: 'Counting in small groups — 2 and 2 make 4 — is quicker than one by one.' };
};

const SHAPE_NAME = { 3: 'triangle', 4: 'four-sided shape', 5: 'pentagon', 6: 'hexagon', 0: 'circle' };
const bySides = (rng, hard) => {
  const pool = hard ? [3, 4, 5, 6] : [0, 3, 4, 6];
  const main = pick(rng, pool);
  const other = pick(rng, pool.filter((p) => (hard ? Math.abs(p - main) === 1 : p !== main)));
  const hues = shuffle(rng, ['#f43f5e', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899']);
  const odd = Math.floor(rng() * 4);
  const cards = [0, 1, 2, 3].map((i) => card({ type: 'shape', sides: i === odd ? other : main, hue: hues[i], size: 0.7 + rng() * 0.3, turn: Math.floor(rng() * 360), odd: i === odd }, i));
  const say = (s) => (s === 0 ? 'no corners — it is a circle' : `${s} sides — a ${SHAPE_NAME[s]}`);
  return { theme: 'shapes', cards, odd, rule: `Three shapes have ${say(main)}. The odd one has ${say(other)}.`, fact: 'Count the corners: a shape has as many corners as sides. Size, colour and turning do not change that!' };
};

const bySum = (rng, hard) => {
  const total = hard ? 8 + Math.floor(rng() * 8) : 5 + Math.floor(rng() * 5);
  const ways = shuffle(rng, Array.from({ length: total - 1 }, (_, a) => ({ a: a + 1, b: total - a - 1 })));
  const odd = Math.floor(rng() * 4);
  const base = ways[3];
  const off = base.b > 1 && rng() < 0.5 ? -1 : 1;
  const wrongWay = { a: base.a, b: base.b + off };
  let k = 0;
  const cards = [0, 1, 2, 3].map((i) => card(i === odd ? { type: 'sum', ...wrongWay, odd: true } : { type: 'sum', ...ways[k++] }, i));
  return { theme: 'numbers', cards, odd, rule: `Three sums make ${total}. ${wrongWay.a} + ${wrongWay.b} makes ${total + off}.`, fact: `Many pairs make the same number: ${ways.slice(0, 3).map((w) => `${w.a} + ${w.b}`).join(', ')} all make ${total}.` };
};

/*
 * Word rounds (2026-11-18, the user: "both text and picture odd one out in Young Thinkers"): the same idea with
 * words on the cards — everyday things from the bank, or easy word groups (days, colours, body, family, numbers).
 */
const WORD_SETS = {
  days: ['days of the week', ['Monday', 'Tuesday', 'Friday', 'Sunday', 'Wednesday', 'Saturday']],
  colours: ['colours', ['red', 'blue', 'green', 'yellow', 'pink', 'purple']],
  body: ['parts of the body', ['hand', 'nose', 'ear', 'eye', 'leg', 'foot']],
  family: ['family words', ['mother', 'father', 'sister', 'brother', 'grandma', 'uncle']],
  numbers: ['number words', ['one', 'two', 'three', 'four', 'five', 'six']],
  shapes: ['shapes', ['circle', 'square', 'triangle', 'star', 'oval']]
};
const byWords = (rng) => {
  if (rng() < 0.5) {
    const made = byKind(rng, false);
    const words = shuffle(rng, [...made.three.map((t) => ({ type: 'word', text: t.n })), { type: 'word', text: made.one.n, odd: true }]).map(card);
    const kindOf = (t) => BANK.find((b) => b.n === t);
    const main = kindOf(made.three[0].n).k;
    return { theme: 'words', cards: words, odd: words.findIndex((c) => c.face.odd), rule: `${made.three.map((t) => cap(t.n)).join(', ')} are ${KIND[main][0]}. ${cap(made.one.n)} is ${KIND[kindOf(made.one.n).k][1]}.`, fact: FACT[main] };
  }
  const keys = Object.keys(WORD_SETS);
  const main = pick(rng, keys);
  const other = pick(rng, keys.filter((k) => k !== main));
  const three = shuffle(rng, WORD_SETS[main][1]).slice(0, 3);
  const one = pick(rng, WORD_SETS[other][1]);
  const cards = shuffle(rng, [...three.map((t) => ({ type: 'word', text: t })), { type: 'word', text: one, odd: true }]).map(card);
  return { theme: 'words', cards, odd: cards.findIndex((c) => c.face.odd), rule: `${three.map(cap).join(', ')} are ${WORD_SETS[main][0]}. ${cap(one)} is not — it is one of the ${WORD_SETS[other][0]}.`, fact: 'Sorting words into groups helps us remember them.' };
};

/** The rounds on offer: young players get the picture rules; older ones add shapes by sides, sums and letters. */
const KINDS_YOUNG = ['kind', 'colour', 'count', 'flip', 'fly', 'alive'];
const KINDS_OLDER = ['kind', 'colour', 'count', 'flip', 'fly', 'alive', 'sides', 'sum', 'letter'];

export const makeRound = (rng, kind, { young = false, levelNo = 1 } = {}) => {
  const hard = !young && levelNo >= 8;
  switch (kind) {
    case 'kind': return pictureRound(rng, byKind(rng, hard || (!young && levelNo >= 4 && rng() < 0.5)));
    case 'colour': return pictureRound(rng, byColour(rng));
    case 'fly': return pictureRound(rng, byFlying(rng));
    case 'alive': return pictureRound(rng, byAlive(rng));
    case 'letter': return pictureRound(rng, byLetter(rng));
    case 'flip': return byFlip(rng, hard);
    case 'count': return byCount(rng, !young);
    case 'sides': return bySides(rng, hard);
    case 'sum': return bySum(rng, hard);
    case 'words': return byWords(rng);
    default: return pictureRound(rng, byKind(rng, false));
  }
};

/** A level: `rounds` rounds, the rule changing every round (no kind twice in a row, every kind before a repeat). */
export const makeLevel = (rng, { rounds, young, levelNo }) => {
  const kinds = young ? KINDS_YOUNG : KINDS_OLDER;
  const order = [];
  while (order.length < rounds) {
    const deal = shuffle(rng, kinds);
    if (order.length && deal[0] === order[order.length - 1]) deal.push(deal.shift());
    order.push(...deal);
  }
  // Young Thinkers: every third round is a word round, the rest pictures.
  return order.slice(0, rounds).map((k, i) => (young && i % 3 === 1 ? 'words' : k)).map((k) => ({ kind: k, ...makeRound(rng, k, { young, levelNo }) }));
};

/** How a level plays: more rounds and a tighter clock as the level climbs. */
export const oddConfig = (levelNo = 1, young = false) => {
  const rounds = Math.min(10, 6 + Math.floor((levelNo - 1) / 6));
  return { rounds, pass: Math.ceil(rounds * 0.6), seconds: rounds * (young ? 20 : 15) };
};
