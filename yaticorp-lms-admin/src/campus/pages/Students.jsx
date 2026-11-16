/**
 * Campus → Students (2026-11-14): every admitted student in the organization, by department and semester.
 * The department cards on top count each semester (tap one to see that class); the list below opens each
 * student's record. Server: GET /api/organizations/me/campus/students/all (src/campus/orgAdmin.js).
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { StudentList } from '../../pages/org/OrgStudents';
import OrgCertificateProgress from '../../pages/org/OrgCertificateProgress';
import { Users, GraduationCap, UserPlus } from 'lucide-react';
import StudentRecord from './StudentRecord';
import Requests from './Requests';
import { PickStudent, BulkAdmitDialog, NotAdmitted } from './Admissions';
import { PageHead, Tabs, Button, useToast, Register, TH, TD, Select, SearchBox, Roll, Person, Empty, Skeleton, LoadFailed, useData, plural } from '../ui';

/**
 * The one Students list while Campus is on (2026-11-16): by class (this page), every member of the
 * organization (the old Students list: search, export, add, scan cards, remove), and certificate progress.
 */
const VIEWS = [['class', 'By class'], ['members', 'All members'], ['certificates', 'Certificate progress']];
export default function Students() {
    const [params, setParams] = useSearchParams();
    const view = VIEWS.some(([v]) => v === params.get('view')) ? params.get('view') : 'class';
    const tabs = <Tabs className="mb-5" value={view} onChange={(v) => setParams(v === 'class' ? {} : { view: v }, { replace: true })} options={VIEWS} />;
    if (view === 'members') return <StudentList tabs={tabs} />;
    if (view === 'certificates') {
        return (
            <>
                <PageHead eyebrow="Campus" title="Students" sub="How your students are doing on your organization’s own courses." />
                {tabs}
                <OrgCertificateProgress />
            </>
        );
    }
    return <ByClass tabs={tabs} />;
}

