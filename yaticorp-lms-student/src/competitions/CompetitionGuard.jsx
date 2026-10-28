/**
 * While a competition is on for me (a competition match, a Quiz Arena) —
 * asked 2026-10-27:
 *
 *   - no copying: copy, cut, select-all, the context menu and selecting text
 *     are blocked, with a warning;
 *   - no screenshots, as far as a web page can stop them: Print Screen (the
 *     clipboard is wiped), print, save, and the browser's screenshot keys
 *     warn; and when the window loses focus (a snipping tool, another app)
 *     the questions are covered until the student comes back. An operating
 *     system's own screenshot cannot be blocked by a page — this deters, it
 *     cannot prevent;
 *   - no leaving: the browser's back, any link in the app and closing the
 *     tab are stopped with "You can't leave until the competition is over".
 *
 * Off as soon as `active` is false (finished, or not playing).
 */
import { useEffect, useState } from 'react';
import { ShieldAlert, Lock } from 'lucide-react';

const SHOT_KEYS = (e) => e.key === 'PrintScreen'
    || ((e.metaKey || e.ctrlKey) && ['p', 's', 'c', 'x', 'a', 'u'].includes(e.key.toLowerCase()))
    || (e.metaKey && e.shiftKey && ['3', '4', '5', 's'].includes(e.key.toLowerCase()))
    || (e.key.toLowerCase() === 's' && e.shiftKey && (e.metaKey || e.ctrlKey))
    || e.key === 'F12';

export default function CompetitionGuard({ active }) {
    const [warning, setWarning] = useState(null);
    const [away, setAway] = useState(false);
    const [leaving, setLeaving] = useState(false);

    useEffect(() => {
        if (!active) return undefined;
        const warn = (text) => setWarning({ text, at: Date.now() });
        const stopCopy = (e) => {
            // Typing in a field (a joining code) is fine; the page's words are not to be copied.
            if (e.type === 'selectstart' && /input|textarea/i.test(e.target?.tagName)) return;
            e.preventDefault();
            if (e.type !== 'selectstart') warn(e.type === 'contextmenu' ? 'Right-click is turned off during the competition.' : 'Copying is not allowed during the competition.');
        };
        const onKey = (e) => {
            if (!SHOT_KEYS(e)) return;
            if (/input|textarea/i.test(e.target?.tagName) && (e.metaKey || e.ctrlKey) && ['a', 'c', 'x'].includes(e.key.toLowerCase())) return;
            e.preventDefault();
            if (e.key === 'PrintScreen') navigator.clipboard?.writeText('').catch(() => {});
            warn(e.key === 'PrintScreen' || e.shiftKey ? 'Screenshots are not allowed during the competition.' : 'That is turned off during the competition.');
        };
        const onBlur = () => setAway(true);
        const onFocus = () => setAway(false);
        const onVisible = () => { if (document.visibilityState === 'hidden') setAway(true); };
        const onUnload = (e) => { e.preventDefault(); e.returnValue = ''; };
        window.history.pushState({ competitionGuard: true }, '');
        const onPop = () => { window.history.pushState({ competitionGuard: true }, ''); setLeaving(true); };
        const onClick = (e) => {
            const a = e.target?.closest?.('a[href]');
            if (!a || a.target === '_blank') return;
            const url = new URL(a.href, window.location.href);
            if (url.origin === window.location.origin && url.pathname === window.location.pathname) return;
            e.preventDefault(); e.stopPropagation();
            setLeaving(true);
        };
        const before = document.body.style.userSelect;
        document.body.style.userSelect = 'none';
        document.body.style.webkitUserSelect = 'none';
        ['copy', 'cut', 'contextmenu', 'selectstart', 'dragstart'].forEach((t) => document.addEventListener(t, stopCopy));
        window.addEventListener('keydown', onKey, true);
        window.addEventListener('keyup', onKey, true);
        window.addEventListener('blur', onBlur);
        window.addEventListener('focus', onFocus);
        document.addEventListener('visibilitychange', onVisible);
        window.addEventListener('beforeunload', onUnload);
        window.addEventListener('popstate', onPop);
        document.addEventListener('click', onClick, true);
        return () => {
            document.body.style.userSelect = before;
            document.body.style.webkitUserSelect = before;
            ['copy', 'cut', 'contextmenu', 'selectstart', 'dragstart'].forEach((t) => document.removeEventListener(t, stopCopy));
            window.removeEventListener('keydown', onKey, true);
            window.removeEventListener('keyup', onKey, true);
            window.removeEventListener('blur', onBlur);
            window.removeEventListener('focus', onFocus);
            document.removeEventListener('visibilitychange', onVisible);
            window.removeEventListener('beforeunload', onUnload);
            window.removeEventListener('popstate', onPop);
            document.removeEventListener('click', onClick, true);
        };
    }, [active]);
    useEffect(() => { if (!warning) return undefined; const t = setTimeout(() => setWarning(null), 3000); return () => clearTimeout(t); }, [warning]);

    if (!active) return null;
    return (
        <>
            {warning && (
                <div className="fixed inset-x-0 top-4 z-[260] flex justify-center px-4" role="alert" data-guard-warning>
                    <p className="inline-flex items-center gap-2 rounded-2xl bg-rose-600 px-4 py-3 text-sm font-black text-white shadow-xl"><ShieldAlert size={18} aria-hidden="true" /> {warning.text}</p>
                </div>
            )}
            {away && !leaving && (
                <div className="fixed inset-0 z-[250] flex items-center justify-center bg-slate-900/95 p-6 text-center text-white backdrop-blur-xl" onClick={() => setAway(false)} data-guard-away>
                    <div>
                        <ShieldAlert size={40} className="mx-auto text-amber-400" aria-hidden="true" />
                        <p className="mt-3 text-lg font-black">The competition is hidden while you are away</p>
                        <p className="mt-1 text-sm text-white/75">Screenshots and switching windows are not allowed. Click here to go back to it.</p>
                    </div>
                </div>
            )}
            {leaving && (
                <div className="fixed inset-0 z-[270] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm" role="alertdialog" aria-modal="true" aria-labelledby="guard-leave-title" data-guard-leave>
                    <div className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl">
                        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-600"><Lock size={22} aria-hidden="true" /></span>
                        <h2 id="guard-leave-title" className="mt-3 text-xl font-black text-slate-900">You can&apos;t leave this page</h2>
                        <p className="mt-1 text-sm text-slate-600">The competition is still on. Stay here until you complete it.</p>
                        <button type="button" onClick={() => setLeaving(false)} className="mt-5 w-full rounded-full bg-indigo-600 py-2.5 text-sm font-black text-white hover:bg-indigo-700" data-guard-stay>Back to the competition</button>
                    </div>
                </div>
            )}
        </>
    );
}
