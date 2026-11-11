import { useEffect, useMemo, useRef, useState } from 'react';
import usePhaseClock from './usePhaseClock';
import useWrongBuzz from './useWrongBuzz';
import { Check, X, Lock, Zap, Sparkles, ChevronDown, Crown, LogOut } from 'lucide-react';

/**
 * The table for the brain games — Rapid Fire, Code Clash and Brain Sprint,
 * and the Group Brain quiz games (Pattern Master, Number Logic, Word Logic,
 * Deduction Detective and Spatial IQ) — which the server plays with one engine
 * (competitions/games/quizCore.js). The page around it draws the title, the
 * colleges, Resign and the result; this draws the scores, the question and
 * its clock, the answers, the reveal, and once it is over a review of every
 * question.
 *
 * Everything comes from `view`. While a question is open it carries the
 * options but not the answer, which arrives only in the reveal. The clock is
 * counted down here between polls from `phaseEndsAt`, corrected by how far
 * this device's clock is from the server's (`serverNow`), so every player
 * sees the same seconds left. A choice leaves as one onAction() call; keys
 * 1–4 or A–D answer too.
 */

const LETTERS = ['A', 'B', 'C', 'D'];
const THEMES = {
    rapidfire: { from: 'from-orange-500', to: 'to-rose-600', ring: 'ring-rose-200', text: 'text-rose-700', soft: 'bg-rose-50', bar: 'bg-rose-500' },
    codeclash: { from: 'from-slate-900', to: 'to-emerald-700', ring: 'ring-emerald-200', text: 'text-emerald-700', soft: 'bg-emerald-50', bar: 'bg-emerald-500' },
    brainsprint: { from: 'from-cyan-600', to: 'to-indigo-600', ring: 'ring-sky-200', text: 'text-sky-700', soft: 'bg-sky-50', bar: 'bg-sky-500' },
    // Group Brain.
    patternmaster: { from: 'from-fuchsia-600', to: 'to-violet-600', ring: 'ring-violet-200', text: 'text-violet-700', soft: 'bg-violet-50', bar: 'bg-violet-500' },
    numberlogic: { from: 'from-blue-600', to: 'to-cyan-600', ring: 'ring-blue-200', text: 'text-blue-700', soft: 'bg-blue-50', bar: 'bg-blue-500' },
    wordlogic: { from: 'from-emerald-600', to: 'to-teal-600', ring: 'ring-emerald-200', text: 'text-emerald-700', soft: 'bg-emerald-50', bar: 'bg-emerald-500' },
    deduction: { from: 'from-slate-800', to: 'to-indigo-700', ring: 'ring-indigo-200', text: 'text-indigo-700', soft: 'bg-indigo-50', bar: 'bg-indigo-500' },
    spatialiq: { from: 'from-amber-500', to: 'to-orange-600', ring: 'ring-amber-200', text: 'text-amber-800', soft: 'bg-amber-50', bar: 'bg-amber-500' }
};
// A picture drawn in squares (Spatial IQ): shown on light ground, not as code.
const isPicture = (t) => /[⬛⬜]/.test(t || '');
const Picture = ({ text, small }) => (
    <pre aria-label="Picture" className={`inline-block whitespace-pre font-sans leading-none ${small ? 'text-base' : 'rounded-2xl bg-slate-50 p-3 text-2xl ring-1 ring-slate-200 sm:text-3xl'}`}>{text}</pre>
);


/*
 * Pictures for the questions that have one (2026-10-29, the solo picture and memory games): a word in coloured
 * ink, dots, a clock, a grid of marks, coloured tiles, a number, a set of symbols, or a sequence shown one item
 * at a time (`elapsed`: ms since it started).
 */
