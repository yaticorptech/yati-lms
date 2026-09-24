/**
 * Arguments for "Deduction", built from argument forms rather than written
 * one at a time.
 *
 * The game tests validity, not truth: does the conclusion follow from the
 * premises? A form is valid or it is not, whatever nouns are put into it, so
 * each form below is filled with many different sets of terms. Every band
 * gets a hundred and fifty arguments, half of which follow and half of which do not, so
 * guessing one answer throughout earns nothing.
 *
 * The forms get harder as the band goes on: band one is plain "all/no"
 * chains with the two classic traps, band two adds "some" and conditionals,
 * band three uses the subtler fallacies and abstract letters that strip away
 * every clue except the form itself.
 *
 * Each item: { premises, conclusion, answer, why, level, tier }.
 */
import { seeded, pick, shuffle, tierOf } from './seeded.js';

const PER_BAND = 150;

/* ---- Terms ------------------------------------------------------------ */

/** Nested classes: every `kid` is inside `mid`, and `mid` is inside `top`. */
const CHAINS = [
  { kids: ['sparrows', 'eagles', 'parrots', 'owls'], mid: 'birds', top: 'animals' },
  { kids: ['roses', 'tulips', 'lilies', 'daisies'], mid: 'flowers', top: 'plants' },
  { kids: ['squares', 'rhombuses'], mid: 'parallelograms', top: 'quadrilaterals' },
  { kids: ['surgeons', 'paediatricians', 'cardiologists'], mid: 'doctors', top: 'professionals' },
  { kids: ['mangoes', 'apples', 'bananas', 'grapes'], mid: 'fruits', top: 'foods' },
  { kids: ['sonnets', 'haiku', 'limericks'], mid: 'poems', top: 'writings' },
  { kids: ['violins', 'cellos', 'guitars'], mid: 'string instruments', top: 'instruments' },
  { kids: ['salmon', 'tuna', 'trout'], mid: 'fish', top: 'animals' },
  { kids: ['oaks', 'pines', 'maples'], mid: 'trees', top: 'plants' },
  { kids: ['laptops', 'tablets', 'phones'], mid: 'computers', top: 'machines' },
  { kids: ['novels', 'biographies', 'memoirs'], mid: 'books', top: 'publications' },
  { kids: ['whales', 'dolphins', 'tigers', 'bats'], mid: 'mammals', top: 'animals' },
  { kids: ['spoons', 'forks', 'ladles'], mid: 'utensils', top: 'tools' },
  { kids: ['sofas', 'chairs', 'benches'], mid: 'seats', top: 'furniture' },
  { kids: ['buses', 'trucks', 'vans'], mid: 'vehicles', top: 'machines' },
  { kids: ['pilots', 'drivers', 'sailors'], mid: 'operators', top: 'workers' }
];

/** Pairs of classes with nothing in common. */
const DISJOINT = [
  ['fish', 'mammals'],
  ['cats', 'dogs'],
  ['reptiles', 'birds'],
  ['squares', 'circles'],
  ['even numbers', 'odd numbers'],
  ['metals', 'gases'],
  ['fruits', 'vegetables'],
  ['insects', 'spiders'],
  ['liquids', 'solids'],
  ['nouns', 'verbs'],
  ['triangles', 'pentagons'],
  ['planets', 'stars']
];

/** Properties a class can have, in "are/is" form. */
const PROPERTIES = [
  'warm-blooded',
  'expensive',
  'fragile',
  'heavy',
  'edible',
  'rare',
  'noisy',
  'waterproof',
  'flammable',
  'seasonal',
  'imported',
  'recyclable'
];

/** Roles a person can hold, for arguments about a named individual. */
const ROLES = [
  { group: 'athletes', trait: 'train daily', traitNot: 'does not train daily', traitIs: 'trains daily' },
  { group: 'members', trait: 'pay a fee', traitNot: 'does not pay a fee', traitIs: 'pays a fee' },
  { group: 'pilots', trait: 'hold a licence', traitNot: 'does not hold a licence', traitIs: 'holds a licence' },
  { group: 'residents', trait: 'have a permit', traitNot: 'does not have a permit', traitIs: 'has a permit' },
  { group: 'graduates', trait: 'hold a degree', traitNot: 'does not hold a degree', traitIs: 'holds a degree' },
  { group: 'employees', trait: 'wear a badge', traitNot: 'does not wear a badge', traitIs: 'wears a badge' },
  { group: 'scholars', trait: 'receive a grant', traitNot: 'does not receive a grant', traitIs: 'receives a grant' },
  { group: 'drivers', trait: 'carry insurance', traitNot: 'does not carry insurance', traitIs: 'carries insurance' },
  { group: 'voters', trait: 'are registered', traitNot: 'is not registered', traitIs: 'is registered' },
  { group: 'captains', trait: 'wear an armband', traitNot: 'does not wear an armband', traitIs: 'wears an armband' }
];

