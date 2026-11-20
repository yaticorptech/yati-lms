/**
 * The parent dashboard's cards (2026-11-19): one per part of what the child does, used on the overview and on each
 * page of the sidebar. A part the child has not used yet says so in its card.
 */
import { Activity, Award, BookOpen, Briefcase, CalendarCheck, Compass, Eye, Globe2, Medal, Mic, Trophy, Users, Zap } from 'lucide-react';
import { ago, dateOf } from './when';

const TONES = {
    teal: 'bg-teal-50 text-teal-700', amber: 'bg-amber-50 text-amber-700', indigo: 'bg-indigo-50 text-indigo-700', orange: 'bg-orange-50 text-orange-600',
    emerald: 'bg-emerald-50 text-emerald-700', sky: 'bg-sky-50 text-sky-700', violet: 'bg-violet-50 text-violet-700', rose: 'bg-rose-50 text-rose-700'
};

/** A card: its title and icon, and its body — scrolling inside past `body`'s height ('' for none). */
export function Card({ title, icon: Icon, tone = 'teal', children, className = '', id, body = '' }) {
    return (
        <section id={id} className={`flex h-full min-w-0 scroll-mt-20 flex-col rounded-3xl border border-slate-100 bg-white p-5 shadow-sm ${className}`} aria-labelledby={id ? `${id}-h` : undefined}>
            <h2 id={id ? `${id}-h` : undefined} className="flex items-center gap-2.5 text-base font-extrabold text-slate-900">
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${TONES[tone]}`}><Icon size={18} /></span>{title}
            </h2>
            <div className={`mt-4 ${body ? `min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1 [scrollbar-width:thin] ${body}` : ''}`}>{children}</div>
        </section>
    );
}
export function Stat({ icon: Icon, label, value, tone }) {
    return (
        <div className={`min-w-0 rounded-2xl px-3 py-3 ${TONES[tone]}`}>
            <p className="flex items-center gap-1.5 text-xl font-extrabold"><Icon size={17} className="shrink-0" /><span className="truncate">{value}</span></p>
            <p className="mt-0.5 text-[11px] font-bold uppercase tracking-wide opacity-80">{label}</p>
        </div>
    );
}
export function Bar({ value, tone = 'bg-teal-500', label }) {
    const v = Math.max(0, Math.min(100, Math.round(value || 0)));
    return (
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={v} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
            <div className={`h-full rounded-full ${tone}`} style={{ width: `${v}%` }} />
        </div>
    );
}
function Row({ children }) { return <li className="flex items-start justify-between gap-3 border-b border-slate-100 py-2.5 text-sm last:border-0">{children}</li>; }
function Muted({ children }) { return <span className="shrink-0 text-xs font-semibold text-slate-500">{children}</span>; }
function Empty({ children = 'Not started yet.' }) { return <p className="text-sm text-slate-500">{children}</p>; }
const STATUS = {
    approved: ['Accepted', 'bg-emerald-50 text-emerald-700'], pending: ['Waiting', 'bg-amber-50 text-amber-700'], rejected: ['Sent back', 'bg-rose-50 text-rose-700'],
    active: ['Active', 'bg-emerald-50 text-emerald-700']
};
function Pill({ status }) { const [t, c] = STATUS[status] || [status, 'bg-slate-100 text-slate-600']; return <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${c}`}>{t}</span>; }
const JOB = { ready: 'Ready to send', 'needs-guardian': 'Needs a guardian', 'awaiting-guardian': 'Waiting for guardian', 'awaiting-admin': 'Being checked', approved: 'Approved', declined: 'Declined', rejected: 'Not selected', continued: 'Continued' };
const LEVEL = (l) => String(l || '').replace(/^\w/, (c) => c.toUpperCase());
const dayName = (key) => {
    const d = new Date(`${key}T12:00:00`);
    const t = ago(d);
    return t === 'today' ? 'Today' : t === 'yesterday' ? 'Yesterday' : d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' });
};

