import { useEffect, useMemo, useRef, useState } from 'react';
import usePhaseClock from './usePhaseClock';
import { Check, X, Lock, Timer, Zap, Sparkles, ChevronDown, Crown, LogOut } from 'lucide-react';

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

export const Scoreboard = ({ view, theme }) => {
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
                        className={`flex min-w-0 flex-1 items-center gap-2.5 rounded-2xl border bg-white px-3 py-2 shadow-sm sm:min-w-[11rem] ${view.you === i ? `border-transparent ring-2 ${theme.ring}` : 'border-slate-200'} ${out ? 'opacity-50' : ''}`}>
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black text-white" style={{ background: s.color }} aria-hidden="true">
                            {lead ? <Crown size={15} /> : (s.name || '?').slice(0, 1).toUpperCase()}
                        </span>
                        <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-bold leading-tight text-slate-900">{s.name}</span>
                            <span className="block text-[11px] font-semibold leading-tight text-slate-500">
                                {state === 'out' && <span className="inline-flex items-center gap-1"><LogOut size={11} aria-hidden="true" /> Left</span>}
                                {state === 'thinking' && 'Thinking…'}
                                {state === 'answered' && <span className="inline-flex items-center gap-1 text-emerald-600"><Check size={11} aria-hidden="true" /> Answered</span>}
                                {state === 'locked' && <span className="inline-flex items-center gap-1 text-rose-600"><Lock size={11} aria-hidden="true" /> Locked out</span>}
                                {!state && (secret ? (view.you === i ? 'You' : '') : `${view.you === i ? 'You · ' : ''}${view.correct[i]} right`)}
                            </span>
                        </span>
                        {!secret && <span className="text-right">
                            <span className="block text-lg font-black tabular-nums leading-none text-slate-900" data-score={view.scores[i]}>{view.scores[i]}</span>
                            {view.phase === 'reveal' && a && Number.isFinite(a.points) && (
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
const Option = ({ index, text, mark, mono, disabled, onPick }) => {
    const tone = {
        right: 'border-emerald-400 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-300',
        wrong: 'border-rose-300 bg-rose-50 text-rose-900 ring-2 ring-rose-200',
        mine: 'border-indigo-400 bg-indigo-50 text-indigo-900 ring-2 ring-indigo-300',
        dim: 'border-slate-200 bg-white text-slate-400',
        open: 'border-slate-200 bg-white text-slate-800 hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md active:translate-y-0'
    }[mark];
    const badge = { right: 'bg-emerald-500 text-white', wrong: 'bg-rose-500 text-white', mine: 'bg-indigo-600 text-white' }[mark] || 'bg-slate-100 text-slate-600';
    return (
        <button type="button" data-option={index} data-mark={mark} disabled={disabled} onClick={() => onPick(index)}
            className={`group flex min-h-14 w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-left text-sm font-semibold shadow-sm transition-[transform,box-shadow,border-color,background-color] duration-150 disabled:cursor-default motion-reduce:transition-none sm:text-[15px] ${tone}`}>
            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-sm font-black ${badge}`} aria-hidden="true">
                {mark === 'right' ? <Check size={16} /> : mark === 'wrong' ? <X size={16} /> : LETTERS[index]}
            </span>
            {isPicture(text) ? <Picture text={text} small /> : <span className={`min-w-0 flex-1 break-words ${mono ? 'font-mono text-[13px] sm:text-sm' : ''}`}>{text}</span>}
        </button>
    );
};

const Recap = ({ view }) => {
    // Rapid Fire showed nothing during the game: its answers open at once.
    const [open, setOpen] = useState(view.mode === 'hidden');
    if (!view.recap?.length) return null;
    const mine = view.you;
    return (
        <section className="rounded-3xl border border-slate-200 bg-white shadow-sm" data-recap>
            <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open}
                className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left">
                <span className="text-base font-black text-slate-900">Review the answers</span>
                <ChevronDown size={18} className={`text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
            </button>
            {open && (
                <ol className="space-y-3 border-t border-slate-100 px-5 py-4">
                    {view.recap.map((q, n) => {
                        const a = mine != null ? q.answers[mine] : null;
                        return (
                            <li key={n} className="rounded-2xl bg-slate-50 p-3" data-recap-item={n}>
                                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Q{n + 1} · {q.topic}</p>
                                <p className="mt-0.5 font-semibold text-slate-900">{q.prompt}</p>
                                {q.code && <div className="mt-2">{isPicture(q.code) ? <Picture text={q.code} small /> : <Code code={q.code} lang={q.lang} />}</div>}
                                <p className="mt-2 text-sm text-emerald-700"><Check size={14} className="mr-1 inline" aria-hidden="true" />{isPicture(q.options[q.answer]) ? <Picture text={q.options[q.answer]} small /> : q.options[q.answer]}</p>
                                {mine != null && (
                                    <p className={`text-sm ${a?.correct ? 'text-emerald-700' : 'text-rose-700'}`}>
                                        You: {a ? (isPicture(q.options[a.choice]) ? `option ${LETTERS[a.choice]} (${a.points > 0 ? '+' : ''}${a.points})` : `${q.options[a.choice]} (${a.points > 0 ? '+' : ''}${a.points})`) : 'no answer'}
                                    </p>
                                )}
                                {q.explain && <p className="mt-1 text-xs text-slate-500">{q.explain}</p>}
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
    const { left, share } = usePhaseClock(view);
    const [picked, setPicked] = useState(null);
    const buzzer = view.mode === 'buzzer';
    // Rapid Fire: nothing about right or wrong until the game is over.
    const hidden = view.mode === 'hidden';
    const q = view.question;
    const reveal = view.phase === 'reveal';
    const myAnswer = view.you != null ? view.answers[view.you] : null;

    // A new question clears the choice waiting on the server.
    const key = `${view.number}:${view.phase}`;
    useEffect(() => { setPicked(null); }, [key]);

    const canPick = view.canAnswer && !busy && picked === null && left > 0;
    const pick = (i) => {
        if (!canPick) return;
        setPicked(i);
        onAction({ type: 'answer', choice: i }).catch(() => setPicked(null));
    };

    // 1–4 or A–D on a keyboard.
    const pickRef = useRef(pick);
    pickRef.current = pick;
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
        if (reveal && view.answer) {
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
    if (recapOnly && view.status === 'finished') return <div className="mx-auto w-full max-w-3xl"><Recap view={view} /></div>;
    return (
        <div className="mx-auto w-full max-w-3xl space-y-4" data-quiz-table={view.game} data-phase={view.phase}>
            <Scoreboard view={view} theme={theme} />

            {view.phase === 'ready' && view.status === 'active' && (
                <section className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${theme.from} ${theme.to} p-8 text-center text-white shadow-lg`} data-ready>
                    <Sparkles size={28} className="mx-auto opacity-80" aria-hidden="true" />
                    <p className="mt-2 text-sm font-bold uppercase tracking-[0.25em] text-white/80">Get ready</p>
                    <p className="mt-1 text-7xl font-black tabular-nums" aria-live="polite">{Math.max(1, seconds)}</p>
                    <p className="mt-2 text-sm text-white/85">
                        {view.total} {view.game === 'codeclash' ? 'challenges' : view.game === 'brainsprint' ? 'puzzles' : 'questions'} · {Math.round(view.questionMs / 1000)} s each
                        {hidden ? ' · answers and scores are shown at the end' : buzzer ? ' · first right answer scores +10, a wrong one −5' : ' · up to 150 points each, faster scores more'}
                    </p>
                </section>
            )}

            {q && (
                <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm" data-question={view.number}>
                    <div className={`bg-gradient-to-r ${theme.from} ${theme.to} px-5 py-3 text-white`}>
                        <div className="flex items-center justify-between gap-3">
                            <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/85">
                                {buzzer && <Zap size={13} className="mr-1 inline" aria-hidden="true" />}
                                Question {view.number} of {view.total}{q.topic ? ` · ${q.topic}` : ''}
                            </p>
                            {view.phase === 'question' && (
                                <span data-timer={seconds} className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-black tabular-nums ${seconds <= 5 ? 'bg-white text-rose-600 animate-pulse motion-reduce:animate-none' : 'bg-white/20'}`}>
                                    <Timer size={14} aria-hidden="true" /> {seconds}s
                                </span>
                            )}
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
                        <div className="h-1.5 bg-slate-100" aria-hidden="true">
                            <div className={`h-full ${share < 0.25 ? 'bg-rose-500' : theme.bar} transition-[width] duration-100 ease-linear`} style={{ width: `${share * 100}%` }} />
                        </div>
                    )}

                    <div className="space-y-4 p-4 sm:p-6">
                        <h2 className="text-lg font-black leading-snug text-slate-900 sm:text-xl" data-prompt>{q.prompt}</h2>
                        {q.code && (isPicture(q.code) ? <div className="flex justify-center"><Picture text={q.code} /></div> : <Code code={q.code} lang={q.lang} />)}
                        <div className="grid gap-2.5 sm:grid-cols-2" role="group" aria-label="Answers">
                            {q.options.map((text, i) => (
                                <Option key={i} index={i} text={text} mark={markOf(i)} mono={!!q.code && q.topic === 'Predict the output'} disabled={!canPick} onPick={pick} />
                            ))}
                        </div>

                        {view.phase === 'question' && view.you != null && (
                            <p className={`rounded-2xl px-4 py-2.5 text-center text-sm font-semibold ${theme.soft} ${theme.text}`} data-status>
                                {view.out.includes(view.you) ? 'You have left this game.'
                                    : buzzer && myAnswer?.correct === false ? 'Wrong — you are locked out of this one. −5'
                                    : myAnswer || picked !== null ? (hidden ? 'Answer saved. The next question opens soon.' : buzzer ? 'Buzzed in! Waiting for the result…' : 'Locked in. Waiting for the others…')
                                    : <>{hidden ? 'Pick your answer.' : buzzer ? 'Buzz in with the right answer first.' : 'Pick your answer. Faster right answers score more.'}<span className="max-sm:hidden"> Keys 1–4 work too.</span></>}
                            </p>
                        )}
                        {reveal && view.answer && (
                            <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700 ring-1 ring-slate-100" data-explain>
                                {myAnswer && Number.isFinite(myAnswer.points) && (
                                    <p className={`mb-1 font-black ${myAnswer.correct ? 'text-emerald-700' : 'text-rose-700'}`}>
                                        {myAnswer.correct ? `Correct! +${myAnswer.points}` : `Not this time${myAnswer.points < 0 ? ` (${myAnswer.points})` : ''}`}
                                    </p>
                                )}
                                {view.you != null && !myAnswer && <p className="mb-1 font-black text-slate-500">No answer this time.</p>}
                                <p><span className="font-bold text-slate-900">Answer: {isPicture(q.options[view.answer.index]) ? `option ${LETTERS[view.answer.index]}` : q.options[view.answer.index]}.</span> {view.answer.explain}</p>
                            </div>
                        )}
                    </div>
                </section>
            )}

            {view.status === 'finished' && <Recap view={view} />}
        </div>
    );
}
