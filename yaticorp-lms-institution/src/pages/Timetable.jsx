/**
 * Timetable (2026-11-13) — the department (HOD) sets each class's weekly timetable:
 * the period times, and which subject is taught in each period, Monday to Saturday.
 * Students see their class's timetable on the Overview of their Institution page.
 * Server: GET|PUT /api/organizations/me/campus/timetable (src/campus/orgAdmin.js).
 */
import React, { useEffect, useMemo, useState } from 'react';
import { CalendarRange, Plus, Minus, Save, Eraser } from 'lucide-react';
import api, { CAMPUS, errorOf } from '../api';
import { useCampus } from '../App';
import { PageHead, Card, Button, Label, SemesterSelect, SectionSelect, Banner, Empty, Skeleton, LoadFailed, useData, useToast, useConfirm } from '../ui';

const DAYS = [[1, 'Mon', 'Monday'], [2, 'Tue', 'Tuesday'], [3, 'Wed', 'Wednesday'], [4, 'Thu', 'Thursday'], [5, 'Fri', 'Friday'], [6, 'Sat', 'Saturday']];
const pad = (n) => String(n).padStart(2, '0');
/** A sensible first day: 50-minute periods from 9:00, a break after the third. */
const defaultPeriods = (count = 6) => Array.from({ length: count }, (_, i) => {
    const start = 9 * 60 + i * 55 + (i >= 3 ? 15 : 0);
    const t = (m) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
    return { start: t(start), end: t(start + 50) };
});
// Each subject gets its own soft tint so the week reads at a glance.
const TINTS = ['bg-petrol-50 text-petrol-800 ring-petrol-200', 'bg-amber-50 text-amber-800 ring-amber-200', 'bg-sky-50 text-sky-800 ring-sky-200', 'bg-rose-50 text-rose-800 ring-rose-200', 'bg-violet-50 text-violet-800 ring-violet-200', 'bg-emerald-50 text-emerald-800 ring-emerald-200', 'bg-orange-50 text-orange-800 ring-orange-200', 'bg-slate-100 text-slate-800 ring-slate-300'];

