import { useEffect } from 'react';

/**
 * Tab strips that scroll sideways on a phone (Rewards, Analytics, Users…):
 * the tab tapped is brought to the middle of its strip, so the next tab — or
 * the previous one, going back — is always in view, never hidden off the edge.
 *
 * One listener for the whole panel, mounted in the layouts, so every strip
 * gets it, including ones added later. It only acts on a strip that really
 * scrolls sideways and on a tab that is one of the strip's own items — a
 * button inside a wide table is left alone.
 */
const isTabStrip = (el) => {
    if (!el || el.scrollWidth <= el.clientWidth + 1) return false;
    const style = window.getComputedStyle(el);
    return style.overflowX === 'auto' || style.overflowX === 'scroll';
};

export default function useCenterTabs() {
    useEffect(() => {
        const onClick = (e) => {
            const tab = e.target.closest?.('button, a, [role="tab"]');
            if (!tab) return;
            // The tab's own row: its parent, or its grandparent when the
            // buttons sit in a wrapper inside the scroller.
            const strip = [tab.parentElement, tab.parentElement?.parentElement].find(isTabStrip);
            if (!strip || strip.closest('table')) return;
            const s = strip.getBoundingClientRect();
            const t = tab.getBoundingClientRect();
            const delta = (t.left + t.width / 2) - (s.left + s.width / 2);
            if (Math.abs(delta) < 4) return;
            const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
            strip.scrollBy({ left: delta, behavior: reduced ? 'auto' : 'smooth' });
        };
        document.addEventListener('click', onClick);
        return () => document.removeEventListener('click', onClick);
    }, []);
}
