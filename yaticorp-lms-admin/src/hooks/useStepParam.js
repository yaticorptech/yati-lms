import { useCallback } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';

/**
 * A step inside a page — a pop-up, an opened club — kept in the address
 * (?name=value), so the browser's Back and the page's own Back (or X) both
 * go to the step before it, not off the page (asked 2026-10-28).
 *
 * Returns [value, open(value), close()]. open() adds a history entry; close()
 * goes back over it when it was ours, and otherwise just clears the value.
 */
export default function useStepParam(name) {
    const [params, setParams] = useSearchParams();
    const navigate = useNavigate();
    const location = useLocation();
    const value = params.get(name);
    const open = useCallback((v) => {
        const next = new URLSearchParams(params);
        next.set(name, v);
        navigate({ search: `?${next}` }, { state: { ...(location.state || {}), step: name } });
    }, [params, name, navigate, location.state]);
    const close = useCallback(() => {
        if (location.state?.step === name) { navigate(-1); return; }
        const next = new URLSearchParams(params);
        next.delete(name);
        setParams(next, { replace: true });
    }, [location.state, name, navigate, params, setParams]);
    return [value, open, close];
}
