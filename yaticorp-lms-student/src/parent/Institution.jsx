/**
 * The child's institution on the parent's page (2026-11-19, the user: "it should show time table, attendance, last
 * attended, absent notification, result, fees … parents can watch certificates of child"). Read only.
 */
import { useState } from 'react';
import { AlertTriangle, Award, BellRing, CalendarDays, Eye, FileText, GraduationCap, Receipt, School, Wallet } from 'lucide-react';
import { dateOf } from './when';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export function Panel({ title, icon: Icon, tone, children, id, className = '', right = null, body = 'max-h-[24rem]' }) {
    return (
        <section id={id} aria-labelledby={`${id}-h`} className={`flex h-full min-w-0 scroll-mt-20 flex-col rounded-3xl border border-slate-100 bg-white p-5 shadow-sm ${className}`}>
            <div className="flex items-center justify-between gap-3">
                <h2 id={`${id}-h`} className="flex items-center gap-2.5 text-base font-extrabold text-slate-900">
                    <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${tone}`}><Icon size={18} /></span>{title}
                </h2>
                {right}
            </div>
            <div className={`mt-4 ${body ? `min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1 [scrollbar-width:thin] ${body}` : ''}`}>{children}</div>
        </section>
    );
}
const money = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const day = (d) => (d ? new Date(`${d}T12:00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }) : '');

/** At the top of the page: absent from a class today. */
export function AbsentAlert({ campus }) {
    const n = campus?.attendance?.absentToday || 0;
    if (!n) return null;
    const today = campus.attendance.absences.filter((a) => a.date === campus.attendance.absences[0]?.date);
    return (
        <div role="alert" className="mt-4 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3.5" data-absent-today>
            <BellRing size={20} className="mt-0.5 shrink-0 text-rose-600" />
            <div className="text-sm">
                <p className="font-extrabold text-rose-800">Absent today from {n} class{n === 1 ? '' : 'es'}</p>
                <p className="mt-0.5 text-rose-700">{today.map((a) => `${a.subject}${a.period ? ` (period ${a.period})` : ''}`).join(' · ')}</p>
            </div>
        </div>
    );
}

export function Attendance({ campus, Bar, full = false }) {
    const a = campus.attendance;
    const [all, setAll] = useState(false);
    const shown = all ? a.absences : a.absences.slice(0, 5);
    return (
        <Panel title="Attendance" icon={School} tone="bg-sky-50 text-sky-700" id="attendance" {...(full ? { body: '' } : {})}>
            <p className="flex items-baseline gap-2"><span className={`text-3xl font-extrabold ${a.percent >= 75 ? 'text-emerald-600' : 'text-rose-600'}`}>{a.percent ?? 0}%</span><span className="text-sm text-slate-500">{a.present} of {a.held} classes</span></p>
            {a.percent < 75 && a.held > 0 && <p className="mt-1 text-xs font-bold text-rose-600">Below 75%</p>}
            <p className="mt-2 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600">
                Last attended: {a.lastPresent ? <strong className="text-slate-900">{day(a.lastPresent.date)} · {a.lastPresent.subject}{a.lastPresent.period ? ` (period ${a.lastPresent.period})` : ''}</strong> : <strong className="text-slate-900">no class yet</strong>}
            </p>
            <ul className="mt-3 space-y-2.5">
                {a.bySubject.map((s) => (
                    <li key={s.name}><p className="mb-1 flex justify-between gap-2 text-xs font-semibold text-slate-600"><span className="truncate">{s.name}</span><span>{s.percent ?? 0}% · {s.present}/{s.held}</span></p><Bar value={s.percent} tone={s.percent >= 75 ? 'bg-emerald-500' : 'bg-rose-500'} label={`${s.name} attendance`} /></li>
                ))}
            </ul>
            <div className="mt-4 border-t border-slate-100 pt-3" data-absences>
                <p className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-slate-500"><AlertTriangle size={13} className="text-rose-500" /> Absent · last 30 days ({a.absences.length})</p>
                {!a.absences.length ? <p className="mt-2 text-sm font-semibold text-emerald-700">No absences. 👏</p> : (
                    <ul className="mt-2 space-y-1.5">
                        {shown.map((x, i) => (
                            <li key={i} className="flex items-center justify-between gap-2 rounded-xl bg-rose-50/70 px-3 py-2 text-sm">
                                <span className="font-semibold text-rose-800">{x.subject}{x.period ? <span className="font-normal text-rose-700"> · period {x.period}</span> : null}</span>
                                <span className="shrink-0 text-xs font-bold text-rose-700">{day(x.date)}</span>
                            </li>
                        ))}
                    </ul>
                )}
                {a.absences.length > 5 && <button type="button" onClick={() => setAll((v) => !v)} className="mt-2 text-xs font-bold text-teal-700 hover:underline">{all ? 'Show fewer' : `Show all ${a.absences.length}`}</button>}
            </div>
        </Panel>
    );
}

