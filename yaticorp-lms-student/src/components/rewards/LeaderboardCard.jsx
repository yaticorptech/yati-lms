/**
 * The leaderboard card: a podium for the top three, then everyone else
 * ranked (up to ALL), scrolling inside the card, with the student's own row
 * highlighted and scrolled into view, and the rows around the student added
 * below when they are further down than that. Only students with XP in the
 * period are on it. There is no "View Full Leaderboard" button any more: the
 * card shows the whole board. No ↑/↓ marks on the rows: a climb is told by
 * the popup instead (RankUpWatcher, on whatever page the student is on). All
 * asked 2026-10-15.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Trophy } from 'lucide-react';
import api from '../../utils/api';
import { num } from './format';
import LeaderboardCelebration from './LeaderboardCelebration';
import LeaderboardPodium, { Avatar } from './LeaderboardPodium';
import Dropdown from '../Dropdown';
import useLive from '../../live/useLive';

const PERIODS = [['daily', 'Today'], ['weekly', 'This Week'], ['monthly', 'This Month'], ['all', 'All Time']];
// How many students the card asks for: the server's own most.
const ALL = 500;

export default function LeaderboardCard() {
    const [period, setPeriod] = useState('weekly');
    const [tick, setTick] = useState(0);
    const query = period;
    const [result, setResult] = useState({ query: null, board: null, error: null });

    useEffect(() => {
        const bump = () => setTick((t) => t + 1);
        window.addEventListener('yati:progress-changed', bump);
        return () => window.removeEventListener('yati:progress-changed', bump);
    }, []);
    // Anyone's XP moving the standings: drawn again live.
    useLive('leaderboard', useCallback(() => setTick((t) => t + 1), []));
    useEffect(() => {
        let cancelled = false;
        api.get('/rewards/leaderboard', { params: { period, scope: 'global', limit: ALL } })
            .then((r) => { if (!cancelled) setResult({ query, board: r.data, error: null }); })
            .catch((e) => !cancelled && setResult({ query, board: null, error: e.response?.data?.message || 'Could not load the leaderboard' }));
        return () => { cancelled = true; };
    }, [period, query, tick]);

    const board = result.query === query ? result.board : null;
    const error = result.query === query ? result.error : null;
    const podium = useMemo(() => board ? board.entries.slice(0, 3) : [], [board]);

    // The winner's arrival is celebrated once per winner per session: the
    // key remembers who was on top for this period, and a change
    // of winner (or a first look) sets the confetti off.
    const winner = podium[0] || null;
    const [celebrating, setCelebrating] = useState(null);
    useEffect(() => {
        if (!winner) return;
        const key = `lb-celebrated:${period}:${winner.userId}`;
        let seen = false;
        try { seen = sessionStorage.getItem(key) === '1'; } catch { /* storage unavailable */ }
        if (seen) return;
        const t = setTimeout(() => {
            try { sessionStorage.setItem(key, '1'); } catch { /* storage unavailable */ }
            setCelebrating({ name: winner.name, isMe: !!winner.isMe });
        }, 350);
        return () => clearTimeout(t);
    }, [winner, period]);
    const stopCelebrating = useCallback(() => setCelebrating(null), []);
    const rest = useMemo(() => board ? board.entries.slice(3) : [], [board]);
    const me = board?.me;
    const meListed = board ? board.entries.some((e) => e.isMe) : true;
    /* The rows under the podium, worked out once and then rendered twice —
       as a table on a wide screen, as a stacked list on a phone. A `gap` entry
       is the "· · ·" that stands for the ranks not shown. */
    const listRows = useMemo(() => {
        if (!board) return [];
        const rows = rest.map((e) => ({ key: e.userId, e }));
        if (board.around.length > 0) rows.push({ key: 'gap', gap: true }, ...board.around.map((e) => ({ key: e.userId, e })));
        else if (!meListed && me?.rank) rows.push({ key: 'gap', gap: true }, { key: 'me', e: me });
        return rows;
    }, [board, rest, meListed, me]);

    // The student's own row, brought into view inside the list (never the
    // page) whenever the board arrives: on a long board it was out of sight.
    const stackRef = useRef(null);
    const tableRef = useRef(null);
    useEffect(() => {
        const id = requestAnimationFrame(() => {
            for (const box of [stackRef.current, tableRef.current]) {
                const row = box?.querySelector('[data-me]');
                if (!row || !box.getClientRects().length) continue;
                const at = row.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop;
                box.scrollTop = Math.max(0, at - (box.clientHeight - row.offsetHeight) / 2);
            }
        });
        return () => cancelAnimationFrame(id);
    }, [listRows]);

    return (
        <section id="leaderboard" className="relative flex flex-col rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            {celebrating && <LeaderboardCelebration onDone={stopCelebrating} />}
            {/* On a narrow phone the title and the period picker do not fit on
                one line: the heading was pushed off the card and took the rest
                of the page sideways with it. The picker drops to its own line
                instead, and the text is allowed to wrap rather than insist on
                its full width. */}
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                {/* A base width, not just flex-1: with a basis of zero the text
                    would shrink to nothing beside the picker instead of pushing
                    it onto the next line, and the heading would still be cut. */}
                <div className="min-w-0 flex-1 basis-48">
                    <h2 className="flex items-center gap-2.5 text-xl font-black text-slate-900"><Trophy size={22} className="shrink-0 text-amber-500" /> Leaderboard</h2>
                    {/* Not on a phone (asked 2026-10-15): the heading says it. */}
                    <p className="hidden text-sm text-slate-500 sidebar:block">Compete with learners and climb the ranks</p>
                </div>
                <div className="relative shrink-0">
                    <Dropdown
                        label="Period" accent="indigo" placement="panel"
                        value={period}
                        options={PERIODS.map(([v, l]) => ({ value: v, label: l }))}
                        onChange={setPeriod}
                        className="relative rounded-xl border border-slate-200 bg-white py-2 pl-3 pr-8 text-sm font-semibold text-slate-700 focus:border-indigo-400 focus:outline-none"
                        panelClassName="left-auto right-0 w-40"
                    />
                </div>
            </div>

            {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">{error}</div>}
            {!board && !error && <div className="grid gap-3 sm:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-48 rounded-2xl" />)}</div>}

            {board && board.entries.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center">
                    <span className="text-4xl" aria-hidden="true">🏁</span>
                    <p className="mt-2 font-bold text-slate-800">Nobody has earned XP in this period yet</p>
                    <p className="text-sm text-slate-500">Complete a lesson and you'll be first.</p>
                </div>
            )}

            {board && podium.length > 0 && (
                <LeaderboardPodium podium={podium} />
            )}

            {board && listRows.length > 0 && (
                // One card, a fixed height, scrolling inside: as the class
                // grows the list scrolls, and the card never gets taller.
                // The cap is exactly three rows — what a class of six shows
                // below the podium — so a seventh student does not move the
                // card by a single pixel: the table's 36px header and three
                // 57px rows (207px), or three 68px stacked rows (204px).
                <div data-ranks className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                    {/* On a phone the rows are stacked. Elsewhere a table that
                        fits its card, never scrolling sideways (asked
                        2026-10-15): it used to need 520px, and on a wide
                        screen, where the card shares the row with another,
                        it had about 470. No badges on the leaderboard (asked
                        2026-10-15). Streak goes when the card is narrow (the
                        card's own width, @container), Level when narrower. */}
                    <ul ref={stackRef} className="scroll-fade max-h-[204px] divide-y divide-slate-100 overflow-y-auto overflow-x-hidden px-3 sm:hidden">
                        {listRows.map(({ key, e, gap }) => (gap
                            ? <li key={key} className="py-1 text-center text-[11px] font-bold text-slate-400">· · ·</li>
                            : <StackedRow key={key} e={e} />))}
                    </ul>
                    <div ref={tableRef} className="scroll-fade @container hidden max-h-[207px] overflow-y-auto overflow-x-hidden sm:block">
                        <table className="w-full table-fixed text-left text-sm">
                            {/* The column names stay put while the rows scroll. */}
                            <thead className="sticky top-0 z-10 bg-white">
                                <tr className="text-xs font-semibold text-slate-500 [&>th]:pt-3">
                                    <th className="w-14 px-2 pb-2 font-semibold">Rank</th>
                                    <th className="px-2 pb-2 font-semibold">Learner</th>
                                    <th className="hidden w-16 px-2 pb-2 font-semibold @sm:table-cell">Level</th>
                                    <th className="w-24 px-2 pb-2 text-right font-semibold">XP</th>
                                    <th className="hidden w-24 px-2 pb-2 font-semibold @md:table-cell">Streak</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {listRows.map(({ key, e, gap }) => (gap
                                    ? <tr key={key}><td colSpan="5" className="py-1 text-center text-[11px] font-bold text-slate-400">· · ·</td></tr>
                                    : <Row key={key} e={e} />))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}


        </section>
    );
}

