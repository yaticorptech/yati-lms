/**
 * Linguistic Ability — the end of a session: the mascot, a title, the stat
 * cards (XP, score, time), an optional banner (a certificate earned), the
 * answers to look back on, and the buttons on. Also the word-by-word diff a
 * translation shows against the model.
 */
import { useState } from 'react';
import { Check, X, ChevronDown } from 'lucide-react';
import { Celebration } from '../../interview/ui';
import { COLORS } from '../meta';
import { Chunky, Mascot } from '../ui';

/** The student's words against the closest correct answer: missing ones in green, extra ones struck through. */
export function Diff({ diff }) {
    if (!diff?.length) return null;
    return (
        <p className="flex flex-wrap gap-x-1.5 gap-y-1 text-[15px] font-bold leading-relaxed" dir="auto" aria-label="Your answer compared word by word" data-diff>
            {diff.map((d, i) => (
                <span key={i} className={d.t === 'same' ? 'text-[#4b4b4b]' : d.t === 'missing' ? 'rounded px-1' : 'rounded px-1 line-through'}
                    style={d.t === 'missing' ? { background: COLORS.green.light, color: COLORS.green.ink } : d.t === 'extra' ? { background: COLORS.red.light, color: COLORS.red.ink } : undefined}
                    title={d.t === 'missing' ? 'Missing from your answer' : d.t === 'extra' ? 'Not in the model answer' : undefined}>{d.w}</span>
            ))}
        </p>
    );
}

/** A stat card: a coloured band with its name over a white box with the value. */
export const StatCard = ({ label, value, color = 'gold', icon: Icon }) => {
    const c = COLORS[color];
    return (
        <div className="lingo-pop overflow-hidden rounded-2xl border-2" style={{ borderColor: c.face, background: c.face }} data-stat={label}>
            <p className="px-2 py-1 text-[11px] font-extrabold uppercase tracking-wider text-white">{label}</p>
            <p className="flex items-center justify-center gap-1.5 rounded-xl bg-white px-2 py-3 text-xl font-extrabold tabular-nums" style={{ color: c.ink }}>
                {Icon && <Icon size={20} strokeWidth={3} />} {value}
            </p>
        </div>
    );
};

/** Every answer given, right or wrong, with the right one and why. */
export function AnswerList({ results }) {
    return (
        <ol className="space-y-2.5 text-left" data-answers>
            {results.map((r, i) => (
                <li key={r.id || i} className="rounded-2xl border-2 px-4 py-3" style={{ borderColor: r.correct ? COLORS.green.light : COLORS.red.light }} data-review-item={r.correct ? 'right' : 'wrong'}>
                    <p className="flex items-start gap-2 text-[15px] font-extrabold text-[#4b4b4b]">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full" style={{ background: r.correct ? COLORS.green.face : COLORS.red.face }}>
                            {r.correct ? <Check size={13} strokeWidth={4} className="text-white" /> : <X size={13} strokeWidth={4} className="text-white" />}
                        </span>
                        <span className="min-w-0 break-words">{r.prompt}</span>
                    </p>
                    <p className="mt-1 break-words pl-7 text-sm font-semibold text-[#777]">You: <span style={{ color: r.correct ? COLORS.green.ink : COLORS.red.ink }}>{r.given || '— not answered'}</span></p>
                    {!r.correct && r.answer && <p className="break-words pl-7 text-sm font-semibold text-[#777]">Answer: <span className="font-extrabold" style={{ color: COLORS.green.ink }}>{r.answer}</span></p>}
                    {r.verdict && r.verdict !== 'exact' && r.diff?.length > 0 && r.given && <div className="mt-1 pl-7"><Diff diff={r.diff} /></div>}
                    {r.explanation && <p className="mt-1 pl-7 text-sm font-semibold text-[#777]">{r.explanation}</p>}
                </li>
            ))}
        </ol>
    );
}

/**
 * @param props.pose       the mascot's pose
 * @param props.tone       'pass' (green title, confetti) | 'fail' (red) | 'info'
 * @param props.stats      [{ label, value, color, icon }]
 * @param props.results    answers to show behind "Review answers"
 * @param props.primary    { label, onClick }
 * @param props.secondary  { label, onClick } — beside the main button
 */
export function Finish({ pose = 'star-celebrate', tone = 'pass', title, text, stats = [], banner = null, results = null, primary, secondary, children }) {
    const [review, setReview] = useState(false);
    const color = tone === 'pass' ? COLORS.gold.ink : tone === 'fail' ? COLORS.red.ink : COLORS.blue.ink;
    return (
        <>
            <main className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain" data-finish={tone}>
                {tone === 'pass' && <Celebration />}
                <div className="relative mx-auto flex w-full max-w-[600px] flex-col items-center gap-5 px-4 pb-10 pt-10 text-center sm:pt-16">
                    <Mascot pose={pose} className="lingo-pop h-44 w-44 sm:h-52 sm:w-52" />
                    <div>
                        <h1 className="text-[1.8rem] font-black leading-tight sm:text-[2.1rem]" style={{ color }} data-finish-title>{title}</h1>
                        {text && <p className="mx-auto mt-2 max-w-md text-[17px] font-semibold text-[#777]">{text}</p>}
                    </div>
                    {stats.length > 0 && <div className={`grid w-full gap-3 ${stats.length >= 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>{stats.map((s) => <StatCard key={s.label} {...s} />)}</div>}
                    {banner}
                    {children}
                    {results?.length > 0 && (
                        <div className="w-full">
                            <button type="button" onClick={() => setReview((r) => !r)} aria-expanded={review} className="mx-auto mb-3 inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-[15px] font-extrabold uppercase tracking-wide hover:bg-[#F7F7F7]" style={{ color: COLORS.blue.ink }} data-review-answers>
                                {review ? 'Hide answers' : 'Review answers'} <ChevronDown size={18} className={`transition-transform ${review ? 'rotate-180' : ''}`} />
                            </button>
                            {review && <AnswerList results={results} />}
                        </div>
                    )}
                </div>
            </main>
            <footer className="shrink-0 border-t-2 border-[#E5E5E5]">
                <div className="mx-auto flex max-w-[1000px] flex-col-reverse gap-3 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 sm:flex-row sm:items-center sm:px-10 sm:py-7">
                    {secondary && <Chunky variant="outline" color="blue" onClick={secondary.onClick} className="sm:min-w-[150px]" data-secondary>{secondary.label}</Chunky>}
                    <span className="hidden flex-1 sm:block" />
                    {primary && <Chunky color={tone === 'fail' ? 'blue' : 'green'} onClick={primary.onClick} className="sm:min-w-[150px]" data-primary autoFocus>{primary.label}</Chunky>}
                </div>
            </footer>
        </>
    );
}
