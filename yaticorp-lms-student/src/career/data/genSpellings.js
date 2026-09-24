/**
 * "Spelling Fix" questions, built from a word list rather than written with
 * their misspellings one at a time.
 *
 * Each word gets three wrong spellings made by the mistakes people actually
 * make: a doubled letter dropped or added, "ie" and "ei" swapped, a silent
 * letter lost, an unstressed vowel changed, "-ant" for "-ent", two letters
 * transposed. They come from a seeded generator, so a word's wrong spellings
 * are the same on every visit and the question memory can track it.
 *
 * The bands are the words: everyday words in the first, the well-known traps
 * in the second, the long and the foreign-looking in the third. Within a band
 * the list runs roughly short to long, so later levels get the longer words.
 *
 * Each item: { answer, options, level, tier }.
 */
import { seeded, shuffle, tierOf } from './seeded.js';

const WORDS = {
  1: [
    'friend', 'because', 'answer', 'people', 'always', 'before', 'school', 'their', 'where', 'which',
    'little', 'really', 'pretty', 'enough', 'family', 'famous', 'island', 'listen', 'minute', 'though',
    'tomorrow', 'address', 'believe', 'library', 'weather', 'college', 'science', 'surprise', 'usually', 'through',
    'business', 'building', 'children', 'exercise', 'favourite', 'straight', 'sentence', 'together', 'thought', 'writing',
    'beautiful', 'different', 'necessary', 'important', 'knowledge', 'yesterday', 'holiday', 'beginning', 'definitely', 'separate',
    'interesting', 'immediately', 'environment', 'government', 'received', 'experience', 'restaurant', 'especially', 'remember', 'probably',
    'across', 'until', 'again', 'heard', 'other', 'often', 'earth', 'money', 'water', 'quiet',
    'animal', 'balloon', 'bicycle', 'caught', 'chocolate', 'decided', 'excited', 'finally', 'happened', 'suddenly'
  ],
  2: [
    'rhythm', 'weird', 'height', 'receipt', 'ceiling', 'foreign', 'leisure', 'colour', 'grammar', 'guard',
    'calendar', 'argument', 'occurred', 'referred', 'achieve', 'category', 'cemetery', 'collectible', 'committee', 'column',
    'conscience', 'deceive', 'discipline', 'embarrass', 'existence', 'harass', 'humorous', 'jewellery', 'judgement', 'licence',
    'lightning', 'maintenance', 'medieval', 'mischievous', 'noticeable', 'occasion', 'parallel', 'pastime', 'perceive', 'possession',
    'privilege', 'pronunciation', 'publicly', 'recommend', 'relevant', 'repetition', 'schedule', 'sincerely', 'thorough', 'threshold',
    'tongue', 'truly', 'twelfth', 'vacuum', 'vicious', 'accommodate', 'acquire', 'apparent', 'basically', 'beneficial',
    'absence', 'acceptable', 'amateur', 'athlete', 'attendance', 'colleague', 'competition', 'convenient', 'curiosity', 'desperate',
    'exhilarate', 'familiar', 'fiery', 'guidance', 'independent', 'interrupt', 'knowledgeable', 'occasionally', 'persistent', 'separately'
  ],
  3: [
    'liaison', 'bureaucracy', 'conscientious', 'entrepreneur', 'perseverance', 'questionnaire', 'acquaintance', 'exaggerate', 'unnecessary', 'accommodation',
    'millennium', 'manoeuvre', 'hierarchy', 'idiosyncrasy', 'inoculate', 'lieutenant', 'mnemonic', 'pharaoh', 'silhouette', 'supersede',
    'surveillance', 'ecstasy', 'dilemma', 'fluorescent', 'gauge', 'haemorrhage', 'indispensable', 'irresistible', 'liquefy', 'memento',
    'minuscule', 'occurrence', 'paraphernalia', 'playwright', 'precede', 'proceed', 'rhetoric', 'sacrilegious', 'sergeant', 'sovereign',
    'ophthalmologist', 'archaeology', 'connoisseur', 'chauffeur', 'consensus', 'diarrhoea', 'ecclesiastical', 'fuchsia', 'guarantee', 'hypocrisy',
    'inadvertent', 'onomatopoeia', 'personnel', 'phlegm', 'reconnaissance', 'renaissance', 'rendezvous', 'succinct', 'vengeance', 'camouflage',
    'abbreviate', 'acknowledgement', 'apocalypse', 'asphyxiate', 'bourgeois', 'catastrophe', 'chrysanthemum', 'colloquial', 'conscientiousness', 'labyrinth',
    'dumbbell', 'embarrassment', 'exhilaration', 'harassment', 'ubiquitous', 'liquefaction', 'mischievousness', 'pseudonym', 'quintessential', 'sacrilege'
  ]
};

