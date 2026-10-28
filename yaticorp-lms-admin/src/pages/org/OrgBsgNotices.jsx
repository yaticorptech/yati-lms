/**
 * BSG notices, for a Bharat Scouts & Guides office (national or state): the
 * exams, camps, events and trainings it publishes, with their dates, place,
 * sections, the rank needed and the rules — what Scouts & Guides must already
 * know or bring — and its standing rules and regulations. A state office's
 * reach its state's institutions; the national office's reach everyone.
 * They only see them; nobody registers here. After an exam, camp or
 * training, the office marks who attended, and each of them sees it.
 * Server: src/nccnss/notices.js.
 */
import React, { useEffect, useState } from 'react';
import { Megaphone, Plus, Pencil, Trash2, UserCheck, Search, Loader2 } from 'lucide-react';
import api from '../../utils/api';
import useAutoRefresh from '../../hooks/useAutoRefresh';
import { CARD, LABEL, INPUT, BTN, BTN2, Banner, Rows, Empty, PageHeader, LoadFailed, Dialog, DialogTitle } from '../../components/orgUi';
import BsgNoticeCard from '../../components/BsgNoticeCard';
import { NOTICE_KINDS, SECTION_LABEL } from '../../utils/bsg';

const errorOf = (err, fallback) => err.response?.data?.message || fallback;
const day = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '');

