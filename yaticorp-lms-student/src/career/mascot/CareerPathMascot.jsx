import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { layout } from '../../mascot/mascotConfig.js';
import { CareerMascotContext } from './useMascot';
import { createMascotEngine } from './mascotEngine';
import useMascotSensors from './useMascotSensors';
import useMascotProgress from './useMascotProgress';
import './mascot.css';

// The old guide's Hide toggle stored this; the toggle is gone, so it is cleared rather than honoured.
const OLD_HIDDEN_KEY = 'yati.careerGuide.hidden';
const REDUCED = '(prefers-reduced-motion: reduce)';
const DOCK = `(max-width: ${layout.dockBelow - 1}px)`;
const RATIO = layout.canvas.h / layout.canvas.w;

const storage = {
    set(key, value) {
        try {
            if (value == null) localStorage.removeItem(key);
            else localStorage.setItem(key, value);
        } catch {
            // Storage switched off: the choice lasts for this visit only.
        }
    }
};

const useMedia = (query) =>
    useSyncExternalStore(
        (onChange) => {
            const list = window.matchMedia(query);
            list.addEventListener('change', onChange);
            return () => list.removeEventListener('change', onChange);
        },
        () => window.matchMedia(query).matches,
        () => false
    );

/** A ref, a `[data-mascot-target]` name, a selector, or an element. */
const resolveTarget = (target) => {
    if (!target) return null;
    if (target instanceof Element) return target;
    if (typeof target === 'object' && 'current' in target) return target.current;
    if (typeof target === 'string') return /^[\w-]+$/.test(target) ? target : document.querySelector(target);
    return null;
};

// ---------- the layer ----------

