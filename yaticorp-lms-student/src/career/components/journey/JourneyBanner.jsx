import { Star, Flame, CalendarDays } from 'lucide-react';
import './calendarHero.css';

/**
 * The banner at the top of the calendar: who is looking, and what they have
 * built up so far.
 *
 * Built from the supplied artwork rather than drawn here. Only the scene half
 * of that file is used — `calendar-hero-art.png`, with the painted left half
 * removed, and `calendar-hero-bg.png`, the same scene with its background
 * extended leftwards so it can reach both edges of a panel far wider than the
 * picture. See the README in public/illustrations for how the two are
 * derived.
 *
 * Everything in the left half is a real element for the same reason the
 * overview hero rebuilds its own: the painted version reads "Hari", "Level 2",
 * "215 / 300 XP" and "0 days streak", and all four belong to whoever drew the
 * mock. The level and XP come from the student's record, and the streak is
 * computed from their own completion history.
 *
 * No button. The design has none, and the one that used to sit here — "Today's
 * plan" — pointed at a page the shell already lists as its own nav item, so it
 * was a second route to somewhere that was never hard to reach.
 */
export default function JourneyBanner({ name, greeting, level = 1, progress, streak = 0 }) {
  const firstName = name?.split(' ')[0];

  return (
    <section className="cb-hero relative overflow-hidden rounded-3xl bg-gradient-to-br from-white via-[#f7f6fe] to-[#eaeffc] shadow-card ring-1 ring-violet-100 ring-inset lg:flex lg:min-h-[300px] lg:items-center xl:min-h-[340px]">
      {/* ---- Wide screens: the scene as the panel's background ----
          The extension is what lets the picture reach both edges: the scene
          is 1.74:1 and this panel is nearer 3.8:1, so `cover` on the scene
          alone would have to scale it twice too tall and would slice the
          floating cards off the top. Widening the file instead means the
          whole scene survives and nothing is cropped vertically. */}
      <div
        aria-hidden
        className="cb-art pointer-events-none absolute inset-0 hidden bg-cover bg-right bg-no-repeat lg:block"
        style={{ backgroundImage: "url('/illustrations/calendar-hero-bg.png')" }}
      />

      {/* ---- What the words sit on ----
          Not a card. A white panel with its own corners, ring and shadow
          reads as a second thing laid over the picture — the banner stops
          being one image and becomes a box beside a photograph, which is
          exactly what the design does not do.

          So the surface is a wash instead: white at the left edge, gone by
          the time the scene starts, with no border anywhere to say where one
          half ends.

          Where it has to be gone by is not one number. The scene is sized by
          the panel's height and pinned to its right edge, so it claims a
          share of the width that shrinks as the panel gets wider — it starts
          at 46% of a 960px panel and 51% of a 1216px one. Each stop is set
          for the narrowest panel its breakpoint has to cover, because a wash
          that runs on too far does not fade into the picture, it bleaches the
          left edge of the books. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 hidden bg-gradient-to-r from-white/95 from-0% via-white/72 via-26% to-transparent to-45% lg:block xl:via-30% xl:to-50%"
      />

      {/* Held to just under half the panel on wide screens: the scene claims
          the rightmost ~50%, and the books at its left edge are the first
          thing wider words would run into. */}
      <div className="relative p-5 sm:p-6 lg:w-[50%] lg:px-8 lg:py-7 xl:w-[49%] xl:px-10">
        <p className="cb-in text-[0.8rem] font-semibold text-slate-500 sm:text-sm">
          {greeting}
          {firstName ? (
            <>
              , <span className="font-black text-[#1b2456]">{firstName}</span>{' '}
              <span aria-hidden>👋</span>
            </>
          ) : (
            <span aria-hidden> 👋</span>
          )}
        </p>

        {/* Marked so the companion will not stand on the words or float its
            bubble through them. Nothing can infer "these are words being
            read" from the DOM, so the banner says so. */}
        <h1
          data-mascot-clear
          className="mt-1 text-[1.35rem] leading-[1.08] font-black tracking-tight text-[#1b2456] sm:text-[1.65rem] lg:text-[1.7rem] xl:text-[2.05rem]"
        >
          <span className="cb-in block" style={{ animationDelay: '0.06s' }}>
            <span className="bg-gradient-to-r from-[#2b3ad6] to-[#1b2456] bg-clip-text text-transparent">
              Plan
            </span>{' '}
            your journey.
          </span>

          <span
            className="cb-in relative mt-0.5 block w-fit"
            style={{ animationDelay: '0.14s' }}
          >
            <span className="bg-gradient-to-r from-[#a78bfa] via-[#7c5cf5] to-[#3b52e0] bg-clip-text text-transparent">
              Build your future.
            </span>
            {/* One thick sweep with a hairline tucked under its start, the
                way an underline drawn by hand doubles back. Sits under the
                back half of the line, as in the design, rather than the
                whole of it. */}
            <svg
              aria-hidden
              viewBox="0 0 240 14"
              preserveAspectRatio="none"
              className="cb-underline absolute -bottom-1.5 left-[28%] h-2.5 w-[74%] text-amber-400"
            >
              <path
                d="M4 8 C 60 2, 150 12, 236 5"
                fill="none"
                stroke="currentColor"
                strokeWidth="5"
                strokeLinecap="round"
              />
              <path
                d="M10 12.5 C 70 9, 130 13, 188 10"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                opacity="0.6"
              />
            </svg>
          </span>
        </h1>

        <p
          data-mascot-clear
          className="cb-in mt-2.5 text-[0.78rem] leading-[1.5] text-slate-600 sm:text-[0.85rem]"
          style={{ animationDelay: '0.22s' }}
        >
          Your tasks, exams and classes are all in one place — so every day brings you
          closer to your dreams.
        </p>

        {/* ---- What the student has built up ----
            One pill, three cells, hairlines between them. The first two are
            their own figures; the third is the design's encouragement, and
            is the only cell that counts nothing. */}
        <div
          className="cb-in mt-3.5 flex items-stretch gap-2 rounded-full bg-white/95 px-2.5 py-2 shadow-[0_10px_30px_-18px_rgba(49,46,129,0.55)] ring-1 ring-violet-100/80 ring-inset sm:gap-3 sm:px-3.5"
          style={{ animationDelay: '0.3s' }}
        >
          <Stat
            icon={
              <Star
                className="h-3.5 w-3.5 fill-white/40 text-white sm:h-4 sm:w-4"
                strokeWidth={2.6}
              />
            }
            badge="rounded-full bg-gradient-to-br from-[#c4b5fd] to-[#8b5cf6]"
            value={`Level ${level}`}
            label={progress ? `${progress.xp} / ${progress.ceiling} XP` : 'Keep earning XP'}
          />

          <Divider />

          <Stat
            icon={
              <Flame
                className="futurepath-flame h-3.5 w-3.5 fill-orange-400 text-orange-600 sm:h-4 sm:w-4"
                strokeWidth={2.4}
              />
            }
            badge="rounded-full bg-gradient-to-br from-[#fde68a] to-[#fbbf24]"
            value={streak}
            label={`day${streak === 1 ? '' : 's'} streak`}
          />

          {/* Dropped on a phone, where three cells leave the third about
              90px and it renders as "Keep g…". It is the right one to lose:
              the other two are the student's own figures, and this one
              counts nothing. */}
          <Divider className="hidden sm:block" />

          <Stat
            className="hidden sm:flex"
            icon={
              <CalendarDays
                className="h-3.5 w-3.5 text-[#3b52e0] sm:h-4 sm:w-4"
                strokeWidth={2.6}
              />
            }
            badge="rounded-[0.6rem] bg-gradient-to-br from-[#dbe4ff] to-[#bfd0fe]"
            value="Keep going"
            /* The design's line is "You're doing great!", which is a fine
               thing to say to someone with a streak and an empty one to
               say to someone who has not started. The second reading gets
               its own words rather than praise it has not earned. */
            label={streak > 0 ? "You're doing great!" : 'Start today'}
          />
        </div>

        {/* The line the design signs off with. Pacifico is already loaded
            for `.lb-script`; this reuses it rather than pulling a second
            handwriting face. */}
        <p
          className="cb-in mt-3 flex items-center gap-1.5 pl-1 text-[0.9rem] text-[#2b4bd8] sm:text-base"
          style={{ animationDelay: '0.38s' }}
        >
          <span className="lb-script relative inline-block -rotate-[2.5deg]">
            Small steps. Big dreams.
            <svg
              aria-hidden
              viewBox="0 0 200 10"
              preserveAspectRatio="none"
              className="absolute -bottom-1 left-[6%] h-1.5 w-[88%] text-amber-400"
            >
              <path
                d="M3 6 C 50 1, 140 9, 197 3"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <Balloon />
        </p>
      </div>

      {/* ---- Narrow screens: the scene, under the words rather than behind
          them ----
          There is no room beside the picture at these widths, and the wash
          that works on a wide screen does not survive here: it only has to
          cover the banner's own pale background there, whereas here it would
          have to cover the scene itself. The floating cards and the calendar
          are the most saturated things in the app, and a wash heavy enough to
          make an 11px label legible over them leaves a ghost of the picture.

          So the scene stops being a background and becomes a band: cropped to
          a strip, but a strip of a picture nothing is written on.

          Full bleed, and with no edge of its own. Inset in a rounded box with
          a ring it was a photograph pinned inside the panel — the same "two
          separate things" the card on the wide layout was. So it runs to all
          three borders instead, and its top fades in rather than starting,
          which leaves the words and the picture on one surface with no line
          between them. The vertical crop is set low to suit that: the part
          the fade eats is sky, and what survives is the calendar and the
          desk. */}
      <div
        aria-hidden
        className="cb-art relative -mt-2 h-36 bg-cover bg-[position:58%_64%] bg-no-repeat [mask-image:linear-gradient(to_bottom,transparent,black_45%)] sm:h-44 lg:hidden"
        style={{ backgroundImage: "url('/illustrations/calendar-hero-art.png')" }}
      />
    </section>
  );
}

