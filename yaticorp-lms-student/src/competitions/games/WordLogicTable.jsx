/**
 * Word Logic's own table (2026-11-02, the account owner's design): a night-blue stage, "Word Logic" in gold between an
 * A and a Z tile, the time left in a neon frame, every player in a glowing card with their picture, and the question
 * in a gold-lit panel — an anagram's letters as gold tiles, the answers as pills, the chosen one in gold. The rules
 * and the moves are QuizTable's (quizCore on the server); a finished game shows QuizTable's review.
 */
import { useEffect, useRef, useState } from 'react';
import { Check, X } from 'lucide-react';
import usePhaseClock from './usePhaseClock';
import QuizTable from './QuizTable';

const LETTERS = ['A', 'B', 'C', 'D'];
const GOLD = 'linear-gradient(180deg,#fde8a6 0%,#f4c95d 45%,#d99a2b 100%)';
const TITLE = '"Georgia","Times New Roman",serif';

/** A gold letter tile (the title's A and Z, and an anagram's letters). */
const Tile = ({ ch, size = 64, tilt = 0, className = '' }) => (
    <span className={`inline-flex shrink-0 items-center justify-center rounded-[18%] font-black text-[#3b1f0a] ${className}`} aria-hidden="true"
        style={{ width: size, height: size, fontSize: size * 0.56, transform: `rotate(${tilt}deg)`, background: GOLD, boxShadow: `inset 0 2px 0 rgba(255,255,255,.65), inset 0 -${size * 0.07}px 0 rgba(140,80,10,.45), 0 ${size * 0.1}px ${size * 0.22}px rgba(0,0,0,.55)` }}>
        {ch}
    </span>
);

const Face = ({ src, name }) => {
    const [broken, setBroken] = useState(false);
    return src && !broken
        ? <img src={src} alt="" onError={() => setBroken(true)} className="h-full w-full rounded-full object-cover" />
        : <span className="flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-violet-600 text-sm font-black text-white sm:text-xl">{(name || '?').slice(0, 1).toUpperCase()}</span>;
};

