/**
 * "You climbed the leaderboard": the popup shown when the student's place
 * has gone up since they last saw the board (asked 2026-10-15: "show the
 * moving rank in animation ... like moving 11 to 7th place ... like other
 * apps"; redesigned the same day, "make it better design").
 *
 * A gradient header with the new place on a medal, then a short list that
 * plays the climb: the student's card starts at the old place, below the
 * students it has since overtaken, then rises past them while each one steps
 * down a place as it is passed, and the rank counts from the old number to
 * the new. Confetti once it lands, and a bar showing how close the next
 * student up is. At most MAX overtaken students are shown; on a longer climb
 * the card comes up from below the list.
 *
 * With reduced motion it opens on the finished list, without the travel.
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronRight, Sparkles, TrendingUp, Trophy } from 'lucide-react';
import Portal from '../Portal';
import useBackClose from '../../native/useBackClose';
import { Confetti } from './RewardCelebration';
import { Avatar } from './LeaderboardPodium';
import { num } from './format';

const MAX = 5;          // overtaken students shown, at most (fewer when the screen is short: see `fit`)
// A short screen (a small phone, a laptop window) gets a tighter header and medal.
const isShort = () => typeof window !== 'undefined' && window.innerHeight < 720;
const H = 58;           // px, one row
const RISE_MS = 1500;   // the climb
const WAIT_MS = 650;    // a beat on the old place first

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const PERIOD_WORDS = { daily: "Today's", weekly: "This week's", monthly: "This month's", all: 'All-time' };

// `was` and `flipAt`: an overtaken student's old place, swapped for the new
// one just as their row steps down, not before.
const RankRow = ({ e, rank, was, flipped, flipAt = 0, me, next, climbed, style }) => (
    <div style={style}
        className={`absolute inset-x-0 flex h-[50px] items-center gap-2.5 rounded-xl pr-3 pl-2 ${me
            ? 'z-10 bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-500/40 ring-2 ring-white'
            : 'bg-white text-slate-800 shadow-sm ring-1 ring-slate-200/70'}`}>
        <span className={`relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[13px] font-black tabular-nums ${me ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
            {was == null ? rank : (
                <>
                    <span className="absolute inset-0 flex items-center justify-center transition-opacity duration-200" style={{ opacity: flipped ? 0 : 1, transitionDelay: `${flipAt}ms` }}>{was}</span>
                    <span className="transition-opacity duration-200" style={{ opacity: flipped ? 1 : 0, transitionDelay: `${flipAt}ms` }}>{rank}</span>
                </>
            )}
        </span>
        <Avatar e={e} size="h-8 w-8" ring={me ? 'ring-2 ring-white/70' : ''} />
        <span className="flex min-w-0 flex-1 items-center gap-1.5">
            <span className={`truncate text-sm font-bold ${me ? 'text-white' : 'text-slate-800'}`}>{me ? 'You' : e.name}</span>
            {me && climbed > 0 && (
                <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-black">▲{climbed}</span>
            )}
            {next && <span className="shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-amber-700">Next</span>}
        </span>
        <span className={`shrink-0 text-[13px] font-black tabular-nums ${me ? 'text-white' : 'text-slate-500'}`}>{num(e.xp)} XP</span>
    </div>
);

export default function LeaderboardRankUp({ from, to, entries, period, onClose }) {
    const still = reducedMotion();
    // 0 on the old place, 1 climbing, 2 landed
    const [phase, setPhase] = useState(still ? 2 : 0);
    const [shownRank, setShownRank] = useState(still ? to : from);
    const boxRef = useRef(null);
    const navigate = useNavigate();
    const { pathname } = useLocation();
    useBackClose(onClose);

    const me = entries.find((e) => e.isMe);
    const ahead = entries.find((e) => e.rank === to - 1) || null;
    // The students overtaken, nearest first: now one place below the student.
    // As many overtaken students as fit on the screen with everything else
    // in view: measured before the popup is first painted, and trimmed until
    // nothing needs scrolling (at least one stays).
    const [fit, setFit] = useState(MAX);
    const [short] = useState(isShort);
    const passed = entries.filter((e) => e.rank > to && e.rank <= from).slice(0, fit);
    const k = from - to;
    const n = passed.length;
    const top = ahead ? 1 : 0;                         // slot of the student's final place
    const startOffset = (k > n ? n + 1 : n) * H;       // where the card starts: the old place, or below the list

    useLayoutEffect(() => {
        const box = boxRef.current;
        if (!box) return;
        const over = box.scrollHeight - box.clientHeight;
        if (over > 1 && fit > 1) setFit((f) => Math.max(1, f - Math.ceil(over / H)));
    }, [fit]);

    useEffect(() => {
        // The popup takes the focus, not the button: a button focused on
        // opening wore a heavy focus ring before anyone had touched it.
        boxRef.current?.focus();
        if (still) return undefined;
        const climb = setTimeout(() => setPhase(1), WAIT_MS);
        const land = setTimeout(() => setPhase(2), WAIT_MS + RISE_MS + 150);
        // the rank counts down in step with the climb
        let raf = 0;
        const t0 = performance.now() + WAIT_MS;
        const tick = (t) => {
            const p = Math.min(1, Math.max(0, (t - t0) / RISE_MS));
            const eased = 1 - (1 - p) ** 3;
            setShownRank(Math.round(from - (from - to) * eased));
            if (p < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => { clearTimeout(climb); clearTimeout(land); cancelAnimationFrame(raf); };
    }, [from, to, still]);

    useEffect(() => {
        const onKey = (ev) => { if (ev.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    // The whole board, on the Dashboard: there already, or after going there.
    const seeBoard = () => {
        onClose();
        if (pathname !== '/') navigate('/');
        let tries = 0;
        const find = () => {
            const el = document.getElementById('leaderboard');
            if (el) el.scrollIntoView({ block: 'start', behavior: still ? 'auto' : 'smooth' });
            else if (tries++ < 20) setTimeout(find, 200);
        };
        setTimeout(find, 150);
    };

    if (!me) return null;
    const moving = phase >= 1;
    const landed = phase === 2;
    const ease = 'cubic-bezier(.22,.9,.25,1)';
    const listHeight = (top + 1 + n) * H - (H - 50);
    // How close the next student up is: the student's XP against theirs.
    const gap = ahead ? Math.max(1, (ahead.xp || 0) - (me.xp || 0) + 1) : 0;
    const share = ahead && ahead.xp > 0 ? Math.min(100, Math.round(((me.xp || 0) / ahead.xp) * 100)) : 100;

    return (
        <Portal>
            <div className="fixed inset-0 z-[205] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm animate-fade-in" onClick={onClose}>
                {landed && !still && <Confetti count={60} />}
                <div ref={boxRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="rank-up-title" aria-describedby="rank-up-line"
                    className="rw-pop relative max-h-[calc(100dvh-2rem)] w-full max-w-sm overflow-y-auto overscroll-contain rounded-[28px] bg-white shadow-2xl shadow-indigo-950/30 outline-none"
                    onClick={(ev) => ev.stopPropagation()}>

                    {/* Header: the climb in words, on a gradient with soft lights. */}
                    <div className={`relative overflow-hidden bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-500 px-6 text-center text-white ${short ? 'pt-4 pb-12' : 'pt-6 pb-16'}`}>
                        <span aria-hidden="true" className="pointer-events-none absolute -top-10 -left-10 h-36 w-36 rounded-full bg-white/15 blur-2xl" />
                        <span aria-hidden="true" className="pointer-events-none absolute -right-8 top-6 h-28 w-28 rounded-full bg-amber-300/25 blur-2xl" />
                        <Sparkles aria-hidden="true" className="absolute top-5 right-6 h-4 w-4 animate-pulse text-amber-200" />
                        <Sparkles aria-hidden="true" className="absolute bottom-10 left-7 h-3 w-3 animate-pulse text-white/70" />
                        <p className="relative inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.2em] text-white/75">
                            <Trophy className="h-3.5 w-3.5" aria-hidden="true" /> {PERIOD_WORDS[period] || "This week's"} leaderboard
                        </p>
                        <h2 id="rank-up-title" className={`relative mt-1.5 leading-tight font-black tracking-tight ${short ? 'text-xl' : 'text-[1.6rem]'}`}>
                            {landed ? `You climbed to #${to}!` : 'You’re climbing!'}
                        </h2>
                        <p id="rank-up-line" className="relative mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-bold ring-1 ring-white/25">
                            <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
                            Up {k} {k === 1 ? 'place' : 'places'} · was #{from}
                        </p>
                    </div>

                    {/* The new place on a medal, half over the header. */}
                    <div className={`relative flex justify-center ${short ? '-mt-10' : '-mt-12'}`} aria-hidden="true">
                        <div key={landed ? 'landed' : 'climbing'} className={`flex items-center justify-center rounded-full bg-white p-1.5 shadow-xl shadow-indigo-500/25 ${short ? 'h-20 w-20' : 'h-24 w-24'} ${landed && !still ? 'animate-pop-in' : ''}`}>
                            <div className="flex h-full w-full flex-col items-center justify-center rounded-full bg-gradient-to-br from-amber-300 via-amber-400 to-orange-500 text-white ring-4 ring-amber-100">
                                <span className="text-[10px] font-black uppercase tracking-widest text-white/85">Rank</span>
                                <span className={`-mt-0.5 leading-none font-black tabular-nums drop-shadow-sm ${short ? 'text-2xl' : 'text-3xl'}`}>#{shownRank}</span>
                            </div>
                        </div>
                    </div>

                    <div className={`px-5 ${short ? 'pt-3 pb-4' : 'pt-4 pb-5'}`}>
                        {/* The climb, played on a short list. */}
                        <div className="rounded-2xl bg-slate-50 p-2 ring-1 ring-slate-100">
                            <div className="relative overflow-hidden" style={{ height: listHeight }} aria-hidden="true">
                                {ahead && <RankRow e={ahead} rank={ahead.rank} next style={{ top: 0 }} />}
                                {passed.map((e, i) => {
                                    // Each steps down a place as the climbing card reaches it: the lowest first.
                                    const delay = Math.round(((n - 1 - i) / Math.max(1, n)) * RISE_MS * 0.75);
                                    return (
                                        <RankRow key={e.userId} e={e} rank={e.rank} was={e.rank - 1} flipped={moving} flipAt={still ? 0 : delay + 150}
                                            style={{ top: (top + 1 + i) * H, opacity: moving ? 0.85 : 1, transform: `translateY(${moving ? 0 : -H}px)`, transition: still ? 'none' : `transform 380ms ${ease} ${delay}ms, opacity 380ms ${delay}ms` }} />
                                    );
                                })}
                                <RankRow e={me} rank={shownRank} me climbed={landed ? k : 0}
                                    style={{ top: top * H, transform: `translateY(${moving ? 0 : startOffset}px) scale(${phase === 1 ? 1.04 : 1})`, transition: still ? 'none' : `transform ${RISE_MS}ms ${ease}` }} />
                            </div>
                        </div>

                        {/* How far to the next one up. */}
                        {ahead && (
                            <div className={short ? 'mt-3' : 'mt-4'}>
                                <div className="flex items-center justify-between text-xs font-bold">
                                    <span className="text-slate-500">Next: pass {ahead.name.split(' ')[0]}</span>
                                    <span className="text-indigo-600">{num(gap)} XP to go</span>
                                </div>
                                <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-slate-100">
                                    <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500"
                                        style={{ width: `${landed ? share : 0}%`, transition: still ? 'none' : 'width 700ms cubic-bezier(.22,.9,.25,1)' }} />
                                </div>
                            </div>
                        )}

                        <button type="button" onClick={onClose}
                            className={`w-full rounded-2xl bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 text-sm font-black text-white shadow-lg shadow-violet-500/30 transition-transform hover:-translate-y-0.5 active:translate-y-0 focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 focus-visible:outline-none ${short ? 'mt-3.5 py-3' : 'mt-5 py-3.5'}`}>
                            Keep climbing
                        </button>
                        <button type="button" onClick={seeBoard}
                            className={`inline-flex w-full items-center justify-center gap-1 rounded-xl text-xs font-bold text-slate-500 transition-colors hover:text-indigo-600 focus-visible:ring-2 focus-visible:ring-indigo-300 focus-visible:outline-none ${short ? 'mt-1 py-1.5' : 'mt-2 py-2'}`}>
                            See full leaderboard <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                    </div>
                </div>
            </div>
        </Portal>
    );
}
