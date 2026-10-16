/**
 * Interview Ready — the dashboard.
 *
 * A welcome banner with the student's readiness, one tip from the
 * interviewer, the five parts of that readiness, the interview picker, and
 * underneath the practice bank, recommended topics and what to work on.
 */
import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    Mic, Target, ArrowRight, Award, Lightbulb, X, BarChart3,
    MessageCircle, Code2, Heart, BookOpen, Users, Crown, Briefcase, ChevronDown, FolderOpen,
    MessageSquare, Star, Gauge
} from 'lucide-react';
import Dropdown from '../components/Dropdown';
import { AuthContext } from '../context/AuthContext';
import { interviewApi, TYPE_META, fmtDate, ROLES, ROLE_OTHER as OTHER } from './api';
import { Btn, ErrorBox, Analyzing } from '../learningbio/ui';
import { TopicsCard, PracticeCard, ImproveCard } from './DashboardCards';
import { ScoreRing, CountUp } from './ui';
import { TIPS } from './tips';
import { useReturnScroll } from './scrollMemory';
import { useXpRule } from '../context/useRewards';

/* Each part of readiness gets its own colour, so the row is read at a glance. */
const PARTS = {
    communication: { icon: MessageCircle, tint: 'bg-violet-100 text-violet-600', bar: 'from-violet-500 to-indigo-500' },
    technical: { icon: Code2, tint: 'bg-amber-100 text-amber-600', bar: 'from-amber-400 to-orange-500' },
    problemSolving: { icon: Lightbulb, tint: 'bg-sky-100 text-sky-600', bar: 'from-sky-400 to-blue-500' },
    confidence: { icon: Heart, tint: 'bg-rose-100 text-rose-500', bar: 'from-rose-400 to-pink-500' },
    practice: { icon: Target, tint: 'bg-emerald-100 text-emerald-600', bar: 'from-emerald-400 to-teal-500' }
};
/* The four focused interviews, in the order the picker shows them. */
const TYPE_LOOK = {
    hr: { icon: Users, card: 'border-sky-100 bg-sky-50/70 hover:border-sky-300', tile: 'bg-sky-100 text-sky-600', ring: 'ring-sky-300' },
    technical: { icon: Code2, card: 'border-violet-100 bg-violet-50/70 hover:border-violet-300', tile: 'bg-violet-100 text-violet-600', ring: 'ring-violet-300' },
    project: { icon: FolderOpen, card: 'border-emerald-100 bg-emerald-50/70 hover:border-emerald-300', tile: 'bg-emerald-100 text-emerald-600', ring: 'ring-emerald-300' },
    behavioral: { icon: MessageSquare, card: 'border-orange-100 bg-orange-50/70 hover:border-orange-300', tile: 'bg-orange-100 text-orange-600', ring: 'ring-orange-300' }
};
const FOCUSED = ['hr', 'technical', 'project', 'behavioral'];
/* Roles offered in the picker. The student's own goal is added on top. */
const TIP_DISMISS_KEY = 'iv:tip-dismissed';

/** One part of readiness: coloured icon, label, percentage, and a bar that fills on load. */
const PartRow = ({ part, label, value }) => {
    const look = PARTS[part] || PARTS.practice; const Icon = look.icon;
    const [width, setWidth] = useState(0);
    useEffect(() => { const t = setTimeout(() => setWidth(value), 120); return () => clearTimeout(t); }, [value]);
    return (
        <div className="flex items-center gap-3">
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${look.tint}`}><Icon size={18} /></span>
            <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm font-bold text-slate-800">{label}</span>
                    <span className="text-sm font-black tabular-nums text-slate-900">{value}%</span>
                </div>
                <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
                    <div className={`h-full rounded-full bg-gradient-to-r ${look.bar} transition-[width] duration-1000 ease-out`} style={{ width: `${width}%` }} />
                </div>
            </div>
        </div>
    );
};

const StatTile = ({ icon: Icon, value, label, tone }) => (
    <div className="lift rounded-2xl bg-slate-50 px-2 py-3 text-center">
        <Icon size={20} className={`mx-auto ${tone}`} />
        <p className="mt-1 text-lg font-black leading-none text-slate-900">{value}</p>
        <p className="mt-1 text-[11px] font-semibold text-slate-500">{label}</p>
    </div>
);

const CardHead = ({ icon: Icon, tint, title, children, action }) => (
    <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tint}`}><Icon size={20} /></span>
            <div>
                <h2 className="text-lg font-black text-slate-900">{title}</h2>
                {children && <p className="mt-0.5 max-w-md text-xs text-slate-500">{children}</p>}
            </div>
        </div>
        {action}
    </div>
);

