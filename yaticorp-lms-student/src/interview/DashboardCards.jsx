/**
 * The three cards under the interview picker: what to revise, what to
 * practise, and what to fix. Each row carries its own colour so the eye can
 * sort them, and each ends somewhere useful rather than being a dead label.
 */
import { Link } from 'react-router-dom';
import {
    Target, ArrowRight, ChevronRight, Star, User, Code2, Users, FolderOpen, MessageSquare,
    Compass, Cloud, Sparkles, FileText, TrendingUp, Lightbulb, Trophy
} from 'lucide-react';
import Illustration from './Illustration';
import Sparkline from '../components/rewards/Sparkline';

/* One palette, used everywhere, so a colour means the same thing on all three cards. */
const TONES = [
    { row: 'bg-violet-50 hover:bg-violet-100/70', tile: 'bg-violet-100 text-violet-600', ink: 'text-violet-600', arrow: 'bg-white text-violet-600' },
    { row: 'bg-amber-50 hover:bg-amber-100/70', tile: 'bg-amber-100 text-amber-600', ink: 'text-amber-600', arrow: 'bg-white text-amber-600' },
    { row: 'bg-rose-50 hover:bg-rose-100/70', tile: 'bg-rose-100 text-rose-500', ink: 'text-rose-500', arrow: 'bg-white text-rose-500' },
    { row: 'bg-emerald-50 hover:bg-emerald-100/70', tile: 'bg-emerald-100 text-emerald-600', ink: 'text-emerald-600', arrow: 'bg-white text-emerald-600' },
    { row: 'bg-sky-50 hover:bg-sky-100/70', tile: 'bg-sky-100 text-sky-600', ink: 'text-sky-600', arrow: 'bg-white text-sky-600' },
    { row: 'bg-indigo-50 hover:bg-indigo-100/70', tile: 'bg-indigo-100 text-indigo-600', ink: 'text-indigo-600', arrow: 'bg-white text-indigo-600' }
];
/** The same text always gets the same colour, so a skill keeps its colour between visits. */
const toneFor = (text, offset = 0) => {
    let n = offset;
    for (let i = 0; i < String(text || '').length; i++) n = (n * 31 + text.charCodeAt(i)) % 997;
    return TONES[n % TONES.length];
};
const cap = (s) => (s[0] || '?').toUpperCase() + (s[1] || '').toLowerCase();
/**
 * Initials for a skill with no icon of its own: "Adobe After Effects" → "Ae".
 * `taken` keeps two skills from wearing the same badge — "Adobe Illustrator"
 * and "Adobe InDesign" both start A-I, so the second falls back to its own
 * last word: "In".
 */
const monogram = (text, taken) => {
    const words = String(text || '?').trim().split(/[\s.\-_/]+/).filter(Boolean);
    const last = words[words.length - 1] || '?';
    for (const candidate of [words.length > 1 ? words[0][0] + last[0] : last.slice(0, 2), last.slice(0, 2), words.join('').slice(0, 2)]) {
        const mark = cap(candidate);
        if (!taken || !taken.has(mark)) { taken?.add(mark); return mark; }
    }
    return cap(last);
};

