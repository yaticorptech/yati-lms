import { useState } from 'react';
import { Check, ChevronDown, GitBranch, ListChecks, Lock, Trophy, Award } from 'lucide-react';
import { parseChoices, phaseTitle, toParagraphs } from '../../utils/roadmap';

/**
 * A labelled block inside an opened phase. One shape for all of them.
 *
 * No icons on these headings. Each section already carries its own visual
 * language — numbered rows, green ticks — and an icon beside every label added
 * a column of small decorations down the panel without telling the reader
 * anything the words did not.
 */
function Section({ title, children }) {
  return (
    <section>
      <h4 className="mb-2.5 text-[0.7rem] font-bold tracking-[0.11em] text-ink-400 uppercase">
        {title}
      </h4>
      {children}
    </section>
  );
}

/**
 * A section that stays folded until asked for.
 *
 * The milestones are reference material — what finishing this phase looks
 * like. Useful, but not what the student opened the phase to find, so it waits
 * to be asked for rather than pushing the steps off the screen.
 */
function Disclosure({ icon: Icon, iconClass, title, count, open, onToggle, children }) {
  return (
    <section>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className={`flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors ${
          open ? 'bg-surface-50' : 'hover:bg-surface-50/70'
        }`}
      >
        <Icon className={`h-4 w-4 shrink-0 ${iconClass}`} />

        {/* Sentence case, not the uppercase micro-label used for headings.
            These are controls you press, and three stacked lines of tracked-out
            capitals read as shouting rather than structure. */}
        <span className="flex-1 text-sm font-semibold text-ink-800">{title}</span>

        <span className="shrink-0 rounded-md bg-surface-100 px-1.5 py-0.5 text-xs font-bold text-ink-500 tabular-nums">
          {count}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-ink-400 transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {open && (
        <div className="animate-fade-in border-t border-line-100 px-4 pt-3.5 pb-4">{children}</div>
      )}
    </section>
  );
}

/**
 * Everything a phase has to say, exactly as the opened timeline card used to
 * say it: the routes to choose between, the thesis, why it matters, the
 * folded lists of actions and milestones, and the footer that ticks it off.
 * Now shown inside the phase dialog rather than unrolled in the list.
 */
