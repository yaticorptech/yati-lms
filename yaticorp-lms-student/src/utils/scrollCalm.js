/**
 * Smooth scrolling on a modest phone: while the page scrolls, its looping
 * decorations hold still.
 *
 * The site is full of ambient motion that never ends — floating blobs,
 * twinkling sparkles, pulsing badges, slowly turning rays. Each one asks the
 * browser for a fresh frame of its own, and on a phone those frames compete
 * with the scroll for the same graphics chip; most of them sit on blurred
 * shapes, the most expensive thing to redraw.
 *
 * So from the first scroll event until 150 ms after the last one, every
 * running animation that loops forever is paused, and then each is played
 * on from where it stopped. Animations that run once (a card fading in) are
 * left alone, so nothing arrives half-drawn. It goes through the browser's
 * own list of animations rather than a class on the page, so starting and
 * stopping costs no restyling of the page. Yati, the mascot, rests its own
 * drawing the same way (public/loop-walker/loop-walker.js, shouldRest).
 *
 * Any scrolling element counts: the app scrolls its <main>, not the window.
 */
let paused = null;
let timer = 0;

const looping = (a) => {
    try { return a.playState === 'running' && a.effect?.getTiming?.().iterations === Infinity; } catch { return false; }
};

const hold = () => {
    if (paused || typeof document.getAnimations !== 'function') return;
    paused = document.getAnimations().filter(looping);
    for (const a of paused) { try { a.pause(); } catch { /* already gone */ } }
};

const release = () => {
    const list = paused || [];
    paused = null;
    for (const a of list) { try { if (a.playState === 'paused') a.play(); } catch { /* removed meanwhile */ } }
};

export function startScrollCalm() {
    if (typeof document === 'undefined') return;
    document.addEventListener('scroll', () => {
        hold();
        clearTimeout(timer);
        timer = setTimeout(release, 150);
    }, { capture: true, passive: true });
}
