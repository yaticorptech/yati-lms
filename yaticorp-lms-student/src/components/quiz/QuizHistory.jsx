import { useCallback, useEffect, useRef, useState } from 'react';
import { History, Trophy, Timer } from 'lucide-react';
import { clock, toneFor, shortDate } from './quizFormat';

/** A small score ring, drawn in on arrival. No arc at 0%: a zero-length round stroke is a stray dot. */
const MiniRing = ({ score, size = 48 }) => {
    const [shown, setShown] = useState(0);
    useEffect(() => { const t = setTimeout(() => setShown(score), 120); return () => clearTimeout(t); }, [score]);
    const stroke = 5;
    const r = (size - stroke) / 2;
    const c = 2 * Math.PI * r;
    return (
        <span className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden="true">
                <circle cx={size / 2} cy={size / 2} r={r} fill="#fff" stroke="#f1effb" strokeWidth={stroke} />
                {score > 0 && (
                    <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={toneFor(score)} strokeWidth={stroke} strokeLinecap="round"
                        strokeDasharray={c} strokeDashoffset={c * (1 - shown / 100)}
                        style={{ transition: 'stroke-dashoffset 0.9s cubic-bezier(0.16, 1, 0.3, 1)' }} />
                )}
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[11px] font-black tabular-nums text-slate-800">{score}%</span>
        </span>
    );
};

/**
 * Every Global Quiz the student has, as one list: the Global Quiz tab's card.
 *
 * `newQuiz` is the row for a quiz the admin has published and the student has
 * not taken yet, with its Start button (GlobalQuiz builds it, since starting
 * is its job); it comes first. Below it, every quiz taken, newest first, each
 * with its score — the latest one included, tagged "Latest". It used to have a
 * large result card of its own above this list.
 *
 * `rows` is the server's list (GET /user/quizzes/global/history), read by
 * GlobalQuiz, whose banner shows the student's record from the same rows:
 * undefined while loading, null when it could not be read. A quiz taken but
 * since deleted by the administrator keeps its row.
 */
export default function QuizHistory({ rows, newQuiz = null }) {
    // Whether rows are hidden below the bottom of the scrolling list: the fade there says so.
    const listRef = useRef(null);
    const [more, setMore] = useState(false);
    const measure = useCallback(() => {
        const el = listRef.current;
        setMore(!!el && el.scrollTop + el.clientHeight < el.scrollHeight - 4);
    }, []);

    // Measured once the rows are laid out.
    useEffect(() => { const f = requestAnimationFrame(measure); return () => cancelAnimationFrame(f); }, [rows, measure]);

    // The list could not be read and there is nothing to start: stay out of the way.
    if (rows === null && !newQuiz) return null;
    const taken = rows || [];

    return (
        <section aria-labelledby="gq-history-title" className="relative text-left animate-fade-in-up">
            {/* The record (taken, average, best, wins) is the banner's; here, the quizzes themselves. */}
            <h4 id="gq-history-title" className="flex items-center gap-2 text-lg font-black text-slate-900">
                <History size={18} className="text-violet-500" aria-hidden="true" /> Your quizzes
                {taken.length > 0 && <span className="rounded-full bg-violet-50 px-2 py-0.5 text-xs font-bold text-violet-700">{taken.length}</span>}
            </h4>

            {newQuiz && <div className="mt-4">{newQuiz}</div>}

            {rows === undefined ? null : taken.length === 0 ? (
                <p className="mt-4 rounded-2xl bg-violet-50/60 px-4 py-3.5 text-sm text-slate-600">
                    {newQuiz
                        ? 'Your score will be listed here once you finish, along with every quiz after it.'
                        : 'No quizzes yet. Each quiz you finish is listed here with its score, so you can see how you are doing over the weeks.'}
                </p>
            ) : (
                // Every quiz, in a list that scrolls inside the card: about five
                // and a half rows tall, so the half row says there is more.
                <div className="relative mt-4">
                    <ul ref={listRef} onScroll={measure} tabIndex={0} aria-label="Quizzes taken"
                        className="max-h-[25rem] divide-y divide-slate-100 overflow-y-auto overscroll-contain rounded-xl pr-1 outline-none [scrollbar-color:#ddd6fe_transparent] [scrollbar-width:thin] focus-visible:ring-2 focus-visible:ring-violet-300">
                        {taken.map((a, i) => (
                            <li key={a.id} className="animate-fade-in-up flex items-center gap-3 py-3 first:pt-1" style={{ animationDelay: `${Math.min(i, 8) * 0.05}s` }}>
                                <MiniRing score={a.score} />
                                <div className="min-w-0 flex-1">
                                    <p className="flex min-w-0 items-center gap-2">
                                        <span className="truncate font-bold text-slate-900 first-letter:uppercase">{a.title}</span>
                                        {a.current && <span className="shrink-0 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-violet-700">Latest</span>}
                                    </p>
                                    {/* One line on a wide screen; on a phone the date, then
                                        the result — wrapping freely left a separator dot
                                        hanging at the start of a line. */}
                                    <p className="mt-0.5 text-xs text-slate-500 sm:flex sm:items-center sm:gap-2">
                                        <span className="block">{shortDate(a.finishedAt)}</span>
                                        <span aria-hidden="true" className="hidden sm:inline">·</span>
                                        {/* Each piece stays whole, and the timer icon is the
                                            separator, so a squeezed row wraps cleanly. */}
                                        <span className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
                                            <span className="whitespace-nowrap font-semibold text-slate-600">{a.correctCount} of {a.totalQuestions} correct</span>
                                            <span className="inline-flex items-center gap-1 whitespace-nowrap tabular-nums"><Timer size={11} /> {clock(a.elapsedMs)}</span>
                                        </span>
                                    </p>
                                </div>
                                {a.won ? (
                                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-black text-amber-700 ring-1 ring-amber-200"><Trophy size={12} /> Won</span>
                                ) : a.timedOut ? (
                                    <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-500">Timed out</span>
                                ) : null}
                            </li>
                        ))}
                    </ul>
                    <div aria-hidden="true" className={`pointer-events-none absolute inset-x-0 bottom-0 h-14 rounded-b-xl bg-gradient-to-t from-white to-transparent transition-opacity duration-300 ${more ? 'opacity-100' : 'opacity-0'}`} />
                </div>
            )}
        </section>
    );
}
