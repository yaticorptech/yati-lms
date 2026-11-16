/**
 * The course's audio downloading in the background, from any page (2026-11-13; audioDownloader.js does the work).
 * Runs when the app opens, again every two hours and whenever the student comes back to the tab after a while, so
 * newly opened units and new lessons come down without anyone pressing Download. When a run has finished, a note
 * says so — on the page, and as a system notification when the student has allowed them.
 */
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, X } from 'lucide-react';
import { onBackgroundAudio, startBackgroundAudio, stopBackgroundAudio } from './audioDownloader';

const EVERY = 2 * 60 * 60 * 1000;   // a run every two hours
const AGAIN = 20 * 60 * 1000;       // and on coming back to the tab after twenty minutes away

export default function BackgroundAudio() {
    const [note, setNote] = useState(null);
    useEffect(() => {
        let last = 0;
        const go = () => { last = Date.now(); startBackgroundAudio(); };
        // A moment after the app opens, so the page the student came for loads first.
        const first = setTimeout(go, 3000);
        const timer = setInterval(go, EVERY);
        const back = () => { if (document.visibilityState === 'visible' && Date.now() - last > AGAIN) go(); };
        document.addEventListener('visibilitychange', back);
        window.addEventListener('online', go);
        const off = onBackgroundAudio((e) => {
            if (e.kind !== 'done') return;
            // What came down, by section and unit (2026-11-13, "say which section, which part").
            const got = e.got || [];
            const text = got.length
                ? `Downloaded: ${got.map((g) => `${g.section} – ${g.unit}`).join('; ')}.`
                : 'Every lesson’s audio is downloaded. Lessons and stories now play instantly.';
            setNote({ text, got });
            try {
                if (document.visibilityState !== 'visible' && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
                    new Notification('Multilingo audio ready', { body: text, icon: '/assets/pwa-192.png' });
                }
            } catch { /* no system notifications here */ }
        });
        return () => { clearTimeout(first); clearInterval(timer); document.removeEventListener('visibilitychange', back); window.removeEventListener('online', go); off(); stopBackgroundAudio(); };
    }, []);
    useEffect(() => { if (!note) return undefined; const t = setTimeout(() => setNote(null), 15000); return () => clearTimeout(t); }, [note]);
    // The units grouped under their section, a few shown and the rest counted.
    const sections = [];
    for (const g of note?.got || []) {
        const s = sections.find((x) => x.section === g.section) || (sections.push({ section: g.section, units: [] }), sections.at(-1));
        s.units.push(g.unit);
    }
    if (!note) return null;
    return createPortal(
        <div role="status" aria-live="polite" className="fixed bottom-20 left-1/2 z-[95] flex w-[min(26rem,calc(100vw-1.5rem))] -translate-x-1/2 items-start gap-3 rounded-2xl bg-white p-4 shadow-2xl ring-1 ring-slate-200 sm:bottom-6" data-background-audio-done>
            <CheckCircle2 size={22} className="mt-0.5 shrink-0 text-emerald-500" />
            <div className="min-w-0 flex-1">
                <p className="text-sm font-extrabold text-slate-800">Audio downloaded</p>
                {sections.length ? (
                    <div className="mt-1 max-h-48 space-y-1.5 overflow-y-auto pr-1" data-audio-done-list>
                        {sections.map((s) => (
                            <div key={s.section}>
                                <p className="text-xs font-extrabold uppercase tracking-wide text-slate-500">{s.section}</p>
                                <ul className="mt-0.5 space-y-0.5">
                                    {s.units.map((u) => <li key={u} className="flex items-start gap-1.5 text-sm text-slate-700"><span className="text-emerald-500">✓</span><span className="min-w-0">{u}</span></li>)}
                                </ul>
                            </div>
                        ))}
                        <p className="text-xs text-slate-500">These now play instantly, even offline.</p>
                    </div>
                ) : <p className="mt-0.5 text-sm text-slate-600">{note.text}</p>}
            </div>
            <button type="button" onClick={() => setNote(null)} aria-label="Close" className="shrink-0 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X size={18} /></button>
        </div>,
        document.body
    );
}
