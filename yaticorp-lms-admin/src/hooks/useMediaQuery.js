/**
 * Whether a CSS media query matches, kept up to date as the window changes.
 *
 * For lists drawn two ways — a table on a wide screen, cards on a narrow one.
 * Hiding one of them with CSS still builds both, so a page of 25 students was
 * 50 rows in the DOM, and a screen reader read every student twice. With this
 * the page renders only the one that is showing.
 *
 *   const wide = useMediaQuery('(min-width: 1280px)');
 */
import { useCallback, useSyncExternalStore } from 'react';

const supported = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function';

const useMediaQuery = (query) => {
    const subscribe = useCallback((onChange) => {
        if (!supported()) return () => {};
        const list = window.matchMedia(query);
        list.addEventListener('change', onChange);
        return () => list.removeEventListener('change', onChange);
    }, [query]);
    return useSyncExternalStore(subscribe, () => supported() && window.matchMedia(query).matches, () => false);
};

export default useMediaQuery;
