/**
 * The solo games that are questions and answers, as Group Brain games (added 2026-10-29): each runs on
 * quizCore, as Pattern Master and Word Logic do — two to twenty players answer the same question at once,
 * right +100, wrong −20, everyone's answers shown together when it closes. Their questions are the solo
 * games' own (./banks/solo.js). Loaded through ./index.js like any other game.
 */
const { makeEngine } = require('./quizCore');
const { fromBank, fromMaker, MAKERS } = require('./banks/solo');

const quiz = (id, label, emoji, summary, pick, seconds = 20) => makeEngine({
    id, label, emoji, summary, mode: 'simultaneous', maxSeats: 20,
    questions: { min: 5, max: 20, fallback: 10 },
    seconds: { min: 8, max: 60, fallback: seconds },
    revealMs: 4000,
    pick
});

const GAMES = {
    synonymmatch: ['Synonym Match', '🔤', 'Pick the word that means the same.', fromBank('synonym')],
    antonymmatch: ['Antonym Match', '↔️', 'Pick the word that means the opposite.', fromBank('antonym')],
    idiomsense: ['Idiom Sense', '💬', 'What does the phrase really mean?', fromBank('idiom')],
    sentencegap: ['Sentence Gap', '✏️', 'Choose the word that fits the sentence.', fromBank('sentencegap')],
    soundalike: ['Sound Alike', '👂', 'Their, there or they’re? Only one fits.', fromBank('soundalike')],
    wordroots: ['Word Roots', '🌱', 'What does this prefix or root mean?', fromBank('wordroots')],
    spellingfix: ['Spelling Fix', '🔍', 'One of these four is spelled correctly.', fromBank('spelling')],
    tensepick: ['Tense Pick', '⏪', 'Go, went, gone — pick the right past tense.', fromBank('tense')],
    oddoneout: ['Odd One Out', '🧩', 'Three belong together. One does not.', fromBank('oddoneout')],
    percentsnap: ['Percent Snap', '📊', 'Percentages, in your head, against the clock.', fromMaker(MAKERS.percent), 15],
    binaryblitz: ['Binary Blitz', '💻', 'Read binary as fast as you read decimal.', fromMaker(MAKERS.binary), 15],
    roundingrush: ['Rounding Rush', '🎯', 'Round it to the nearest ten, hundred or thousand.', fromMaker(MAKERS.rounding), 12],
    fractionmatch: ['Fraction Match', '🍕', 'Which fraction is worth the same amount?', fromMaker(MAKERS.fraction), 15],
    quickcompare: ['Quick Compare', '⚡', 'Pick the side with the larger value.', fromMaker(MAKERS.compare), 10],
    scalebalance: ['Scale Balance', '⚖️', 'Read the scales and find the heaviest — or the lightest.', fromMaker(MAKERS.scale), 25],
    // With a picture, or something to memorise first (2026-10-29).
    colourmatch: ['Colour Match', '🎨', 'Name the ink colour, not the word.', fromMaker(MAKERS.colour), 8],
    dotcount: ['Dot Count', '🔵', 'How many dots of one colour? Count fast.', fromMaker(MAKERS.dots), 15],
    clockread: ['Clock Read', '🕰️', 'Read the hands and pick the time.', fromMaker(MAKERS.clock), 15],
    shapematrix: ['Shape Matrix', '🧮', 'Spot the rule and finish the grid.', fromMaker(MAKERS.matrix), 25],
    numberrecall: ['Number Recall', '🔢', 'Memorise a number, then pick it out.', fromMaker(MAKERS.recall), 12],
    reverserecall: ['Reverse Recall', '🔁', 'Memorise a number, then find it backwards.', fromMaker(MAKERS.reverse), 15],
    seenbefore: ['Seen Before', '👀', 'A set flashes up. Which one did you see?', fromMaker(MAKERS.seen), 10],
    spotthechange: ['Spot the Change', '👁️', 'One tile changes. Which one was it?', fromMaker(MAKERS.change), 12],
    matchback: ['Match Back', '🔂', 'Letters flash by: was the last the same as the one before?', fromMaker(MAKERS.matchBack), 8],
    runningtotal: ['Running Total', '➕', 'Numbers arrive one at a time. Keep the total.', fromMaker(MAKERS.running), 12]
};

const IDS = Object.keys(GAMES);
const engines = {};
/** The engine for one of these games, made once. */
const soloEngine = (id) => {
    if (!GAMES[id]) return null;
    if (!engines[id]) { const [label, emoji, summary, pick, seconds] = GAMES[id]; engines[id] = quiz(id, label, emoji, summary, pick, seconds); }
    return engines[id];
};

module.exports = { SOLO_QUIZ: IDS, soloEngine };
