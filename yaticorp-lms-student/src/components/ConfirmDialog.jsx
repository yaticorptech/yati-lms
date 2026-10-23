/**
 * "Are you sure?" drawn by the app, in place of the browser's window.confirm().
 *
 * The browser's box is grey, says the site's address where the question should
 * be, cannot be styled to say which button deletes something, and inside the
 * Android app it is the web view's own plain dialog. This is the same question
 * as a real dialog: named by its title, Escape and Android's back button
 * answer "no", and the focus starts on the safe answer when the action cannot
 * be undone.
 *
 * Usually reached through useConfirmDialog, which hands back a promise the way
 * window.confirm hands back a boolean.
 */
import { useEffect, useId, useRef } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import Portal from './Portal';
import useBackClose from '../native/useBackClose';

export default function ConfirmDialog({
    title = 'Are you sure?', message = '', confirmLabel = 'Confirm', cancelLabel = 'Cancel',
    destructive = false, onConfirm, onCancel
}) {
    const titleId = useId();
    const messageId = useId();
    const cancelRef = useRef(null);
    const confirmRef = useRef(null);

    useBackClose(onCancel);
    useEffect(() => {
        // Back to wherever the student was when it closes (the delete button).
        const before = document.activeElement;
        (destructive ? cancelRef : confirmRef).current?.focus();
        const onKey = (e) => { if (e.key === 'Escape') { e.preventDefault(); onCancel(); } };
        window.addEventListener('keydown', onKey);
        return () => {
            window.removeEventListener('keydown', onKey);
            if (before?.isConnected) before.focus?.({ preventScroll: true });
        };
        // Once per opening: a new onCancel each render must not move the focus again.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <Portal>
            <div className="fixed inset-0 z-[170] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm"
                onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
                <div role="alertdialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={message ? messageId : undefined}
                    className="relative w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl animate-fade-in-up">
                    <button type="button" onClick={onCancel} aria-label="Close"
                        className="absolute right-3 top-3 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600">
                        <X size={16} aria-hidden="true" />
                    </button>
                    <div className="p-6 text-center">
                        <div className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full ${destructive ? 'bg-rose-100' : 'bg-indigo-100'}`}>
                            <AlertTriangle size={24} aria-hidden="true" className={destructive ? 'text-rose-500' : 'text-indigo-600'} />
                        </div>
                        <h2 id={titleId} className="mb-1 text-lg font-bold text-slate-800">{title}</h2>
                        {message && <p id={messageId} className="whitespace-pre-line text-sm leading-relaxed text-slate-500">{message}</p>}
                    </div>
                    <div className="flex gap-3 px-6 pb-6">
                        <button ref={cancelRef} type="button" onClick={onCancel}
                            className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50">
                            {cancelLabel}
                        </button>
                        <button ref={confirmRef} type="button" onClick={onConfirm}
                            className={`flex-1 rounded-xl py-2.5 text-sm font-bold text-white transition-colors ${destructive ? 'bg-rose-500 hover:bg-rose-600' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
                            {confirmLabel}
                        </button>
                    </div>
                </div>
            </div>
        </Portal>
    );
}
