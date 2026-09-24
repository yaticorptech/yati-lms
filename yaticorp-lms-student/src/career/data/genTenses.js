/**
 * "Tense Pick" questions, built from a verb list rather than written with
 * their wrong forms one at a time.
 *
 * Every irregular verb gets three wrong past tenses made the ways people
 * actually get them wrong: the regular "-ed" bolted on, the past participle
 * used as the past ("I have seen" becoming "I seen"), and a mangled vowel or
 * a doubled ending. The forms come from a seeded generator, so a verb's
 * options are the same on every visit and the question memory can track it.
 *
 * The bands are the verbs: the everyday ones first, the common traps second,
 * the rare and the confusable (lie/lay, bear, tread) last.
 *
 * Each item: { base, answer, options, level, tier }.
 */
import { seeded, shuffle, tierOf } from './seeded.js';

/** [base, past, past participle]. A `note` overrides the default hint. */
const VERBS = {
  1: [
    ['go', 'went', 'gone'], ['eat', 'ate', 'eaten'], ['see', 'saw', 'seen'], ['take', 'took', 'taken'], ['run', 'ran', 'run'],
    ['come', 'came', 'come'], ['give', 'gave', 'given'], ['make', 'made', 'made'], ['write', 'wrote', 'written'], ['begin', 'began', 'begun'],
    ['drink', 'drank', 'drunk'], ['sing', 'sang', 'sung'], ['swim', 'swam', 'swum'], ['buy', 'bought', 'bought'], ['think', 'thought', 'thought'],
    ['teach', 'taught', 'taught'], ['sit', 'sat', 'sat'], ['stand', 'stood', 'stood'], ['find', 'found', 'found'], ['get', 'got', 'got'],
    ['have', 'had', 'had'], ['do', 'did', 'done'], ['say', 'said', 'said'], ['tell', 'told', 'told'], ['know', 'knew', 'known'],
    ['grow', 'grew', 'grown'], ['throw', 'threw', 'thrown'], ['draw', 'drew', 'drawn'], ['fall', 'fell', 'fallen'], ['break', 'broke', 'broken'],
    ['speak', 'spoke', 'spoken'], ['drive', 'drove', 'driven'], ['ring', 'rang', 'rung'], ['win', 'won', 'won'], ['meet', 'met', 'met'],
    ['leave', 'left', 'left'], ['sleep', 'slept', 'slept'], ['feel', 'felt', 'felt'], ['keep', 'kept', 'kept'], ['send', 'sent', 'sent'],
    ['build', 'built', 'built'], ['pay', 'paid', 'paid'], ['hear', 'heard', 'heard'], ['read', 'read', 'read'], ['cut', 'cut', 'cut'],
    // Regular, but with a spelling that trips people up.
    ['stop', 'stopped', 'stopped'], ['plan', 'planned', 'planned'], ['try', 'tried', 'tried'], ['cry', 'cried', 'cried'], ['carry', 'carried', 'carried'],
    ['play', 'played', 'played'], ['stay', 'stayed', 'stayed'], ['hop', 'hopped', 'hopped'], ['hope', 'hoped', 'hoped'], ['drop', 'dropped', 'dropped'],
    ['study', 'studied', 'studied'], ['hurry', 'hurried', 'hurried'], ['enjoy', 'enjoyed', 'enjoyed'], ['shop', 'shopped', 'shopped'], ['chat', 'chatted', 'chatted'],
    ['clap', 'clapped', 'clapped'], ['fix', 'fixed', 'fixed'], ['mix', 'mixed', 'mixed'], ['snow', 'snowed', 'snowed'], ['rub', 'rubbed', 'rubbed']
  ],
  2: [
    ['bring', 'brought', 'brought'], ['catch', 'caught', 'caught'], ['choose', 'chose', 'chosen'], ['fly', 'flew', 'flown'], ['forget', 'forgot', 'forgotten'],
    ['hide', 'hid', 'hidden'], ['lead', 'led', 'led'], ['lose', 'lost', 'lost'], ['ride', 'rode', 'ridden'], ['shake', 'shook', 'shaken'],
    ['steal', 'stole', 'stolen'], ['wear', 'wore', 'worn'], ['fight', 'fought', 'fought'], ['bite', 'bit', 'bitten'], ['blow', 'blew', 'blown'],
    ['freeze', 'froze', 'frozen'], ['rise', 'rose', 'risen'], ['shoot', 'shot', 'shot'], ['sell', 'sold', 'sold'], ['sink', 'sank', 'sunk'],
    ['spend', 'spent', 'spent'], ['stick', 'stuck', 'stuck'], ['strike', 'struck', 'struck'], ['sweep', 'swept', 'swept'], ['tear', 'tore', 'torn'],
    ['wake', 'woke', 'woken'], ['feed', 'fed', 'fed'], ['bend', 'bent', 'bent'], ['deal', 'dealt', 'dealt'], ['dig', 'dug', 'dug'],
    ['hang', 'hung', 'hung'], ['hold', 'held', 'held'], ['lend', 'lent', 'lent'], ['light', 'lit', 'lit'], ['mean', 'meant', 'meant'],
    ['shine', 'shone', 'shone'], ['slide', 'slid', 'slid'], ['spit', 'spat', 'spat'], ['spread', 'spread', 'spread'], ['understand', 'understood', 'understood'],
    ['withdraw', 'withdrew', 'withdrawn'], ['overcome', 'overcame', 'overcome'], ['forgive', 'forgave', 'forgiven'], ['undertake', 'undertook', 'undertaken'], ['mistake', 'mistook', 'mistaken'],
    // Regular, but with a spelling that trips people up.
    ['admit', 'admitted', 'admitted'], ['transfer', 'transferred', 'transferred'], ['prefer', 'preferred', 'preferred'], ['refer', 'referred', 'referred'], ['occur', 'occurred', 'occurred'],
    ['travel', 'travelled', 'travelled'], ['cancel', 'cancelled', 'cancelled'], ['panic', 'panicked', 'panicked'], ['picnic', 'picnicked', 'picnicked'], ['apply', 'applied', 'applied'],
    ['deny', 'denied', 'denied'], ['reply', 'replied', 'replied'], ['obey', 'obeyed', 'obeyed'], ['delay', 'delayed', 'delayed'], ['label', 'labelled', 'labelled'],
    ['open', 'opened', 'opened'], ['visit', 'visited', 'visited'], ['offer', 'offered', 'offered'], ['listen', 'listened', 'listened'], ['develop', 'developed', 'developed']
  ],
  3: [
    ['lie (down)', 'lay', 'lain', 'lie'], ['lay (the table)', 'laid', 'laid', 'lay'], ['seek', 'sought', 'sought'], ['swear', 'swore', 'sworn'], ['weave', 'wove', 'woven'],
    ['forbid', 'forbade', 'forbidden'], ['strive', 'strove', 'striven'], ['bear', 'bore', 'borne'], ['shrink', 'shrank', 'shrunk'], ['spin', 'spun', 'spun'],
    ['sting', 'stung', 'stung'], ['tread', 'trod', 'trodden'], ['cling', 'clung', 'clung'], ['arise', 'arose', 'arisen'], ['awake', 'awoke', 'awoken'],
    ['beseech', 'besought', 'besought'], ['bid (at auction)', 'bid', 'bid', 'bid'], ['bind', 'bound', 'bound'], ['breed', 'bred', 'bred'], ['cast', 'cast', 'cast'],
    ['creep', 'crept', 'crept'], ['flee', 'fled', 'fled'], ['fling', 'flung', 'flung'], ['forsake', 'forsook', 'forsaken'], ['grind', 'ground', 'ground'],
    ['kneel', 'knelt', 'knelt'], ['leap', 'leapt', 'leapt'], ['plead', 'pleaded', 'pleaded'], ['prove', 'proved', 'proven'], ['undergo', 'underwent', 'undergone'],
    ['shear', 'sheared', 'shorn'], ['slay', 'slew', 'slain'], ['sling', 'slung', 'slung'], ['slink', 'slunk', 'slunk'], ['smite', 'smote', 'smitten'],
    ['sow', 'sowed', 'sown'], ['stink', 'stank', 'stunk'], ['stride', 'strode', 'stridden'], ['swell', 'swelled', 'swollen'], ['thrive', 'throve', 'thriven'],
    ['wring', 'wrung', 'wrung'], ['wind (a clock)', 'wound', 'wound', 'wind'], ['overthrow', 'overthrew', 'overthrown'], ['withhold', 'withheld', 'withheld'], ['foresee', 'foresaw', 'foreseen'],
    // Regular, but with a spelling that trips people up.
    ['commit', 'committed', 'committed'], ['omit', 'omitted', 'omitted'], ['regret', 'regretted', 'regretted'], ['equip', 'equipped', 'equipped'], ['acquit', 'acquitted', 'acquitted'],
    ['benefit', 'benefited', 'benefited'], ['focus', 'focused', 'focused'], ['target', 'targeted', 'targeted'], ['worship', 'worshipped', 'worshipped'], ['kidnap', 'kidnapped', 'kidnapped'],
    ['program', 'programmed', 'programmed'], ['format', 'formatted', 'formatted'], ['mimic', 'mimicked', 'mimicked'], ['traffic', 'trafficked', 'trafficked'], ['dye', 'dyed', 'dyed'],
    ['singe', 'singed', 'singed'], ['tiptoe', 'tiptoed', 'tiptoed'], ['canoe', 'canoed', 'canoed'], ['ski', 'skied', 'skied'], ['taxi', 'taxied', 'taxied']
  ]
};

