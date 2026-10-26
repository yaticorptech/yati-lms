import { Rocket, Target, BarChart3, Star, Trophy } from 'lucide-react';
import CurrentMission from './CurrentMission';
import JourneyStairs from './JourneyStairs';
import './careerHero.css';

/**
 * The Career Path banner: what this section is for, and the one button to press.
 *
 * A banner rather than a dashboard. It used to carry the goal, the phase, the
 * percentage, the streak, a ring counting today's tasks and the mascot — all
 * of which the page states again, and better, in the journey strip and the
 * momentum card directly beneath it. Saying them twice made the top of the
 * page busy without making it more useful, so the hero now says only what
 * nothing else does: where this leads, and what to do about it today.
 *
 * The illustration bleeds off the right edge rather than sitting in a card of
 * its own. In the supplied design the scene runs to the border and its sky
 * becomes the panel, so a rounded box with a gap around it — which is what a
 * plain <img> in a grid column gives you — reads as a picture pasted onto the
 * banner instead of as the banner itself.
 *
 * Only the artwork half of that file is used. Its left half has the headline,
 * the sentence and both buttons painted in, and those have to be real here:
 * the quest button changes its words once the day is cleared, so a painted one
 * would go on saying "Start today's quest" after the student had finished it.
 */
/* Over the sky only — see .ch-mote. */
const MOTES = [
  { right: '30%', top: '26%', size: 'h-1.5 w-1.5', tint: 'bg-white/90', delay: '0s' },
  { right: '18%', top: '52%', size: 'h-1 w-1', tint: 'bg-amber-200', delay: '2.1s' },
  { right: '41%', top: '64%', size: 'h-1.5 w-1.5', tint: 'bg-white/80', delay: '4.3s' },
  { right: '10%', top: '18%', size: 'h-1 w-1', tint: 'bg-amber-100', delay: '6.2s' }
];