/**
 * The same standing as a table row, stacked for a phone: rank and face on the
 * left, name above the details that would have been their own
 * columns, XP on the right.
 *
 * The student's own row is highlighted, on a phone and on a desktop (asked
 * 2026-10-15, which replaces the account owner's 2026-10-02 call to leave it
 * untinted): a soft indigo tint with a bar down its left edge, "You" for the
 * name, the ringed photo. The tint and bar take no space, so the row is the
 * same height as the others and the list's fixed height still holds.
 */
const StackedRow = ({ e }) => (
    // A fixed 68px: three rows are exactly the list's 204px, so a fourth
    // student scrolls inside instead of nudging the card taller.
    <li data-me={e.isMe ? '' : undefined} className={`flex h-[68px] items-center gap-3 ${e.isMe ? '-mx-3 bg-indigo-50 px-3 shadow-[inset_4px_0_0_#6366f1]' : ''}`}>
        <span className={`w-5 shrink-0 text-center font-bold tabular-nums ${e.isMe ? 'text-indigo-700' : 'text-slate-700'}`}>{e.rank}</span>
        <Avatar e={e} size="h-9 w-9" ring={e.isMe ? 'ring-2 ring-indigo-400' : ''} />
        <div className="min-w-0 flex-1">
            <p className="flex min-w-0 items-center gap-1.5">
                <span className={`truncate ${e.isMe ? 'font-black text-indigo-900' : 'font-semibold text-slate-800'}`}>{e.isMe ? 'You' : e.name}</span>
            </p>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-500">
                <span className={`rounded px-1.5 font-bold text-indigo-700 ${e.isMe ? 'bg-white' : 'bg-indigo-50'}`}>Lv. {e.level}</span>
                <span className="whitespace-nowrap">🔥 {e.streak} {e.streak === 1 ? 'day' : 'days'}</span>
            </p>
        </div>
        <span className={`shrink-0 whitespace-nowrap text-right font-bold tabular-nums ${e.isMe ? 'text-indigo-900' : 'text-slate-800'}`}>{num(e.xp)} XP</span>
    </li>
);

