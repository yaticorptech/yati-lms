/**
 * Word Association Grid — hand-written groups of four, dealt so that no word on
 * the board fits two of the board's groups.
 *
 * Overlap is avoided by construction:
 *   • every word appears in exactly one group of the whole bank;
 *   • every group has a `family`, and a board never holds two groups of one family
 *     (two food groups, two synonym groups … could share a borderline word);
 *   • a group lists `avoid` families whose groups could claim one of its words
 *     (Mercury is a planet AND a metal: planets avoid 'science'); a board never
 *     pairs a group with a family it avoids, or with a group that avoids it.
 *
 * Bank lines: 'tier|family|avoid,avoid|Label|Word,Word,Word,Word'.
 * Tier 1 = plain categories, 2 = needs a moment's thought, 3 = word play.
 */
import { shuffle } from '../seeded.js';

const BANK = [
  '1|space|science|Planets|Mercury,Venus,Saturn,Neptune',
  '1|music|math,wordplay|Musical instruments|Flute,Violin,Sitar,Tabla',
  '1|measure||Units of length|Metre,Inch,Mile,Kilometre',
  '1|animals||Birds|Sparrow,Parrot,Eagle,Peacock',
  '1|food||Fruits|Mango,Guava,Papaya,Banana',
  '1|food||Vegetables|Spinach,Cabbage,Potato,Brinjal',
  '1|body||Organs of the body|Heart,Lungs,Liver,Kidney',
  '1|colour|plants,science,gems|Colours of the rainbow|Violet,Indigo,Yellow,Green',
  '1|sport|animals|Sports|Cricket,Hockey,Tennis,Kabaddi',
  '1|math|music,gems,body,wordplay|Shapes|Triangle,Square,Circle,Hexagon',
  '1|weather|mood|Weather|Thunder,Drizzle,Fog,Hail',
  '1|home|letters|Kitchen tools|Ladle,Whisk,Spatula,Tongs',
  '1|home|school|Furniture|Sofa,Wardrobe,Stool,Cupboard',
  '1|transport|letters|Vehicles|Bus,Tram,Ferry,Scooter',
  '1|geo||Oceans|Pacific,Atlantic,Indian,Arctic',
  '1|geo||Continents|Asia,Africa,Europe,Australia',
  '1|animals||Insects|Ant,Beetle,Moth,Grasshopper',
  '1|people||Jobs|Pilot,Nurse,Chef,Plumber',
  '1|time||Months|January,April,July,October',
  '1|science||Metals|Iron,Copper,Silver,Gold',
  '1|animals||Sea creatures|Octopus,Jellyfish,Starfish,Shark',
  '1|plants||Flowers|Rose,Lily,Lotus,Jasmine',
  '2|wordplay|music,tech,reading|Things with keys|Piano,Keyboard,Map,Lock',
  '2|nature|animals,food|Things with a shell|Turtle,Snail,Egg,Coconut',
  '2|school|home|In a classroom|Blackboard,Duster,Register,Bench',
  '2|adjectives||Words meaning big|Huge,Vast,Giant,Massive',
  '2|adjectives|time|Words meaning small|Tiny,Minute,Petite,Little',
  '2|mood||Words meaning happy|Cheerful,Merry,Jolly,Glad',
  '2|mood|weather|Words meaning sad|Gloomy,Glum,Miserable,Downcast',
  '2|games|sport|Board games|Chess,Ludo,Carrom,Scrabble',
  '2|rivers||Indian rivers|Ganga,Yamuna,Godavari,Kaveri',
  '2|cities||Capital cities|Paris,Tokyo,Cairo,Delhi',
  '2|tech|animals,wordplay,people,reading|Computer parts|Mouse,Monitor,Printer,Speaker',
  '2|animals|body|Baby animals|Cub,Calf,Kitten,Foal',
  '2|animals|compound|Animal homes|Den,Nest,Burrow,Hive',
  '2|stuff|food,body,compound|Sticky things|Honey,Glue,Tape,Gum',
  '2|gems|colour,math,science|Precious stones|Ruby,Emerald,Diamond,Sapphire',
  '2|food||Spices|Turmeric,Cumin,Cardamom,Clove',
  '2|arts||Indian dances|Bharatanatyam,Kathak,Kuchipudi,Odissi',
  '2|lang||Indian languages|Hindi,Tamil,Bengali,Marathi',
  '2|reading|wordplay,school,tech|Things you read|Novel,Magazine,Newspaper,Comic',
  '2|time|sport|Units of time|Second,Decade,Century,Fortnight',
  '3|compound|food,weather,colour|___fly|Butter,Dragon,Fire,House',
  '3|wordplay|body,music,nature|Break a ___|Promise,Record,Silence,Ice',
  '3|compound|body,weather,sport,measure,animals,stuff|___ball|Foot,Basket,Snow,Eye',
  '3|letters|transport|Palindromes|Level,Radar,Civic,Kayak',
  '3|compound|people|___ship|Friend,Leader,Citizen,Champion',
  '3|letters||Sound like numbers|Won,Too,Ate,For',
  '3|letters|animals,transport,geo,adjectives,stuff,lang,arts,games,home,school,wordplay,compound,tech|Hide an animal|Scatter,Batch,Ratio,Pigment',
  '3|compound|body,space|___light|Flash,Candle,Head,Spot',
  '3|wordplay|home,animals,compound|Things with teeth|Comb,Saw,Zip,Gear',
  '3|letters|body,home|Silent K|Knife,Knee,Knot,Knock',
  '3|compound|school|___room|Bath,Class,Store,Show',
  '3|letters|animals,geo,transport|Rhyme with cake|Lake,Snake,Brake,Shake'
];

