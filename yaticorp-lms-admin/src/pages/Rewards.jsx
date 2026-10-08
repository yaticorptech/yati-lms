/**
 * Rewards administration: the rulebook (XP, levels, streak milestones,
 * leaderboard rewards, XP conversion, starting credit, games), the badge
 * catalogue, wallets, the money ledger, per-student
 * history and adjustments, and the integrity checks.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import {
    Gift, Settings2, Award, Wallet, ReceiptText, ArrowDownToLine, ShieldCheck, Lock, Unlock, Loader2, Plus, Trash2, Save, Search,
    RefreshCw, CheckCircle2, XCircle, AlertTriangle, Flame, Trophy, Coins, Users, ChevronRight, X, Gamepad2
} from 'lucide-react';
import Select from '../components/Select';

const INPUT = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/40';
const LABEL = 'mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500';
const BTN = 'inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-indigo-600/20 transition-colors hover:bg-indigo-700 disabled:opacity-50';
const BTN2 = 'inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50';

const TABS = [
    { id: 'overview', label: 'Overview', icon: Gift },
    { id: 'rules', label: 'Reward rules', icon: Settings2 },
    { id: 'badges', label: 'Badges', icon: Award },
    { id: 'wallets', label: 'Wallets', icon: Wallet },
    { id: 'transactions', label: 'Transactions', icon: ReceiptText },
    { id: 'audit', label: 'Fraud checks', icon: ShieldCheck }
];

const money = (n, c = 'INR') => `${c === 'INR' ? '₹' : `${c} `}${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const num = (n) => Number(n || 0).toLocaleString('en-IN');
const when = (d) => new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const STATUS = { completed: 'bg-emerald-100 text-emerald-700', pending: 'bg-amber-100 text-amber-700', approved: 'bg-sky-100 text-sky-700', paid: 'bg-emerald-100 text-emerald-700', failed: 'bg-red-100 text-red-700', cancelled: 'bg-slate-100 text-slate-600', rejected: 'bg-red-100 text-red-700', reversed: 'bg-slate-100 text-slate-600' };
const Pill = ({ s }) => <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${STATUS[s] || 'bg-slate-100 text-slate-600'}`}>{s}</span>;
// Table cells: a little tighter until xl, so the tables fit a tablet or a laptop beside the sidebar.
const TH = 'px-4 xl:px-6 py-4 font-semibold';
const TD = 'px-4 xl:px-6 py-4';
const TYPE_LABEL = { school_student: 'School student', college_student: 'College student', adult: 'Adult', professional: 'Professional', instructor: 'Instructor' };

const Stat = ({ icon: Icon, label, value, sub, tone = 'indigo' }) => {
    const tones = { indigo: 'bg-indigo-100 text-indigo-600', emerald: 'bg-emerald-100 text-emerald-600', amber: 'bg-amber-100 text-amber-600', slate: 'bg-slate-100 text-slate-600', rose: 'bg-rose-100 text-rose-600' };
    return (
        // Compact on a phone, where two share a row; from sm up, as before.
        <div className="min-w-0 bg-white rounded-2xl border border-slate-100 p-3 sm:p-5 shadow-sm">
            <div className="flex items-start gap-2 mb-1.5 sm:items-center sm:mb-2">
                <span className={`shrink-0 p-1 sm:p-1.5 rounded-lg ${tones[tone]}`}><Icon className="h-3.5 w-3.5 sm:h-[15px] sm:w-[15px]" /></span>
                <p className="min-w-0 text-[10px] sm:text-xs font-bold leading-snug text-slate-500 uppercase tracking-wide sm:tracking-wider">{label}</p>
            </div>
            {/* A lakh-sized rupee figure is wider than a quarter-width card; it may break rather than spill. */}
            <p className="text-xl sm:text-2xl 2xl:text-3xl font-bold text-slate-800 tabular-nums [overflow-wrap:anywhere]">{value}</p>
            {sub && <p className="text-[11px] sm:text-xs leading-snug text-slate-500 mt-1">{sub}</p>}
        </div>
    );
};

const Banner = ({ kind, children, onClose }) => (
    <div className={`flex items-start gap-2 rounded-xl border p-3 text-sm font-medium ${kind === 'error' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
        {kind === 'error' ? <XCircle size={16} className="mt-0.5 shrink-0" /> : <CheckCircle2 size={16} className="mt-0.5 shrink-0" />}
        <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">{children}</span>
        {onClose && <button onClick={onClose} className="shrink-0"><X size={14} /></button>}
    </div>
);

export default function Rewards() {
    const [tab, setTab] = useState('overview');
    const [features, setFeatures] = useState(null);
    const [saving, setSaving] = useState(false);
    const [userId, setUserId] = useState(null);

    const loadSettings = useCallback(() => api.get('/admin/settings').then((r) => setFeatures(r.data)).catch(() => {}), []);
    useEffect(() => { loadSettings(); }, [loadSettings]);
    const toggle = async () => {
        setSaving(true);
        try { const r = await api.put('/admin/settings', { isRewardsEnabled: !(features?.isRewardsEnabled !== false) }); setFeatures(r.data); }
        catch (e) { alert(e.response?.data?.message || 'Failed to update'); }
        finally { setSaving(false); }
    };
    const enabled = features ? features.isRewardsEnabled !== false : true;

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    <span className="p-3 rounded-2xl bg-pink-100 text-pink-600"><Gift size={22} /></span>
                    <div>
                        <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight">Rewards</h1>
                        <p className="text-sm text-slate-500">Streaks, XP, leaderboard, badges, reward points and the wallet.</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <span className={`text-[10px] uppercase font-black tracking-wider px-2 py-0.5 rounded ${enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{enabled ? 'Unlocked' : 'Locked'}</span>
                    <button onClick={toggle} disabled={saving || !features} className={`shrink-0 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50 ${enabled ? 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}>
                        {enabled ? <Lock size={16} /> : <Unlock size={16} />}{saving ? 'Saving…' : enabled ? 'Lock for students' : 'Unlock'}
                    </button>
                </div>
            </div>

            {!enabled && <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 font-medium">Rewards are locked. Students do not see the cards, leaderboard or wallet, and no activity earns XP or points while it stays locked. Everything below still works.</div>}

            <div className="flex border-b border-slate-200 overflow-x-auto gap-1">
                {TABS.map((t) => (
                    <button key={t.id} onClick={() => setTab(t.id)} className={`inline-flex items-center gap-1.5 px-4 sm:px-5 py-2.5 font-bold text-[13px] whitespace-nowrap transition-colors border-b-2 rounded-t-lg ${tab === t.id ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50' : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}><t.icon size={14} /> {t.label}</button>
                ))}
            </div>

            {tab === 'overview' && <Overview onOpenUser={setUserId} />}
            {tab === 'rules' && <Rules />}
            {tab === 'badges' && <Badges />}
            {tab === 'wallets' && <Wallets onOpenUser={setUserId} />}
            {tab === 'transactions' && <Transactions onOpenUser={setUserId} />}
            {tab === 'audit' && <Audit onOpenUser={setUserId} />}

            {userId && <UserDrawer userId={userId} onClose={() => setUserId(null)} />}
        </div>
    );
}