function MascotLayer({ busRef, regions }) {
    const desktop = useMedia(layout.desktopQuery);
    const tablet = useMedia(layout.tabletQuery);
    const reduced = useMedia(REDUCED);
    const dock = useMedia(DOCK);
    const { pathname } = useLocation();
    const dims = useMemo(() => {
        const w = desktop ? layout.size.desktop : tablet ? layout.size.tablet : layout.size.phone;
        return { w, h: Math.round(w * RATIO) };
    }, [desktop, tablet]);

    const [shown, setShown] = useState(false);
    const [bubble, setBubble] = useState(null);
    const [ring, setRing] = useState(null);
    const [spoken, setSpoken] = useState(null);
    const [z, setZ] = useState(null);
    const [clip, setClip] = useState(null);
    const [away, setAway] = useState(false);

    const live = useRef({ dims, reduced, dock, pathname });
    useEffect(() => {
        live.current = { dims, reduced, dock, pathname };
    });

    const bodyRef = useRef(null);
    const facingRef = useRef(null);
    const rigRef = useRef(null);
    const stillRef = useRef(null);
    const confettiRef = useRef(null);
    const engineRef = useRef(null);

    const recount = useMascotProgress(
        (event) => engineRef.current?.emit(event),
        (fact, value) => engineRef.current?.setFact(fact, value)
    );
    const recountRef = useRef(recount);
    useEffect(() => {
        recountRef.current = recount;
    });

    useEffect(() => {
        const engine = createMascotEngine({
            get: {
                dims: () => live.current.dims,
                reduced: () => live.current.reduced,
                dock: () => live.current.dock,
                pathname: () => live.current.pathname
            },
            set: { bubble: setBubble, ring: setRing, spoken: setSpoken, z: setZ, clip: setClip, shown: setShown, recount: () => recountRef.current?.() }
        });
        engineRef.current = engine;
        busRef.current = engine;
        engine.attach({ body: bodyRef.current, facing: facingRef.current, rig: rigRef.current, still: stillRef.current, confetti: confettiRef.current });
        regions.current.forEach((kind, el) => engine.region(el, kind));
        engine.appear();
        engine.scheduleWander();
        return () => {
            engine.stop();
            engineRef.current = null;
            busRef.current = null;
        };
    }, [busRef, regions]);

    useEffect(() => {
        engineRef.current?.routeChanged(pathname);
        engineRef.current?.scheduleWander();
    }, [pathname]);

    // Scroll and resize are noted, and measured on the next frame — never per event.
    useEffect(() => {
        const follow = () => engineRef.current?.follow();
        const opts = { capture: true, passive: true };
        window.addEventListener('scroll', follow, opts);
        window.addEventListener('resize', follow);
        const onVisibility = () => engineRef.current?.visibility(document.hidden);
        document.addEventListener('visibilitychange', onVisibility);
        return () => {
            window.removeEventListener('scroll', follow, opts);
            window.removeEventListener('resize', follow);
            document.removeEventListener('visibilitychange', onVisibility);
        };
    }, []);

    // The loop rests while the section itself is off screen.
    useEffect(() => {
        const section = document.querySelector('[data-mascot-section]');
        if (!section || typeof IntersectionObserver === 'undefined') return undefined;
        const observer = new IntersectionObserver(([entry]) => engineRef.current?.offscreen(!entry.isIntersecting), { threshold: 0 });
        observer.observe(section);
        return () => observer.disconnect();
    }, [pathname]);

    // Off stage while a page loader is up (it shows the mascot too).
    useEffect(() => {
        let timer = 0;
        const check = () => {
            timer = 0;
            setAway(Boolean(document.querySelector('[data-yati-loader]')));
        };
        const observer = new MutationObserver(() => {
            if (!timer) timer = setTimeout(check, 50);
        });
        observer.observe(document.body, { childList: true, subtree: true });
        timer = setTimeout(check, 0);
        return () => {
            observer.disconnect();
            clearTimeout(timer);
        };
    }, []);

    useMascotSensors(true, {
        isBusy: () => engineRef.current?.isScrolling(),
        onInput: () => engineRef.current?.input(),
        onCursor: (x, y) => engineRef.current?.cursor(x, y),
        onIdleHint: () => engineRef.current?.idleHint(),
        onRest: () => engineRef.current?.rest(),
        onCardHover: (el) => {
            engineRef.current?.lookAt(el, 2200);
            engineRef.current?.expression('curious', 1400);
        },
        onCardClick: (el) => engineRef.current?.emit({ type: 'cardClicked', el }),
        onLockedHover: (el) => engineRef.current?.lookAt(el, 1800),
        onTargetPress: (el, name) => engineRef.current?.targetPressed(el, name),
        onLockedClick: (el, what, prerequisite) =>
            engineRef.current?.emit({ type: 'lockedClicked', el, what, prerequisite: prerequisite || engineRef.current?.brain.page()?.cta || 'current-roadmap-position' })
    });


    const ringBox = ring?.el?.isConnected ? ring.el.getBoundingClientRect() : null;
    const layerStyle = {
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: z || 35,
        ...(clip != null ? { clipPath: `inset(0 0 0 ${clip}px)` } : null)
    };

    return createPortal(
        <>
            <div className="career-mascot" aria-hidden="true" data-away={away || undefined} style={layerStyle}>
                <div ref={bodyRef} className="career-mascot-body" data-mascot-state="idle" data-mascot-facing="right" style={{ position: 'absolute', left: 0, top: 0, width: dims.w, aspectRatio: '1117 / 1408', visibility: shown ? 'visible' : 'hidden' }}>
                    <div ref={facingRef} className="career-mascot-facing" style={{ position: 'absolute', inset: 0 }}>
                        <div ref={rigRef} className="career-mascot-rig" style={{ position: 'absolute', inset: 0 }} />
                        <img ref={stillRef} className="career-mascot-still" alt="" draggable={false} style={{ position: 'absolute', left: 0, top: 0, bottom: '4%', width: '100%', height: '96%', objectFit: 'contain', objectPosition: '50% 100%' }} />
                    </div>
                    {bubble && (
                        <div key={bubble.id} className="career-mascot-bubble" data-below={bubble.below || undefined} style={{ '--shift': `${Math.round(bubble.shift || 0)}px` }}>
                            {bubble.text}
                        </div>
                    )}
                </div>
                {ringBox && (
                    <div
                        key={ring.id}
                        className="career-mascot-ring"
                        style={{ left: ringBox.left - 6, top: ringBox.top - 6, width: ringBox.width + 12, height: ringBox.height + 12 }}
                    />
                )}
                <div ref={confettiRef} className="career-mascot-confetti" />
            </div>
            {/* The mascot is decoration; what it says is not. */}
            <div className="sr-only" aria-live="polite">
                {spoken && <p key={spoken.id}>{spoken.text}</p>}
            </div>
        </>,
        document.body
    );
}

