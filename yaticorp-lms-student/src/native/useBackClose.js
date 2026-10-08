import { useEffect, useRef } from 'react';
import { BACK_EVENT } from './platform';

/*
 * Open overlays, oldest first. One back press closes only the dialog on top —
 * a confirm opened over a share dialog closes, the share dialog stays — so
 * the handlers are kept as a stack behind a single listener rather than each
 * dialog listening (window listeners fire oldest first, the wrong way round).
 */
const stack = [];

const onBack = (event) => {
    const top = stack[stack.length - 1];
    if (!top) return;
    event.preventDefault();
    top.current();
};

/**
 * Let Android's hardware back button close a dialog instead of navigating.
 * A no-op on the website: nothing raises the event there.
 *
 * @param {() => void} onClose what back should do (usually the dialog's close)
 * @param {boolean} [open=true] whether the dialog is showing right now
 */
export default function useBackClose(onClose, open = true) {
    // Held in a ref so a new onClose each render does not re-register the
    // dialog and change its place in the stack.
    const handler = useRef(onClose);
    useEffect(() => {
        handler.current = onClose;
    });

    useEffect(() => {
        if (!open) return undefined;
        if (stack.length === 0) window.addEventListener(BACK_EVENT, onBack);
        stack.push(handler);
        return () => {
            const at = stack.lastIndexOf(handler);
            if (at !== -1) stack.splice(at, 1);
            if (stack.length === 0) window.removeEventListener(BACK_EVENT, onBack);
        };
    }, [open]);
}
