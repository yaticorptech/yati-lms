/**
 * Announcements (2026-11-14) — notices from the institution (the organization, the admission office
 * or a department's office) to a department's students, its teachers, or both; for every semester
 * or one, every section or one. Students see them on their Institution page, teachers on their
 * Attendance page. The HOD posts the same from their teacher dashboard.
 * Server: /api/organizations/me/campus/announcements (src/campus/orgAdmin.js).
 */
import React, { useState } from 'react';
import { Megaphone, Pin, PinOff, Trash2, Send } from 'lucide-react';
import api, { CAMPUS, errorOf } from '../api';
import { useCampus } from '../App';
import { PageHead, Card, Button, Field, Input, Textarea, Select, Banner, Chip, Empty, Skeleton, LoadFailed, useData, useToast, useConfirm, semestersOf } from '../ui';

const EMPTY = { title: '', body: '', semester: '', section: '', pinned: false, toStudents: true, toTeachers: false };
const ago = (d) => { const m = Math.round((Date.now() - new Date(d)) / 6e4); return m < 60 ? `${Math.max(1, m)}m ago` : m < 1440 ? `${Math.round(m / 60)}h ago` : new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }); };

export default function Announcements() {
    const { dept } = useCampus();
    const toast = useToast();
    const [confirm, confirmDialog] = useConfirm();
    const { data, loading, failed, error, reload } = useData('/announcements', { departmentId: dept._id });
    const [f, setF] = useState(EMPTY);
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState('');
    const rows = data?.announcements || [];
    const post = async (e) => {
        e.preventDefault(); setBusy(true); setErr('');
        try {
            const body = { ...f, departmentId: dept._id, semester: f.toStudents ? Number(f.semester) || 0 : 0, section: f.toStudents ? f.section : '' };
            toast((await api.post(`${CAMPUS}/announcements`, body)).data.message);
            setF(EMPTY); reload();
        } catch (x) { setErr(errorOf(x, 'The announcement could not be posted.')); } finally { setBusy(false); }
    };
    const act = async (fn) => { try { toast((await fn()).data.message); reload(); } catch (x) { toast(errorOf(x), 'error'); } };
    const remove = async (a) => { if (await confirm({ title: `Remove “${a.title}”?`, body: 'Students and teachers will no longer see it.', action: 'Remove', danger: true })) act(() => api.delete(`${CAMPUS}/announcements/${a._id}`, { params: { departmentId: dept._id } })); };
    return (
        <>
            <PageHead eyebrow={dept.name} title="Announcements" sub="Notices to this department’s students, its teachers, or both. Students see them on their Institution page; teachers on their Attendance page." />
            <div className="grid gap-5 lg:grid-cols-[minmax(0,400px)_1fr]">
                <Card className="h-fit p-5">
                    <h2 className="mb-4 font-semibold text-ink">New announcement</h2>
                    <form onSubmit={post} className="space-y-4">
                        <Field label="Title"><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} maxLength={150} required placeholder="Internal test on Monday" /></Field>
                        <Field label="Message"><Textarea value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} maxLength={3000} rows={5} placeholder="Details people need to know…" /></Field>
                        <fieldset>
                            <legend className="mb-1.5 text-[11px] font-semibold uppercase tracking-[.12em] text-ink-3">Send to</legend>
                            <div className="grid grid-cols-2 gap-2">
                                {[['toStudents', 'Students'], ['toTeachers', 'Teachers & HOD']].map(([k, l]) => (
                                    <label key={k} className={`flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${f[k] ? 'border-petrol-600 bg-petrol-50 text-petrol-800' : 'border-line-2 text-ink-2 hover:border-petrol-200'}`}>
                                        <input type="checkbox" checked={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.checked })} className="h-4 w-4 accent-petrol-600" /> {l}
                                    </label>
                                ))}
                            </div>
                        </fieldset>
                        {f.toStudents && (
                            <div className="grid grid-cols-2 gap-3">
                                <Field label="Semester"><Select value={f.semester} onChange={(e) => setF({ ...f, semester: e.target.value })}><option value="">All semesters</option>{semestersOf(dept).map((n) => <option key={n} value={n}>Semester {n}</option>)}</Select></Field>
                                {dept.sections?.length > 1 && <Field label="Section"><Select value={f.section} onChange={(e) => setF({ ...f, section: e.target.value })}><option value="">All sections</option>{dept.sections.map((x) => <option key={x} value={x}>Section {x}</option>)}</Select></Field>}
                            </div>
                        )}
                        <label className="flex items-center gap-2 text-sm text-ink-2"><input type="checkbox" checked={f.pinned} onChange={(e) => setF({ ...f, pinned: e.target.checked })} className="h-4 w-4 accent-petrol-600" /> Pin to the top</label>
                        {err && <Banner>{err}</Banner>}
                        <Button type="submit" icon={Send} busy={busy} disabled={!f.title.trim() || (!f.toStudents && !f.toTeachers)} className="w-full">Post</Button>
                    </form>
                </Card>
                <div className="min-w-0 space-y-3">
                    {loading ? <Card><Skeleton rows={4} /></Card> : failed ? <Card><LoadFailed what="the announcements" onRetry={reload} error={error} /></Card> : !rows.length ? (
                        <Card><Empty icon={Megaphone} title="No announcements yet">What you post shows to the people you choose.</Empty></Card>
                    ) : rows.map((a) => (
                        <Card key={a._id} className={`p-4 ${a.pinned ? 'border-brass-100 bg-brass-50/40' : ''}`}>
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="font-semibold text-ink">{a.pinned && <Pin size={13} className="mr-1.5 inline -translate-y-px text-brass-700" />}{a.title}</p>
                                    <p className="mt-1 flex flex-wrap gap-1.5 text-xs text-ink-3">
                                        {a.toStudents && <Chip tone="green">Students{a.semester ? ` · Sem ${a.semester}` : ''}{a.section ? ` ${a.section}` : ''}</Chip>}
                                        {a.toTeachers && <Chip tone="amber">Teachers</Chip>}
                                        <span>{a.by || 'Department'} · {ago(a.at)}</span>
                                    </p>
                                </div>
                                <div className="flex shrink-0 gap-1">
                                    <Button size="sm" variant="ghost" icon={a.pinned ? PinOff : Pin} onClick={() => act(() => api.put(`${CAMPUS}/announcements/${a._id}/pin`, { departmentId: dept._id }))} aria-label={a.pinned ? 'Unpin' : 'Pin'} />
                                    <Button size="sm" variant="ghost" icon={Trash2} onClick={() => remove(a)} aria-label="Remove" />
                                </div>
                            </div>
                            {a.body && <p className="mt-2 whitespace-pre-line text-sm text-ink-2">{a.body}</p>}
                        </Card>
                    ))}
                </div>
            </div>
            {confirmDialog}
        </>
    );
}