// ── Overview ────────────────────────────────────────────────────────────────
function Overview() {
    const [d, setD] = useState(null);
    const [err, setErr] = useState(null);
    useEffect(() => { api.get('/rewards/admin/overview').then((r) => setD(r.data)).catch((e) => setErr(e.response?.data?.message || 'Failed to load')); }, []);
    if (err) return <Banner kind="error">{err}</Banner>;
    if (!d) return <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">{[0, 1, 2, 3].map((i) => <div key={i} className="animate-pulse h-24 sm:h-28 bg-slate-100 rounded-2xl" />)}</div>;
    // Every one of the last 14 days, zero where nothing happened — the server
    // only returns days that had activity, and drawing just those made a quiet
    // week look like a busy fortnight.
    const byDay = Object.fromEntries(d.activityByDay.map((a) => [a._id, a.n]));
    const days = Array.from({ length: 14 }, (_, i) => {
        const dt = new Date(); dt.setDate(dt.getDate() - (13 - i));
        const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
        return { key, n: byDay[key] || 0, label: dt.getDate() };
    });
    const max = Math.max(1, ...days.map((a) => a.n));
    const activityTotal = days.reduce((t, a) => t + a.n, 0);
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
                <Stat icon={Wallet} label="Wallet liability" value={money(d.wallets.available + d.wallets.pending)} sub={`${money(d.wallets.pending)} on hold · ${num(d.wallets.count)} wallets`} tone="emerald" />
                <Stat icon={ReceiptText} label="Spent in the LMS" value={money(d.wallets.spent)} sub="Courses and wallet-rule features" tone="amber" />
                <Stat icon={Coins} label="Reward points held" value={num(d.wallets.points)} sub="A score that unlocks badges — never money" tone="rose" />
                <Stat icon={Flame} label="Active streaks" value={num(d.activeStreaks)} sub={`${num(d.badgesUnlocked)} badges unlocked · ${num(d.xpLast7Days.xp)} XP this week`} tone="indigo" />
            </div>
            <div className="grid gap-4 xl:grid-cols-2">
                <div className="min-w-0 bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm">
                    <div className="mb-1 flex items-baseline justify-between gap-3">
                        <p className="font-bold text-slate-800">Learning activity — last 14 days</p>
                        <span className="shrink-0 text-xs font-semibold text-slate-500 tabular-nums">{num(activityTotal)} total</span>
                    </div>
                    <p className="text-xs text-slate-500 mb-4">Lessons, quizzes, courses, certificates and tasks that counted.</p>
                    {activityTotal === 0 ? <p className="flex h-32 items-center justify-center text-sm text-slate-400 italic">No activity in the last 14 days.</p> : (
                        <div className="flex items-end gap-1 h-32">
                            {days.map((a) => (
                                <div key={a.key} className="flex-1 flex h-full flex-col items-center justify-end gap-1" title={`${a.key}: ${a.n}`}>
                                    <div className={`w-full rounded-t-md ${a.n ? 'bg-indigo-500' : 'bg-slate-100'}`} style={{ height: a.n ? `${(a.n / max) * 100}%` : 3 }} />
                                    <span className="text-[9px] text-slate-400 tabular-nums">{a.label}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <div className="min-w-0 bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm">
                    <p className="font-bold text-slate-800 mb-1">Reward points issued, by source</p>
                    <p className="text-xs text-slate-500 mb-4">Every point traces back to a claim.</p>
                    {d.pointsIssuedBySource.length === 0 ? <p className="text-sm text-slate-400 italic">Nothing issued yet.</p> : (
                        <ul className="space-y-2">
                            {[...d.pointsIssuedBySource].sort((a, b) => b.points - a.points).map((s, _, sorted) => (
                                <li key={s._id} className="flex items-center gap-2 sm:gap-3 text-sm">
                                    <span className="w-24 sm:w-36 shrink-0 truncate font-semibold text-slate-600 capitalize" title={s._id.replace(/_/g, ' ')}>{s._id.replace(/_/g, ' ')}</span>
                                    <div className="min-w-8 flex-1 h-2 rounded-full bg-slate-100 overflow-hidden"><div className="h-full bg-pink-500 rounded-full" style={{ width: `${(s.points / Math.max(1, sorted[0].points)) * 100}%` }} /></div>
                                    <span className="shrink-0 text-right font-bold tabular-nums">{num(s.points)} <span className="text-xs text-slate-400">({s.n})</span></span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
}

// ── Rules ───────────────────────────────────────────────────────────────────
// Every way a student earns XP, by area, with where it happens. All of them are
// read live by the server (rewards configService.xpFor / activityService), so
// a change here is what the next award pays.
// Features paid for from the student's wallet balance. 0 = free. Charged on the
// server (rewards walletRuleService) when the feature is used, refused when the
// balance is short, and refunded if the feature then fails. Every entry is a
// real hook on the server: a rule is live while it is in the rulebook, and the
// optional ones are added with "Add wallet rule".
const WALLET_GROUPS = [
    {
        title: 'Downloads and tools', rules: [
            ['download_resume', 'Download resume', 'Each download of the ATS resume PDF.'],
            ['upload_resume', 'Upload a resume', 'Each resume upload — on the profile or the Jobs page.'],
            ['download_bio', 'Download learning bio', 'Each download of the Learning Bio PDF.'],
            ['start_global_quiz', 'Start the Global Quiz', 'Once per quiz, when the attempt opens.'],
            ['find_job', 'Find Job', 'Opening a job listing from Career Match or Hidden Opportunities; once per job.'],
            ['apply_part_time', 'Apply for a part-time job', 'Once per job applied for.'],
            ['rebuild_roadmap', 'Rebuild roadmap', 'Each rebuild from Career Path settings. The first roadmap is free.'],
            ['start_mock_interview', 'Start a mock interview', 'Each new AI mock interview.'],
            ['find_scholarship', 'Find scholarships', 'Each "Find scholarships for me" search on the Grants page.'],
            ['generate_ideas', 'Rebuild the Ideas list', 'Each rebuild of the Career Path Ideas (recommendations) list.'],
            ['download_certificate', 'Download a certificate', 'Each certificate PDF, from the course or the profile.']
        ]
    },
    {
        title: 'AI features', rules: [
            ['ask_mentor', 'Ask the AI mentor', 'Each message sent to the Career Path mentor.'],
            ['build_task_lesson', 'Build a task lesson', 'Each lesson built for a task — including "Different video" and switching language.'],
            ['generate_study_material', 'Build a skill study pack', 'Each study pack built on the Skills page.'],
            ['add_extra_task', 'Add another task', 'Each extra task added to Today\'s Plan after the day\'s plan is done.'],
            ['regenerate_bio', 'Rewrite the learning bio', 'Each manual rewrite of the Learning Bio.']
        ]
    }
];

const XP_GROUPS = [
    {
        title: 'Courses', rules: [
            ['lesson_complete', 'Complete a lesson', 'Each lesson, the first time it is completed.'],
            ['quiz_complete', 'Complete a quiz', 'Submitting a course quiz.'],
            ['quiz_pass', 'Pass a quiz', 'On top of completing it, when the quiz is passed.'],
            ['course_complete', 'Complete a course', 'When a course reaches 100%.'],
            ['certificate_earned', 'Earn a certificate', 'The first certificate for each course.'],
            ['assignment_complete', 'Complete an assignment', 'Kept for assignments; nothing in the LMS awards it yet.']
        ]
    },
    {
        title: 'Career Path', rules: [
            ['career_task', 'Complete a Career Path task', "Finishing a task in Today's Plan."],
            ['career_task_quiz', 'Pass a Career Path task quiz', "First pass of a task's study quiz."],
            ['skill_quiz', 'Pass a skill quiz', 'First pass of a quiz on the Skills page.'],
            ['daily_activity', 'Solve the daily activity', "A right answer to the day's puzzle or question."]
        ]
    },
    {
        title: 'Interview Ready', rules: [
            ['interview_practice', 'Practise an interview question', 'Each question, the first time it is practised.'],
            ['interview_prep', 'Prepare for interviews', 'One-time bonus after five practised questions.'],
            ['mock_interview', 'Complete a mock interview', 'Each finished AI mock interview.'],
            ['interview_improved', 'Beat your best interview score', 'A mock interview that tops the previous best.'],
            ['interview_challenge', 'Complete the weekly interview challenge', 'A full interview at the challenge score, once a week.']
        ]
    },
    {
        title: 'Community and opportunities', rules: [
            ['forum_post', 'Post in the community forum', 'Once a day, however many posts.'],
            ['forum_comment', 'Reply in the community forum', 'Once a day, however many replies.'],
            ['resume_upload', 'Upload a resume', 'Once, the first upload.'],
            ['part_time_apply', 'Apply for a part-time job', 'Once per job applied for.'],
            ['scholarship_search', 'Search for scholarships', 'Once a day.']
        ]
    },
    {
        title: 'Global Quiz', rules: [
            ['global_quiz_win', 'Win the Global Quiz', 'Once per quiz, for a final score at or above the win score (set below).'],
            ['global_quiz_complete', 'Finish the Global Quiz', 'Once a day, whatever the score.']
        ]
    },
    {
        title: 'Progress and profile', rules: [
            ['roadmap_milestone', 'Complete a roadmap phase', 'Once per phase, when its milestone badge is issued.'],
            ['task_video_watched', 'Watch a task lesson video', 'Once per task, when the video has been watched through.'],
            ['profile_picture', 'Add a profile photo', 'Once, the first photo.'],
            ['achievement_added', 'Add an achievement', 'Once a day, however many are added.']
        ]
    }
];

/**
 * The rules in force, by group, each with its amount and a remove button,
 * and "Add rule" for any catalogued rule not in force. Only hooks the server
 * really has are in the catalogue, so an added rule always does something.
 */
function RuleList({ groups, values, prefix, step = 1, onSet, onRemove, addLabel }) {
    const [adding, setAdding] = useState(false);
    const [pick, setPick] = useState('');
    const [amount, setAmount] = useState('');
    const all = groups.flatMap((g) => g.rules.map(([k, label]) => ({ k, label, group: g.title })));
    const missing = all.filter((r) => !(r.k in (values || {})));
    const add = () => {
        if (!pick) return;
        onSet(pick, Math.max(0, Number(amount) || 0));
        setAdding(false); setPick(''); setAmount('');
    };
    return (
        <div className="space-y-5">
            {groups.map((g) => {
                const live = g.rules.filter(([k]) => k in (values || {}));
                if (!live.length) return null;
                return (
                    <div key={g.title}>
                        {groups.length > 1 && <p className="mb-2 text-xs font-black uppercase tracking-wider text-indigo-500">{g.title}</p>}
                        <div className="grid sm:grid-cols-2 gap-3">
                            {live.map(([k, label, hint]) => (
                                <div key={k}>
                                    <div className="mb-1 flex items-start justify-between gap-2">
                                        <label className={`${LABEL} !mb-0`}>{label}</label>
                                        <button type="button" onClick={() => onRemove(k)} title="Remove this rule" aria-label={`Remove ${label}`}
                                            className="-mt-1 rounded-md p-1 text-slate-300 transition-colors hover:bg-rose-50 hover:text-rose-600"><Trash2 size={13} /></button>
                                    </div>
                                    <div className="relative">
                                        {prefix && <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">{prefix}</span>}
                                        <input type="number" min="0" step={step} value={values[k] ?? 0} onChange={(e) => onSet(k, Number(e.target.value))} className={`${INPUT} ${prefix ? (prefix.length > 1 ? 'pl-12' : 'pl-7') : ''}`} />
                                    </div>
                                    <p className="mt-1 text-[11px] leading-snug text-slate-400">{hint}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })}
            {adding ? (
                <div className="flex flex-wrap items-end gap-2 rounded-xl border border-dashed border-indigo-200 bg-indigo-50/40 p-3">
                    <div className="min-w-[12rem] flex-1">
                        <label className={LABEL}>Rule</label>
                        <Select value={pick} onChange={(e) => setPick(e.target.value)} className={INPUT}>
                            <option value="">Choose…</option>
                            {/* The panel's Select reads <option>s only (no <optgroup>): the group is in the label. */}
                            {missing.map((r) => <option key={r.k} value={r.k}>{groups.length > 1 ? `${r.label} — ${r.group}` : r.label}</option>)}
                        </Select>
                    </div>
                    <div className="w-28">
                        <label className={LABEL}>{prefix ? `Amount (${prefix})` : 'XP'}</label>
                        <input type="number" min="0" step={step} value={amount} onChange={(e) => setAmount(e.target.value)} className={INPUT} placeholder="0" />
                    </div>
                    <button type="button" onClick={add} disabled={!pick} className={BTN2}><Plus size={14} /> Add</button>
                    <button type="button" onClick={() => setAdding(false)} className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-500 hover:text-slate-700">Cancel</button>
                </div>
            ) : (
                <button type="button" onClick={() => setAdding(true)} disabled={!missing.length} className={BTN2} title={missing.length ? '' : 'Every available rule is already in use'}>
                    <Plus size={14} /> {addLabel}
                </button>
            )}
            {!missing.length && <p className="text-[11px] text-slate-400">Every available rule is in use.</p>}
        </div>
    );
}

// One section of the rulebook. At module scope on purpose: declared inside
// Rules it was a new component on every render, so React remounted every
// input below it on each keystroke and the field lost focus after one digit.
// Tones are written out in full; `bg-${tone}-100` is never generated by Tailwind.
const CARD_TONES = { indigo: 'bg-indigo-100 text-indigo-600', emerald: 'bg-emerald-100 text-emerald-600', amber: 'bg-amber-100 text-amber-600', rose: 'bg-rose-100 text-rose-600' };
const Card = ({ icon: Icon, title, sub, children, tone = 'indigo' }) => (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center gap-3 bg-slate-50">
            <div className={`shrink-0 p-2 rounded-lg ${CARD_TONES[tone] || CARD_TONES.indigo}`}><Icon size={18} /></div>
            <div className="min-w-0"><h2 className="font-bold text-slate-800">{title}</h2><p className="text-xs text-slate-500">{sub}</p></div>
        </div>
        <div className="p-4 sm:p-5">{children}</div>
    </div>
);

function Rules() {
    const [cfg, setCfg] = useState(null);
    const [busy, setBusy] = useState(false);
    // Rules removed since the last save; sent as removeRules so they stop for everyone.
    const [removed, setRemoved] = useState({ xp: [], wallet: [] });
    const [msg, setMsg] = useState(null);
    // The rulebook as last saved, to tell whether anything on screen differs.
    const [saved, setSaved] = useState(null);
    useEffect(() => { api.get('/rewards/admin/config').then((r) => { setCfg(r.data); setSaved(JSON.stringify(r.data)); }).catch((e) => setMsg({ kind: 'error', text: e.response?.data?.message || 'Failed to load' })); }, []);
    if (!cfg) return <div className="animate-pulse h-64 bg-slate-100 rounded-2xl" />;
    const dirty = JSON.stringify(cfg) !== saved || removed.xp.length > 0 || removed.wallet.length > 0;
    const discard = () => { setCfg(JSON.parse(saved)); setRemoved({ xp: [], wallet: [] }); setMsg(null); };

    const set = (path, value) => setCfg((c) => { const n = structuredClone(c); let o = n; const ks = path.split('.'); for (let i = 0; i < ks.length - 1; i++) o = o[ks[i]]; o[ks[ks.length - 1]] = value; return n; });
    const setRule = (map, key, value) => {
        setCfg((c) => ({ ...c, [map]: { ...(c[map] || {}), [key]: value } }));
        setRemoved((r) => ({ ...r, [map === 'xpRules' ? 'xp' : 'wallet']: r[map === 'xpRules' ? 'xp' : 'wallet'].filter((k) => k !== key) }));
    };
    const removeRule = (map, key) => {
        setCfg((c) => { const next = { ...(c[map] || {}) }; delete next[key]; return { ...c, [map]: next }; });
        const side = map === 'xpRules' ? 'xp' : 'wallet';
        setRemoved((r) => ({ ...r, [side]: r[side].includes(key) ? r[side] : [...r[side], key] }));
    };
    const save = async () => {
        setBusy(true); setMsg(null);
        try {
            const r = await api.put('/rewards/admin/config', { xpRules: cfg.xpRules, walletRules: cfg.walletRules, removeRules: removed, levelThresholds: cfg.levelThresholds, streakMilestones: cfg.streakMilestones, leaderboardRewards: cfg.leaderboardRewards, conversion: cfg.conversion, limits: cfg.limits, walletAccess: cfg.walletAccess, startingCredit: cfg.startingCredit, games: cfg.games, globalQuiz: cfg.globalQuiz });
            setCfg(r.data); setSaved(JSON.stringify(r.data)); setRemoved({ xp: [], wallet: [] }); setMsg({ kind: 'ok', text: 'Reward rules saved. They apply to every student from the next award or use.' });
        } catch (e) { setMsg({ kind: 'error', text: e.response?.data?.message || 'Failed to save' }); }
        finally { setBusy(false); }
    };
    // Save, in the page flow at the top and again at the bottom of the rules —
    // never pinned over the cards. Says whether anything is unsaved, and Save
    // is only live when it is. A value, not a component, so it never remounts.
    const saveBar = (
        <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-2">
            <span className="flex items-center gap-1.5 text-xs font-semibold">
                {dirty
                    ? <><span className="h-1.5 w-1.5 rounded-full bg-amber-500" /><span className="text-amber-700">Unsaved changes</span></>
                    : <><CheckCircle2 size={13} className="text-emerald-500" /><span className="text-slate-400">All changes saved</span></>}
            </span>
            {dirty && <button type="button" onClick={discard} disabled={busy} className="rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50">Discard</button>}
            <button type="button" onClick={save} disabled={busy || !dirty}
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none">
                {busy ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Save
            </button>
        </div>
    );
    const cur = cfg.conversion.currency;

    return (
        <div className="space-y-5">
            {msg && <Banner kind={msg.kind === 'error' ? 'error' : 'ok'} onClose={() => setMsg(null)}>{msg.text}</Banner>}
            {saveBar}
            <div className="grid gap-5 xl:grid-cols-2">
                <Card icon={Coins} title="XP rules" sub="XP is learning progress: it drives levels, the leaderboard and badges, and every full block converts into wallet money (XP → money, below).">
                    <RuleList groups={XP_GROUPS} values={cfg.xpRules} onSet={(k, v) => setRule('xpRules', k, v)} onRemove={(k) => removeRule('xpRules', k)} addLabel="Add XP rule" />
                    <p className="mt-4 text-[11px] leading-snug text-slate-500">Streak milestones and Brain games pay their own XP (below). A removed rule pays nothing to anyone; a rule under "Add XP rule" pays nothing until it is added.</p>
                </Card>
                <Card icon={Wallet} title="Wallet rules" sub={`What a feature costs from the student's wallet balance, in ${cur}. 0 = free. Applies to every student from their next use; a short balance is refused, and a feature that fails is refunded.`} tone="emerald">
                    <RuleList groups={WALLET_GROUPS} values={cfg.walletRules || {}} prefix={cur === 'INR' ? '₹' : cur} step={0.5} onSet={(k, v) => setRule('walletRules', k, v)} onRemove={(k) => removeRule('walletRules', k)} addLabel="Add wallet rule" />
                </Card>
                <Card icon={Trophy} title="Global Quiz" sub="What counts as winning. A win pays the &quot;Win the Global Quiz&quot; XP rule once per quiz; what starting a quiz costs is the &quot;Start the Global Quiz&quot; wallet rule." tone="amber">
                    <div className="max-w-xs">
                        <label className={LABEL}>Win score (%)</label>
                        <input type="number" min="0" max="100" value={cfg.globalQuiz?.winScore ?? 60} onChange={(e) => set('globalQuiz.winScore', Number(e.target.value))} className={INPUT} />
                    </div>
                    <p className="text-[11px] text-slate-500 mt-2">A student who finishes with at least this score has won. Currently {num(cfg.xpRules?.global_quiz_win ?? 0)} XP; starting costs {money(cfg.walletRules?.start_global_quiz ?? 0, cur)}.</p>
                </Card>
                <Card icon={Gamepad2} title="Brain games" sub="XP a level pays for its best result, once per star reached — replaying at the same stars pays nothing. Play is limited per student per day." tone="indigo">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="col-span-2 sm:col-span-1">
                            <label className={LABEL}>Minutes a day</label>
                            <input type="number" min="0" value={cfg.games?.dailyMinutes ?? 15} onChange={(e) => set('games.dailyMinutes', Number(e.target.value))} className={INPUT} />
                        </div>
                        {[['xpOneStar', '1 star'], ['xpTwoStars', '2 stars'], ['xpThreeStars', '3 stars']].map(([k, label]) => (
                            <div key={k}>
                                <label className={LABEL}>XP · {label}</label>
                                <input type="number" min="0" value={cfg.games?.[k] ?? 0} onChange={(e) => set(`games.${k}`, Number(e.target.value))} className={INPUT} />
                            </div>
                        ))}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-2">0 stars pays 0 XP. Minutes a day = 0 means no limit. A level first finished at 2 stars and later at 3 pays the 2-star XP, then the difference.</p>
                </Card>
                <Card icon={Trophy} title="Level thresholds" sub="XP at which each level begins. Level 1 is always 0." tone="amber">
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                        {cfg.levelThresholds.map((t, i) => (
                            <div key={i}><label className={LABEL}>Level {i + 1}</label><input type="number" min="0" disabled={i === 0} value={t} onChange={(e) => set(`levelThresholds.${i}`, Number(e.target.value))} className={INPUT} /></div>
                        ))}
                    </div>
                    <div className="flex flex-wrap gap-2 mt-3">
                        <button className={BTN2} onClick={() => set('levelThresholds', [...cfg.levelThresholds, cfg.levelThresholds[cfg.levelThresholds.length - 1] + Math.max(100, cfg.levelThresholds[cfg.levelThresholds.length - 1] - cfg.levelThresholds[cfg.levelThresholds.length - 2])])}><Plus size={14} /> Add level</button>
                        <button className={BTN2} disabled={cfg.levelThresholds.length <= 2} onClick={() => set('levelThresholds', cfg.levelThresholds.slice(0, -1))}><Trash2 size={14} /> Remove last</button>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">Beyond the last level, each further level costs the same as the last gap.</p>
                </Card>
                <Card icon={Flame} title="Streak milestones" sub="Reached by consecutive days with a meaningful activity. Each pays reward points and XP once per run." tone="amber">
                    <div className="space-y-2">
                        {cfg.streakMilestones.map((m, i) => (
                            <div key={i} className="grid grid-cols-2 sm:grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end rounded-xl border border-slate-100 p-2 sm:border-0 sm:p-0">
                                <div><label className={LABEL}>Days</label><input type="number" min="1" value={m.days} onChange={(e) => set(`streakMilestones.${i}.days`, Number(e.target.value))} className={INPUT} /></div>
                                <div><label className={LABEL}>Reward points</label><input type="number" min="0" value={m.rewardPoints} onChange={(e) => set(`streakMilestones.${i}.rewardPoints`, Number(e.target.value))} className={INPUT} /></div>
                                <div><label className={LABEL}>XP</label><input type="number" min="0" value={m.xp} onChange={(e) => set(`streakMilestones.${i}.xp`, Number(e.target.value))} className={INPUT} /></div>
                                <button className="col-span-2 justify-self-end sm:col-span-1 rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600" onClick={() => set('streakMilestones', cfg.streakMilestones.filter((_, j) => j !== i))} title="Remove"><Trash2 size={15} /></button>
                            </div>
                        ))}
                        <button className={BTN2} onClick={() => set('streakMilestones', [...cfg.streakMilestones, { days: (cfg.streakMilestones.at(-1)?.days || 0) + 30, rewardPoints: 0, xp: 0 }])}><Plus size={14} /> Add milestone</button>
                    </div>
                </Card>
                <Card icon={Trophy} title="Leaderboard rewards" sub="Paid automatically when a week or month closes, once per student per period." tone="emerald">
                    {['weekly', 'monthly'].map((p) => (
                        <div key={p} className="mb-4">
                            <p className="text-sm font-bold text-slate-700 capitalize mb-2">{p}</p>
                            <div className="space-y-2">
                                {cfg.leaderboardRewards[p].map((r, i) => (
                                    <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end">
                                        <div><label className={LABEL}>Rank #</label><input type="number" min="1" value={r.rank} onChange={(e) => set(`leaderboardRewards.${p}.${i}.rank`, Number(e.target.value))} className={INPUT} /></div>
                                        <div><label className={LABEL}>Reward points</label><input type="number" min="0" value={r.rewardPoints} onChange={(e) => set(`leaderboardRewards.${p}.${i}.rewardPoints`, Number(e.target.value))} className={INPUT} /></div>
                                        <button className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600" onClick={() => set(`leaderboardRewards.${p}`, cfg.leaderboardRewards[p].filter((_, j) => j !== i))}><Trash2 size={15} /></button>
                                    </div>
                                ))}
                                <button className={BTN2} onClick={() => set(`leaderboardRewards.${p}`, [...cfg.leaderboardRewards[p], { rank: cfg.leaderboardRewards[p].length + 1, rewardPoints: 0 }])}><Plus size={14} /> Add rank</button>
                            </div>
                        </div>
                    ))}
                </Card>
                <Card icon={Gift} title="XP → money" sub="Each time a student's XP balance reaches the XP amount, it is deducted and the value added to their wallet — automatically, for every account type. Their level and rank use lifetime XP and never drop. Reward points never become money." tone="rose">
                    <div className="grid sm:grid-cols-2 gap-3">
                        <div><label className={LABEL}>XP per unit</label><input type="number" min="1" value={cfg.conversion.pointsPerUnit} onChange={(e) => set('conversion.pointsPerUnit', Number(e.target.value))} className={INPUT} /></div>
                        <div><label className={LABEL}>Unit value ({cur})</label><input type="number" min="0" step="0.01" value={cfg.conversion.unitValue} onChange={(e) => set('conversion.unitValue', Number(e.target.value))} className={INPUT} /></div>
                        <div><label className={LABEL}>Currency</label><input value={cfg.conversion.currency} maxLength={3} onChange={(e) => set('conversion.currency', e.target.value.toUpperCase())} className={INPUT} /></div>
                    </div>
                    <p className="text-sm text-slate-600 mt-3 font-medium">Every {num(cfg.conversion.pointsPerUnit)} XP → −{num(cfg.conversion.pointsPerUnit)} XP from the balance, +{money(cfg.conversion.unitValue, cur)} to the wallet. A student with {num(cfg.conversion.pointsPerUnit * 2.5)} XP converts twice and keeps {num(cfg.conversion.pointsPerUnit / 2)} XP on the balance. Set the value to 0 to stop converting.</p>
                </Card>
                <Card icon={Wallet} title="Starting wallet credit" sub="Given once to each student who registers from now on — accounts that existed before are not credited. It pays for courses and wallet-rule features." tone="emerald">
                    <div className="max-w-xs">
                        <label className={LABEL}>Amount ({cur})</label>
                        <input type="number" min="0" step="1" value={cfg.startingCredit ?? 0} onChange={(e) => set('startingCredit', Number(e.target.value))} className={INPUT} />
                    </div>
                    <p className="text-[11px] text-slate-500 mt-2">A change applies to students who register after it; credits already given stay as they are. 0 = no starting credit.</p>
                </Card>
            </div>
            {saveBar}
        </div>
    );
}

const BadgeStatus = ({ active }) => <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>{active ? 'active' : 'inactive'}</span>;

// ── Badges ──────────────────────────────────────────────────────────────────
const METRIC_LABEL = { lessons: 'Lessons completed', quizzes: 'Quizzes completed', perfect_quizzes: 'Perfect quizzes', courses: 'Courses completed', certificates: 'Certificates earned', xp: 'Total XP', longest_streak: 'Longest streak (days)', current_streak: 'Current streak (days)', top10_weeks: 'Weeks in the top 10', level: 'Level reached', mock_interviews: 'Mock interviews completed', interview_readiness: 'Interview readiness score', reward_points: 'Reward points earned' };
const EMPTY_BADGE = { key: '', title: '', description: '', emoji: '🎖️', metric: 'reward_points', target: 500, rewardPoints: 0, order: 100, isActive: true };

function Badges() {
    const [data, setData] = useState(null);
    const [edit, setEdit] = useState(null);
    const [busy, setBusy] = useState(false);
    const [msg, setMsg] = useState(null);
    const load = useCallback(() => api.get('/rewards/admin/badges').then((r) => setData(r.data)).catch((e) => setMsg({ kind: 'error', text: e.response?.data?.message || 'Failed to load' })), []);
    useEffect(() => { load(); }, [load]);
    const save = async (e) => {
        e.preventDefault(); setBusy(true); setMsg(null);
        try {
            if (edit._id) await api.put(`/rewards/admin/badges/${edit._id}`, edit); else await api.post('/rewards/admin/badges', edit);
            setEdit(null); await load(); setMsg({ kind: 'ok', text: 'Badge saved.' });
        } catch (err) { setMsg({ kind: 'error', text: err.response?.data?.message || 'Failed to save badge' }); }
        finally { setBusy(false); }
    };
    const deactivate = async (b) => {
        if (!window.confirm(`Deactivate "${b.title}"? Students who already have it keep it.`)) return;
        try { await api.delete(`/rewards/admin/badges/${b._id}`); await load(); } catch (err) { setMsg({ kind: 'error', text: err.response?.data?.message || 'Failed' }); }
    };
    if (!data) return <div className="animate-pulse h-64 bg-slate-100 rounded-2xl" />;
    return (
        <div className="space-y-4">
            {msg && <Banner kind={msg.kind === 'error' ? 'error' : 'ok'} onClose={() => setMsg(null)}>{msg.text}</Banner>}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-slate-500">{data.badges.length} badges · a badge unlocks when its metric reaches the target. Reward points unlock badges (metric “Reward points earned”) — badges don&apos;t pay points.</p>
                <button className={`${BTN} shrink-0 self-start sm:self-auto`} onClick={() => setEdit({ ...EMPTY_BADGE })}><Plus size={15} /> New badge</button>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[680px]">
                        <thead><tr className="bg-slate-50 border-b border-slate-200 text-sm tracking-wide text-slate-500 uppercase">
                            <th className={TH}>Badge</th><th className={TH}>Unlocks when</th><th className={TH}>Unlocked by</th><th className={TH}>Status</th><th className={`${TH} text-right`}>Actions</th>
                        </tr></thead>
                        <tbody className="divide-y divide-slate-100">
                            {data.badges.map((b) => (
                                <tr key={b._id} className="hover:bg-slate-50/50">
                                    <td className={TD}><div className="flex items-center gap-3"><span className="text-2xl">{b.emoji}</span><div className="min-w-0"><div className="font-medium text-slate-800">{b.title}</div><div className="text-xs text-slate-500">{b.description}</div><div className="text-[10px] font-mono text-slate-400 break-all">{b.key}</div></div></div></td>
                                    <td className={`${TD} text-sm text-slate-600`}>{METRIC_LABEL[b.metric] || b.metric} ≥ <strong>{num(b.target)}</strong></td>
                                    <td className={`${TD} text-sm text-slate-600`}>{num(b.unlockedCount)} students</td>
                                    <td className={TD}><BadgeStatus active={b.isActive} /></td>
                                    <td className={`${TD} text-right space-x-3 whitespace-nowrap`}>
                                        <button onClick={() => setEdit({ ...b })} className="text-indigo-600 hover:text-indigo-900 font-medium text-sm">Edit</button>
                                        {b.isActive && <button onClick={() => deactivate(b)} className="text-red-500 hover:text-red-700 font-medium text-sm">Deactivate</button>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {/* Phones: one card per badge, same information. */}
                <ul className="divide-y divide-slate-100 md:hidden">
                    {data.badges.map((b) => (
                        <li key={b._id} className="p-4">
                            <div className="flex items-start gap-3">
                                <span className="text-2xl">{b.emoji}</span>
                                <div className="min-w-0 flex-1">
                                    <p className="font-medium text-slate-800 break-words">{b.title}</p>
                                    {b.description && <p className="text-xs text-slate-500">{b.description}</p>}
                                    <p className="text-[10px] font-mono text-slate-400 break-all">{b.key}</p>
                                </div>
                                <span className="shrink-0"><BadgeStatus active={b.isActive} /></span>
                            </div>
                            <p className="mt-2 text-sm text-slate-600">{METRIC_LABEL[b.metric] || b.metric} ≥ <strong>{num(b.target)}</strong> · {num(b.unlockedCount)} students</p>
                            <div className="mt-2 flex gap-4">
                                <button onClick={() => setEdit({ ...b })} className="text-indigo-600 hover:text-indigo-900 font-medium text-sm">Edit</button>
                                {b.isActive && <button onClick={() => deactivate(b)} className="text-red-500 hover:text-red-700 font-medium text-sm">Deactivate</button>}
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
            {edit && (
                <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/60 backdrop-blur-sm p-4 sm:p-6 sm:pt-20 overflow-y-auto" onClick={() => setEdit(null)}>
                    <form onSubmit={save} onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-6.5rem)]" role="dialog" aria-modal="true">
                        <div className="shrink-0 p-4 sm:p-5 border-b border-slate-200 bg-slate-50 font-bold text-lg flex justify-between"><span>{edit._id ? 'Edit badge' : 'New badge'}</span><button type="button" onClick={() => setEdit(null)} className="text-slate-400 hover:text-slate-600">✕</button></div>
                        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5 grid sm:grid-cols-2 gap-3">
                            <div><label className={LABEL}>Key</label><input value={edit.key} disabled={!!edit._id} onChange={(e) => setEdit({ ...edit, key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') })} className={INPUT} placeholder="quiz_master" required /></div>
                            <div><label className={LABEL}>Emoji</label><input value={edit.emoji} onChange={(e) => setEdit({ ...edit, emoji: e.target.value })} className={INPUT} /></div>
                            <div className="sm:col-span-2"><label className={LABEL}>Title</label><input value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} className={INPUT} required /></div>
                            <div className="sm:col-span-2"><label className={LABEL}>Description</label><input value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} className={INPUT} /></div>
                            <div><label className={LABEL}>Metric</label><Select value={edit.metric} onChange={(e) => setEdit({ ...edit, metric: e.target.value })} className={INPUT}>{data.metrics.map((m) => <option key={m} value={m}>{METRIC_LABEL[m] || m}</option>)}</Select></div>
                            <div><label className={LABEL}>Target</label><input type="number" min="1" value={edit.target} onChange={(e) => setEdit({ ...edit, target: Number(e.target.value) })} className={INPUT} required /></div>
                            <div><label className={LABEL}>Order</label><input type="number" value={edit.order} onChange={(e) => setEdit({ ...edit, order: Number(e.target.value) })} className={INPUT} /></div>
                            <label className="sm:col-span-2 flex items-center gap-2 text-sm font-semibold text-slate-700"><input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-indigo-600" checked={edit.isActive !== false} onChange={(e) => setEdit({ ...edit, isActive: e.target.checked })} /> Active</label>
                        </div>
                        <div className="shrink-0 flex flex-wrap justify-end gap-3 p-4 sm:p-5 border-t border-slate-100"><button type="button" onClick={() => setEdit(null)} className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-lg">Cancel</button><button type="submit" disabled={busy} className={BTN}>{busy && <Loader2 size={14} className="animate-spin" />} Save</button></div>
                    </form>
                </div>
            )}
        </div>
    );
}

// ── Wallets ─────────────────────────────────────────────────────────────────
// What each student's wallet holds and where it came from: the balance (and
// how much of it is the spend-only starting credit), their XP — lifetime and
// still waiting to convert — what has been converted and what that paid, and
// what has been spent in the LMS.
function Wallets({ onOpenUser }) {
    const [q, setQ] = useState('');
    const [data, setData] = useState(null);
    const [rate, setRate] = useState(null);
    useEffect(() => { const t = setTimeout(() => api.get('/rewards/admin/wallets', { params: { q: q || undefined, limit: 100 } }).then((r) => setData(r.data)).catch(() => setData({ rows: [], total: 0 })), 250); return () => clearTimeout(t); }, [q]);
    // The admin's XP → money rate, for "how far to the next conversion".
    useEffect(() => { api.get('/rewards/admin/config').then((r) => setRate(r.data?.conversion || null)).catch(() => {}); }, []);
    const unit = Number(rate?.pointsPerUnit) || 0;
    const t = data?.totals;
    const XpCell = ({ w }) => (
        <div className="min-w-0">
            <p className="font-bold tabular-nums text-slate-800">{num(w.xp)} <span className="text-xs font-semibold text-slate-400">lifetime</span></p>
            <p className="text-xs tabular-nums text-amber-700">{num(w.xpBalance)} waiting to convert</p>
            {unit > 0 && (
                <div className="mt-1 h-1.5 w-28 overflow-hidden rounded-full bg-amber-100" title={`${num(Math.max(0, unit - w.xpBalance))} XP to the next ${money(rate.unitValue, rate.currency)}`}>
                    <div className="h-full rounded-full bg-amber-500" style={{ width: `${Math.min(100, (w.xpBalance / unit) * 100)}%` }} />
                </div>
            )}
        </div>
    );
    return (
        <div className="space-y-4">
            {/* Across every wallet that matches the search. */}
            {t && (
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <Stat icon={Wallet} label="Wallet balances" value={money(t.available)} sub={`${money(t.startingCredit)} of it starting credit`} tone="emerald" />
                    <Stat icon={Coins} label="XP converted" value={num(t.xpConverted)} sub={unit ? `${num(unit)} XP = ${money(rate.unitValue, rate.currency)}` : 'XP turned into money'} tone="amber" />
                    <Stat icon={Gift} label="Paid from XP" value={money(t.fromXp)} sub="Added to wallets by conversion" tone="indigo" />
                    <Stat icon={ReceiptText} label="Spent in the LMS" value={money(t.spent)} sub="Courses and wallet-rule features" tone="rose" />
                </div>
            )}
            <div className="relative max-w-md"><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, email or card number…" className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-600 text-sm shadow-sm" /><Search className="absolute left-3.5 top-3 text-slate-400" size={18} /></div>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                {!data ? <div className="p-8 text-center text-slate-500">Loading…</div> : (
                    <>
                    <div className="hidden md:block overflow-x-auto"><table className="w-full text-left border-collapse min-w-[860px]">
                        <thead><tr className="bg-slate-50 border-b border-slate-200 text-sm tracking-wide text-slate-500 uppercase"><th className={TH}>Student</th><th className={TH}>Wallet balance</th><th className={TH}>XP</th><th className={TH}>XP converted</th><th className={TH}>Spent</th><th className={`${TH} text-right`}></th></tr></thead>
                        <tbody className="divide-y divide-slate-100">
                            {data.rows.length === 0 && <tr><td colSpan="6" className="px-6 py-12 text-center text-slate-400 italic">No wallets yet.</td></tr>}
                            {data.rows.map((w) => (
                                <tr key={w._id} onClick={() => w.userId && onOpenUser(w.userId._id)} className="hover:bg-slate-50/50 cursor-pointer">
                                    <td className={TD}><div className="font-medium text-slate-800">{w.userId?.name || 'Deleted user'}</div><div className="text-sm text-slate-500 break-all">{w.userId?.email}</div><div className="text-xs text-slate-400">{TYPE_LABEL[w.userId?.accountType] || 'School student'} · Level {w.userId?.level || 1}</div></td>
                                    <td className={TD}><div className="font-bold tabular-nums text-emerald-700 whitespace-nowrap">{money(w.available, w.currency)}</div>{w.startingCredit > 0 && <div className="text-xs text-slate-500 whitespace-nowrap">{money(w.startingCredit, w.currency)} starting credit</div>}</td>
                                    <td className={TD}><XpCell w={w} /></td>
                                    <td className={TD}><div className="font-bold tabular-nums text-slate-800">{num(w.xpConverted)} XP</div><div className="text-xs font-semibold text-indigo-600 whitespace-nowrap">→ {money(w.fromXp, w.currency)}</div></td>
                                    <td className={`${TD} tabular-nums text-slate-600 whitespace-nowrap`}>{money(w.totalSpent, w.currency)}</td>
                                    <td className={`${TD} text-right`}><ChevronRight size={16} className="inline text-slate-400" /></td>
                                </tr>
                            ))}
                        </tbody>
                    </table></div>
                    {/* Phones: one card per wallet; the whole card opens the student. */}
                    <ul className="divide-y divide-slate-100 md:hidden">
                        {data.rows.length === 0 && <li className="px-4 py-12 text-center text-slate-400 italic">No wallets yet.</li>}
                        {data.rows.map((w) => (
                            <li key={w._id} onClick={() => w.userId && onOpenUser(w.userId._id)} className="p-4 hover:bg-slate-50/50 cursor-pointer">
                                <div className="flex items-start gap-3">
                                    <div className="min-w-0 flex-1">
                                        <p className="font-medium text-slate-800 break-words">{w.userId?.name || 'Deleted user'}</p>
                                        <p className="text-sm text-slate-500 break-all">{w.userId?.email}</p>
                                    </div>
                                    <ChevronRight size={16} className="mt-1 shrink-0 text-slate-400" />
                                </div>
                                <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 rounded-xl bg-slate-50 p-3 text-sm ring-1 ring-slate-100">
                                    <div className="min-w-0"><dt className={LABEL}>Balance</dt><dd className="font-bold tabular-nums text-emerald-700 break-words">{money(w.available, w.currency)}</dd></div>
                                    <div className="min-w-0"><dt className={LABEL}>Spent</dt><dd className="tabular-nums text-slate-600 break-words">{money(w.totalSpent, w.currency)}</dd></div>
                                    <div className="min-w-0"><dt className={LABEL}>XP (to convert)</dt><dd className="tabular-nums font-bold text-slate-800">{num(w.xp)} <span className="font-semibold text-amber-700">({num(w.xpBalance)})</span></dd></div>
                                    <div className="min-w-0"><dt className={LABEL}>Converted</dt><dd className="tabular-nums text-indigo-600 font-semibold">{num(w.xpConverted)} XP → {money(w.fromXp, w.currency)}</dd></div>
                                </dl>
                            </li>
                        ))}
                    </ul>
                    </>
                )}
            </div>
        </div>
    );
}

// ── Transactions ────────────────────────────────────────────────────────────
function Transactions({ onOpenUser }) {
    const [f, setF] = useState({ source: '', status: '', type: '' });
    const key = `${f.type}|${f.source}|${f.status}`;
    const [result, setResult] = useState({ key: null, data: null });
    useEffect(() => { api.get('/rewards/admin/transactions', { params: { ...Object.fromEntries(Object.entries(f).filter(([, v]) => v)), limit: 100 } }).then((r) => setResult({ key, data: r.data })).catch(() => setResult({ key, data: { rows: [], total: 0, sources: [], statuses: [] } })); }, [key, f]);
    const data = result.key === key ? result.data : null;
    return (
        <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
                {/* Phones: each filter takes a full row; wider screens: side by side. */}
                <Select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })} className={`${INPUT} sm:w-auto`}><option value="">All types</option><option value="credit">Credits</option><option value="debit">Debits</option></Select>
                <Select value={f.source} onChange={(e) => setF({ ...f, source: e.target.value })} className={`${INPUT} sm:w-auto`}><option value="">All sources</option>{(data?.sources || []).map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}</Select>
                <Select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })} className={`${INPUT} sm:w-auto`}><option value="">All statuses</option>{(data?.statuses || []).map((s) => <option key={s} value={s}>{s}</option>)}</Select>
                {data && <span className="self-center text-sm text-slate-500">{num(data.total)} transactions</span>}
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                {!data ? <div className="p-8 text-center text-slate-500">Loading…</div> : (
                    <>
                    <div className="hidden md:block overflow-x-auto"><table className="w-full text-left border-collapse min-w-[760px]">
                        <thead><tr className="bg-slate-50 border-b border-slate-200 text-sm tracking-wide text-slate-500 uppercase"><th className={TH}>Transaction</th><th className={TH}>Student</th><th className={TH}>Source</th><th className={TH}>Amount</th><th className={TH}>Status</th><th className={TH}>When</th></tr></thead>
                        <tbody className="divide-y divide-slate-100">
                            {data.rows.length === 0 && <tr><td colSpan="6" className="px-6 py-12 text-center text-slate-400 italic">No transactions match.</td></tr>}
                            {data.rows.map((t) => (
                                <tr key={t._id} className="hover:bg-slate-50/50">
                                    <td className={TD}><div className="font-medium text-slate-800">{t.description || '—'}</div><div className="text-[11px] font-mono text-slate-400 break-all">{t.txnId}{t.referenceKey ? ` · ${t.referenceKey}` : ''}</div></td>
                                    <td className={TD}><button onClick={() => t.userId && onOpenUser(t.userId._id)} className="text-indigo-600 hover:underline text-sm font-medium text-left">{t.userId?.name || 'Deleted user'}</button><div className="text-xs text-slate-500">{t.userId?.cardNumber}</div></td>
                                    <td className={`${TD} text-sm text-slate-600 capitalize`}>{t.source.replace(/_/g, ' ')}</td>
                                    <td className={`${TD} font-bold tabular-nums whitespace-nowrap ${t.type === 'credit' ? 'text-emerald-700' : 'text-slate-800'}`}>{t.type === 'credit' ? '+' : '−'}{money(t.amount, t.currency)}<div className="text-[10px] text-slate-400 font-normal">bal {t.balanceAfter != null ? money(t.balanceAfter, t.currency) : '—'}</div></td>
                                    <td className={TD}><Pill s={t.status} /></td>
                                    <td className={`${TD} text-sm text-slate-500`}>{when(t.createdAt)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table></div>
                    {/* Phones: one card per transaction — what, how much, who, when. */}
                    <ul className="divide-y divide-slate-100 md:hidden">
                        {data.rows.length === 0 && <li className="px-4 py-12 text-center text-slate-400 italic">No transactions match.</li>}
                        {data.rows.map((t) => (
                            <li key={t._id} className="p-4">
                                <div className="flex items-start justify-between gap-3">
                                    <p className="min-w-0 font-medium text-slate-800 break-words">{t.description || '—'}</p>
                                    <div className={`shrink-0 text-right font-bold tabular-nums ${t.type === 'credit' ? 'text-emerald-700' : 'text-slate-800'}`}>{t.type === 'credit' ? '+' : '−'}{money(t.amount, t.currency)}<div className="text-[10px] text-slate-400 font-normal">bal {t.balanceAfter != null ? money(t.balanceAfter, t.currency) : '—'}</div></div>
                                </div>
                                <p className="mt-1 text-[11px] font-mono text-slate-400 break-all">{t.txnId}{t.referenceKey ? ` · ${t.referenceKey}` : ''}</p>
                                <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                                    <Pill s={t.status} />
                                    <span className="capitalize">{t.source.replace(/_/g, ' ')}</span>
                                    <span>·</span>
                                    <span>{when(t.createdAt)}</span>
                                </div>
                                <p className="mt-1 text-sm"><button onClick={() => t.userId && onOpenUser(t.userId._id)} className="text-indigo-600 hover:underline font-medium text-left break-words">{t.userId?.name || 'Deleted user'}</button> <span className="text-xs text-slate-500">{t.userId?.cardNumber}</span></p>
                            </li>
                        ))}
                    </ul>
                    </>
                )}
            </div>
        </div>
    );
}

// ── Audit ───────────────────────────────────────────────────────────────────
/** A student in an audit line: their name, opening their history. */
const Who = ({ u, name, onOpenUser }) => (
    <button onClick={() => u && onOpenUser(String(u))} className="font-semibold text-indigo-600 hover:underline text-left">{name || 'Unknown student'}</button>
);
/** Only the figures that disagree, in words: "available ₹50 (ledger says ₹40)". */
const mismatchText = (r) => {
    if (!r.stored) return 'has ledger entries but no wallet';
    const parts = [];
    if (r.stored.available !== r.computed.available) parts.push(`available ${money(r.stored.available)} (ledger says ${money(r.computed.available)})`);
    if (r.stored.pending !== r.computed.pending) parts.push(`on hold ${money(r.stored.pending)} (ledger says ${money(r.computed.pending)})`);
    if (r.stored.rewardPoints !== r.computed.rewardPoints) parts.push(`${num(r.stored.rewardPoints)} points (ledger says ${num(r.computed.rewardPoints)})`);
    return parts.join(' · ') || 'figures differ';
};

function Audit({ onOpenUser }) {
    const [d, setD] = useState(null);
    const [busy, setBusy] = useState(false);
    const run = useCallback(() => { setD(null); return api.get('/rewards/admin/audit').then((r) => setD(r.data)).catch((e) => setD({ error: e.response?.data?.message || 'Failed' })); }, []);
    useEffect(() => { run(); }, [run]);
    const runJobs = async () => { setBusy(true); try { await api.post('/rewards/admin/jobs/run'); await run(); } finally { setBusy(false); } };
    if (!d) return <div className="animate-pulse h-48 bg-slate-100 rounded-2xl" />;
    if (d.error) return <Banner kind="error">{d.error}</Banner>;
    const Section = ({ title, rows, render }) => (
        <div className="min-w-0 bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm">
            <p className="font-bold text-slate-800 flex items-center gap-2">{rows.length ? <AlertTriangle size={16} className="text-amber-500" /> : <CheckCircle2 size={16} className="text-emerald-500" />} {title} <span className="text-xs font-semibold text-slate-400">({rows.length})</span></p>
            {rows.length > 0 && <ul className="mt-3 space-y-1 text-sm text-slate-600 [overflow-wrap:anywhere]">{rows.map((r, i) => <li key={i}>{render(r)}</li>)}</ul>}
        </div>
    );
    return (
        <div className="space-y-4">
            <div className={`rounded-xl p-4 border font-medium text-sm flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between ${d.ok ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
                <span>{d.ok ? `All clear — no duplicate rewards, no duplicate wallet references, and every one of ${num(d.walletsChecked)} wallets reconciles with its ledger.` : 'Something needs a look.'}</span>
                <div className="flex flex-wrap gap-2 sm:shrink-0"><button onClick={run} className={BTN2}><RefreshCw size={14} /> Re-run</button><button onClick={runJobs} disabled={busy} className={BTN2}>{busy ? <Loader2 size={14} className="animate-spin" /> : <Trophy size={14} />} Run leaderboard payouts now</button></div>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
                <Section title="Duplicate learning activities" rows={d.duplicateActivities} render={(r) => <><Who u={r._id.u} name={r.name} onOpenUser={onOpenUser} /> — {String(r._id.t).replace(/_/g, ' ')} <span className="font-mono text-xs text-slate-400">{r._id.r}</span> recorded {r.n}×</>} />
                <Section title="Duplicate reward claims" rows={d.duplicateClaims} render={(r) => <><Who u={r._id.u} name={r.name} onOpenUser={onOpenUser} /> — <span className="font-mono text-xs">{r._id.k}</span> paid {r.n}×</>} />
                <Section title="Duplicate wallet references" rows={d.duplicateReferences} render={(r) => <><Who u={r._id.u} name={r.name} onOpenUser={onOpenUser} /> — <span className="font-mono text-xs">{r._id.k}</span> used {r.n}×</>} />
                <Section title="Wallets that do not match their ledger" rows={d.walletMismatches} render={(r) => <><Who u={r.userId} name={r.name} onOpenUser={onOpenUser} /> — {mismatchText(r)}</>} />
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm">
                <p className="font-bold text-slate-800 mb-2">Recent scheduled runs</p>
                {d.recentJobs.length === 0 ? <p className="text-sm text-slate-400 italic">No payouts have run yet. The first weekly payout happens after the current week closes.</p> : (
                    <ul className="text-sm text-slate-600 space-y-1">{d.recentJobs.map((j) => <li key={j._id}><span className="font-mono break-all">{j.key}</span> · {when(j.createdAt)} · ranked {j.result?.ranked ?? '—'}, paid {j.result?.paid?.length ?? 0}</li>)}</ul>
                )}
            </div>
        </div>
    );
}

// ── User drawer ─────────────────────────────────────────────────────────────
function UserDrawer({ userId, onClose }) {
    const [d, setD] = useState(null);
    const [adj, setAdj] = useState({ kind: 'points', amount: '', reason: '', source: 'admin' });
    const [busy, setBusy] = useState(false);
    const [msg, setMsg] = useState(null);
    const [view, setView] = useState('money');
    const load = useCallback(() => api.get(`/rewards/admin/users/${userId}`).then((r) => setD(r.data)).catch((e) => setMsg({ kind: 'error', text: e.response?.data?.message || 'Failed to load' })), [userId]);
    useEffect(() => { load(); }, [load]);
    useEffect(() => { const k = (e) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [onClose]);
    const submit = async (e) => {
        e.preventDefault(); setBusy(true); setMsg(null);
        try { await api.post(`/rewards/admin/users/${userId}/adjust`, { ...adj, amount: Number(adj.amount) }); setMsg({ kind: 'ok', text: 'Adjustment recorded on the student\'s statement.' }); setAdj({ ...adj, amount: '', reason: '' }); await load(); }
        catch (err) { setMsg({ kind: 'error', text: err.response?.data?.message || 'Failed' }); }
        finally { setBusy(false); }
    };
    const cur = d?.wallet?.currency || 'INR';
    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/60 backdrop-blur-sm p-4 sm:p-6 overflow-y-auto" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-4xl flex flex-col max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-3rem)]" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
                <div className="shrink-0 p-4 sm:p-5 border-b border-slate-200 bg-slate-50 flex justify-between items-start gap-3">
                    <div className="min-w-0">
                        <p className="font-bold text-lg text-slate-800 break-words">{d?.user?.name || 'Student'}</p>
                        {d && <p className="text-sm text-slate-500 [overflow-wrap:anywhere]">{d.user.email} · {d.user.cardNumber} · {TYPE_LABEL[d.user.accountType] || 'School student'} · <span className={d.monetaryEnabled ? 'text-emerald-600 font-semibold' : 'text-slate-500'}>{d.monetaryEnabled ? 'cash rewards enabled' : 'learning rewards only'}</span> · <Link to="/users" className="text-indigo-600 hover:underline">edit account</Link></p>}
                    </div>
                    <button onClick={onClose} className="shrink-0 text-slate-400 hover:text-slate-600">✕</button>
                </div>
                {!d ? <div className="p-8 text-center text-slate-500">Loading…</div> : (
                    <div className="p-4 sm:p-5 overflow-y-auto space-y-5 flex-1 min-h-0">
                        {msg && <Banner kind={msg.kind === 'error' ? 'error' : 'ok'} onClose={() => setMsg(null)}>{msg.text}</Banner>}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
                            <Stat icon={Coins} label="XP · level" value={`${num(d.user.xp)} · L${d.level.level}`} sub={`${num(d.level.remaining)} XP to level ${d.level.nextLevel}`} />
                            <Stat icon={Flame} label="Streak" value={num(d.streak?.current || 0)} sub={`longest ${num(d.streak?.longest || 0)} · best weekly rank ${d.streak?.bestWeeklyRank ? `#${d.streak.bestWeeklyRank}` : '—'}`} tone="amber" />
                            <Stat icon={Wallet} label="Wallet" value={money(d.wallet?.available || 0, cur)} sub={`${money(d.wallet?.totalSpent || 0, cur)} spent in the LMS`} tone="emerald" />
                            <Stat icon={Gift} label="Reward points" value={num(d.wallet?.rewardPoints || 0)} sub={`${num(d.badges.length)} badges`} tone="rose" />
                        </div>
                        {!d.audit.ok && <Banner kind="error">This wallet does not reconcile with its ledger: stored {JSON.stringify(d.audit.stored)} vs computed {JSON.stringify(d.audit.computed)}.</Banner>}
                        <form onSubmit={submit} className="rounded-2xl border border-slate-200 p-4 grid sm:grid-cols-2 lg:grid-cols-[auto_1fr_1fr_2fr_auto] gap-3 items-end bg-slate-50/50">
                            <div><label className={LABEL}>Adjust</label><Select value={adj.kind} onChange={(e) => setAdj({ ...adj, kind: e.target.value, source: e.target.value === 'money' ? 'admin_adjustment' : 'admin' })} className={INPUT}><option value="points">Reward points</option><option value="money">Wallet money</option><option value="xp">XP</option></Select></div>
                            <div><label className={LABEL}>Source</label>
                                {adj.kind === 'points' && <Select value={adj.source} onChange={(e) => setAdj({ ...adj, source: e.target.value })} className={INPUT}><option value="admin">Bonus</option><option value="campaign">Campaign</option><option value="referral">Referral</option></Select>}
                                {adj.kind === 'money' && <Select value={adj.source} onChange={(e) => setAdj({ ...adj, source: e.target.value })} className={INPUT}><option value="admin_adjustment">Adjustment</option><option value="job_earning">Job earning</option><option value="referral_reward">Referral reward</option><option value="learning_reward">Learning reward</option><option value="leaderboard_reward">Leaderboard reward</option><option value="purchase">Purchase (debit)</option></Select>}
                                {adj.kind === 'xp' && <input disabled value="Admin" className={INPUT} />}
                            </div>
                            <div><label className={LABEL}>Amount {adj.kind === 'money' ? `(${cur}, − to debit)` : adj.kind === 'points' ? '(− to remove)' : ''}</label><input type="number" step={adj.kind === 'money' ? '0.01' : '1'} value={adj.amount} onChange={(e) => setAdj({ ...adj, amount: e.target.value })} className={INPUT} required /></div>
                            <div className="sm:col-span-2 lg:col-span-1"><label className={LABEL}>Reason (shown to the student)</label><input value={adj.reason} onChange={(e) => setAdj({ ...adj, reason: e.target.value })} className={INPUT} required placeholder="e.g. Referral bonus — March campaign" /></div>
                            <button type="submit" disabled={busy} className={`${BTN} justify-center sm:col-span-2 lg:col-span-1`}>{busy ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Apply</button>
                        </form>
                        <div className="flex gap-1 border-b border-slate-200 overflow-x-auto">
                            {[['money', 'Wallet ledger'], ['points', 'Reward points'], ['xp', 'XP'], ['activity', 'Activity'], ['badges', 'Badges']].map(([v, l]) => (
                                <button key={v} onClick={() => setView(v)} className={`shrink-0 whitespace-nowrap px-3 py-2 text-[13px] font-bold border-b-2 ${view === v ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>{l}</button>
                            ))}
                        </div>
                        <ul className="divide-y divide-slate-100 text-sm">
                            {view === 'money' && (d.money.length ? d.money.map((t) => <li key={t._id} className="py-2 flex justify-between gap-3"><span className="min-w-0 [overflow-wrap:anywhere]"><span className="font-medium text-slate-800">{t.description || t.source}</span> <span className="text-xs text-slate-400">{t.source.replace(/_/g, ' ')} · {t.txnId} · {when(t.createdAt)}</span></span><span className="flex items-center gap-2 whitespace-nowrap"><span className={`font-bold tabular-nums ${t.type === 'credit' ? 'text-emerald-700' : 'text-slate-800'}`}>{t.type === 'credit' ? '+' : '−'}{money(t.amount, cur)}</span><Pill s={t.status} /></span></li>) : <li className="py-6 text-center text-slate-400 italic">No wallet transactions.</li>)}
                            {view === 'points' && (d.points.length ? d.points.map((t) => <li key={t._id} className="py-2 flex justify-between gap-3"><span className="min-w-0 [overflow-wrap:anywhere]"><span className="font-medium text-slate-800">{t.description || t.source}</span> <span className="text-xs text-slate-400">{t.claimKey} · {when(t.createdAt)}</span></span><span className={`shrink-0 font-bold tabular-nums ${t.points > 0 ? 'text-pink-600' : 'text-slate-700'}`}>{t.points > 0 ? '+' : ''}{num(t.points)}</span></li>) : <li className="py-6 text-center text-slate-400 italic">No reward points yet.</li>)}
                            {view === 'xp' && (d.xp.length ? d.xp.map((t) => <li key={t._id} className="py-2 flex justify-between gap-3"><span className="min-w-0 [overflow-wrap:anywhere]"><span className="font-medium text-slate-800">{t.description || t.source}</span> <span className="text-xs text-slate-400">{t.source} · {when(t.createdAt)}</span></span><span className="shrink-0 font-bold tabular-nums text-amber-600">+{num(t.amount)} XP</span></li>) : <li className="py-6 text-center text-slate-400 italic">No XP yet.</li>)}
                            {view === 'activity' && (d.activity.length ? d.activity.map((a) => <li key={a._id} className="py-2 flex justify-between gap-3"><span className="min-w-0 font-medium text-slate-800 [overflow-wrap:anywhere]">{a.type.replace(/_/g, ' ')} <span className="text-xs text-slate-400 font-mono">{a.refId}</span></span><span className="shrink-0 text-xs text-slate-500">{a.day} · +{a.xpAwarded} XP</span></li>) : <li className="py-6 text-center text-slate-400 italic">No activity recorded.</li>)}
                            {view === 'badges' && (d.badges.length ? d.badges.map((b) => <li key={b._id} className="py-2 flex justify-between gap-3"><span className="min-w-0 font-medium text-slate-800 [overflow-wrap:anywhere]">{b.badgeKey}</span><span className="shrink-0 text-xs text-slate-500">{when(b.unlockedAt)}</span></li>) : <li className="py-6 text-center text-slate-400 italic">No badges yet.</li>)}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
}
