# Loop Walker — drop-in mascot for your website

Loop is your logo turned into a 3D character. It follows the visitor's cursor, feels things (23 expressions),
and walks over to explain any element you tag. This folder is everything your site needs:

| File | What it is |
| --- | --- |
| `loop-walker.js` | the whole runtime (99 KB). Loads three.js r156 from cdnjs if your page doesn't already have it |
| `loop-walker.css` | styles for the overlay, speech bubble, face cam and hint (all `lw-` namespaced) |
| `mascot.glb` | the 3D model (6.3 MB; serve it with gzip/brotli and a long cache header) |
| `demo.html` | a minimal page that uses all of the above — open it to see it work |
| `react/LoopWalker.jsx` | a React / Next.js wrapper component |

## 1. Plain HTML (any site, any CMS)

Copy the folder to your site, e.g. `/loop-walker/`, then add before `</body>`:

```html
<script src="/loop-walker/loop-walker.js"></script>
<script>
  LoopWalker.mount({
    model: '/loop-walker/mascot.glb',
    greeting: { selector: 'header', text: "Hi, I'm Loop! Pause on anything and I'll explain it." },
    explain: {
      pricing: { label: 'Pricing', emo: 'proud',   gesture: 'point', text: 'Three plans, no surprises.' },
      support: { label: 'Support', emo: 'love',    text: 'Real people, 24 hours a day.' }
    }
  });
</script>
```

Then tag the elements Loop should explain:

```html
<section data-explain="pricing">…</section>

<!-- or keep the words on the element itself (wins over the map) -->
<div data-explain="support" data-explain-label="Support" data-explain-emo="love"
     data-explain-text="Real people, 24 hours a day.">…</div>
```

That's it. The CSS is picked up automatically from the same folder as the script (or pass `css: '/path/loop-walker.css'`).

## 2. React / Next.js

Put the three files in `public/loop-walker/`, copy `react/LoopWalker.jsx` into your components, and render it **once** in your root layout:

```jsx
import LoopWalker from '@/components/LoopWalker';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <LoopWalker
          greeting={{ selector: 'header', text: "Hi, I'm Loop!" }}
          explain={{ pricing: { label: 'Pricing', emo: 'proud', text: 'Three plans, no surprises.' } }}
        />
      </body>
    </html>
  );
}
```

In Next.js App Router mark the component file with `'use client'` at the top. Tag elements with `data-explain` exactly as in plain HTML.

## 3. Options (`LoopWalker.mount({...})` / component props)

| Option | Default | Meaning |
| --- | --- | --- |
| `model` | `mascot.glb` beside the script | URL of the 3D file (`.glb`, or the base64 `.glb.txt`) |
| `css` | `loop-walker.css` beside the script | stylesheet URL, or `false` if you bundle it yourself |
| `three` | cdnjs r156 | URL of three.js to load when `window.THREE` is absent |
| `container` | `document.body` | where the overlay is appended |
| `height` | `170` | Loop's height in px (also capped to 24 % of the viewport width) |
| `mode` | `'follow'` | `'follow'` the cursor or `'roam'` the page on its own |
| `explain` | `true` / `{}` | `false` disables explaining; an object is the explanation map (see below) |
| `greeting` | built-in hello | `{ selector, label, text, emo, gesture }` — walks to `selector` and says it; `false` for none |
| `facecam` | `false` | the small face-cam window in the corner |
| `hint` | `true` | the small "Move to lead it…" pill (also shows loading progress and errors) |
| `top`, `gain`, `prints`, `tilt` | `380`, `0.55`, `16`, `15` | top speed, cursor-speed gain, footprints kept, camera tilt (°) |
| `zIndex` | `40` | stacking level of the overlay |
| `onReady(api)` | | called once Loop is standing on the page |
| `onTelemetry(t)` | | ~8×/s: `feeling, strength, gait, speed, headingDeg, cursorSpeed, fps, triangles, drawCalls, tier` |
| `onError(err)` | | WebGL unavailable, model failed to load, etc. (otherwise `console.warn`) |

An explanation entry is `{ label, text, emo, gesture }`. `emo` is one of the 23 feelings
(`neutral content polite joy laughing excited love surprised afraid sad angry disgusted proud amused shy
embarrassed curious thinking confused focused bored tired sleepy`); `gesture` is optional (`point idea wave cheer proud
hip heart shy think scratch shrug ready startle cower slump fists recoil laugh rest`) and defaults to the feeling's own.
Special keys `emo-<feeling>` are built in: `data-explain="emo-joy"` makes Loop demonstrate that feeling.

## 4. Runtime API

`mount()` returns a handle (calls made before Loop is ready are queued):

```js
const loop = LoopWalker.mount({ model: '/loop-walker/mascot.glb' });
loop.say('Deal', 'Checkout is open until midnight.', 3, 'excited');   // label, text, seconds, feeling
loop.feel('surprised', 1, 0.8);                                        // feeling, strength 0–1, seconds
loop.gesture('cheer', 2);
loop.explain('#pricing');                                              // walk over and explain an element now
loop.set({ mode: 'roam', height: 200, facecam: true });                // change options live
loop.hush(); loop.pause(); loop.resume(); loop.destroy();
```

Keyboard users can Tab onto a `data-explain` element to have it explained; Escape stops the explanation. On touch
devices, tap an element. Click/tap Loop itself to poke it. `prefers-reduced-motion` is respected.

## 5. Performance notes

The page watches its own frame time and steps down through quality tiers (pixel ratio, shadow size, face-cam rate) if frames
run long, then back up. On the host, serve `mascot.glb` compressed (`Content-Encoding: br` brings it to ~1.5 MB) with
`Cache-Control: public, max-age=31536000, immutable`. three.js (650 KB) comes from cdnjs with its own cache; self-host it and
pass `three: '/vendor/three.min.js'` if your CSP blocks third-party scripts.

## 6. Doing it with Claude Code in VS Code

Open your site in VS Code, start Claude Code in the terminal, and give it this folder plus a prompt such as:

> Integrate Loop Walker into this site. The package is in `./loop-walker` (read its README first). Copy `loop-walker.js`,
> `loop-walker.css` and `mascot.glb` into our static assets folder, load the script once on every page (root layout), and
> tag these elements with `data-explain` so Loop explains them: the pricing section, the sign-up form, the feature cards, and the
> footer contact. Write a short, friendly explanation for each in our brand voice and put the texts in the `explain` map.
> Keep the greeting but make it mention our product name. Don't change any other markup or styles.

Review the diff it proposes, run the dev server, and move the cursor around.
