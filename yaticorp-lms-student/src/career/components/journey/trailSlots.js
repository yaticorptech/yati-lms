/** Which phases stand on the climb's trail (JourneyStairs.jsx), kept apart so it can be tested on its own. */

/**
 * The phases on the trail's places (`max` of them: 9 on a wide scene, 5 on a phone), in order: all of them when they fit; otherwise the first
 * (where the climb starts), the goal (at the summit), and the current one with its neighbours —
 * the next before the one behind — between them. The rest are a tap away ("View all steps").
 * (Until 2026-10-27 the window began one step behind the current, so a student on step 3 or
 * later lost step 1.)
 */
export const trailSlots = (total, done, max = 5) => {
    if (total <= max) return Array.from({ length: total }, (_, i) => i);
    const current = Math.min(done, total - 1);
    const shown = new Set([0, total - 1, current]);
    for (let step = 1; shown.size < max && step < total; step += 1) {
        if (current + step < total - 1) shown.add(current + step);
        if (shown.size < max && current - step > 0) shown.add(current - step);
    }
    return [...shown].sort((x, y) => x - y);
};

/**
 * Where the climbing robot stands, from the same progress the cards show: beside the current
 * step's place on the trail (its index among `slots`), or 'summit' once every step is done.
 * Never read back from the picture, and never used to change progress.
 */
export const robotPlace = (slots, total, done) => {
    if (!total) return null;
    if (done >= total) return 'summit';
    const at = slots.indexOf(done);
    return at >= 0 ? at : 0;
};
