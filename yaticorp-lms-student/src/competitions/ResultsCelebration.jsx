/**
 * The results pop-up (asked 2026-10-27): the moment the results of a
 * competition I played in are published, wherever I am in the app, a pop-up
 * congratulates me — my place, the competition's name and when it was held —
 * with party poppers and my certificate shown right there (full screen if I
 * like). Once per competition (remembered in this browser). It asks every
 * 30 seconds while the app is open.
 *
 * 2026-10-31 ("when I log in it immediately shows the certificates… show it only once after the user wins"): never
 * at sign-in — the dashboard comes first, the first look is a little later — and remembered the moment it is shown,
 * not only when closed, so leaving or reloading the page doesn't bring it back. Kept on the student's account
 * (GET/POST /competitions/celebrated), so another browser or another student on this one changes nothing.
 */
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, X, ArrowRight } from 'lucide-react';
import { competitionsApi, ORDINAL, fmtDate } from './api';
import { arenaApi } from './arena/api';
import CertificateInline from './CertificateInline';
import Confetti from './Confetti';

// What I have been shown: kept on my account and in this browser too — seen in either, never shown again.
const SEEN = 'results-celebrated';
const local = () => { try { const v = JSON.parse(localStorage.getItem(SEEN) || '[]'); return Array.isArray(v) ? v : []; } catch { return []; } };
const remember = (id) => {
    try { localStorage.setItem(SEEN, JSON.stringify([...new Set([...local(), id])].slice(-500))); } catch { /* private mode */ }
    competitionsApi.markCelebrated([id]).catch(() => { /* the browser still remembers */ });
};
const RECENT_MS = 7 * 24 * 3600 * 1000;    // results older than a week are not news
const FIRST_LOOK_MS = 20000;                // after sign-in, the dashboard on its own for a while

export default function ResultsCelebration() {
    const navigate = useNavigate();
    const [items, setItems] = useState([]);
    const [seen, setSeen] = useState(null);

    const check = useCallback(() => {
        if (document.visibilityState === 'hidden') return;
        const now = Date.now();
        Promise.all([
            competitionsApi.celebrated().then((ids) => (Array.isArray(ids) ? ids : [])).catch(() => []),
            arenaApi.list().catch(() => []),
            competitionsApi.me().then((d) => d.results || []).catch(() => [])
        ]).then(([shown, arenas, results]) => {
            const mine = local();
            // Seen here but not yet on my account (before 2026-10-31, or offline then): tell the account.
            const missing = mine.filter((id) => !shown.includes(id) && /^(comp|arena)-/.test(id));
            if (missing.length) competitionsApi.markCelebrated(missing.slice(-50)).catch(() => {});
            setSeen((s) => [...new Set([...(s || []), ...shown, ...mine])]);
            setItems([
                ...arenas.filter((c) => c.state === 'results' && c.myResult?.rank != null && now - new Date(c.resultsPublishedAt).getTime() < RECENT_MS)
                    .map((c) => ({ id: `arena-${c.id}`, name: c.title, heldOn: c.startsAt, place: c.myResult.rank, score: `${c.myResult.score} points`, certificate: c.myResult.certificate, arenaId: c.id, to: `/competitions/arena/${c.id}` })),
                ...results.filter((r) => r.competition.completedAt && now - new Date(r.competition.completedAt).getTime() < RECENT_MS)
                    .map((r) => ({ id: `comp-${r.competition.id}`, name: r.competition.name, heldOn: r.competition.completedAt, place: r.place, score: `${r.score.won} of ${r.score.played} matches won`, certificate: r.certificate, competitionId: r.competition.id, to: `/competitions/${r.competition.id}` }))
            ]);
        });
    }, []);
    useEffect(() => {
        const first = setTimeout(check, FIRST_LOOK_MS);
        const t = setInterval(check, 30000);
        document.addEventListener('visibilitychange', check);
        return () => { clearTimeout(first); clearInterval(t); document.removeEventListener('visibilitychange', check); };
    }, [check]);

    const item = seen && items.find((x) => !seen.includes(x.id));
    // Shown once: counted as seen as soon as it is on the screen.
    useEffect(() => { if (item) remember(item.id); }, [item?.id]); // eslint-disable-line react-hooks/exhaustive-deps
    if (!item) return null;
    const close = () => { remember(item.id); setSeen((s) => [...s, item.id]); };
    const won = item.place && item.place <= 3;
    const file = `Certificate_${item.name.replace(/\s+/g, '_')}.pdf`;
    return (
        <div className="fixed inset-0 z-[205] flex items-center justify-center bg-slate-900/60 p-3 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="results-pop-title" data-results-celebration={item.id}>
            <Confetti pieces={won ? 110 : 60} />
            <div className="relative max-h-[94vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
                <button type="button" onClick={close} aria-label="Close" className="absolute right-3 top-3 z-10 rounded-full p-1.5 text-white/80 hover:bg-white/10"><X size={18} /></button>
                <div className="bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 px-6 pb-6 pt-7 text-center text-white">
                    <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 text-3xl" aria-hidden="true">{won ? '🏆' : '🎉'}</span>
                    <h2 id="results-pop-title" className="mt-3 text-2xl font-black leading-tight">{won ? `Congratulations, you won ${ORDINAL[item.place]} place!` : 'Congratulations — the results are out!'}</h2>
                    <p className="mt-1 text-base font-bold text-white/95">{item.name}</p>
                    <p className="text-sm text-white/80">Held on {fmtDate(item.heldOn)}{item.place ? ` · ${won ? '' : `Rank ${item.place} · `}${item.score}` : ` · ${item.score}`}</p>
                </div>
                <div className="space-y-4 p-4 sm:p-5">
                    {item.certificate && <CertificateInline load={() => (item.arenaId ? arenaApi.certificate(item.arenaId) : competitionsApi.certificate(item.competitionId))} fileName={file} />}
                    <div className="flex flex-wrap justify-center gap-2">
                        <button type="button" onClick={() => { close(); navigate(item.to); }} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-black text-white hover:bg-indigo-700"><Trophy size={16} aria-hidden="true" /> See the results <ArrowRight size={15} aria-hidden="true" /></button>
                        <button type="button" onClick={close} className="inline-flex min-h-11 items-center rounded-xl border border-slate-200 px-5 text-sm font-bold text-slate-700 hover:bg-slate-50">Close</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
