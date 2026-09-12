# Section illustrations

Drop your own artwork here. PNG, WebP and JPEG all work — the page tries each
in turn, so whichever your design tool exports needs no renaming. A transparent
background looks best.

Each file is optional. A slot falls back to a shared `student` image, and then
to the LMS mascot, so a missing file never shows as a broken image. Two slots
deliberately skip the mascot and stay empty until your own artwork arrives:
the report's banner (`cheer`) and the next-steps card (`steps`).

| File | Where it appears |
|---|---|
| `cheer.png` | the report, after an interview |
| `thumbs-up.png` | the Interview Ready welcome banner |
| `thinking.png` | the "More questions, more confidence!" panel |
| `idea.png` | the AI recommendation card |
| `steps.png` | the "Your next steps" card on the report |
| `student.png` | stands in for any of the above that is missing |

Use the name from the left column with your own extension, for example
`steps.webp` or `cheer.jpg`.

Portrait or square, roughly 600 px tall, and trimmed to the figure — the page
sizes them by height and aligns them to the bottom of their slot.

## Career Path

| File | Where it appears |
|---|---|
| `career-hero-bg.png` | the Career Path overview hero background — this is the one the page loads |
| `career-hero-art.png` | the scene alone; the source `career-hero-bg.png` is built from |
| `career-hero.png` | the full supplied banner; the source `career-hero-art.png` is cropped from |

Three files, each derived from the one below it.

`career-hero-art.png` is `career-hero.png` with its left half removed. That
half carries a headline, a sentence and two buttons painted into the picture,
and the hero renders all three as real elements — the quest button changes its
words once the day is cleared, so a painted copy would go on saying "Start
today's quest" after the student had finished it, and would show through
behind the real text.

`career-hero-bg.png` is `career-hero-art.png` with its sky extended leftwards
to 3400x518. The scene is 1.8:1 and the hero panel is close to 5:1, so `cover`
on the scene alone would scale it four times too tall and crop the trophy off;
widening the file lets the picture reach both edges with nothing cropped
vertically. 3400 is chosen so the panel is still the shorter aspect even on a
very wide window.

Unlike the slots above, this one has no fallback: the hero simply hides the
layer if the file is missing. To rebuild both derived files after replacing
`career-hero.png`, run the two steps in
`yaticorp-lms-server` (which has `canvas` installed) — the crop first, then
the widening. Both are a dozen lines of node-canvas; see the git history of
this file for the exact commands used.

## Career Path — the calendar

| File | Where it appears |
|---|---|
| `calendar-hero-bg.png` | the calendar's banner background — this is the one the page loads on a wide screen |
| `calendar-hero-art.png` | the scene alone; loaded directly as the band under the words on a narrow screen, and the source `calendar-hero-bg.png` is built from |
| `calendar-hero.png` | the full supplied banner; the source `calendar-hero-art.png` is cropped from |

The same three steps as above, and for the same reasons. `calendar-hero.png`
is 2172x724 and carries a greeting, a headline, a sentence, a three-part stat
bar and a signature line painted into its left half; the banner renders all of
those as real elements, because the painted ones name a student who does not
exist and quote a level, an XP total and a streak that belong to nobody.

`calendar-hero-art.png` is that file cropped to x >= 980 — right of the painted
card and of the left sparkle burst, left of the books, which are the leftmost
thing in the scene — and trimmed to 1180x678 to drop the white page margin
below and to the right of the picture, so the scene bleeds to every edge.

Two extra passes the Career Path files did not need:

* The painted card's rounded bottom-right corner reaches past the crop, so the
  scene inherits a white swoosh sweeping out from under the desk. It is
  blurred away rather than painted over — everything it crosses is already a
  smooth pale gradient, and the phone and the desk are held out of the blur by
  colour so nothing bleeds into them.
* The leftward extension to 4400x678 (~6.5:1, so `cover` never crops the scene
  vertically on any panel this wide) smears each row in its own colour, as
  before, but off a vertically blurred copy of the seam column. Smeared raw,
  every edge a row crosses — the desk lip, the shelf behind it — draws itself
  across the full width as a hard horizontal band.

To rebuild both derived files after replacing `calendar-hero.png`, run
`node scripts/buildCalendarHero.js` from `yaticorp-lms-server`, which is the
workspace `canvas` is installed in. It reads the banner from this directory
and writes both derived files back into it.