const VOWELS = 'aeiou';

/** The regular past of a base: stop -> stopped, try -> tried, bake -> baked. */
const regular = (base) => {
  if (base.endsWith('e')) return `${base}d`;
  if (base.endsWith('c')) return `${base}ked`;
  if (base.endsWith('y') && !VOWELS.includes(base[base.length - 2])) return `${base.slice(0, -1)}ied`;
  const cvc = base.length >= 3 && !VOWELS.includes(base.at(-1)) && VOWELS.includes(base.at(-2)) && !VOWELS.includes(base.at(-3)) && !'wxy'.includes(base.at(-1));
  return cvc ? `${base}${base.at(-1)}ed` : `${base}ed`;
};

/** A mangled form: the right past with its first inner vowel changed. */
const mangle = (past, base) => {
  const swaps = { a: 'u', e: 'o', i: 'a', o: 'a', u: 'o' };
  const i = [...past].findIndex((ch, k) => k > 0 && VOWELS.includes(ch));
  const swapped = i > 0 ? past.slice(0, i) + swaps[past[i]] + past.slice(i + 1) : null;
  return swapped && swapped !== past && swapped !== base ? swapped : null;
};

/** The regular past with the final consonant wrongly doubled, or wrongly not. */
const misdoubled = (stem) => {
  const last = stem.at(-1);
  if (last === 'e') return `${stem}ed`; // hopeed
  if (VOWELS.includes(last) || last === 'y' || last === 'c') return null;
  const doubled = `${stem}${last}ed`;
  const single = `${stem}ed`;
  return regular(stem) === doubled ? single : doubled; // stoped, or visitted
};