const CardShell = ({ icon: Icon, iconClass, title, hint, action, children }) => (
    <section className="flex flex-col rounded-3xl border border-slate-200 bg-white p-4 shadow-sm animate-fade-in-up sm:p-5">
        <div className="mb-3 flex items-start justify-between gap-2">
            <div className="flex items-start gap-3">
                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white shadow-md ${iconClass}`}><Icon size={21} /></span>
                <div className="min-w-0">
                    <h2 className="text-lg font-black leading-tight text-slate-900">{title}</h2>
                    {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
                </div>
            </div>
            {action}
        </div>
        {children}
    </section>
);

const HeadLink = ({ to, tone, children }) => (
    <Link to={to} className={`inline-flex shrink-0 items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold ${tone}`}>{children} <ArrowRight size={13} /></Link>
);

/** One row: coloured tile, text, and an arrow that goes where the row promises. */
const Row = ({ to, tone, tile, label, title, sub, children }) => (
    <li>
        <Link to={to} className={`iv-card flex items-center gap-3 rounded-2xl px-3 py-2.5 ${tone.row}`}>
            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-black ${tone.tile}`}>{tile}</span>
            <span className="min-w-0 flex-1">
                {label && <span className={`block text-[10px] font-black uppercase tracking-wider ${tone.ink}`}>{label}</span>}
                <span className="block text-sm font-bold leading-snug text-slate-900">{title}</span>
                {sub && <span className="block text-xs leading-snug text-slate-500">{sub}</span>}
                {children}
            </span>
            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full shadow-sm ${tone.arrow}`}><ChevronRight size={16} /></span>
        </Link>
    </li>
);

/* ── Recommended topics ───────────────────────────────────────────────── */
const TOPIC_ICON = [
    [/tell me about yourself/i, User], [/star method/i, Star], [/^project story/i, Code2],
    [/aws|cloud|azure|docker|kubernetes/i, Cloud], [/communicat|speak|present/i, MessageSquare]
];
export function TopicsCard({ topics = [] }) {
    const taken = new Set();
    return (
        <CardShell icon={Target} iconClass="bg-gradient-to-br from-violet-500 to-indigo-600 shadow-violet-200"
            title="Recommended topics" hint="Based on what you are learning and building."
            action={<HeadLink to="/interview/practice" tone="bg-indigo-50 text-indigo-700 hover:bg-indigo-100">View all</HeadLink>}>
            <ul className="stagger space-y-2">
                {topics.map((t, i) => {
                    const Icon = TOPIC_ICON.find(([re]) => re.test(t.topic))?.[1];
                    const tone = toneFor(t.topic, i);
                    return <Row key={t.topic} to="/interview/practice" tone={tone} tile={Icon ? <Icon size={20} /> : monogram(t.topic, taken)} title={t.topic} sub={t.reason} />;
                })}
                {!topics.length && <li className="rounded-2xl bg-slate-50 px-3 py-4 text-center text-sm text-slate-500">Topics appear once you have started a course or a roadmap.</li>}
            </ul>
            <Link to="/interview/practice" className="iv-card mt-3 flex items-center gap-3 rounded-2xl bg-gradient-to-r from-violet-100 to-indigo-100 px-3 py-2.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/80 text-violet-600"><Lightbulb size={18} /></span>
                <span className="min-w-0 flex-1 text-sm font-bold text-violet-800">Focus on these topics to boost your confidence!</span>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-600 text-white shadow-sm"><ArrowRight size={15} /></span>
            </Link>
        </CardShell>
    );
}

/* ── Practice questions ───────────────────────────────────────────────── */
const CATEGORY_ICON = { hr: Users, technical: Code2, project: FolderOpen, behavioral: MessageSquare, situational: Compass };
export function PracticeCard({ practice }) {
    return (
        <CardShell icon={FileText} iconClass="bg-gradient-to-br from-sky-500 to-blue-600 shadow-sky-200"
            title="Practice questions" hint={`${practice.practiced} of ${practice.total} practised · +5 XP each`}
            action={<HeadLink to="/interview/practice" tone="bg-sky-50 text-sky-700 hover:bg-sky-100">View all</HeadLink>}>
            <ul className="stagger space-y-2">
                {practice.sample.map((q, i) => {
                    const Icon = CATEGORY_ICON[q.category] || Sparkles; const tone = toneFor(q.topic || q.category, i + 2);
                    return <Row key={q.id} to="/interview/practice" tone={tone} tile={<Icon size={20} />} label={q.topic} title={q.question} />;
                })}
                {!practice.sample.length && <li className="rounded-2xl bg-emerald-50 px-3 py-4 text-center text-sm font-semibold text-emerald-800">You have practised every question. Take a mock interview!</li>}
            </ul>
            <div className="@container relative mt-3 overflow-hidden rounded-2xl bg-gradient-to-br from-sky-100 to-indigo-100 p-4">
                <div className="relative z-10 @[20rem]:max-w-[62%]">
                    <p className="text-lg font-black leading-tight text-slate-900">More questions,<br />more confidence!</p>
                    <p className="mt-1 text-xs text-slate-600">Open the practice bank and keep improving.</p>
                    <Link to="/interview/practice" className="mt-3 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-blue-200 transition-transform hover:-translate-y-0.5">
                        Open the practice bank <ArrowRight size={15} />
                    </Link>
                </div>
                <span className="pointer-events-none absolute -bottom-2 right-1 hidden @[20rem]:block"><Illustration name="thinking" pose="thinking" height={124} /></span>
            </div>
        </CardShell>
    );
}

/* ── Areas to improve ─────────────────────────────────────────────────── */
const AREA_ICON = [
    [/expand|brief|one-?line|longer|fuller|detail/i, Target], [/technical|code|implement|node|express|python|sql|java|react/i, Code2],
    [/aws|cloud|azure|docker|deploy/i, Cloud], [/out loud|structure|situation|communicat|speak|answer/i, MessageSquare],
    [/practi|question|course|learn/i, Star]
];
export function ImproveCard({ readiness, last, fmtDate }) {
    const series = readiness.history.map((h) => h.score || 0);
    return (
        <CardShell icon={TrendingUp} iconClass="bg-gradient-to-br from-amber-400 to-orange-500 shadow-amber-200"
            title="Areas to improve" hint={last ? `Last interview: ${last.score}% on ${fmtDate(last.date)}` : 'Take your first mock interview to get feedback.'}
            action={last ? <HeadLink to={`/interview/report/${last.id}`} tone="bg-amber-50 text-amber-700 hover:bg-amber-100">View report</HeadLink> : null}>
            {series.length > 1 ? (
                <div className="mb-3 overflow-hidden rounded-2xl bg-amber-50/70 p-4">
                    <div className="flex items-start justify-between gap-2">
                        <div>
                            <p className="text-xl font-black leading-none text-slate-900">{series.length} interviews</p>
                            <p className="mt-1 text-xs font-semibold text-slate-600">Best score {readiness.best}%</p>
                        </div>
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-2.5 py-1 text-[11px] font-black text-white shadow"><Star size={11} fill="currentColor" /> {readiness.best}%</span>
                    </div>
                    <div className="mt-2 flex justify-end"><Sparkline values={series} color="#f59e0b" width={180} height={44} /></div>
                </div>
            ) : (
                <div className="mb-3 rounded-2xl border border-dashed border-amber-200 bg-amber-50/60 p-4 text-center">
                    <span className="text-2xl" aria-hidden="true">🎤</span>
                    <p className="mt-1 text-sm font-bold text-slate-900">{series.length === 1 ? 'One interview so far' : 'No mock interview yet'}</p>
                    <p className="text-xs text-slate-500">Take another and this becomes a trend you can watch.</p>
                </div>
            )}
            <ul className="stagger space-y-2">
                {readiness.areas.map((a, i) => {
                    const Icon = AREA_ICON.find(([re]) => re.test(a))?.[1] || Sparkles; const tone = toneFor(a, i + 4);
                    return <Row key={i} to={last ? `/interview/report/${last.id}` : '/interview/practice'} tone={tone} tile={<Icon size={20} />} title={a} />;
                })}
            </ul>
            <div className="mt-3 flex items-center gap-3 rounded-2xl bg-gradient-to-r from-amber-100 to-orange-100 px-3 py-2.5">
                <span className="text-2xl" aria-hidden="true"><Trophy size={26} className="text-amber-500" /></span>
                <p className="text-sm font-bold leading-snug text-amber-900">Every practice session<br /><span className="text-orange-700">brings you closer to your dream job!</span></p>
            </div>
        </CardShell>
    );
}
