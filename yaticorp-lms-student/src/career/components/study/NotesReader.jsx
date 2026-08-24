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
        <div className="rounded-xl border border-brand-100 bg-brand-50/60 p-5">
          <p className="mb-2 flex items-center gap-2 text-xs font-bold tracking-wider text-link-strong uppercase">
            <BookMarked className="h-3.5 w-3.5" />
            In short
          </p>
          <p className="leading-relaxed text-ink-700">{notes.summary}</p>
        </div>
      )}

      {notes.sections?.map((section, i) => (
        <section key={i}>
          <h4 className="mb-3 flex items-center gap-2.5 font-bold text-ink-900">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-surface-100 text-xs font-bold text-ink-500">
              {i + 1}
            </span>
            {section.heading}
          </h4>
          <ul className="space-y-2.5 pl-8.5">
            {section.points?.map((point, j) => (
              <li key={j} className="flex gap-2.5 text-sm leading-relaxed text-ink-600">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400" />
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
            <figure className="mt-3 ml-8.5 overflow-hidden rounded-lg border border-line-200">
              <pre className="overflow-x-auto bg-surface-100 px-4 py-3 text-xs leading-relaxed whitespace-pre-wrap text-ink-800">
                <code className="font-mono">{section.example}</code>
              </pre>
              {section.exampleCaption && (
                <figcaption className="border-t border-line-200 bg-surface-50 px-4 py-2 text-xs text-ink-500">
                  {section.exampleCaption}
                </figcaption>
              )}
            </figure>
          )}
        </section>
      ))}

      {notes.keyTerms?.length > 0 && (
        <section>
          <h4 className="mb-3 flex items-center gap-2 font-bold text-ink-900">
            <Lightbulb className="h-4 w-4 text-amber-500" />
            Key terms
          </h4>
          <dl className="grid gap-2.5 sm:grid-cols-2">
            {notes.keyTerms.map((item, i) => (
              <div key={i} className="rounded-xl border border-line-200/80 bg-surface-50/60 p-3.5">
                <dt className="text-sm font-bold text-ink-900">{item.term}</dt>
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
