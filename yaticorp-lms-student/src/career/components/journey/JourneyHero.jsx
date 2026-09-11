import { Link } from 'react-router-dom';
import { Rocket } from 'lucide-react';
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

export default function JourneyHero({ task, completedToday = 0, totalToday = 0 }) {
  return (
    <section className="ch-hero relative overflow-hidden rounded-3xl bg-gradient-to-r from-white via-[#f7fbff] to-[#e9f1ff] shadow-card ring-1 ring-slate-100 ring-inset">
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

      {/* Narrow screens get the scene itself, filling the panel.
          Sizing it to the width and sitting it on the bottom left a hard
          horizontal edge partway down with blank panel above it — the picture
          read as a band stuck to the floor rather than as a background. It
          covers the whole panel now, anchored bottom right so the crop keeps
          the summit and the trophy: those are the far right of the file, and
          a centred crop drops them entirely. */}
      <div
        aria-hidden
        className="ch-art pointer-events-none absolute inset-0 bg-cover bg-right-bottom bg-no-repeat lg:hidden"
        style={{ backgroundImage: "url('/illustrations/career-hero-art.png')" }}
      />

      {/* A wash under the words only, and it must finish before the scene
          begins. It used to fade out across the full width, which laid a
          white veil over the illustration and was half the reason the colours
          looked flat beside the original. The artwork starts around 63% of
          panel at the common width and as early as 52% on a narrower one, so
          this is fully clear by 50% — it can never touch the illustration.
          The text itself ends well before that: the sentence is capped at
          28rem and the buttons finish around 37%. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 hidden bg-gradient-to-r from-white/88 from-0% via-white/38 via-30% to-transparent to-50% lg:block"
      />

      {/* Narrow screens get a veil over the whole panel instead.
          A horizontal wash protects the left of a wide banner; on a phone
          there is no left — the picture is under every line — so the same
          gradient lightened one half of an image that sat beneath the
          paragraph and the text became unreadable over the mountains.

          So the veil runs down the panel instead, and its strength is set by
          measurement rather than taste: the body text holds its 4.5:1 over
          the darkest part of the scene down to a 72% veil and fails below it,
          so the band behind the words sits at 72-90%. Under the paragraph
          there is nothing but the buttons, which are solid, so it drops to
          15% and the picture comes through at nearly full strength. The blur
          is gone — it was what made the scene unrecognisable. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/90 from-0% via-white/72 via-52% to-white/15 lg:hidden"
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
      <div className="relative px-6 pt-7 pb-24 sm:px-9 sm:pt-8 sm:pb-28 lg:w-[62%] lg:py-8">
        <span className="ch-badge inline-flex items-center gap-2 rounded-full bg-violet-100/80 px-3.5 py-1.5 text-sm font-black text-violet-700 ring-1 ring-violet-200/70 ring-inset">
          <Rocket className="h-4 w-4 text-orange-500" />
          Build Your Future
        </span>

        <h1 className="mt-3 text-[1.75rem] leading-[1.1] font-black tracking-tight text-slate-900 sm:text-[2.1rem] xl:text-[2.4rem]">
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

        <p className="ch-in mt-4 max-w-md text-[0.95rem] leading-relaxed text-slate-600" style={{ animationDelay: '0.28s' }}>
          Explore. Learn. Grow. Turn your goals into achievements with a step-by-step career
          path designed just for you.
        </p>

        <div className="ch-in mt-5 flex flex-wrap items-center gap-3" style={{ animationDelay: '0.38s' }}>
          {/* Unchanged: it already carries the XP chip, the three states and
              the beacon that makes it findable. */}
          <CurrentMission task={task} completedToday={completedToday} totalToday={totalToday} />

          <Link
            to="/career/profile"
            className="ch-btn ch-progress group inline-flex min-h-12 shrink-0 items-center gap-2.5 rounded-2xl bg-gradient-to-r from-blue-50 via-indigo-50 to-violet-50 px-5 py-3 text-sm font-black text-blue-800 shadow-card ring-1 ring-blue-200/80 ring-inset transition-colors hover:from-blue-100 hover:via-indigo-100 hover:to-violet-100"
          >
            {/* Drawn rather than taken from the icon set, so each bar can
                climb on its own delay — a chart icon that sits still next to
                a button marked "progress" is a small missed opportunity. */}
            <svg viewBox="0 0 16 16" aria-hidden className="h-4 w-4">
              <rect className="ch-bar" x="1.5" y="9" width="3.4" height="5.5" rx="1.1" fill="#2563eb" />
              <rect className="ch-bar ch-bar-2" x="6.3" y="6" width="3.4" height="8.5" rx="1.1" fill="#4f46e5" />
              <rect className="ch-bar ch-bar-3" x="11.1" y="2.5" width="3.4" height="12" rx="1.1" fill="#7c3aed" />
            </svg>
            View My Progress
          </Link>
        </div>
      </div>

    </section>
  );
}