/** One cell of the stat pill: a coloured badge, a figure, and what it counts. */
function Stat({ icon, badge, value, label, className = 'flex' }) {
  return (
    <span className={`min-w-0 flex-1 items-center gap-1.5 sm:gap-2 ${className}`}>
      <span
        aria-hidden
        className={`flex h-6 w-6 shrink-0 items-center justify-center shadow-sm sm:h-7 sm:w-7 ${badge}`}
      >
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[0.78rem] leading-tight font-black text-[#1b2456] tabular-nums sm:text-[0.85rem]">
          {value}
        </span>
        <span className="block truncate text-[0.65rem] leading-tight font-semibold text-slate-500 sm:text-[0.7rem]">
          {label}
        </span>
      </span>
    </span>
  );
}

/** The hairline between two cells. */
function Divider({ className = '' }) {
  return (
    <span aria-hidden className={`w-px shrink-0 self-stretch bg-violet-100 ${className}`} />
  );
}

/** The little balloon the design ends the script line with. */
function Balloon() {
  return (
    <svg aria-hidden viewBox="0 0 20 26" className="h-5 w-4 shrink-0 text-[#6c4ff0]">
      <path
        d="M10 1.5c4.1 0 7 2.9 7 6.6 0 4.3-4.4 7.9-6.4 9.3a1 1 0 0 1-1.2 0C7.4 16 3 12.4 3 8.1 3 4.4 5.9 1.5 10 1.5Z"
        fill="currentColor"
      />
      <path
        d="M10 17.5c-.6 2.5.8 3.6-1.5 7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}
