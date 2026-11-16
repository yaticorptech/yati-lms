/**
 * Private courses (2026-11-12, user: "in courses add another section like private courses … admin can add courses to
 * particular students … it will be displayed to those students only … in Available Courses in the student dashboard").
 *
 * A platform course made private is seen only by the students chosen here: in their Available Courses, its page, and
 * its lessons once they enrol. Every other student never sees it. "Make public" gives it back to everyone.
 * The server's rule is services/courseAccess.js; the API is controllers/privateCourseController.js.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, Plus, Users as UsersIcon, Globe, Pencil, Check, X, BookOpen, Eye, EyeOff, FolderLock } from 'lucide-react';
import api from '../utils/api';
import Select from '../components/Select';
import { PageHeader, CARD, BTN, BTN2, LABEL, INPUT, Banner, LoadFailed, Rows, Empty, SearchInput, Avatar, Dialog, DialogTitle } from '../components/orgUi';

const messageOf = (err, fallback) => err?.response?.data?.message || fallback;

/**
 * The popup that creates a private course (`create`), makes an existing one private, or changes who it is for
 * (`course` given).
 */
function PrivateEditor({ create = false, course, courses, students, onClose, onSaved }) {
    const [courseId, setCourseId] = useState(course?._id || '');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [price, setPrice] = useState('');
    const [picked, setPicked] = useState(() => new Set(course?.studentIds || []));
    const [search, setSearch] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const offered = courses.filter((c) => !c.isPrivate);
    const q = search.trim().toLowerCase();
    const shown = useMemo(() => students.filter((s) => !q || [s.name, s.email, s.cardNumber, s.organization].some((v) => String(v || '').toLowerCase().includes(q))), [students, q]);
    const toggle = (id) => setPicked((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });
    const chosen = students.filter((s) => picked.has(s._id));

    const save = async () => {
        if (create && !title.trim()) { setError('Give the course a title.'); return; }
        if (!create && !courseId) { setError('Choose a course first.'); return; }
        if (!picked.size) { setError('Choose at least one student.'); return; }
        setBusy(true); setError('');
        try {
            if (create) {
                const { data } = await api.post('/admin/private-courses', { title: title.trim(), description, price: Number(price) || 0, studentIds: [...picked] });
                onSaved(data);
                return;
            }
            await api.put(`/admin/private-courses/${courseId}`, { isPrivate: true, studentIds: [...picked] });
            onSaved();
        } catch (err) {
            setError(messageOf(err, 'Could not save. Please try again.'));
            setBusy(false);
        }
    };

    return (
        <Dialog onClose={() => { if (!busy) onClose(); }} size="max-w-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-5">
                <div>
                    <DialogTitle>{create ? 'Create a private course' : course ? `Students for ${course.title}` : 'Make an existing course private'}</DialogTitle>
                    <p className="mt-0.5 text-sm text-slate-500">{create ? 'Then add its lessons and publish it: only the students you choose will see it.' : 'Only the students you choose will see it in their Available courses.'}</p>
                </div>
                <button type="button" onClick={onClose} disabled={busy} aria-label="Close" className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100"><X size={20} /></button>
            </div>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
                {create && (
                    <div className="grid gap-4 sm:grid-cols-[1fr_9rem]">
                        <div>
                            <label className={LABEL} htmlFor="private-title">Course title</label>
                            <input id="private-title" className={INPUT} value={title} onChange={(e) => { setTitle(e.target.value); setError(''); }} placeholder="e.g. Placement training: batch A" maxLength={120} autoFocus />
                        </div>
                        <div>
                            <label className={LABEL} htmlFor="private-price">Price (₹)</label>
                            <input id="private-price" className={INPUT} type="number" min="0" inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0 = free" />
                        </div>
                        <div className="sm:col-span-2">
                            <label className={LABEL} htmlFor="private-description">Description <span className="font-medium normal-case tracking-normal text-slate-400">(optional)</span></label>
                            <textarea id="private-description" className={`${INPUT} resize-none`} rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What the students will learn" />
                        </div>
                    </div>
                )}
                {!course && !create && (
                    <div>
                        <label className={LABEL} htmlFor="private-course">Course</label>
                        <Select id="private-course" value={courseId} onChange={(e) => { setCourseId(e.target.value); setError(''); }} aria-label="Course">
                            <option value="">Choose a course…</option>
                            {offered.map((c) => <option key={c._id} value={c._id}>{c.title}{c.isPublished ? '' : ' (draft)'}</option>)}
                        </Select>
                        {!offered.length && <p className="mt-1.5 text-sm text-slate-500">Every platform course is private already.</p>}
                    </div>
                )}
                <div>
                    <div className="mb-1 flex items-center justify-between gap-2">
                        <span className={LABEL}>Students</span>
                        <span className="text-xs font-bold text-indigo-600 tabular-nums" aria-live="polite">{picked.size} chosen</span>
                    </div>
                    {chosen.length > 0 && (
                        <div className="mb-3 flex flex-wrap gap-1.5" data-chosen-students>
                            {chosen.map((s) => (
                                <span key={s._id} className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 py-1 pl-2.5 pr-1 text-xs font-semibold text-indigo-700">
                                    {s.name || s.email}
                                    <button type="button" onClick={() => toggle(s._id)} aria-label={`Remove ${s.name || s.email}`} className="inline-flex h-5 w-5 items-center justify-center rounded-full hover:bg-indigo-100"><X size={12} /></button>
                                </span>
                            ))}
                        </div>
                    )}
                    <SearchInput value={search} onChange={setSearch} placeholder="Search by name, email, card or organization" className="w-full" />
                    <ul className="mt-2 max-h-72 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200" aria-label="Students">
                        {shown.length === 0 && <li className="p-4 text-center text-sm text-slate-500">No student matches “{search}”.</li>}
                        {shown.map((s) => {
                            const on = picked.has(s._id);
                            return (
                                <li key={s._id}>
                                    <button type="button" onClick={() => toggle(s._id)} aria-pressed={on} className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors ${on ? 'bg-indigo-50' : 'hover:bg-slate-50'}`} data-student={s._id}>
                                        <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 ${on ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300 bg-white'}`} aria-hidden>{on && <Check size={13} strokeWidth={3.5} />}</span>
                                        <Avatar name={s.name} src={s.profilePicture} size="h-8 w-8 text-xs" />
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate text-sm font-semibold text-slate-800">{s.name || '(no name)'}</span>
                                            <span className="block truncate text-xs text-slate-500">{[s.cardNumber && `Card ${s.cardNumber}`, s.email, s.organization].filter(Boolean).join(' · ')}</span>
                                        </span>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                </div>
                {error && <Banner>{error}</Banner>}
            </div>
            <div className="flex justify-end gap-3 border-t border-slate-100 p-4">
                <button type="button" onClick={onClose} disabled={busy} className={BTN2}>Cancel</button>
                <button type="button" onClick={save} disabled={busy} className={BTN} data-save-private>{busy ? 'Saving…' : create ? 'Create and add lessons' : course ? 'Save students' : 'Make private'}</button>
            </div>
        </Dialog>
    );
}

export default function PrivateCourses() {
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [failed, setFailed] = useState(false);
    const [editing, setEditing] = useState(null); // null | 'create' | 'existing' | course
    const [making, setMaking] = useState(null); // a course to make public again
    const [busy, setBusy] = useState(false);
    const [notice, setNotice] = useState(null);

    const load = () => api.get('/admin/private-courses')
        .then((r) => { setData(r.data); setFailed(false); })
        .catch(() => setFailed(true));
    useEffect(() => { load(); }, []);

    const byId = useMemo(() => new Map((data?.students || []).map((s) => [s._id, s])), [data]);
    const privateOnes = (data?.courses || []).filter((c) => c.isPrivate);

    // Published: the chosen students see it in Available courses; a draft is seen by no one.
    const togglePublish = async (c) => {
        setBusy(true);
        try {
            await api.put(`/admin/courses/${c._id}`, { isPublished: !c.isPublished });
            setNotice({ kind: 'success', text: c.isPublished ? `${c.title} is a draft now: its students no longer see it.` : `${c.title} is published: its ${c.studentIds.length} student${c.studentIds.length === 1 ? '' : 's'} can see it now.` });
            await load();
        } catch (err) {
            setNotice({ kind: 'error', text: messageOf(err, 'Could not change it. Please try again.') });
        } finally { setBusy(false); }
    };

    const makePublic = async () => {
        setBusy(true);
        try {
            await api.put(`/admin/private-courses/${making._id}`, { isPrivate: false });
            setNotice({ kind: 'success', text: `${making.title} is public again: every student can see it.` });
            setMaking(null);
            await load();
        } catch (err) {
            setNotice({ kind: 'error', text: messageOf(err, 'Could not make it public. Please try again.') });
        } finally { setBusy(false); }
    };

    return (
        <div className="space-y-5 animate-fade-in">
            <PageHeader icon={Lock} title="Private courses" subtitle="Courses only the students you choose can see. They show in those students' Available courses.">
                <button type="button" onClick={() => setEditing('existing')} disabled={!data} className={BTN2} data-make-private><FolderLock size={18} /> Make an existing course private</button>
                <button type="button" onClick={() => setEditing('create')} disabled={!data} className={BTN} data-create-private><Plus size={18} /> Create private course</button>
            </PageHeader>
            {notice && <Banner kind={notice.kind} onClose={() => setNotice(null)}>{notice.text}</Banner>}

            <div className={CARD}>
                {failed ? <LoadFailed what="the private courses" onRetry={load} />
                    : !data ? <Rows count={3} height="h-20" />
                    : !privateOnes.length ? <Empty icon={Lock}>No private courses yet. Create one, choose its students, add its lessons and publish it.</Empty>
                    : (
                        <ul className="divide-y divide-slate-100">
                            {privateOnes.map((c) => {
                                const people = c.studentIds.map((id) => byId.get(id)).filter(Boolean);
                                return (
                                    <li key={c._id} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-5" data-private-course={c._id}>
                                        <div className="flex min-w-0 flex-1 items-center gap-4">
                                            {c.thumbnail
                                                ? <img src={c.thumbnail} alt="" className="h-14 w-20 shrink-0 rounded-xl object-cover" />
                                                : <span className="flex h-14 w-20 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-400"><BookOpen size={22} /></span>}
                                            <div className="min-w-0">
                                                <p className="flex flex-wrap items-center gap-2 font-bold text-slate-800">
                                                    <span className="truncate">{c.title}</span>
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700"><Lock size={11} /> Private</span>
                                                    {c.isPublished
                                                        ? <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">Published</span>
                                                        : <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-500">Draft: its students see it once published</span>}
                                                </p>
                                                <div className="mt-1.5 flex items-center gap-2">
                                                    <div className="flex -space-x-2">
                                                        {people.slice(0, 5).map((s) => <span key={s._id} className="rounded-full ring-2 ring-white"><Avatar name={s.name} src={s.profilePicture} size="h-7 w-7 text-[10px]" /></span>)}
                                                    </div>
                                                    <span className="truncate text-sm text-slate-500">
                                                        <UsersIcon size={14} className="mr-1 inline align-[-2px]" />
                                                        {people.length} student{people.length === 1 ? '' : 's'}{people.length ? `: ${people.slice(0, 3).map((s) => s.name || s.email).join(', ')}${people.length > 3 ? ` and ${people.length - 3} more` : ''}` : ''}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex shrink-0 flex-wrap gap-2">
                                            <Link to={`/courses/${c._id}`} className={BTN2}><Pencil size={16} /> Edit course</Link>
                                            <button type="button" onClick={() => togglePublish(c)} disabled={busy} className={c.isPublished ? BTN2 : BTN}>{c.isPublished ? <><EyeOff size={16} /> Unpublish</> : <><Eye size={16} /> Publish</>}</button>
                                            <button type="button" onClick={() => setEditing(c)} className={BTN2}><UsersIcon size={16} /> Students</button>
                                            <button type="button" onClick={() => setMaking(c)} className={BTN2} title="Every student will see it"><Globe size={16} /> Make public</button>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
            </div>

            {editing && data && (
                <PrivateEditor create={editing === 'create'} course={typeof editing === 'object' ? editing : null} courses={data.courses} students={data.students} onClose={() => setEditing(null)}
                    onSaved={async (made) => {
                        const was = editing; setEditing(null);
                        // Created: on to its editor, to add its lessons and publish it.
                        if (was === 'create' && made?._id) { navigate(`/courses/${made._id}`); return; }
                        setNotice({ kind: 'success', text: was === 'existing' ? 'The course is private now: only the students chosen can see it.' : 'Students saved.' });
                        await load();
                    }} />
            )}
            {making && (
                <Dialog onClose={() => { if (!busy) setMaking(null); }}>
                    <div className="p-5">
                        <DialogTitle>Make {making.title} public?</DialogTitle>
                        <p className="mt-2 text-sm text-slate-600">Every student will see it in Available courses again. Students already enrolled keep it.</p>
                    </div>
                    <div className="flex justify-end gap-3 border-t border-slate-100 p-4">
                        <button type="button" onClick={() => setMaking(null)} disabled={busy} className={BTN2}>Cancel</button>
                        <button type="button" onClick={makePublic} disabled={busy} className={BTN}>{busy ? 'Saving…' : 'Make public'}</button>
                    </div>
                </Dialog>
            )}
        </div>
    );
}
