# Section illustrations

Drop your own artwork here as PNGs with a transparent background. Each is
optional: a slot falls back to `student.png`, and then to the LMS mascot, so a
missing file never shows as a broken image.

| File | Where it appears |
|---|---|
| `cheer.png` | the report, after an interview |
| `thumbs-up.png` | the Interview Ready welcome banner |
| `thinking.png` | the "More questions, more confidence!" panel |
| `idea.png` | the AI recommendation card |
| `student.png` | stands in for any of the above that is missing |

## Career Path

| File | Where it appears |
|---|---|
| `career-hero-bg.png` | the Career Path overview hero background — this is the one the page loads |
| `career-hero-art.png` | the scene alone; the source `career-hero-bg.png` is built from |
| `career-hero.png` | the full supplied banner; the source `career-hero-art.png` is cropped from |

Three files, each derived from the one below it. `career-hero-bg.png` is
`career-hero-art.png` with its sky extended leftwards to 3400x518. The scene
is 1.8:1 and the hero panel is close to 5:1, so `cover` on the scene alone
would scale it four times too tall and crop the trophy off; widening the file
lets the picture reach both edges with nothing cropped vertically. 3400 is
chosen so the panel is still the shorter aspect on a very wide window.

`career-hero-art.png` is `career-hero.png` with its left half removed. That
half carries a headline, a sentence and two buttons painted into the picture,
and the hero renders all three as real elements — the quest button changes its
words once the day is cleared, so a painted copy would go on saying "Start
today's quest" after the student had finished it, and would show through
behind the real text. Re-crop with:

    node -e "const {createCanvas,loadImage}=require('canvas');const fs=require('fs');
    loadImage('career-hero.png').then(i=>{const x=Math.round(i.width*0.5),w=i.width-x;
    const c=createCanvas(w,i.height);c.getContext('2d').drawImage(i,x,0,w,i.height,0,0,w,i.height);
    fs.writeFileSync('career-hero-art.png',c.toBuffer('image/png'));});"

(run from the server project, which has `canvas` installed)

Landscape, roughly 1200 x 520, transparent or on a pale background that suits
the hero's sky-to-violet wash. It is decorative — the page states everything it
shows in words as well — so it carries an empty `alt` and is hidden from screen
readers. If the file is absent the hero falls back to the mascot.

Portrait or square, roughly 600 px tall, and trimmed to the figure — the page
sizes them by height and aligns them to the bottom of their slot.