const Row = ({ e }) => (
    <tr data-me={e.isMe ? '' : undefined} className={e.isMe ? 'bg-indigo-50' : ''}>
        <td className={`px-2 py-3 font-bold tabular-nums ${e.isMe ? 'text-indigo-700 shadow-[inset_4px_0_0_#6366f1]' : 'text-slate-700'}`}>{e.rank}</td>
        <td className="px-2 py-3">
            <div className="flex min-w-0 items-center gap-2">
                <Avatar e={e} size="h-8 w-8" ring={e.isMe ? 'ring-2 ring-indigo-400' : ''} />
                <span className={`min-w-0 truncate ${e.isMe ? 'font-black text-indigo-900' : 'font-semibold text-slate-800'}`}>{e.isMe ? 'You' : e.name}</span>
            </div>
        </td>
        <td className="hidden px-2 py-3 whitespace-nowrap @sm:table-cell"><span className={`rounded-lg px-2 py-0.5 text-xs font-bold text-indigo-700 ${e.isMe ? 'bg-white' : 'bg-indigo-50'}`}>Lv. {e.level}</span></td>
        <td className={`px-2 py-3 whitespace-nowrap text-right font-bold tabular-nums ${e.isMe ? 'text-indigo-900' : 'text-slate-800'}`}>{num(e.xp)} XP</td>
        <td className="hidden px-2 py-3 whitespace-nowrap text-slate-700 @md:table-cell">🔥 {e.streak} days</td>
    </tr>
);
