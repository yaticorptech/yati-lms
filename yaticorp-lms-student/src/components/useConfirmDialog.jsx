/**
 * window.confirm(), the app's way:
 *
 *   const [confirm, confirmDialog] = useConfirmDialog();
 *   if (!(await confirm({ title: 'Remove your resume?', destructive: true }))) return;
 *   …
 *   return <>{…}{confirmDialog}</>;
 *
 * `confirm` resolves true or false; `confirmDialog` is the element to render
 * (null while nothing is being asked). No provider needed — each component
 * that asks owns its own dialog.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import ConfirmDialog from './ConfirmDialog';

export default function useConfirmDialog() {
    const [asking, setAsking] = useState(null);
    const resolver = useRef(null);

    const confirm = useCallback((options = {}) => new Promise((resolve) => {
        // A second question while one is open answers the first "no".
        resolver.current?.(false);
        resolver.current = resolve;
        setAsking(options);
    }), []);

    const answer = useCallback((yes) => {
        resolver.current?.(yes);
        resolver.current = null;
        setAsking(null);
    }, []);

    // Leaving the page with the question open is a "no", never a hang.
    useEffect(() => () => resolver.current?.(false), []);

    const dialog = asking ? <ConfirmDialog {...asking} onConfirm={() => answer(true)} onCancel={() => answer(false)} /> : null;
    return [confirm, dialog];
}
