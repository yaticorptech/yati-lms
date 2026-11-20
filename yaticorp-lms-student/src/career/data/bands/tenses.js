/**
 * Age-band sentences for Tense Pick (2026-11-13). Pure — no React — so tests/games/wordBands.test.js loads it.
 *
 * Every question is a sentence with one gap, the verb in brackets, and options of which exactly one is
 * grammatical there. Where a second form would also be correct (a simple past beside a past continuous, a
 * "will" beside a present for timetables) it is left out of the options rather than marked wrong.
 *
 * Item: { kind: 'tense', sentence, verb, answer, options, level, note, explain, picture? }.
 * Bands without their own list ('analytical' when no band is known) fall back as in words.js.
 */
import { seeded, shuffle } from '../seeded.js';

const NAMES = ['Sam', 'Mia', 'Ravi', 'Anu', 'Leo', 'Zara'];

/* ---------------------------------------------------------- Foundation ---- */
/* [base, -s form, past, -ing form, object, picture, irregular past?] */
const YOUNG_VERBS = [
  ['play', 'plays', 'played', 'playing', 'football', '⚽'],
  ['jump', 'jumps', 'jumped', 'jumping', 'over the rope', '🤸'],
  ['paint', 'paints', 'painted', 'painting', 'a picture', '🎨'],
  ['cook', 'cooks', 'cooked', 'cooking', 'rice', '🍚'],
  ['walk', 'walks', 'walked', 'walking', 'to school', '🚶'],
  ['kick', 'kicks', 'kicked', 'kicking', 'the ball', '🦵'],
  ['help', 'helps', 'helped', 'helping', 'Grandma', '🤝'],
  ['wash', 'washes', 'washed', 'washing', 'the dishes', '🧽'],
  ['clean', 'cleans', 'cleaned', 'cleaning', 'the room', '🧹'],
  ['climb', 'climbs', 'climbed', 'climbing', 'the tree', '🌳'],
  ['pick', 'picks', 'picked', 'picking', 'flowers', '🌸'],
  ['open', 'opens', 'opened', 'opening', 'the door', '🚪'],
  ['watch', 'watches', 'watched', 'watching', 'TV', '📺'],
  ['bake', 'bakes', 'baked', 'baking', 'a cake', '🎂'],
  ['dance', 'dances', 'danced', 'dancing', 'at the party', '💃'],
  ['hop', 'hops', 'hopped', 'hopping', 'on one leg', '🐇'],
  ['run', 'runs', 'ran', 'running', 'fast', '🏃', true],
  ['eat', 'eats', 'ate', 'eating', 'an apple', '🍎', true],
  ['swim', 'swims', 'swam', 'swimming', 'in the pool', '🏊', true],
  ['sing', 'sings', 'sang', 'singing', 'a song', '🎤', true],
  ['drink', 'drinks', 'drank', 'drinking', 'milk', '🥛', true],
  ['sit', 'sits', 'sat', 'sitting', 'on the mat', '🪑', true],
  ['ride', 'rides', 'rode', 'riding', 'a bike', '🚲', true],
  ['write', 'writes', 'wrote', 'writing', 'a letter', '✉️', true],
  ['fly', 'flies', 'flew', 'flying', 'a kite', '🪁', true],
  ['draw', 'draws', 'drew', 'drawing', 'a cat', '✏️', true],
  ['make', 'makes', 'made', 'making', 'a sandcastle', '🏖️', true],
  ['dig', 'digs', 'dug', 'digging', 'a hole', '🕳️', true]
];

const tail = (obj) => (obj ? ` ${obj}` : '');