/**
 * The Career Path's mascot: the kit's rig, driven live — breathing, blinking,
 * following the cursor, walking the section's pages to the next step, the
 * current phase, today's class — pointing, reading along, watching a video,
 * thinking through a quiz, and reacting with the kit's stills. Wraps the
 * section so its pages can report moments through useMascot(); renders the
 * mascot into <body> on top of them.
 */
export default function CareerPathMascot({ children }) {
    // Hidden only for this visit, and only when asked through the API (the
    // /dev/mascot workbench does): there is no toggle in the section any more.
    const [hidden, setHidden] = useState(false);
    const busRef = useRef(null);
    const regions = useRef(new Map());
    useEffect(() => {
        storage.set(OLD_HIDDEN_KEY, null);
    }, []);

    const value = useMemo(() => {
        const engine = () => busRef.current;
        const send = (event) => engine()?.emit(event);
        return {
            moveTo: (target) => send({ type: 'custom', key: 'moveTo', steps: [{ do: 'walk', to: resolveTarget(target) }] }),
            point: (target, text) => send({ type: 'custom', key: 'point', steps: [{ do: 'walk', to: resolveTarget(target) }, { do: 'point', text }] }),
            react: (name, ms) => send({ type: 'custom', key: `react:${name}`, steps: [{ do: 'still', name, ms }] }),
            setExpression: (name, ms) => engine()?.expression(name, ms),
            sleep: () => engine()?.rest(),
            wake: () => engine()?.input(),
            lookAt: (target, ms) => engine()?.lookAt(resolveTarget(target), ms),
            stepCompleted: () => {
                const e = engine();
                if (e) e.emit({ type: e.brain.stepDone() });
            },
            phaseCompleted: () => send({ type: 'phaseCompleted' }),
            pathCompleted: () => send({ type: 'pathCompleted' }),
            quizGraded: (result) => {
                const e = engine();
                if (!e) return;
                if (result?.passed) e.emit({ type: 'quizPassed' });
                else {
                    e.brain.breakStreak();
                    e.emit({ type: 'quizFailed' });
                }
            },
            quizAnswer: (right) => {
                const e = engine();
                if (!e) return;
                if (!right) e.brain.breakStreak();
                e.emit({ type: 'quizAnswer', right: Boolean(right) });
            },
            taskStarted: (el) => send({ type: 'taskStarted', el: resolveTarget(el) }),
            video: (state, el) => engine()?.video(state, resolveTarget(el)),
            region: (el, kind) => {
                regions.current.set(el, kind);
                const off = engine()?.region(el, kind);
                return () => {
                    regions.current.delete(el);
                    off?.();
                };
            },
            lockedClicked: (el, what, prerequisite) => send({ type: 'lockedClicked', el: resolveTarget(el), what, prerequisite }),
            cardClicked: (el) => send({ type: 'cardClicked', el: resolveTarget(el) }),
            timetableOpened: (next = false) => send({ type: 'timetableOpened', next }),
            /** Any event by name, for the /dev/mascot workbench and tests; pages report through the calls above. */
            emit: (event) => send(event),
            calendarOpened: () => send({ type: 'calendarOpened' }),
            hidden,
            setHidden
        };
    }, [hidden, setHidden]);

    return (
        <CareerMascotContext.Provider value={value}>
            {children}
            {!hidden && <MascotLayer busRef={busRef} regions={regions} />}
        </CareerMascotContext.Provider>
    );
}
