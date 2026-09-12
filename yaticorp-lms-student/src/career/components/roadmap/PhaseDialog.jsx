import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Check, Lock, Sparkles, Clock3, ListChecks, Trophy, GitBranch } from 'lucide-react';
import { parseChoices, phaseTitle } from '../../utils/roadmap';
import PhaseDetail from './PhaseDetail';

/**
 * A phase, opened as its own page over the map.
 *
 * The timeline used to unroll a phase in place, which pushed the rest of the
 * road off the screen. Here the map stays where it is and the phase comes
 * forward: the same words, the same lists, the same tick — just in front.
 */
export default function PhaseDialog({
  stage,
  index,
  total,
  state,
  palette,
  onClose,
  onToggleComplete,
  onShareBadge,
  badgeBusy,
  saving
}) {
  const closeRef = useRef(null);
  const isObject = typeof stage === 'object' && stage !== null;
  const title = phaseTitle(stage);
  const choices = parseChoices(title);
  const isCurrent = state === 'current';
  const isDone = state === 'done';

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    // The page behind must not scroll while the phase is in front of it.
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  const stepCount = isObject ? stage.actionItems?.length || 0 : 0;
  const milestoneCount = isObject ? stage.milestones?.length || 0 : 0;
  const meta = [
    isObject && stage.duration && { icon: Clock3, label: stage.duration },
    stepCount > 0 && { icon: ListChecks, label: `${stepCount} steps` },
    milestoneCount > 0 && {
      icon: Trophy,
      label: `${milestoneCount} ${milestoneCount === 1 ? 'milestone' : 'milestones'}`
    },
    choices && { icon: GitBranch, label: `${choices.options.length} paths` }
  ].filter(Boolean);

  // On document.body, outside the page: the page slides in with a transform
  // and a transformed ancestor would pin this to the page's bottom edge.
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="phase-dialog-title"
      className="futurepath-portal fixed inset-0 z-[110] flex items-end justify-center p-0 sm:items-center sm:p-4"
    >
      <div className="animate-fade-in absolute inset-0 bg-slate-900/55 backdrop-blur-sm" onClick={onClose} />

      <div className="animate-scale-in relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl bg-surface shadow-float sm:max-h-[86vh] sm:rounded-3xl">
        {/* The phase's own colour along the top, so the dialog is visibly the
            platform the student just pressed and not a generic sheet. */}
        <span aria-hidden className={`h-1.5 w-full shrink-0 bg-gradient-to-r ${palette.stripe}`} />

        <header className="relative shrink-0 border-b border-line-100 px-5 pt-5 pb-4 sm:px-6">
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute top-4 right-4 rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-surface-100 hover:text-ink-700"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex items-start gap-4 pr-8">
            <span
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-md ${palette.top} ${palette.glow}`}
              aria-hidden
            >
              <palette.icon className="h-6 w-6" strokeWidth={2.2} />
            </span>
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-2 text-[0.68rem] font-black tracking-[0.16em] text-ink-400 uppercase">
                Phase {index + 1} of {total}
                {isCurrent && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-journey-600 to-indigo-600 px-2.5 py-0.5 text-white shadow-sm shadow-journey-600/30">
                    <Sparkles className="h-3 w-3" />
                    You are here
                  </span>
                )}
                {isDone && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-emerald-700 ring-1 ring-emerald-100 ring-inset">
                    <Check className="h-3 w-3" strokeWidth={3.5} />
                    Completed
                  </span>
                )}
                {!isCurrent && !isDone && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-surface-100 px-2.5 py-0.5 text-ink-500 ring-1 ring-line-200 ring-inset">
                    <Lock className="h-3 w-3" />
                    Locked
                  </span>
                )}
              </p>
              <h2 id="phase-dialog-title" className="mt-1.5 text-lg leading-snug font-black text-ink-900 sm:text-xl">
                {choices ? choices.lead : title}
              </h2>
              {meta.length > 0 && (
                /* No separators between these. Each entry already opens with
                   its own icon, and an interpunct travelled with the entry it
                   preceded — so when the row wrapped, which it does as soon as
                   a duration runs to two lines, the new line began with a
                   stray dot. */
                <p className="mt-2 flex flex-wrap items-center gap-x-3.5 gap-y-1 text-xs font-medium text-ink-500">
                  {meta.map((entry) => (
                    <span key={entry.label} className="inline-flex items-center gap-1.5 tabular-nums">
                      <entry.icon className="h-3.5 w-3.5 shrink-0 text-ink-400" />
                      {entry.label}
                    </span>
                  ))}
                </p>
              )}
            </div>
          </div>

          {!isCurrent && !isDone && (
            <p className="mt-3 flex items-center gap-2 rounded-xl bg-surface-50 px-3 py-2 text-xs font-semibold text-ink-500 ring-1 ring-line-200 ring-inset">
              <Lock className="h-3.5 w-3.5 shrink-0 text-ink-400" />
              Finish the chapters before this one to unlock it
            </p>
          )}
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          <PhaseDetail
            stage={stage}
            state={state}
            onToggleComplete={onToggleComplete}
            onShareBadge={onShareBadge}
            badgeBusy={badgeBusy}
            saving={saving}
          />
        </div>
      </div>
    </div>,
    document.body
  );
}