const buildFoundation = () => {
  const rng = seeded(5100);
  const out = [];
  YOUNG_VERBS.forEach(([base, s, past, ing, obj, picture, irregular], i) => {
    const name = NAMES[i % NAMES.length];
    const level = irregular ? 2 : 1;
    out.push({
      sentence: `Yesterday I ___${tail(obj)}.`, verb: base, answer: past, options: [past, base, s], level, picture,
      explain: `"Yesterday" is the past, so we say "${past}".`
    });
    out.push({
      sentence: `Look! ${name} is ___${tail(obj)}.`, verb: base, answer: ing, options: [ing, past, s], level, picture,
      explain: `It is happening now: "is ${ing}".`
    });
    out.push({
      sentence: `Every day, ${name} ___${tail(obj)}.`, verb: base, answer: s, options: [s, base, ing], level, picture,
      explain: `Every day, ${name} ${s}: add -s for one person.`
    });
  });
  return out.map((q) => ({ ...q, options: shuffle(rng, q.options) }));
};

/* ---------------------------------------------------------- Developing ---- */
/* [base, -s form, past, object, irregular past?] */
const DEV_VERBS = [
  ['feed', 'feeds', 'fed', 'the ducks', true], ['water', 'waters', 'watered', 'the plants'],
  ['bake', 'bakes', 'baked', 'bread'], ['build', 'builds', 'built', 'a sandcastle', true],
  ['catch', 'catches', 'caught', 'the bus', true], ['buy', 'buys', 'bought', 'fresh fruit', true],
  ['bring', 'brings', 'brought', 'lunch', true], ['write', 'writes', 'wrote', 'a story', true],
  ['take', 'takes', 'took', 'the train', true], ['sell', 'sells', 'sold', 'lemonade', true],
  ['drink', 'drinks', 'drank', 'orange juice', true], ['fly', 'flies', 'flew', 'a kite', true],
  ['wash', 'washes', 'washed', 'the car'], ['clean', 'cleans', 'cleaned', 'the classroom'],
  ['visit', 'visits', 'visited', 'the library'], ['plant', 'plants', 'planted', 'seeds'],
  ['watch', 'watches', 'watched', 'a film'], ['play', 'plays', 'played', 'chess'],
  ['cook', 'cooks', 'cooked', 'dinner'], ['carry', 'carries', 'carried', 'the shopping'],
  ['study', 'studies', 'studied', 'science'], ['fix', 'fixes', 'fixed', 'the bike'],
  ['pack', 'packs', 'packed', 'a picnic'], ['paint', 'paints', 'painted', 'the fence'],
  ['sweep', 'sweeps', 'swept', 'the floor', true], ['make', 'makes', 'made', 'pancakes', true],
  ['ring', 'rings', 'rang', 'the bell', true], ['meet', 'meets', 'met', 'friends', true],
  ['tidy', 'tidies', 'tidied', 'the room'], ['ride', 'rides', 'rode', 'horses', true]
];

const buildDeveloping = () => {
  const rng = seeded(5200);
  const out = [];
  DEV_VERBS.forEach(([base, s, past, obj, irregular], i) => {
    const name = NAMES[(i + 2) % NAMES.length];
    const ing = base.endsWith('e') && !base.endsWith('ee') ? `${base.slice(0, -1)}ing` : `${base}ing`;
    out.push({
      sentence: `${name} ___ ${obj} every day.`, verb: base, answer: s, options: [s, base, ing], level: 1,
      explain: `Present simple: one person, so add -s: "${s}".`
    });
    out.push({
      sentence: `Last week, we ___ ${obj}.`, verb: base, answer: past, options: [past, `will ${base}`, base], level: irregular ? 2 : 1,
      explain: `"Last week" is the past: "${past}".`
    });
    out.push({
      sentence: `Tomorrow, we ___ ${obj}.`, verb: base, answer: `will ${base}`, options: [`will ${base}`, past, ing], level: 2,
      explain: `"Tomorrow" is the future: "will ${base}".`
    });
    // Questions and negatives keep the base form after did/will/didn't.
    const k = i % 3;
    if (k === 0) {
      out.push({
        sentence: `Did you ___ ${obj} yesterday?`, verb: base, answer: base, options: [base, past, s], level: 3,
        explain: `After "did", use the base form: "${base}".`
      });
    } else if (k === 1) {
      out.push({
        sentence: `We didn't ___ ${obj} last night.`, verb: base, answer: base, options: [base, past, s], level: 3,
        explain: `After "didn't", use the base form: "${base}".`
      });
    } else {
      out.push({
        sentence: `Will you ___ ${obj} next week?`, verb: base, answer: base, options: [base, past, s], level: 3,
        explain: `After "will", use the base form: "${base}".`
      });
    }
  });
  return out.map((q) => ({ ...q, options: shuffle(rng, q.options) }));
};

