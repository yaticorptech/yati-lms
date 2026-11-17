/**
 * Sequence Vault (Rising Brains, memory) — pure and seeded.
 *
 * A vault has 2–4 coloured doors, each with a short digit code. The codes are
 * studied once, then hidden; the player is asked to unlock one door at a time
 * on a keypad. From the middle levels on, a shown RULE changes one door's code
 * between questions (a digit turns up or down like a dial, or the code rotates),
 * so the player has to update what they remember rather than just recall it.
 */
import { intBetween, pick, sample } from '../seeded.js';

/** Door colours (the component maps each key to its own colours). */
export const VAULT_DOORS = [
  { key: 'red', name: 'Red' },
  { key: 'blue', name: 'Blue' },
  { key: 'green', name: 'Green' },
  { key: 'amber', name: 'Gold' },
  { key: 'violet', name: 'Purple' }
];

export const vaultBand = (ageBand) => (ageBand === 'analytical' ? 'analytical' : 'intermediate');

const clampN = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const ramp = (from, to, levelNo) => Math.round(from + (to - from) * clampN((levelNo - 1) / 29, 0, 1));

/**
 * doors, length — how many doors and digits per code
 * asks           — rounds in the level (each a fresh vault); pass clears it
 * rules          — code changes in each round after the first (the first round: one fewer, at least 0)
 * kinds          — the change rules in play ('add' = one digit turns; 'rotate' = first digit goes to the end)
 * study          — seconds to study each vault's codes
 */
export const vaultConfig = (ageBand, difficulty = 1, levelNo = 1) => {
  const band = vaultBand(ageBand);
  const d = clampN(difficulty || 1, 1, 3);
  if (band === 'intermediate') {
    const doors = d === 1 ? (levelNo >= 10 ? 3 : 2) : 3;
    const length = d === 3 || (d === 2 && levelNo >= 15) ? 4 : 3;
    const rules = d === 1 ? (levelNo >= 8 ? 2 : 1) : 2;
    const asks = ramp(6, 8, levelNo);
    return { band, doors, length, rules, kinds: ['add'], asks, pass: Math.ceil(asks * 0.6), study: doors * length + 3 - d };
  }
  const doors = d === 3 || levelNo >= 20 ? 4 : 3;
  const length = 4;
  const rules = 2 + (d >= 2 ? 1 : 0);
  const asks = ramp(6, 8, levelNo);
  return {
    band, doors, length, rules, kinds: d === 1 ? ['add'] : ['add', 'rotate'], asks,
    pass: Math.ceil(asks * 0.6), study: doors * length + 1 - d
  };
};

/** One code: digits, never all the same digit. */
const makeCode = (rng, length) => {
  for (;;) {
    const code = Array.from({ length }, () => intBetween(rng, 0, 9));
    if (new Set(code).size > 1) return code;
  }
};

/** The code after a rule is applied. */
export const applyRule = (code, rule) => {
  if (rule.kind === 'rotate') return [...code.slice(1), code[0]];
  return code.map((digit, i) => (i === rule.pos ? (((digit + rule.delta) % 10) + 10) % 10 : digit));
};

const ORD = ['1st', '2nd', '3rd', '4th', '5th'];

/** What the rule card says. */
export const describeRule = (rule, doorName) => {
  if (rule.kind === 'rotate') return `${doorName} door: its first digit moves to the end of the code.`;
  const by = Math.abs(rule.delta);
  return rule.delta > 0
    ? `${doorName} door: the ${ORD[rule.pos]} digit turns UP by ${by} (9 wraps round to 0).`
    : `${doorName} door: the ${ORD[rule.pos]} digit turns DOWN by ${by} (0 wraps round to 9).`;
};

/** Does an entry (array or string of digits) open a door whose code is `answer`? */
export const checkCode = (answer, entry) => {
  const typed = typeof entry === 'string' ? entry.split('').map(Number) : entry;
  return typed.length === answer.length && typed.every((d, i) => d === answer[i]);
};

/**
 * A level (2026-11-16: every round is a fresh vault, so the codes keep changing):
 *  steps: [{ doors: [{ key, name, code }], changes: [{ rule, ruleText }], door, answer }]
 *  Each round: new door colours and codes to study; then its code-change cards, one after another; then one door is
 *  asked — usually one that just changed — and `answer` is its code after every change.
 */
const freshDoors = (rng, config) => {
  const doors = [];
  for (const door of sample(rng, VAULT_DOORS, config.doors)) {
    let code = makeCode(rng, config.length);
    while (doors.some((o) => o.code.join('') === code.join(''))) code = makeCode(rng, config.length);
    doors.push({ ...door, code });
  }
  return doors;
};

const makeRule = (rng, config, door, code) => {
  const kind = pick(rng, config.kinds);
  let rule = kind === 'rotate'
    ? { kind, door }
    : { kind, door, pos: intBetween(rng, 0, config.length - 1), delta: pick(rng, [1, 1, 2, 3, -1, -2]) };
  // A rotate that changes nothing (all digits equal): a turn instead.
  if (applyRule(code, rule).join('') === code.join('')) rule = { kind: 'add', door, pos: 0, delta: 1 };
  return rule;
};

export const makeVaultLevel = (rng, config) => {
  const steps = [];
  for (let i = 0; i < config.asks; i++) {
    const doors = freshDoors(rng, config);
    const current = doors.map((d) => [...d.code]);
    const count = i === 0 ? Math.max(0, config.rules - 1) : config.rules;
    const changes = [];
    for (let k = 0; k < count; k++) {
      const door = intBetween(rng, 0, doors.length - 1);
      const rule = makeRule(rng, config, door, current[door]);
      current[door] = applyRule(current[door], rule);
      changes.push({ rule, ruleText: describeRule(rule, doors[door].name) });
    }
    const changed = [...new Set(changes.map((c) => c.rule.door))];
    const door = changed.length && rng() < 0.75 ? pick(rng, changed) : intBetween(rng, 0, doors.length - 1);
    steps.push({ doors, changes, door, answer: [...current[door]] });
  }
  return { steps };
};