export const GROUPS = BANK.map((line, id) => {
  const [tier, family, avoid, label, words] = line.split('|');
  return { id, tier: Number(tier), family, avoid: avoid ? avoid.split(',') : [], label, words: words.split(',') };
});

/** Can two groups share a board? */
export const compatible = (a, b) =>
  a.family !== b.family && !a.avoid.includes(b.family) && !b.avoid.includes(a.family);

export const assocBand = (ageBand) => (ageBand === 'analytical' || ageBand === 'advanced' ? 'analytical' : 'intermediate');

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

/**
 * groups     — 3 groups (12 words) for Classes 6–8, 4 (16 words) for Classes 9–10
 * tiers      — the tier of each group dealt, easy to hard
 * mistakes   — wrong submissions allowed (the 4th ends the level)
 */
export const assocConfig = (ageBand, difficulty = 1, levelNo = 1) => {
  const band = assocBand(ageBand);
  const d = clamp(difficulty || 1, 1, 3);
  const late = levelNo >= 16;
  if (band === 'intermediate') {
    const tiers = d === 1 ? (late ? [1, 1, 2] : [1, 1, 1]) : d === 2 ? (late ? [1, 2, 2] : [1, 1, 2]) : late ? [2, 2, 3] : [1, 2, 3];
    return { band, groups: 3, tiers, mistakes: 4 };
  }
  const tiers = d === 1 ? (late ? [1, 2, 2, 3] : [1, 1, 2, 2]) : d === 2 ? (late ? [2, 2, 3, 3] : [1, 2, 2, 3]) : late ? [2, 3, 3, 3] : [2, 2, 3, 3];
  return { band, groups: 4, tiers, mistakes: 4 };
};

/**
 * A board: { groups: [group…] (one per tier, all pairwise compatible), words: [{ word, group }] shuffled }.
 */
export const makeAssocBoard = (rng, config) => {
  for (let attempt = 0; attempt < 200; attempt++) {
    const chosen = [];
    let ok = true;
    for (const tier of config.tiers) {
      const pool = shuffle(rng, GROUPS.filter((g) => g.tier === tier && !chosen.includes(g) && chosen.every((c) => compatible(c, g))));
      if (!pool.length) { ok = false; break; }
      chosen.push(pool[0]);
    }
    if (!ok) continue;
    const words = shuffle(rng, chosen.flatMap((g) => g.words.map((word) => ({ word, group: g.id }))));
    return { groups: chosen, words };
  }
  throw new Error('no compatible board');
};

/**
 * Judge a submitted set of four words against the board's unsolved groups.
 *  { result: 'right', group } | { result: 'one-away' } | { result: 'wrong' }
 */
export const judgeSet = (board, picked, solvedIds = []) => {
  const counts = new Map();
  for (const w of picked) {
    const entry = board.words.find((x) => x.word === w);
    if (!entry) return { result: 'wrong' };
    counts.set(entry.group, (counts.get(entry.group) || 0) + 1);
  }
  const best = Math.max(...counts.values());
  const [gid] = [...counts.entries()].find(([, n]) => n === best);
  if (picked.length === 4 && best === 4 && !solvedIds.includes(gid)) return { result: 'right', group: board.groups.find((g) => g.id === gid) };
  if (best === 3) return { result: 'one-away' };
  return { result: 'wrong' };
};

/** Stars: all groups found — 3 with at most one mistake, 2 with two, 1 with three; else 0. */
export const assocStars = ({ solved, mistakes }) => {
  if (!solved) return 0;
  return mistakes <= 1 ? 3 : mistakes === 2 ? 2 : 1;
};