const NoticeDialog = ({ notice, onClose, onDone }) => {
    const [form, setForm] = useState({
        kind: notice?.kind || 'exam', title: notice?.title || '', date: day(notice?.date), endDate: day(notice?.endDate),
        place: notice?.place || '', sections: notice?.sections || [], minRank: notice?.minRank || '',
        rules: (notice?.rules || []).join('\n'), details: notice?.details || ''
    });
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const set = (k) => (e) => { setForm((f) => ({ ...f, [k]: e.target.value })); setError(''); };
    const toggle = (s) => setForm((f) => ({ ...f, sections: f.sections.includes(s) ? f.sections.filter((x) => x !== s) : [...f.sections, s] }));
    const submit = async (e) => {
        e.preventDefault();
        setBusy(true); setError('');
        try {
            const res = notice ? await api.put(`/organizations/me/bsg/notices/${notice._id}`, form) : await api.post('/organizations/me/bsg/notices', form);
            onDone(res.data.message);
        } catch (err) { setError(errorOf(err, 'Could not save.')); setBusy(false); }
    };
    return (
        <Dialog onClose={() => { if (!busy) onClose(); }} size="max-w-xl">
            <form onSubmit={submit} className="flex min-h-0 flex-col">
                <div className="border-b border-slate-100 p-5"><DialogTitle>{notice ? 'Edit notice' : 'Publish a notice'}</DialogTitle></div>
                <div className="min-h-0 space-y-3 overflow-y-auto p-5">
                    <div className="grid gap-3 sm:grid-cols-3">
                        <label className="block"><span className={LABEL}>What</span>
                            <select className={INPUT} value={form.kind} onChange={set('kind')}>{NOTICE_KINDS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
                        </label>
                        <label className="block sm:col-span-2"><span className={LABEL}>Title</span><input className={INPUT} value={form.title} onChange={set('title')} placeholder="e.g. Rajya Puraskar testing camp" required /></label>
                    </div>
                    {form.kind !== 'rules' && (
                        <>
                            <div className="grid gap-3 sm:grid-cols-3">
                                <label className="block"><span className={LABEL}>Date</span><input type="date" className={INPUT} value={form.date} onChange={set('date')} required /></label>
                                <label className="block"><span className={LABEL}>Until (optional)</span><input type="date" className={INPUT} value={form.endDate} onChange={set('endDate')} /></label>
                                <label className="block"><span className={LABEL}>Rank needed</span><input className={INPUT} value={form.minRank} onChange={set('minRank')} placeholder="e.g. Tritiya Sopan" /></label>
                            </div>
                            <label className="block"><span className={LABEL}>Place</span><input className={INPUT} value={form.place} onChange={set('place')} /></label>
                        </>
                    )}
                    <div>
                        <span className={LABEL}>For which sections (none ticked = every section)</span>
                        <div className="flex flex-wrap gap-1.5">
                            {Object.entries(SECTION_LABEL).map(([v, l]) => (
                                <button key={v} type="button" onClick={() => toggle(v)}
                                    className={`rounded-full px-3 py-1.5 text-xs font-bold ring-1 ${form.sections.includes(v) ? 'bg-indigo-50 text-indigo-700 ring-indigo-300' : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50'}`}>{l}</button>
                            ))}
                        </div>
                    </div>
                    <label className="block"><span className={LABEL}>{form.kind === 'rules' ? 'Rules and regulations (one per line)' : 'Rules — what they should know or bring (one per line)'}</span>
                        <textarea className={INPUT} rows={5} value={form.rules} onChange={set('rules')} placeholder={'Tie and use 10 knots\nFirst aid for cuts, burns and sprains\nBring uniform and scarf'} />
                    </label>
                    <label className="block"><span className={LABEL}>Details</span><textarea className={INPUT} rows={3} value={form.details} onChange={set('details')} /></label>
                    {error && <Banner>{error}</Banner>}
                </div>
                <div className="flex justify-end gap-2 border-t border-slate-100 p-4">
                    <button type="button" onClick={onClose} disabled={busy} className={BTN2}>Cancel</button>
                    <button type="submit" disabled={busy} className={BTN}>{notice ? 'Save' : 'Publish'}</button>
                </div>
            </form>
        </Dialog>
    );
};

/** Who attended an exam, camp or training: those marked, and a search to mark more. */
const AttendanceDialog = ({ notice, onClose, onDone }) => {
    const [present, setPresent] = useState(null);       // [{ _id, name, card, unit, section, institution }]
    const [found, setFound] = useState([]);
    const [search, setSearch] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const fetchRows = async (q = '') => {
        try {
            const res = await api.get(`/organizations/me/bsg/notices/${notice._id}/attendance`, { params: { search: q || undefined } });
            setPresent((p) => p || res.data.present);
            setFound(res.data.found);
        } catch (err) { setError(errorOf(err, 'Could not load.')); }
    };
    useEffect(() => { fetchRows(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
    const has = (m) => present?.some((x) => x._id === m._id);
    const toggle = (m) => setPresent((p) => (has(m) ? p.filter((x) => x._id !== m._id) : [...p, m]));
    const save = async () => {
        setBusy(true); setError('');
        try { onDone((await api.put(`/organizations/me/bsg/notices/${notice._id}/attendance`, { presentMemberIds: present.map((m) => m._id) })).data.message); }
        catch (err) { setError(errorOf(err, 'Could not save.')); setBusy(false); }
    };
    const Row = ({ m }) => (
        <label className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:bg-slate-50">
            <input type="checkbox" checked={has(m)} onChange={() => toggle(m)} className="h-4 w-4 accent-emerald-600" />
            <span className="min-w-0"><span className="font-semibold text-slate-800">{m.name}</span> <span className="text-xs text-slate-500">· {m.card}{m.unit ? ` · ${m.unit}` : ''} · {m.institution}</span></span>
        </label>
    );
    return (
        <Dialog onClose={() => { if (!busy) onClose(); }} size="max-w-xl">
            <div className="border-b border-slate-100 p-5"><DialogTitle>Attendance — {notice.title}</DialogTitle></div>
            <div className="min-h-0 space-y-3 overflow-y-auto p-5">
                <form onSubmit={(e) => { e.preventDefault(); fetchRows(search); }} className="flex gap-2">
                    <input className={INPUT} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Find a Scout or Guide by name or card number" />
                    <button type="submit" className={`${BTN2} shrink-0`}><Search size={15} /> Find</button>
                </form>
                {found.length > 0 && <ul className="max-h-56 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200">{found.map((m) => <li key={m._id}><Row m={m} /></li>)}</ul>}
                <p className={LABEL}>Present ({present?.length ?? 0})</p>
                {!present ? <Rows count={2} /> : present.length === 0 ? <p className="text-sm text-slate-500">No one marked yet. Find them above and tick them.</p> : (
                    <ul className="max-h-64 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200">{present.map((m) => <li key={m._id}><Row m={m} /></li>)}</ul>
                )}
                {error && <Banner>{error}</Banner>}
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 p-4">
                <button type="button" onClick={onClose} disabled={busy} className={BTN2}>Cancel</button>
                <button type="button" onClick={save} disabled={busy || !present} className={BTN}>{busy && <Loader2 size={16} className="animate-spin" />}Save ({present?.length ?? 0} present)</button>
            </div>
        </Dialog>
    );
};

const OrgBsgNotices = () => {
    const [data, setData] = useState(null);
    const [failed, setFailed] = useState(false);
    const [notice, setNotice] = useState(null);
    const [editing, setEditing] = useState(null);   // 'new', or a notice
    const [marking, setMarking] = useState(null);
    const load = async ({ signal, isCurrent = () => true } = {}) => {
        try {
            const res = await api.get('/organizations/me/bsg/notices', { signal });
            if (isCurrent()) { setData(res.data); setFailed(false); }
        } catch { if (isCurrent()) setFailed(true); }
    };
    const reload = useAutoRefresh(load, 60000, []);
    const done = (text) => { setEditing(null); setMarking(null); setNotice({ kind: 'ok', text }); reload(); };
    const remove = async (n) => {
        if (!window.confirm(`Remove "${n.title}"? Scouts & Guides stop seeing it.`)) return;
        try { done((await api.delete(`/organizations/me/bsg/notices/${n._id}`)).data.message); }
        catch (err) { setNotice({ kind: 'error', text: errorOf(err, 'Could not remove.') }); }
    };
    const reach = data?.office?.level === 'national' ? 'every Scout and Guide on the platform' : `the Scouts and Guides of ${data?.office?.state || 'your state'}'s institutions`;
    return (
        <div className="space-y-4 lg:space-y-6 animate-fade-in pb-10">
            <PageHeader icon={Megaphone} title="BSG notices" subtitle={data ? `Exams, camps and events for ${reach}. They see them on their Scouts & Guides page.` : 'Exams, camps and events for Scouts & Guides.'}>
                <button onClick={() => setEditing('new')} className={`${BTN} shrink-0`}><Plus size={16} /> Publish</button>
            </PageHeader>
            {notice && <Banner kind={notice.kind} onClose={() => setNotice(null)}>{notice.text}</Banner>}
            {!data ? (failed ? <div className={CARD}><LoadFailed what="your notices" onRetry={reload} /></div> : <Rows count={3} height="h-28" />) : data.notices.length === 0 ? (
                <div className={CARD}><Empty icon={Megaphone}>Nothing published yet. Publish an exam, camp or event with its date and rules.</Empty></div>
            ) : (
                <div className="space-y-3">
                    {data.notices.map((n) => (
                        <BsgNoticeCard key={n._id} notice={n} actions={(
                            <span className="flex shrink-0 items-center gap-1">
                                {n.kind !== 'rules' && (
                                    <button onClick={() => setMarking(n)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50">
                                        <UserCheck size={14} /> {n.attendanceTaken ? `${n.presentCount} attended` : 'Attendance'}
                                    </button>
                                )}
                                <button onClick={() => setEditing(n)} className="p-1.5 text-slate-400 hover:text-indigo-600" aria-label={`Edit ${n.title}`}><Pencil size={16} /></button>
                                <button onClick={() => remove(n)} className="p-1.5 text-slate-400 hover:text-red-600" aria-label={`Remove ${n.title}`}><Trash2 size={16} /></button>
                            </span>
                        )} />
                    ))}
                </div>
            )}
            {marking && <AttendanceDialog notice={marking} onClose={() => setMarking(null)} onDone={done} />}
            {editing && <NoticeDialog notice={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onDone={done} />}
        </div>
    );
};

export default OrgBsgNotices;