const INK = { red: '#ef4444', blue: '#0ea5e9', green: '#10b981', yellow: '#f59e0b', purple: '#8b5cf6', orange: '#f97316' };
const Clock = ({ h, m }) => {
    const ha = ((h % 12) * 30 + m * 0.5) * (Math.PI / 180); const ma = m * 6 * (Math.PI / 180);
    return (
        <svg viewBox="0 0 120 120" className="h-40 w-40 sm:h-48 sm:w-48" role="img" aria-label="A clock">
            <circle cx="60" cy="60" r="56" fill="#fff" stroke="#c7d2fe" strokeWidth="4" />
            {Array.from({ length: 12 }, (_, i) => { const a = (i * Math.PI) / 6; const big = i % 3 === 0; return <line key={i} x1={60 + Math.sin(a) * (big ? 44 : 48)} y1={60 - Math.cos(a) * (big ? 44 : 48)} x2={60 + Math.sin(a) * 52} y2={60 - Math.cos(a) * 52} stroke="#334155" strokeWidth={big ? 3 : 1.5} strokeLinecap="round" />; })}
            <line x1="60" y1="60" x2={60 + Math.sin(ha) * 28} y2={60 - Math.cos(ha) * 28} stroke="#0f172a" strokeWidth="5" strokeLinecap="round" />
            <line x1="60" y1="60" x2={60 + Math.sin(ma) * 42} y2={60 - Math.cos(ma) * 42} stroke="#6366f1" strokeWidth="3" strokeLinecap="round" />
            <circle cx="60" cy="60" r="4" fill="#0f172a" />
        </svg>
    );
};
const Visual = ({ v, elapsed = 0 }) => {
    if (!v) return null;
    const box = 'flex justify-center';
    if (v.kind === 'ink') return <div className={box}><p className="text-5xl font-black tracking-wider sm:text-6xl" style={{ color: INK[v.ink] }} data-visual="ink">{v.word}</p></div>;
    if (v.kind === 'clock') return <div className={box} data-visual="clock"><Clock h={v.h} m={v.m} /></div>;
    if (v.kind === 'digits') return <div className={box}><p className="rounded-2xl bg-slate-900 px-6 py-3 font-mono text-4xl font-black tracking-[0.3em] text-white sm:text-5xl" data-visual="digits">{v.text}</p></div>;
    if (v.kind === 'symbols') return <div className={`${box} flex-wrap gap-2 text-4xl sm:text-5xl`} data-visual="symbols">{v.items.map((x, i) => <span key={i}>{x}</span>)}</div>;
    if (v.kind === 'dots' || v.kind === 'tiles') {
        const dot = v.kind === 'dots';
        return (
            <div className={box}>
                <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${v.cols}, minmax(0, 1fr))` }} data-visual={v.kind}>
                    {(dot ? v.dots : v.tiles).map((c, i) => (
                        <span key={i} className={`relative flex items-center justify-center ${dot ? 'h-7 w-7 rounded-full sm:h-8 sm:w-8' : 'h-11 w-11 rounded-lg sm:h-12 sm:w-12'}`} style={{ background: INK[c] }}>
                            {v.numbered && <span className="text-xs font-black text-white drop-shadow">{i + 1}</span>}
                        </span>
                    ))}
                </div>
            </div>
        );
    }
    if (v.kind === 'matrix') {
        return (
            <div className={box}>
                <div className="grid grid-cols-3 gap-1.5" data-visual="matrix">
                    {v.cells.map((c, i) => <span key={i} className={`flex h-16 w-16 flex-wrap content-center items-center justify-center gap-0.5 rounded-xl p-1 text-[13px] leading-none sm:h-20 sm:w-20 sm:text-base ${c ? 'bg-slate-50 ring-1 ring-slate-200' : 'bg-indigo-50 text-2xl font-black text-indigo-500 ring-2 ring-indigo-300 ring-dashed'}`}>{c || '?'}</span>)}
                </div>
            </div>
        );
    }
    if (v.kind === 'sequence') {
        const at = Math.min(v.items.length - 1, Math.floor(elapsed / v.stepMs));
        return (
            <div className="flex flex-col items-center gap-2" data-visual="sequence">
                <p key={at} className="flex h-24 min-w-24 items-center justify-center rounded-2xl bg-slate-900 px-5 text-5xl font-black text-white">{v.items[at]}</p>
                <p className="text-xs font-bold text-slate-400">{at + 1} of {v.items.length}</p>
            </div>
        );
    }
    return null;
};

export const Scoreboard = ({ view, theme, dark = false }) => {
    // Rapid Fire keeps the scores (null) to itself until the game is over.
    const secret = !view.scores;
    const leader = secret ? 0 : Math.max(...view.scores);
    return (
        <ul className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap" aria-label="Scores" data-scoreboard>
            {view.seats.map((s, i) => {
                const a = view.answers[i];
                const out = view.out.includes(i);
                const open = view.phase === 'question' || view.phase === 'answer';
                const state = out ? 'out' : open ? (a?.locked ? 'locked' : a ? 'answered' : 'thinking') : null;
                const lead = !secret && view.status === 'finished' && view.scores[i] === leader && leader > 0;
                return (
                    <li key={i} data-score-seat={i} data-state={state || undefined}
                        className={`flex min-w-0 flex-1 items-center gap-2.5 rounded-2xl border px-3 py-2 shadow-sm sm:min-w-[11rem] ${dark ? `bg-[#141845]/85 ${view.you === i ? 'border-indigo-400/70 ring-2 ring-indigo-400/40' : 'border-[#4b46b8]/50'}` : `bg-white ${view.you === i ? `border-transparent ring-2 ${theme.ring}` : 'border-slate-200'}`} ${out ? 'opacity-50' : ''}`}>
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black text-white" style={{ background: s.color }} aria-hidden="true">
                            {lead ? <Crown size={15} /> : (s.name || '?').slice(0, 1).toUpperCase()}
                        </span>
                        <span className="min-w-0 flex-1">
                            <span className={`block truncate text-sm font-bold leading-tight ${dark ? 'text-white' : 'text-slate-900'}`}>{s.name}</span>
                            <span className={`block text-[11px] font-semibold leading-tight ${dark ? 'text-[#a5a9da]' : 'text-slate-500'}`}>
                                {state === 'out' && <span className="inline-flex items-center gap-1"><LogOut size={11} aria-hidden="true" /> Left</span>}
                                {state === 'thinking' && 'Thinking…'}
                                {state === 'answered' && <span className="inline-flex items-center gap-1 text-emerald-600"><Check size={11} aria-hidden="true" /> Answered</span>}
                                {state === 'locked' && <span className="inline-flex items-center gap-1 text-rose-600"><Lock size={11} aria-hidden="true" /> Locked out</span>}
                                {!state && (secret ? (view.you === i ? 'You' : '') : `${view.you === i ? 'You · ' : ''}${view.correct[i]} right`)}
                            </span>
                        </span>
                        {!secret && <span className="text-right">
                            <span className={`block text-lg font-black tabular-nums leading-none ${dark ? 'text-white' : 'text-slate-900'}`} data-score={view.scores[i]}>{view.scores[i]}</span>
                            {a && Number.isFinite(a.points) && (view.phase === 'reveal' || view.mode === 'simultaneous') && (
                                <span className={`block text-[11px] font-black tabular-nums ${a.points > 0 ? 'text-emerald-600' : a.points < 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                                    {a.points > 0 ? `+${a.points}` : a.points}
                                </span>
                            )}
                        </span>}
                    </li>
                );
            })}
        </ul>
    );
};

