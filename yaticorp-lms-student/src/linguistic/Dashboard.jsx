/**
 * Language Learning — the dashboard, where the section opens (asked 2026-10-26: "make the
 * dashboard for language learning like the profile dashboard"), in the
 * student's own Dashboard's style: the welcome, the lesson to go on with,
 * each skill, the level certificates and the badges.
 * Every figure comes from the section's dashboard, loaded once by LingoShell.
 */
import { useContext, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { Target, ChevronRight, Download, Award, Play, Medal } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { saveBlob } from '../native/saveFile';
import { linguisticApi } from './api';
import { COLORS, MODULES, MODULE_ORDER, levelOf } from './meta';
import { Mascot } from './ui';
import { Quests, MistakesCard, LevelCard, Timeline } from './Rail';

const CARD = 'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm';
const CERT_COLOR = { beginner: 'green', intermediate: 'gold', advanced: 'red' };
const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);

/** A thin bar, the profile dashboard's way. */
const Line = ({ value, color = '#6366f1', track = '#e0e7ff', label }) => (
    <span className="block h-2 overflow-hidden rounded-full" style={{ background: track }} role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={value}>
        <span className="block h-full rounded-full transition-[width] duration-700" style={{ width: `${value}%`, background: color }} />
    </span>
);

const Heading = ({ icon: Icon, title, to, link }) => (
    <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-base font-black text-slate-800"><Icon size={18} className="text-indigo-500" /> {title}</h2>
        {to && <Link to={to} className="inline-flex shrink-0 items-center gap-0.5 text-sm font-bold text-indigo-600 hover:text-indigo-700">{link} <ChevronRight size={16} /></Link>}
    </div>
);

/** The welcome (2026-10-26, asked plain): only the name, "Welcome to Language Learning!" under it, and the mascot. */
function Welcome({ user }) {
    const first = (user?.name || '').trim().split(' ')[0];
    return (
        <section data-lingo-welcome aria-label="Welcome"
            className="relative flex items-center overflow-hidden rounded-3xl border border-indigo-100/80 bg-gradient-to-r from-indigo-50 via-white to-amber-50/40 p-5 shadow-sm sm:min-h-36 sm:p-6 sm:pr-40">
            <span aria-hidden="true" className="pointer-events-none absolute -left-20 -top-24 h-72 w-72 rounded-full bg-indigo-100/70" />
            <Mascot pose="wave-hi" className="pointer-events-none absolute -bottom-2 right-4 hidden h-32 w-32 sm:block" />
            <h1 className="relative min-w-0">
                {first && <span className="block break-words text-[clamp(1.75rem,7vw,2.5rem)] font-black leading-tight tracking-tight text-indigo-600">{first}</span>}
                <span className="mt-1 block text-lg font-extrabold text-indigo-950 sm:text-2xl" data-lingo-welcome-line>Welcome to Language Learning!</span>
            </h1>
        </section>
    );
}

/** The one lesson to go back to, straight under the greeting: the path, at that lesson, with the tabs above it. */
function Continue({ dash }) {
    const next = dash.resume || dash.plan?.today?.lessons?.find((l) => l.status !== 'completed' && l.open);
    const to = next ? `/linguistic?lesson=${next.id}` : '/linguistic';
    return (
        <Link to={to} data-lingo-continue
            className="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-indigo-200 hover:bg-indigo-50/40">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white" style={{ background: COLORS.green.face, boxShadow: `0 3px 0 ${COLORS.green.edge}` }}><Play size={22} fill="currentColor" /></span>
            <span className="min-w-0 flex-1">
                <span className="block text-xs font-bold uppercase tracking-wide text-slate-500">{dash.resume ? 'Continue where you stopped' : next ? 'Next on your roadmap' : 'Your path'}</span>
                <span className="block truncate text-base font-black text-slate-800">{next ? next.title : 'Open your learning path'}</span>
            </span>
            <ChevronRight size={20} className="shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5" />
        </Link>
    );
}

/** Each skill: lessons done and the average quiz score. */
function Skills({ dash }) {
    const rows = MODULE_ORDER.map((id) => dash.modules.find((m) => m.id === id)).filter((m) => m && m.total);
    if (!rows.length) return null;
    return (
        <section className={CARD} data-lingo-skills>
            <Heading icon={Target} title="Your skills" to="/linguistic" link="Path" />
            <ul className="space-y-4">
                {rows.map((m) => {
                    const meta = MODULES[m.id], c = COLORS[meta.color], Icon = meta.icon;
                    return (
                        <li key={m.id} className="flex items-center gap-3" data-skill={m.id}>
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: c.light, color: c.ink }}><Icon size={19} /></span>
                            <span className="min-w-0 flex-1">
                                <span className="mb-1.5 flex items-baseline justify-between gap-2 text-sm">
                                    <span className="truncate font-bold text-slate-700">{meta.short}</span>
                                    <span className="shrink-0 tabular-nums text-slate-500">{m.completed}/{m.total}{m.average != null && <> · avg {m.average}%</>}</span>
                                </span>
                                <Line value={pct(m.completed, m.total)} color={c.face} track={c.light} label={`${meta.short}: ${m.completed} of ${m.total} lessons`} />
                            </span>
                        </li>
                    );
                })}
            </ul>
        </section>
    );
}

