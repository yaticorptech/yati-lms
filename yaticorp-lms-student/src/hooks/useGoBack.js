import { useCallback, useEffect } from 'react';
import { useLocation, useNavigate, useNavigationType } from 'react-router-dom';

/*
 * Back, everywhere (asked 2026-10-29: "always the page they were on before"). The browser's own history is
 * not enough on its own: a tab switched by its address (?tab=…) counts as a page there, and after a reload or
 * a link opened in a new tab it can hold pages from before. So the app keeps its own trail of the pages
 * visited (useTrackTrail, mounted once at the top), one entry per page — the same path with a new ?tab
 * replaces its last entry — and Back goes to the entry before the current one.
 */
const KEY = 'yati:trail';
const MAX = 60;
const read = () => { try { return JSON.parse(sessionStorage.getItem(KEY)) || []; } catch { return []; } };
const write = (t) => { try { sessionStorage.setItem(KEY, JSON.stringify(t.slice(-MAX))); } catch { /* private mode: the trail lives this page only */ } };
let memory = null;
const trail = () => memory || (memory = read());
const save = (t) => { memory = t; write(t); };

/** Mount once inside the router: records each page as it is shown. */
export function useTrackTrail() {
    const location = useLocation();
    const type = useNavigationType();
    useEffect(() => {
        const here = location.pathname + location.search;
        const t = [...trail()];
        const last = t[t.length - 1];
        const samePage = (a) => a && a.split('?')[0] === location.pathname;
        if (last === here) return;
        // Back to the page before (our Back, or the browser's): drop the one left.
        if (t[t.length - 2] === here || (type === 'POP' && samePage(t[t.length - 2]))) t.splice(-2, 2, here);
        // The same page with another ?tab, or a page that replaced the last: one entry, updated.
        else if (samePage(last) || type === 'REPLACE') t[t.length - 1] = here;
        else t.push(here);
        save(t);
    }, [location.pathname, location.search, type]);
}

/** The page before this one in the trail, or null. */
export const previousPage = () => { const t = trail(); return t.length > 1 ? t[t.length - 2] : null; };

/**
 * A Back link's click: to the page the person was on before. Only when there was none (the page opened
 * directly) does the link's own address take over.
 */
export default function useGoBack() {
    const navigate = useNavigate();
    return useCallback((e) => {
        const prev = previousPage();
        if (!prev) return;
        e?.preventDefault?.();
        navigate(prev);
    }, [navigate]);
}
