import { useLayoutEffect } from 'react';

/**
 * A list as tall as its first `shown` rows, the rest scrolling inside it (the
 * user's choice for the Final standings and the leaderboard). The height is
 * measured from those rows — taller on a phone, where they wrap — and again
 * when the list's width changes. `extra`: the list's own top and bottom
 * borders; `key`: what the list is showing, so a new list is measured again
 * and starts at its top. Returns whether there is more than fits.
 */
export default function useRowsShown(ref, shown, count, { extra = 0, key = '' } = {}) {
    const more = count > shown;
    useLayoutEffect(() => {
        const list = ref.current;
        if (!list) return undefined;
        list.scrollTop = 0;
        if (!more) { list.style.maxHeight = ''; return undefined; }
        const fit = () => {
            const rows = [...list.children].slice(0, shown).reduce((h, row) => h + row.getBoundingClientRect().height, 0);
            list.style.maxHeight = `${rows + extra}px`;
        };
        fit();
        const watch = typeof ResizeObserver === 'function' ? new ResizeObserver(fit) : null;
        watch?.observe(list);
        return () => watch?.disconnect();
    }, [ref, shown, count, more, extra, key]);
    return more;
}
