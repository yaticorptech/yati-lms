import { useEffect, useRef } from 'react';
import { idleCta, sleep as SLEEP } from '../../mascot/mascotConfig.js';

// Not `scroll`: the student's scrolling always arrives with one of these (a
// wheel, a touch, a key, a drag of the bar), and the mascot's own scrolling
// never does — so it can never be mistaken for the student being active.
const INPUT = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart', 'touchmove'];

/**
 * What the student is doing, for the mascot to answer:
 *   onIdleHint             ten quiet seconds, once per quiet spell
 *   onRest                 thirty quiet seconds, once per quiet spell
 *   onInput                any input at all (it wakes the mascot)
 *   onCursor(x, y | null)  where the mouse is, for the eyes
 *   onCardHover(el)        the mouse went over a `[data-mascot-card]`
 *   onCardClick(el)        one was pressed
 *   onLockedHover(el)      the mouse went over a `[data-mascot-locked]`
 *   onLockedClick(el, what, prerequisite)   one was pressed
 *   onTargetPress(el, name)  a `[data-mascot-target]` was pressed
 *
 * `isBusy()` says the mascot is scrolling the page itself, so that motion is
 * not taken for the student's. All listeners are passive and removed on
 * unmount; nothing here runs a timer faster than once a second.
 */
export default function useMascotSensors(enabled, handlers) {
    const ref = useRef(handlers);
    useEffect(() => { ref.current = handlers; });

    useEffect(() => {
        if (!enabled) return undefined;
        const call = (name, ...args) => ref.current[name]?.(...args);
        let last = Date.now();
        let hinted = false;
        let rested = false;

        const onInput = (event) => {
            last = Date.now();
            hinted = false;
            rested = false;
            call('onInput');
            if (event.type === 'pointermove' && event.pointerType === 'mouse') call('onCursor', event.clientX, event.clientY);
        };
        const onLeave = () => call('onCursor', null);

        const onOver = (event) => {
            if (event.pointerType !== 'mouse') return;
            const card = event.target?.closest?.('[data-mascot-card]');
            // Moving between the item's own children is not a new hover.
            if (card && !card.contains(event.relatedTarget)) call('onCardHover', card);
            const locked = event.target?.closest?.('[data-mascot-locked]');
            if (locked && !locked.contains(event.relatedTarget)) call('onLockedHover', locked);
        };

        const onPress = (event) => {
            const locked = event.target?.closest?.('[data-mascot-locked]');
            if (locked) {
                call('onLockedClick', locked, locked.getAttribute('data-mascot-locked'), locked.getAttribute('data-mascot-prerequisite'));
                return;
            }
            const card = event.target?.closest?.('[data-mascot-card]');
            if (card) call('onCardClick', card);
            const target = event.target?.closest?.('[data-mascot-target]');
            if (target) call('onTargetPress', target, target.getAttribute('data-mascot-target'));
        };

        // Time on another tab is not idle time on this page.
        const onVisibility = () => {
            if (!document.hidden) last = Date.now();
        };

        const tick = setInterval(() => {
            if (document.hidden || ref.current.isBusy?.()) return;
            const quiet = Date.now() - last;
            if (!hinted && quiet >= idleCta.afterMs) {
                hinted = true;
                call('onIdleHint');
            }
            if (!rested && quiet >= SLEEP.afterMs) {
                rested = true;
                call('onRest');
            }
        }, 1000);

        const opts = { capture: true, passive: true };
        INPUT.forEach((type) => window.addEventListener(type, onInput, opts));
        window.addEventListener('pointerdown', onPress, opts);
        document.addEventListener('pointerover', onOver);
        document.addEventListener('pointerleave', onLeave);
        document.addEventListener('visibilitychange', onVisibility);
        return () => {
            clearInterval(tick);
            INPUT.forEach((type) => window.removeEventListener(type, onInput, opts));
            window.removeEventListener('pointerdown', onPress, opts);
            document.removeEventListener('pointerover', onOver);
            document.removeEventListener('pointerleave', onLeave);
            document.removeEventListener('visibilitychange', onVisibility);
        };
    }, [enabled]);
}
