/**
 * Where the brain games keep their records in this browser: one set of keys
 * per signed-in student.
 *
 * The level, star and question-memory records used to sit under fixed keys
 * (`yati:gameLevel`, `yati:gameStars`, `yati:gameSeen`, `yati:gameRecent`),
 * shared by everyone who ever signed in on the device. On a shared or family
 * computer the second student inherited the first one's ladder, and the hub's
 * sync then pushed it up to the second student's account as their own —
 * stars, levels, leaderboard places and XP they never earned.
 *
 * Every key now carries the student's id. The old unscoped keys are dropped
 * the first time this runs, not migrated: nothing in them says whose they
 * were, so handing them to whoever happens to be signed in is exactly the bug.
 * Nothing is lost by dropping them — every level end was already sent to the
 * account it was played on, and the hub pulls that copy back down.
 */

const LEGACY_KEYS = ['yati:gameLevel', 'yati:gameStars', 'yati:gameSeen', 'yati:gameRecent'];

let legacyDropped = false;
const dropLegacy = () => {
  if (legacyDropped) return;
  legacyDropped = true;
  try {
    for (const key of LEGACY_KEYS) localStorage.removeItem(key);
  } catch {
    // Private mode or a blocked origin: there is nothing stored to drop.
  }
};

/**
 * The signed-in student's id, from the session the auth context keeps in
 * `studentData`, or null when nobody is signed in.
 */
export const currentStudentId = () => {
  try {
    const id = JSON.parse(localStorage.getItem('studentData') || 'null')?._id;
    return typeof id === 'string' && id ? id : null;
  } catch {
    return null;
  }
};

/**
 * The storage key for one record, for the student signed in now. With nobody
 * signed in it is a throwaway `:guest` key, which is never sent to the server.
 */
export const gameKey = (base) => {
  dropLegacy();
  return `${base}:${currentStudentId() || 'guest'}`;
};
