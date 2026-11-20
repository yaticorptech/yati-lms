/**
 * Word Ladder (2026-11-16, Rising Brains · Vocabulary; id "word-ladder"). Pure and seeded.
 *
 * Climb from the start word to the goal word, changing ONE letter at a time. Each rung has a clue, so the next word is
 * known, not guessed: COLD → CORD (a thick string) → CARD → WARD → WARM. Levels: 3-letter, then 4, then 5-letter ladders.
 * Each ladder: [start, [word, clue], …] — the last word is the goal.
 */
import { sample } from '../seeded.js';

const LADDERS = {
  3: [
    ['cat', ['cot', 'a small bed for a baby'], ['dot', 'a tiny round spot'], ['dog', 'a pet that barks']],
    ['hot', ['hat', 'you wear it on your head'], ['bat', 'used to hit the ball in cricket'], ['bit', 'a small piece'], ['big', 'large']],
    ['sun', ['run', 'to move fast on your feet'], ['ran', 'the past of run'], ['rat', 'a small animal with a long tail']],
    ['pig', ['pin', 'a small sharp nail for paper'], ['pan', 'used for cooking food'], ['man', 'a grown-up boy']],
    ['bed', ['red', 'the colour of blood'], ['rod', 'a long thin stick'], ['nod', 'move your head to say yes']],
    ['log', ['leg', 'the body part you walk on'], ['peg', 'a hook to hang things on'], ['pet', 'an animal you keep at home']],
    ['cup', ['cap', 'a hat with a peak'], ['map', 'a drawing that shows places'], ['mop', 'used to clean the floor']],
    ['fun', ['fan', 'it keeps you cool'], ['tan', 'skin made brown by the sun'], ['ten', 'the number after nine']]
  ],
  4: [
    ['cold', ['cord', 'a thick string'], ['card', 'you send one on a birthday'], ['ward', 'a room in a hospital'], ['warm', 'a little hot']],
    ['love', ['live', 'to stay in a home'], ['line', 'a long thin mark'], ['fine', 'okay, good']],
    ['head', ['heal', 'to get better after a cut'], ['teal', 'a blue-green colour'], ['tell', 'to say something to someone'], ['tall', 'high, like a giraffe']],
    ['milk', ['mild', 'gentle, not strong'], ['mind', 'the part of you that thinks'], ['mint', 'a fresh-tasting leaf'], ['hint', 'a small clue']],
    ['boat', ['coat', 'you wear it in winter'], ['cost', 'the price of something'], ['most', 'the biggest amount'], ['mist', 'a light fog']],
    ['fish', ['dish', 'a plate for food'], ['dash', 'to run very fast'], ['cash', 'money in notes and coins'], ['cast', 'a hard cover for a broken arm']],
    ['rain', ['gain', 'to get more of something'], ['grin', 'a big smile'], ['grim', 'serious and unhappy-looking']],
    ['sand', ['band', 'a group that plays music'], ['bend', 'to make something curved'], ['send', 'to post a letter'], ['seed', 'a plant grows from it']],
    ['wind', ['wild', 'living in nature, not tame'], ['will', 'a strong wish to do something'], ['wall', 'a side of a room'], ['walk', 'to move slowly on foot']],
    ['dark', ['bark', 'the sound a dog makes'], ['barn', 'a farm building for animals'], ['burn', 'to be on fire'], ['turn', 'to go round']],
    ['game', ['gate', 'a door in a fence'], ['hate', 'the opposite of love'], ['have', 'to own something'], ['hive', 'where bees live']]
  ],
  5: [
    ['stone', ['store', 'a shop'], ['stare', 'to look at something for a long time'], ['spare', 'extra, kept in case'], ['space', 'where the planets are']],
    ['light', ['night', 'when it is dark outside'], ['sight', 'the power of seeing'], ['eight', 'the number after seven']],
    ['plant', ['plane', 'it flies in the sky'], ['place', 'a spot or an area'], ['peace', 'when there is no war'], ['peach', 'a soft, fuzzy fruit']],
    ['bread', ['break', 'a short rest'], ['creak', 'a squeaky sound from an old door'], ['creek', 'a small stream'], ['creep', 'to move slowly and quietly']],
    ['shore', ['share', 'to give part to others'], ['shame', 'feeling bad about something you did'], ['shape', 'a circle, square or triangle'], ['shade', 'a cool, dark place out of the sun']]
  ]
};

export const ladders = (length) => LADDERS[length].map(([start, ...steps]) => ({ start, steps: steps.map(([word, clue]) => ({ word, clue })), goal: steps[steps.length - 1][0] }));
export const ALL_LADDERS = [3, 4, 5].flatMap((n) => ladders(n));

const clampN = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

/** Letters per word, ladders per level, tries per rung before a letter is shown. */
export const ladderConfig = (ageBand, difficulty = 1, levelNo = 1) => {
  const s = clampN(Math.ceil(levelNo / 3) + ((difficulty || 1) - 1) * 2 + (ageBand === 'analytical' ? 3 : 0), 1, 14);
  // 2026-11-19 (the user): no three-letter ladders — four letters from the first level.
  const lengths = s <= 7 ? [4] : s <= 9 ? [4, 5] : [5];
  return { lengths, count: 3, pass: 2, tries: s <= 4 ? 3 : 2 };
};

/** A level: `count` ladders, mixed from the allowed lengths, none twice. */
export const makeLadderLevel = (rng, config) => sample(rng, config.lengths.flatMap((n) => ladders(n)), config.count);

/** Which letter changes between two words (index), or -1 if not exactly one. */
export const changedAt = (a, b) => {
  if (a.length !== b.length) return -1;
  const diff = [...a].map((ch, i) => (ch !== b[i] ? i : -1)).filter((i) => i >= 0);
  return diff.length === 1 ? diff[0] : -1;
};
