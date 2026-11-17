/**
 * Context Detective — short passages with one unfamiliar word ([[word]]) and
 * the clue words that give its meaning away ({clue}). Pure and seeded.
 *
 * Bank lines: 'passage|meaning|wrong1;wrong2;wrong3'. Markers sit on whole
 * space-separated tokens (punctuation may sit outside the braces).
 */
import { sample, shuffle } from '../seeded.js';

/* Easy (2026-11-16, the user: start in simple English): short sentences, everyday words, clear clues. */
const EASY = [
  'The cake was [[delicious]]; everyone {loved} the {sweet} {taste} and asked for {more}.|very tasty|very hard;very cold;very small',
  'It was so [[chilly]] outside that we wore {jackets}, {scarves} and {gloves}.|cold|hot;rainy;dark',
  'The baby began to [[giggle]] when Dad {made} {funny} {faces} at her.|laugh softly|cry loudly;fall asleep;eat',
  'After playing in the rain, Ravi was [[soaked]]; his {clothes} were {dripping} {wet}.|very wet|very dirty;very tired;very happy',
  'The puppy was [[tiny]]; it could fit {inside} my {small} {hand}.|very small|very big;very old;very loud',
  'I was [[starving]] because I had {not} {eaten} {all} {day}.|very hungry|very sleepy;very cold;very sick',
  'The library was [[silent]]; {nobody} {talked} and you could {not} {hear} a sound.|very quiet|very busy;very bright;very old',
  'Mum was [[proud]] of me when I {won} the {prize}, and she {smiled} all day.|pleased because of what someone did|angry;afraid;bored',
  'The old bridge was [[weak]], so {heavy} {trucks} were {not} {allowed} to cross it.|not strong|very long;very new;very pretty',
  'The rabbit was so [[swift]] that the dog could {not} {catch} it; it ran {very} {fast}.|fast|slow;sleepy;hungry',
  'The room was [[messy]], with {toys}, {clothes} and {books} {everywhere} on the floor.|untidy|clean;dark;cold',
  'The test was [[simple]]; {everyone} {finished} it {quickly} and {easily}.|easy|very hard;very long;boring',
  'Tara felt [[lonely]] at the new school because she had {no} {friends} to {play} with.|sad because of being alone|excited;angry;sleepy',
  'The giant was [[huge]]; he was {taller} {than} the {houses} in the village.|very big|very small;very kind;very fast',
  'Please [[whisper]] in the classroom; {speak} {very} {softly} so nobody is disturbed.|speak very quietly|shout;sing;run',
  'The soup was [[scalding]], so I {waited} for it to {cool} before I could {sip} it.|extremely hot|very salty;very cold;very thick',
  'Our cat is [[lazy]]; she {sleeps} {all} {day} and {never} wants to play.|not wanting to do anything|very active;very hungry;very clever',
  'The sky looked [[stormy]], with {dark} {clouds}, {thunder} and a strong {wind}.|with bad weather coming|clear and sunny;very hot;very calm',
  'The shoes were [[filthy]] after the football match; they were {covered} in {mud}.|very dirty|brand new;very wet;too small',
  'Grandpa was [[thrilled]] to see us; he {laughed}, {hugged} us and {danced} with joy.|very excited and happy|very sad;very tired;very angry',
  'The water was [[shallow]], so even the {little} children could {stand} with their {heads} {above} it.|not deep|very deep;very cold;very dirty',
  'The lion gave a [[mighty]] roar, so {loud} and {strong} that it {shook} the trees.|very powerful|very soft;very short;very funny'
];

