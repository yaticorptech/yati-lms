/**
 * Standing room for the mascot: helpers that judge what a box on screen
 * would hide, so the guide, its bubble and its celebrations can be placed
 * over empty ground rather than over the words a student is reading.
 *
 * Everything the mascot renders carries `data-mascot`, and is looked through,
 * so a spot it already occupies is judged by what lies beneath it.
 */

const CLICKABLE = 'a, button, input, select, textarea, [role="button"], [role="tab"], img, svg, canvas, video';

// Is there something a reader would miss under this point? Text, pictures,
// icons and anything clickable count; plain backgrounds do not.
export const busyAt = (x, y) => {
  const el = document.elementsFromPoint(x, y).find((e) => !e.closest('[data-mascot]'));
  if (!el) return false;
  if (el.closest(CLICKABLE)) return true;
  return Array.from(el.childNodes).some((n) => n.nodeType === 3 && n.textContent.trim());
};

// Share of a box that sits over something worth reading (0..1). Points off
// the screen count as covered, so half-visible spots lose.
export const occupancy = (box, cols = 5, rows = 6) => {
  let hits = 0;
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      const px = box.left + ((box.right - box.left) * (i + 0.5)) / cols;
      const py = box.top + ((box.bottom - box.top) * (j + 0.5)) / rows;
      if (px < 0 || py < 0 || px > window.innerWidth || py > window.innerHeight || busyAt(px, py)) hits++;
    }
  }
  return hits / (cols * rows);
};

// The page's content column, so nothing is ever placed over the sidebar.
export const contentBounds = (minWidth = 0) => {
  const r = document.querySelector('main')?.getBoundingClientRect();
  return r && r.width > minWidth + 16 ? { left: r.left + 8, right: r.right - 8 } : { left: 8, right: window.innerWidth - 8 };
};

export const overlaps = (a, b, pad = 8) =>
  a.left < b.right + pad && a.right > b.left - pad && a.top < b.bottom + pad && a.bottom > b.top - pad;
