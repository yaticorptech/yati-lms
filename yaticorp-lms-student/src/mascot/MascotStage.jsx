import { memo, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import Mascot from './Mascot';
import parts from './raster-manifest';
import { loadImage, loadStill, preloadStills, stillUrl } from './stills';
import './mascot.css';

const RIG_BASE = '/mascot/raster-parts/';
const FADE_MS = 250;
const HOLD_MS = 1500;
// The rig's soles end about 4% above its canvas edge (y ≈ 1348 of 1408), while
// every still is cut right to its soles. Standing the stills this far up keeps
// the character on one ground line through the cross-fade.
const GROUND = '4%';

const REDUCED = '(prefers-reduced-motion: reduce)';
const watchReduced = (onChange) => {
    const query = window.matchMedia(REDUCED);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
};
const prefersReduced = () => window.matchMedia(REDUCED).matches;
const NONE = [];

/**
 * One rig pose. Memoised so a re-render of the stage — a reaction starting,
 * the pose changing — never rebuilds a rig and restarts its motion. Always the
 * artwork's own face: the kit draws other expressions on top of it, and the
 * mascot is only ever the original artwork.
 */
const Rig = memo(function Rig({ pose, animate }) {
    return <Mascot pose={pose} expression="happy" size="100%" assetBase={RIG_BASE} animate={animate} />;
});

/**
 * The mascot at rest — the rig in `pose`, breathing by default — and, whenever
 * `reaction` names a still, a 250ms cross-fade to that picture with a small
 * pop, held for `holdMs` (1.5s), then back to the rig and `onDone()`. A hold of
 * Infinity keeps the still up until `reaction` is cleared, with no `onDone`.
 *
 * The rig only moves in small ways; every gesture is a still (see stills.js).
 * A still is decoded before it is shown, so a reaction never flashes blank —
 * if it is not cached yet it starts a moment late instead. The rig stays
 * hidden until all its layers can draw, rather than assembling part by part.
 * Poses in `extraPoses` stay mounted, hidden, so switching to one is instant.
 *
 * `reactionId` tells a repeat of the same reaction apart from the one already
 * showing. `size` is the width — a number of pixels or any CSS length; the
 * height follows the artwork's 1117 × 1408. Under prefers-reduced-motion the
 * rig stands still and reactions swap in and out with no fade and no pop.
 */
export default function MascotStage({
    reaction = null, reactionId, pose = 'breathing', extraPoses = NONE, holdMs = HOLD_MS,
    size = 200, onDone, className = '', style
}) {
    const reduced = useSyncExternalStore(watchReduced, prefersReduced, () => false);
    const [rigReady, setRigReady] = useState(false);
    // The still on the picture layer. It stays after it fades out, so the fade
    // has something to show; `key` restarts the pop for every new reaction.
    const [shown, setShown] = useState(null);
    const onDoneRef = useRef(onDone);
    const reducedRef = useRef(reduced);
    const holdRef = useRef(holdMs);
    useEffect(() => {
        onDoneRef.current = onDone;
        reducedRef.current = reduced;
        holdRef.current = holdMs;
    });

    useEffect(() => {
        let live = true;
        Promise.allSettled(Object.values(parts).map((part) => loadImage(RIG_BASE + part.file)))
            .then(() => { if (live) setRigReady(true); });
        return () => { live = false; };
    }, []);

    // After the first paint, so the stills never compete with the page itself.
    useEffect(() => {
        let timer;
        const frame = requestAnimationFrame(() => { timer = setTimeout(preloadStills, 0); });
        return () => {
            cancelAnimationFrame(frame);
            clearTimeout(timer);
        };
    }, []);

    useEffect(() => {
        if (!reaction) return undefined;
        let live = true;
        const timers = [];
        loadStill(reaction).then(
            () => {
                if (!live) return;
                const fade = reducedRef.current ? 0 : FADE_MS;
                const hold = holdRef.current;
                setShown((prev) => ({ name: reaction, key: (prev?.key ?? 0) + 1, on: true }));
                if (!Number.isFinite(hold)) return;
                timers.push(setTimeout(() => setShown((prev) => prev && { ...prev, on: false }), fade + hold));
                timers.push(setTimeout(() => onDoneRef.current?.(), fade + hold + fade));
            },
            () => {
                // No picture, no reaction: step aside so the next one can play.
                if (!live) return;
                setShown((prev) => prev && { ...prev, on: false });
                onDoneRef.current?.();
            }
        );
        return () => {
            live = false;
            timers.forEach(clearTimeout);
        };
    }, [reaction, reactionId]);

    const stillOn = Boolean(reaction && shown?.on);
    const fade = reduced ? 0 : FADE_MS;
    const layer = (visible, bottom = 0) => ({
        position: 'absolute', top: 0, right: 0, bottom, left: 0,
        opacity: visible ? 1 : 0, transition: `opacity ${fade}ms ease`
    });

    const rigs = useMemo(() => [...new Set(['breathing', ...extraPoses, pose])], [extraPoses, pose]);

    return (
        <div
            className={className}
            style={{ position: 'relative', width: typeof size === 'number' ? `${size}px` : size, aspectRatio: '1117 / 1408', ...style }}
            data-mascot-reaction={stillOn ? shown.name : undefined}
            data-mascot-pose={pose}
        >
            <div style={layer(rigReady && !stillOn)}>
                {rigs.map((name) => (
                    <div key={name} style={{ display: name === pose ? 'block' : 'none' }}>
                        <Rig pose={name} animate={!reduced} />
                    </div>
                ))}
            </div>
            {shown && (
                <div style={layer(stillOn, GROUND)}>
                    <img
                        key={shown.key}
                        src={stillUrl(shown.name)}
                        alt=""
                        draggable={false}
                        className={reduced ? undefined : 'mascot-stage-pop'}
                        style={{ width: '100%', height: '100%', objectFit: 'contain', objectPosition: '50% 100%' }}
                    />
                </div>
            )}
        </div>
    );
}
