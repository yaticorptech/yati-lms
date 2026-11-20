/**
 * Parent announcements (2026-11-19, the user: "in the organization dashboard, a parent announcement — from that
 * organization, the parents who added its students get that announcement"). Write one, pin it, edit or delete it; the
 * parent dashboard (the student app's /parent → Announcements) shows it to every parent who added one of its students.
 * Server: /api/organizations/me/parent-announcements (yaticorp-lms-server/src/parent/announcements.js).
 */
import React, { useEffect, useState } from 'react';
import { Megaphone, Loader2, Pin, PinOff, Pencil, Trash2, Send, Users } from 'lucide-react';
import api from '../../utils/api';
import { CARD, BTN, BTN2, INPUT, LABEL, Banner, Rows, PageHeader, Dialog, DialogTitle } from '../../components/orgUi';

const when = (d) => new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
const BLANK = { title: '', body: '', pinned: false };

function Editor({ start = BLANK, busy, onSave, onCancel, submitLabel }) {
    const [f, setF] = useState(start);
    return (
        <form onSubmit={(e) => { e.preventDefault(); onSave(f); }} className="space-y-3">
            <div>
                <label htmlFor="pa-title" className={LABEL}>Title</label>
                <input id="pa-title" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} maxLength={140} placeholder="e.g. Parent–teacher meeting on Saturday" className={INPUT} />
            </div>
            <div>
                <label htmlFor="pa-body" className={LABEL}>Message</label>
                <textarea id="pa-body" rows={5} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} maxLength={4000} placeholder="What parents should know: the date, the time, the place, what to bring…" className={`${INPUT} resize-y`} />
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-700">
                <input type="checkbox" checked={f.pinned} onChange={(e) => setF({ ...f, pinned: e.target.checked })} className="h-4 w-4 accent-indigo-600" /> Pin it at the top
            </label>
            <div className="flex flex-wrap gap-2">
                <button type="submit" disabled={busy || !f.title.trim()} className={BTN}>{busy ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />} {submitLabel}</button>
                {onCancel && <button type="button" onClick={onCancel} className={BTN2}>Cancel</button>}
            </div>
        </form>
    );
}

export default function OrgParentAnnouncements() {
    const [data, setData] = useState(null);
    const [failed, setFailed] = useState(false);
    const [busy, setBusy] = useState('');
    const [notice, setNotice] = useState('');
    const [error, setError] = useState('');
    const [editing, setEditing] = useState(null);
    const [deleting, setDeleting] = useState(null);
    const [formKey, setFormKey] = useState(0);
    const load = () => api.get('/organizations/me/parent-announcements').then((r) => { setData(r.data); setFailed(false); }).catch(() => setFailed(true));
    useEffect(() => { load(); }, []);

    const send = async (key, call, done) => {
        setBusy(key); setError('');
        try { const r = await call(); setNotice(r.data.message); done?.(); await load(); }
        catch (err) { setError(err.response?.data?.message || 'That did not go through. Please try again.'); }
        finally { setBusy(''); }
    };

    return (
        <div className="w-full space-y-4 pb-10 lg:space-y-6">
            <PageHeader icon={Megaphone} title="Parent announcements" subtitle="Messages to the parents of your students. Every parent who added one of your students sees them on their parent dashboard.">
                {data && <span className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-50 px-3 py-2 text-sm font-bold text-indigo-700"><Users size={16} /> {data.parents} parent{data.parents === 1 ? '' : 's'} reached</span>}
            </PageHeader>
            {notice && <Banner kind="ok" onClose={() => setNotice('')}>{notice}</Banner>}
            {error && <Banner onClose={() => setError('')}>{error}</Banner>}

            <section className={`${CARD} p-4 sm:p-5`}>
                <h2 className="mb-3 text-base font-bold text-slate-800">New announcement</h2>
                <Editor key={formKey} busy={busy === 'new'} submitLabel="Send to parents"
                    onSave={(f) => send('new', () => api.post('/organizations/me/parent-announcements', f), () => setFormKey((k) => k + 1))} />
            </section>

            {failed ? <Banner>Could not load the announcements. <button type="button" onClick={load} className="font-bold underline">Try again</button></Banner>
                : !data ? <div className={`${CARD} p-5`}><Rows count={3} height="h-16" /></div>
                    : !data.announcements.length ? (
                        <div className={`${CARD} flex flex-col items-center px-6 py-12 text-center`}>
                            <span className="rounded-2xl bg-indigo-50 p-3 text-indigo-600"><Megaphone size={22} /></span>
                            <p className="mt-3 font-semibold text-slate-700">No announcements yet</p>
                            <p className="mt-1 max-w-sm text-sm text-slate-500">Write one above: a meeting, a holiday, the fee dates, an event.</p>
                        </div>
                    ) : (
                        <ul className="space-y-3">
                            {data.announcements.map((a) => (
                                <li key={a._id} className={`${CARD} p-4 sm:p-5 ${a.pinned ? 'ring-2 ring-amber-200' : ''}`}>
                                    {editing === a._id ? (
                                        <Editor start={{ title: a.title, body: a.body, pinned: a.pinned }} busy={busy === a._id} submitLabel="Save"
                                            onCancel={() => setEditing(null)} onSave={(f) => send(a._id, () => api.put(`/organizations/me/parent-announcements/${a._id}`, f), () => setEditing(null))} />
                                    ) : (
                                        <>
                                            <div className="flex items-start gap-3">
                                                <div className="min-w-0 flex-1">
                                                    <p className="flex items-center gap-2 font-bold text-slate-800">{a.pinned && <Pin size={15} className="shrink-0 text-amber-500" />}<span className="break-words">{a.title}</span></p>
                                                    <p className="mt-0.5 text-xs text-slate-500">{when(a.createdAt)}{a.by ? ` · ${a.by}` : ''}{a.updatedAt && new Date(a.updatedAt) - new Date(a.createdAt) > 60000 ? ' · edited' : ''}</p>
                                                </div>
                                                <div className="flex shrink-0 gap-1">
                                                    <button type="button" title={a.pinned ? 'Unpin' : 'Pin'} aria-label={a.pinned ? 'Unpin' : 'Pin'} disabled={!!busy}
                                                        onClick={() => send(a._id, () => api.put(`/organizations/me/parent-announcements/${a._id}`, { title: a.title, body: a.body, pinned: !a.pinned }))}
                                                        className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">{a.pinned ? <PinOff size={16} /> : <Pin size={16} />}</button>
                                                    <button type="button" title="Edit" aria-label="Edit" onClick={() => setEditing(a._id)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><Pencil size={16} /></button>
                                                    <button type="button" title="Delete" aria-label="Delete" onClick={() => setDeleting(a)} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={16} /></button>
                                                </div>
                                            </div>
                                            {a.body && <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{a.body}</p>}
                                        </>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}

            {deleting && (
                <Dialog onClose={() => setDeleting(null)}>
                    <div className="p-5 sm:p-6">
                        <DialogTitle>Delete this announcement?</DialogTitle>
                        <p className="mt-2 text-sm text-slate-600">“{deleting.title}” will no longer show on parents’ dashboards.</p>
                        <div className="mt-5 flex justify-end gap-2">
                            <button type="button" onClick={() => setDeleting(null)} className={BTN2}>Cancel</button>
                            <button type="button" disabled={busy === 'del'} onClick={() => send('del', () => api.delete(`/organizations/me/parent-announcements/${deleting._id}`), () => setDeleting(null))}
                                className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-rose-700 disabled:opacity-50">{busy === 'del' ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />} Delete</button>
                        </div>
                    </div>
                </Dialog>
            )}
        </div>
    );
}