/* ---- The mistakes -----------------------------------------------------
 * Each takes a word and returns a wrong spelling, or null if the mistake does
 * not apply to that word.
 */
const VOWELS = 'aeiou';

/* In order of how often people make them. The generator only shuffles the
   OPTIONS; the rules are tried in this order so the realistic slips come
   first and a transposition is the last resort. */
const mistakes = [
  // A doubled letter, undoubled: committee -> comittee
  (w) => {
    const m = w.match(/([a-z])\1/);
    return m ? w.replace(m[0], m[1]) : null;
  },
  // ie <-> ei: receive -> recieve
  (w) => (w.includes('ie') ? w.replace('ie', 'ei') : w.includes('ei') ? w.replace('ei', 'ie') : null),
  // An unstressed vowel swapped: separate -> seperate
  (w) => {
    const swaps = { a: 'e', e: 'a', i: 'e', o: 'u', u: 'o' };
    const inner = w.slice(1, -1);
    const m = inner.match(/[aeiou]/g);
    if (!m || m.length < 2) return null;
    // Change the second-last inner vowel, which is usually the unstressed one.
    const idx = inner.lastIndexOf(m[m.length - 2]);
    const v = inner[idx];
    return w[0] + inner.slice(0, idx) + swaps[v] + inner.slice(idx + 1) + w[w.length - 1];
  },
  // -ant/-ent and -ance/-ence swapped: relevant -> relevent
  (w) => {
    if (w.endsWith('ant')) return w.slice(0, -3) + 'ent';
    if (w.endsWith('ent')) return w.slice(0, -3) + 'ant';
    if (w.endsWith('ance')) return w.slice(0, -4) + 'ence';
    if (w.endsWith('ence')) return w.slice(0, -4) + 'ance';
    if (w.endsWith('ible')) return w.slice(0, -4) + 'able';
    if (w.endsWith('able')) return w.slice(0, -4) + 'ible';
    return null;
  },
  // A silent or quiet letter dropped: knowledge -> knowlege, government -> goverment
  (w) => {
    const targets = ['dg', 'gn', 'kn', 'mb', 'rn', 'ue', 'gh', 'ch', 'sc', 'wr', 'ps', 'rh', 'sl', 'sw', 'gu', 'bt', 'st', 'ck', 'ph', 'wh'];
    for (const t of targets) {
      const i = w.indexOf(t);
      if (i >= 0) {
        const drop = ['kn', 'wr', 'ps', 'gn', 'wh', 'sw'].includes(t) ? 0 : 1;
        return w.slice(0, i + drop) + w.slice(i + drop + 1);
      }
    }
    return null;
  },
  // A vowel dropped in the middle: different -> diffrent, interesting -> intresting
  (w) => {
    const m = w.slice(2, -2).match(/[aeiou]/g);
    if (!m || m.length < 3) return null;
    const i = w.indexOf(m[1], 2);
    return w.slice(0, i) + w.slice(i + 1);
  },
  // -ly / -ally, -ful: publicly -> publically, definitely -> definately (via vowel), truly -> truely
  (w) => {
    if (w.endsWith('ly') && !w.endsWith('ally') && !w.endsWith('ely')) return w.slice(0, -2) + 'ely';
    if (w.endsWith('ally')) return w.slice(0, -4) + 'ly';
    if (w.endsWith('ful')) return w + 'l';
    return null;
  },
  // c <-> s on a soft c: licence -> lisence, decide -> deside
  (w) => {
    const m = w.match(/c[eiy]/);
    if (!m) return null;
    const i = w.indexOf(m[0]);
    if (i === 0) return null;
    return w.slice(0, i) + 's' + w.slice(i + 1);
  },
  // A single consonant doubled after a short vowel: necessary -> neccessary
  (w) => {
    const m = w.match(/[aeiou]([bcdfglmnprst])[aeiou]/);
    if (!m) return null;
    const i = w.indexOf(m[0]) + 1;
    return w.slice(0, i) + m[1] + w.slice(i);
  },
  // Two letters transposed in the middle: friend -> freind, weird -> wierd
  (w) => {
    for (let i = 1; i < w.length - 2; i += 1) {
      if (w[i] !== w[i + 1] && (VOWELS.includes(w[i]) !== VOWELS.includes(w[i + 1]))) {
        return w.slice(0, i) + w[i + 1] + w[i] + w.slice(i + 2);
      }
    }
    return null;
  }
];