const INTERMEDIATE = [
  'After a long hike with {no} {lunch}, Meera was [[famished]] and {gobbled} three {plates} of rice.|extremely hungry|very tired;extremely angry;slightly cold',
  'The medicine made Arjun so [[drowsy]] that he kept {yawning} and could {barely} keep his {eyes} {open}.|sleepy|excited;hungry;noisy',
  'The [[timid]] kitten {hid} behind the sofa and {trembled} whenever anyone came {near}.|shy and easily frightened|playful and loud;very hungry;fast and strong',
  'Nothing grew in the [[arid]] land because it had {not} {rained} for {years} and the soil was {cracked}.|very dry|very cold;very green;crowded with people',
  'Handle the box gently; the glass vase inside is [[fragile]] and could {break} at the {slightest} {bump}.|easily broken|very heavy;very old;brightly coloured',
  'The team was [[jubilant]] after winning the final; players {cheered}, {hugged} and {danced} on the field.|full of joy|exhausted;nervous;disappointed',
  'Priya was [[reluctant]] to jump into the cold pool; she {hesitated} at the edge and {slowly} {backed} {away}.|unwilling|eager;proud;angry',
  'Water was [[abundant]] after the monsoon; every well was {full} and {plenty} was left over for the fields.|more than enough|dirty;scarce;frozen',
  'The house had been [[vacant]] for months; {nobody} {lived} there and every room was {empty}.|empty, with no one living in it|crowded;newly built;brightly painted',
  'The clown was so [[hilarious]] that the whole audience {laughed} until their {sides} {ached}.|extremely funny|very sad;boring;frightening',
  'Unlike his {careless} brother, Sam is [[cautious]]; he always {checks} {twice} before crossing the road.|careful|reckless;lazy;cheerful',
  'The elephant looked [[enormous]] next to the {tiny} mouse; it was even {bigger} than our {car}.|huge|very small;grey;noisy',
  'The [[obedient]] puppy {followed} {every} {command}: it sat, stayed and came whenever it was called.|following orders|naughty;stubborn;sleepy',
  'After falling into the puddle, my sandwich was [[soggy]]; the bread was {wet} and {mushy}.|wet and soft|dry and crunchy;burnt;frozen',
  'The [[ancient]] temple was built {thousands} of {years} {ago}, long before any city stood nearby.|very old|very tall;brand new;very sacred',
  'Dad was [[furious]] when he saw the broken window; his face went {red} and he {shouted} at us.|very angry|very happy;very calm;surprised',
  'Our [[generous]] neighbour {shares} her mangoes with everyone and never {asks} for {anything} in {return}.|willing to give freely|greedy;strict;forgetful',
  'The sky was [[gloomy]] all day, with {dark} {clouds}, {no} {sunshine} and a cold drizzle.|dark and dull|bright and cheerful;very hot;noisy and busy',
  'Food became [[scarce]] during the drought; {only} a {few} {grains} were {left} in the store.|in short supply|plentiful;rotten;delicious',
  'The [[agile]] monkey {leapt} from branch to branch {quickly} and {easily}.|moving quickly and easily|lazy and slow;very large;very noisy',
  'The new student looked [[bewildered]]; she did {not} {know} which way to go and kept {asking} for {directions}.|confused|delighted;bored;sleepy',
  'Grandma will [[mend]] my torn shirt; she will {stitch} the {hole} so I can {wear} it {again}.|repair|wash;throw away;buy',
  'Rahul is always [[punctual]]; he {arrives} {exactly} on {time} for every class.|on time|late;noisy;polite',
  'The deer was [[wary]] of the strangers; it {kept} its {distance} and {watched} them {carefully}.|cautious and alert to danger|friendly;hungry;injured'
];

const ANALYTICAL = [
  'Fame on social media is often [[ephemeral]]; a video that is popular {today} is {forgotten} by {next} {week}.|lasting a very short time|permanent;dishonest;widely shared',
  'Unlike her {shy} sister, Ananya is [[gregarious]]; she {loves} {parties} and {chats} happily with {strangers}.|sociable, enjoying company|quiet and shy;greedy;well-dressed',
  'His reply was [[laconic]]: {just} {one} {word}, "Fine", and {nothing} {more}.|using very few words|rude;long-winded;cheerful',
  'The [[meticulous]] editor {checked} {every} {comma} and {date} {twice} before the book was printed.|extremely careful about details|lazy;fast;forgetful',
  'I value your [[candid]] review; you {honestly} told me what was {wrong} {without} {hiding} anything.|frank and honest|flattering;brief;confusing',
  'After the heavy lunch the whole class felt [[lethargic]]; {no} {one} had the {energy} to {move}.|sluggish, lacking energy|full of energy;anxious;excited',
  'The instruction was [[ambiguous]]; it {could} {mean} {two} {different} {things}, so half the class did the wrong task.|open to more than one meaning|perfectly clear;very long;too difficult',
  'The [[benevolent]] king {built} {free} {schools} and {fed} the {poor} from his own treasury.|kind and generous|cruel;wealthy;powerful',
  'Typewriters are now largely [[obsolete]]; {computers} have {replaced} them and {few} people still {use} them.|no longer used, out of date|expensive;brand new;broken',
  'Before signing, she [[scrutinised]] the contract, {reading} {each} {line} {closely} for hidden fees.|examined closely|skimmed quickly;ignored;copied out',
  'The [[resilient]] village was {rebuilt} within a year of the flood; its people {bounced} {back} {quickly}.|able to recover quickly from difficulty|easily damaged;very rich;very old',
  'Rather than wait for a perfect plan, the [[pragmatic]] engineer chose a {simple} fix that {worked} right {now}.|practical, focused on what works|idealistic;lazy;careless',
  'In a room full of black suits, his bright orange jacket was [[conspicuous]]; {everyone} {noticed} it {immediately}.|easily noticed|hidden;expensive;ugly',
  'My grandfather is [[frugal]]: he {reuses} {envelopes}, {repairs} old shoes and {never} {wastes} money.|careful with money, thrifty|wasteful;poor;grumpy',
  'She was [[elated]] when the results came out; she {jumped} for {joy} and {called} everyone she knew.|extremely happy|deeply upset;nervous;exhausted',
  'The [[tenacious]] climber {failed} {twice} but {refused} to {give} {up}, and reached the summit on her third try.|persistent, not giving up|fearful;lucky;impatient',
  'The trek was [[arduous]]: {steep} {slopes}, {thin} {air} and {hours} of climbing left us {exhausted}.|very difficult and tiring|short and easy;scenic;crowded',
  'Mobile phones are [[ubiquitous]]; you see them {everywhere}: in {buses}, {schools}, {markets} and even {fields}.|found everywhere|rare;costly;harmful',
  'The speech was so [[verbose]] that a {five-minute} idea took {an} {hour}, buried in {endless} extra {words}.|using too many words|very short;very funny;very loud',
  'Her handwriting is [[impeccable]]; there is {not} a {single} {mistake} or {smudge} on any page.|flawless|messy;tiny;slow',
  'Students who [[procrastinate]] {leave} their {assignments} {until} the {last} {minute} and then rush.|delay doing things|work ahead early;cheat;complain',
  'Kiran felt [[apprehensive]] before the interview; his {hands} {shook} and he {worried} about every question.|anxious about what may happen|confident;bored;angry',
  'Planting trees helps [[mitigate]] flooding by {reducing} the {amount} of water that rushes into rivers.|make less severe|cause;predict;measure',
  'Even with a high fever the patient was [[lucid]]; he {spoke} {clearly} and {understood} every question.|thinking and speaking clearly|confused;feverish;silent'
];

