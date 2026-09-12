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
/**
 * How far from a target the mascot stands.
 *
 * Wide enough that the element keeps a clear margin on every side and stays
 * comfortably clickable — a guide leaning on the button it is recommending
 * is a guide in the way.
 */
export const GAP = 26;

/** Half the character's width at a given height, using the canonical shape. */
const halfWidth = (size) => size * 0.42;

/**
 * The app's fixed furniture, measured rather than assumed. The mascot must
 * not stand behind a top bar, under the floating phone navigation, or on top
 * of anything a page has pinned to an edge of the screen.
 *
 * The `<header>` and the phone nav are found by what they are. Everything
 * else has to say so with `data-mascot-avoid`, because "is this element
 * pinned to an edge?" cannot be answered by scanning the document cheaply or
 * reliably — and a bar the mascot stands on is a bar that cannot be read.
 *
 * A marked element is read as whichever edge it is actually against, not
 * assumed to be the bottom one. The layout has two top bars, one for each
 * width: the desktop one is a `<header>` and is found above, but the phone
 * one is a plain div, so on a phone nothing was found at all — and because
 * the desktop `<header>` is still in the document at that width, merely
 * hidden, it measured as a zero-height box and quietly reported no bar
 * rather than no match. The character walked up behind the black bar.
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
  // `?? []` keeps this working against a minimal document — the placement
  // rules are tested headless, against a stub with no querySelectorAll.
  for (const el of document.querySelectorAll?.('[data-mascot-avoid]') ?? []) {
    const r = el.getBoundingClientRect();
    // Zero height is the hidden half of a responsive pair, not a bar.
    if (r.height <= 0) continue;
    if (r.top <= 1) {
      bands.push({ side: 'top', top: 0, bottom: r.bottom });
    } else if (r.bottom > window.innerHeight - r.height - 8) {
      // Only while it is actually on screen and near the foot of it.
      bands.push({ side: 'bottom', top: r.top, bottom: window.innerHeight });
    }
  }
  return bands;
};

/** The lowest edge of everything pinned to the top of the screen. */
export const topGuard = (bands) =>
  bands.reduce((m, b) => (b.side === 'top' ? Math.max(m, b.bottom) : m), 0);

/**
 * Roughly how much room the speech bubble takes.
 *
 * A worst case, not a measurement: the bubble is `w-max` up to these limits,
 * so scoring against the maximum means a placement that would be judged
 * clear can never turn out not to be.
 */
export const BUBBLE_H = 84;
const BUBBLE_GAP = 10;

/**
 * The bubble's cap is narrower on a phone (`max-w-[13rem]`) than above it
 * (`sm:max-w-xs`), and scoring it at the desktop width on a 360px screen
 * made every placement look like it clipped — so the two agree.
 */
export const bubbleWidth = () => (window.innerWidth < 640 ? 208 : 236);

/**
 * Rectangles a page has asked the character to keep off.
 *
 * The scoring below already refuses to stand on the element it is pointing
 * at, which is not the same as refusing to stand on the paragraph beside it.
 * Nothing can infer "this is words the student is reading" from the DOM, so
 * a page says so with `data-mascot-clear` and this is what reads it.
 */
export const keepOutRects = () => {
  const out = [];
  for (const el of document.querySelectorAll?.('[data-mascot-clear]') ?? []) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) out.push(r);
  }
  return out;
};

const overlapArea = (a, b) => {
  const w = Math.min(a.right, b.right) - Math.max(a.left, b.left);
  const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
  return w > 0 && h > 0 ? w * h : 0;
};

/** How much of a box falls outside the window. */
const offscreenArea = (b) => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const x = Math.max(0, -b.left) + Math.max(0, b.right - w);
  const y = Math.max(0, -b.top) + Math.max(0, b.bottom - h);
  return x * (b.bottom - b.top) + y * (b.right - b.left);
};

/**
 * The two boxes a placement actually occupies: the character, and the bubble
 * over or under its head.
 *
 * The bubble is half the reason a placement fails — it is wider than the
 * character and sits where the eye already is — so it is scored, not
 * assumed to fit.
 */
