/**
 * What every popup in the panel owes a keyboard and a screen reader, in one
 * place: it is announced as a dialog and by its title, focus moves into it
 * when it opens, Tab stays inside it, Escape closes it, and focus goes back to
 * whatever opened it when it closes.
 *
 *   const { dialogProps, titleId } = useDialog(onClose);
 *   <div {...dialogProps} className="fixed inset-0 …">
 *     <h2 id={titleId}>…</h2>
 *
 * Spread `dialogProps` on the element that holds the whole popup (the
 * overlay, as the panel's popups already carry role="dialog" there). Mark the
 * element that should take focus first with `data-autofocus`; otherwise it is
 * an input that asked for autoFocus, else the first control in the popup.
 *
 * Popups open on top of popups here (Students → Assign → confirm), so only
 * the topmost one answers Escape and keeps Tab: the one underneath waits.
 * `onClose` may decline — pass a function that does nothing while a request
 * is being sent, and Escape will not close the popup mid-request.
 */
import { useEffect, useId, useRef, useState } from 'react';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// The open popups, oldest first. Only the last one handles keys.
const stack = [];

const focusables = (node) => Array.from(node.querySelectorAll(FOCUSABLE))
    .filter((el) => el.offsetParent !== null || el === document.activeElement);

const useDialog = (onClose) => {
    const ref = useRef(null);
    const titleId = useId();
    // Whatever had focus before the popup rendered: the button that opened it.
    const [trigger] = useState(() => (typeof document === 'undefined' ? null : document.activeElement));
    const closeRef = useRef(onClose);
    useEffect(() => { closeRef.current = onClose; });

    useEffect(() => {
        const node = ref.current;
        if (!node) return undefined;
        stack.push(node);

        if (!node.contains(document.activeElement)) {
            const first = node.querySelector('[data-autofocus]') || focusables(node)[0] || node;
            first.focus({ preventScroll: true });
        }

        const onKey = (e) => {
            if (stack[stack.length - 1] !== node || e.defaultPrevented) return;
            if (e.key === 'Escape') {
                e.preventDefault();
                closeRef.current?.();
                return;
            }
            if (e.key !== 'Tab') return;
            const items = focusables(node);
            if (!items.length) { e.preventDefault(); node.focus(); return; }
            const first = items[0];
            const last = items[items.length - 1];
            if (e.shiftKey && (document.activeElement === first || !node.contains(document.activeElement))) {
                e.preventDefault(); last.focus();
            } else if (!e.shiftKey && (document.activeElement === last || !node.contains(document.activeElement))) {
                e.preventDefault(); first.focus();
            }
        };
        document.addEventListener('keydown', onKey);

        return () => {
            document.removeEventListener('keydown', onKey);
            const at = stack.lastIndexOf(node);
            if (at !== -1) stack.splice(at, 1);
            // Back to the button that opened it, if it is still on the page.
            if (trigger && trigger.isConnected && typeof trigger.focus === 'function') trigger.focus({ preventScroll: true });
        };
    }, [trigger]);

    return {
        ref,
        titleId,
        dialogProps: { ref, role: 'dialog', 'aria-modal': true, 'aria-labelledby': titleId, tabIndex: -1 }
    };
};

export default useDialog;