/** Three distinct wrong past tenses. */
const wrongFor = ([base, past, participle], rng) => {
  const stem = base.replace(/\s*\(.*\)$/, '');
  // In the order people actually make them: the regular ending, the
  // participle in the past's place, the past with "-ed" bolted on, and only
  // then an invented vowel.
  const isRegular = regular(stem) === past;
  const candidates = isRegular
    ? [
        // The consonant doubled when it should not be, or not when it should;
        // "-y" kept before "-ed"; "-ed" on a "-c" without its "k".
        misdoubled(stem),
        stem.endsWith('y') ? `${stem}ed` : null,
        stem.endsWith('c') ? `${stem}ed` : null,
        `${stem}d`,
        `${stem}t`,
        mangle(past, stem)
      ].filter(Boolean)
    : [
        regular(stem),
        participle !== past ? participle : null,
        `${past}ed`,
        stem.endsWith('t') || stem.endsWith('d') ? null : `${stem}t`,
        mangle(past, stem),
        `${stem}d`
      ].filter(Boolean);
  // Whatever is still short is made up from the plainest slips.
  const fallback = [`${stem}ed`, `${stem}d`, `${stem}t`, `${stem}${stem.at(-1)}ed`, `${past}t`];
  const wrong = [];
  for (const w of [...candidates, ...fallback]) {
    if (w !== past && w !== stem && !wrong.includes(w)) wrong.push(w);
    if (wrong.length === 3) break;
  }
  return shuffle(rng, wrong).slice(0, 3);
};

/** The whole pool, every band, in the order the verbs were listed. */
export const buildTenses = () => {
  const out = [];
  for (const band of [1, 2, 3]) {
    const rng = seeded(8800 + band);
    const seen = new Set();
    const verbs = VERBS[band].filter((v) => {
      if (seen.has(v[0])) return false;
      seen.add(v[0]);
      return true;
    });
    verbs.forEach((v, i) => {
      const [base, past] = v;
      const wrong = wrongFor(v, rng);
      out.push({
        base,
        answer: past,
        options: shuffle(rng, [past, ...wrong]),
        level: band,
        tier: tierOf(i, verbs.length)
      });
    });
  }
  return out;
};
