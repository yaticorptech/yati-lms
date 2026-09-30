/**
 * Where the Career Path mascot stands, how it gets there, and which way it
 * faces. Boxes in, numbers out: the engine measures the page and hands the
 * rectangles over, so none of this needs a browser to be tested.
 *
 * A box is a viewport rectangle: { left, top, right, bottom }.
 */
import { layout, walk } from '../../mascot/mascotConfig.js';

// Clearance kept beside what it points at.
export const GAP = layout.gap;
// The pointing still points sideways, so standing above or below a target
// only wins when neither side has room.
const VERTICAL_COST = 4000;
// However busy its corner, this much of the mascot stays in view.
const MIN_SHOW = 56;

const clamp = (value, low, high) => Math.min(Math.max(value, low), Math.max(low, high));

/** How much of `a` lies over `b`, in square pixels. */
export const overlap = (a, b) =>
    Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) *
    Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));

const boxAt = (x, y, size) => ({ left: x, top: y, right: x + size.w, bottom: y + size.h });

export const onScreen = (box, safe) =>
    box.bottom > safe.top && box.top < safe.bottom && box.right > safe.left && box.left < safe.right;

/**
 * The spot beside `target` for a mascot of `size` ({ w, h }): to its right,
 * else its left, else below, else above. Each side is scored on what it would
 * cost — standing on the target itself (it hides the thing being pointed at)
 * costs most, being shoved off that side by the screen edge next, standing
 * above or below (the pointing still points sideways) after that, covering one
 * of `obstacles` (the other controls nearby) least — and the cheapest wins.
 * Always inside `safe`, the part of the screen no fixed bar sits over, and
 * always facing the target, since pointing at it is what comes next.
 */
export function standBeside(target, size, safe, obstacles = [], gap = GAP) {
    const midY = (target.top + target.bottom) / 2 - size.h / 2;
    const midX = (target.left + target.right) / 2 - size.w / 2;
    const sides = [
        { side: 'right', x: target.right + gap, y: midY, along: 'x' },
        { side: 'left', x: target.left - gap - size.w, y: midY, along: 'x' },
        { side: 'below', x: midX, y: target.bottom + gap, along: 'y' },
        { side: 'above', x: midX, y: target.top - gap - size.h, along: 'y' }
    ];
    let best = null;
    sides.forEach((want, order) => {
        const x = clamp(want.x, safe.left, safe.right - size.w);
        const y = clamp(want.y, safe.top, safe.bottom - size.h);
        const box = boxAt(x, y, size);
        // Only a squeeze along the way it steps out counts: sliding up or down
        // beside a tall target to stay on screen is still standing beside it.
        const squeezed = want.along === 'x' ? Math.abs(x - want.x) : Math.abs(y - want.y);
        const covered = obstacles.reduce((sum, o) => sum + overlap(box, o), 0);
        const vertical = want.along === 'y' ? VERTICAL_COST : 0;
        const cost = overlap(box, target) * 100 + squeezed * 50 + vertical + covered + order;
        if (!best || cost < best.cost) best = { side: want.side, x, y, cost };
    });
    const facing = best.x + size.w / 2 > (target.left + target.right) / 2 ? 'left' : 'right';
    return { x: best.x, y: best.y, side: best.side, facing };
}

/**
 * Where it rests between moments: the bottom right corner, or the bottom left
 * if that one is clearer. When a control is in its corner it ducks below it
 * and peeks up from the bottom edge, never showing less than MIN_SHOW of
 * itself — it never stands on a button, even though clicks pass through it.
 * `floorY` lowers the resting line: docked on a phone it stands part-way
 * behind the bottom nav, so only its head and shoulders are over the page.
 */
export function homeSpot(safe, size, obstacles = [], margin = 16, floorY = null) {
    const floor = floorY ?? safe.bottom - size.h;
    const lowest = safe.bottom - MIN_SHOW;
    let best = null;
    [safe.right - size.w - margin, safe.left + margin].forEach((x, order) => {
        let y = floor;
        // Ducking can bring the next control below into reach; a few passes settle it.
        for (let pass = 0; pass < 4; pass++) {
            const box = boxAt(x, y, size);
            const hit = obstacles.filter((o) => overlap(box, o) > 0 && o.top < safe.bottom);
            if (!hit.length) break;
            y = Math.min(lowest, Math.max(y, ...hit.map((o) => o.bottom + 8)));
            if (y === lowest) break;
        }
        const covered = obstacles.reduce((sum, o) => sum + overlap(boxAt(x, y, size), o), 0);
        // A corner it has to duck in costs a little; one where it still covers something costs a lot.
        const cost = covered * 10 + (y - floor) + order;
        if (!best || cost < best.cost) best = { x, y, cost };
    });
    return { x: best.x, y: best.y };
}

/** The middle of the safe area, standing on its floor. */
export const centreSpot = (safe, size) => ({
    x: clamp((safe.left + safe.right) / 2 - size.w / 2, safe.left, safe.right - size.w),
    y: clamp(safe.bottom - size.h - 24, safe.top, safe.bottom - size.h)
});

/**
 * A short stroll from `from`: up to `maxPx` sideways along the same floor,
 * inside `safe`, and not onto any obstacle. `rnd` is a 0..1 source, so tests
 * can choose. Null when there is nowhere clear to go.
 */
export function wanderSpot(from, size, safe, obstacles = [], maxPx = 160, rnd = Math.random) {
    for (let attempt = 0; attempt < 6; attempt++) {
        const dx = (rnd() * 2 - 1) * maxPx;
        const x = clamp(from.x + dx, safe.left + 8, safe.right - size.w - 8);
        if (Math.abs(x - from.x) < 40) continue;
        const box = boxAt(x, from.y, size);
        if (obstacles.some((o) => overlap(box, o) > 0)) continue;
        return { x, y: from.y };
    }
    return null;
}

/** How long a walk from `from` to `to` deserves to take; 0 when it is already there. */
export function walkMs(from, to) {
    const distance = Math.hypot(to.x - from.x, to.y - from.y);
    return distance < 2 ? 0 : Math.round(clamp(distance * walk.msPerPx, walk.minWaitMs, walk.maxWaitMs));
}

/** Which way to face for a walk from `from` to `to`; a walk straight up or down keeps `current`. */
export const facingFor = (from, to, current = 'right') =>
    Math.abs(to.x - from.x) < 4 ? current : to.x < from.x ? 'left' : 'right';

/**
 * How far the page has to scroll to bring `target` into the middle of `safe`:
 * 0 when it is already comfortably on screen, negative to scroll up.
 */
export function scrollDelta(target, safe, margin = 32) {
    if (target.top >= safe.top + margin && target.bottom <= safe.bottom - margin) return 0;
    return Math.round((target.top + target.bottom) / 2 - (safe.top + safe.bottom) / 2);
}

/**
 * Where a target sits from the mascot's eyes, as a gaze (-1..1 each way),
 * so it can look at what it is about to point at or what the cursor is on.
 */
export function gazeToward(mascotBox, point, range) {
    const cx = (mascotBox.left + mascotBox.right) / 2;
    const cy = mascotBox.top + (mascotBox.bottom - mascotBox.top) * 0.3;
    return { x: clamp((point.x - cx) / range, -1, 1), y: clamp((point.y - cy) / range, -1, 1) };
}
