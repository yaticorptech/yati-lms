/**
 * Coming back to the interview dashboard lands where the student left it.
 *
 * The dashboard re-fetches on every visit and shows a short loading screen
 * first, which collapses the page and loses the scroll — so "← Interview"
 * from the practice bank, a report or the history always landed on the hero
 * at the top, however far down the student had been.
 *
 * The dashboard remembers how far down it is (per tab, in sessionStorage) as
 * it scrolls. A back link marks the visit as a return; so does the browser's
 * or phone's own back. Once the dashboard's content is in, a return scrolls
 * straight to the remembered spot. Arriving any other way — the menu, a
 * fresh link — starts at the top as before.
 */
import { useLayoutEffect, useRef } from 'react';
import { useNavigationType } from 'react-router-dom';

const POSITION = 'iv-dashboard-scroll';
const RETURNING = 'iv-dashboard-return';

const read = (k) => { try { return sessionStorage.getItem(k); } catch { return null; } };
const write = (k, v) => { try { sessionStorage.setItem(k, v); } catch { /* private mode: no memory, no harm */ } };
const drop = (k) => { try { sessionStorage.removeItem(k); } catch { /* as above */ } };

/** Call from a back link to the dashboard: the next visit is a return. */
export const markReturn = () => write(RETURNING, '1');

/** The box doing the scrolling — the layout's <main>, or else the window. */
const scrollerOf = (el) => {
    for (let p = el?.parentElement; p; p = p.parentElement) {
        const o = getComputedStyle(p).overflowY;
        if (o === 'auto' || o === 'scroll') return p;
    }
    return null;
};

/**
 * @param {boolean} ready  true once the dashboard's content has rendered
 * @returns a ref for the dashboard's root element
 */
export function useReturnScroll(ready) {
    const rootRef = useRef(null);
    const navType = useNavigationType();
    // Decided once, on arrival: a back link, or the browser's back (POP).
    const returning = useRef(null);
    // Read only here; the flag is cleared in the effect once acted on, so a
    // render that React runs twice cannot eat it before the second one.
    if (returning.current === null) returning.current = read(RETURNING) === '1' || navType === 'POP';

    // Layout effect: the listener must come off before the page is swapped
    // out, or the next page's shorter height would be saved as this one's.
    useLayoutEffect(() => {
        if (!ready) return undefined;
        const box = scrollerOf(rootRef.current);
        const target = box || window;
        const get = () => (box ? box.scrollTop : window.scrollY);
        const set = (y) => (box ? (box.scrollTop = y) : window.scrollTo(0, y));

        let timer = null;
        drop(RETURNING);
        if (returning.current) {
            returning.current = false;
            const y = Number(read(POSITION)) || 0;
            // The cards animate in and images load, so the page may not be
            // tall enough yet; keep trying briefly until the spot is reachable.
            let tries = 0;
            const go = () => { set(y); if (Math.abs(get() - y) > 2 && tries++ < 30) timer = setTimeout(go, 50); };
            go();
        }

        // Written straight away: one small sessionStorage write per scroll
        // event is cheap, and nothing is left pending when the page changes.
        const onScroll = () => write(POSITION, String(Math.round(get())));
        target.addEventListener('scroll', onScroll, { passive: true });
        return () => {
            target.removeEventListener('scroll', onScroll);
            clearTimeout(timer);
        };
    }, [ready]);

    return rootRef;
}
