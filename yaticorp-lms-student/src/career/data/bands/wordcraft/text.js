/**
 * WORDCRAFT's word helpers (2026-11-20) — the same as Speak Up's (speakUp.js), kept here so the WORDCRAFT logic
 * files have no outside imports and the server can run an exact copy of them (yaticorp-lms-server/src/career/
 * wordcraft/shared, kept in step by scripts/syncWordcraft.js and a test).
 */

export const NUM = { 0: 'zero', 1: 'one', 2: 'two', 3: 'three', 4: 'four', 5: 'five', 6: 'six', 7: 'seven', 8: 'eight', 9: 'nine', 10: 'ten', 20: 'twenty', 30: 'thirty', 50: 'fifty', 100: 'hundred' };
/** Lower-case words, punctuation gone, digits spelt out ("3" → "three"). */
export const words = (text) => String(text || '').toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9\s-]/g, ' ').replace(/-/g, ' ')
  .split(/\s+/).filter(Boolean).map((w) => (NUM[w] ?? w));

/** Two spoken words are the same if equal, or one letter apart in a long word (speech engines slip). */
const sameWord = (a, b) => {
  if (a === b) return true;
  if (a === `${b}s` || b === `${a}s`) return true; // walk / walks
  if (Math.min(a.length, b.length) < 5 || Math.abs(a.length - b.length) > 1) return false;
  let i = 0; let j = 0; let edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i += 1; j += 1; continue; }
    edits += 1; if (edits > 1) return false;
    if (a.length > b.length) i += 1; else if (b.length > a.length) j += 1; else { i += 1; j += 1; }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
};

/** Which words of `target` were said, in order (longest common subsequence): a boolean per target word. */
export const alignWords = (target, spoken) => {
  const t = words(target); const s = words(spoken);
  const L = Array.from({ length: t.length + 1 }, () => new Array(s.length + 1).fill(0));
  for (let i = t.length - 1; i >= 0; i -= 1) for (let j = s.length - 1; j >= 0; j -= 1) {
    L[i][j] = sameWord(t[i], s[j]) ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  }
  const hit = new Array(t.length).fill(false);
  let i = 0; let j = 0;
  while (i < t.length && j < s.length) {
    if (sameWord(t[i], s[j])) { hit[i] = true; i += 1; j += 1; } else if (L[i + 1][j] >= L[i][j + 1]) i += 1; else j += 1;
  }
  return hit;
};

/** Words per minute → a 0–100 fluency score: 110–160 wpm is a natural speaking pace. */
export const paceScore = (wpm) => (wpm <= 0 ? 0 : wpm < 110 ? Math.round(Math.max(0, 100 - (110 - wpm) * 1.4)) : wpm <= 160 ? 100 : Math.round(Math.max(40, 100 - (wpm - 160) * 1.2)));

export const FILLERS = ['um', 'uh', 'erm', 'er', 'hmm', 'like', 'basically', 'actually', 'you know', 'i mean', 'sort of', 'kind of', 'literally'];