export default function Timetable() {
    const { dept } = useCampus();
    const toast = useToast();
    const [confirm, confirmDialog] = useConfirm();
    const [semester, setSemester] = useState(1);
    const [section, setSection] = useState(dept.sections?.length > 1 ? dept.sections[0] : '');
    useEffect(() => { setSemester(1); setSection(dept.sections?.length > 1 ? dept.sections[0] : ''); }, [dept._id]); // eslint-disable-line react-hooks/exhaustive-deps
    const { data, loading, failed, error: loadError, reload } = useData('/timetable', { departmentId: dept._id, semester, section });
    const subjects = useMemo(() => data?.subjects || [], [data]);
    const tint = (id) => TINTS[Math.max(0, subjects.findIndex((s) => s._id === id)) % TINTS.length];

    const [periods, setPeriods] = useState(defaultPeriods());
    const [slots, setSlots] = useState({});   // 'day-p' → { subjectId, room }
    const [dirty, setDirty] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    useEffect(() => {
        if (!data) return;
        const t = data.timetable;
        setPeriods(t?.periods?.length ? t.periods.map((p) => ({ start: p.start || '', end: p.end || '' })) : defaultPeriods());
        setSlots(Object.fromEntries((t?.slots || []).map((x) => [`${x.day}-${x.p}`, { subjectId: String(x.subjectId), room: x.room || '' }])));
        setDirty(false); setError('');
    }, [data]);

    const change = (fn) => { fn(); setDirty(true); };
    const setSlot = (key, v) => change(() => setSlots((s) => { const n = { ...s }; if (!v.subjectId) delete n[key]; else n[key] = v; return n; }));
    const setTime = (i, k, v) => change(() => setPeriods((ps) => ps.map((p, j) => (j === i ? { ...p, [k]: v } : p))));
    const addPeriod = () => change(() => setPeriods((ps) => {
        const last = ps[ps.length - 1];
        const [h, m] = (last?.end || '15:00').split(':').map(Number);
        const s = h * 60 + m + 5; const t = (x) => `${pad(Math.floor(x / 60) % 24)}:${pad(x % 60)}`;
        return [...ps, { start: t(s), end: t(s + 50) }].slice(0, 12);
    }));
    const removePeriod = () => change(() => {
        const n = periods.length;
        setPeriods((ps) => ps.slice(0, -1));
        setSlots((s) => Object.fromEntries(Object.entries(s).filter(([k]) => Number(k.split('-')[1]) < n)));
    });
    const clearAll = async () => {
        if (!await confirm({ title: 'Clear every period?', body: 'The subjects come off this week. Nothing changes for students until you save.', action: 'Clear', danger: true })) return;
        change(() => setSlots({}));
    };
    const save = async () => {
        setSaving(true); setError('');
        try {
            const body = { departmentId: dept._id, semester, section, periods, slots: Object.entries(slots).map(([k, v]) => { const [day, p] = k.split('-').map(Number); return { day, p, ...v }; }) };
            toast((await api.put(`${CAMPUS}/timetable`, body)).data.message);
            setDirty(false); reload();
        } catch (err) { setError(errorOf(err)); } finally { setSaving(false); }
    };
    const filled = Object.keys(slots).length;
    const weekly = subjects.map((s) => ({ ...s, n: Object.values(slots).filter((v) => v.subjectId === s._id).length }));

    return (
        <>
            <PageHead eyebrow={dept.name} title="Timetable" sub="Set the week for each class. Students see their own class’s timetable on their Institution page.">
                <SemesterSelect dept={dept} value={semester} onChange={(v) => setSemester(v || 1)} className="w-40" />
                <SectionSelect dept={dept} value={section} onChange={setSection} any={false} className="w-36" />
                <Button icon={Save} onClick={save} busy={saving} disabled={!dirty || !data}>{data?.timetable ? 'Save changes' : 'Save timetable'}</Button>
            </PageHead>
            {error && <div className="mb-4"><Banner onClose={() => setError('')}>{error}</Banner></div>}

            {loading && !data ? <Card><Skeleton rows={6} /></Card> : failed ? <Card><LoadFailed what="the timetable" onRetry={reload} error={loadError} /></Card> : !subjects.length ? (
                <Card><Empty icon={CalendarRange} title={`No subjects in semester ${semester} yet`}>Add this semester’s subjects first; then place them in the week here.</Empty></Card>
            ) : (
                <div className="grid gap-5 xl:grid-cols-[1fr_260px]">
                    <Card className="min-w-0 overflow-hidden">
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-paper px-5 py-3">
                            <p className="text-sm text-ink-2"><span className="font-display text-lg font-semibold text-ink">Semester {semester}{section ? ` · Section ${section}` : ''}</span> <span className="ml-1">{filled} of {periods.length * 6} periods set{dirty ? ' · unsaved' : data?.timetable ? '' : ' · not saved yet'}</span></p>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-ink-3">Periods</span>
                                <Button size="sm" variant="secondary" icon={Minus} onClick={removePeriod} disabled={periods.length <= 1} aria-label="One period fewer" />
                                <span className="w-6 text-center text-sm font-bold tabular-nums">{periods.length}</span>
                                <Button size="sm" variant="secondary" icon={Plus} onClick={addPeriod} disabled={periods.length >= 12} aria-label="One period more" />
                                <Button size="sm" variant="ghost" icon={Eraser} onClick={clearAll} disabled={!filled}>Clear</Button>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse text-sm" style={{ minWidth: `${140 + periods.length * 150}px` }}>
                                <thead>
                                    <tr>
                                        <th scope="col" className="sticky left-0 z-10 w-28 border-b border-r border-line bg-paper px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[.1em] text-ink-3">Day</th>
                                        {periods.map((p, i) => (
                                            <th key={i} scope="col" className="border-b border-line bg-paper px-2 py-2 text-left align-top">
                                                <span className="block text-[11px] font-semibold uppercase tracking-[.1em] text-ink-3">Period {i + 1}</span>
                                                <span className="mt-1 flex items-center gap-1">
                                                    <input type="time" value={p.start} onChange={(e) => setTime(i, 'start', e.target.value)} aria-label={`Period ${i + 1} starts`} className="h-8 w-full min-w-0 rounded-md border border-line bg-white px-1.5 text-xs tabular-nums text-ink focus:border-petrol-500 focus:outline-none" />
                                                    <span className="text-ink-3">–</span>
                                                    <input type="time" value={p.end} onChange={(e) => setTime(i, 'end', e.target.value)} aria-label={`Period ${i + 1} ends`} className="h-8 w-full min-w-0 rounded-md border border-line bg-white px-1.5 text-xs tabular-nums text-ink focus:border-petrol-500 focus:outline-none" />
                                                </span>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {DAYS.map(([d, short, long]) => (
                                        <tr key={d}>
                                            <th scope="row" className="sticky left-0 z-10 border-b border-r border-line bg-white px-3 py-2 text-left font-display text-[15px] font-semibold text-ink"><abbr title={long} className="no-underline">{short}</abbr></th>
                                            {periods.map((_, i) => {
                                                const key = `${d}-${i + 1}`; const v = slots[key];
                                                return (
                                                    <td key={key} className="border-b border-line/70 p-1.5 align-top">
                                                        <div className={`rounded-lg p-1.5 ring-1 transition ${v ? tint(v.subjectId) : 'bg-white ring-line hover:ring-petrol-300'}`}>
                                                            <select value={v?.subjectId || ''} onChange={(e) => setSlot(key, { subjectId: e.target.value, room: v?.room || '' })} aria-label={`${long}, period ${i + 1}`}
                                                                className="w-full cursor-pointer truncate bg-transparent text-xs font-semibold focus:outline-none">
                                                                <option value="">— Free —</option>
                                                                {subjects.map((s) => <option key={s._id} value={s._id}>{s.code ? `${s.code} · ` : ''}{s.name}</option>)}
                                                            </select>
                                                            {v && <input value={v.room} onChange={(e) => setSlot(key, { ...v, room: e.target.value })} placeholder="Room" maxLength={30} aria-label={`${long}, period ${i + 1} room`}
                                                                className="mt-1 h-6 w-full rounded bg-white/70 px-1.5 text-[11px] placeholder:text-current placeholder:opacity-50 focus:outline-none focus:ring-1 focus:ring-current" />}
                                                        </div>
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                    <Card className="h-fit p-4">
                        <Label>Periods a week</Label>
                        <ul className="mt-2 space-y-1.5">
                            {weekly.map((s) => (
                                <li key={s._id} className="flex items-center gap-2 text-sm">
                                    <span className={`h-3 w-3 shrink-0 rounded-sm ring-1 ${tint(s._id)}`} />
                                    <span className="min-w-0 flex-1 truncate">{s.code && <span className="mr-1 font-mono text-[11px] text-brass-700">{s.code}</span>}{s.name}</span>
                                    <span className={`text-sm font-bold tabular-nums ${s.n ? 'text-ink' : 'text-ink-3'}`}>{s.n}</span>
                                </li>
                            ))}
                        </ul>
                        <p className="mt-3 border-t border-line pt-3 text-xs text-ink-3">Times are optional. Leave a period on “Free” for no class.</p>
                    </Card>
                </div>
            )}
            {confirmDialog}
        </>
    );
}
