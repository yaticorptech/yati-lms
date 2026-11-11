import { useRef } from 'react';

// A question is the same question whatever order its options are shuffled into.
// eslint-disable-next-line no-unused-vars
const sameness = ({ options, ...rest }) => JSON.stringify(rest);

/**
 * No question twice in one level (asked 2026-11-05: "the same question is
 * repeated — use different numbers every time").
 *
 * The games that make a question after every answer (Percent Snap, Math
 * Sprint…) drew each one at random, so a small level could deal "25% of 12"
 * three times in a minute. `fresh(make)` draws again until it gets one this
 * round has not asked. Each round is its own component, keyed on level and
 * attempt, so the memory starts empty for every level and every retry. If a
 * level truly has nothing new left, the last draw is used rather than hang.
 */
export default function useFresh(keyOf = sameness) {
  const asked = useRef(new Set());
  return (make) => {
    let q;
    for (let i = 0; i < 60; i += 1) {
      q = make();
      const key = keyOf(q);
      if (!asked.current.has(key)) {
        asked.current.add(key);
        return q;
      }
    }
    return q;
  };
}