export function LearningDays({ rewards }) {
    return (
        <Card title="Days learned" icon={CalendarCheck} tone="orange" id="days">
            {!rewards ? <Empty /> : (
                <>
                    <p className="text-sm text-slate-600"><strong className="text-slate-900">{rewards.activeDaysThisMonth}</strong> of the last 30 days · longest streak <strong className="text-slate-900">{rewards.longestStreak}</strong> days</p>
                    <div className="mt-3 grid grid-cols-7 gap-1.5" aria-label="The last four weeks: a filled square is a day they learned">
                        {rewards.days.map((d) => <span key={d.day} title={`${dateOf(`${d.day}T12:00:00`)}${d.active ? ' · learned' : ''}`} className={`aspect-square rounded-md ${d.active ? 'bg-orange-400' : 'bg-slate-100'}`} />)}
                    </div>
                    <p className="mt-2 flex justify-between text-[11px] font-semibold text-slate-400"><span>4 weeks ago</span><span>Today</span></p>
                </>
            )}
        </Card>
    );
}

/** What they did, day by day; `limit` days only on the overview. */
// A few days in view, the rest by scrolling inside the card — on the Activity page too (2026-11-19, the user: "keep it scroll, show only few").
export function Timeline({ days, limit = 0 }) {
    const shown = limit ? days.slice(0, limit) : days;
    return (
        <Card title="What they did" icon={Activity} tone="teal" id="timeline">
            {!shown.length ? <Empty>No learning activity in the last two weeks.</Empty> : (
                <ol className="max-h-[26rem] space-y-4 overflow-y-auto overscroll-contain pr-1.5 [scrollbar-width:thin]" tabIndex={0} aria-label="Activity, day by day" data-timeline-scroll>
                    {shown.map((d) => (
                        <li key={d.day}>
                            <p className="flex items-baseline justify-between gap-2 text-sm"><span className="font-extrabold text-slate-900">{dayName(d.day)}</span><Muted>{d.count} activit{d.count === 1 ? 'y' : 'ies'} · +{d.xp} XP</Muted></p>
                            <ul className="mt-2 space-y-1.5">
                                {d.areas.map((a) => (
                                    <li key={a.area} className="rounded-2xl bg-slate-50 px-3.5 py-2.5">
                                        <p className="flex items-center justify-between gap-2 text-sm"><span className="font-bold text-slate-800">{a.area}</span><Muted>{a.count}× · +{a.xp} XP</Muted></p>
                                        {a.examples.length > 0 && <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{a.examples.map((x) => x.charAt(0).toUpperCase() + x.slice(1)).join(' · ')}</p>}
                                    </li>
                                ))}
                            </ul>
                        </li>
                    ))}
                </ol>
            )}
        </Card>
    );
}

export function Ranking({ r360 }) {
    return (
        <Card title={r360?.name || 'Student Ranking'} icon={Medal} tone="indigo" id="ranking">
            {!r360 ? <Empty>Student Ranking is not open at your child’s institution.</Empty> : (
                <>
                    <p className="flex items-baseline gap-2"><span className="text-3xl font-extrabold text-indigo-700">{r360.total}</span><span className="text-sm text-slate-500">of {r360.possible} marks</span></p>
                    <div className="mt-2"><Bar value={r360.possible ? (r360.total / r360.possible) * 100 : 0} tone="bg-indigo-500" label="Student Ranking marks" /></div>
                    {r360.proofs.length > 0 ? <ul className="mt-3">{r360.proofs.map((p, i) => <Row key={i}><span className="text-slate-700">{p.activity}{p.group ? <span className="block text-xs text-slate-400">{p.group}</span> : null}{p.status === 'approved' && p.marks != null ? <span className="block text-xs font-semibold text-emerald-700">{p.marks} marks</span> : null}</span><Pill status={p.status} /></Row>)}</ul>
                        : <p className="mt-3 text-sm text-slate-500">No proofs sent yet.</p>}
                </>
            )}
        </Card>
    );
}

export function Extra({ extra }) {
    return (
        <Card title="Extra-curricular" icon={Users} tone="emerald" id="extra">
            {!extra?.length ? <Empty>Not in NCC, NSS, Scouts & Guides or a club yet.</Empty> : (
                <ul>{extra.map((x, i) => <Row key={i}><span className="text-slate-700"><strong className="text-slate-900">{x.scheme}</strong>{x.unit ? ` · ${x.unit}` : ''}{x.role && x.role !== 'member' ? ` · ${x.role}` : ''}{x.requiredHours ? <span className="block text-xs text-slate-500">{x.hours} of {x.requiredHours} hours · {x.events} events</span> : null}</span><Pill status={x.status} /></Row>)}</ul>
            )}
        </Card>
    );
}

