/**
 * The two cards under the scores on the interview report: how the answers
 * sounded, and what to do next.
 *
 * Everything shown is measured or written by the evaluator. The headline and
 * the line under it are the two halves of the note the server wrote, split
 * here rather than invented, so an older report reads the same as a new one.
 */
import { Mic, Lightbulb, FileText, CheckCircle2, AlertCircle, Info, Target, RotateCcw, ArrowRight, AudioLines, Quote } from 'lucide-react';
import Illustration from './Illustration';

/** "First sentence. The rest." → ['First sentence.', 'The rest.'] */
const split = (text) => {
    const m = String(text || '').match(/^(.+?[.!?])\s+(.+)$/s);
    return m ? [m[1], m[2]] : [String(text || ''), ''];
};
const NOTE_LOOK = {
    good: { row: 'bg-emerald-50', ink: 'text-emerald-800', dot: 'bg-emerald-500', icon: CheckCircle2 },
    warn: { row: 'bg-amber-50', ink: 'text-amber-900', dot: 'bg-amber-500', icon: AlertCircle },
    info: { row: 'bg-slate-50', ink: 'text-slate-700', dot: 'bg-slate-400', icon: Info }
};
/** What each unmet note suggests practising, for the tip along the foot. */
const TIP_FOR = {
    pace: 'speaking at a steady pace', length: 'expanding your answers with examples', fillers: 'pausing instead of filling',
    pauses: 'thinking out loud while you gather your thoughts', hedging: 'stating what you know plainly', structure: 'the situation, action, result structure'
};

/* ── How you sounded ──────────────────────────────────────────────────── */
export function DeliveryCard({ communication }) {
    const c = communication;
    const notes = c?.notes || [];
    const warns = notes.filter((n) => n.tone === 'warn');
    // An overall word for the delivery, from how many of its parts fell short.
    const verdict = !notes.length ? null : warns.length === 0 ? ['Excellent', 'bg-emerald-100 text-emerald-700']
        : warns.length <= 2 ? ['Good', 'bg-emerald-100 text-emerald-700']
            : warns.length === 3 ? ['Fair', 'bg-amber-100 text-amber-700'] : ['Needs work', 'bg-rose-100 text-rose-600'];
    const tips = warns.map((n) => TIP_FOR[n.kind]).filter(Boolean).slice(0, 2);

    return (
        <section className="@container flex flex-col rounded-3xl border border-slate-200 bg-white p-5 shadow-sm animate-fade-in-up sm:p-6">
            <div className="mb-4 flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-600"><Mic size={22} /></span>
                    <div>
                        <h2 className="text-xl font-black text-slate-900">How you sounded</h2>
                        <p className="mt-0.5 max-w-sm text-xs leading-snug text-slate-500">Measured from your spoken answers: pace, pauses, filler words and length. No guesses about mood or personality.</p>
                    </div>
                </div>
                {verdict && <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-black ${verdict[1]}`}><AudioLines size={13} /> Overall: {verdict[0]}</span>}
            </div>

            {c ? (
                <>
                    <ul className="stagger space-y-2">
                        {notes.map((n, i) => {
                            const look = NOTE_LOOK[n.tone] || NOTE_LOOK.info; const Icon = look.icon; const [head, rest] = split(n.text);
                            return (
                                <li key={i} className={`flex items-start gap-3 rounded-2xl px-3.5 py-3 ${look.row}`}>
                                    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white ${look.dot}`}><Icon size={14} /></span>
                                    <span className="min-w-0">
                                        <span className={`block text-sm font-bold leading-snug ${look.ink}`}>{head}</span>
                                        {rest && <span className="mt-0.5 block text-xs leading-snug text-slate-600">{rest}</span>}
                                    </span>
                                </li>
                            );
                        })}
                    </ul>

                    <p className="mt-3 flex items-center gap-2.5 rounded-2xl bg-violet-50 px-3.5 py-3 text-sm text-slate-700">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-600"><Lightbulb size={16} /></span>
                        <span><span className="font-black text-violet-700">Tip: </span>{tips.length ? `Practise ${tips.join(' and ')}.` : 'Keep this delivery — it is working.'}</span>
                    </p>
                </>
            ) : (
                <p className="rounded-2xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">No delivery data for this interview.</p>
            )}
        </section>
    );
}

/* ── AI recommendation ────────────────────────────────────────────────── */
/** Picks out the skills the plan names, so the highlighting marks something real. */
const highlight = (text, terms) => {
    const found = terms.map((t) => String(t || '').trim()).filter((t) => t.length > 2 && new RegExp(`\\b${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(text));
    if (!found.length) return text;
    const parts = text.split(new RegExp(`(${found.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'ig'));
    return parts.map((part, i) => (found.some((t) => t.toLowerCase() === part.toLowerCase())
        ? <strong key={i} className="font-black text-indigo-600">{part}</strong> : part));
};

const ActionRow = ({ icon: Icon, label, onClick, primary, chip }) => (
    <button type="button" onClick={onClick}
        className={`iv-card flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-left ${primary
            ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-200'
            : 'border border-indigo-100 bg-white text-indigo-700 hover:border-indigo-300'}`}>
        <Icon size={20} className="shrink-0" />
        <span className="min-w-0 flex-1 text-base font-black">{label}</span>
        {chip && <span className="hidden shrink-0 rounded-full bg-white/20 px-3 py-1 text-[11px] font-bold @[26rem]:block">{chip}</span>}
        <ArrowRight size={18} className="shrink-0" />
    </button>
);

export function RecommendationCard({ report, onPractice, onRetake, onDetail }) {
    const text = report.recommendation || (report.plan?.[0] ? `${report.plan[0].action} before attempting your next mock interview.` : 'Take another mock interview to keep the momentum going.');
    const terms = (report.plan || []).flatMap((p) => [p.skill, p.courseTitle]).filter(Boolean);
    return (
        <section className="@container flex flex-col rounded-3xl border border-slate-200 bg-white p-5 shadow-sm animate-fade-in-up sm:p-6">
            <div className="mb-4 flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-500"><Lightbulb size={22} /></span>
                    <div>
                        <h2 className="text-xl font-black leading-tight text-slate-900">AI recommendation</h2>
                        <p className="mt-0.5 text-xs text-slate-500">What to work on before your next interview.</p>
                    </div>
                </div>
                <span className="hidden shrink-0 rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-600 @[30rem]:block">Practice · Improve · Succeed</span>
            </div>

            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-50 to-violet-50 p-4 sm:p-5">
                <Quote size={26} className="absolute left-3 top-3 text-indigo-200" aria-hidden="true" />
                <p className="relative z-10 pl-8 text-[15px] font-semibold leading-relaxed text-slate-800 @[38rem]:max-w-[68%]">&ldquo;{highlight(text, terms)}&rdquo;</p>
                <span className="pointer-events-none absolute -bottom-1 right-0 hidden items-end @[38rem]:flex">
                    <span className="mb-16 mr-1 rounded-2xl rounded-br-sm bg-amber-100 px-2.5 py-1 text-[11px] font-bold italic text-amber-800 shadow-sm">You&apos;ve got this!</span>
                    <Illustration name="idea" pose="point" height={112} />
                </span>
            </div>

            <div className="mt-4 space-y-2.5">
                <ActionRow icon={Target} label="Practice Recommended Skills" onClick={onPractice} primary chip="Focus & Improve" />
                <ActionRow icon={RotateCcw} label="Retake Mock Interview" onClick={onRetake} />
                <ActionRow icon={FileText} label="View Detailed Report" onClick={onDetail} />
            </div>
        </section>
    );
}
