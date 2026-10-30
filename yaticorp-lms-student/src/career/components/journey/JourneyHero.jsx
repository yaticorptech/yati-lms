import { Rocket, BarChart3, Star, Trophy } from 'lucide-react';
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
 * Since 2026-10-27 the climb (JourneyStairs) is the mountain scene of the supplied reference, with
 * the milestones on its trail: on the right of the words from lg, on top of them below that.
 *
 * Only the artwork half of that file is used. Its left half has the headline,
 * the sentence and both buttons painted in, and those have to be real here:
 * the quest button changes its words once the day is cleared, so a painted one
 * would go on saying "Start today's quest" after the student had finished it.
 */
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
    <section className="ch-hero relative isolate overflow-hidden rounded-3xl bg-[linear-gradient(180deg,#ffffff_0%,#faf7ff_55%,#fff7ed_100%)] shadow-card ring-1 ring-slate-100 ring-inset lg:flex lg:aspect-[2030/775] lg:items-center lg:bg-[#2b1d55] lg:ring-0">
      {/* From lg the sunset is the whole banner (2026-10-29): the sky runs behind the words, which
          turn white, and a soft dusk on the left keeps them readable. */}
      <div className="absolute inset-0 -z-10 hidden lg:block">
        <JourneyStairs wide phases={phases} completedPhases={completedPhases} goal={careerGoal} />
      </div>
      <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 -z-10 hidden w-[55%] bg-gradient-to-r from-[#1c1040]/70 via-[#2a1650]/30 to-transparent lg:block" />
      {/* ---- The climb: the mountain, the robot, the milestones on the trail, the summit ----
          On top on a phone and a tablet; on the right from lg, fading into the words on its left. */}
      <div className="lg:hidden">
        <JourneyStairs phases={phases} completedPhases={completedPhases} goal={careerGoal} />
      </div>

      {/* ---- What this section is for ---- */}
      <div className="relative z-10 flex flex-col justify-center px-5 pt-5 pb-5 sm:px-8 sm:pb-6 lg:w-[48%] lg:px-10 lg:py-8">
        <div className="min-w-0">
        <span className="ch-badge hidden lg:inline-flex items-center gap-1.5 rounded-full bg-violet-100/80 px-2.5 py-1 lg:bg-white/85 lg:shadow-lg lg:backdrop-blur text-[0.7rem] font-black text-violet-700 ring-1 ring-violet-200/70 ring-inset lg:gap-2 lg:px-3.5 lg:py-1.5 lg:text-sm">
          <Rocket className="h-4 w-4 text-orange-500" />
          Build Your Future
        </span>

        <h1 className="text-[1.55rem] leading-[1.1] lg:mt-3 font-black tracking-tight text-indigo-950 sm:text-[1.9rem] lg:text-[2.6rem] xl:text-[3rem] lg:text-white lg:drop-shadow-[0_2px_12px_rgba(20,10,50,0.45)]">
          <span className="ch-in block" style={{ animationDelay: '0.08s' }}>
            Your Career Journey
          </span>
          <span className="ch-in relative mt-1.5 block w-fit" style={{ animationDelay: '0.18s' }}>
            <span className="fp-text-shimmer bg-gradient-to-r from-orange-500 via-rose-500 to-violet-600 bg-clip-text text-transparent lg:from-rose-400 lg:via-pink-400 lg:to-violet-400">
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

        <p className="ch-in mt-5 max-w-[34rem] text-[0.95rem] leading-relaxed text-slate-600 lg:text-[1.15rem] lg:text-white/90 lg:drop-shadow-[0_1px_6px_rgba(20,10,50,0.5)]" style={{ animationDelay: '0.28s' }}>
          {firstName ? <>Hi <span className="font-black text-slate-900 lg:text-white">{firstName}</span>, </> : 'Hi, '}
          {!phases.length
            ? <>your step-by-step path to <span className="font-bold text-indigo-800 lg:text-white">{target}</span> starts here.</>
            : stepsLeft === 0
              ? <>you&apos;ve climbed every step — you reached <span className="font-bold text-indigo-800 lg:text-white">{target}</span>! 🎉</>
              : <>just <span className="font-black text-orange-600 lg:text-amber-300">{stepsLeft} step{stepsLeft === 1 ? '' : 's'}</span> left to reach <span className="font-bold text-indigo-800 lg:text-white">{target}</span>. Keep climbing! 🚀</>}
        </p>


        </div>

        <div>
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
        <div className="ch-in mt-6 hidden items-center gap-6 lg:flex" style={{ animationDelay: '0.48s' }}>
          {[
            [BarChart3, 'Learn', 'New skills', 'bg-violet-100 text-violet-600'],
            [Star, 'Track', 'Your progress', 'bg-amber-100 text-amber-500'],
            [Trophy, 'Achieve', 'Your goals', 'bg-emerald-100 text-emerald-600']
          ].map(([Icon, title, sub, tone], i) => (
            <div key={title} className={`flex items-center gap-2.5 ${i ? 'border-l border-white/25 pl-5' : ''}`}>
              <span className={`flex h-12 w-12 items-center justify-center rounded-full shadow-lg ring-2 ring-white/40 ${tone}`}><Icon className="h-6 w-6" /></span>
              <span className="leading-tight drop-shadow-[0_1px_6px_rgba(20,10,50,0.5)]">
                <span className="block text-base font-black text-white">{title}</span>
                <span className="block text-sm text-white/75">{sub}</span>
              </span>
            </div>
          ))}
        </div>
        </div>
      </div>

    </section>
  );
}