const NAMES = ['Priya', 'Anil', 'Meera', 'Ravi', 'Sana', 'Arjun', 'Neha', 'Kiran', 'Dev', 'Tara', 'Zoya', 'Vikram', 'Asha', 'Rohan', 'Lena', 'Farah'];

/** Conditionals, with the tenses each form needs already spelled out. */
const CONDITIONALS = [
  { if: 'it rains', then: 'the match is cancelled', did: 'It rained', didNot: 'It did not rain', result: 'The match was cancelled', resultNot: 'The match was not cancelled' },
  { if: 'the alarm rings', then: 'the guard checks the door', did: 'The alarm rang', didNot: 'The alarm did not ring', result: 'The guard checked the door', resultNot: 'The guard did not check the door' },
  { if: 'the code compiles', then: 'the tests run', did: 'The code compiled', didNot: 'The code did not compile', result: 'The tests ran', resultNot: 'The tests did not run' },
  { if: 'Ravi studies', then: 'he passes', did: 'Ravi studied', didNot: 'Ravi did not study', result: 'Ravi passed', resultNot: 'Ravi did not pass' },
  { if: 'the bridge is closed', then: 'traffic is diverted', did: 'The bridge was closed', didNot: 'The bridge was not closed', result: 'Traffic was diverted', resultNot: 'Traffic was not diverted' },
  { if: 'the oven is on', then: 'the kitchen is warm', did: 'The oven was on', didNot: 'The oven was not on', result: 'The kitchen was warm', resultNot: 'The kitchen was not warm' },
  { if: 'the shop is open', then: 'the sign is lit', did: 'The shop was open', didNot: 'The shop was not open', result: 'The sign was lit', resultNot: 'The sign was not lit' },
  { if: 'the battery is flat', then: 'the car will not start', did: 'The battery was flat', didNot: 'The battery was not flat', result: 'The car did not start', resultNot: 'The car started' },
  { if: 'Meera is late', then: 'the meeting starts without her', did: 'Meera was late', didNot: 'Meera was not late', result: 'The meeting started without her', resultNot: 'The meeting did not start without her' },
  { if: 'the file is saved', then: 'the icon turns green', did: 'The file was saved', didNot: 'The file was not saved', result: 'The icon turned green', resultNot: 'The icon did not turn green' },
  { if: 'the river floods', then: 'the road is shut', did: 'The river flooded', didNot: 'The river did not flood', result: 'The road was shut', resultNot: 'The road was not shut' },
  { if: 'the ticket is valid', then: 'the gate opens', did: 'The ticket was valid', didNot: 'The ticket was not valid', result: 'The gate opened', resultNot: 'The gate did not open' },
  { if: 'the fuse blows', then: 'the lights go out', did: 'The fuse blew', didNot: 'The fuse did not blow', result: 'The lights went out', resultNot: 'The lights did not go out' },
  { if: 'Sana practises', then: 'she improves', did: 'Sana practised', didNot: 'Sana did not practise', result: 'Sana improved', resultNot: 'Sana did not improve' },
  { if: 'the tank is empty', then: 'the pump stops', did: 'The tank was empty', didNot: 'The tank was not empty', result: 'The pump stopped', resultNot: 'The pump did not stop' },
  { if: 'the form is signed', then: 'the claim is paid', did: 'The form was signed', didNot: 'The form was not signed', result: 'The claim was paid', resultNot: 'The claim was not paid' },
  { if: 'the train is on time', then: 'Arjun catches his flight', did: 'The train was on time', didNot: 'The train was not on time', result: 'Arjun caught his flight', resultNot: 'Arjun did not catch his flight' },
  { if: 'the dough rises', then: 'the bread is light', did: 'The dough rose', didNot: 'The dough did not rise', result: 'The bread was light', resultNot: 'The bread was not light' },
  { if: 'the password is correct', then: 'the screen unlocks', did: 'The password was correct', didNot: 'The password was not correct', result: 'The screen unlocked', resultNot: 'The screen did not unlock' },
  { if: 'the seeds are watered', then: 'they sprout', did: 'The seeds were watered', didNot: 'The seeds were not watered', result: 'They sprouted', resultNot: 'They did not sprout' }
];

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/* ---- Forms ------------------------------------------------------------
 * Each takes the generator and returns { premises, conclusion, answer, why }.
 * The name in the comment is the traditional one, for anyone checking them.
 */