export function Courses({ courses }) {
    const list = courses?.courses || [];
    return (
        <Card title="Courses" icon={BookOpen} tone="sky" id="courses">
            {!list.length ? <Empty>No courses yet.</Empty> : (
                <ul className="space-y-3.5">
                    {list.map((x) => (
                        <li key={x.courseId}>
                            <p className="mb-1 flex justify-between gap-2 text-sm"><span className="font-semibold text-slate-800">{x.title}</span><span className="shrink-0 font-bold text-slate-600">{x.percentage}%</span></p>
                            <Bar value={x.percentage} tone={x.completed ? 'bg-emerald-500' : 'bg-sky-500'} label={`${x.title} progress`} />
                            <p className="mt-1 text-xs text-slate-500">{x.lessonsCompleted} lessons · {x.quizzesPassed} quizzes passed{x.lastActivity ? ` · ${ago(x.lastActivity)}` : ''}</p>
                        </li>
                    ))}
                </ul>
            )}
        </Card>
    );
}

export function Multilingo({ m }) {
    const used = m && (m.lessonsCompleted || m.lastActive);
    return (
        <Card title={used ? `Multilingo · ${m.course}` : 'Multilingo'} icon={Globe2} tone="violet" id="multilingo">
            {!used ? <Empty /> : (
                <>
                    <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="rounded-2xl bg-violet-50 py-2.5"><p className="text-xl font-extrabold text-violet-700">{m.lessonsCompleted}</p><p className="text-[11px] font-bold text-violet-700/80">Lessons</p></div>
                        <div className="rounded-2xl bg-violet-50 py-2.5"><p className="text-xl font-extrabold text-violet-700">{m.averageScore ?? '–'}{m.averageScore != null && '%'}</p><p className="text-[11px] font-bold text-violet-700/80">Avg score</p></div>
                        <div className="rounded-2xl bg-violet-50 py-2.5"><p className="text-xl font-extrabold text-violet-700">{m.quizzesThisWeek}</p><p className="text-[11px] font-bold text-violet-700/80">Quizzes, 7 days</p></div>
                    </div>
                    {(m.levelsCompleted.length > 0 || m.certificates.length > 0) && (
                        <ul className="mt-3">
                            {m.levelsCompleted.map((l) => <Row key={`${l.course}${l.level}`}><span className="font-semibold text-slate-800">{l.course} {LEVEL(l.level)} finished</span><Muted>{l.average}% · {dateOf(l.at)}</Muted></Row>)}
                            {m.certificates.map((l) => <Row key={l.number || l.level}><span className="font-semibold text-slate-800">🏅 {l.course} {LEVEL(l.level)} certificate</span><Muted>{dateOf(l.at)}</Muted></Row>)}
                        </ul>
                    )}
                    {m.lastActive && <p className="mt-3 text-xs text-slate-500">Last lesson {ago(m.lastActive)}</p>}
                </>
            )}
        </Card>
    );
}

export function Career({ career }) {
    return (
        <Card title="Career Path" icon={Compass} tone="emerald" id="career">
            {!career ? <Empty /> : (
                <>
                    {career.goal && <p className="text-sm text-slate-600">Goal: <strong className="text-slate-900">{career.goal}</strong>{career.dreamCompany && <> · dream company <strong className="text-slate-900">{career.dreamCompany}</strong></>}</p>}
                    {career.roadmapPercent != null && <div className="mt-3"><p className="mb-1 flex justify-between text-xs font-semibold text-slate-600"><span>Roadmap</span><span>{career.roadmapPercent}%</span></p><Bar value={career.roadmapPercent} tone="bg-emerald-500" label="Roadmap progress" /></div>}
                    <p className="mt-3 text-sm text-slate-600"><strong className="text-emerald-700">{career.tasks.completed}</strong> tasks done · {career.tasks.pending} to do · {career.tasks.skipped} skipped</p>
                    {career.recentTasks.length > 0 && <ul className="mt-2">{career.recentTasks.map((t, i) => <Row key={i}><span className="text-slate-700">{t.title}</span><Muted>{ago(t.at)}</Muted></Row>)}</ul>}
                </>
            )}
        </Card>
    );
}

