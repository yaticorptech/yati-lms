import { useEffect, useRef, useState } from 'react';
import { BookMarked, Check, Lightbulb, Loader2 } from 'lucide-react';

// How long the end of the notes must stay on screen before it counts as read.
// Without a dwell, scrolling straight past would mark them read in one frame.
const DWELL_MS = 1500;

/**
 * Revision notes for one skill: an overview, teaching sections, then a glossary.
 *
 * When `onRead` is given, the end of the notes is observed and reported once
 * the student has actually reached it and stayed there — that is the "read"
 * gate for finishing a task automatically.
 */
export default function NotesReader({ notes, onRead, read = false }) {
  const endRef = useRef(null);
  // Whether the end marker is on screen right now, so the dwell can be shown
  // happening. A gate that fires silently after a hidden 1.5s timer reads as
  // nothing happening at all — the student scrolls to the bottom, sees no
  // acknowledgement, and has no idea the step is being credited.
  const [atEnd, setAtEnd] = useState(false);

  useEffect(() => {
    if (!onRead || read) return;

    const target = endRef.current;
    if (!target) return;

    let dwellTimer = null;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setAtEnd(entry.isIntersecting);
        if (entry.isIntersecting) {
          dwellTimer = setTimeout(() => {
            onRead();
            observer.disconnect();
          }, DWELL_MS);
        } else {
          // Scrolled back away before the dwell elapsed — not read yet.
          clearTimeout(dwellTimer);
        }
      },
      { threshold: 1 }
    );

    observer.observe(target);
    return () => {
      clearTimeout(dwellTimer);
      observer.disconnect();
    };
  }, [onRead, read]);

  if (!notes?.summary && !notes?.sections?.length) return null;

  return (
    <div className="space-y-6">
      {notes.summary && (
        <div className="animate-fade-in-up relative overflow-hidden rounded-2xl bg-gradient-to-r from-journey-50 via-surface to-pink-50 p-5 ring-1 ring-journey-100 ring-inset">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-12 -right-8 h-32 w-32 rounded-full bg-pink-200/40 blur-2xl"
          />
          <div className="relative flex items-start gap-3.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-journey-500 to-indigo-600 text-white shadow-md shadow-journey-500/30">
              <BookMarked className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[0.68rem] font-black tracking-[0.14em] text-journey-600 uppercase">In short</p>
              <p className="mt-1 leading-relaxed text-ink-800">{notes.summary}</p>
            </div>
          </div>
        </div>
      )}

      {notes.sections?.map((section, i) => (
        <section
          key={i}
          className="animate-fade-in-up rounded-2xl border border-line-200/80 bg-surface p-4 shadow-card sm:p-5"
          style={{ animationDelay: `${0.08 + i * 0.06}s` }}
        >
          <h4 className="mb-3 flex items-center gap-3 text-base font-black text-ink-900">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-journey-500 to-indigo-600 text-xs font-black text-white shadow-md shadow-journey-500/25">
              {i + 1}
            </span>
            {section.heading}
          </h4>
          <ul className="space-y-2.5 pl-11">
            {section.points?.map((point, j) => (
              <li key={j} className="flex gap-2.5 text-sm leading-relaxed text-ink-700">
                <span className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-journey-50 text-journey-600 ring-1 ring-journey-100 ring-inset">
                  <Check className="h-2.5 w-2.5" strokeWidth={3.5} />
                </span>
                <span>{point}</span>
              </li>
            ))}
          </ul>

          {/* Worked example. Only reading lessons carry one — a written lesson
              that only asserts things is a wall of claims; the example is where
              a student actually sees the thing work.

              `whitespace-pre-wrap` and a mono face because most of these are
              code, and code that has lost its line breaks is unreadable. */}
          {section.example && (
            <figure className="mt-4 ml-11 overflow-hidden rounded-xl bg-slate-900 shadow-lg shadow-slate-900/20 ring-1 ring-white/10">
              {/* A window bar, so the block reads as an editor rather than a
                  grey box — and the mono text is light on dark, the way code
                  is read everywhere else. */}
              <div className="flex items-center gap-1.5 border-b border-white/10 px-4 py-2.5">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                <span className="ml-2 text-[0.66rem] font-bold tracking-wider text-slate-400 uppercase">Example</span>
              </div>
              <pre className="overflow-x-auto px-4 py-3.5 text-xs leading-relaxed whitespace-pre-wrap text-slate-100">
                <code className="font-mono">{section.example}</code>
              </pre>
              {section.exampleCaption && (
                <figcaption className="border-t border-white/10 bg-white/5 px-4 py-2 text-xs text-slate-400">
                  {section.exampleCaption}
                </figcaption>
              )}
            </figure>
          )}
        </section>
      ))}

      {notes.keyTerms?.length > 0 && (
        <section className="animate-fade-in-up">
          <h4 className="mb-3 flex items-center gap-2.5 text-base font-black text-ink-900">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-500 ring-1 ring-amber-100 ring-inset">
              <Lightbulb className="h-4 w-4" />
            </span>
            Key terms
          </h4>
          <dl className="grid gap-2.5 sm:grid-cols-2">
            {notes.keyTerms.map((item, i) => (
              <div key={i} className="fp-lift rounded-xl border border-amber-100 bg-gradient-to-br from-amber-50/70 to-surface p-3.5">
                <dt className="text-sm font-black text-ink-900">{item.term}</dt>
                <dd className="mt-1 text-sm leading-relaxed text-ink-600">{item.definition}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {/* End-of-notes marker. Reaching and dwelling on this is the "read" gate.
          Kept a few pixels tall so `threshold: 1` is actually reachable — a
          zero-height element never reports as fully visible. */}
      <div ref={endRef} aria-hidden className="h-2 w-full" />

      {/* The gate, made audible. Reaching the bottom used to credit the step
          from a hidden 1.5s timer with nothing on screen to show for it, so
          the student had no way to tell the difference between "counted" and
          "broken" — and no reason to believe scrolling to the end mattered. */}
      {onRead && (read || atEnd) && (
        <p
          className={`animate-fade-in flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold ${
            read
              ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100 ring-inset'
              : 'bg-brand-50 text-link-strong ring-1 ring-brand-100 ring-inset'
          }`}
        >
          {read ? (
            <>
              <Check className="h-4 w-4" strokeWidth={3} />
              Notes read — step complete.
            </>
          ) : (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              You&apos;ve reached the end — hold here a moment to bank this step.
            </>
          )}
        </p>
      )}
    </div>
  );
}
