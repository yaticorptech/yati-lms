/**
 * Semantic Precision (Master Minds, Classes 11–12) — pure, seeded rounds.
 *
 * A sentence carries one vague or imprecise word, marked {like this}. The shelf holds the precise word and
 * near-synonyms that differ from it in precision or shade (e.g. "illegible" vs "incomprehensible"). The player
 * drags the precise word onto the vague one; at higher difficulty a "why" follows: which words of the sentence
 * make that word the precise choice (`clue`, against two `foils` that are also in the sentence).
 *
 * Bank rows: [tier 1–3, sentence with {vague}, best, [near-synonyms ×4], clue, [foil, foil]]
 */
import { sample, shuffle } from '../seeded.js';

const BANK = [
  // ── tier 1: the context points at one clear shade ──
  [1, 'The bridge is {old}: its oldest stones were laid in the 12th century.', 'medieval', ['elderly', 'aged', 'antique', 'dated'], 'laid in the 12th century', ['The bridge is', 'its oldest stones']],
  [1, 'Late for the exam, he {walked} down the corridor, almost running.', 'hurried', ['strolled', 'marched', 'went', 'paced'], 'almost running', ['Late for the exam', 'down the corridor']],
  [1, 'The tea was {hot}: it came from a just-boiled kettle and burned her lip.', 'scalding', ['warm', 'heated', 'lukewarm', 'spicy'], 'burned her lip', ['The tea was', 'it came from']],
  [1, 'The crowd {expressed} its approval, cheering so loudly that the stadium shook.', 'roared', ['voiced', 'mentioned', 'whispered', 'stated'], 'cheering so loudly that the stadium shook', ['The crowd', 'its approval']],
  [1, 'Rina {ate} the whole pizza in two minutes flat, as if she had not eaten for days.', 'devoured', ['nibbled', 'tasted', 'consumed', 'sampled'], 'in two minutes flat', ['Rina', 'the whole pizza']],
  [1, 'The instructions were {unclear}: they could be read in two completely different ways.', 'ambiguous', ['vague', 'confusing', 'messy', 'brief'], 'read in two completely different ways', ['The instructions were', 'they could be']],
  [1, 'After the marathon the athlete was {tired}; she could barely stand.', 'exhausted', ['sleepy', 'bored', 'drowsy', 'lazy'], 'she could barely stand', ['After the marathon', 'the athlete was']],
  [1, 'The scientist {looked at} the cells under the microscope for hours, recording every change.', 'observed', ['glanced at', 'noticed', 'saw', 'peeked at'], 'for hours, recording every change', ['The scientist', 'under the microscope']],
  [1, 'The earthquake {damaged} the town so completely that not one building was left standing.', 'flattened', ['harmed', 'shook', 'scratched', 'dented'], 'not one building was left standing', ['The earthquake', 'the town']],
  [1, 'Ravi {asked} the shopkeeper again and again for a refund until he finally gave in.', 'pestered', ['requested', 'questioned', 'told', 'invited'], 'again and again', ['the shopkeeper', 'for a refund']],
  [1, 'The baby {cried} all night: a loud, long, high-pitched sound that kept the whole house awake.', 'wailed', ['whimpered', 'sniffled', 'wept', 'sighed'], 'a loud, long, high-pitched sound', ['The baby', 'all night']],
  [1, 'The chef {cut} the onion into tiny, even cubes.', 'diced', ['sliced', 'split', 'sawed', 'peeled'], 'tiny, even cubes', ['The chef', 'the onion']],
  [1, 'The {smell} of fresh jasmine drifted in through the open window.', 'fragrance', ['stench', 'odour', 'reek', 'fumes'], 'fresh jasmine', ['drifted in', 'through the open window']],
  [1, 'Fanned by the wind, the fire {moved} through the dry forest with terrifying speed.', 'raced', ['crept', 'wandered', 'drifted', 'went'], 'with terrifying speed', ['Fanned by the wind', 'the dry forest']],
  [1, 'The volcano is {inactive} now, but it could erupt again.', 'dormant', ['extinct', 'dead', 'finished', 'cold'], 'it could erupt again', ['The volcano is', 'but it could']],
  [1, 'The detective found a {small} scratch on the lock, visible only through a magnifying glass.', 'minute', ['minor', 'short', 'modest', 'little'], 'visible only through a magnifying glass', ['The detective found', 'on the lock']],
  // ── tier 2: subtler shades, near-synonyms closer together ──
  [2, 'The committee\'s decision was {final}: there would be no appeal and no second hearing.', 'irrevocable', ['last', 'ultimate', 'concluding', 'closing'], 'no appeal and no second hearing', ['The committee\'s decision', 'there would be']],
  [2, 'Asked about the missing funds, the politician gave a {vague} answer, deliberately avoiding the question.', 'evasive', ['unclear', 'brief', 'general', 'hazy'], 'deliberately avoiding the question', ['the missing funds', 'the politician gave']],
  [2, 'The fossil was {old}, older than any human civilisation by millions of years.', 'prehistoric', ['antique', 'elderly', 'vintage', 'outdated'], 'by millions of years', ['The fossil was', 'any human civilisation']],
  [2, 'The trees along the avenue are {changeable}: they shed all their leaves every autumn.', 'deciduous', ['seasonal', 'fickle', 'variable', 'temporary'], 'shed all their leaves every autumn', ['The trees', 'along the avenue']],
  [2, 'The witness\'s accounts were {different}: each version contradicted the last.', 'inconsistent', ['various', 'diverse', 'unusual', 'separate'], 'each version contradicted the last', ['The witness\'s', 'accounts were']],
  [2, 'The medicine {reduced} the pain but did not cure the illness.', 'alleviated', ['removed', 'cured', 'abolished', 'erased'], 'but did not cure the illness', ['The medicine', 'the pain']],
  [2, 'The ruler\'s power was {great}: no parliament, court or law could limit it.', 'absolute', ['large', 'strong', 'wide', 'popular'], 'no parliament, court or law could limit it', ['The ruler\'s', 'power was']],
  [2, 'The tiny plant {lasted} for months in the desert without a single drop of rain.', 'survived', ['stayed', 'flourished', 'remained', 'waited'], 'without a single drop of rain', ['The tiny plant', 'in the desert']],
  [2, 'The professor\'s explanation was {good}: brief, exact and without a single wasted word.', 'concise', ['obvious', 'simple', 'plain', 'lengthy'], 'brief, exact and without a single wasted word', ['The professor\'s', 'explanation was']],
  [2, 'The guard {looked at} every face in the crowd, searching for the escaped prisoner.', 'scanned', ['skimmed', 'glanced at', 'admired', 'ignored'], 'searching for the escaped prisoner', ['The guard', 'in the crowd']],
  [2, 'The talks reached a {problem}: neither side would move, and no progress was possible.', 'deadlock', ['difficulty', 'setback', 'delay', 'issue'], 'neither side would move', ['The talks reached', 'no progress was possible']],
  [2, 'The government {stopped} the law for six months while the court reviewed it.', 'suspended', ['cancelled', 'abolished', 'repealed', 'ended'], 'for six months while the court reviewed it', ['The government', 'the law']],
  [2, 'The old manuscript was {hard to read}: the ink had faded and the handwriting was cramped.', 'illegible', ['incomprehensible', 'obscure', 'complex', 'difficult'], 'the ink had faded and the handwriting was cramped', ['The old', 'manuscript']],
  [2, 'The two scientists {worked} together on the vaccine, publishing every result under both their names.', 'collaborated', ['competed', 'associated', 'assisted', 'joined'], 'under both their names', ['The two scientists', 'on the vaccine']],
  [2, 'Her refusal was {soft} but firm: she thanked them warmly and still said no.', 'gracious', ['weak', 'timid', 'meek', 'hesitant'], 'she thanked them warmly', ['Her refusal', 'still said no']],
  [2, 'The diplomat was {careful}, choosing every word so that neither side would be offended.', 'tactful', ['cautious', 'timid', 'hesitant', 'slow'], 'so that neither side would be offended', ['The diplomat was', 'choosing every word']],
  [2, 'For the article she was paid a single fixed {payment}, not a monthly salary.', 'fee', ['wage', 'salary', 'pension', 'allowance'], 'a single fixed', ['For the article', 'she was paid']],
  [2, 'The student {read} the chapter in two minutes, glancing only at the headings to get the general idea.', 'skimmed', ['studied', 'pored over', 'perused', 'memorised'], 'glancing only at the headings to get the general idea', ['The student', 'the chapter']],
  // ── tier 3: precision that changes the claim ──
  [3, 'The minister\'s statement was {false}, though not quite a lie: every fact was true, but arranged to give the wrong impression.', 'misleading', ['untrue', 'fraudulent', 'erroneous', 'fabricated'], 'every fact was true', ['The minister\'s statement', 'not quite a lie']],
  [3, 'The reviewer\'s comments were {negative} yet fair: she pointed out real flaws and suggested ways to fix them.', 'critical', ['hostile', 'scathing', 'cynical', 'dismissive'], 'suggested ways to fix them', ['The reviewer\'s comments', 'pointed out']],
  [3, 'The new evidence {weakened} the theory without disproving it.', 'undermined', ['refuted', 'destroyed', 'denied', 'disproved'], 'without disproving it', ['The new evidence', 'the theory']],
  [3, 'As the referee, she was {uninterested} in the result: she had no stake in which team won.', 'disinterested', ['bored', 'indifferent', 'apathetic', 'careless'], 'she had no stake in which team won', ['As the referee', 'in the result']],
  [3, 'The clause was {unclear} on purpose: its wording was left open so that both sides could claim victory.', 'equivocal', ['vague', 'obscure', 'confused', 'illegible'], 'so that both sides could claim victory', ['The clause was', 'its wording']],
  [3, 'The festival is {regular}: it is held once every four years.', 'quadrennial', ['annual', 'biennial', 'perennial', 'periodic'], 'once every four years', ['The festival is', 'it is held']],
  [3, 'Her {feeling} that the bridge was unsafe proved right, though she could not say why she felt it.', 'intuition', ['opinion', 'conclusion', 'theory', 'argument'], 'she could not say why she felt it', ['proved right', 'the bridge was unsafe']],
  [3, 'The {copy} of the painting fooled experts for decades, because the painter had sold it as the original.', 'forgery', ['replica', 'reproduction', 'tribute', 'print'], 'sold it as the original', ['fooled experts', 'for decades']],
  [3, 'The spokesperson {suggested} the company might be sold, without ever stating it directly.', 'implied', ['inferred', 'announced', 'declared', 'confirmed'], 'without ever stating it directly', ['The spokesperson', 'the company might be sold']],
  [3, 'The empire\'s decline was {slow}: so gradual over three centuries that few living through it noticed anything.', 'imperceptible', ['sluggish', 'lazy', 'delayed', 'late'], 'few living through it noticed anything', ['The empire\'s decline', 'over three centuries']],
  [3, 'Critics called the film {emotional}: its sentiment felt forced, sugary and overdone.', 'mawkish', ['moving', 'touching', 'passionate', 'poignant'], 'forced, sugary and overdone', ['Critics called', 'the film']],
  [3, 'The policy had an {unexpected} effect: meant to cut traffic, it actually increased it.', 'counterproductive', ['surprising', 'sudden', 'random', 'temporary'], 'it actually increased it', ['The policy had', 'meant to cut traffic']],
  [3, 'The {rule} of silence during the ceremony is unwritten, yet everyone follows it.', 'convention', ['law', 'statute', 'regulation', 'order'], 'is unwritten', ['during the ceremony', 'everyone follows it']],
  [3, 'The claim was {unprovable} in a scientific sense: no experiment could ever show it to be false.', 'unfalsifiable', ['uncertain', 'doubtful', 'unlikely', 'incorrect'], 'no experiment could ever show it to be false', ['The claim was', 'in a scientific sense']],
  [3, 'She {used} the opportunity cleverly, turning a minor complaint into a promotion.', 'exploited', ['wasted', 'missed', 'tried', 'needed'], 'turning a minor complaint into a promotion', ['the opportunity', 'cleverly']]
];

