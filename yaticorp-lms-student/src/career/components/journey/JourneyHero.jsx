import { Rocket, Target } from 'lucide-react';
import CurrentMission from './CurrentMission';
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

export default function JourneyHero({ goal, task, completedToday = 0, totalToday = 0 }) {
  const careerGoal = goal?.careerGoal;

  return (
    <section className="ch-hero relative overflow-hidden rounded-3xl bg-white lg:bg-gradient-to-r from-white via-[#f7fbff] to-[#e9f1ff] shadow-card ring-1 ring-slate-100 ring-inset">
      {/* ---- The scene ----
          Behind the words on a wide screen, beneath them on a narrow one.
          A phone has no room to the left of the illustration for a sentence
          to sit, so the horizontal wash that protects the text on desktop
          protects nothing here — it washed the left half of a picture that
          was directly under the paragraph, and the text became unreadable
          over the mountains. Below `lg` the scene therefore stops being a
          background and becomes a band under the buttons. */}
      {/* ---- Wide screens: the scene as the panel's background ----
          career-hero-bg.png is the supplied artwork with its sky extended
          leftwards, generated from career-hero-art.png (see the README in
          public/illustrations). The extension is what lets the picture reach
          both edges: the scene is 1.8:1 and this panel is close to 5:1, so
          `cover` on the scene alone would have to scale it four times too
          tall and would slice the trophy off the top. Widening the file
          instead means the whole scene survives and nothing is cropped
          vertically. */}
      <div
        aria-hidden
        className="ch-art pointer-events-none absolute inset-0 hidden bg-cover bg-right bg-no-repeat lg:block"
        style={{ backgroundImage: "url('/illustrations/career-hero-bg.png')" }}
      />

      {/* Narrow screens: the picture as a band across the top, at full
          colour. As a washed-out background it sat directly under the
          paragraph — the script "Small steps, big dreams" collided with the
          sentence and the 70% white veil left the whole card looking hazy.
          On its own band the scene is the bright part of the card and the
          words below sit on plain white. Scaled a touch so the artwork's own
          white rounded frame is cropped away. */}
      <div className="relative aspect-[2/1] overflow-hidden lg:hidden">
        <img
          src="/illustrations/career-hero-art.png"
          alt=""
          aria-hidden
          className="ch-art h-full w-full scale-[1.06] object-cover object-[60%_25%]"
        />
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-b from-transparent to-white" />
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

      {/* Wide screens: a wash under the words only, finishing before the
          scene begins. The artwork starts around 63% of the panel at the
          common width and as early as 52% on a narrower one, so this is
          fully clear by 50% and can never touch the illustration. The text
          ends well before that — the sentence is capped at 28rem and the
          buttons finish around 37%. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 hidden bg-gradient-to-r from-white/88 from-0% via-white/38 via-30% to-transparent to-50% lg:block"
      />

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

      {/* ---- What this section is for ---- */}
      <div className="relative px-5 pt-1 pb-5 sm:px-8 sm:pb-6 lg:pt-0 lg:w-[62%] lg:px-9 lg:py-8">
        <span className="ch-badge hidden lg:inline-flex items-center gap-1.5 rounded-full bg-violet-100/80 px-2.5 py-1 text-[0.7rem] font-black text-violet-700 ring-1 ring-violet-200/70 ring-inset lg:gap-2 lg:px-3.5 lg:py-1.5 lg:text-sm">
          <Rocket className="h-4 w-4 text-orange-500" />
          Build Your Future
        </span>

        <h1 className="text-[1.55rem] leading-[1.14] lg:mt-3 font-black tracking-tight text-slate-900 sm:text-[1.9rem] lg:text-[2.1rem] xl:text-[2.4rem]">
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

        <p className="ch-in mt-4 hidden max-w-md text-[0.95rem] leading-relaxed text-slate-600 lg:block" style={{ animationDelay: '0.28s' }}>
          Explore. Learn. Grow. Turn your goals into achievements with a step-by-step career
          path designed just for you.
        </p>


        {/* The one action. A "View My Progress" button stood beside it and
            has been removed: My Progress is a tab in the strip above, so the
            hero offered a second route to a page that was never hard to
            reach, at the cost of splitting attention with the quest. */}
        <div className="ch-in mt-5 flex flex-wrap items-center gap-2.5 lg:gap-3 [&>a]:w-full [&>a]:justify-center lg:[&>a]:w-auto" style={{ animationDelay: '0.38s' }}>
          {/* Unchanged: it already carries the XP chip, the three states and
              the beacon that makes it findable. */}
          <CurrentMission task={task} completedToday={completedToday} totalToday={totalToday} />
        </div>
      </div>

    </section>
  );
}