function Live({ view, onAction, busy }) {
    const { left, share } = usePhaseClock(view);
    // The choice waiting on the server, for this question only.
    const [pickedAt, setPickedAt] = useState({ key: '', i: null });
    const q = view.question;
    const reveal = view.phase === 'reveal';
    const myAnswer = view.you != null ? view.answers[view.you] : null;
    const key = `${view.number}:${view.phase}`;
    const picked = pickedAt.key === key ? pickedAt.i : null;
    const setPicked = (i) => setPickedAt({ key, i });
    const canPick = view.canAnswer && !busy && picked === null && left > 0;
    const pick = (i) => {
        if (!canPick) return;
        setPicked(i);
        onAction({ type: 'answer', choice: i }).catch(() => setPicked(null));
    };
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

    const chosen = myAnswer && Number.isInteger(myAnswer.choice) ? myAnswer.choice : picked;
    const markOf = (i) => {
        if (view.answer) return i === view.answer.index ? 'right' : i === chosen ? 'wrong' : 'dim';
        if (i === chosen) return 'mine';
        return chosen !== null && chosen !== undefined ? 'dim' : 'open';
    };
    const seconds = Math.ceil(left / 1000);
    const clock = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
    const anagram = q && /^Unscramble the letters:\s*([A-Za-z]+)\s*$/.exec(q.prompt || '');
    const leader = Math.max(...(view.scores || [0]));

    return (
        // The whole page's width and height (2026-11-02), the sidebar and the top bar kept.
        <div className="w-full overflow-hidden rounded-[22px] p-3 pb-28 text-white sm:rounded-[28px] sm:p-7 sm:pb-7" data-quiz-table="wordlogic" data-phase={view.phase}
            style={{ minHeight: 'calc(100vh - 11rem)', background: 'radial-gradient(120% 90% at 50% 0%,#1d2550 0%,#121735 45%,#0b0f24 100%)' }}>
            <div className="w-full">
            {/* Title, and the time left. */}
            <div className="relative flex flex-col items-center gap-3 sm:gap-4 lg:block">
                <div className="flex flex-col items-center">
                    <div className="flex items-center gap-2 sm:gap-5">
                        <Tile ch="A" size={56} tilt={-14} className="max-sm:!h-8 max-sm:!w-8 max-sm:!text-base" />
                        <h1 className="bg-clip-text text-4xl font-black italic leading-none text-transparent drop-shadow-[0_3px_0_rgba(120,60,0,.6)] max-sm:text-[2rem] sm:text-6xl"
                            style={{ fontFamily: TITLE, backgroundImage: GOLD }}>Word Logic</h1>
                        <Tile ch="Z" size={56} tilt={14} className="max-sm:!h-8 max-sm:!w-8 max-sm:!text-base" />
                    </div>
                    <p className="mt-1.5 flex items-center gap-2 text-xs font-bold text-[#f4c95d] sm:mt-2 sm:gap-3 sm:text-lg">
                        <span className="h-px w-10 bg-[#f4c95d]/70 sm:w-16" /> Unscramble • Think • Solve <span className="h-px w-10 bg-[#f4c95d]/70 sm:w-16" />
                    </p>
                    <span className="mt-1.5 h-px w-48 bg-gradient-to-r sm:w-72 from-transparent via-[#f4c95d] to-transparent" />
                </div>
                {view.phase === 'question' && (
                    <div className="flex items-center gap-2 rounded-xl border-2 border-fuchsia-400 bg-[#120c2a]/80 px-3 py-1.5 sm:gap-3 sm:rounded-2xl sm:px-5 sm:py-2.5 shadow-[0_0_18px_rgba(217,70,239,.55),inset_0_0_14px_rgba(217,70,239,.25)] lg:absolute lg:right-0 lg:top-1/2 lg:-translate-y-1/2" data-timer={seconds}>
                        <span className="text-2xl sm:text-4xl" aria-hidden="true">⏳</span>
                        <span className="leading-tight">
                            <span className="block text-[11px] font-bold text-white/90 sm:text-sm">Time Left</span>
                            <span className={`block text-xl font-black italic tabular-nums sm:text-3xl ${seconds <= 5 ? 'text-rose-300' : ''}`}>{clock}</span>
                        </span>
                    </div>
                )}
            </div>

            {/* The players. */}
            <div className="mt-4 rounded-2xl border border-[#f4c95d]/25 bg-[#0d1230]/70 p-2 sm:mt-6 sm:rounded-3xl sm:p-4">
                <ul className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4" aria-label="Scores" data-scoreboard>
                    {view.seats.map((s, i) => {
                        const a = view.answers[i];
                        const out = view.out.includes(i);
                        const open = view.phase === 'question' || view.phase === 'answer';
                        const state = out ? 'Left' : open ? (a?.locked ? 'Locked out' : a ? 'Answered' : 'Thinking...') : '';
                        const me = view.you === i;
                        const score = view.scores?.[i] ?? 0;
                        const top = score === leader && leader > 0;
                        return (
                            <li key={i} data-score-seat={i}
                                className={`flex min-w-0 items-center gap-2 rounded-xl border-2 bg-[#141a3c]/90 px-2 py-2 sm:gap-3 sm:rounded-2xl sm:px-3 sm:py-3 ${out ? 'opacity-50' : ''} ${me ? 'border-violet-400 shadow-[0_0_16px_rgba(139,92,246,.6),inset_0_0_12px_rgba(139,92,246,.25)]' : top ? 'border-[#f4c95d] shadow-[0_0_16px_rgba(244,201,93,.45)]' : 'border-[#6b5bd6]/60'}`}>
                                <span className={`h-9 w-9 shrink-0 rounded-full p-[2px] sm:h-14 sm:w-14 sm:p-[3px] ${me ? 'bg-violet-400' : 'bg-[#f4c95d]'}`}><Face src={view.avatars?.[i]} name={s.name} /></span>
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate text-[13px] font-black leading-tight sm:text-base">{me ? 'You' : s.name}</span>
                                    <span className="block truncate text-[11px] text-white/70 sm:text-sm">{state}</span>
                                </span>
                                <span className={`shrink-0 self-center text-lg font-black tabular-nums sm:self-end sm:text-3xl ${score < 0 ? 'text-teal-300' : me ? 'text-white' : 'text-[#f4c95d]'}`} data-score={score}>{score}</span>
                            </li>
                        );
                    })}
                </ul>
            </div>

            {/* Get ready. */}
            {view.phase === 'ready' && view.status === 'active' && (
                <div className="mt-4 rounded-2xl border-2 border-[#f4c95d] p-6 text-center sm:mt-6 sm:rounded-[26px] sm:p-10 shadow-[0_0_24px_rgba(244,201,93,.4)]" data-ready>
                    <p className="text-sm font-bold uppercase tracking-[0.3em] text-[#f4c95d]">Get ready</p>
                    <p className="mt-2 text-6xl font-black tabular-nums sm:text-8xl" aria-live="polite">{Math.max(1, seconds)}</p>
                    <p className="mt-2 text-white/75">{view.total} questions · {Math.round(view.questionMs / 1000)} s each · right +100, wrong −20</p>
                </div>
            )}

            {/* The time left on this question: a green bar over the whole card, running down, red near the end. */}
            {q && view.phase === 'question' && (
                <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-white/10 sm:mt-6 sm:h-3" aria-hidden="true" data-time-bar>
                    <div className={`h-full rounded-full transition-[width] duration-100 ease-linear ${share < 0.25 ? 'bg-gradient-to-r from-rose-500 to-rose-400 shadow-[0_0_10px_rgba(244,63,94,.7)]' : 'bg-gradient-to-r from-green-500 to-emerald-400 shadow-[0_0_10px_rgba(74,222,128,.7)]'}`} style={{ width: `${share * 100}%` }} />
                </div>
            )}
            {/* The question. */}
            {q && (
                <section className={`${view.phase === 'question' ? 'mt-3' : 'mt-6'} rounded-2xl border-2 border-[#f4c95d] bg-[#0d1230]/60 p-4 sm:rounded-[26px] sm:p-5 shadow-[0_0_26px_rgba(244,201,93,.45),inset_0_0_30px_rgba(244,201,93,.08)] sm:p-8`} data-question={view.number}>
                    <div className="flex items-center justify-between gap-3">
                        <p className="min-w-0 text-[15px] font-black leading-snug sm:text-2xl">Question {view.number} of {view.total}{q.topic ? ` – ${q.topic}` : ''}</p>
                        {view.phase === 'question' && (
                            <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-[#f4c95d]/70 px-2.5 py-1 text-sm font-black tabular-nums text-[#f4c95d] sm:gap-2 sm:px-4 sm:py-1.5 sm:text-xl">⏱ {seconds}s</span>
                        )}
                        {reveal && <span className="rounded-full border border-[#f4c95d]/70 px-4 py-1.5 text-sm font-black text-[#f4c95d]">Answer</span>}
                    </div>
                    <div className="mt-3 flex gap-1 sm:mt-4 sm:gap-2" aria-hidden="true">
                        {Array.from({ length: view.total || 0 }, (_, i) => (
                            <span key={i} className={`h-1.5 flex-1 rounded-full sm:h-2.5 ${i < view.number ? 'bg-gradient-to-r from-green-400 to-green-500 shadow-[0_0_8px_rgba(74,222,128,.7)]' : 'bg-slate-600/70'}`} />
                        ))}
                    </div>
                    <div className="mt-2 h-px bg-white/10" />

                    {anagram ? (
                        <>
                            <h2 className="mt-4 text-center text-xl font-black sm:mt-6 sm:text-4xl" data-prompt>Unscramble the letters:</h2>
                            <div className="mt-4 flex flex-wrap justify-center gap-1.5 sm:mt-6 sm:gap-4">
                                {anagram[1].toUpperCase().split('').map((ch, i) => <Tile key={i} ch={ch} size={78} className="max-sm:!h-10 max-sm:!w-10 max-sm:!text-xl" />)}
                            </div>
                        </>
                    ) : (
                        <h2 className="mt-4 text-center text-lg font-black leading-snug sm:mt-6 sm:text-3xl" data-prompt>{q.prompt}</h2>
                    )}

                    <div className="mt-5 grid gap-2.5 sm:mt-8 sm:grid-cols-2 sm:gap-4" role="group" aria-label="Answers">
                        {q.options.map((text, i) => {
                            const m = markOf(i);
                            const look = {
                                mine: 'border-[#f4c95d] text-white shadow-[0_0_18px_rgba(244,201,93,.55)]',
                                right: 'border-green-400 bg-green-500/20 text-white shadow-[0_0_18px_rgba(74,222,128,.55)]',
                                wrong: 'border-rose-400 bg-rose-500/20 text-white shadow-[0_0_14px_rgba(244,63,94,.45)]',
                                dim: 'border-[#6b5bd6]/40 bg-[#141a3c]/70 text-white/55',
                                open: 'border-violet-500/80 bg-[#141a3c]/80 text-white hover:border-[#f4c95d] hover:shadow-[0_0_14px_rgba(244,201,93,.35)]'
                            }[m];
                            return (
                                <button key={i} type="button" data-option={i} data-mark={m} disabled={!canPick} onClick={() => pick(i)}
                                    className={`flex min-h-12 items-center gap-3 rounded-full border-2 px-3 py-2 text-left text-base font-black tracking-wide sm:min-h-16 sm:gap-5 sm:px-5 sm:py-2.5 sm:text-xl transition-[box-shadow,border-color] disabled:cursor-default sm:text-2xl ${look}`}
                                    style={m === 'mine' ? { background: 'linear-gradient(180deg,#c98a2a,#8a5a14)' } : undefined}>
                                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-violet-300/70 text-base sm:h-12 sm:w-12 bg-gradient-to-b from-violet-500 to-indigo-700 text-xl font-black shadow-[inset_0_2px_0_rgba(255,255,255,.35)]">
                                        {m === 'right' ? <Check size={22} /> : m === 'wrong' ? <X size={22} /> : LETTERS[i]}
                                    </span>
                                    <span className="min-w-0 break-words">{text}</span>
                                </button>
                            );
                        })}
                    </div>

                    {view.phase === 'question' && view.you != null && (
                        <p className="mt-4 text-center text-xs font-bold text-[#f4c95d]/90 sm:mt-6 sm:text-sm" data-status>
                            {myAnswer || picked !== null ? 'Locked in. Waiting for the others…' : 'Pick your answer. Right +100, wrong −20. Keys 1–4 work too.'}
                        </p>
                    )}
                    {reveal && view.answer && (
                        <p className="mt-4 text-center text-sm text-white/85 sm:mt-6 sm:text-base" data-explain>
                            {myAnswer && Number.isFinite(myAnswer.points) && <span className={`mr-2 font-black ${myAnswer.correct ? 'text-green-400' : 'text-rose-400'}`}>{myAnswer.correct ? `Correct! +${myAnswer.points}` : `Not this time (${myAnswer.points})`}</span>}
                            <span className="font-black text-white">Answer: {q.options[view.answer.index]}.</span> {view.answer.explain}
                        </p>
                    )}
                </section>
            )}
            </div>
        </div>
    );
}

export default function WordLogicTable(props) {
    return props.view.status === 'finished' ? <QuizTable {...props} /> : <Live {...props} />;
}