export const SEMANTIC_ITEMS = BANK.map(([tier, sentence, best, near, clue, foils], id) => {
  const m = /\{([^}]+)\}/.exec(sentence);
  return {
    id,
    tier,
    before: sentence.slice(0, m.index),
    vague: m[1],
    after: sentence.slice(m.index + m[0].length),
    plain: sentence.replace(/[{}]/g, ''),
    best,
    near,
    clue,
    foils
  };
});

const clampN = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const ramp = (from, to, levelNo) => Math.round(from + (to - from) * clampN((levelNo - 1) / 29, 0, 1));

/**
 * A level, by band (Master Minds plays 'advanced'; anything else plays a gentler version), difficulty 1–3 and
 * step 1–30: rounds, shelf size (best + near-synonyms), whether the "why" follows, which tiers are dealt.
 */
export const semanticConfig = (ageBand, difficulty = 1, levelNo = 1) => {
  const d = clampN(difficulty || 1, 1, 3);
  const advanced = ageBand === 'advanced' || !ageBand;
  const rounds = ramp(6, 8, levelNo) + (d - 1);
  const shelf = clampN(3 + d - (advanced ? 0 : 1) + (levelNo >= 20 ? 1 : 0), 3, 5);
  const why = d >= 2 || levelNo >= 16;
  return { band: advanced ? 'advanced' : 'gentle', difficulty: d, rounds, shelf, why, tiers: d === 1 ? [1] : d === 2 ? [1, 2] : [2, 3], pass: 0 };
};