export default function JourneyHero({ goal, task, completedToday = 0, totalToday = 0, roadmapData, completedPhases = [], name }) {
  const careerGoal = goal?.careerGoal;
  // The roadmap's phases, as the steps of the staircase (JourneyStairs).
  const phases = roadmapData?.educationRoadmap || [];
  // The line under the title: the student by name, and how many steps are left.
  const firstName = String(name || '').trim().split(/\s+/)[0];
  // Phases marked complete that exist in this roadmap, as the staircase counts them.
  const stepsLeft = phases.length - new Set(completedPhases.map(Number).filter((i) => Number.isInteger(i) && i >= 0 && i < phases.length)).size;
  const target = careerGoal || 'your goal';

  return (
    <section className="ch-hero relative overflow-hidden rounded-3xl bg-white lg:min-h-[28rem] lg:bg-gradient-to-r from-white via-[#faf8ff] to-[#f1ecff] shadow-card ring-1 ring-slate-100 ring-inset">
      {/* ---- The staircase ----
          On a wide screen it stands to the right of the words; on a narrow
          one, as a band above them (there is no room beside a sentence). */}
      <div className="relative h-64 overflow-hidden lg:hidden [mask-image:linear-gradient(to_bottom,#000_84%,transparent)]">
        {/* The staircase to the goal (JourneyStairs), in its twilight scene. */}
        <div className="absolute inset-0">
          <JourneyStairs phases={phases} completedPhases={completedPhases} goal={careerGoal} compact />
        </div>
        {/* The student's own goal, where the generic badge was: the first
            thing on the page now says where *they* are headed. */}
        <span className="ch-badge absolute top-3 left-3 inline-flex max-w-[78%] items-center gap-1.5 rounded-full bg-white/85 px-2.5 py-1 text-[0.72rem] font-black text-violet-700 shadow-sm ring-1 ring-white/70 backdrop-blur">
          {careerGoal ? (
            <>
              <Target className="h-3.5 w-3.5 shrink-0 text-orange-500" />
              <span className="truncate">{careerGoal}</span>
            </>
          ) : (
            <>
              <Rocket className="h-3.5 w-3.5 shrink-0 text-orange-500" />
              Build Your Future
            </>
          )}
        </span>
      </div>

      {/* Motes rising through the sky half. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 hidden lg:block">
        {MOTES.map((m) => (
          <span
            key={`${m.right}-${m.top}`}
            className={`ch-mote ${m.size} ${m.tint}`}
            style={{ right: m.right, top: m.top, animationDelay: m.delay }}
          />
        ))}
      </div>

      {/* The staircase to the goal, on the right: a twilight scene with one
          glass stair per phase, the mascot climbing a stair each time one is
          finished (JourneyStairs). It fades into the white on its left, so the
          scene and the words share one panel. */}
      <div className="absolute inset-y-0 right-0 hidden w-[62%] lg:block [mask-image:linear-gradient(to_right,transparent,#000_20%)]">
        <JourneyStairs phases={phases} completedPhases={completedPhases} goal={careerGoal} />
      </div>
      {/* A paper plane's dashed trail from the words toward the climb */}
      <svg aria-hidden viewBox="0 0 160 60" className="pointer-events-none absolute top-[46%] left-[33%] hidden h-16 w-44 text-violet-500 lg:block">
        <path d="M2 52 C 40 58, 60 20, 100 34 S 140 30, 150 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeDasharray="3 5" strokeLinecap="round" />
        <path d="M138 6 L 158 2 L 150 22 L 146 14 Z" fill="currentColor" />
      </svg>

      {/* ---- What this section is for ---- */}
      <div className="relative flex flex-col justify-center px-5 lg:items-start pt-1 pb-5 sm:px-8 sm:pb-6 lg:min-h-[28rem] lg:w-[58%] lg:px-10 lg:py-8">
        <span className="ch-badge hidden lg:inline-flex items-center gap-1.5 rounded-full bg-violet-100/80 px-2.5 py-1 text-[0.7rem] font-black text-violet-700 ring-1 ring-violet-200/70 ring-inset lg:gap-2 lg:px-3.5 lg:py-1.5 lg:text-sm">
          <Rocket className="h-4 w-4 text-orange-500" />
          Build Your Future
        </span>

        <h1 className="text-[1.55rem] leading-[1.1] lg:mt-4 font-black tracking-tight text-slate-900 sm:text-[1.9rem] lg:text-[2.6rem] xl:text-[3.15rem]">
          <span className="ch-in block" style={{ animationDelay: '0.08s' }}>
            Your Career Journey
          </span>
          <span className="ch-in relative mt-1.5 block w-fit" style={{ animationDelay: '0.18s' }}>
            <span className="fp-text-shimmer bg-gradient-to-r from-violet-600 via-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Starts Here
            </span>
            {/* Two strokes, as in the design: a long sweep with a shorter one
                tucked under its start, the way an underline drawn by hand
                doubles back. */}
            <svg
              aria-hidden
              viewBox="0 0 260 16"
              preserveAspectRatio="none"
              className="ch-underline absolute -bottom-2 left-0 h-3 w-[104%] text-amber-400"
            >
              <path d="M3 7 C 70 1, 150 12, 257 4" fill="none" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" />
              <path d="M8 13 C 60 9, 120 15, 196 11" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.75" />
            </svg>
          </span>
        </h1>

        <p className="ch-in mt-5 max-w-[27rem] text-[0.95rem] leading-relaxed text-slate-600 lg:text-[1.15rem]" style={{ animationDelay: '0.28s' }}>
          {firstName ? <>Hi <span className="font-black text-slate-900">{firstName}</span>, </> : 'Hi, '}
          {!phases.length
            ? <>your step-by-step path to <span className="font-bold text-violet-700">{target}</span> starts here.</>
            : stepsLeft === 0
              ? <>you&apos;ve climbed every step — you reached <span className="font-bold text-violet-700">{target}</span>! 🎉</>
              : <>just <span className="font-black text-violet-700">{stepsLeft} step{stepsLeft === 1 ? '' : 's'}</span> left to reach <span className="font-bold text-violet-700">{target}</span>. Keep climbing! 🚀</>}
        </p>


        {/* The one action. A "View My Progress" button stood beside it and
            has been removed: My Progress is a tab in the strip above, so the
            hero offered a second route to a page that was never hard to
            reach, at the cost of splitting attention with the quest. */}
        <div className="ch-in mt-6 flex flex-wrap items-center gap-2.5 lg:gap-3 [&>a]:w-full [&>a]:justify-center lg:[&>a]:w-auto lg:[&>a]:!px-7 lg:[&>a]:!py-4 lg:[&>a]:!text-lg" style={{ animationDelay: '0.38s' }}>
          {/* Unchanged: it already carries the XP chip, the three states and
              the beacon that makes it findable. */}
          <CurrentMission task={task} completedToday={completedToday} totalToday={totalToday} />
        </div>

        {/* What the path does, in three words each */}
        <div className="ch-in mt-7 hidden items-center gap-6 lg:flex" style={{ animationDelay: '0.48s' }}>
          {[
            [BarChart3, 'Learn', 'New skills', 'bg-violet-100 text-violet-600'],
            [Star, 'Track', 'Your progress', 'bg-amber-100 text-amber-500'],
            [Trophy, 'Achieve', 'Your goals', 'bg-emerald-100 text-emerald-600']
          ].map(([Icon, title, sub, tone], i) => (
            <div key={title} className={`flex items-center gap-2.5 ${i ? 'border-l border-slate-200 pl-5' : ''}`}>
              <span className={`flex h-12 w-12 items-center justify-center rounded-full ${tone}`}><Icon className="h-6 w-6" /></span>
              <span className="leading-tight">
                <span className="block text-base font-black text-slate-900">{title}</span>
                <span className="block text-sm text-slate-500">{sub}</span>
              </span>
            </div>
          ))}
        </div>
      </div>

    </section>
  );
}
