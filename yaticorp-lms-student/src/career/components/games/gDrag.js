/** Drag-and-drop helpers for the group-G verbal games (see GVerbalKit.jsx). */

export const DRAG_TYPE = 'text/plain';

/** Props that make any element a drop target: a dragged chip's id, or a click (place the held chip). */
export const dropProps = (onDropId, onClickEmpty) => ({
  // Touch drag (2026-11-20, the user: drag and drop did not work on a phone): a chip dropped by finger finds the
  // element under it with this attribute and calls its handler (see touchDrag below).
  'data-gdrop': '',
  ref: (el) => { if (el) el.__gdrop = onDropId; },
  onDragOver: (e) => e.preventDefault(),
  onDrop: (e) => {
    e.preventDefault();
    const id = e.dataTransfer.getData(DRAG_TYPE);
    if (id !== '') onDropId(id);
  },
  onClick: onClickEmpty
});

/**
 * Pointer handler for a chip: on touch and pen, dragging the chip shows a copy under the finger and drops it on the
 * `dropProps` target under the finger when let go. A plain tap is left to the chip's click. Returns true while a drag
 * has just ended, so the click that follows can be ignored.
 */
export const touchDrag = (e, id) => {
  if (e.pointerType === 'mouse' || e.button !== 0) return;
  const src = e.currentTarget;
  const x0 = e.clientX; const y0 = e.clientY;
  let ghost = null;
  const move = (ev) => {
    if (ev.pointerId !== e.pointerId) return;
    if (!ghost) {
      if (Math.hypot(ev.clientX - x0, ev.clientY - y0) < 8) return;
      const r = src.getBoundingClientRect();
      ghost = src.cloneNode(true);
      Object.assign(ghost.style, { position: 'fixed', left: '0', top: '0', width: `${r.width}px`, height: `${r.height}px`, margin: '0', zIndex: '9999', pointerEvents: 'none', opacity: '0.92', boxShadow: '0 10px 24px -8px rgba(49,16,120,0.55)' });
      document.body.appendChild(ghost);
      src.style.opacity = '0.4';
    }
    ev.preventDefault();
    const r = ghost.getBoundingClientRect();
    ghost.style.transform = `translate(${ev.clientX - r.width / 2}px, ${ev.clientY - r.height / 2}px) scale(1.06)`;
  };
  const end = (ev) => {
    if (ev.pointerId !== e.pointerId) return;
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', end);
    window.removeEventListener('pointercancel', end);
    if (!ghost) return;
    ghost.remove(); src.style.opacity = '';
    src.dataset.gdragged = '1'; setTimeout(() => { delete src.dataset.gdragged; }, 350);
    if (ev.type !== 'pointerup') return;
    const target = document.elementFromPoint(ev.clientX, ev.clientY)?.closest('[data-gdrop]');
    if (target?.__gdrop) target.__gdrop(String(id));
  };
  window.addEventListener('pointermove', move, { passive: false });
  window.addEventListener('pointerup', end);
  window.addEventListener('pointercancel', end);
};

/** A fresh seed for a level's generator. */
export const freshSeed = () => Math.floor(Math.random() * 4294967296);