/* Words a mistake rule can land on by accident. "Thorough" less its "o" is
   "through", which is not a misspelling of anything. Every word on the lists
   above is checked too; these are the ones that are not on them. */
const REAL_WORDS = new Set([
  'through', 'though', 'thought', 'quiet', 'quite', 'desert', 'dessert', 'loose', 'lose', 'chose', 'choose',
  'later', 'latter', 'then', 'than', 'were', 'where', 'wear', 'weather', 'whether', 'accept', 'except',
  'advice', 'advise', 'device', 'devise', 'precede', 'proceed', 'personal', 'personnel', 'principal', 'principle',
  'stationary', 'stationery', 'complement', 'compliment', 'affect', 'effect', 'moral', 'morale', 'bear', 'bare'
]);

/**
 * Three distinct wrong spellings of one word.
 *
 * `real` is every spelling that must not be offered as wrong: the whole word
 * list, so a slip that turns one listed word into another is thrown away.
 */
export const misspell = (word, real = new Set()) => {
  const wrong = new Set();
  const usable = (w) => w && w !== word && /^[a-z]+$/.test(w) && !real.has(w) && !REAL_WORDS.has(w);
  for (const make of mistakes) {
    const w = make(word);
    if (usable(w)) wrong.add(w);
    if (wrong.size === 3) break;
  }
  // A word so regular that fewer than three rules bit: fall back to transposing
  // letters at successive positions until three are found.
  for (let i = 1; wrong.size < 3 && i < word.length - 1; i += 1) {
    if (word[i] === word[i + 1]) continue;
    const w = word.slice(0, i) + word[i + 1] + word[i] + word.slice(i + 2);
    if (usable(w)) wrong.add(w);
  }
  return [...wrong].slice(0, 3);
};

/** The whole pool, every band, ordered roughly short to long inside each band. */
export const buildSpellings = () => {
  const out = [];
  const real = new Set(Object.values(WORDS).flat());
  for (const band of [1, 2, 3]) {
    const rng = seeded(2600 + band);
    const seen = new Set();
    const words = WORDS[band].filter((w) => {
      if (seen.has(w)) return false;
      seen.add(w);
      return true;
    });
    // Stable sort by length; ties keep the order they were listed in.
    const ordered = words.map((w, i) => ({ w, i })).sort((a, b) => a.w.length - b.w.length || a.i - b.i);
    ordered.forEach(({ w }, i) => {
      const wrong = misspell(w, real);
      out.push({
        answer: w,
        options: shuffle(rng, [w, ...wrong]),
        level: band,
        tier: tierOf(i, ordered.length)
      });
    });
  }
  return out;
};