const Code = ({ code, lang }) => (
    <figure className="overflow-hidden rounded-2xl bg-[#0b1220] text-left shadow-inner ring-1 ring-slate-800" data-code>
        <figcaption className="flex items-center gap-1.5 border-b border-white/5 px-4 py-2">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-400" /><span className="h-2.5 w-2.5 rounded-full bg-amber-300" /><span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
            {lang && <span className="ml-2 text-[11px] font-bold uppercase tracking-widest text-slate-400">{lang}</span>}
        </figcaption>
        <pre className="overflow-x-auto px-4 py-3 text-[13px] leading-relaxed text-slate-100 sm:text-sm"><code>{code}</code></pre>
    </figure>
);

/** One answer button, coloured by what the reveal says about it. */
const Option = ({ index, text, mark, mono, disabled, onPick, square, dark }) => {
    // In the dark room (2026-11-02) each answer is a polished slab: lit from above, lifting to the hand.
    const tone = (dark ? {
        right: 'border-emerald-400/80 bg-gradient-to-b from-emerald-500/30 to-emerald-700/15 text-emerald-100 ring-2 ring-emerald-400/50 shadow-[0_0_26px_-6px_rgba(16,185,129,.55),inset_0_1px_0_rgba(255,255,255,.2)]',
        wrong: 'border-rose-400/70 bg-gradient-to-b from-rose-500/25 to-rose-700/10 text-rose-100 ring-2 ring-rose-400/40 shadow-[0_0_22px_-6px_rgba(244,63,94,.5),inset_0_1px_0_rgba(255,255,255,.15)]',
        mine: 'border-indigo-400/80 bg-gradient-to-b from-indigo-500/30 to-indigo-700/15 text-indigo-100 ring-2 ring-indigo-400/50 shadow-[0_0_24px_-6px_rgba(99,102,241,.55),inset_0_1px_0_rgba(255,255,255,.2)]',
        dim: 'border-white/5 bg-white/[.03] text-white/40',
        open: 'border-white/10 bg-gradient-to-b from-[#2b3069] to-[#181c43] text-white shadow-[0_12px_26px_-10px_rgba(0,0,0,.9),inset_0_1px_0_rgba(255,255,255,.14),inset_0_-8px_14px_rgba(0,0,0,.35)] hover:-translate-y-0.5 hover:border-indigo-300/70 hover:shadow-[0_18px_34px_-12px_rgba(79,70,229,.6),inset_0_1px_0_rgba(255,255,255,.2)] active:translate-y-0'
    } : {
        right: 'border-emerald-400 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-300',
        wrong: 'border-rose-300 bg-rose-50 text-rose-900 ring-2 ring-rose-200',
        mine: 'border-indigo-400 bg-indigo-50 text-indigo-900 ring-2 ring-indigo-300',
        dim: 'border-slate-200 bg-white text-slate-400',
        open: 'border-slate-200 bg-white text-slate-800 hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md active:translate-y-0'
    })[mark];
    const badge = { right: 'bg-emerald-500 text-white shadow-[inset_0_1px_0_rgba(255,255,255,.45)]', wrong: 'bg-rose-500 text-white shadow-[inset_0_1px_0_rgba(255,255,255,.4)]', mine: 'bg-indigo-600 text-white shadow-[inset_0_1px_0_rgba(255,255,255,.4)]' }[mark]
        || (dark ? 'bg-gradient-to-b from-white/25 to-white/5 text-white shadow-[inset_0_1px_0_rgba(255,255,255,.35)]' : 'bg-slate-100 text-slate-600');
    return (
        <button type="button" data-option={index} data-mark={mark} disabled={disabled} onClick={() => onPick(index)}
            className={`group flex w-full rounded-2xl border font-semibold shadow-sm transition-[transform,box-shadow,border-color,background-color] duration-150 disabled:cursor-default motion-reduce:transition-none ${mark === 'wrong' ? 'gs-wrong' : ''} ${square ? 'min-h-[4.75rem] flex-col items-center justify-center gap-1.5 px-2 py-2.5 text-center text-sm sm:min-h-[5.5rem] sm:text-[15px]' : 'min-h-14 items-center gap-3 px-3 py-2.5 text-left text-sm sm:text-[15px]'} ${tone}`}>
            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-sm font-black ${badge}`} aria-hidden="true">
                {mark === 'right' ? <Check size={16} /> : mark === 'wrong' ? <X size={16} /> : LETTERS[index]}
            </span>
            {isPicture(text) ? <Picture text={text} small /> : <span className={`min-w-0 break-words ${square ? '' : 'flex-1'} ${mono ? 'font-mono text-[13px] sm:text-sm' : ''}`}>{text}</span>}
        </button>
    );
};

const Recap = ({ view, dark = false }) => {
    // Rapid Fire showed nothing during the game: its answers open at once.
    const [open, setOpen] = useState(view.mode === 'hidden');
    if (!view.recap?.length) return null;
    const mine = view.you;
    return (
        <section className={`rounded-3xl border shadow-sm ${dark ? 'border-[#4b46b8]/50 bg-[#141845]/85' : 'border-slate-200 bg-white'}`} data-recap>
            <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open}
                className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left">
                <span className={`text-base font-black ${dark ? 'text-white' : 'text-slate-900'}`}>Review the answers</span>
                <ChevronDown size={18} className={`text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
            </button>
            {open && (
                <ol className={`space-y-3 border-t px-5 py-4 ${dark ? 'border-white/10' : 'border-slate-100'}`}>
                    {view.recap.map((q, n) => {
                        const a = mine != null ? q.answers[mine] : null;
                        return (
                            <li key={n} className={`rounded-2xl p-3 ${dark ? 'bg-white/[.05]' : 'bg-slate-50'}`} data-recap-item={n}>
                                <p className={`text-[11px] font-bold uppercase tracking-wide ${dark ? 'text-[#a5a9da]' : 'text-slate-500'}`}>Q{n + 1} · {q.topic}</p>
                                <p className={`mt-0.5 font-semibold ${dark ? 'text-white' : 'text-slate-900'}`}>{q.prompt}</p>
                                {q.code && <div className="mt-2">{isPicture(q.code) ? <Picture text={q.code} small /> : <Code code={q.code} lang={q.lang} />}</div>}
                                <p className={`mt-2 text-sm ${dark ? 'text-emerald-300' : 'text-emerald-700'}`}><Check size={14} className="mr-1 inline" aria-hidden="true" />{isPicture(q.options[q.answer]) ? <Picture text={q.options[q.answer]} small /> : q.options[q.answer]}</p>
                                {mine != null && (
                                    <p className={`text-sm ${a?.correct ? (dark ? 'text-emerald-300' : 'text-emerald-700') : dark ? 'text-rose-300' : 'text-rose-700'}`}>
                                        You: {a ? (isPicture(q.options[a.choice]) ? `option ${LETTERS[a.choice]} (${a.points > 0 ? '+' : ''}${a.points})` : `${q.options[a.choice]} (${a.points > 0 ? '+' : ''}${a.points})`) : 'no answer'}
                                    </p>
                                )}
                                {q.explain && <p className={`mt-1 text-xs ${dark ? 'text-white/60' : 'text-slate-500'}`}>{q.explain}</p>}
                            </li>
                        );
                    })}
                </ol>
            )}
        </section>
    );
};

