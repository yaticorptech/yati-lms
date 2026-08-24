import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Check, Flame, PartyPopper, Trophy, Zap } from 'lucide-react';

/**
 * The reward moment.
 *
 * Finishing a lesson is the single thing this product asks a student to do —
 * watch, read, then get every quiz answer right. It used to be acknowledged by
 * a toast in the corner, the same treatment a failed form gets. Half an hour of
 * work and a validation message.
 *
 * So: a real celebration. Confetti, the number that went up, and what it bought
 * them. It auto-dismisses in a few seconds and can be clicked away, because a
 * reward you have to close is a chore by the third time you see it.
 *
 * Two intensities. `task` for finishing one lesson — frequent, so it stays
 * light. `day` for clearing the whole plan — rare, so it is allowed to be loud.
 */

const CelebrationContext = createContext(null);

// eslint-disable-next-line react-refresh/only-export-components
export const useCelebrate = () => {
  const ctx = useContext(CelebrationContext);
  // Deliberately not throwing. A celebration is decoration; a page that renders
  // outside the provider should still work, just without the confetti.
  return ctx || (() => {});
};

const PALETTE = ['#3b66f6', '#f59e0b', '#10b981', '#8b5cf6', '#f97316', '#ec4899'];

const PRESETS = {
  task: { pieces: 34, icon: Check, tone: 'emerald', duration: 4200 },
  day: { pieces: 70, icon: Trophy, tone: 'amber', duration: 6000 }
};

const TONES = {
  emerald: { badge: 'bg-emerald-500', glow: 'ring-emerald-100', text: 'text-emerald-600' },
  amber: { badge: 'bg-amber-500', glow: 'ring-amber-100', text: 'text-amber-600' },
  brand: { badge: 'bg-brand-600', glow: 'ring-brand-100', text: 'text-link' }
};

/**
 * Pure CSS confetti — no canvas, no library.
 *
 * Each piece gets its start, drift, spin and timing as inline custom
 * properties, so all of them share a single keyframe rule and the browser can
 * composite the lot on the GPU. Generated once per burst and thrown away with
 * the overlay; nothing here runs while the page is idle.
 */
function Confetti({ count }) {
  // Built in an effect, not during render. Every value here is a Math.random()
  // call, which makes the piece list unstable: React is free to re-run a render
  // it then throws away, and a burst that reshuffles itself mid-fall is exactly
  // the kind of bug that costs an afternoon. Handing it to a frame rather than
  // setting it in the effect body avoids rendering the overlay twice on the way
  // in; one frame of delay is not visible, the overlay is animating anyway.
  const [pieces, setPieces] = useState([]);

  useEffect(() => {
    const build = () =>
      Array.from({ length: count }, (_, i) => {
        const round = Math.random() > 0.65;
        const size = 6 + Math.random() * 7;
        return {
          id: i,
          style: {
            left: `${Math.random() * 100}%`,
            top: `${-6 - Math.random() * 12}%`,
            width: `${size}px`,
            height: `${round ? size : size * (0.4 + Math.random() * 0.5)}px`,
            background: PALETTE[i % PALETTE.length],
            borderRadius: round ? '50%' : '2px',
            '--drift': `${(Math.random() - 0.5) * 260}px`,
            '--fall': `${75 + Math.random() * 35}vh`,
            '--spin': `${(Math.random() > 0.5 ? 1 : -1) * (360 + Math.random() * 540)}deg`,
            '--dur': `${2 + Math.random() * 1.6}s`,
            '--delay': `${Math.random() * 0.45}s`
          }
        };
      });

    const frame = requestAnimationFrame(() => setPieces(build()));
    return () => cancelAnimationFrame(frame);
  }, [count]);

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {pieces.map((piece) => (
        <span key={piece.id} className="confetti-piece" style={piece.style} />
      ))}
    </div>
  );
}

function CelebrationOverlay({ event, onDismiss }) {
  const preset = PRESETS[event.kind] || PRESETS.task;
  const Icon = event.icon || preset.icon;
  const tone = TONES[event.tone || preset.tone] || TONES.emerald;

  // Auto-dismiss. The reward should get out of the way on its own — the student
  // came here to do the next task, not to close a dialog.
  useEffect(() => {
    const timer = setTimeout(onDismiss, preset.duration);
    return () => clearTimeout(timer);
  }, [onDismiss, preset.duration]);

  // Escape closes it early, same as clicking.
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onDismiss();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onDismiss]);

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      role="alertdialog"
      aria-live="assertive"
      aria-label={event.title}
    >
      {/* Barely-there scrim. Dark enough to focus the card, light enough that
          the page underneath still reads as the place they are returning to. */}
      <button
        type="button"
        tabIndex={-1}
        aria-label="Dismiss"
        onClick={onDismiss}
        className="animate-fade-in absolute inset-0 cursor-default bg-slate-900/25"
      />

      <Confetti count={preset.pieces} />

      <div
        onClick={onDismiss}
        className="animate-pop-in relative w-full max-w-sm cursor-pointer rounded-2xl bg-surface p-7 text-center shadow-float"
      >
        <span
          className={`animate-badge-burst mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl text-white ring-8 ring-inset ${tone.badge} ${tone.glow}`}
        >
          <Icon className="h-8 w-8" strokeWidth={2.6} />
        </span>

        <h2 className="text-xl font-black text-ink-900">{event.title}</h2>
        {event.message && (
          <p className="mt-1.5 text-sm leading-relaxed text-ink-500">{event.message}</p>
        )}

        {/* The numbers that moved. This is the part worth showing — a student
            who cannot see what their work bought has no reason to repeat it. */}
        {(event.xp > 0 || event.streak > 0 || event.progress) && (
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            {event.xp > 0 && (
              <span className="animate-xp-rise inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-3 py-1.5 text-sm font-bold text-violet-700 ring-1 ring-violet-100 ring-inset">
                <Zap className="h-4 w-4" />+{event.xp} XP
              </span>
            )}
            {event.streak > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-sm font-bold text-amber-700 ring-1 ring-amber-100 ring-inset">
                <Flame className="h-4 w-4" />
                {event.streak} day streak
              </span>
            )}
            {event.progress && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-bold text-emerald-700 ring-1 ring-emerald-100 ring-inset tabular-nums">
                <PartyPopper className="h-4 w-4" />
                {event.progress}
              </span>
            )}
          </div>
        )}

        <p className="mt-5 text-xs font-medium text-ink-400">Tap anywhere to continue</p>
      </div>
    </div>
  );
}

export function CelebrationProvider({ children }) {
  const [event, setEvent] = useState(null);

  const dismiss = useCallback(() => setEvent(null), []);

  // Keyed on a counter so two identical finishes in a row still re-trigger the
  // animation rather than React reusing the element and showing nothing.
  const celebrate = useCallback((next) => {
    setEvent((prev) => ({ ...next, id: (prev?.id || 0) + 1 }));
  }, []);

  return (
    <CelebrationContext.Provider value={celebrate}>
      {children}
      {event && <CelebrationOverlay key={event.id} event={event} onDismiss={dismiss} />}
    </CelebrationContext.Provider>
  );
}
