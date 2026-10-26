/**
 * Linguistic Ability (admin) — /linguistic, for platform admins.
 *   Lessons    every lesson by module and level: create, edit, publish, unpublish, delete
 *   Students   progress, quiz results, lessons completed
 *   Settings   passing scores, the certificate's average, the daily challenge
 * Points are Reward rules (the Rewards page); the section's on/off switch is in Settings.
 * Writing is checked in the lesson and stays the student's own: no Reviews tab (2026-10-26).
 */
import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Languages, Plus, Pencil, Eye, EyeOff, Trash2, Loader2, Save } from 'lucide-react';
import api from '../../utils/api';
import { INPUT, LABEL, BTN, CARD, PageHeader, Segmented, Rows, LoadFailed, Banner, Empty } from '../../components/orgUi';
// A select as wide as its choices, not the whole row.
const SELECT = INPUT.replace('w-full', 'w-auto');
import DeleteConfirmModal from '../../components/DeleteConfirmModal';
import { MODULES, LEVELS, MODULE_LABEL, LEVEL_LABEL, DIRECTIONS, errorOf, fmtDate } from './shared';
import LessonEditor from './LessonEditor';
import { StudentsPanel } from './Panels';

const DIRECTION = Object.fromEntries(DIRECTIONS);

function LessonsTab() {
    const [params, setParams] = useSearchParams();
    const editing = params.get('lesson');
    const [module, setModule] = useState('');
    const [level, setLevel] = useState('');
    const [rows, setRows] = useState(null);
    const [overview, setOverview] = useState(null);
    const [error, setError] = useState(false);
    const [busy, setBusy] = useState('');
    const [notice, setNotice] = useState(null);
    const [deleting, setDeleting] = useState(null);
    // The editor starts afresh when one is opened, but not when a new lesson is
    // saved and takes its id, so "Lesson created" stays in view.
    const [editorKey, setEditorKey] = useState(0);

    const load = useCallback(() => Promise.all([
        api.get('/linguistic/admin/lessons', { params: { module, level } }),
        api.get('/linguistic/admin/overview')
    ]).then(([l, o]) => { setRows(l.data.lessons); setOverview(o.data); setError(false); }).catch(() => setError(true)), [module, level]);
    useEffect(() => { if (!editing) load(); }, [load, editing]);

    const point = (id) => setParams((p) => { const n = new URLSearchParams(p); if (id) n.set('lesson', id); else n.delete('lesson'); return n; });
    const edit = (id) => { setEditorKey((k) => k + 1); point(id); };
    const flip = (l) => {
        setBusy(l.id); setNotice(null);
        api.patch(`/linguistic/admin/lessons/${l.id}/status`, { status: l.status === 'published' ? 'draft' : 'published' })
            .then((r) => { setRows((rs) => rs.map((x) => (x.id === l.id ? r.data : x))); setNotice({ kind: 'success', text: `"${l.title}" is now ${r.data.status === 'published' ? 'published' : 'a draft, hidden from students'}.` }); })
            .catch((e) => setNotice({ kind: 'error', text: errorOf(e) })).finally(() => setBusy(''));
    };
    const remove = () => {
        const l = deleting;
        api.delete(`/linguistic/admin/lessons/${l.id}`).then(() => { setRows((rs) => rs.filter((x) => x.id !== l.id)); setNotice({ kind: 'success', text: `"${l.title}" was deleted.` }); })
            .catch((e) => setNotice({ kind: 'error', text: errorOf(e) })).finally(() => setDeleting(null));
    };

    if (editing) return <LessonEditor key={editorKey} id={editing} onClose={() => edit(null)} onSaved={(l) => { if (editing === 'new') point(l.id); }} />;

    return (
        <div className="space-y-4">
            {overview && (
                <div className={`${CARD} overflow-x-auto p-4`}>
                    <table className="w-full min-w-[32rem] text-sm" data-overview>
                        <thead><tr className="text-[11px] uppercase tracking-wider text-slate-500"><th className="pb-2 text-left">Module</th>{LEVELS.map(([k, l]) => <th key={k} className="pb-2 text-left">{l}</th>)}</tr></thead>
                        <tbody>{MODULES.map(([m, label]) => (
                            <tr key={m} className="border-t border-slate-100">
                                <td className="py-2 pr-3 font-bold text-slate-700">{label}</td>
                                {LEVELS.map(([lv]) => { const c = overview.grid[m][lv]; return <td key={lv} className="py-2 pr-3 text-slate-600"><span className="font-bold text-slate-800">{c.published}</span> published{c.draft ? <span className="text-amber-600"> · {c.draft} draft{c.draft === 1 ? '' : 's'}</span> : ''}</td>; })}
                            </tr>
                        ))}</tbody>
                    </table>
                </div>
            )}
            <div className="flex flex-wrap items-end gap-2">
                <label><span className={LABEL}>Module</span><select value={module} onChange={(e) => setModule(e.target.value)} className={SELECT}><option value="">All modules</option>{MODULES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
                <label><span className={LABEL}>Level</span><select value={level} onChange={(e) => setLevel(e.target.value)} className={SELECT}><option value="">All levels</option>{LEVELS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
                <button type="button" onClick={() => edit('new')} className={`${BTN} ml-auto`} data-new-lesson><Plus size={16} /> New lesson</button>
            </div>
            {notice && <Banner kind={notice.kind} onClose={() => setNotice(null)}>{notice.text}</Banner>}
            {error ? <LoadFailed what="the lessons" onRetry={load} /> : !rows ? <Rows count={6} /> : !rows.length ? <Empty icon={Languages}>No lessons match these filters.</Empty> : (
                <div className={`${CARD} overflow-x-auto`}>
                    <table className="w-full min-w-[52rem] text-left text-sm" data-lessons>
                        <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500"><tr><th className="px-4 py-2.5">Lesson</th><th className="px-3 py-2.5">Module</th><th className="px-3 py-2.5">Level</th><th className="px-3 py-2.5">Content</th><th className="px-3 py-2.5">Status</th><th className="px-3 py-2.5">Updated</th><th className="px-3 py-2.5 text-right">Actions</th></tr></thead>
                        <tbody>{rows.map((l) => (
                            <tr key={l.id} className="border-t border-slate-100" data-lesson-row={l.id}>
                                <td className="px-4 py-2.5"><button type="button" onClick={() => edit(l.id)} className="text-left font-bold text-slate-800 hover:text-indigo-700">{l.order}. {l.title}</button>{l.direction && <p className="text-xs text-rose-600">{DIRECTION[l.direction]}</p>}</td>
                                <td className="px-3 py-2.5 text-slate-600">{MODULE_LABEL[l.module]}</td>
                                <td className="px-3 py-2.5 text-slate-600">{LEVEL_LABEL[l.level]}</td>
                                <td className="px-3 py-2.5 text-xs text-slate-500">{[l.counts.words && `${l.counts.words} words`, l.counts.practice && `${l.counts.practice} practice`, l.counts.items && `${l.counts.items} items`, l.counts.writing && `${l.counts.writing} writing`, l.counts.lines && `${l.counts.lines} lines`, l.counts.quiz && `${l.counts.quiz} quiz`].filter(Boolean).join(' · ')}</td>
                                <td className="px-3 py-2.5"><span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${l.status === 'published' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`} data-status>{l.status === 'published' ? 'Published' : 'Draft'}</span></td>
                                <td className="px-3 py-2.5 text-xs text-slate-500">{fmtDate(l.updatedAt)}<br />{l.updatedBy}</td>
                                <td className="px-3 py-2.5">
                                    <div className="flex justify-end gap-1">
                                        <button type="button" onClick={() => edit(l.id)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-indigo-700" aria-label={`Edit ${l.title}`}><Pencil size={15} /></button>
                                        <button type="button" onClick={() => flip(l)} disabled={busy === l.id} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-indigo-700" aria-label={l.status === 'published' ? `Unpublish ${l.title}` : `Publish ${l.title}`} title={l.status === 'published' ? 'Unpublish' : 'Publish'}>
                                            {busy === l.id ? <Loader2 size={15} className="animate-spin" /> : l.status === 'published' ? <EyeOff size={15} /> : <Eye size={15} />}
                                        </button>
                                        <button type="button" onClick={() => setDeleting(l)} className="rounded-lg p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-600" aria-label={`Delete ${l.title}`}><Trash2 size={15} /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}</tbody>
                    </table>
                </div>
            )}
            <DeleteConfirmModal isOpen={!!deleting} onClose={() => setDeleting(null)} onConfirm={remove} title="Delete lesson" message="Students will no longer see this lesson. Their past scores are kept." itemName={deleting?.title} />
        </div>
    );
}

function SettingsTab() {
    const [config, setConfig] = useState(null);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [busy, setBusy] = useState(false);
    useEffect(() => { api.get('/linguistic/admin/config').then((r) => setConfig(r.data)).catch((e) => setError(errorOf(e))); }, []);
    const save = () => {
        setBusy(true); setError(''); setNotice('');
        api.put('/linguistic/admin/config', config).then((r) => { setConfig(r.data); setNotice('Settings saved.'); }).catch((e) => setError(errorOf(e))).finally(() => setBusy(false));
    };
    if (!config) return error ? <Banner>{error}</Banner> : <Rows count={3} />;
    return (
        <div className={`${CARD} space-y-5 p-4 sm:p-6`} data-ling-settings>
            {error && <Banner onClose={() => setError('')}>{error}</Banner>}
            {notice && <Banner kind="success" onClose={() => setNotice('')}>{notice}</Banner>}
            <div>
                <h2 className="text-base font-bold text-slate-800">Passing score per level</h2>
                <p className="text-xs text-slate-500">A lesson is complete when its quiz reaches this score. Students can retake quizzes as often as they like.</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    {LEVELS.map(([k, l]) => (
                        <label key={k}><span className={LABEL}>{l} (%)</span><input type="number" min={30} max={100} value={config.passingScore[k]} onChange={(e) => setConfig((c) => ({ ...c, passingScore: { ...c.passingScore, [k]: e.target.value } }))} className={INPUT} data-pass={k} /></label>
                    ))}
                </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
                <label><span className={LABEL}>Certificate: average quiz score needed (%)</span><input type="number" min={0} max={100} value={config.certificateMinAverage} onChange={(e) => setConfig((c) => ({ ...c, certificateMinAverage: e.target.value }))} className={INPUT} /><span className="mt-1 block text-[11px] text-slate-400">Issued when every lesson of a level is complete and the average best score reaches this.</span></label>
                <label><span className={LABEL}>Daily challenge: questions</span><input type="number" min={3} max={15} value={config.dailyChallengeSize} onChange={(e) => setConfig((c) => ({ ...c, dailyChallengeSize: e.target.value }))} className={INPUT} /></label>
            </div>
            <p className="rounded-xl bg-indigo-50/60 p-3 text-sm text-slate-600">Points are set on the <Link to="/rewards" className="font-bold text-indigo-700 underline">Rewards</Link> page (the &ldquo;Language Learning&rdquo; rules). The section can be switched off for students in <Link to="/settings" className="font-bold text-indigo-700 underline">Settings</Link>.</p>
            <div className="flex justify-end"><button type="button" onClick={save} disabled={busy} className={BTN}>{busy ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Save settings</button></div>
        </div>
    );
}

const TABS = [['lessons', 'Lessons'], ['students', 'Students'], ['settings', 'Settings']];

export default function LinguisticAdmin() {
    const [params, setParams] = useSearchParams();
    const tab = TABS.some(([k]) => k === params.get('tab')) ? params.get('tab') : 'lessons';
    return (
        <div className="mx-auto max-w-7xl space-y-4">
            <PageHeader icon={Languages} title="Language Learning" subtitle="English learning, Beginner to Advanced: lessons and student progress." />
            <Segmented options={TABS} value={tab} onChange={(v) => setParams(v === 'lessons' ? {} : { tab: v })} />
            {tab === 'lessons' && <LessonsTab />}
            {tab === 'students' && <StudentsPanel base="/linguistic/admin" />}
            {tab === 'settings' && <SettingsTab />}
        </div>
    );
}