// Barbara: All A are B. All B are C. ⟹ All A are C.
const chainValid = (rng) => {
  const c = pick(rng, CHAINS);
  const a = pick(rng, c.kids);
  return {
    premises: [`All ${a} are ${c.mid}.`, `All ${c.mid} are ${c.top}.`],
    conclusion: `All ${a} are ${c.top}.`,
    answer: 'Follows',
    why: `The chain links up: ${a} to ${c.mid} to ${c.top}`
  };
};

// Undistributed middle: All A are B. All C are B. ⟹ All A are C.
const sharedParent = (rng) => {
  const c = pick(rng, CHAINS.filter((x) => x.kids.length >= 2));
  const [a, b] = shuffle(rng, c.kids);
  return {
    premises: [`All ${a} are ${c.mid}.`, `All ${b} are ${c.mid}.`],
    conclusion: `All ${a} are ${b}.`,
    answer: 'Does not follow',
    why: `Both are ${c.mid}, but that does not make one the other`
  };
};

// Celarent: No B are C. All A are B. ⟹ No A are C.
const excludedChain = (rng) => {
  const c = pick(rng, CHAINS);
  const a = pick(rng, c.kids);
  // A class the middle term is known to exclude, or failing that a property.
  const disjoint = DISJOINT.find((d) => d[0] === c.mid);
  const p = disjoint ? disjoint[1] : pick(rng, PROPERTIES);
  return {
    premises: [`No ${c.mid} are ${p}.`, `All ${a} are ${c.mid}.`],
    conclusion: `No ${a} are ${p}.`,
    answer: 'Follows',
    why: `${cap(a)} sit inside ${c.mid}, which is wholly excluded from ${p}`
  };
};

// Affirming the consequent, with a person: All A do X. N does X. ⟹ N is A.
const personTrap = (rng) => {
  const r = pick(rng, ROLES);
  const n = pick(rng, NAMES);
  return {
    premises: [`All ${r.group} ${r.trait}.`, `${n} ${r.traitIs}.`],
    conclusion: `${n} is one of the ${r.group}.`,
    answer: 'Does not follow',
    why: `Others may ${r.trait} too; it does not make ${n} one of the ${r.group}`
  };
};

// Contrapositive with a person: All A do X. N does not do X. ⟹ N is not A.
const personValid = (rng) => {
  const r = pick(rng, ROLES);
  const n = pick(rng, NAMES);
  return {
    premises: [`All ${r.group} ${r.trait}.`, `${n} ${r.traitNot}.`],
    conclusion: `${n} is not one of the ${r.group}.`,
    answer: 'Follows',
    why: `All ${r.group} ${r.trait}, so someone who does not cannot be one of them`
  };
};

// Darii: All B are C. Some A are B. ⟹ Some A are C.
const someValid = (rng) => {
  const c = pick(rng, CHAINS);
  const p = pick(rng, PROPERTIES);
  return {
    premises: [`All ${c.mid} are ${p}.`, `Some ${c.top} are ${c.mid}.`],
    conclusion: `Some ${c.top} are ${p}.`,
    answer: 'Follows',
    why: `Those ${c.top} are ${c.mid}, and every one of the ${c.mid} is ${p}`
  };
};

// Some A are B. Some B are C. ⟹ Some A are C.  (invalid)
const someSome = (rng) => {
  const c = pick(rng, CHAINS);
  const p = pick(rng, PROPERTIES);
  return {
    premises: [`Some ${c.top} are ${c.mid}.`, `Some ${c.mid} are ${p}.`],
    conclusion: `Some ${c.top} are ${p}.`,
    answer: 'Does not follow',
    why: `The ${c.mid} that are ${p} need not be the ones counted among the ${c.top}`
  };
};

