/**
 * "Download App" — installs the website on the student's device (the PWA).
 *
 * Where the browser offers an install prompt (Chrome and Edge, notably on
 * Android), one tap opens it. Where it does not (iPhone and iPad, or a
 * dismissed prompt), the tap opens a short how-to instead. The button renders
 * nothing inside the native app and nothing once the app is already running
 * installed, so only students who can still install it ever see it.
 */
import { useEffect, useId, useState } from 'react';
import { Download, Share, SquarePlus, MoreVertical, X } from 'lucide-react';
import Portal from './Portal';
import useBackClose from '../native/useBackClose';
import { isNative } from '../native/platform';

// Chrome announces installability once, early — often before React mounts —
// so the event is caught at module load and kept until the button needs it.
let installPrompt = null;
let appInstalled = false;
const watchers = new Set();
const announce = () => watchers.forEach((fn) => fn());
if (typeof window !== 'undefined') {
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        installPrompt = e;
        announce();
    });
    window.addEventListener('appinstalled', () => {
        installPrompt = null;
        appInstalled = true;
        announce();
    });
}

/** Already running as the installed app (home-screen icon), not in a browser tab. */
const isStandalone = () =>
    window.matchMedia?.('(display-mode: standalone)')?.matches === true
    || window.navigator.standalone === true;

/** iPhones and iPads (iPadOS reports itself as a Mac, but a Mac has no touch). */
const isIOS = () =>
    /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

function InstallHelpDialog({ onClose }) {
    const titleId = useId();
    useBackClose(onClose);
    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') { e.preventDefault(); onClose(); } };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
        // Once per opening, like ConfirmDialog: a new onClose each render is the same dialog.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const steps = isIOS()
        ? [
            { icon: Share, text: 'Tap the Share button in your browser' },
            { icon: SquarePlus, text: 'Choose "Add to Home Screen"' },
            { icon: Download, text: 'Tap "Add" — the app appears on your home screen' },
        ]
        : [
            { icon: MoreVertical, text: 'Open your browser’s menu' },
            { icon: Download, text: 'Choose "Install app" or "Add to Home screen"' },
        ];

    return (
        <Portal>
            <div className="fixed inset-0 z-[170] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm"
                onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
                <div role="dialog" aria-modal="true" aria-labelledby={titleId}
                    className="relative w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl animate-fade-in-up">
                    <button type="button" onClick={onClose} aria-label="Close"
                        className="absolute right-3 top-3 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600">
                        <X size={16} aria-hidden="true" />
                    </button>
                    <div className="p-6">
                        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-100">
                            <Download size={24} aria-hidden="true" className="text-indigo-600" />
                        </div>
                        <h2 id={titleId} className="mb-1 text-center text-lg font-bold text-slate-800">Download App</h2>
                        <p className="mb-4 text-center text-sm leading-relaxed text-slate-500">
                            Add YATI LMS to your home screen to use it like an app.
                        </p>
                        <ol className="space-y-3">
                            {steps.map(({ icon: Icon, text }, i) => (
                                <li key={i} className="flex items-center gap-3 text-sm text-slate-700">
                                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-xs font-bold text-indigo-600">
                                        {i + 1}
                                    </span>
                                    <Icon size={18} aria-hidden="true" className="shrink-0 text-indigo-500" />
                                    <span>{text}</span>
                                </li>
                            ))}
                        </ol>
                    </div>
                    <div className="px-6 pb-6">
                        <button type="button" autoFocus onClick={onClose}
                            className="w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-bold text-white transition-colors hover:bg-indigo-700">
                            Got it
                        </button>
                    </div>
                </div>
            </div>
        </Portal>
    );
}

export default function InstallAppButton({ className, iconSize = 18 }) {
    // Re-render when the browser's install prompt arrives, is spent, or the
    // install completes; the values themselves live at module level above.
    const [, setTick] = useState(0);
    const [showHelp, setShowHelp] = useState(false);

    useEffect(() => {
        const fn = () => setTick((t) => t + 1);
        watchers.add(fn);
        return () => watchers.delete(fn);
    }, []);

    if (isNative() || appInstalled || isStandalone()) return null;

    const install = async () => {
        const prompt = installPrompt;
        if (!prompt) { setShowHelp(true); return; }
        try {
            await prompt.prompt();
            const { outcome } = await prompt.userChoice;
            // Spent either way; after a dismissal Chrome fires a fresh
            // beforeinstallprompt on a later visit.
            installPrompt = null;
            if (outcome === 'accepted') appInstalled = true;
            announce();
        } catch {
            setShowHelp(true);
        }
    };

    return (
        <>
            <button
                type="button"
                onClick={install}
                className={className || 'flex items-center justify-center space-x-2 bg-indigo-50 border border-indigo-100 text-indigo-600 hover:bg-indigo-600 hover:text-white w-full py-2.5 rounded-lg transition-all duration-200 font-medium'}
            >
                <Download size={iconSize} aria-hidden="true" /> <span>Download App</span>
            </button>
            {showHelp && <InstallHelpDialog onClose={() => setShowHelp(false)} />}
        </>
    );
}
