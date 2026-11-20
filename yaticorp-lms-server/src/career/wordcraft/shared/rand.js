/** WORDCRAFT's seeded random helpers (2026-11-20) — the same as data/seeded.js (mulberry32), kept in this folder so
 * the server can run an exact copy of the WORDCRAFT logic. */
export const seeded = (seed) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/** A whole number in [min, max], inclusive. */
export const intBetween = (rng, min, max) => min + Math.floor(rng() * (max - min + 1));

/** One item of a list. */
export const pick = (rng, list) => list[Math.floor(rng() * list.length)];

/** A shuffled copy of a list. */
export const shuffle = (rng, list) => {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};