/* ------------------------------------------------------ Hand-written bands -- */
/* [sentence, verb, answer, [wrong, wrong, wrong], explanation]; level by position. */
const INTERMEDIATE = [
  ['Listen! The baby ___ in the next room.', 'cry', 'is crying', ['cries', 'cried', 'cry'], '"Listen!" means it is happening now: present continuous.'],
  ['Please be quiet. I ___ for my test right now.', 'study', 'am studying', ['study', 'studied', 'was studying'], '"Right now" takes the present continuous.'],
  ['At the moment, my parents ___ dinner.', 'cook', 'are cooking', ['cook', 'cooked', 'were cooking'], '"At the moment" takes the present continuous.'],
  ['Water ___ at 100 degrees Celsius at sea level.', 'boil', 'boils', ['is boiling', 'boiled', 'boil'], 'A scientific fact takes the present simple.'],
  ['Look! It ___ again.', 'snow', 'is snowing', ['snows', 'snowed', 'was snowing'], '"Look!" means now: present continuous.'],
  ['She usually ___ to school, but today she is taking the bus.', 'walk', 'walks', ['is walking', 'walked', 'walk'], '"Usually" is a habit: present simple.'],
  ['I ___ TV when the phone rang.', 'watch', 'was watching', ['am watching', 'watch', 'watches'], 'A longer action interrupted in the past: past continuous.'],
  ['They ___ football when it started to rain.', 'play', 'were playing', ['are playing', 'play', 'plays'], 'An action in progress when something happened: past continuous.'],
  ['Last Sunday, we ___ my grandparents.', 'visit', 'visited', ['visit', 'are visiting', 'will visit'], '"Last Sunday" is a finished time: past simple.'],
  ['These days, he ___ his homework every evening.', 'do', 'does', ['did', 'done', 'doing'], 'A current habit: present simple, "does".'],
  ['The Earth ___ around the Sun.', 'move', 'moves', ['moved', 'move', 'moving'], 'A fact: present simple, with -s for "the Earth".'],
  ['Right now, the children ___ in the garden.', 'play', 'are playing', ['play', 'played', 'plays'], '"Right now": present continuous.'],
  ['Yesterday at 6 p.m., I ___ my bike.', 'ride', 'was riding', ['am riding', 'ride', 'rides'], 'In progress at a past moment: past continuous.'],
  ['We ___ a new car last month.', 'buy', 'bought', ['buy', 'buyed', 'are buying'], '"Last month": past simple. "Buy" becomes "bought".'],
  ['Ravi ___ his leg while he was skiing.', 'break', 'broke', ['breaks', 'is breaking', 'breaked'], 'A finished past event: "broke".'],
  ['Next summer, we ___ to Kerala.', 'travel', 'will travel', ['travelled', 'were travelling', 'travels'], '"Next summer" is the future.'],
  ['Look at those dark clouds! It ___ rain.', 'go', 'is going to', ['was going to', 'goes to', 'went to'], 'A prediction from what we can see now: "is going to".'],
  ['This time tomorrow, I ___ on the beach.', 'lie', 'will be lying', ['was lying', 'lie', 'lay'], 'In progress at a future moment: future continuous.'],
  ['While Mum ___ the car, I washed the dog.', 'clean', 'was cleaning', ['is cleaning', 'cleans', 'will clean'], 'Two past actions in progress together: past continuous.'],
  ['When we arrived, the teacher ___ a story.', 'read', 'was reading', ['is reading', 'reads', 'will read'], 'In progress when we arrived: past continuous.'],
  ['I ___ you as soon as I get home.', 'call', 'will call', ['called', 'was calling', 'calls'], 'A promise about the future: "will call".'],
  ['The train ___ at 9 a.m. every day.', 'leave', 'leaves', ['leave', 'leaving', 'is leave'], 'A timetable: present simple.'],
  ['My brother ___ in Delhi this year, but he usually lives in Pune.', 'stay', 'is staying', ['stays', 'stayed', 'stay'], 'A temporary situation: present continuous.'],
  ["Sorry, I can't talk now. I ___.", 'drive', 'am driving', ['drive', 'drove', 'was driving'], '"Now": present continuous.'],
  ['She ___ a letter when the lights went out.', 'write', 'was writing', ['is writing', 'writes', 'will write'], 'Interrupted in the past: past continuous.'],
  ['If it rains tomorrow, we ___ indoors.', 'stay', 'will stay', ['stayed', 'stays', 'staying'], 'First conditional: if + present, will + verb.'],
  ['Ten years ago, there ___ no park here.', 'be', 'was', ['is', 'will be', 'are'], '"Ten years ago": past simple, "was".'],
  ['Shh! The baby ___.', 'sleep', 'is sleeping', ['sleeps', 'slept', 'was sleeping'], '"Shh!" means now: present continuous.'],
  ['They ___ the match last night.', 'win', 'won', ['win', 'winned', 'are winning'], '"Last night": past simple. "Win" becomes "won".'],
  ['Every year, the festival ___ thousands of visitors.', 'attract', 'attracts', ['attract', 'attracting', 'is attract'], 'A regular event: present simple with -s.'],
  ['I ___ to music while I was doing my homework.', 'listen', 'was listening', ['am listening', 'listen', 'will listen'], 'Two past actions in progress: past continuous.'],
  ['He ___ along the road when he saw an old friend.', 'walk', 'was walking', ['is walking', 'walks', 'will walk'], 'Interrupted in the past: past continuous.'],
  ['What ___ you doing at 8 o\'clock last night?', 'be', 'were', ['are', 'was', 'will'], 'Past continuous question with "you": "were".'],
  ['We ___ for the bus when it began to hail.', 'wait', 'were waiting', ['are waiting', 'wait', 'waits'], 'In progress when it began: past continuous.'],
  ['The sun ___ in the west.', 'set', 'sets', ['setted', 'setting', 'were setting'], 'A fact: present simple, "sets".'],
  ["I'm sure you ___ the exam next week.", 'pass', 'will pass', ['passed', 'were passing', 'passing'], 'A prediction about next week: "will pass".'],
  ["Right now, Priya ___ a cake for her sister's birthday.", 'bake', 'is baking', ['bakes', 'baked', 'was baking'], '"Right now": present continuous.'],
  ['At 7 o\'clock this morning, I ___ breakfast.', 'have', 'was having', ['am having', 'have', 'will have'], 'In progress at a past time: past continuous.'],
  ['Our team usually ___ on Saturdays.', 'train', 'trains', ['training', 'train', 'is train'], 'A habit: present simple with -s.'],
  ['Be careful! You ___ that glass.', 'drop', 'are going to drop', ['dropped', 'were dropping', 'drops'], 'Something about to happen that we can see: "going to".'],
  ['When I was young, I ___ in a small village.', 'live', 'lived', ['live', 'am living', 'will live'], 'A finished past situation: past simple.'],
  ['Can you turn off the kettle? It ___ loudly right now.', 'whistle', 'is whistling', ['whistles', 'whistled', 'was whistling'], '"Right now": present continuous.'],
  ['Last night, while I ___, someone knocked on the door.', 'sleep', 'was sleeping', ['am sleeping', 'sleep', 'will sleep'], 'Interrupted in the past: past continuous.'],
  ['They ___ their grandparents next weekend; the tickets are booked.', 'visit', 'are visiting', ['visited', 'were visiting', 'visits'], 'A fixed future plan: present continuous.'],
  ['Tomorrow at noon, we ___ across the lake.', 'sail', 'will be sailing', ['were sailing', 'sailed', 'sails'], 'In progress at a future time: future continuous.']
];

