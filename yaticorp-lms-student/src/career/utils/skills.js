/**
 * The bits of a skill that every view draws the same way, kept in one place so
 * the Skills page, its side rail and the Overview cannot drift apart.
 */

// The ladder every skill climbs, weakest first.
export const LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];

// What one finished task is worth, matching the server exactly.
//
// It used to be added to EVERY tracked skill, which is why the Skills page
// once hid the percentages: they were one number copied across every row. A
// task now credits only the skill it actually taught, so the percentages
// differ, mean something, and are worth showing.
export const PER_TASK = 5;

// XP one finished task pays, mirroring TASK_XP in
// backend/services/taskCompletionService.js.
export const TASK_XP = 10;

/**
 * A tile colour for a skill, derived from its own name.
 *
 * Skill names are written by the model — "React.js / Next.js", "Basic Docker &
 * Cloud Deployment" — so there is no fixed set to map brand logos onto, and
 * guessing one would put a React atom next to something that is not React. The
 * initials in a colour derived from the name are always right, always distinct,
 * and stay stable for a given skill across sessions.
 */
const TILE_COLOURS = [
  'from-violet-500 to-purple-600',
  'from-blue-500 to-cyan-500',
  'from-emerald-500 to-teal-500',
  'from-amber-500 to-orange-500',
  'from-rose-500 to-pink-500',
  'from-indigo-500 to-blue-600',
  'from-fuchsia-500 to-purple-600',
  'from-cyan-500 to-sky-600'
];

// FNV-1a with the high bits folded down. The old `hash * 31 + code` picked
// the colour from the low three bits alone, and 31 is -1 mod 8, so that was
// just an alternating sum of character codes — "Git & GitHub", "React.js /
// Next.js" and "Node.js / Express.js" all landed on the same orange.
export const tileFor = (name) => {
  const s = String(name || '');
  let hash = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) hash = Math.imul(hash ^ s.charCodeAt(i), 0x01000193) >>> 0;
  const mixed = (hash ^ (hash >>> 13) ^ (hash >>> 7)) >>> 0;
  return TILE_COLOURS[mixed % TILE_COLOURS.length];
};

/**
 * A colour per skill for one list, guaranteed distinct while the list fits
 * the palette.
 *
 * Hashing alone cannot promise that: with eight colours and eleven names a
 * clash is more likely than not, and the page opened with three orange tiles
 * in a row. Colours are dealt in name order so the assignment is the same on
 * every visit and every view of the same list, and only wraps past the
 * eighth skill — which the server caps the tracker at anyway.
 */
export const tilesFor = (skills = []) => {
  const names = [...new Set(skills.map((s) => String(s.skillName || '')))].sort((a, b) =>
    a.localeCompare(b)
  );
  return new Map(names.map((n, i) => [n, TILE_COLOURS[i % TILE_COLOURS.length]]));
};

/**
 * Up to two initials, taken from the words that carry meaning.
 *
 * Short tokens are skipped because they are almost always file extensions and
 * conjunctions rather than the name: splitting "React.js / Next.js" gives
 * [React, js, Next, js], and taking the first two letters blindly produced
 * "RJ" — the R of React and the j of a file extension. Dropping anything under
 * three characters gets "RN", which is what the skill is actually called.
 */
export const initialsOf = (name) => {
  const words = String(name || '')
    .split(/[\s/&(),.-]+/)
    .filter((w) => /[a-z0-9]/i.test(w));
  if (!words.length) return '?';

  const meaningful = words.filter((w) => w.length >= 3);
  const pick = meaningful.length ? meaningful : words;
  if (pick.length === 1) return pick[0].slice(0, 2).toUpperCase();
  return (pick[0][0] + pick[1][0]).toUpperCase();
};

/** Progress clamped to what a bar can draw. */
export const progressOf = (skill) => Math.max(0, Math.min(100, Number(skill?.progress) || 0));

export const tasksToNextLevel = (progress) =>
  Math.ceil((100 - Math.max(0, Math.min(100, Number(progress) || 0))) / PER_TASK);

export const nextLevel = (level) => LEVELS[LEVELS.indexOf(level) + 1] || null;

/**
 * Where a skill stands, in the three words the page uses everywhere: nothing
 * done yet, being worked, or finished.
 */
export const statusOf = (skill) => {
  const p = progressOf(skill);
  if (p >= 100) return 'completed';
  if (p > 0) return 'active';
  return 'pending';
};