export default function QuizTable({ view, onAction, busy, recapOnly = false }) {
    const theme = THEMES[view.game] || THEMES.brainsprint;
    // The dark room (2026-11-02): the page sets view.dark for the group games with no design of their own.
    const dark = !!view.dark;
    const card = dark
        ? 'overflow-hidden rounded-3xl border border-[#4b46b8]/50 bg-[#10142f]/90 shadow-[0_24px_60px_-20px_rgba(0,0,0,.85),0_0_40px_rgba(99,102,241,.12)]'
        : 'overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm';
    const { left, share } = usePhaseClock(view);
    // The choice waiting on the server, keyed to its question: a new question starts with none picked.
    const key = `${view.number}:${view.phase}`;
    const [pickedAt, setPickedAt] = useState({ key: null, i: null });
    const picked = pickedAt.key === key ? pickedAt.i : null;
    const setPicked = (i) => setPickedAt({ key, i });
    const buzzer = view.mode === 'buzzer';
    // Rapid Fire: nothing about right or wrong until the game is over.
    const hidden = view.mode === 'hidden';
    const q = view.question;
    const reveal = view.phase === 'reveal';
    const myAnswer = view.you != null ? view.answers[view.you] : null;
    // A wrong answer buzzes as soon as this player is told (2026-11-06): at the reveal, when the pick goes red and
    // the answer green for everyone; in a buzzer game at once (that seat is locked out of the question).
    useWrongBuzz(view.status === 'active' && myAnswer?.correct === false ? view.number : null);

    const canPick = view.canAnswer && !busy && picked === null && left > 0;
    const pick = (i) => {
        if (!canPick) return;
        setPicked(i);
        onAction({ type: 'answer', choice: i }).catch(() => setPicked(null));
    };

    // 1–4 or A–D on a keyboard.
    const pickRef = useRef(pick);
    useEffect(() => { pickRef.current = pick; });
    useEffect(() => {
        const onKey = (e) => {
            if (e.metaKey || e.ctrlKey || e.altKey || /input|textarea|select/i.test(e.target?.tagName)) return;
            const k = e.key.toUpperCase();
            const i = /^[1-4]$/.test(k) ? Number(k) - 1 : LETTERS.indexOf(k);
            if (i >= 0 && q && i < q.options.length) pickRef.current(i);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [q]);

    const markOf = (i) => {
        const chosen = myAnswer && Number.isInteger(myAnswer.choice) ? myAnswer.choice : picked;
        if (view.answer) {
            if (i === view.answer.index) return 'right';
            if (i === chosen) return 'wrong';
            return 'dim';
        }
        // A wrong buzz is known at once: Rapid Fire says so to the one who buzzed.
        if (buzzer && myAnswer?.correct === false && i === chosen) return 'wrong';
        if (i === chosen) return 'mine';
        if (chosen !== null && chosen !== undefined) return 'dim';
        if (buzzer && myAnswer?.locked) return 'dim';
        return 'open';
    };

    const seconds = Math.ceil(left / 1000);
    const segments = useMemo(() => Array.from({ length: view.total || 0 }, (_, i) => i), [view.total]);

    // A finished Group Brain room shows its own standings above: here, only the answers to review.
    if (recapOnly && view.status === 'finished') return <div className="mx-auto w-full max-w-3xl"><Recap view={view} dark={dark} /></div>;
    // The question and its answers: the page's middle, or the table in the ring.
    const middle = (
        <>

            {/* Something to memorise: shown, then taken away before the question. */}
            {view.phase === 'show' && view.show && (
                <section className={card} data-show>
                    <div className={`flex items-center justify-between gap-3 bg-gradient-to-r ${theme.from} ${theme.to} px-5 py-3 text-white`}>
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/85">Question {view.number} of {view.total} · Remember this!</p>
                    </div>
                    <div className="flex min-h-52 flex-col items-center justify-center gap-4 p-6">
                        <Visual v={view.show.content} elapsed={(view.show.showMs || 0) - left} />
                    </div>
                </section>
            )}

            {view.phase === 'ready' && view.status === 'active' && (
                <section className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${theme.from} ${theme.to} p-8 text-center text-white ${dark ? 'shadow-[0_30px_60px_-20px_rgba(0,0,0,.9),0_0_50px_rgba(99,102,241,.25),inset_0_1px_0_rgba(255,255,255,.25)]' : 'shadow-lg'}`} data-ready>
                    <Sparkles size={28} className="mx-auto opacity-80" aria-hidden="true" />
                    <p className="mt-2 text-sm font-bold uppercase tracking-[0.25em] text-white/80">Get ready</p>
                    <p className="mt-1 text-7xl font-black tabular-nums" aria-live="polite">{Math.max(1, seconds)}</p>
                    <p className="mt-2 text-sm text-white/85">
                        {view.total} {view.game === 'codeclash' ? 'challenges' : view.game === 'brainsprint' ? 'puzzles' : 'questions'} · {Math.round(view.questionMs / 1000)} s each
                        {hidden ? ' · answers and scores are shown at the end' : buzzer ? ' · first right answer scores +10, a wrong one −5' : ' · right +100, wrong −20'}
                    </p>
                </section>
            )}

            {q && (
                <section className={card} data-question={view.number}>
                    <div className={`bg-gradient-to-r ${theme.from} ${theme.to} px-5 py-3 text-white`}>
                        <div className="flex items-center justify-between gap-3">
                            <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/85">
                                {buzzer && <Zap size={13} className="mr-1 inline" aria-hidden="true" />}
                                Question {view.number} of {view.total}{q.topic ? ` · ${q.topic}` : ''}
                            </p>
                            {reveal && <span className="rounded-full bg-white/20 px-2.5 py-1 text-xs font-bold">Answer</span>}
                        </div>
                        {/* Each question a segment: done, now, to come. */}
                        <div className="mt-2.5 flex gap-1" aria-hidden="true">
                            {segments.map((i) => (
                                <span key={i} className={`h-1.5 flex-1 rounded-full ${i < view.number - 1 ? 'bg-white' : i === view.number - 1 ? 'bg-white/70' : 'bg-white/25'}`} />
                            ))}
                        </div>
                    </div>
                    {view.phase === 'question' && (
                        <div className={`h-1.5 ${dark ? 'bg-white/10' : 'bg-slate-100'}`} aria-hidden="true">
                            <div className={`h-full ${share < 0.25 ? 'bg-rose-500' : theme.bar} transition-[width] duration-100 ease-linear`} style={{ width: `${share * 100}%` }} />
                        </div>
                    )}

                    <div className="space-y-4 p-4 sm:p-6">
                        <h2 className={`text-lg font-black leading-snug sm:text-xl ${dark ? 'text-white drop-shadow-[0_2px_6px_rgba(0,0,0,.6)]' : 'text-slate-900'}`} data-prompt>{q.prompt}</h2>
                        {q.code && (isPicture(q.code) ? <div className="flex justify-center"><Picture text={q.code} /></div> : <Code code={q.code} lang={q.lang} />)}
                        <Visual v={q.visual} />
                        <div className="grid gap-2.5 sm:grid-cols-2" role="group" aria-label="Answers">
                            {q.options.map((text, i) => (
                                <Option key={i} index={i} text={text} mark={markOf(i)} mono={!!q.code && q.topic === 'Predict the output'} disabled={!canPick} onPick={pick} dark={dark} />
                            ))}
                        </div>

                        {/* Only what has happened — no instructions before an answer (2026-11-05). */}
                        {view.phase === 'question' && view.you != null && (view.out.includes(view.you) || myAnswer || picked !== null) && (
                            <p className={`rounded-2xl px-4 py-2.5 text-center text-sm font-semibold ${dark ? 'bg-white/[.06] text-indigo-200 ring-1 ring-white/10' : `${theme.soft} ${theme.text}`}`} data-status>
                                {view.out.includes(view.you) ? 'You have left this game.'
                                    : buzzer && myAnswer?.correct === false ? 'Wrong — you are locked out of this one. −5'
                                    : myAnswer && Number.isFinite(myAnswer.points) && !buzzer ? (myAnswer.correct ? `Correct! +${myAnswer.points}` : `Wrong (${myAnswer.points}). Answer: ${view.answer ? (isPicture(q.options[view.answer.index]) ? `option ${LETTERS[view.answer.index]}` : q.options[view.answer.index]) : '—'}`)
                                    : myAnswer || picked !== null ? (hidden ? 'Answer saved. The next question opens soon.' : buzzer ? 'Buzzed in! Waiting for the result…' : 'Locked in. Waiting for the others…')
                                    : null}
                            </p>
                        )}
                        {reveal && view.answer && (
                            <div className={`rounded-2xl px-4 py-3 text-sm ring-1 ${dark ? 'bg-white/[.06] text-slate-200 ring-white/10' : 'bg-slate-50 text-slate-700 ring-slate-100'}`} data-explain>
                                {myAnswer && Number.isFinite(myAnswer.points) && (
                                    <p className={`mb-1 font-black ${myAnswer.correct ? (dark ? 'text-emerald-300' : 'text-emerald-700') : dark ? 'text-rose-300' : 'text-rose-700'}`}>
                                        {myAnswer.correct ? `Correct! +${myAnswer.points}` : `Not this time${myAnswer.points < 0 ? ` (${myAnswer.points})` : ''}`}
                                    </p>
                                )}
                                {view.you != null && !myAnswer && <p className={`mb-1 font-black ${dark ? 'text-white/60' : 'text-slate-500'}`}>No answer this time.</p>}
                                <p><span className={`font-bold ${dark ? 'text-white' : 'text-slate-900'}`}>Answer: {isPicture(q.options[view.answer.index]) ? `option ${LETTERS[view.answer.index]}` : q.options[view.answer.index]}.</span> {view.answer.explain}</p>
                            </div>
                        )}
                    </div>
                </section>
            )}

        </>
    );
    return (
        <div className="mx-auto w-full max-w-3xl space-y-4" data-quiz-table={view.game} data-phase={view.phase}>
            {!(view.liveBoard && view.status === 'active') && <Scoreboard view={view} theme={theme} dark={dark} />}
            {middle}
            {view.status === 'finished' && <Recap view={view} dark={dark} />}
        </div>
    );
}