/** Beginner, Intermediate, Advanced: progress, and the certificate once earned. */
function Levels({ dash }) {
    const [busy, setBusy] = useState('');
    const [error, setError] = useState('');
    const download = (level) => {
        setBusy(level); setError('');
        linguisticApi.certificatePdf(level).then((blob) => saveBlob(blob, `${dash.course?.name || 'English'}_${levelOf(level).label}_Certificate.pdf`, { title: 'Certificate' })).catch((e) => setError(e.message)).finally(() => setBusy(''));
    };
    return (
        <section className={CARD} data-lingo-levels>
            <Heading icon={Award} title="Levels & certificates" to="/linguistic/badges" link="All" />
            <ul className="space-y-3">
                {dash.levels.map((l) => {
                    const meta = levelOf(l.level), c = COLORS[CERT_COLOR[l.level]];
                    return (
                        <li key={l.level} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3" data-level-row={l.level}>
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full" style={{ background: l.certificate ? c.face : COLORS.grey.light }}><Award size={20} className={l.certificate ? 'text-white' : 'text-slate-400'} /></span>
                            <span className="min-w-0 flex-1">
                                <span className="mb-1.5 flex items-baseline justify-between gap-2 text-sm">
                                    <span className="truncate font-bold text-slate-700">{meta.label} <span className="font-semibold text-slate-400">· {meta.cefr}</span></span>
                                    <span className="shrink-0 tabular-nums text-slate-500">{l.completed}/{l.total}</span>
                                </span>
                                <Line value={pct(l.completed, l.total)} color={c.face} track={c.light} label={`${meta.label}: ${l.completed} of ${l.total} lessons`} />
                            </span>
                            {l.certificate && (
                                <button type="button" onClick={() => download(l.level)} disabled={busy === l.level} data-certificate={l.level}
                                    className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-60">
                                    <Download size={14} /> {busy === l.level ? '…' : 'PDF'}
                                </button>
                            )}
                        </li>
                    );
                })}
            </ul>
            {error && <p role="alert" className="mt-3 text-sm font-semibold text-rose-600">{error}</p>}
        </section>
    );
}

/** The badges earned, and how many are left. */
function BadgesStrip({ dash }) {
    const earned = dash.achievements.filter((a) => a.earned);
    return (
        <section className={CARD} data-lingo-badges-strip>
            <Heading icon={Medal} title={`Badges · ${earned.length} of ${dash.achievements.length}`} to="/linguistic/badges" link="See all" />
            {earned.length ? (
                <ul className="flex flex-wrap gap-2">
                    {earned.map((a) => (
                        <li key={a.key} title={a.description} className="flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-sm font-bold text-amber-800 ring-1 ring-amber-200">
                            <span aria-hidden="true">{a.emoji}</span> {a.title}
                        </li>
                    ))}
                </ul>
            ) : <p className="text-sm text-slate-500">Finish your first lesson to earn your first badge.</p>}
        </section>
    );
}

export default function Dashboard() {
    const { dash, reload } = useOutletContext();
    const { user } = useContext(AuthContext) || {};
    // The number tiles, the roadmap and the week cards were taken off (2026-10-26, "remove this"). The side
    // panel's cards came in instead (asked the same day; they are here only now): the level, the roadmap, daily
    // quests and the mistakes. Two columns on a wide screen ("make the alignment correct", twice): the plan on
    // the left, progress on the right, both as tall as the taller one, the last card of each stretched to the
    // same bottom line. One column on a phone, in the same order.
    return (
        <div className="space-y-5" data-lingo-dashboard>
            <Welcome user={user} />
            <Continue dash={dash} />
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2" data-lingo-dashboard-cards>
                <div className="flex min-w-0 flex-col gap-5 [&>*:last-child]:flex-1" data-column="plan">
                    <LevelCard dash={dash} />
                    <Timeline dash={dash} onGoal={(xp) => linguisticApi.setGoal(xp).then(reload)} />
                    <Quests dash={dash} />
                </div>
                <div className="flex min-w-0 flex-col gap-5 [&>*:last-child]:flex-1" data-column="progress">
                    <MistakesCard dash={dash} />
                    <Skills dash={dash} />
                    <Levels dash={dash} />
                    <BadgesStrip dash={dash} />
                </div>
            </div>
        </div>
    );
}
