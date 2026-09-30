import { useContext, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import MascotStage from './MascotStage';
import { MascotStageContext, useMascot } from './useMascot';
import { REACTIONS } from './reactions';
import './mascot.css';

const IDLE_MS = 30000;
// A second wink this soon after the last would be chatter, not a nudge.
const CTA_REST_MS = 10000;
const INPUT_EVENTS = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart', 'scroll'];
// Space left between a primary button and the top of a ducking mascot.
const DUCK_GAP = 8;

/**
 * The mascot fixed in the bottom-right corner of a page: 200px wide on the
 * desktop layout, 120px and standing above the floating nav on phones and
 * tablets (the numbers live in mascot.css). Rendered into <body>, so no
 * stacking context on the page can bury it. It is decoration — hidden from
 * screen readers and transparent to clicks — and it never hides the button
 * that matters: when a `data-mascot-cta` button scrolls into its corner, it
 * ducks below it and comes back up once the button has moved on.
 *
 * Beyond what pages ask of it through useMascot(), it makes its own small talk:
 * a wave when the page opens, a meditation after 30s without any input, and a
 * wink when the mouse goes over a button marked `data-mascot-cta`.
 */
export default function MascotDock() {
    const stage = useContext(MascotStageContext);
    return stage ? <Dock stage={stage} /> : null;
}

function Dock({ stage }) {
    const { react } = useMascot();
    const { attach, done, current } = stage;
    const homeRef = useRef(null);
    const duck = useCtaClearance(homeRef);

    // Declared first: effects run in order, and the greeting below is dropped
    // unless a stage is already attached.
    useEffect(() => attach(), [attach]);

    // While the dock holds the corner, the corner toasts step aside (mascot.css).
    useEffect(() => {
        const root = document.documentElement;
        root.setAttribute('data-mascot-dock', '');
        return () => root.removeAttribute('data-mascot-dock');
    }, []);

    useEffect(() => { react(REACTIONS.greeting, { ambient: true }); }, [react]);
    useIdle(() => react(REACTIONS.idle, { ambient: true }));
    useCtaHover(() => react(REACTIONS.cta, { ambient: true }));

    // The outer box never moves, so it is where the mascot measures its corner
    // from; only the body inside slides when it ducks.
    return createPortal(
        <div ref={homeRef} className="mascot-dock" aria-hidden="true">
            <div className="mascot-dock-body" style={duck ? { transform: `translateY(${duck}px)` } : undefined}>
                <MascotStage
                    reaction={current?.name ?? null}
                    reactionId={current?.id}
                    size="var(--mascot-dock-size)"
                    onDone={() => done(current?.id)}
                />
            </div>
        </div>,
        document.body
    );
}

/**
 * How far the mascot has to slide down so that no enabled `[data-mascot-cta]`
 * button is behind it: zero while its corner is clear, otherwise enough to put
 * its head just below the lowest such button — all the way off the bottom edge
 * if that button sits lower than the mascot can peek from.
 *
 * Measured on scroll and resize — each at most once a frame already — and
 * twice a second besides, because rows opening and buttons appearing move the
 * page without any scroll. Not through requestAnimationFrame: a frame callback
 * that never runs (a tab in the background) would leave the check stuck.
 */
function useCtaClearance(homeRef) {
    const [duck, setDuck] = useState(0);

    useEffect(() => {
        const measure = () => {
            const home = homeRef.current?.getBoundingClientRect();
            if (!home?.height) return;
            let needed = 0;
            for (const cta of document.querySelectorAll('[data-mascot-cta]')) {
                if (cta.disabled || cta.getAttribute('aria-disabled') === 'true') continue;
                const box = cta.getBoundingClientRect();
                const behind = box.width && box.height && box.right > home.left && box.left < home.right
                    && box.bottom > home.top && box.top < home.bottom;
                if (behind) needed = Math.max(needed, box.bottom - home.top + DUCK_GAP);
            }
            setDuck(Math.round(Math.min(needed, window.innerHeight - home.top)));
        };
        const opts = { capture: true, passive: true };
        window.addEventListener('scroll', measure, opts);
        window.addEventListener('resize', measure);
        const first = setTimeout(measure, 0);
        const poll = setInterval(measure, 500);
        return () => {
            clearTimeout(first);
            clearInterval(poll);
            window.removeEventListener('scroll', measure, opts);
            window.removeEventListener('resize', measure);
        };
    }, [homeRef]);

    return duck;
}

/**
 * Calls `onIdle` once per quiet spell: after IDLE_MS with no input at all, and
 * not again until the student has done something. Time spent on another tab
 * does not count — coming back is not a reason to meditate.
 */
function useIdle(onIdle) {
    const onIdleRef = useRef(onIdle);
    useEffect(() => { onIdleRef.current = onIdle; });

    useEffect(() => {
        let last = Date.now();
        let timer = null;
        const check = () => {
            const quiet = Date.now() - last;
            if (quiet >= IDLE_MS) {
                timer = null;
                onIdleRef.current();
            } else {
                timer = setTimeout(check, IDLE_MS - quiet);
            }
        };
        // Runs on every pointer move, so it only notes the time; the one timer
        // re-checks when it is due rather than being reset on each event.
        const onInput = () => {
            last = Date.now();
            if (!timer && !document.hidden) timer = setTimeout(check, IDLE_MS);
        };
        const onVisibility = () => {
            clearTimeout(timer);
            timer = null;
            if (!document.hidden) onInput();
        };
        // Capture, because scroll does not bubble and the page scrolls inside
        // the layout's own container, not the window.
        const opts = { capture: true, passive: true };
        INPUT_EVENTS.forEach((type) => window.addEventListener(type, onInput, opts));
        document.addEventListener('visibilitychange', onVisibility);
        onInput();
        return () => {
            clearTimeout(timer);
            INPUT_EVENTS.forEach((type) => window.removeEventListener(type, onInput, opts));
            document.removeEventListener('visibilitychange', onVisibility);
        };
    }, []);
}

/**
 * Calls `onHover` when a mouse enters an enabled `[data-mascot-cta]` element,
 * at most once per CTA_REST_MS. A tap is not a hover, so touch never triggers
 * it — it would wink at the very moment the button's own action lands.
 */
function useCtaHover(onHover) {
    const onHoverRef = useRef(onHover);
    useEffect(() => { onHoverRef.current = onHover; });

    useEffect(() => {
        let lastWink = -Infinity;
        const onOver = (event) => {
            if (event.pointerType !== 'mouse') return;
            const cta = event.target.closest?.('[data-mascot-cta]');
            // Moving between the button's own children is not a new hover.
            if (!cta || cta.contains(event.relatedTarget)) return;
            if (cta.disabled || cta.getAttribute('aria-disabled') === 'true') return;
            const now = Date.now();
            if (now - lastWink < CTA_REST_MS) return;
            lastWink = now;
            onHoverRef.current();
        };
        document.addEventListener('pointerover', onOver);
        return () => document.removeEventListener('pointerover', onOver);
    }, []);
}
