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
