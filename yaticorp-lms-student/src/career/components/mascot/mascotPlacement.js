/**
 * Deciding where the mascot may stand.
 *
 * Given the box of a thing it is talking about, this picks a spot beside it:
 * on screen, clear of the app's fixed furniture, and never on top of the
 * element itself, because a mascot standing on a button is a button that
 * cannot be pressed.
 *
 * Candidates are scored rather than chosen by a fixed preference, so the
 * character behaves sensibly at the edge of the viewport and on a phone
 * without a special case for each situation.
 */

/** Clearance from the window edges. */
export const EDGE = 14;
/** How far from a target the mascot stands. */
export const GAP = 18;

/** Half the character's width at a given height, using the canonical shape. */
const halfWidth = (size) => size * 0.42;

/**
 * The app's fixed furniture, measured rather than assumed. The mascot must
 * not stand behind the header or under the floating phone navigation.
 */
export const forbiddenBands = () => {
  const bands = [];
  const header = document.querySelector('header');
  if (header) {
    const r = header.getBoundingClientRect();
    // Only a header actually pinned to the top of the viewport blocks anything.
    if (r.top <= 1 && r.height > 0) bands.push({ side: 'top', top: 0, bottom: r.bottom });
  }
  const nav = document.querySelector('nav[aria-label="Main sections"]');
  if (nav) {
    const r = nav.getBoundingClientRect();
    if (r.height > 0) bands.push({ side: 'bottom', top: r.top, bottom: window.innerHeight });
  }
  return bands;
};

/** Somewhere a modal is holding the screen: the mascot has no business there. */
export const overlayOpen = () => {
  if (typeof document === 'undefined') return false;
  return !!document.querySelector('[role="dialog"], [data-mascot-blocks]');
};

/** How much of a proposed footing sits inside forbidden furniture. */
const bandPenalty = (y, size, bands) => {
  const top = y - size;
  let worst = 0;
  for (const b of bands) {
    const overlap = Math.min(y, b.bottom) - Math.max(top, b.top);
    if (overlap > worst) worst = overlap;
  }
  return worst;
};

/**
 * Where to stand to point at a rectangle.
 *
 * Returns feet-centre coordinates in viewport space plus which way to face.
 * `facingLeft` means the character is to the target's right and looks back at
 * it, which is what makes pointing read.
 */
export const standBeside = (rect, size) => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const half = halfWidth(size);
  const bands = forbiddenBands();

  const floor = (y) => Math.min(Math.max(y, EDGE + size), h - EDGE);
  const clampX = (x) => Math.min(Math.max(x, EDGE + half), w - EDGE - half);

  const candidates = [
    { side: 'right', x: rect.right + GAP + half, y: rect.bottom, facingLeft: true, room: w - rect.right },
    { side: 'left', x: rect.left - GAP - half, y: rect.bottom, facingLeft: false, room: rect.left },
    { side: 'below', x: rect.left + rect.width / 2, y: rect.bottom + GAP + size, facingLeft: false, room: h - rect.bottom },
    { side: 'above', x: rect.left + rect.width / 2, y: rect.top - GAP, facingLeft: false, room: rect.top }
  ];

  let best = null;
  for (const c of candidates) {
    const x = clampX(c.x);
    const y = floor(c.y);
    // How far the clamp had to drag it, and whether it still covers the target.
    const dragged = Math.abs(x - c.x) + Math.abs(y - c.y);
    const covers =
      x + half > rect.left && x - half < rect.right && y > rect.top && y - size < rect.bottom ? 1 : 0;
    const score = c.room - dragged * 2 - covers * 900 - bandPenalty(y, size, bands) * 3;
    if (!best || score > best.score) best = { x, y, facingLeft: c.facingLeft, side: c.side, score };
  }
  return best;
};

/** Where the mascot waits when no slot and nothing to point at. */
export const cornerSpot = (size) => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  /*
   * The floor is the top of whatever is pinned to the BOTTOM of the screen,
   * or the bottom edge itself. Only bottom-pinned furniture counts.
   *
   * This previously took the minimum `top` across every band. The header's
   * top is zero, so the answer was always zero and the corner resolved to the
   * top of the viewport — which is why the mascot shot upward every time it
   * docked or left.
   */
  const bottom = forbiddenBands().filter((b) => b.side === 'bottom');
  // Clear of bottom furniture where there is any, otherwise on the bottom edge.
  const floor = bottom.length ? Math.min(...bottom.map((b) => b.top)) - 8 : h - EDGE;

  return { x: w - EDGE - halfWidth(size), y: Math.max(EDGE + size, floor) };
};

/** Off the side of the screen, feet on the same floor it would rest on. */
export const offStageSpot = (size) => {
  const home = cornerSpot(size);
  return { x: window.innerWidth + size, y: home.y };
};

/** Standing in a slot: centred on its box, feet on its base. */
export const spotInSlot = (rect, size) => ({
  x: Math.min(Math.max(rect.left + rect.width / 2, EDGE + halfWidth(size)), window.innerWidth - EDGE - halfWidth(size)),
  y: Math.min(Math.max(rect.bottom, EDGE + size), window.innerHeight - EDGE)
});

/**
 * Which side of the mascot the speech bubble opens on.
 *
 * Which way the character faces already encodes where the target is: facing
 * left means it stands to the target's right, so the bubble opens rightward,
 * away from the thing being explained. That keeps the explanation off the
 * element without needing to know either box.
 */
export const bubbleSide = (facingLeft) => (facingLeft ? 'right' : 'left');
