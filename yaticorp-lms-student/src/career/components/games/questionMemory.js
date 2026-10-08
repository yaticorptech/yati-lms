// With the extension: the quiz-pool tests load this file under plain node.
import { gameKey } from './gameStorage.js';

/**
 * Which questions a student has already been asked, and which they got right.
 *
 * The quiz games used to deal from a rotating window: `pool[(levelNo * size) + i]`.
 * With a band of fifteen questions and thirty levels asking five to twelve
 * each, that window wraps almost immediately — measured over a full band, 94%
 * of everything asked was a repeat, every question came round sixteen to
 * eighteen times, and level four re-asked two of level one's. A student who
 * had just answered something correctly was asked it again a minute later,
 * which reads as the game being broken rather than as revision.
 *
 * The window is replaced by a memory. A question that has never been asked is
 * always dealt before one that has; among questions already asked, the ones
 * answered correctly are dealt last. So a band's whole pool is exhausted
 * before anything comes back, and what comes back first is what the student
 * has NOT got right.
 *
 * Kept per student, per game and per band, in localStorage beside the level
 * and star records, because it is progress: it must survive a reload, and it
 * means nothing on another game's ladder or to another student.
 *
 * This does not abolish repetition — a band asks about two hundred and fifty
 * questions over its thirty levels, and no amount of bookkeeping invents
 * content. The generated pools (data/gen*.js) hold a hundred and fifty a
 * band and the written ones about forty; the quiz borrows the next band's
 * questions once its own are used up. This makes every repeat as late and as
 * useful as it can be.
 */

// Per student, like the level and star records: see gameStorage.js.
const KEY = 'yati:gameSeen';

const read = () => {
  try {
    return JSON.parse(localStorage.getItem(gameKey(KEY)) || '{}');
  } catch {
    // A corrupt entry must not take the games down with it.
    return {};
  }
};

const write = (value) => {
  try {
    localStorage.setItem(gameKey(KEY), JSON.stringify(value));
  } catch {
    // Private mode or a blocked origin: the game still plays, it just forgets.
  }
};

/**
 * A short, stable name for a question.
 *
 * Built from the question's own content rather than its position, so editing
 * the pool — adding questions, reordering them — does not silently rename
 * every record and wipe the memory. Options are sorted first because several
 * games shuffle them before they ever reach here, and the same question with
 * its options in a different order is the same question.
 */
export const keyOf = (question) => {
  if (!question) return '';
  // Options are sorted (below); a question's difficulty grading is not part
  // of what makes it that question, and a borrowed one carries a shift and
  // the band it was borrowed from.
  // eslint-disable-next-line no-unused-vars
  const { options, tier, tierShift, fromBand, ...rest } = question;
  const shape = JSON.stringify({
    ...rest,
    options: Array.isArray(options) ? [...options].map(String).sort() : options
  });
  // djb2. Short enough to store thousands of, and collisions here cost a
  // question dealt slightly out of turn — not a wrong answer.
  let hash = 5381;
  for (let i = 0; i < shape.length; i += 1) hash = ((hash << 5) + hash + shape.charCodeAt(i)) | 0;
  return (hash >>> 0).toString(36);
};

const bucketFor = (gameId, band) => `${gameId}:${band}`;

/**
 * The band a question belongs to, for its record: the band it was borrowed
 * from when it carries one (QuizGame tags borrowed questions `fromBand`),
 * otherwise the band being played.
 *
 * Borrowed questions used to be remembered under the band that borrowed
 * them. When the student then reached the band they came from, its record
 * had never heard of them, so they were dealt again as fresh — the same
 * question on level 28 and level 31.
 */
export const bandFor = (question, band) =>
  Number.isInteger(question?.fromBand) ? question.fromBand : band;

/** What this student has done with each question of one game's band. */
export const recordFor = (gameId, band) => read()[bucketFor(gameId, band)] || {};

/**
 * Note that a question was asked, and whether it was answered correctly.
 *
 * `asked` climbs on every showing and `correct` only on a right answer, so the
 * two together order the pool: unseen, then seen-but-not-mastered, then the
 * ones already known.
 */
export const remember = (gameId, band, question, wasCorrect) => {
  const key = keyOf(question);
  if (!key) return;
  const all = read();
  const bucket = bucketFor(gameId, bandFor(question, band));
  const entry = all[bucket]?.[key] || { asked: 0, correct: 0 };
  all[bucket] = {
    ...all[bucket],
    [key]: {
      asked: entry.asked + 1,
      correct: entry.correct + (wasCorrect ? 1 : 0),
      // A counter, not a clock: it only ever has to order one bucket against
      // itself, and a wrong system clock must not scramble that order.
      at: (all[bucket]?.__seq || 0) + 1
    },
    __seq: (all[bucket]?.__seq || 0) + 1
  };
  write(all);
};

/**
 * The `size` questions this level should ask, hardest-earned first.
 *
 * Ordered, not shuffled: the caller shuffles what it is given, because the
 * order questions are CHOSEN in and the order they are SHOWN in are different
 * decisions, and conflating them is what the old window did wrong.
 *
 * `focus` is how far through the band the level sits, 0 to 1. A band's
 * questions run easy to hard — generated pools carry a `tier` from 0 to 1,
 * and a hand-written pool is taken in the order it was written — and among
 * questions that are otherwise equal, the ones whose difficulty is nearest
 * the level's are dealt first. It is a tiebreak, deliberately: an unseen
 * hard question still beats a seen easy one at level two, because a fresh
 * question is worth more than a perfectly graded repeat.
 *
 * A question borrowed from a neighbouring band (see QuizGame) carries a
 * `tierShift` of +1 or -1, so the next band's easiest questions sit just
 * above this band's hardest and are dealt in that order.
 */
export const pickQuestions = (pool, size, gameId, band, focus = null) => {
  if (!Array.isArray(pool) || !pool.length) return [];
  // Each question is looked up in its OWN band's record: a question borrowed
  // from the band above was remembered there (see bandFor), and must count as
  // seen when that band's levels come round.
  const records = {};
  const recordOf = (question) => {
    const b = bandFor(question, band);
    if (!records[b]) records[b] = recordFor(gameId, b);
    return records[b];
  };
  const last = Math.max(1, pool.length - 1);

  const ranked = pool
    .map((question, i) => {
      const seen = recordOf(question)[keyOf(question)] || { asked: 0, correct: 0, at: 0 };
      const tier = (typeof question.tier === 'number' ? question.tier : i / last) + (question.tierShift || 0);
      const distance = focus === null ? 0 : Math.abs(tier - focus);
      return { question, seen, i, distance };
    })
    .sort((a, b) => {
      // Never asked beats asked, however long ago.
      if ((a.seen.asked === 0) !== (b.seen.asked === 0)) return a.seen.asked === 0 ? -1 : 1;
      // Then: what the student has not got right yet.
      if (a.seen.correct !== b.seen.correct) return a.seen.correct - b.seen.correct;
      // Then: whatever has been waiting longest since it was last asked.
      if (a.seen.at !== b.seen.at) return a.seen.at - b.seen.at;
      // Then: whatever best fits how far up the band this level is.
      if (a.distance !== b.distance) return a.distance - b.distance;
      // Stable tiebreak, so two untouched questions keep the pool's own order.
      return a.i - b.i;
    });

  return ranked.slice(0, Math.min(size, pool.length)).map((r) => r.question);
};

/** For tests, and for a student who wants a clean slate. */
export const forget = (gameId, band) => {
  const all = read();
  delete all[bucketFor(gameId, band)];
  write(all);
};