export default function InterviewDashboard() {
    const navigate = useNavigate();
    const { user } = useContext(AuthContext);
    // "Every round earns XP" only while a mock interview really pays some:
    // not while Rewards is locked (null) or the admin's rule is 0.
    const paysXp = useXpRule('mock_interview') > 0;
    // The last answer is kept on this device and shown at once on the next
    // visit, while the fresh one is fetched; so the section does not sit on a
    // loader every time it is opened, however far away the server is.
    const cacheKey = `interview:dashboard:${user?._id || user?.id || user?.cardNumber || ''}`;
    const [data, setData] = useState(() => {
        try {
            const cached = JSON.parse(localStorage.getItem(cacheKey) || 'null');
            return cached?.readiness && cached?.practice && cached?.student ? cached : undefined;
        } catch { return undefined; }   // a bad or missing cache is simply no cache
    });
    const [error, setError] = useState(null);
    const [type, setType] = useState('full');
    const [role, setRole] = useState(() => data?.student?.goal || '');
    const [customRole, setCustomRole] = useState('');
    const [starting, setStarting] = useState(false);
    const [tipOpen, setTipOpen] = useState(() => { try { return localStorage.getItem(TIP_DISMISS_KEY) !== new Date().toDateString(); } catch { return true; } });
    // One tip a day, fixed for the day so it does not change as you look at it.
    const [tip] = useState(() => TIPS[Math.floor(Date.now() / 86_400_000) % TIPS.length]);

    const load = useCallback(() => interviewApi.dashboard().then((d) => {
        setData(d); setRole((r) => r || d.student.goal || ROLES[0]); setError(null);
        try { localStorage.setItem(cacheKey, JSON.stringify(d)); } catch { /* private mode */ }
    }).catch((e) => { setError(e); setData((cur) => cur || null); }), [cacheKey]);
    useEffect(() => { load(); }, [load]);
    // Back from a practice, report or history page lands where the student left off.
    const rootRef = useReturnScroll(Boolean(data));

    const roleOptions = useMemo(() => {
        const goal = data?.student.goal?.trim();
        return goal && !ROLES.some((x) => x.toLowerCase() === goal.toLowerCase()) ? [goal, ...ROLES] : ROLES;
    }, [data]);
    const chosenRole = role === OTHER ? customRole.trim() : role;

    // The interview itself starts on the introduction screen, where the microphone is explained and asked for.
    const start = (which = type) => { setStarting(true); navigate(`/interview/mock/new?type=${encodeURIComponent(which)}&role=${encodeURIComponent(chosenRole)}`); };
    const dismissTip = () => { setTipOpen(false); try { localStorage.setItem(TIP_DISMISS_KEY, new Date().toDateString()); } catch { /* private mode */ } };

    if (data === undefined) return <div className="mx-auto max-w-6xl pb-12"><Analyzing label="Checking your interview readiness…" /></div>;
    if (!data) return <div className="mx-auto max-w-6xl pb-12"><ErrorBox error={error} onRetry={load} /></div>;
    const r = data.readiness;
    const last = r.history[r.history.length - 1];
    // The readiness card's status, in the ring's own colours (ScoreRing), and
    // how far along the way to the badge (asked 2026-10-15, "make it better").
    const stage = r.prep.mocks === 0 ? { word: 'Not started', chip: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400', bar: 'from-slate-300 to-slate-400' }
        : r.overall >= 75 ? { word: 'Ready to go', chip: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500', bar: 'from-emerald-500 to-teal-500' }
            : r.overall >= 50 ? { word: 'Halfway there', chip: 'bg-indigo-50 text-indigo-700', dot: 'bg-indigo-500', bar: 'from-indigo-500 to-violet-500' }
                : { word: 'Warming up', chip: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500', bar: 'from-amber-400 to-orange-500' };
    const toBadge = r.badge.earned ? 100 : Math.min(100, Math.round((r.overall / (r.badge.threshold || 75)) * 100));
    const cheer = r.prep.mocks === 0 ? ['🎯', 'Ready when you are.', 'Your first interview takes ten minutes.']
        : r.best >= 75 ? ['🏆', 'Excellent!', "You're interview ready."]
            : ['🏆', 'Keep going!', "You're doing great!"];

    return (
        <div ref={rootRef} className="mx-auto max-w-6xl space-y-5 pb-12 animate-fade-in">
            {/* ── Welcome ─────────────────────────────────────────── */}
            <header className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-100 via-indigo-50 to-sky-100 p-5 shadow-sm ring-1 ring-indigo-100 sm:p-7">
                <span aria-hidden="true" className="pointer-events-none absolute -right-10 top-10 h-56 w-56 rounded-full bg-white/50 blur-3xl" />
                <span aria-hidden="true" className="pointer-events-none absolute -left-16 -bottom-16 h-56 w-56 rounded-full bg-violet-200/40 blur-3xl" />
                {/* Two columns — greeting, readiness — from xl, not lg: at 1024
                    the sidebar leaves about 700px, and the greeting was squeezed
                    to a word per line. Below xl it stacks, as on a tablet. */}
                <div className="relative grid items-center gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
                    <div>
                        {/* Phones: the name as a small greeting line, then a
                            headline that cannot break "interview-ready" across
                            two lines the way the desktop one did at 360px. */}
                        <div className="sm:hidden">
                            <p className="text-xl font-black text-slate-900">Hi <span className="bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">{data.student.firstName}</span> 👋</p>
                            <h1 className="mt-1 text-[1.6rem] font-black leading-[1.15] text-slate-900">
                                Get <span className="whitespace-nowrap">interview-ready</span>{data.student.goal ? <> for <span className="text-violet-600">{data.student.goal}!</span></> : '!'}
                            </h1>
                            <p className="mt-2 text-sm text-slate-600">Practise with an AI mock interview.</p>
                        </div>
                        <h1 className="hidden text-[2rem] font-black leading-tight text-slate-900 sm:block">
                            Hi {data.student.firstName},<br />Let&apos;s get you interview-ready{data.student.goal ? <><br />for <span className="text-violet-600">{data.student.goal}!</span></> : '!'}
                        </h1>
                        <p className="mt-3 hidden max-w-md text-sm text-slate-600 sm:block">Learn, practise, take an AI mock interview, get feedback, improve, and retake.{paysXp ? ' Every round earns XP! 🚀' : ''}</p>
                        <p className="mt-4 hidden sm:inline-flex items-center gap-2.5 rounded-2xl bg-white/80 px-4 py-2.5 text-sm font-bold text-indigo-700 shadow-sm ring-1 ring-white">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600"><Lightbulb size={15} /></span>
                            &ldquo;You&apos;re one step closer to your dream job!&rdquo;
                        </p>
                    </div>

                    {/* Where the student stands at a glance: the ring, a status in
                        its colours, and the way to the badge as a bar to fill. */}
                    <div className="rounded-3xl bg-white p-4 shadow-lg shadow-indigo-100 ring-1 ring-indigo-50 sm:p-5">
                        <div className="flex items-center gap-4">
                            <div className="shrink-0 sm:hidden"><ScoreRing value={r.overall} size={84} stroke={8} label="Ready" /></div>
                            <div className="hidden shrink-0 sm:block"><ScoreRing value={r.overall} size={104} stroke={9} label="Readiness" /></div>
                            <div className="min-w-0">
                                <p className="text-base font-black leading-tight text-slate-900"><span className="sm:hidden">Interview Readiness</span><span className="hidden sm:inline">Interview<br />Readiness</span></p>
                                <span className={`mt-1.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-black ${stage.chip}`}>
                                    <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${stage.dot}`} />{stage.word}
                                </span>
                                {/* Under 50 after a mock, no line (asked 2026-10-15). */}
                                {(r.prep.mocks === 0 || r.overall >= 50) && <p className="mt-1.5 text-xs text-slate-500">{r.prep.mocks === 0 ? 'Take your first mock interview: your readiness comes from how you do.' : r.overall >= 75 ? 'You are ready — book that interview.' : 'Getting there. A mock interview will lift this.'}</p>}
                            </div>
                        </div>
                        <div className="mt-4 rounded-2xl bg-slate-50 px-3 py-2.5 ring-1 ring-slate-100">
                            <div className="flex items-center justify-between gap-2 text-[11px] font-bold">
                                <span className="flex min-w-0 items-center gap-1.5 text-slate-700">
                                    <Award size={14} className={r.badge.earned ? 'shrink-0 text-amber-500' : 'shrink-0 text-slate-400'} />
                                    <span className="truncate">Interview Ready badge</span>
                                </span>
                                <span className={`shrink-0 tabular-nums ${r.badge.earned ? 'text-emerald-600' : 'text-slate-500'}`}>{r.badge.earned ? 'Earned!' : <><span className="font-black text-slate-900">{r.overall}</span> / {r.badge.threshold}%</>}</span>
                            </div>
                            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200/80" role="progressbar" aria-label="Progress to the Interview Ready badge" aria-valuemin={0} aria-valuemax={100} aria-valuenow={toBadge}>
                                <div className={`h-full rounded-full bg-gradient-to-r ${r.badge.earned ? 'from-emerald-500 to-teal-500' : stage.bar} transition-[width] duration-700 ease-out`} style={{ width: `${Math.max(toBadge, 3)}%` }} />
                            </div>
                        </div>
                        <Btn tone="primary" onClick={() => start()} loading={starting} className="group mt-4 w-full gap-2 !rounded-2xl !py-3 !text-base">
                            Let&apos;s Do This <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
                        </Btn>
                    </div>
                </div>
            </header>

            {error && <ErrorBox error={error} onRetry={load} />}

            {/* ── Tip of the day ──────────────────────────────────── */}
            {tipOpen && (
                <div className="flex items-start gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/60 px-4 py-3 animate-fade-in-up">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600"><Lightbulb size={15} /></span>
                    <p className="min-w-0 flex-1 text-sm text-slate-700">
                        <span className="mr-2 text-[10px] font-black uppercase tracking-[0.16em] text-indigo-600">AI tip for you</span>
                        &ldquo;{tip}&rdquo;
                    </p>
                    <button type="button" onClick={dismissTip} aria-label="Hide this tip" className="shrink-0 rounded-lg p-1 text-slate-400 hover:bg-white hover:text-slate-600"><X size={16} /></button>
                </div>
            )}

            <div className="grid gap-5 lg:grid-cols-2">
                {/* ── Readiness ───────────────────────────────────── */}
                <section className="lift flex flex-col rounded-3xl border border-slate-200 bg-white p-5 shadow-sm animate-fade-in-up sm:p-6">
                    {/* After the first mock, no line under the title (asked 2026-10-15). */}
                    <CardHead icon={BarChart3} tint="bg-indigo-100 text-indigo-600" title="Your Readiness">{r.prep.mocks === 0 ? 'All at 0% until your first mock interview, then worked out from how you do in it.' : null}</CardHead>
                    <div className="space-y-3.5">{r.breakdown.map((b) => <PartRow key={b.key} part={b.key} label={b.label} value={b.value} />)}</div>
                    <div className="stagger mt-5 grid grid-cols-3 gap-2">
                        <StatTile icon={BookOpen} tone="text-indigo-500" value={<CountUp value={r.prep.total} />} label="Practice questions" />
                        <StatTile icon={Users} tone="text-violet-500" value={<CountUp value={r.prep.mocks} />} label="Mock interviews" />
                        <StatTile icon={Crown} tone="text-amber-500" value={r.best ? <CountUp value={r.best} suffix="%" /> : '—'} label="Best score" />
                    </div>
                    <p className="mt-4 flex items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-violet-50 to-indigo-50 px-4 py-2 text-sm ring-1 ring-indigo-100">
                        <span aria-hidden="true">{cheer[0]}</span> <span className="lb-script text-base text-violet-600">{cheer[1]}</span> <span className="text-slate-600">{cheer[2]}</span>
                    </p>
                </section>

                {/* ── Take a mock interview ───────────────────────── */}
                <section className="flex flex-col rounded-3xl border border-slate-200 bg-white p-5 shadow-sm animate-fade-in-up sm:p-6">
                    <CardHead icon={Mic} tint="bg-violet-100 text-violet-600" title="Take a Mock Interview"
                        action={<Link to="/interview/history" className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100">View all <ArrowRight size={13} /></Link>}>
                        {/* Not on a phone (asked 2026-10-15, "remove it"): squeezed beside
                            "View all" the sentence ran to four lines, and the short one
                            that replaced it went too. */}
                        <span className="hidden sm:inline">The AI interviewer asks about your real skills and projects, and follows up on your answers.</span>
                    </CardHead>

                    <div className="stagger grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                        {FOCUSED.map((id) => {
                            const m = TYPE_META[id]; const look = TYPE_LOOK[id]; const Icon = look.icon; const on = type === id;
                            return (
                                <button key={id} type="button" onClick={() => setType(id)} aria-pressed={on}
                                    className={`iv-card flex items-center gap-2.5 rounded-2xl border p-2.5 text-left ${look.card} ${on ? `ring-2 ${look.ring} shadow-md` : ''}`}>
                                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${look.tile}`}><Icon size={17} /></span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate text-[13px] font-black leading-tight text-slate-900">{m.label}</span>
                                        {/* Not on a phone (asked 2026-10-15): the name says it. */}
                                        <span className="mt-0.5 hidden text-[11px] leading-snug text-slate-500 sm:block">{m.hint}</span>
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    <button type="button" onClick={() => setType('full')} aria-pressed={type === 'full'}
                        className={`iv-card mt-2.5 flex items-center gap-3 rounded-2xl border p-3 text-left ${type === 'full' ? 'border-indigo-300 bg-indigo-50 shadow-md ring-2 ring-indigo-300' : 'border-indigo-100 bg-indigo-50/50 hover:border-indigo-300'}`}>
                        <span className="text-2xl" aria-hidden="true">🏆</span>
                        <span className="min-w-0 flex-1">
                            <span className="flex flex-wrap items-center gap-2">
                                <span className="text-sm font-black text-slate-900">Full Mock Interview</span>
                                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-amber-700">Recommended</span>
                            </span>
                            <span className="block text-[11px] text-slate-500">All of the above, start to finish.</span>
                        </span>
                    </button>

                    <div className="mt-4">
                        <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Job role</span>
                        <div className="relative mt-1.5">
                            <Dropdown
                                label="Job role" icon={Briefcase}
                                value={roleOptions.includes(role) ? role : OTHER} onChange={setRole}
                                options={[...roleOptions.map((x) => ({ value: x, label: x })), { value: OTHER, label: 'Other role…' }]}
                                className="relative w-full appearance-none rounded-2xl border border-slate-200 bg-white py-3 pl-10 pr-9 text-sm font-semibold text-slate-800 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
                        </div>
                        {role === OTHER && (
                            <input autoFocus value={customRole} onChange={(e) => setCustomRole(e.target.value)} maxLength={80} placeholder="Type the role you are preparing for"
                                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
                        )}
                    </div>

                    <button type="button" onClick={() => start()} disabled={starting}
                        className="group relative mt-4 flex w-full items-center justify-center gap-2.5 overflow-hidden rounded-full bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 px-6 py-3.5 text-base font-black text-white shadow-lg shadow-indigo-300 transition-all hover:-translate-y-0.5 hover:shadow-xl disabled:opacity-60">
                        <Mic size={19} /> {starting ? 'Preparing your interviewer…' : 'Start Mock Interview'}
                        <span className="ml-1 flex h-7 w-7 items-center justify-center rounded-full bg-white/25 transition-transform group-hover:translate-x-0.5"><ArrowRight size={15} /></span>
                    </button>
                    <p className="mt-2 text-center text-[11px] text-slate-400">{data.ai.configured ? 'A voice interview: the AI interviewer speaks, you answer out loud.' : 'AI is not configured; the built-in interviewer will run the voice interview.'}</p>
                </section>
            </div>

            {/* ── What you get ────────────────────────────────────── */}
            <div className="flex flex-wrap items-center justify-center gap-x-7 gap-y-3 rounded-3xl bg-gradient-to-r from-violet-50 via-indigo-50 to-sky-50 px-5 py-3.5 ring-1 ring-indigo-100">
                {[[Gauge, 'text-indigo-500', 'A real interview, by voice'], [BarChart3, 'text-violet-500', 'Instant feedback and suggestions'], [Star, 'text-amber-500', paysXp ? 'Earn XP and unlock achievements' : 'Track your progress over time']].map(([Icon, tone, label]) => (
                    <span key={label} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700"><Icon size={18} className={tone} /> {label}</span>
                ))}
                <span className="lb-script text-base text-violet-500">You Can Do It! ♡</span>
            </div>

            <div className="grid gap-5 lg:grid-cols-3">
                <TopicsCard topics={data.topics} />
                <PracticeCard practice={data.practice} />
                <ImproveCard readiness={r} last={last} fmtDate={fmtDate} />
            </div>
        </div>
    );
}