/** Split a passage into tokens: { text, target, clue }. */
export const tokenize = (passage) =>
  passage.split(' ').map((raw) => ({
    text: raw.replace(/\[\[|\]\]|[{}]/g, ''),
    target: raw.includes('[['),
    clue: raw.includes('{')
  }));

const parse = (line, band, i) => {
  const [passage, meaning, wrong] = line.split('|');
  const tokens = tokenize(passage);
  const word = tokens.find((t) => t.target).text.replace(/[^A-Za-z-]/g, '');
  return { id: `${band[0]}${i}`, band, tokens, word, meaning, wrong: wrong.split(';') };
};

export const PASSAGES = {
  easy: EASY.map((l, i) => parse(l, 'easy', i)),
  intermediate: INTERMEDIATE.map((l, i) => parse(l, 'intermediate', i)),
  analytical: ANALYTICAL.map((l, i) => parse(l, 'analytical', i))
};

export const contextBand = (ageBand) => (ageBand === 'analytical' || ageBand === 'advanced' ? 'analytical' : 'intermediate');

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

/**
 * rounds   — passages in the level
 * maxTaps  — clue words a player may mark before locking in
 * pass     — points needed (each passage is worth 4: clues 2, meaning 2)
 * pool     — which words (2026-11-16, the user: start easy, grow harder): easy → intermediate → analytical
 * mixIn    — share of passages from the next, harder pool
 *
 *   Classes 6–8:  levels 1–6 easy · 7–15 intermediate · 16+ intermediate with a quarter harder
 *                 (Medium starts at level 4, Hard mixes harder words in from the start)
 *   Classes 9–10: levels 1–4 intermediate · then analytical
 */
export const contextConfig = (ageBand, difficulty = 1, levelNo = 1) => {
  const band = contextBand(ageBand);
  const d = clamp(difficulty || 1, 1, 3);
  const t = clamp((levelNo - 1) / 29, 0, 1);
  const rounds = band === 'intermediate' ? 5 + (d >= 2 ? 1 : 0) + (t >= 0.5 ? 1 : 0) : 6 + (d >= 2 ? 1 : 0) + (t >= 0.5 ? 1 : 0);
  let pool;
  let mixIn = 0;
  if (band === 'analytical') pool = levelNo <= 4 && d === 1 ? 'intermediate' : 'analytical';
  else if (d === 3) { pool = 'intermediate'; mixIn = 0.4; }
  else if (levelNo <= (d === 1 ? 6 : 3)) pool = 'easy';
  else { pool = 'intermediate'; mixIn = levelNo > 15 ? 0.25 : 0; }
  const maxTaps = d === 1 || pool === 'easy' ? 3 : 2;
  const max = rounds * 4;
  return { band, pool, rounds, maxTaps, max, pass: Math.ceil(max * (d === 3 ? 0.65 : 0.6)), mixIn };
};

const HARDER = { easy: 'intermediate', intermediate: 'analytical', analytical: 'analytical' };

/** A level: [{ passage, options }] with no passage twice. */
export const makeContextLevel = (rng, config) => {
  const nExtra = config.pool === 'analytical' ? 0 : Math.round(config.rounds * config.mixIn);
  const picks = shuffle(rng, [
    ...sample(rng, PASSAGES[config.pool], config.rounds - nExtra),
    ...sample(rng, PASSAGES[HARDER[config.pool]], nExtra)
  ]);
  return picks.map((passage) => ({ passage, options: shuffle(rng, [passage.meaning, ...passage.wrong]) }));
};

/** Clue step: 2 for at least one true clue and no false ones, 1 for a true clue with one false, else 0. */
export const scoreClues = (passage, tapped) => {
  const hits = tapped.filter((i) => passage.tokens[i]?.clue).length;
  const misses = tapped.length - hits;
  return { hits, misses, points: hits >= 1 && misses === 0 ? 2 : hits >= 1 && misses <= 1 ? 1 : 0 };
};

export const scoreMeaning = (passage, choice) => (choice === passage.meaning ? 2 : 0);