// All A are B. Some B are C. ⟹ Some A are C.  (invalid)
const allSome = (rng) => {
  const c = pick(rng, CHAINS);
  const a = pick(rng, c.kids);
  const p = pick(rng, PROPERTIES);
  return {
    premises: [`All ${a} are ${c.mid}.`, `Some ${c.mid} are ${p}.`],
    conclusion: `Some ${a} are ${p}.`,
    answer: 'Does not follow',
    why: `The ${c.mid} that are ${p} need not be the ${a}`
  };
};

// Ferio: No B are C. Some A are B. ⟹ Some A are not C.
const someNot = (rng) => {
  const [x, y] = pick(rng, DISJOINT);
  const w = pick(rng, ['things in the shop', 'items on the list', 'things in the box', 'items on display', 'things on the table']);
  return {
    premises: [`No ${x} are ${y}.`, `Some ${w} are ${x}.`],
    conclusion: `Some ${w} are not ${y}.`,
    answer: 'Follows',
    why: `Those ${w} are ${x}, and no ${x} is one of the ${y}`
  };
};

// Modus ponens: If P then Q. P. ⟹ Q.
const ponens = (rng) => {
  const c = pick(rng, CONDITIONALS);
  return {
    premises: [`If ${c.if}, ${c.then}.`, `${c.did}.`],
    conclusion: `${c.result}.`,
    answer: 'Follows',
    why: 'The condition was met, so the result follows'
  };
};

// Denying the antecedent: If P then Q. Not P. ⟹ Not Q.  (invalid)
const denyAntecedent = (rng) => {
  const c = pick(rng, CONDITIONALS);
  return {
    premises: [`If ${c.if}, ${c.then}.`, `${c.didNot}.`],
    conclusion: `${c.resultNot}.`,
    answer: 'Does not follow',
    why: 'The rule only says what happens IF the condition holds; it could happen for another reason'
  };
};

// Modus tollens: If P then Q. Not Q. ⟹ Not P.
const tollens = (rng) => {
  const c = pick(rng, CONDITIONALS);
  return {
    premises: [`If ${c.if}, ${c.then}.`, `${c.resultNot}.`],
    conclusion: `${c.didNot}.`,
    answer: 'Follows',
    why: `If ${c.if}, ${c.then}. That did not happen, so the condition cannot have held`
  };
};

// Affirming the consequent: If P then Q. Q. ⟹ P.  (invalid)
const affirmConsequent = (rng) => {
  const c = pick(rng, CONDITIONALS);
  return {
    premises: [`If ${c.if}, ${c.then}.`, `${c.result}.`],
    conclusion: `${c.did}.`,
    answer: 'Does not follow',
    why: 'The result could have come about another way entirely'
  };
};

// Camestres: All C are B. No A are B. ⟹ No A are C.
const camestres = (rng) => {
  const c = pick(rng, CHAINS);
  const a = pick(rng, c.kids);
  const [, other] = pick(rng, DISJOINT);
  return {
    premises: [`All ${a} are ${c.mid}.`, `No ${other} are ${c.mid}.`],
    conclusion: `No ${other} are ${a}.`,
    answer: 'Follows',
    why: `${cap(a)} are all ${c.mid}, and ${other} are never ${c.mid}, so none can be ${a}`
  };
};

// Illicit conversion: All A are B. ⟹ All B are A.  (invalid)
const conversion = (rng) => {
  const c = pick(rng, CHAINS);
  const a = pick(rng, c.kids);
  return {
    premises: [`All ${a} are ${c.mid}.`, `Some ${c.mid} are ${pick(rng, PROPERTIES)}.`],
    conclusion: `All ${c.mid} are ${a}.`,
    answer: 'Does not follow',
    why: `"All ${a} are ${c.mid}" does not turn around; ${c.mid} include more than ${a}`
  };
};

// No A are B. No B are C. ⟹ No A are C.  (invalid: two negatives prove nothing)
const twoNegatives = (rng) => {
  const [x, y] = pick(rng, DISJOINT);
  const p = pick(rng, PROPERTIES);
  return {
    premises: [`No ${x} are ${y}.`, `No ${y} are ${p}.`],
    conclusion: `No ${x} are ${p}.`,
    answer: 'Does not follow',
    why: 'Two negative premises prove nothing; the two exclusions never connect'
  };
};