/** The class timetable: a grid on wide screens, one day after another on a phone. */
export function Timetable({ campus }) {
    const t = campus.timetable;
    const todayIdx = new Date().getDay(); // 0 Sunday … 6 Saturday; DAYS here start on Monday (1)
    if (!t) {
        return (
            <Panel title="Timetable" icon={CalendarDays} tone="bg-indigo-50 text-indigo-700" id="timetable" className="mt-4" body="">
                <p className="text-sm text-slate-500">The institution has not published a timetable for this class yet.</p>
            </Panel>
        );
    }
    const at = (d, p) => t.slots.find((s) => s.day === d && s.p === p);
    const days = t.days.map((name, i) => ({ name, d: i + 1 })).filter(({ d }) => t.slots.some((s) => s.day === d));
    const cell = (s) => (s ? (
        <div className={`h-full rounded-xl px-2.5 py-2 ${s.kind === 'practical' || s.kind === 'lab' ? 'bg-violet-50' : 'bg-indigo-50'}`}>
            <p className="text-[13px] font-bold leading-tight text-slate-900">{s.subject}</p>
            <p className="mt-0.5 text-[11px] text-slate-500">{[s.code, s.room].filter(Boolean).join(' · ')}</p>
        </div>
    ) : <div className="h-full rounded-xl border border-dashed border-slate-200" />);
    return (
        <Panel title="Timetable" icon={CalendarDays} tone="bg-indigo-50 text-indigo-700" id="timetable" className="mt-4" body="">
            {/* Phones: today first, then the other days. */}
            <div className="space-y-3 md:hidden">
                {[...days].sort((x, y) => (y.d === todayIdx) - (x.d === todayIdx)).map(({ name, d }) => (
                    <div key={d} className={`rounded-2xl p-3 ${d === todayIdx ? 'bg-teal-50 ring-1 ring-teal-200' : 'bg-slate-50'}`}>
                        <p className="mb-2 text-sm font-extrabold text-slate-900">{name}{d === todayIdx && <span className="ml-2 rounded-full bg-teal-600 px-2 py-0.5 text-[10px] font-bold uppercase text-white">Today</span>}</p>
                        <ul className="space-y-1.5">
                            {t.periods.map((p) => { const s = at(d, p.n); return s ? (
                                <li key={p.n} className="flex items-center gap-3 rounded-xl bg-white px-3 py-2 text-sm">
                                    <span className="w-14 shrink-0 text-xs font-bold text-slate-500">{p.start || `P${p.n}`}</span>
                                    <span className="min-w-0 flex-1 font-semibold text-slate-800">{s.subject}</span>
                                    {s.room && <span className="shrink-0 text-xs text-slate-500">{s.room}</span>}
                                </li>
                            ) : null; })}
                        </ul>
                    </div>
                ))}
            </div>
            <div className="hidden overflow-x-auto md:block">
                <table className="w-full table-fixed border-separate border-spacing-1.5 text-left">
                    <thead>
                        <tr>
                            <th className="w-24" />
                            {t.periods.map((p) => <th key={p.n} className="px-1 text-xs font-bold text-slate-500">Period {p.n}{p.start ? <span className="block font-semibold text-slate-400">{p.start}–{p.end}</span> : null}</th>)}
                        </tr>
                    </thead>
                    <tbody>
                        {days.map(({ name, d }) => (
                            <tr key={d}>
                                <th scope="row" className={`rounded-xl px-2 text-sm font-extrabold ${d === todayIdx ? 'bg-teal-600 text-white' : 'text-slate-800'}`}>{name}</th>
                                {t.periods.map((p) => <td key={p.n} className="h-16 align-top">{cell(at(d, p.n))}</td>)}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </Panel>
    );
}

export function Results({ campus, full = false }) {
    if (!campus.results.length && !campus.internals.length) {
        return <Panel title="Results" icon={GraduationCap} tone="bg-indigo-50 text-indigo-700" id="results"><p className="text-sm text-slate-500">No results published yet.</p></Panel>;
    }
    return (
        <Panel title="Results" icon={GraduationCap} tone="bg-indigo-50 text-indigo-700" id="results" {...(full ? { body: '' } : {})}>
            <div className="space-y-4">
                {campus.results.map((r) => (
                    <div key={r.name}>
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                            <p className="text-sm font-extrabold text-slate-900">{r.name}</p>
                            <p className="text-xs font-bold"><span className={/^Pass/.test(r.result) ? 'text-emerald-600' : /^Fail/.test(r.result) ? 'text-rose-600' : 'text-slate-500'}>{r.result}</span>{r.sgpa != null && <span className="ml-2 text-indigo-700">SGPA {r.sgpa}</span>}</p>
                        </div>
                        <ul className="mt-1.5">
                            {r.subjects.map((s) => (
                                <li key={s.name} className="flex items-center justify-between gap-2 border-b border-slate-100 py-2 text-sm last:border-0">
                                    <span className="text-slate-700">{s.name}</span>
                                    <span className="flex shrink-0 items-center gap-2"><span className="font-bold text-slate-900">{s.marks ?? 'Absent'}{s.max ? <span className="font-normal text-slate-400">/{s.max}</span> : null}</span>{s.grade && <span className={`rounded-md px-1.5 py-0.5 text-xs font-extrabold ${s.passed ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{s.grade}</span>}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
                {campus.internals.map((e) => (
                    <div key={e.name}>
                        <p className="text-sm font-extrabold text-slate-900">{e.name} <span className="font-semibold text-slate-400">· out of {e.maxMarks}</span></p>
                        <ul className="mt-1.5">
                            {e.subjects.map((s) => (
                                <li key={s.name} className="flex items-center justify-between gap-2 border-b border-slate-100 py-2 text-sm last:border-0">
                                    <span className="text-slate-700">{s.name}</span>
                                    <span className={`font-bold ${s.marks != null && e.passMarks && s.marks < e.passMarks ? 'text-rose-600' : 'text-slate-900'}`}>{s.marks ?? '–'}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>
        </Panel>
    );
}

const FEE = { paid: ['Paid', 'bg-emerald-50 text-emerald-700'], partial: ['Part paid', 'bg-amber-50 text-amber-700'], overdue: ['Overdue', 'bg-rose-50 text-rose-700'], due: ['Due', 'bg-slate-100 text-slate-600'] };
export function Fees({ campus, full = false }) {
    const f = campus.fees;
    return (
        <Panel title="Fees" icon={Wallet} tone="bg-amber-50 text-amber-700" id="fees" {...(full ? { body: '' } : {})}>
            {!f.items.length && !f.payments.length ? <p className="text-sm text-slate-500">No fees set for this class.</p> : (
                <>
                    <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="rounded-2xl bg-slate-50 py-2.5"><p className="text-base font-extrabold text-slate-900">{money(f.total)}</p><p className="text-[11px] font-bold text-slate-500">Total</p></div>
                        <div className="rounded-2xl bg-emerald-50 py-2.5"><p className="text-base font-extrabold text-emerald-700">{money(f.paid)}</p><p className="text-[11px] font-bold text-emerald-700/80">Paid</p></div>
                        <div className={`rounded-2xl py-2.5 ${f.balance > 0 ? 'bg-rose-50' : 'bg-emerald-50'}`}><p className={`text-base font-extrabold ${f.balance > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>{money(f.balance)}</p><p className="text-[11px] font-bold text-slate-500">Due</p></div>
                    </div>
                    <ul className="mt-3">
                        {f.items.map((i) => { const [label, cls] = FEE[i.status] || FEE.due; return (
                            <li key={i.title} className="flex items-start justify-between gap-2 border-b border-slate-100 py-2.5 text-sm last:border-0">
                                <span><span className="font-semibold text-slate-800">{i.title}</span><span className="block text-xs text-slate-500">{money(i.amount)}{i.dueDate ? ` · due ${dateOf(`${i.dueDate}T12:00:00`)}` : ''}{i.paid > 0 && i.balance > 0 ? ` · ${money(i.balance)} left` : ''}</span></span>
                                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${cls}`}>{label}</span>
                            </li>
                        ); })}
                    </ul>
                    {f.payments.length > 0 && (
                        <div className="mt-3 border-t border-slate-100 pt-3">
                            <p className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-slate-500"><Receipt size={13} /> Payments</p>
                            <ul className="mt-1.5">{f.payments.map((p, i) => <li key={i} className="flex justify-between gap-2 py-1.5 text-sm"><span className="text-slate-700">{p.title || 'Payment'}{p.receipt ? <span className="text-xs text-slate-400"> · receipt {p.receipt}</span> : null}</span><span className="shrink-0 font-bold text-emerald-700">{money(p.amount)} <span className="font-normal text-slate-400">{dateOf(p.at)}</span></span></li>)}</ul>
                        </div>
                    )}
                </>
            )}
        </Panel>
    );
}

/** Every certificate, each opened as the child downloads it (the public certificate check by its number). */
export function Certificates({ list, full = false }) {
    return (
        <Panel title={`Certificates (${list.length})`} icon={Award} tone="bg-emerald-50 text-emerald-700" id="certificates" {...(full ? { body: '' } : {})}>
            {!list.length ? <p className="text-sm text-slate-500">No certificates yet.</p> : (
                <ul className="space-y-2">
                    {list.map((x, i) => {
                        const href = x.fileUrl || (x.number ? `${API}/certificates/verify/${encodeURIComponent(x.number)}/pdf` : '');
                        return (
                            <li key={x.number || i} className="flex min-w-0 items-center gap-3 rounded-2xl bg-slate-50 px-3 py-3 sm:px-3.5">
                                <span className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-600 shadow-sm sm:flex"><FileText size={18} /></span>
                                <div className="min-w-0 flex-1">
                                    <p className="line-clamp-2 break-words text-sm font-bold leading-snug text-slate-900">{x.title}</p>
                                    <p className="mt-0.5 text-xs text-slate-500">{x.kind}{x.issuer ? ` · ${x.issuer}` : ''}{x.at ? ` · ${dateOf(x.at)}` : ''}</p>
                                    {x.number && <p className="truncate font-mono text-[11px] text-slate-400">{x.number}</p>}
                                </div>
                                {href && <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700" aria-label={`View ${x.title}`}><Eye size={14} /> View</a>}
                            </li>
                        );
                    })}
                </ul>
            )}
        </Panel>
    );
}