const ANALYTICAL = [
  ['I have never ___ sushi.', 'eat', 'eaten', ['ate', 'eat', 'eated'], 'Present perfect: have + past participle "eaten".'],
  ['She ___ in this city since 2015.', 'live', 'has lived', ['lives', 'lived', 'is living'], '"Since 2015" to now: present perfect.'],
  ['We ___ each other for ten years.', 'know', 'have known', ['know', 'knew', 'are knowing'], 'Up to now, with "for": present perfect.'],
  ['Have you ever ___ a horse?', 'ride', 'ridden', ['rode', 'rided', 'ride'], 'Have + past participle: "ridden".'],
  ['He has already ___ the letter.', 'write', 'written', ['wrote', 'writed', 'write'], 'Has + past participle: "written".'],
  ['The shop has just ___.', 'close', 'closed', ['close', 'closing', 'closes'], 'Has + past participle: "closed".'],
  ['They have ___ to Paris twice.', 'be', 'been', ['be', 'was', 'being'], 'Have + past participle of "be": "been".'],
  ['I have ___ my phone. Have you seen it?', 'lose', 'lost', ['lose', 'losed', 'loosed'], 'Have + past participle: "lost".'],
  ['The bell has already ___.', 'ring', 'rung', ['rang', 'ringed', 'ring'], 'Ring, rang, rung: has + "rung".'],
  ['She has ___ the same dress three times this month.', 'wear', 'worn', ['wore', 'weared', 'wear'], 'Wear, wore, worn: has + "worn".'],
  ['We ___ lunch yet.', 'not have', "haven't had", ["don't have", "hadn't have", "haven't have"], '"Yet" with the present perfect negative.'],
  ['Has anyone ___ my umbrella?', 'see', 'seen', ['saw', 'seed', 'see'], 'See, saw, seen: has + "seen".'],
  ['The river has ___ after the heavy rain.', 'rise', 'risen', ['rose', 'rised', 'raised'], 'Rise, rose, risen. ("Raise" needs an object.)'],
  ['I have ___ three glasses of water today.', 'drink', 'drunk', ['drank', 'drinked', 'drink'], 'Drink, drank, drunk: have + "drunk".'],
  ['He has ___ his arm playing cricket.', 'break', 'broken', ['broke', 'breaked', 'break'], 'Break, broke, broken: has + "broken".'],
  ['By the time we arrived, the film ___.', 'begin', 'had begun', ['began', 'has begun', 'begins'], 'Earlier than another past moment: past perfect.'],
  ['She ___ the report before the meeting started.', 'finish', 'had finished', ['has finished', 'finishes', 'will finish'], 'Before another past event: past perfect.'],
  ['When I got to the station, the train had already ___.', 'leave', 'left', ['leave', 'leaved', 'leaving'], 'Had + past participle: "left".'],
  ['I realised I ___ my wallet at home.', 'leave', 'had left', ['have left', 'leave', 'leaves'], 'Earlier than "realised": past perfect.'],
  ['Before their trip to Shimla, they had never ___ snow.', 'see', 'seen', ['saw', 'see', 'seed'], 'Had + past participle: "seen".'],
  ['After he ___ dinner, he went for a walk.', 'eat', 'had eaten', ['has eaten', 'eats', 'will eat'], 'The earlier of two past actions: past perfect.'],
  ['By next June, I ___ here for five years.', 'work', 'will have worked', ['have worked', 'had worked', 'worked'], 'Up to a future point: future perfect.'],
  ['By the end of today, we ___ all the tickets.', 'sell', 'will have sold', ['had sold', 'will sold', 'sold'], 'Complete before a future time: future perfect.'],
  ['The children were tired because they ___ all afternoon.', 'swim', 'had swum', ['have swum', 'swim', 'will swim'], 'Earlier than "were tired": past perfect.'],
  ['She ___ the piano since she was six.', 'play', 'has played', ['plays', 'played', 'is playing'], '"Since she was six" to now: present perfect.'],
  ['This is the best meal I have ever ___.', 'eat', 'eaten', ['ate', 'eat', 'eating'], 'Have + past participle: "eaten".'],
  ['The company ___ three new shops so far this year.', 'open', 'has opened', ['opens', 'had opened', 'is opening'], '"So far this year": present perfect.'],
  ['They have ___ a new bridge over the river.', 'build', 'built', ['builded', 'build', 'building'], 'Build, built, built.'],
  ['The ship had ___ before help arrived.', 'sink', 'sunk', ['sank', 'sinked', 'sink'], 'Sink, sank, sunk: had + "sunk".'],
  ['He has ___ across the river twice this week.', 'swim', 'swum', ['swam', 'swimmed', 'swim'], 'Swim, swam, swum: has + "swum".'],
  ['The wind had ___ the tent away by morning.', 'blow', 'blown', ['blew', 'blowed', 'blow'], 'Blow, blew, blown: had + "blown".'],
  ['She has ___ a new hobby: pottery.', 'choose', 'chosen', ['chose', 'choosed', 'choose'], 'Choose, chose, chosen.'],
  ['By the time the police came, the thief had ___.', 'flee', 'fled', ['fleed', 'flew', 'flee'], 'Flee, fled, fled. ("Flew" is from "fly".)'],
  ['The lake has ___ over completely.', 'freeze', 'frozen', ['froze', 'freezed', 'freeze'], 'Freeze, froze, frozen.'],
  ['Have you ___ the news?', 'hear', 'heard', ['heared', 'hear', 'hearing'], 'Hear, heard, heard.'],
  ['The dog has ___ the postman again!', 'bite', 'bitten', ['bit', 'bited', 'bite'], 'Bite, bit, bitten.'],
  ['I had ___ in bed all morning with a cold.', 'lie', 'lain', ['laid', 'lay', 'lied'], 'Lie (rest), lay, lain. "Laid" is from "lay"; "lied" means told a lie.'],
  ['She has ___ the table for dinner.', 'lay', 'laid', ['lain', 'layed', 'lay'], 'Lay (put down), laid, laid.'],
  ['Prices have ___ sharply this year.', 'rise', 'risen', ['rose', 'raised', 'rised'], 'Rise, rose, risen. "Raise" needs an object.'],
  ['He had ___ the whole cake before anyone noticed.', 'eat', 'eaten', ['ate', 'eated', 'eat'], 'Had + past participle: "eaten".'],
  ['Have you ever ___ a mistake you regretted?', 'make', 'made', ['maked', 'make', 'making'], 'Make, made, made.'],
  ['The audience had ___ home by the time the singer arrived.', 'go', 'gone', ['went', 'goed', 'go'], 'Go, went, gone: had + "gone".'],
  ['I have ___ this route many times before.', 'drive', 'driven', ['drove', 'drived', 'drive'], 'Drive, drove, driven.'],
  ['Our team has ___ every match this season.', 'win', 'won', ['winned', 'win', 'wins'], 'Win, won, won.'],
  ['She had ___ him the answer before the test began.', 'tell', 'told', ['telled', 'tell', 'tells'], 'Tell, told, told.']
];