export default function PhaseDetail({ stage, state, onToggleComplete, onShareBadge, badgeBusy, saving }) {
  const isObject = typeof stage === 'object' && stage !== null;
  const title = phaseTitle(stage);
  const choices = parseChoices(title);
  const isDone = state === 'done';

  // Both lists fold away and neither opens itself: a row already unfolded is
  // one the student never asked for, and it pushes the one beside it off the
  // screen — which is the whole reason they fold.
  const [showSteps, setShowSteps] = useState(false);
  const [showMilestones, setShowMilestones] = useState(false);

  // Same words, broken into pairs — a wall of prose is skipped, short
  // paragraphs are read.
  const paragraphs = isObject ? toParagraphs(stage.description) : [];

  if (!isObject) return null;

  return (
    <div className="space-y-6">
    {/* Decision point: the title offered several routes, so present them
        as options to weigh rather than a sentence to read. */}
    {choices && (
      <section className="overflow-hidden rounded-xl border border-line-200 bg-surface-50/70">
        <header className="flex flex-wrap items-baseline gap-2 border-b border-line-200/70 px-4 py-3">
          <GitBranch className="h-4 w-4 shrink-0 translate-y-0.5 text-amber-600" />
          <h4 className="text-sm font-black text-ink-900">🧭 Choose your path</h4>
          <span className="w-full text-xs font-semibold text-ink-500 sm:ml-auto sm:w-auto">
            {choices.options.length} routes, same destination
          </span>
        </header>

        {/* One per row, full width. The old two-column grid left an odd
            number of routes orphaned on a line of their own, which read
            as the last one mattering less — and it squeezed a course
            name with a bracketed aside into half the width, where it
            ran out of room mid-phrase.

            Lettered, and deliberately not built to look like controls.
            Raised boxes read as buttons, and a student could click one
            expecting the roadmap to follow it. The letters mark them as
            alternatives to weigh, not a choice the app records. */}
        <ol className="divide-y divide-line-200/70">
          {choices.options.map((option, i) => (
            <li key={option} className="flex items-start gap-3 px-4 py-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-amber-100 text-xs font-bold text-amber-800">
                {String.fromCharCode(65 + i)}
              </span>
              <span className="text-sm leading-relaxed font-semibold text-ink-900">
                {option}
              </span>
            </li>
          ))}
        </ol>

        <p className="border-t border-line-200/70 bg-surface-100/50 px-4 py-3 text-xs leading-relaxed text-ink-600">
          Any of these lead to your goal. Read the guidance below, then pick the one that
          fits your marks, budget and interest.
        </p>
      </section>
    )}

    {/* The thesis of the phase, set as a lead statement rather than a
        tinted alert box. Boxing every part turned the panel into a
        stack of competing cards; a rule and a weight change carry the
        same emphasis without the boxes. */}
    {stage.focus && (
      <p className="border-l-[3px] border-brand-500 py-1 pl-4 text-base leading-relaxed font-semibold text-ink-900">
        {stage.focus}
      </p>
    )}

    {paragraphs.length > 0 && (
      <Section title="🎯 Why this matters">
        <div className="space-y-3">
          {paragraphs.map((paragraph, idx) => (
            <p key={idx} className="text-sm leading-relaxed text-ink-600">
              {paragraph}
            </p>
          ))}
        </div>
      </Section>
    )}

    {/* One bordered list with divided rows, not five separate cards.
        Numbered, because a numbered list reads as a plan worked through
        in order where identical bullets read as a pile. */}
    {/* The three folded lists sit in one bordered group with dividers
        rather than as three separate floating cards. Boxing each of
        them, inside a panel that is itself a box, is what made this
        read as unfinished. */}
    <div className="divide-y divide-line-200 overflow-hidden rounded-xl border border-line-200 bg-surface">
    {stage.actionItems?.length > 0 && (
      <Disclosure
        icon={ListChecks}
        iconClass="text-link"
        title="🚀 Your actions"
        count={stage.actionItems.length}
        open={showSteps}
        onToggle={() => setShowSteps((isOpen) => !isOpen)}
      >
        <ol className="space-y-3">
          {stage.actionItems.map((item, idx) => (
            <li
              key={idx}
              className="flex items-start gap-3 text-sm leading-relaxed text-ink-700"
            >
              <span className="mt-px flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-journey-500 to-indigo-600 text-[0.68rem] font-black text-white tabular-nums">
                {idx + 1}
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ol>
      </Disclosure>
    )}

    {/* What "finished" looks like. Without this a phase has no exit
        condition and the student cannot tell when to move on — but it
        is something to check against later, not now, so it opens on
        request rather than sitting under the steps. */}
    {stage.milestones?.length > 0 && (
      <Disclosure
        icon={Trophy}
        iconClass="text-emerald-600"
        title="🏆 Your milestones"
        count={stage.milestones.length}
        open={showMilestones}
        onToggle={() => setShowMilestones((isOpen) => !isOpen)}
      >
        <ul className="space-y-3">
          {stage.milestones.map((item, idx) => (
            <li
              key={idx}
              className="flex items-start gap-3 text-sm leading-relaxed text-ink-700"
            >
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" strokeWidth={2.75} />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </Disclosure>
    )}

    </div>

    {/* A footer action, set apart by a rule and pushed to the right —
        the panel's own convention for "you are finished here". It used
        to sit flush left under the lists as the loudest thing on the
        card, competing with the steps for attention when the steps are
        what the student is actually meant to be doing. */}
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line-100 pt-4">
      <p className="w-full text-xs text-ink-400 sm:w-auto sm:flex-1">
        {isDone ? 'Completed — reopen it if you came back to this.' : 'Finished everything in this phase?'}
      </p>
      <button
        type="button"
        onClick={onToggleComplete}
        disabled={saving}
        className={`inline-flex shrink-0 items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition-all active:scale-[0.97] disabled:opacity-60 ${
          isDone
            ? 'border border-line-200 bg-surface text-ink-600 hover:bg-surface-50'
            : 'fp-done-gradient text-white shadow-md shadow-emerald-600/25 hover:brightness-110'
        }`}
      >
        {isDone ? (
          <>
            <Lock className="h-3.5 w-3.5" />
            Reopen
          </>
        ) : (
          <>
            <Check className="h-3.5 w-3.5" />
            Mark done
          </>
        )}
      </button>

      {/* Finishing a phase earns a badge worth posting. A PDF
          certificate would land in a downloads folder and never be seen
          again; a badge has a public link and an image built for a
          feed. Offered only once the phase is actually done — the
          server refuses otherwise. */}
      {isDone && (
        <button
          type="button"
          onClick={onShareBadge}
          disabled={badgeBusy}
          className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2 text-sm font-semibold text-amber-800 transition-all hover:bg-amber-100 active:scale-[0.97] disabled:opacity-60"
        >
          <Award className="h-3.5 w-3.5" />
          {badgeBusy ? 'Preparing…' : 'Share badge'}
        </button>
      )}
    </div>
    </div>
  );
}
