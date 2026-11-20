/**
 * Shared pieces for the group-G Master Minds verbal games (Semantic Precision, Argument Analyzer, Verbal Architect,
 * Nuance Navigator, Word Relation Matrix): a word chip you can drag (mouse) or tap-to-hold (touch, keyboard),
 * a drop target that takes either, and the premium panel / button styles they share.
 *
 * Drag and drop is HTML5 drag for pointers that support it; every drop target also accepts a click, which places
 * the chip currently held. So the game works with a mouse, a finger, or the keyboard (Tab, Enter/Space).
 */

import { DRAG_TYPE, touchDrag } from './gDrag';


export const btnPrimary =
  'fp-press inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500';
export const btnGhost =
  'fp-press inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-[#1b2456] ring-1 ring-[#e4e1f5] ring-inset transition hover:ring-indigo-300 disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-indigo-500';

/** A white card on the premium board. */
export function Panel({ children, className = '', label }) {
  return (
    // Premium (2026-11-19, the user: Master Minds vocabulary): a white card with a gradient top edge and a soft violet glow.
    <section aria-label={label} className={`relative overflow-hidden rounded-[1.25rem] bg-white p-3.5 pt-4 shadow-[0_14px_32px_-18px_rgba(109,40,217,0.55)] ring-1 ring-violet-100 ring-inset sm:p-4 sm:pt-5 ${className}`}>
      <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-indigo-500 via-violet-500 to-pink-500" />
      {children}
    </section>
  );
}

/** Small caps heading inside a panel. */
export function Eyebrow({ children }) {
  return <p className="mb-2.5 inline-block rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 px-3 py-1 text-[0.65rem] font-black tracking-[0.14em] text-white uppercase shadow-sm">{children}</p>;
}

/**
 * A word chip. `held` = picked up (tap mode); `state` 'right' | 'wrong' | 'used' colours it.
 * `dragId` is what a drop receives.
 */
export function Chip({ label, dragId, held = false, state = null, disabled = false, onPick, ariaLabel }) {
  const tone =
    state === 'right'
      ? 'bg-emerald-50 text-emerald-800 ring-emerald-400'
      : state === 'wrong'
        ? 'gs-wrong bg-rose-50 text-rose-700 ring-rose-300 line-through'
        : state === 'used'
          ? 'bg-slate-50 text-slate-400 ring-slate-200'
          : held
            ? 'bg-indigo-600 text-white ring-indigo-600 shadow-md -translate-y-0.5'
            : 'bg-white text-[#1b2456] ring-[#d9d4f3] hover:ring-indigo-400';
  return (
    <button
      type="button"
      draggable={!disabled}
      onDragStart={(e) => { e.dataTransfer.setData(DRAG_TYPE, String(dragId)); e.dataTransfer.effectAllowed = 'move'; }}
      onPointerDown={(e) => { if (!disabled) touchDrag(e, dragId); }}
      onClick={(e) => { if (e.currentTarget.dataset.gdragged) return; if (!disabled && onPick) onPick(dragId); }}
      disabled={disabled}
      aria-pressed={held}
      aria-label={ariaLabel || label}
      className={`fp-press min-h-11 rounded-xl px-3.5 py-2 text-sm font-semibold ring-2 transition ring-inset touch-none select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 sm:text-base ${tone} ${disabled ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'}`}
    >
      {label}
    </button>
  );
}

/** One-line status under the board. */
export function Status({ tone = 'idle', children }) {
  const cls = tone === 'good' ? 'text-emerald-700' : tone === 'bad' ? 'text-rose-600' : 'text-[#1b2456]';
  return (
    <p className={`min-h-6 text-center text-sm font-semibold sm:text-base ${cls}`} role="status" aria-live="polite">
      {children}
    </p>
  );
}

