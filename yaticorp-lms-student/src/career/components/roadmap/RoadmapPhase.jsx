import { useState } from 'react';
import {
  Check, ChevronDown, Clock3, GitBranch, ListChecks,
  Lock, Sparkles, Trophy, Award
} from 'lucide-react';
import { parseChoices, phaseBrief, phaseTitle, toParagraphs } from '../../utils/roadmap';

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
 * One step of the journey, rendered according to its state.
 *
 * The three states look deliberately unequal. A timeline where every phase has
 * the same weight forces the student to read all of it to work out where they
 * are; making "current" visually dominant answers that before they read a word.
 */
export default function RoadmapPhase({
  stage,
  index,
  isLast = false,
  state,
  expanded,
  onToggleExpand,
  onToggleComplete,
  onShareBadge,
  badgeBusy,
  saving
}) {
  const isObject = typeof stage === 'object' && stage !== null;
  const title = phaseTitle(stage);
  const choices = parseChoices(title);
  const isCurrent = state === 'current';
  const isDone = state === 'done';

  // Both lists fold away. An opened phase states what it is for and why it
  // matters, then offers its detail as labelled rows carrying their own counts —
  // so the student picks what to read instead of being handed the lot.
  //
  // Both start closed, and neither opens itself. A row already unfolded when
  // the phase opens is one the student never asked for, and it pushes the one
  // beside it off the screen — which is the whole reason they fold.
  const [showSteps, setShowSteps] = useState(false);
  const [showMilestones, setShowMilestones] = useState(false);

  // The description arrives as one four-to-six sentence block. Same words,
  // broken into pairs — a wall of prose is skipped, short paragraphs are read.
  const paragraphs = isObject ? toParagraphs(stage.description) : [];
  const brief = phaseBrief(stage);

  const stepCount = isObject ? stage.actionItems?.length || 0 : 0;
  const milestoneCount = isObject ? stage.milestones?.length || 0 : 0;

  // Built once and rendered once, so the open and closed states cannot drift
  // into showing different facts about the same phase.
  const meta = [
    isObject && stage.duration && { icon: Clock3, label: stage.duration },
    stepCount > 0 && { icon: ListChecks, label: `${stepCount} steps` },
    milestoneCount > 0 && {
      icon: Trophy,
      label: `${milestoneCount} ${milestoneCount === 1 ? 'milestone' : 'milestones'}`
    },
    choices && { icon: GitBranch, label: `${choices.options.length} paths` }
  ].filter(Boolean);

  /**
   * The three states are drawn deliberately unequal.
   *
   * A timeline where every checkpoint is the same size forces the student to
   * read all of it to work out where they are. The current node is larger and
   * carries a halo; a finished one is a solid tick; one still ahead is a hollow
   * ring holding its number. Which is which is answerable from across the room.
   */
  const marker = {
    done: 'left-2 h-8 w-8 fp-done-gradient text-white ring-4 ring-emerald-50 shadow-sm shadow-emerald-500/30',
    current:
      'left-1 h-10 w-10 bg-gradient-to-br from-journey-500 to-indigo-600 text-sm text-white ring-4 ring-journey-100 shadow-lg shadow-journey-600/40',
    upcoming: 'left-2 h-8 w-8 bg-surface-100 text-ink-400 ring-4 ring-white border-2 border-line-300'
  }[state];

  const shell = {
    done: 'fp-lift border-emerald-100 bg-surface',
    current: 'border-journey-300 bg-surface shadow-card-hover ring-2 ring-journey-200',
    upcoming: 'fp-lift border-line-200/80 bg-surface/50 saturate-[0.85] hover:border-journey-200 hover:saturate-100'
  }[state];

  /**
   * Each phase draws the length of road below itself rather than the list
   * drawing one flat rail behind everything.
   *
   * The rail used to be a single grey line from the first checkpoint to the
   * last, which meant the one page devoted to a journey showed no distance
   * travelled anywhere on it. Owned per phase, the segment can be green where
   * the road is behind the student and grey where it is still ahead — so the
   * progress reads down the whole page, not just off the bar in the header.
   */
  const connector = isDone ? 'bg-gradient-to-b from-emerald-400 to-teal-400' : 'bg-surface-200';
  const connectorTop = isCurrent ? 'top-14' : 'top-9';

  return (
    <li className="relative pl-14">
      {/* The road below this checkpoint. `-bottom-4` bridges the gap the list
          leaves between cards, so the line is continuous rather than dashed by
          the layout. */}
      {!isLast && (
        <span
          aria-hidden="true"
          className={`absolute -bottom-4 left-6 w-0.5 -translate-x-1/2 rounded-full ${connectorTop} ${connector}`}
        />
      )}

      {/* The halo is its own element, not a class on the node.
          Tailwind draws `ring-*` with box-shadow and the pulse animates
          box-shadow, so putting both on one span made the ring blink out for
          the duration of the animation. Separated, the ring holds and the
          pulse plays behind it. Three pulses, then it stops — enough to catch
          the eye on arrival without nagging for the rest of the session. */}
      {isCurrent && (
        <span
          aria-hidden="true"
          className="fp-halo pointer-events-none absolute top-4 left-1 h-10 w-10 rounded-full bg-journey-400/50 blur-md"
        />
      )}

      {/* Timeline node */}
      <span
        className={`absolute top-4 flex items-center justify-center rounded-full text-xs font-bold ${marker}`}
      >
        {isDone ? (
          <Check className="h-4 w-4" strokeWidth={3} />
        ) : isCurrent ? (
          index + 1
        ) : (
          /* A chapter still ahead reads as locked, because that is what the
             sequential completion rule actually makes it: phases complete in
             order, so this one cannot be ticked until the ones before it are.
             Eighteen phases carried eighteen identical numbered dots and no
             indication anywhere that any of them were out of reach. */
          <Lock className="h-3.5 w-3.5" strokeWidth={2.6} />
        )}
      </span>

      <div className={`relative overflow-hidden rounded-xl border transition-all duration-200 ${shell}`}>
        {/* The one gradient in the timeline. Reserved for the phase the student
            is actually on — put on every card it would say nothing. */}
        {isCurrent && (
          <span
            aria-hidden
            className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-journey-500 via-fuchsia-500 to-indigo-500"
          />
        )}
        <button
          type="button"
          onClick={onToggleExpand}
          aria-expanded={expanded}
          className="flex w-full items-start justify-between gap-3 p-4 text-left sm:p-5"
        >
          <span className="min-w-0">
            {isCurrent && (
              <span className="mb-2.5 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-journey-600 to-indigo-600 px-3 py-1 text-[0.68rem] font-black tracking-wider text-white uppercase shadow-sm shadow-journey-600/30">
                <Sparkles className="h-3 w-3" />
                You are here
              </span>
            )}
            {!isCurrent && !isDone && (
              <span className="mb-2.5 inline-flex items-center gap-1.5 rounded-full bg-surface-100 px-3 py-1 text-[0.68rem] font-black tracking-wider text-ink-500 uppercase ring-1 ring-line-200 ring-inset">
                <Lock className="h-3 w-3" />
                Locked
              </span>
            )}
            {isDone && (
              <span className="mb-2.5 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-[0.68rem] font-black tracking-wider text-emerald-700 uppercase ring-1 ring-emerald-100 ring-inset">
                <Check className="h-3 w-3" strokeWidth={3.5} />
                Completed
              </span>
            )}

            <span
              className={`block font-bold ${
                isCurrent ? 'text-lg leading-snug text-ink-900 sm:text-xl' : 'text-base'
              } ${isDone ? 'text-ink-500' : 'text-ink-800'}`}
            >
              {choices ? choices.lead : title}
            </span>

            {/* One line on what this phase asks of them. A closed timeline used
                to show nothing but titles and durations, so working out what
                any phase involved meant opening every one of them. Hidden while
                open, where the panel states it properly. */}
            {!expanded && brief && (
              <span className="mt-1.5 block line-clamp-2 text-sm leading-relaxed text-ink-500">
                {brief}
              </span>
            )}

            {/* The one meta line for this phase, open or closed. It used to be
                repeated inside the opened body as a second, longer strip —
                "6 months · 5 steps" directly above "6 months · 5 steps ·
                3 milestones", which is the sort of thing that makes a page look
                unfinished. Stated once, in the same place either way, so
                expanding does not reshuffle the header. */}
            {meta.length > 0 && (
              <span className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium text-ink-500">
                {meta.map((entry, i) => (
                  <span key={entry.label} className="inline-flex items-center gap-2">
                    {i > 0 && <span aria-hidden className="text-ink-300">·</span>}
                    <span className="inline-flex items-center gap-1.5 tabular-nums">
                      {entry.icon && <entry.icon className="h-3.5 w-3.5 text-ink-400" />}
                      {entry.label}
                    </span>
                  </span>
                ))}
              </span>
            )}
          </span>

          <ChevronDown
            className={`mt-1 h-5 w-5 shrink-0 text-ink-400 transition-transform ${
              expanded ? 'rotate-180' : ''
            }`}
          />
        </button>

        {/* ---- The action on the phase you are actually standing on ----
            Closed, the only thing offering to open this card was a chevron in
            the corner — the single most important card in Career Path had no
            visible call to action on it at all. This is the same toggle the
            header already runs, given a label that says what it does. ---- */}
        {isCurrent && !expanded && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-journey-100 bg-journey-50/60 px-4 py-3 sm:px-5">
            <span className="text-xs font-semibold text-ink-600">
              {stepCount > 0
                ? `${stepCount} ${stepCount === 1 ? 'step' : 'steps'} to work through`
                : 'What this phase asks of you'}
            </span>
            <button
              type="button"
              onClick={onToggleExpand}
              className="fp-press group/cta inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-gradient-to-r from-journey-600 to-indigo-600 px-4 py-2 text-xs font-black text-white shadow-md shadow-journey-600/25 transition-all hover:from-journey-700 hover:to-indigo-700"
            >
              See what to do
              <ChevronDown className="h-3.5 w-3.5 transition-transform group-hover/cta:translate-y-0.5" />
            </button>
          </div>
        )}

        {/* What opens this one. Without it a locked chapter is a dead card:
            the student can see it is out of reach but not what reaches it. */}
        {!isCurrent && !isDone && !expanded && (
          <div className="flex items-center gap-2 border-t border-line-100 bg-surface-50/60 px-4 py-2.5 text-xs font-semibold text-ink-500 sm:px-5">
            <Lock className="h-3.5 w-3.5 shrink-0 text-ink-400" />
            Finish the chapters before this one to unlock it
          </div>
        )}

        {/* ---- Milestone earned ----
            Finishing a phase mints a badge with a public link and an image
            built for a feed, and until now the only way to reach it was to
            expand the phase, scroll past the steps and the milestones, and
            find a button in the footer. A student who has just ticked off a
            year of their life should not have to go looking. Offered on the
            closed card, where the completion actually shows.

            Deliberately quiet. Filled amber, three completed phases put three
            saturated bands down the page and between them pulled the eye clean
            past the one phase the student is actually on — the opposite of what
            a timeline is for. Findable without expanding the card, without
            competing with the live phase. ---- */}
        {isDone && !expanded && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-pink-100 bg-pink-50/50 px-4 py-2.5 sm:px-5">
            <span className="flex items-center gap-2 text-xs font-black text-pink-700">
              <Award className="h-3.5 w-3.5 shrink-0 text-pink-500" />
              🏆 Milestone earned
            </span>
            <button
              type="button"
              onClick={onShareBadge}
              disabled={badgeBusy}
              className="fp-press inline-flex min-h-8 shrink-0 items-center gap-2 rounded-xl border border-pink-200 bg-surface px-3.5 py-1.5 text-xs font-black text-pink-700 transition-colors hover:bg-pink-100 disabled:opacity-60"
            >
              {badgeBusy ? 'Preparing…' : 'Share badge'}
            </button>
          </div>
        )}

        {expanded && isObject && (
          <div className="animate-fade-in space-y-6 px-4 pb-5 sm:px-5">
            {/* Decision point: the title offered several routes, so present them
                as options to weigh rather than a sentence to read. */}
            {choices && (
              <section className="overflow-hidden rounded-xl border border-line-200 bg-surface-50/70">
                <header className="flex items-baseline gap-2 border-b border-line-200/70 px-4 py-3">
                  <GitBranch className="h-4 w-4 shrink-0 translate-y-0.5 text-amber-600" />
                  <h4 className="text-sm font-black text-ink-900">🧭 Choose your path</h4>
                  <span className="ml-auto text-xs font-semibold text-ink-500">
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
            <div className="flex items-center justify-between gap-3 border-t border-line-100 pt-4">
              <p className="text-xs text-ink-400">
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
        )}
      </div>
    </li>
  );
}
