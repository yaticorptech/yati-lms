import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Save a draft as the person types: `save(value)` after `delay` ms of quiet,
 * at once on `flush()`, and before the page is left. The status says what the
 * editor should show: idle, saving, saved (with the time), or error.
 */
const useAutosave = (save, delay = 1500) => {
    const [status, setStatus] = useState({ state: 'idle', at: null, error: '' });
    const pending = useRef(null);
    const timer = useRef(null);
    const saveRef = useRef(save);
    useEffect(() => { saveRef.current = save; }, [save]);

    const run = useCallback(async () => {
        clearTimeout(timer.current);
        const value = pending.current;
        if (value === null) return;
        pending.current = null;
        setStatus((s) => ({ ...s, state: 'saving' }));
        try {
            await saveRef.current(value);
            setStatus({ state: pending.current === null ? 'saved' : 'saving', at: new Date(), error: '' });
        } catch (error) {
            // Kept, so the next keystroke or a retry sends it again.
            if (pending.current === null) pending.current = value;
            setStatus({ state: 'error', at: null, error: error?.response?.data?.message || (!error?.response ? 'You appear to be offline.' : 'Could not save.') });
        }
    }, []);

    const queue = useCallback((value) => {
        pending.current = value;
        setStatus((s) => ({ ...s, state: 'pending' }));
        clearTimeout(timer.current);
        timer.current = setTimeout(run, delay);
    }, [run, delay]);

    useEffect(() => {
        const warn = (e) => { if (pending.current !== null) { e.preventDefault(); e.returnValue = ''; } };
        window.addEventListener('beforeunload', warn);
        return () => { window.removeEventListener('beforeunload', warn); clearTimeout(timer.current); if (pending.current !== null) run(); };
    }, [run]);

    return { queue, flush: run, status, hasPending: () => pending.current !== null };
};

export default useAutosave;
