/**
 * Rewards administration: the rulebook (XP, levels, streak milestones,
 * leaderboard rewards, conversion, limits, who may cash out), the badge
 * catalogue, wallets, the money ledger, withdrawal requests, per-student
 * history and adjustments, and the integrity checks.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import {
    Gift, Settings2, Award, Wallet, ReceiptText, ArrowDownToLine, ShieldCheck, Lock, Unlock, Loader2, Plus, Trash2, Save, Search,
    RefreshCw, CheckCircle2, XCircle, AlertTriangle, Flame, Trophy, Coins, Users, ChevronRight, X
} from 'lucide-react';

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
    { id: 'withdrawals', label: 'Withdrawals', icon: ArrowDownToLine },
    { id: 'audit', label: 'Fraud checks', icon: ShieldCheck }
];

const money = (n, c = 'INR') => `${c === 'INR' ? '₹' : `${c} `}${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const num = (n) => Number(n || 0).toLocaleString('en-IN');
const when = (d) => new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const STATUS = { completed: 'bg-emerald-100 text-emerald-700', pending: 'bg-amber-100 text-amber-700', approved: 'bg-sky-100 text-sky-700', paid: 'bg-emerald-100 text-emerald-700', failed: 'bg-red-100 text-red-700', cancelled: 'bg-slate-100 text-slate-600', rejected: 'bg-red-100 text-red-700', reversed: 'bg-slate-100 text-slate-600' };
const Pill = ({ s }) => <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${STATUS[s] || 'bg-slate-100 text-slate-600'}`}>{s}</span>;
const TYPE_LABEL = { school_student: 'School student', college_student: 'College student', adult: 'Adult', professional: 'Professional', instructor: 'Instructor' };

const Stat = ({ icon: Icon, label, value, sub, tone = 'indigo' }) => {
    const tones = { indigo: 'bg-indigo-100 text-indigo-600', emerald: 'bg-emerald-100 text-emerald-600', amber: 'bg-amber-100 text-amber-600', slate: 'bg-slate-100 text-slate-600', rose: 'bg-rose-100 text-rose-600' };
    return (
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
                <span className={`p-1.5 rounded-lg ${tones[tone]}`}><Icon size={15} /></span>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</p>
            </div>
            <p className="text-3xl font-bold text-slate-800 tabular-nums">{value}</p>
            {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
        </div>
    );
};

const Banner = ({ kind, children, onClose }) => (
    <div className={`flex items-start gap-2 rounded-xl border p-3 text-sm font-medium ${kind === 'error' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
        {kind === 'error' ? <XCircle size={16} className="mt-0.5 shrink-0" /> : <CheckCircle2 size={16} className="mt-0.5 shrink-0" />}
        <span className="flex-1">{children}</span>
        {onClose && <button onClick={onClose}><X size={14} /></button>}
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
            {tab === 'withdrawals' && <Withdrawals onOpenUser={setUserId} />}
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
    if (!d) return <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">{[0, 1, 2, 3].map((i) => <div key={i} className="animate-pulse h-28 bg-slate-100 rounded-2xl" />)}</div>;
    const max = Math.max(1, ...d.activityByDay.map((a) => a.n));
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Stat icon={Wallet} label="Wallet liability" value={money(d.wallets.available + d.wallets.pending)} sub={`${money(d.wallets.pending)} on hold · ${num(d.wallets.count)} wallets`} tone="emerald" />
                <Stat icon={ArrowDownToLine} label="Pending withdrawals" value={num(d.pendingWithdrawals)} sub={`${money(d.pendingWithdrawalAmount)} requested`} tone="amber" />
                <Stat icon={Coins} label="Reward points outstanding" value={num(d.wallets.points)} sub={`${money(d.wallets.withdrawn)} paid out to date`} tone="rose" />
                <Stat icon={Flame} label="Active streaks" value={num(d.activeStreaks)} sub={`${num(d.badgesUnlocked)} badges unlocked · ${num(d.xpLast7Days.xp)} XP this week`} tone="indigo" />
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                    <p className="font-bold text-slate-800 mb-1">Learning activity — last 14 days</p>
                    <p className="text-xs text-slate-500 mb-4">Lessons, quizzes, courses, certificates and tasks that counted.</p>
                    <div className="flex items-end gap-1 h-32">
                        {d.activityByDay.length === 0 && <p className="text-sm text-slate-400 italic">No activity recorded yet.</p>}
                        {d.activityByDay.map((a) => (
                            <div key={a._id} className="flex-1 flex flex-col items-center gap-1" title={`${a._id}: ${a.n}`}>
                                <div className="w-full rounded-t-md bg-indigo-500" style={{ height: `${(a.n / max) * 100}%`, minHeight: 4 }} />
                                <span className="text-[9px] text-slate-400">{a._id.slice(-2)}</span>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                    <p className="font-bold text-slate-800 mb-1">Reward points issued, by source</p>
                    <p className="text-xs text-slate-500 mb-4">Every point traces back to a claim.</p>
                    {d.pointsIssuedBySource.length === 0 ? <p className="text-sm text-slate-400 italic">Nothing issued yet.</p> : (
                        <ul className="space-y-2">
                            {d.pointsIssuedBySource.sort((a, b) => b.points - a.points).map((s) => (
                                <li key={s._id} className="flex items-center gap-3 text-sm">
                                    <span className="w-36 font-semibold text-slate-600 capitalize">{s._id.replace(/_/g, ' ')}</span>
                                    <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden"><div className="h-full bg-pink-500 rounded-full" style={{ width: `${(s.points / Math.max(1, d.pointsIssuedBySource[0].points)) * 100}%` }} /></div>
                                    <span className="w-24 text-right font-bold tabular-nums">{num(s.points)} <span className="text-xs text-slate-400">({s.n})</span></span>
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
const XP_LABELS = { lesson_complete: 'Complete a lesson', quiz_complete: 'Complete a quiz', quiz_pass: 'Pass a quiz', assignment_complete: 'Complete an assignment', course_complete: 'Complete a course', certificate_earned: 'Earn a certificate', career_task: 'Complete a Career Path task', daily_activity: 'Solve the daily activity' };

function Rules() {
    const [cfg, setCfg] = useState(null);
    const [busy, setBusy] = useState(false);
    const [msg, setMsg] = useState(null);
    useEffect(() => { api.get('/rewards/admin/config').then((r) => setCfg(r.data)).catch((e) => setMsg({ kind: 'error', text: e.response?.data?.message || 'Failed to load' })); }, []);
    if (!cfg) return <div className="animate-pulse h-64 bg-slate-100 rounded-2xl" />;

    const set = (path, value) => setCfg((c) => { const n = structuredClone(c); let o = n; const ks = path.split('.'); for (let i = 0; i < ks.length - 1; i++) o = o[ks[i]]; o[ks[ks.length - 1]] = value; return n; });
    const save = async () => {
        setBusy(true); setMsg(null);
        try {
            const r = await api.put('/rewards/admin/config', { xpRules: cfg.xpRules, levelThresholds: cfg.levelThresholds, streakMilestones: cfg.streakMilestones, leaderboardRewards: cfg.leaderboardRewards, conversion: cfg.conversion, limits: cfg.limits, walletAccess: cfg.walletAccess });
            setCfg(r.data); setMsg({ kind: 'ok', text: 'Reward rules saved. They apply to the next award.' });
        } catch (e) { setMsg({ kind: 'error', text: e.response?.data?.message || 'Failed to save' }); }
        finally { setBusy(false); }
    };
    const Card = ({ icon: Icon, title, sub, children, tone = 'indigo' }) => (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center gap-3 bg-slate-50">
                <div className={`p-2 rounded-lg bg-${tone}-100 text-${tone}-600`}><Icon size={18} /></div>
                <div><h2 className="font-bold text-slate-800">{title}</h2><p className="text-xs text-slate-500">{sub}</p></div>
            </div>
            <div className="p-5">{children}</div>
        </div>
    );
    const cur = cfg.conversion.currency;

    return (
        <div className="space-y-5">
            {msg && <Banner kind={msg.kind === 'error' ? 'error' : 'ok'} onClose={() => setMsg(null)}>{msg.text}</Banner>}
            <div className="grid gap-5 lg:grid-cols-2">
                <Card icon={Coins} title="XP rules" sub="XP is learning progress. It drives levels, the leaderboard and badges — never money.">
                    <div className="grid sm:grid-cols-2 gap-3">
                        {Object.keys(XP_LABELS).map((k) => (
                            <div key={k}><label className={LABEL}>{XP_LABELS[k]}</label><input type="number" min="0" value={cfg.xpRules[k] ?? 0} onChange={(e) => set(`xpRules.${k}`, Number(e.target.value))} className={INPUT} /></div>
                        ))}
                    </div>
                </Card>
                <Card icon={Trophy} title="Level thresholds" sub="XP at which each level begins. Level 1 is always 0." tone="amber">
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                        {cfg.levelThresholds.map((t, i) => (
                            <div key={i}><label className={LABEL}>Level {i + 1}</label><input type="number" min="0" disabled={i === 0} value={t} onChange={(e) => set(`levelThresholds.${i}`, Number(e.target.value))} className={INPUT} /></div>
                        ))}
                    </div>
                    <div className="flex gap-2 mt-3">
                        <button className={BTN2} onClick={() => set('levelThresholds', [...cfg.levelThresholds, cfg.levelThresholds[cfg.levelThresholds.length - 1] + Math.max(100, cfg.levelThresholds[cfg.levelThresholds.length - 1] - cfg.levelThresholds[cfg.levelThresholds.length - 2])])}><Plus size={14} /> Add level</button>
                        <button className={BTN2} disabled={cfg.levelThresholds.length <= 2} onClick={() => set('levelThresholds', cfg.levelThresholds.slice(0, -1))}><Trash2 size={14} /> Remove last</button>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">Beyond the last level, each further level costs the same as the last gap.</p>
                </Card>
                <Card icon={Flame} title="Streak milestones" sub="Reached by consecutive days with a meaningful activity. Each pays reward points and XP once per run." tone="amber">
                    <div className="space-y-2">
                        {cfg.streakMilestones.map((m, i) => (
                            <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end">
                                <div><label className={LABEL}>Days</label><input type="number" min="1" value={m.days} onChange={(e) => set(`streakMilestones.${i}.days`, Number(e.target.value))} className={INPUT} /></div>
                                <div><label className={LABEL}>Reward points</label><input type="number" min="0" value={m.rewardPoints} onChange={(e) => set(`streakMilestones.${i}.rewardPoints`, Number(e.target.value))} className={INPUT} /></div>
                                <div><label className={LABEL}>XP</label><input type="number" min="0" value={m.xp} onChange={(e) => set(`streakMilestones.${i}.xp`, Number(e.target.value))} className={INPUT} /></div>
                                <button className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600" onClick={() => set('streakMilestones', cfg.streakMilestones.filter((_, j) => j !== i))} title="Remove"><Trash2 size={15} /></button>
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
                <Card icon={Gift} title="Reward points → money" sub="Reward points are the only thing that becomes money, and only for eligible accounts." tone="rose">
                    <div className="grid sm:grid-cols-2 gap-3">
                        <div><label className={LABEL}>Points per unit</label><input type="number" min="1" value={cfg.conversion.pointsPerUnit} onChange={(e) => set('conversion.pointsPerUnit', Number(e.target.value))} className={INPUT} /></div>
                        <div><label className={LABEL}>Unit value ({cur})</label><input type="number" min="0" step="0.01" value={cfg.conversion.unitValue} onChange={(e) => set('conversion.unitValue', Number(e.target.value))} className={INPUT} /></div>
                        <div><label className={LABEL}>Minimum points to redeem</label><input type="number" min="0" value={cfg.conversion.minRedeemPoints} onChange={(e) => set('conversion.minRedeemPoints', Number(e.target.value))} className={INPUT} /></div>
                        <div><label className={LABEL}>Currency</label><input value={cfg.conversion.currency} maxLength={3} onChange={(e) => set('conversion.currency', e.target.value.toUpperCase())} className={INPUT} /></div>
                    </div>
                    <p className="text-sm text-slate-600 mt-3 font-medium">{num(cfg.conversion.pointsPerUnit)} points = {money(cfg.conversion.unitValue, cur)}. Set the unit value to 0 to stop redemption entirely.</p>
                    <div className="grid sm:grid-cols-3 gap-3 mt-4">
                        <div><label className={LABEL}>Monthly cash cap ({cur})</label><input type="number" min="0" value={cfg.limits.monthlyCashCap} onChange={(e) => set('limits.monthlyCashCap', Number(e.target.value))} className={INPUT} /><p className="text-[11px] text-slate-400 mt-1">Per student · 0 = no cap</p></div>
                        <div><label className={LABEL}>Min withdrawal ({cur})</label><input type="number" min="0" value={cfg.limits.minWithdrawal} onChange={(e) => set('limits.minWithdrawal', Number(e.target.value))} className={INPUT} /></div>
                        <div><label className={LABEL}>Max withdrawal ({cur})</label><input type="number" min="0" value={cfg.limits.maxWithdrawal} onChange={(e) => set('limits.maxWithdrawal', Number(e.target.value))} className={INPUT} /><p className="text-[11px] text-slate-400 mt-1">0 = no maximum</p></div>
                    </div>
                </Card>
                <Card icon={Users} title="Who can cash out" sub="Account types allowed to redeem points for money and request withdrawals. Others keep XP, badges and points. Override one student from Users → Edit." tone="indigo">
                    <div className="space-y-2">
                        {cfg.accountTypes.map((t) => (
                            <label key={t} className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer">
                                <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-indigo-600" checked={cfg.walletAccess.allowedAccountTypes.includes(t)} onChange={(e) => set('walletAccess.allowedAccountTypes', e.target.checked ? [...cfg.walletAccess.allowedAccountTypes, t] : cfg.walletAccess.allowedAccountTypes.filter((x) => x !== t))} />
                                {TYPE_LABEL[t]}
                                {!cfg.walletAccess.allowedAccountTypes.includes(t) && <span className="ml-auto text-[10px] font-black uppercase tracking-wider text-slate-400">Learning rewards only</span>}
                            </label>
                        ))}
                    </div>
                </Card>
            </div>
            <div className="flex justify-end gap-3 sticky bottom-4">
                <button onClick={save} disabled={busy} className={BTN}>{busy ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Save reward rules</button>
            </div>
        </div>
    );
}

// ── Badges ──────────────────────────────────────────────────────────────────
const METRIC_LABEL = { lessons: 'Lessons completed', quizzes: 'Quizzes completed', perfect_quizzes: 'Perfect quizzes', courses: 'Courses completed', certificates: 'Certificates earned', xp: 'Total XP', longest_streak: 'Longest streak (days)', current_streak: 'Current streak (days)', top10_weeks: 'Weeks in the top 10', level: 'Level reached' };
const EMPTY_BADGE = { key: '', title: '', description: '', emoji: '🎖️', metric: 'lessons', target: 1, rewardPoints: 0, order: 100, isActive: true };

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
            <div className="flex justify-between items-center">
                <p className="text-sm text-slate-500">{data.badges.length} badges · a badge unlocks when its metric reaches the target and pays its points once.</p>
                <button className={BTN} onClick={() => setEdit({ ...EMPTY_BADGE })}><Plus size={15} /> New badge</button>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[720px]">
                        <thead><tr className="bg-slate-50 border-b border-slate-200 text-sm tracking-wide text-slate-500 uppercase">
                            <th className="px-6 py-4 font-semibold">Badge</th><th className="px-6 py-4 font-semibold">Unlocks when</th><th className="px-6 py-4 font-semibold">Points</th><th className="px-6 py-4 font-semibold">Unlocked by</th><th className="px-6 py-4 font-semibold">Status</th><th className="px-6 py-4 font-semibold text-right">Actions</th>
                        </tr></thead>
                        <tbody className="divide-y divide-slate-100">
                            {data.badges.map((b) => (
                                <tr key={b._id} className="hover:bg-slate-50/50">
                                    <td className="px-6 py-4"><div className="flex items-center gap-3"><span className="text-2xl">{b.emoji}</span><div><div className="font-medium text-slate-800">{b.title}</div><div className="text-xs text-slate-500">{b.description}</div><div className="text-[10px] font-mono text-slate-400">{b.key}</div></div></div></td>
                                    <td className="px-6 py-4 text-sm text-slate-600">{METRIC_LABEL[b.metric] || b.metric} ≥ <strong>{num(b.target)}</strong></td>
                                    <td className="px-6 py-4 text-sm font-bold text-pink-600">{b.rewardPoints ? `+${num(b.rewardPoints)}` : '—'}</td>
                                    <td className="px-6 py-4 text-sm text-slate-600">{num(b.unlockedCount)} students</td>
                                    <td className="px-6 py-4"><span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${b.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>{b.isActive ? 'active' : 'inactive'}</span></td>
                                    <td className="px-6 py-4 text-right space-x-3">
                                        <button onClick={() => setEdit({ ...b })} className="text-indigo-600 hover:text-indigo-900 font-medium text-sm">Edit</button>
                                        {b.isActive && <button onClick={() => deactivate(b)} className="text-red-500 hover:text-red-700 font-medium text-sm">Deactivate</button>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            {edit && (
                <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/60 backdrop-blur-sm p-6 pt-20 overflow-y-auto" onClick={() => setEdit(null)}>
                    <form onSubmit={save} onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden" role="dialog" aria-modal="true">
                        <div className="p-5 border-b border-slate-200 bg-slate-50 font-bold text-lg flex justify-between"><span>{edit._id ? 'Edit badge' : 'New badge'}</span><button type="button" onClick={() => setEdit(null)} className="text-slate-400 hover:text-slate-600">✕</button></div>
                        <div className="p-5 grid sm:grid-cols-2 gap-3">
                            <div><label className={LABEL}>Key</label><input value={edit.key} disabled={!!edit._id} onChange={(e) => setEdit({ ...edit, key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') })} className={INPUT} placeholder="quiz_master" required /></div>
                            <div><label className={LABEL}>Emoji</label><input value={edit.emoji} onChange={(e) => setEdit({ ...edit, emoji: e.target.value })} className={INPUT} /></div>
                            <div className="sm:col-span-2"><label className={LABEL}>Title</label><input value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} className={INPUT} required /></div>
                            <div className="sm:col-span-2"><label className={LABEL}>Description</label><input value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} className={INPUT} /></div>
                            <div><label className={LABEL}>Metric</label><select value={edit.metric} onChange={(e) => setEdit({ ...edit, metric: e.target.value })} className={INPUT}>{data.metrics.map((m) => <option key={m} value={m}>{METRIC_LABEL[m] || m}</option>)}</select></div>
                            <div><label className={LABEL}>Target</label><input type="number" min="1" value={edit.target} onChange={(e) => setEdit({ ...edit, target: Number(e.target.value) })} className={INPUT} required /></div>
                            <div><label className={LABEL}>Reward points</label><input type="number" min="0" value={edit.rewardPoints} onChange={(e) => setEdit({ ...edit, rewardPoints: Number(e.target.value) })} className={INPUT} /></div>
                            <div><label className={LABEL}>Order</label><input type="number" value={edit.order} onChange={(e) => setEdit({ ...edit, order: Number(e.target.value) })} className={INPUT} /></div>
                            <label className="sm:col-span-2 flex items-center gap-2 text-sm font-semibold text-slate-700"><input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-indigo-600" checked={edit.isActive !== false} onChange={(e) => setEdit({ ...edit, isActive: e.target.checked })} /> Active</label>
                        </div>
                        <div className="flex justify-end space-x-3 p-5 pt-0"><button type="button" onClick={() => setEdit(null)} className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-lg">Cancel</button><button type="submit" disabled={busy} className={BTN}>{busy && <Loader2 size={14} className="animate-spin" />} Save</button></div>
                    </form>
                </div>
            )}
        </div>
    );
}

// ── Wallets ─────────────────────────────────────────────────────────────────
function Wallets({ onOpenUser }) {
    const [q, setQ] = useState('');
    const [data, setData] = useState(null);
    useEffect(() => { const t = setTimeout(() => api.get('/rewards/admin/wallets', { params: { q: q || undefined, limit: 100 } }).then((r) => setData(r.data)).catch(() => setData({ rows: [], total: 0 })), 250); return () => clearTimeout(t); }, [q]);
    return (
        <div className="space-y-4">
            <div className="relative max-w-md"><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, email or card number…" className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-600 text-sm shadow-sm" /><Search className="absolute left-3.5 top-3 text-slate-400" size={18} /></div>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                {!data ? <div className="p-8 text-center text-slate-500">Loading…</div> : (
                    <div className="overflow-x-auto"><table className="w-full text-left border-collapse min-w-[860px]">
                        <thead><tr className="bg-slate-50 border-b border-slate-200 text-sm tracking-wide text-slate-500 uppercase"><th className="px-6 py-4 font-semibold">Student</th><th className="px-6 py-4 font-semibold">Type</th><th className="px-6 py-4 font-semibold">Available</th><th className="px-6 py-4 font-semibold">Pending</th><th className="px-6 py-4 font-semibold">Points</th><th className="px-6 py-4 font-semibold">Earned</th><th className="px-6 py-4 font-semibold text-right"></th></tr></thead>
                        <tbody className="divide-y divide-slate-100">
                            {data.rows.length === 0 && <tr><td colSpan="7" className="px-6 py-12 text-center text-slate-400 italic">No wallets yet.</td></tr>}
                            {data.rows.map((w) => (
                                <tr key={w._id} onClick={() => w.userId && onOpenUser(w.userId._id)} className="hover:bg-slate-50/50 cursor-pointer">
                                    <td className="px-6 py-4"><div className="font-medium text-slate-800">{w.userId?.name || 'Deleted user'}</div><div className="text-sm text-slate-500">{w.userId?.email}</div></td>
                                    <td className="px-6 py-4 text-sm text-slate-600">{TYPE_LABEL[w.userId?.accountType] || 'School student'}{w.userId?.walletAccess && w.userId.walletAccess !== 'default' && <span className="ml-1 text-[10px] font-black uppercase text-indigo-600">· {w.userId.walletAccess}</span>}</td>
                                    <td className="px-6 py-4 font-bold tabular-nums text-emerald-700">{money(w.available, w.currency)}</td>
                                    <td className="px-6 py-4 tabular-nums text-amber-700">{money(w.pending, w.currency)}</td>
                                    <td className="px-6 py-4 tabular-nums font-bold text-pink-600">{num(w.rewardPoints)}</td>
                                    <td className="px-6 py-4 tabular-nums text-slate-600">{money(w.totalEarned, w.currency)}</td>
                                    <td className="px-6 py-4 text-right"><ChevronRight size={16} className="inline text-slate-400" /></td>
                                </tr>
                            ))}
                        </tbody>
                    </table></div>
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
                <select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })} className={`${INPUT} w-auto`}><option value="">All types</option><option value="credit">Credits</option><option value="debit">Debits</option></select>
                <select value={f.source} onChange={(e) => setF({ ...f, source: e.target.value })} className={`${INPUT} w-auto`}><option value="">All sources</option>{(data?.sources || []).map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}</select>
                <select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })} className={`${INPUT} w-auto`}><option value="">All statuses</option>{(data?.statuses || []).map((s) => <option key={s} value={s}>{s}</option>)}</select>
                {data && <span className="self-center text-sm text-slate-500">{num(data.total)} transactions</span>}
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                {!data ? <div className="p-8 text-center text-slate-500">Loading…</div> : (
                    <div className="overflow-x-auto"><table className="w-full text-left border-collapse min-w-[960px]">
                        <thead><tr className="bg-slate-50 border-b border-slate-200 text-sm tracking-wide text-slate-500 uppercase"><th className="px-6 py-4 font-semibold">Transaction</th><th className="px-6 py-4 font-semibold">Student</th><th className="px-6 py-4 font-semibold">Source</th><th className="px-6 py-4 font-semibold">Amount</th><th className="px-6 py-4 font-semibold">Status</th><th className="px-6 py-4 font-semibold">When</th></tr></thead>
                        <tbody className="divide-y divide-slate-100">
                            {data.rows.length === 0 && <tr><td colSpan="6" className="px-6 py-12 text-center text-slate-400 italic">No transactions match.</td></tr>}
                            {data.rows.map((t) => (
                                <tr key={t._id} className="hover:bg-slate-50/50">
                                    <td className="px-6 py-4"><div className="font-medium text-slate-800">{t.description || '—'}</div><div className="text-[11px] font-mono text-slate-400">{t.txnId}{t.referenceKey ? ` · ${t.referenceKey}` : ''}</div></td>
                                    <td className="px-6 py-4"><button onClick={() => t.userId && onOpenUser(t.userId._id)} className="text-indigo-600 hover:underline text-sm font-medium">{t.userId?.name || 'Deleted user'}</button><div className="text-xs text-slate-500">{t.userId?.cardNumber}</div></td>
                                    <td className="px-6 py-4 text-sm text-slate-600 capitalize">{t.source.replace(/_/g, ' ')}</td>
                                    <td className={`px-6 py-4 font-bold tabular-nums ${t.type === 'credit' ? 'text-emerald-700' : 'text-slate-800'}`}>{t.type === 'credit' ? '+' : '−'}{money(t.amount, t.currency)}<div className="text-[10px] text-slate-400 font-normal">bal {t.balanceAfter != null ? money(t.balanceAfter, t.currency) : '—'}</div></td>
                                    <td className="px-6 py-4"><Pill s={t.status} /></td>
                                    <td className="px-6 py-4 text-sm text-slate-500">{when(t.createdAt)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table></div>
                )}
            </div>
        </div>
    );
}

// ── Withdrawals ─────────────────────────────────────────────────────────────
function Withdrawals({ onOpenUser }) {
    const [status, setStatus] = useState('pending');
    const [data, setData] = useState(null);
    const [busy, setBusy] = useState(null);
    const [msg, setMsg] = useState(null);
    const load = useCallback(() => { setData(null); return api.get('/rewards/admin/withdrawals', { params: { status: status || undefined, limit: 100 } }).then((r) => setData(r.data)).catch(() => setData({ rows: [] })); }, [status]);
    useEffect(() => { load(); }, [load]);
    const decide = async (w, decision) => {
        let note = '', ref = '';
        if (decision === 'rejected') { note = window.prompt('Reason (shown to the student):', ''); if (note === null) return; }
        if (decision === 'paid') { ref = window.prompt('Payout reference (UTR / transaction id), optional:', '') ?? ''; }
        if (decision !== 'rejected' && !window.confirm(`Mark ${money(w.amount, w.currency)} for ${w.userId?.name} as ${decision}?`)) return;
        setBusy(w._id); setMsg(null);
        try { await api.put(`/rewards/admin/withdrawals/${w._id}`, { decision, note, payoutReference: ref }); setMsg({ kind: 'ok', text: `Request marked ${decision}.` }); await load(); }
        catch (e) { setMsg({ kind: 'error', text: e.response?.data?.message || 'Failed' }); }
        finally { setBusy(null); }
    };
    return (
        <div className="space-y-4">
            {msg && <Banner kind={msg.kind === 'error' ? 'error' : 'ok'} onClose={() => setMsg(null)}>{msg.text}</Banner>}
            <div className="flex flex-wrap gap-2">
                {[['pending', 'Pending'], ['approved', 'Approved'], ['paid', 'Paid'], ['rejected', 'Rejected'], ['', 'All']].map(([v, l]) => (
                    <button key={v} onClick={() => setStatus(v)} className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all ${status === v ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>{l}</button>
                ))}
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                {!data ? <div className="p-8 text-center text-slate-500">Loading…</div> : (
                    <div className="overflow-x-auto"><table className="w-full text-left border-collapse min-w-[960px]">
                        <thead><tr className="bg-slate-50 border-b border-slate-200 text-sm tracking-wide text-slate-500 uppercase"><th className="px-6 py-4 font-semibold">Student</th><th className="px-6 py-4 font-semibold">Amount</th><th className="px-6 py-4 font-semibold">Pay to</th><th className="px-6 py-4 font-semibold">Requested</th><th className="px-6 py-4 font-semibold">Status</th><th className="px-6 py-4 font-semibold text-right">Actions</th></tr></thead>
                        <tbody className="divide-y divide-slate-100">
                            {data.rows.length === 0 && <tr><td colSpan="6" className="px-6 py-12 text-center text-slate-400 italic">No withdrawal requests.</td></tr>}
                            {data.rows.map((w) => (
                                <tr key={w._id} className="hover:bg-slate-50/50">
                                    <td className="px-6 py-4"><button onClick={() => w.userId && onOpenUser(w.userId._id)} className="font-medium text-indigo-600 hover:underline">{w.userId?.name || 'Deleted user'}</button><div className="text-xs text-slate-500">{w.userId?.email} · {w.userId?.phone} · {TYPE_LABEL[w.userId?.accountType] || 'School student'}</div></td>
                                    <td className="px-6 py-4 font-bold tabular-nums text-slate-800">{money(w.amount, w.currency)}</td>
                                    <td className="px-6 py-4 text-sm text-slate-600">{w.method?.type === 'upi' ? <span className="font-mono">{w.method.upiId}</span> : <span>{w.method?.accountName}<br /><span className="font-mono text-xs">{w.method?.accountNumber} · {w.method?.ifsc}</span></span>}</td>
                                    <td className="px-6 py-4 text-sm text-slate-500">{when(w.createdAt)}{w.processedAt && <div className="text-xs">processed {when(w.processedAt)}{w.processedBy?.name ? ` by ${w.processedBy.name}` : ''}</div>}{w.adminNote && <div className="text-xs italic">{w.adminNote}</div>}{w.payoutReference && <div className="text-xs font-mono">ref {w.payoutReference}</div>}</td>
                                    <td className="px-6 py-4"><Pill s={w.status} /></td>
                                    <td className="px-6 py-4 text-right space-x-3 whitespace-nowrap">
                                        {busy === w._id ? <Loader2 size={16} className="inline animate-spin text-slate-400" /> : (
                                            <>
                                                {w.status === 'pending' && <button onClick={() => decide(w, 'approved')} className="text-sky-600 hover:text-sky-800 font-medium text-sm">Approve</button>}
                                                {['pending', 'approved'].includes(w.status) && <button onClick={() => decide(w, 'paid')} className="text-emerald-600 hover:text-emerald-800 font-medium text-sm">Mark paid</button>}
                                                {['pending', 'approved'].includes(w.status) && <button onClick={() => decide(w, 'rejected')} className="text-red-500 hover:text-red-700 font-medium text-sm">Reject</button>}
                                            </>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table></div>
                )}
            </div>
        </div>
    );
}

// ── Audit ───────────────────────────────────────────────────────────────────
function Audit({ onOpenUser }) {
    const [d, setD] = useState(null);
    const [busy, setBusy] = useState(false);
    const run = useCallback(() => { setD(null); return api.get('/rewards/admin/audit').then((r) => setD(r.data)).catch((e) => setD({ error: e.response?.data?.message || 'Failed' })); }, []);
    useEffect(() => { run(); }, [run]);
    const runJobs = async () => { setBusy(true); try { await api.post('/rewards/admin/jobs/run'); await run(); } finally { setBusy(false); } };
    if (!d) return <div className="animate-pulse h-48 bg-slate-100 rounded-2xl" />;
    if (d.error) return <Banner kind="error">{d.error}</Banner>;
    const Section = ({ title, rows, render }) => (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <p className="font-bold text-slate-800 flex items-center gap-2">{rows.length ? <AlertTriangle size={16} className="text-amber-500" /> : <CheckCircle2 size={16} className="text-emerald-500" />} {title} <span className="text-xs font-semibold text-slate-400">({rows.length})</span></p>
            {rows.length > 0 && <ul className="mt-3 space-y-1 text-sm text-slate-600">{rows.map((r, i) => <li key={i}>{render(r)}</li>)}</ul>}
        </div>
    );
    return (
        <div className="space-y-4">
            <div className={`rounded-xl p-4 border font-medium text-sm flex items-center justify-between gap-3 ${d.ok ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
                <span>{d.ok ? `All clear — no duplicate rewards, no duplicate wallet references, and every one of ${num(d.walletsChecked)} wallets reconciles with its ledger.` : 'Something needs a look.'}</span>
                <div className="flex gap-2"><button onClick={run} className={BTN2}><RefreshCw size={14} /> Re-run</button><button onClick={runJobs} disabled={busy} className={BTN2}>{busy ? <Loader2 size={14} className="animate-spin" /> : <Trophy size={14} />} Run leaderboard payouts now</button></div>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
                <Section title="Duplicate learning activities" rows={d.duplicateActivities} render={(r) => `${r._id.t} ${r._id.r} × ${r.n}`} />
                <Section title="Duplicate reward claims" rows={d.duplicateClaims} render={(r) => `${r._id.k} × ${r.n}`} />
                <Section title="Duplicate wallet references" rows={d.duplicateReferences} render={(r) => `${r._id.k} × ${r.n}`} />
                <Section title="Wallets that do not match their ledger" rows={d.walletMismatches} render={(r) => <button onClick={() => onOpenUser(r.userId)} className="text-indigo-600 hover:underline">{String(r.userId)} — stored {JSON.stringify(r.stored)} vs ledger {JSON.stringify(r.computed)}</button>} />
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <p className="font-bold text-slate-800 mb-2">Recent scheduled runs</p>
                {d.recentJobs.length === 0 ? <p className="text-sm text-slate-400 italic">No payouts have run yet. The first weekly payout happens after the current week closes.</p> : (
                    <ul className="text-sm text-slate-600 space-y-1">{d.recentJobs.map((j) => <li key={j._id}><span className="font-mono">{j.key}</span> · {when(j.createdAt)} · ranked {j.result?.ranked ?? '—'}, paid {j.result?.paid?.length ?? 0}</li>)}</ul>
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
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-4xl flex flex-col max-h-[calc(100vh-3rem)]" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
                <div className="p-5 border-b border-slate-200 bg-slate-50 flex justify-between items-start">
                    <div>
                        <p className="font-bold text-lg text-slate-800">{d?.user?.name || 'Student'}</p>
                        {d && <p className="text-sm text-slate-500">{d.user.email} · {d.user.cardNumber} · {TYPE_LABEL[d.user.accountType] || 'School student'} · <span className={d.monetaryEnabled ? 'text-emerald-600 font-semibold' : 'text-slate-500'}>{d.monetaryEnabled ? 'cash rewards enabled' : 'learning rewards only'}</span> · <Link to="/users" className="text-indigo-600 hover:underline">edit account</Link></p>}
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
                </div>
                {!d ? <div className="p-8 text-center text-slate-500">Loading…</div> : (
                    <div className="p-5 overflow-y-auto space-y-5 flex-1">
                        {msg && <Banner kind={msg.kind === 'error' ? 'error' : 'ok'} onClose={() => setMsg(null)}>{msg.text}</Banner>}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                            <Stat icon={Coins} label="XP · level" value={`${num(d.user.xp)} · L${d.level.level}`} sub={`${num(d.level.remaining)} XP to level ${d.level.nextLevel}`} />
                            <Stat icon={Flame} label="Streak" value={num(d.streak?.current || 0)} sub={`longest ${num(d.streak?.longest || 0)} · best weekly rank ${d.streak?.bestWeeklyRank ? `#${d.streak.bestWeeklyRank}` : '—'}`} tone="amber" />
                            <Stat icon={Wallet} label="Wallet" value={money(d.wallet?.available || 0, cur)} sub={`${money(d.wallet?.pending || 0, cur)} pending · ${money(d.wallet?.totalWithdrawn || 0, cur)} withdrawn`} tone="emerald" />
                            <Stat icon={Gift} label="Reward points" value={num(d.wallet?.rewardPoints || 0)} sub={`${num(d.badges.length)} badges`} tone="rose" />
                        </div>
                        {!d.audit.ok && <Banner kind="error">This wallet does not reconcile with its ledger: stored {JSON.stringify(d.audit.stored)} vs computed {JSON.stringify(d.audit.computed)}.</Banner>}
                        <form onSubmit={submit} className="rounded-2xl border border-slate-200 p-4 grid sm:grid-cols-[auto_1fr_1fr_2fr_auto] gap-3 items-end bg-slate-50/50">
                            <div><label className={LABEL}>Adjust</label><select value={adj.kind} onChange={(e) => setAdj({ ...adj, kind: e.target.value, source: e.target.value === 'money' ? 'admin_adjustment' : 'admin' })} className={INPUT}><option value="points">Reward points</option><option value="money">Wallet money</option><option value="xp">XP</option></select></div>
                            <div><label className={LABEL}>Source</label>
                                {adj.kind === 'points' && <select value={adj.source} onChange={(e) => setAdj({ ...adj, source: e.target.value })} className={INPUT}><option value="admin">Bonus</option><option value="campaign">Campaign</option><option value="referral">Referral</option></select>}
                                {adj.kind === 'money' && <select value={adj.source} onChange={(e) => setAdj({ ...adj, source: e.target.value })} className={INPUT}><option value="admin_adjustment">Adjustment</option><option value="job_earning">Job earning</option><option value="referral_reward">Referral reward</option><option value="learning_reward">Learning reward</option><option value="leaderboard_reward">Leaderboard reward</option><option value="purchase">Purchase (debit)</option></select>}
                                {adj.kind === 'xp' && <input disabled value="Admin" className={INPUT} />}
                            </div>
                            <div><label className={LABEL}>Amount {adj.kind === 'money' ? `(${cur}, − to debit)` : adj.kind === 'points' ? '(− to remove)' : ''}</label><input type="number" step={adj.kind === 'money' ? '0.01' : '1'} value={adj.amount} onChange={(e) => setAdj({ ...adj, amount: e.target.value })} className={INPUT} required /></div>
                            <div><label className={LABEL}>Reason (shown to the student)</label><input value={adj.reason} onChange={(e) => setAdj({ ...adj, reason: e.target.value })} className={INPUT} required placeholder="e.g. Referral bonus — March campaign" /></div>
                            <button type="submit" disabled={busy} className={BTN}>{busy ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Apply</button>
                        </form>
                        <div className="flex gap-1 border-b border-slate-200">
                            {[['money', 'Wallet ledger'], ['points', 'Reward points'], ['xp', 'XP'], ['activity', 'Activity'], ['withdrawals', 'Withdrawals'], ['badges', 'Badges']].map(([v, l]) => (
                                <button key={v} onClick={() => setView(v)} className={`px-3 py-2 text-[13px] font-bold border-b-2 ${view === v ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>{l}</button>
                            ))}
                        </div>
                        <ul className="divide-y divide-slate-100 text-sm">
                            {view === 'money' && (d.money.length ? d.money.map((t) => <li key={t._id} className="py-2 flex justify-between gap-3"><span><span className="font-medium text-slate-800">{t.description || t.source}</span> <span className="text-xs text-slate-400">{t.source.replace(/_/g, ' ')} · {t.txnId} · {when(t.createdAt)}</span></span><span className="flex items-center gap-2 whitespace-nowrap"><span className={`font-bold tabular-nums ${t.type === 'credit' ? 'text-emerald-700' : 'text-slate-800'}`}>{t.type === 'credit' ? '+' : '−'}{money(t.amount, cur)}</span><Pill s={t.status} /></span></li>) : <li className="py-6 text-center text-slate-400 italic">No wallet transactions.</li>)}
                            {view === 'points' && (d.points.length ? d.points.map((t) => <li key={t._id} className="py-2 flex justify-between gap-3"><span><span className="font-medium text-slate-800">{t.description || t.source}</span> <span className="text-xs text-slate-400">{t.claimKey} · {when(t.createdAt)}</span></span><span className={`font-bold tabular-nums ${t.points > 0 ? 'text-pink-600' : 'text-slate-700'}`}>{t.points > 0 ? '+' : ''}{num(t.points)}</span></li>) : <li className="py-6 text-center text-slate-400 italic">No reward points yet.</li>)}
                            {view === 'xp' && (d.xp.length ? d.xp.map((t) => <li key={t._id} className="py-2 flex justify-between gap-3"><span><span className="font-medium text-slate-800">{t.description || t.source}</span> <span className="text-xs text-slate-400">{t.source} · {when(t.createdAt)}</span></span><span className="font-bold tabular-nums text-amber-600">+{num(t.amount)} XP</span></li>) : <li className="py-6 text-center text-slate-400 italic">No XP yet.</li>)}
                            {view === 'activity' && (d.activity.length ? d.activity.map((a) => <li key={a._id} className="py-2 flex justify-between gap-3"><span className="font-medium text-slate-800">{a.type.replace(/_/g, ' ')} <span className="text-xs text-slate-400 font-mono">{a.refId}</span></span><span className="text-xs text-slate-500">{a.day} · +{a.xpAwarded} XP</span></li>) : <li className="py-6 text-center text-slate-400 italic">No activity recorded.</li>)}
                            {view === 'withdrawals' && (d.withdrawals.length ? d.withdrawals.map((w) => <li key={w._id} className="py-2 flex justify-between gap-3"><span className="font-medium text-slate-800">{money(w.amount, cur)} · {w.method?.type} <span className="text-xs text-slate-400">{when(w.createdAt)}{w.adminNote ? ` · ${w.adminNote}` : ''}</span></span><Pill s={w.status} /></li>) : <li className="py-6 text-center text-slate-400 italic">No withdrawals.</li>)}
                            {view === 'badges' && (d.badges.length ? d.badges.map((b) => <li key={b._id} className="py-2 flex justify-between"><span className="font-medium text-slate-800">{b.badgeKey}</span><span className="text-xs text-slate-500">{when(b.unlockedAt)}</span></li>) : <li className="py-6 text-center text-slate-400 italic">No badges yet.</li>)}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
}