function ByClass({ tabs }) {
    const [search, setSearch] = useState('');
    const [term, setTerm] = useState('');
    useEffect(() => { const t = setTimeout(() => setTerm(search), 250); return () => clearTimeout(t); }, [search]);
    const { data, loading, failed, reload } = useData('/students/all', { search: term });
    const departments = useMemo(() => data?.departments || [], [data]);
    const all = useMemo(() => data?.students || [], [data]);
    const [deptId, setDeptId] = useState('');
    const [semester, setSemester] = useState('');
    const [open, setOpen] = useState(null);
    // Add an existing student (2026-11-14): scan their card or find them, then their class — as in Admissions.
    const toast = useToast();
    const [adding, setAdding] = useState(null);   // 'pick' | { student }
    // Existing students with no class yet (added with their card): shown here to put in their class.
    const waiting = useData('/candidates', { limit: 1 });
    // Existing students who linked their card and asked to join, with the class they chose (2026-11-16).
    const asks = useData('/requests');
    const asking = asks.data?.requests?.length || 0;
    const [showWaiting, setShowWaiting] = useState(false);
    const dept = departments.find((d) => d._id === deptId);
    const nameOf = (id) => departments.find((d) => String(d._id) === String(id))?.name || '—';
    const rows = all.filter((s) => (!deptId || String(s.departmentId) === deptId) && (!semester || s.semester === Number(semester)));
    // Department → semester → how many.
    const counts = useMemo(() => {
        const c = {};
        for (const s of all) { const k = String(s.departmentId); c[k] = c[k] || { total: 0 }; c[k][s.semester] = (c[k][s.semester] || 0) + 1; c[k].total += 1; }
        return c;
    }, [all]);
    const pick = (d, sem) => { setDeptId(d); setSemester(sem ? String(sem) : ''); };

    return (
        <>
            <PageHead eyebrow="Campus" title="Students" sub="Every admitted student, by department and semester. Open one for their record.">
                <Button icon={UserPlus} onClick={() => setAdding('pick')}>Add existing student</Button>
            </PageHead>
            {tabs}

            {/* Requested (2026-11-16): existing students asking to join. Add to class = joined, in that class, admission number given. */}
            {asking > 0 && (
                <section className="mb-5 rounded-2xl border border-petrol-200 bg-petrol-50/40 p-4 sm:p-5">
                    <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                        <h2 className="text-sm font-bold text-ink">Requested to join <span className="ml-1 rounded-full bg-petrol-700 px-2 py-0.5 text-xs font-bold text-white tabular-nums">{asking}</span></h2>
                        <p className="text-xs text-ink-3">Check the class they chose, then add them. No admission form needed.</p>
                    </div>
                    <Requests embedded onCount={() => { asks.reload(); reload(); window.dispatchEvent(new Event('organization-requests-changed')); }} />
                </section>
            )}

            {/* Existing students with no class yet (2026-11-14): put them in their class here. */}
            {waiting.data?.total > 0 && (
                <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
                    <button type="button" onClick={() => setShowWaiting((v) => !v)} aria-expanded={showWaiting} className="flex w-full items-center justify-between gap-3 text-left">
                        <span className="text-sm font-semibold text-ink">{plural(waiting.data.total, 'student')} in your institution with no class yet</span>
                        <span className="text-sm font-semibold text-petrol-700">{showWaiting ? 'Hide' : 'Show and add'}</span>
                    </button>
                    {showWaiting && <div className="mt-4"><NotAdmitted onChanged={() => { waiting.reload(); reload(); }} /></div>}
                </div>
            )}

            {/* The departments: each semester's count, tap to see that class. */}
            {departments.length > 0 && (
                <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {departments.map((d) => {
                        const c = counts[String(d._id)] || { total: 0 };
                        const on = deptId === d._id;
                        return (
                            <div key={d._id} className={`rounded-2xl border bg-white p-4 shadow-sm transition ${on ? 'border-petrol-300 ring-1 ring-petrol-200' : 'border-line'}`}>
                                <button type="button" onClick={() => pick(on && !semester ? '' : d._id, '')} className="flex w-full items-center justify-between gap-2 text-left">
                                    <span className="flex min-w-0 items-center gap-2"><GraduationCap size={16} className="shrink-0 text-petrol-600" aria-hidden /><span className="truncate font-semibold text-ink">{d.name}</span></span>
                                    <span className="shrink-0 text-sm font-bold tabular-nums text-ink">{plural(c.total, 'student')}</span>
                                </button>
                                <div className="mt-3 flex flex-wrap gap-1.5">
                                    {Array.from({ length: d.semesters || 0 }, (_, i) => i + 1).map((n) => {
                                        const here = on && Number(semester) === n;
                                        return (
                                            <button key={n} type="button" onClick={() => pick(d._id, here ? '' : n)} aria-pressed={here}
                                                className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition ${here ? 'bg-petrol-700 text-white' : c[n] ? 'bg-paper text-ink-2 hover:bg-petrol-50' : 'bg-paper text-ink-3'}`}>
                                                Sem {n} <span className="tabular-nums opacity-80">· {c[n] || 0}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                <SearchBox value={search} onChange={setSearch} placeholder="Name, roll, admission or card no." className="sm:w-80" />
                <Select value={deptId} onChange={(e) => pick(e.target.value, '')} aria-label="Department" className="sm:w-52">
                    <option value="">All departments</option>
                    {departments.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
                </Select>
                <Select value={semester} onChange={(e) => setSemester(e.target.value)} disabled={!dept} aria-label="Semester" className="sm:w-44">
                    <option value="">All semesters</option>
                    {Array.from({ length: dept?.semesters || 0 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>Semester {n}</option>)}
                </Select>
                <p className="text-xs text-ink-3 sm:ml-auto">{data ? plural(rows.length, 'student') : ''}</p>
            </div>

            {loading && !data ? <Register><tbody><tr><td><Skeleton rows={6} /></td></tr></tbody></Register> : failed ? <Register><tbody><tr><td><LoadFailed what="the students" onRetry={reload} /></td></tr></tbody></Register> : !rows.length ? (
                <Register><tbody><tr><td><Empty icon={Users} title={term || deptId ? 'No one matches' : 'No students admitted yet'}>{term || deptId ? 'Try another search, department or semester.' : 'Students appear here once they are admitted (Admissions).'}</Empty></td></tr></tbody></Register>
            ) : (
                <Register>
                    <thead><tr><TH>Roll</TH><TH>Student</TH><TH>Department</TH><TH>Class</TH><TH>Admission no.</TH><TH>AI card</TH></tr></thead>
                    <tbody>
                        {rows.map((s) => (
                            <tr key={s._id} onClick={() => setOpen(s._id)} onKeyDown={(e) => e.key === 'Enter' && setOpen(s._id)} tabIndex={0} className="cursor-pointer transition hover:bg-petrol-50/60 focus:bg-petrol-50 focus:outline-none">
                                <TD><Roll value={s.rollNo} /></TD>
                                <TD><Person name={s.name} sub={s.email} src={s.picture} /></TD>
                                <TD className="text-ink-2">{nameOf(s.departmentId)}</TD>
                                <TD>Sem {s.semester}{s.section ? ` · ${s.section}` : ''}</TD>
                                <TD className="font-mono text-xs text-ink-2">{s.admissionNo || '—'}</TD>
                                <TD className="font-mono text-xs text-ink-2">{s.cardNumber || '—'}</TD>
                            </tr>
                        ))}
                    </tbody>
                </Register>
            )}
            {adding === 'pick' && <PickStudent title="Add an existing student" onClose={() => setAdding(null)} onPick={(st) => setAdding({ student: st })} />}
            {adding?.student && <BulkAdmitDialog students={[adding.student]} dept={dept} onClose={() => setAdding(null)} onDone={(m) => { setAdding(null); toast(m); reload(); waiting.reload(); }} />}
            {open && <StudentRecord studentId={open} onClose={() => setOpen(null)} onChanged={reload} />}
        </>
    );
}