export function Interviews({ interviews }) {
    const used = interviews && (interviews.mocks.length || interviews.readiness != null);
    return (
        <Card title="Interview practice" icon={Mic} tone="rose" id="interviews">
            {!used ? <Empty /> : (
                <>
                    {interviews.readiness != null && <div><p className="mb-1 flex justify-between text-sm"><span className="font-semibold text-slate-700">Interview readiness</span><span className="font-extrabold text-slate-900">{interviews.readiness}%</span></p><Bar value={interviews.readiness} tone="bg-rose-500" label="Interview readiness" /></div>}
                    {interviews.mocks.length > 0 && <ul className="mt-3">{interviews.mocks.map((x, i) => <Row key={i}><span className="text-slate-700">Mock interview · {LEVEL(x.type)}{x.role ? ` · ${x.role}` : ''}</span><Muted>{x.score != null ? `${x.score}/100 · ` : ''}{dateOf(x.at)}</Muted></Row>)}</ul>}
                </>
            )}
        </Card>
    );
}

export function Quizzes({ quizzes }) {
    return (
        <Card title="Global Quiz" icon={Zap} tone="amber" id="quizzes">
            {!quizzes?.length ? <Empty /> : <ul>{quizzes.map((q, i) => <Row key={i}><span className="text-slate-700">{q.title}{q.won && ' 🏆'}</span><Muted>{q.correct}/{q.total} · {dateOf(q.at)}</Muted></Row>)}</ul>}
        </Card>
    );
}

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const MEDAL = ['🥇', '🥈', '🥉'];

/** Competitions, Quiz Arena and Group Brain: the place, and the certificate the child received, to view (2026-11-19). */
export function Competitions({ competitions }) {
    return (
        <Card title="Competitions" icon={Trophy} tone="amber" id="competitions" body="max-h-[32rem]">
            {!competitions?.length ? <Empty /> : (
                <ul className="space-y-2">
                    {competitions.map((x, i) => (
                        <li key={i} className="flex min-w-0 items-center gap-3 rounded-2xl bg-slate-50 px-3 py-3">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-xl shadow-sm" aria-hidden>{x.place ? MEDAL[x.place - 1] || '🏅' : '🏁'}</span>
                            <div className="min-w-0 flex-1">
                                <p className="line-clamp-2 text-sm font-bold leading-snug text-slate-900">{x.title}</p>
                                <p className="truncate text-xs text-slate-500">{[x.kind, x.team, x.place ? `${['1st', '2nd', '3rd'][x.place - 1] || `${x.place}th`} place` : x.status === 'completed' ? 'Took part' : x.status, x.score != null ? `${x.score} points` : '', x.at ? dateOf(x.at) : ''].filter(Boolean).join(' · ')}</p>
                                {x.certificate && <p className="mt-0.5 truncate text-[11px] font-semibold text-emerald-700">🏅 {x.certificate.title} · <span className="font-mono font-normal text-slate-400">{x.certificate.number}</span></p>}
                            </div>
                            {x.certificate && (
                                <a href={`${API}/certificates/verify/${encodeURIComponent(x.certificate.number)}/pdf`} target="_blank" rel="noopener noreferrer" aria-label={`View the certificate for ${x.title}`}
                                    className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700"><Eye size={14} /> View</a>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </Card>
    );
}

export function Jobs({ jobs }) {
    return (
        <Card title="Part-time jobs" icon={Briefcase} tone="sky" id="jobs">
            {!jobs?.length ? <Empty>No job applications.</Empty> : <ul>{jobs.map((j, i) => <Row key={i}><span className="text-slate-700">{j.title}{j.company ? ` · ${j.company}` : ''}</span><Muted>{JOB[j.status] || j.status}</Muted></Row>)}</ul>}
        </Card>
    );
}

export function Badges({ rewards }) {
    return (
        <Card title="Badges" icon={Award} tone="amber" id="badges">
            {!rewards?.badges?.length ? <Empty>No badges yet.</Empty> : <ul className="flex flex-wrap gap-2">{rewards.badges.map((b, i) => <li key={i} title={b.description} className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-sm font-bold text-amber-800"><span aria-hidden>{b.emoji}</span>{b.title}</li>)}</ul>}
        </Card>
    );
}