// Abstract letters, valid and invalid forms mixed.
const LETTERS = [['P', 'Q', 'R'], ['A', 'B', 'C'], ['X', 'Y', 'Z'], ['M', 'N', 'O'], ['K', 'L', 'M'], ['D', 'E', 'F'], ['G', 'H', 'J'], ['S', 'T', 'U'], ['F', 'G', 'H'], ['R', 'S', 'T']];
const abstract = (rng) => {
  const [a, b, c] = pick(rng, LETTERS);
  const form = pick(rng, [
    { premises: [`All ${a} are ${b}.`, `All ${b} are ${c}.`], conclusion: `All ${a} are ${c}.`, answer: 'Follows', why: 'The chain links up' },
    { premises: [`All ${a} are ${b}.`, `No ${b} are ${c}.`], conclusion: `No ${a} are ${c}.`, answer: 'Follows', why: `${a} sits inside ${b}, which is wholly excluded from ${c}` },
    { premises: [`No ${a} are ${b}.`, `Some ${c} are ${a}.`], conclusion: `Some ${c} are not ${b}.`, answer: 'Follows', why: `Those ${c} are ${a}, and no ${a} is ${b}` },
    { premises: [`All ${b} are ${c}.`, `Some ${a} are ${b}.`], conclusion: `Some ${a} are ${c}.`, answer: 'Follows', why: `Those ${a} are ${b}, and every ${b} is ${c}` },
    { premises: [`All ${a} are ${b}.`, `Some ${b} are ${c}.`], conclusion: `Some ${a} are ${c}.`, answer: 'Does not follow', why: `The ${b} that are ${c} need not be the ones that are ${a}` },
    { premises: [`All ${a} are ${b}.`, `All ${c} are ${b}.`], conclusion: `All ${a} are ${c}.`, answer: 'Does not follow', why: `Sharing ${b} does not make ${a} and ${c} the same` },
    { premises: [`Some ${a} are ${b}.`, `Some ${b} are ${c}.`], conclusion: `Some ${a} are ${c}.`, answer: 'Does not follow', why: 'Two "some" premises never connect' },
    { premises: [`No ${a} are ${b}.`, `No ${b} are ${c}.`], conclusion: `No ${a} are ${c}.`, answer: 'Does not follow', why: 'Two negative premises prove nothing' }
  ]);
  return form;
};

// Three-step chain, valid or with one broken link.
const longChain = (rng) => {
  const c = pick(rng, CHAINS);
  const a = pick(rng, c.kids);
  const p = pick(rng, PROPERTIES);
  if (rng() < 0.5) {
    return {
      premises: [`All ${a} are ${c.mid}.`, `All ${c.mid} are ${c.top}.`, `All ${c.top} are ${p}.`],
      conclusion: `All ${a} are ${p}.`,
      answer: 'Follows',
      why: `Three links, all pointing the same way: ${a} to ${c.mid} to ${c.top} to ${p}`
    };
  }
  return {
    premises: [`All ${a} are ${c.mid}.`, `All ${c.mid} are ${c.top}.`, `Some ${c.top} are ${p}.`],
    conclusion: `Some ${a} are ${p}.`,
    answer: 'Does not follow',
    why: `The last link is only "some": the ${c.top} that are ${p} need not be the ${a}`
  };
};

/* ---- Forms per band, easy to hard. Valid and invalid alternate so every
   stretch of the band is balanced. ------------------------------------- */
const BAND_FORMS = {
  1: [chainValid, sharedParent, excludedChain, personTrap, personValid, sharedParent, chainValid, personTrap, excludedChain, personTrap],
  2: [someValid, someSome, ponens, denyAntecedent, someNot, allSome, personValid, personTrap, camestres, someSome],
  3: [tollens, affirmConsequent, camestres, conversion, someNot, twoNegatives, longChain, abstract, abstract, abstract]
};

/** The whole pool, every band, ordered easy to hard inside each band. */
export const buildSyllogisms = () => {
  const out = [];
  for (const band of [1, 2, 3]) {
    const rng = seeded(9300 + band);
    const forms = BAND_FORMS[band];
    const seen = new Set();
    for (let i = 0; i < PER_BAND; i += 1) {
      const home = Math.floor((i / PER_BAND) * forms.length);
      // A form with few fillings can run dry; after a few tries the slot
      // borrows from the next form along.
      for (let attempt = 0; attempt < 80; attempt += 1) {
        const form = forms[attempt < 20 ? home : (home + 1 + Math.floor(attempt / 10)) % forms.length];
        const q = form(rng);
        const key = q.premises.join('|') + '>' + q.conclusion;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({ ...q, level: band, tier: tierOf(i, PER_BAND) });
        break;
      }
    }
  }
  return out;
};