/** Points a round is worth: 2 for the word (1 on a second try), 1 for the why. */
export const semanticMax = (config) => config.rounds * (2 + (config.why ? 1 : 0));

/** One level's rounds, no item twice. Each: { item, shelf: [words], why: [phrases] | null }. */
export const makeSemanticLevel = (rng, config) => {
  const main = SEMANTIC_ITEMS.filter((it) => it.tier === config.tiers[config.tiers.length - 1]);
  const side = SEMANTIC_ITEMS.filter((it) => config.tiers.includes(it.tier) && !main.includes(it));
  const fromMain = Math.min(main.length, Math.ceil(config.rounds * 0.65));
  const picked = [...sample(rng, main, fromMain), ...sample(rng, side, config.rounds - fromMain)];
  const items = shuffle(rng, picked.length < config.rounds ? [...picked, ...sample(rng, SEMANTIC_ITEMS.filter((it) => !picked.includes(it)), config.rounds - picked.length)] : picked);
  return items.map((item) => ({
    item,
    shelf: shuffle(rng, [item.best, ...sample(rng, item.near, config.shelf - 1)]),
    why: config.why ? shuffle(rng, [item.clue, ...item.foils]) : null
  }));
};

export const checkSemanticWord = (round, word) => word === round.item.best;
export const checkSemanticWhy = (round, phrase) => phrase === round.item.clue;