const ADVANCED = [
  ["I ___ for over an hour, and the bus still hasn't come.", 'wait', 'have been waiting', ['had been waiting', 'am waiting', 'waited'], 'Still going on, with "for": present perfect continuous.'],
  ['She is tired because she ___ all day.', 'work', 'has been working', ['had been working', 'works', 'will be working'], 'A recent activity explaining the present: present perfect continuous.'],
  ['If it ___ tomorrow, the match will be cancelled.', 'rain', 'rains', ['will rain', 'rained', 'would rain'], 'First conditional: if + present simple.'],
  ['If I ___ a million rupees, I would travel the world.', 'have', 'had', ['have', 'will have', 'would have'], 'Second conditional: if + past simple.'],
  ['If you heat ice, it ___.', 'melt', 'melts', ['melted', 'would melt', 'had melted'], 'Zero conditional (a fact): present + present.'],
  ['They ___ in the garden for hours when the storm broke.', 'dig', 'had been digging', ['have been digging', 'are digging', 'will be digging'], 'Going on up to a past moment: past perfect continuous.'],
  ['How long ___ you been learning French? I started last year.', 'helping verb', 'have', ['has', 'did', 'are'], 'Present perfect continuous question: "have you been".'],
  ['If I were you, I ___ apologise.', 'helping verb', 'would', ['will', 'am', 'had'], 'Advice with "If I were you": "would".'],
  ['Unless you hurry, you ___ the train.', 'miss', 'will miss', ['missed', 'would have missed', 'miss'], '"Unless" works like a first conditional.'],
  ["She said, 'I will call you tomorrow.' She said that she ___ me the next day.", 'call', 'would call', ['will call', 'called', 'calls'], 'Reported speech: "will" becomes "would".'],
  ['If we ___ earlier, we would have caught the train.', 'leave', 'had left', ['left', 'have left', 'would leave'], 'Third conditional: if + past perfect.'],
  ['If she had studied harder, she ___ the exam.', 'pass', 'would have passed', ['will pass', 'had passed', 'passed'], 'Third conditional: would have + past participle.'],
  ["Tom said, 'I have finished my homework.' Tom said that he ___ his homework.", 'finish', 'had finished', ['has finished', 'finishes', 'will finish'], 'Reported speech: present perfect becomes past perfect.'],
  ['She asked me where I ___.', 'live', 'lived', ['did I live', 'do I live', 'living'], 'Reported questions use statement order and shift back.'],
  ['He told us that the meeting ___ been cancelled the day before.', 'have', 'had', ['has', 'have', 'having'], '"The day before" in reported speech: past perfect.'],
  ['The bridge ___ in 1932.', 'build', 'was built', ['built', 'has been built', 'is built'], 'Passive with a past date: "was built".'],
  ['The results ___ next Monday.', 'announce', 'will be announced', ['were announced', 'have announced', 'announced'], 'Future passive: "will be announced".'],
  ['By the time she retired, she ___ at the school for thirty years.', 'teach', 'had been teaching', ['has been teaching', 'is teaching', 'will be teaching'], 'Up to a past moment: past perfect continuous.'],
  ['I wish I ___ the answer now.', 'know', 'knew', ['know', 'will know', 'had known'], 'A wish about the present: past simple.'],
  ['If only I ___ to her advice last year!', 'listen', 'had listened', ['listened', 'have listened', 'would listen'], 'A regret about the past: past perfect.'],
  ['She asked whether I ___ to the party the following week.', 'come', 'would come', ['will come', 'come', 'am coming'], 'Reported question about the future: "would".'],
  ['The letter ___ by the time we got home.', 'deliver', 'had been delivered', ['has been delivered', 'was delivering', 'delivers'], 'Passive, earlier than another past event: past perfect passive.'],
  ['Had I known about the traffic, I ___ earlier.', 'leave', 'would have left', ['would leave', 'will leave', 'had left'], 'Inverted third conditional: would have + past participle.'],
  ['They ___ the app for six months before they found the error.', 'develop', 'had been developing', ['have been developing', 'are developing', 'will develop'], 'Going on before a past event: past perfect continuous.'],
  ['If he ___ his passport, he would be on the plane now.', 'not lose', "hadn't lost", ["didn't lose", "hasn't lost", "wouldn't lose"], 'Mixed conditional: past cause, present result.'],
  ['If I were taller, I ___ the top shelf right now.', 'reach', 'could reach', ['could have reached', 'can reach', 'will reach'], 'Second conditional, present result: "could reach".'],
  ['She said she ___ the film twice already.', 'see', 'had seen', ['has seen', 'sees', 'will see'], 'Reported speech: present perfect becomes past perfect.'],
  ['Yesterday he asked me if I ___ the report the week before.', 'finish', 'had finished', ['have finished', 'finish', 'will finish'], 'Reported question about an earlier time: past perfect.'],
  ['By 2030, scientists ___ this disease for over two decades.', 'study', 'will have been studying', ['have been studying', 'had been studying', 'are studying'], 'Going on up to a future point: future perfect continuous.'],
  ['Not until the lights went out ___ how late it was.', 'we realise', 'did we realise', ['we realised', 'we did realise', 'had we realise'], '"Not until" at the start inverts: "did we realise".'],
  ['Hardly ___ the house when it started to rain.', 'we leave', 'had we left', ['we had left', 'have we left', 'we left'], '"Hardly ... when" takes inverted past perfect.'],
  ['She would have won the race if she ___.', 'not fall', "hadn't fallen", ["didn't fall", "wouldn't fall", "hasn't fallen"], 'Third conditional: if + past perfect.'],
  ["It's time we ___ home.", 'go', 'went', ['go', 'will go', 'have gone'], '"It\'s time" + subject takes the past simple.'],
  ["I'd rather you ___ smoke in here.", 'do not', "didn't", ["don't", "won't", 'not'], '"I\'d rather" + another person takes the past simple.'],
  ['The manager said that the new system ___ next month.', 'introduce', 'would be introduced', ['will introduce', 'is introducing', 'introduced'], 'Reported speech, future passive: "would be introduced".'],
  ['Supposing you ___ the lottery, what would you do?', 'win', 'won', ['win', 'will win', 'had won'], '"Supposing" works like "if": second conditional.'],
  ['By the time you read this, I ___ for Mumbai.', 'leave', 'will have left', ['had left', 'will leave', 'left'], 'Complete before a future moment: future perfect.'],
  ['The suspect is believed ___ the country last night.', 'leave', 'to have left', ['to leave', 'leaving', 'to be leaving'], 'A past action after "is believed": perfect infinitive.'],
  ['She ___ English for ten years before she moved to London.', 'study', 'had been studying', ['has been studying', 'is studying', 'will have studied'], 'Going on before a past event: past perfect continuous.'],
  ['If the alarm had gone off, we ___ late now.', 'not be', "wouldn't be", ["wouldn't have been", "won't be", "weren't"], 'Mixed conditional: past cause, present result.'],
  ['He denied ___ the window.', 'break', 'having broken', ['to break', 'to have broke', 'break'], '"Deny" takes the -ing form; "having broken" for an earlier action.'],
  ['No sooner ___ home than the phone rang.', 'I arrive', 'had I arrived', ['I had arrived', 'have I arrived', 'I arrived'], '"No sooner ... than" takes inverted past perfect.'],
  ['The teacher asked us what we ___ during the holidays.', 'do', 'had done', ['have done', 'did we do', 'do we do'], 'Reported question: statement order, shifted back.'],
  ['If she ___ harder now, she would get better marks.', 'work', 'worked', ['works', 'had worked', 'will work'], 'Second conditional: if + past simple.'],
  ['By this time next year, they ___ the new stadium.', 'complete', 'will have completed', ['have completed', 'had completed', 'will complete'], 'Complete before a future time: future perfect.']
];

const handWritten = (rows, seed, cuts) => {
  const rng = seeded(seed);
  return rows.map(([sentence, verb, answer, wrong, explain], i) => ({
    sentence,
    verb,
    answer,
    options: shuffle(rng, [answer, ...wrong]),
    level: i < cuts[0] ? 1 : i < cuts[1] ? 2 : 3,
    explain
  }));
};

let cache = null;
/** Every band's Tense Pick questions, built once. */
export const tenseBands = () => {
  if (cache) return cache;
  const tag = (list) => list.map((q) => ({ kind: 'tense', ...q, note: q.explain }));
  cache = {
    foundation: tag(buildFoundation()),
    developing: tag(buildDeveloping()),
    intermediate: tag(handWritten(INTERMEDIATE, 5300, [15, 30])),
    analytical: tag(handWritten(ANALYTICAL, 5400, [15, 28])),
    advanced: tag(handWritten(ADVANCED, 5500, [10, 24]))
  };
  return cache;
};