const footprint = (x, y, size, facingLeft, bubbleBelow) => {
  const half = halfWidth(size);
  const body = { left: x - half, right: x + half, top: y - size, bottom: y };

  // Matches the bubble's own CSS: it hangs off the side away from whatever
  // the character is looking at, overlapping its centre by 15%.
  const w = bubbleWidth();
  const opensLeft = bubbleSide(facingLeft) === 'right';
  const bLeft = opensLeft ? x + 0.15 * w - w : x - 0.15 * w;
  const bTop = bubbleBelow ? y + BUBBLE_GAP : y - size - BUBBLE_GAP - BUBBLE_H;

  return [body, { left: bLeft, right: bLeft + w, top: bTop, bottom: bTop + BUBBLE_H }];
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
 * Returns feet-centre coordinates in viewport space, which way to face, and
 * which way the bubble should open. `facingLeft` means the character is to
 * the target's right and looks back at it, which is what makes pointing
 * read.
 *
 * Eight candidates rather than four: each side of the target, with the
 * bubble above the character and below it. The bubble's direction genuinely
 * changes which placements are possible — standing under a button with the
 * bubble above puts the bubble through the button, and the same spot with
 * the bubble underneath is perfectly clear — so it is chosen here rather
 * than fixed.
 *
 * Scored rather than ranked by preference, so the character behaves
 * sensibly at the edge of the viewport and on a phone without a special
 * case for each situation. `prefer` nudges one side when a page knows its
 * own layout better than a box can say.
 */
export const standBeside = (rect, size, prefer = null) => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const half = halfWidth(size);
  const bands = forbiddenBands();
  const zones = keepOutRects();

  /*
   * The ceiling is the foot of the top bar, not the top of the window.
   *
   * A top band used to be scored and nothing more, and a score is a
   * preference: when every candidate was poor — which is what scrolling a
   * target up under the bar produces — the least-bad one still put the
   * character's head behind the bar, where it renders as a figure sliced in
   * half by the black strip. The bar is not a place that is worse than
   * others, it is not a place, so it is a clamp.
   *
   * `Math.max(ceiling, …)` on the far side keeps the pair from inverting on
   * a viewport too short to hold the character at all: it then rests on its
   * ceiling rather than being flipped below the floor.
   */
  const ceiling = topGuard(bands) + EDGE + size;
  const floor = (y) => Math.min(Math.max(y, ceiling), Math.max(ceiling, h - EDGE));
  const clampX = (x) => Math.min(Math.max(x, EDGE + half), w - EDGE - half);

  /*
   * Standing beside the target is not the same as standing clear of it. A
   * button at the foot of a paragraph has the paragraph immediately to its
   * right, so "just past the button" is still on the words — which is what
   * put the character through the hero text. These two extra candidates
   * step past everything in the character's own horizontal band, so it can
   * choose to go around the text rather than only up to it.
   */
  const inBand = zones.filter((z) => z.bottom > rect.bottom - size && z.top < rect.bottom);
  const pastRight = inBand.reduce((m, z) => Math.max(m, z.right), rect.right);
  const pastLeft = inBand.reduce((m, z) => Math.min(m, z.left), rect.left);

  const sides = [
    { side: 'right', x: rect.right + GAP + half, y: rect.bottom, facingLeft: true, room: w - rect.right },
    { side: 'left', x: rect.left - GAP - half, y: rect.bottom, facingLeft: false, room: rect.left },
    { side: 'below', x: rect.left + rect.width / 2, y: rect.bottom + GAP + size, facingLeft: false, room: h - rect.bottom },
    { side: 'above', x: rect.left + rect.width / 2, y: rect.top - GAP, facingLeft: false, room: rect.top }
  ];
  if (pastRight > rect.right) {
    sides.push({ side: 'right', x: pastRight + GAP + half, y: rect.bottom, facingLeft: true, room: w - pastRight });
  }
  if (pastLeft < rect.left) {
    sides.push({ side: 'left', x: pastLeft - GAP - half, y: rect.bottom, facingLeft: false, room: pastLeft });
  }

  let best = null;
  for (const c of sides) {
    for (const bubbleBelow of [false, true]) {
      const x = clampX(c.x);
      const y = floor(c.y);
      // How far the clamp had to drag it, and whether it still covers the target.
      const dragged = Math.abs(x - c.x) + Math.abs(y - c.y);
      const covers =
        x + half > rect.left && x - half < rect.right && y > rect.top && y - size < rect.bottom ? 1 : 0;

      const boxes = footprint(x, y, size, c.facingLeft, bubbleBelow);

      /*
       * The character and its bubble are weighed separately, because they
       * are not equally in the way. The figure is opaque and solid: what it
       * covers is gone. The bubble is a small light card that reads as an
       * overlay laid on top of the page, and a corner of it across a card
       * is a much smaller sin than a mascot standing on a heading.
       *
       * Scored as a fraction of each box's own area, so the weights mean
       * the same thing at every character size and on every screen.
       */
      const spoil = (b) => {
        let n = offscreenArea(b);
        // The element being explained counts double: covering the button is
        // worse than covering the sentence above it.
        n += overlapArea(b, rect) * 2;
        for (const z of zones) n += overlapArea(b, z);
        const a = (b.right - b.left) * (b.bottom - b.top);
        return a ? Math.min(n / a, 2) : 0;
      };
      const spoiledFrac = spoil(boxes[0]) + spoil(boxes[1]) * 0.45;

      /*
       * Room is a qualifier, not a prize. Scored raw it was worth up to a
       * whole viewport width, which drowned every clearance term and had
       * the character choosing the roomiest spot on the page over the one
       * that covered nothing. Enough room is enough.
       */
      const roomScore = Math.min(Math.max(c.room, 0) / (size * 2.5), 1) * 220;

      /*
       * Level with the target beats above or below it, and the right beats
       * the left, all else equal.
       *
       * Standing beside something reads as "this one"; standing under it is
       * vaguer, and on a page of stacked cards it usually means hanging off
       * the bottom of the one the target lives in and onto the next. The
       * right is preferred because a button's label is read left to right,
       * so a guide at the end of it is where the eye already finishes.
       *
       * Small enough that any real clearance problem still overrules it —
       * the clearance weight below is an order larger for exactly that
       * reason. Room and side are tie-breaks between placements that
       * already work, never a reason to choose one that does not.
       */
      const alongside = c.side === 'right' ? 90 : c.side === 'left' ? 60 : 0;

      /*
       * A page may name the side it wants, because two pages with the same
       * geometry problem can want opposite answers. Overview's button has
       * clear space to its right; the roadmap's platform has a phase card
       * there and clear rail beneath it. Neither is inferable from the
       * target's own box, so the page says.
       *
       * Worth more than the generic side bias and less than a real
       * collision: a preference chooses between placements that work, it
       * does not force one that does not.
       */
      const preferred = prefer && c.side === prefer ? 260 : 0;

      const score =
        roomScore +
        alongside +
        preferred -
        dragged * 2 -
        covers * 900 -
        bandPenalty(y, size, bands) * 3 -
        spoiledFrac * 2400;

      if (!best || score > best.score) {
        best = { x, y, facingLeft: c.facingLeft, side: c.side, bubbleBelow, score };
      }
    }
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

/**
 * Just off the screen beside a given spot, feet at the same height.
 *
 * The NEARER edge, always. A character whose home is the sidebar has no
 * business walking the entire width of the page to get off screen, and even
 * less coming back that way: the exit and the return should cost the same
 * few steps as the home is from the edge.
 */
export const offStageNear = (spot, size) =>
  spot.x < window.innerWidth / 2
    ? { x: -size, y: spot.y }
    : { x: window.innerWidth + size, y: spot.y };

/**
 * Off the side of the screen, feet on the same floor it would rest on.
 *
 * `home` is where it would be standing if it were on stage, and decides
 * which edge it leaves by. Without one the corner is assumed, which is on
 * the right.
 */
export const offStageSpot = (size, home = null) => offStageNear(home || cornerSpot(size), size);

/**
 * Standing in a slot: centred on its box, feet on its base.
 *
 * Then lifted clear of anything pinned to the foot of the screen. A slot is
 * a fixed parking place and cannot know that a page has floated a save bar
 * or a navigation bar underneath it, so the check belongs here rather than
 * in whatever declared the slot.
 */
export const spotInSlot = (rect, size) => {
  const x = Math.min(
    Math.max(rect.left + rect.width / 2, EDGE + halfWidth(size)),
    window.innerWidth - EDGE - halfWidth(size)
  );
  let y = Math.min(Math.max(rect.bottom, EDGE + size), window.innerHeight - EDGE);

  for (const band of forbiddenBands()) {
    if (band.side !== 'bottom') continue;
    if (y > band.top) y = Math.max(EDGE + size, band.top - 8);
  }
  return { x, y };
};

/**
 * Which side of the mascot the speech bubble opens on.
 *
 * Which way the character faces already encodes where the target is: facing
 * left means it stands to the target's right, so the bubble opens rightward,
 * away from the thing being explained. That keeps the explanation off the
 * element without needing to know either box.
 */
export const bubbleSide = (facingLeft) => (facingLeft ? 'right' : 'left');
