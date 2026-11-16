/**
 * 360 Activities (2026-10-31; its own sidebar item since, was a Teachers tab):
 * the organization's 360 activities, in categories (Academic Excellence →
 * Handwritten Assignments, Presentations…). Each activity is worth either
 * "up to N marks" (the teacher looks at the student's proof and gives one
 * mark, 0–N) or "N per proof" (every accepted proof adds N).
 *
 * Laid out to add and delete easily (2026-11-02): the categories on the left
 * (a dropdown on a phone) with "Add category" under them; the chosen
 * category on the right — its name, Delete category, its activities one per
 * row with a delete button, and an "Add activity" row at the bottom (Enter
 * adds it and keeps the cursor there for the next). Everything is saved
 * together with one Save; Undo puts back what was saved.
 *
 * "Open 360 to students" is here: once on, the students a 360 teacher has
 * added to their list — only those — see the activities and upload proof for
 * each, and only those teachers check it and give the marks.
 * Server: src/three60/activities.js (PUT /organizations/me/classes/activities;
 * the switch is PUT /organizations/me/classes { enabled }).
 *
 * Limits and Excel (2026-11-06): a "per proof" activity has "Most it can
 * give" (1 per presentation, at most 5; blank for no limit), and any activity
 * can be "Extra" (a bonus, or for one year only): it adds to the student's
 * score but not to the total. The page shows what the list adds up to, by
 * category and in all, against the total the organization aims for (e.g.
 * 360). "Download template" always gives the standard 360 template (the
 * college score sheet) to edit; "Upload Excel" reads it back into the page (activities kept by name keep their proof and
 * marks), to check and Save (./activitiesExcel.js).
 *
 * Locked until the platform's superadmin unlocks 360 for the organization
 * (2026-11-04, Organizations → 360): the page shows blurred behind a note
 * asking the YATICORP team to unlock it (the server answers allowed: false,
 * and refuses changes with a 403). The 60-second refresh opens it once unlocked.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Plus, Trash2, Loader2, ListChecks, FolderPlus, ChevronRight, Lock, Download, Upload, AlertTriangle, CheckCircle2, Pencil, Check, X } from 'lucide-react';
import api from '../../utils/api';
import useAutoRefresh from '../../hooks/useAutoRefresh';
import Select from '../Select';
import { CARD, INPUT, BTN, BTN2, Banner, Rows, LoadFailed } from '../orgUi';
import { sumOf, MAX_FILE_BYTES, STANDARD, STANDARD_TARGET } from './activitiesExcel';

const BASE = '/organizations/me/classes';
const errorOf = (err, fallback) => err.response?.data?.message || fallback;
const plural = (n, word, words = `${word}s`) => `${n} ${n === 1 ? word : words}`;
const RED = 'border-red-400 ring-2 ring-red-200';

// What the form edits: { key, _id?, name, activities: [{ key, _id?, name, mode, marks, cap, bonus }] } (marks and cap as typed).
let nextKey = 0;
const groupsOf = (list) => list.map((g) => ({
    key: `g${nextKey++}`, _id: g._id, name: g.name,
    activities: (g.activities || []).map((a) => ({ key: `a${nextKey++}`, _id: a._id, name: a.name, mode: a.mode || 'max', marks: String(a.marks ?? 0), cap: a.cap == null ? '' : String(a.cap), bonus: Boolean(a.bonus), bonusMax: a.bonusMax ? String(a.bonusMax) : '', proofKinds: a.proofKinds?.length ? a.proofKinds : ['image', 'pdf'], maxImages: a.maxImages ? String(a.maxImages) : '' }))
}));
const capOf = (a) => (a.mode === 'each' && String(a.cap).trim() !== '' ? Number(a.cap) : null);
const shape = (groups, target = '') => JSON.stringify([String(target).trim(), groups.map((g) => [g._id || null, g.name.trim(), g.activities.map((a) => [a._id || null, a.name.trim(), a.mode, Number(a.marks), capOf(a), Boolean(a.bonus), Number(a.bonusMax) || 0, [...(a.proofKinds || [])].sort().join(','), Number(a.maxImages) || 0])])]);
const fmt = (n) => (Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100));
const same = (a, b) => a.trim().toLowerCase() === b.trim().toLowerCase();
const NEW_ACTIVITY = { name: '', mode: 'max', marks: '10', cap: '', bonus: false, bonusMax: '', proofKinds: ['image', 'pdf'], maxImages: '' };
// What a proof may be (2026-11-14): one choice per activity, its own column. "Image or PDF" is how
// every activity worked before, so it stays the default.
const PROOF_OPTIONS = [['image+pdf', 'Image or PDF', ['image', 'pdf']], ['pdf', 'PDF', ['pdf']], ['image', 'Images', ['image']], ['video', 'Video', ['video']]];
const FIELD_LABEL = 'mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500';
const kindKey = (kinds = []) => (kinds.length === 1 ? kinds[0] : 'image+pdf');
// How 360 works, on the note shown while it is locked.
const LOCKED_STEPS = [
    ['You set the activities', 'in categories, such as Presentations or an NSS camp, and the most marks each can give.'],
    ['Students upload proof', 'for each activity: a certificate, a marks card or a photo.'],
    ['Their ranking teacher checks it', 'and gives the marks, so each student builds up a ranking score.']
];

const OrgActivities = ({ onNotice }) => {
    const [saved, setSaved] = useState(null);       // the list as the server has it
    const [groups, setGroups] = useState(null);     // the list as edited
    const [savedTarget, setSavedTarget] = useState('');  // the total to aim for, e.g. 360
    const [target, setTarget] = useState('');
    const [excelErrors, setExcelErrors] = useState([]);
    const [reading, setReading] = useState(false);
    const fileInput = useRef(null);
    const [chosen, setChosen] = useState('');       // the key of the category on the right
    const [open360, setOpen360] = useState(false);
    // What the institution calls this (Student Ranking by default): its teachers and students see it.
    const [title, setTitle] = useState('Student Ranking');
    const [naming, setNaming] = useState(null);   // the name being typed, or null
    const [allowed, setAllowed] = useState(true);   // unlocked by the platform
    const [failed, setFailed] = useState(false);
    const [error, setError] = useState('');
    const [bad, setBad] = useState(null);           // { group, activity?, field? } from the server
    const [busy, setBusy] = useState(false);
    const [switching, setSwitching] = useState(false);
    const [newGroup, setNewGroup] = useState('');
    const [groupNote, setGroupNote] = useState('');
    const [openKey, setOpenKey] = useState('');    // the activity open for editing

    // The latest list, for the background refresh: it never throws away what is being typed.
    const now = useRef({ groups: null, saved: null, chosen: '', target: '', savedTarget: '' });
    useEffect(() => { now.current = { groups, saved, chosen, target, savedTarget }; });
    /** The server's list in; the same category stays chosen (matched by id, or by name for one just saved). */
    const take = (data, before) => {
        const g = groupsOf(data.activityGroups || []);
        const was = before?.groups?.find((x) => x.key === before.chosen);
        const match = was && (g.find((x) => was._id && String(x._id) === String(was._id)) || g.find((x) => same(x.name, was.name)));
        setSaved(g); setGroups(g); setOpen360(Boolean(data.enabled));
        if (data.title) setTitle(data.title);
        const t = data.summary?.target == null ? '' : String(data.summary.target);
        setSavedTarget(t); setTarget(t);
        if (typeof data.allowed === 'boolean') setAllowed(data.allowed);
        setChosen((match || g[0])?.key || '');
    };
    const load = async ({ signal, isCurrent = () => true } = {}) => {
        try {
            const r = await api.get(BASE, { signal });
            if (!isCurrent()) return;
            setAllowed(r.data.allowed !== false);
            const { groups: editing, saved: last, target: t, savedTarget: st } = now.current;
            if (!last || !editing || shape(last, st) === shape(editing, t)) take(r.data, now.current);
            setFailed(false);
        } catch { if (isCurrent() && !now.current.saved) setFailed(true); }
    };
    const reload = useAutoRefresh(load, 60000, []);
    const dirty = Boolean(groups && saved && shape(groups, target) !== shape(saved, savedTarget));

    const edited = () => { setError(''); setBad(null); };
    const changeGroup = (key, patch) => { setGroups((gs) => gs.map((g) => (g.key === key ? { ...g, ...patch } : g))); edited(); };
    const changeActivity = (gKey, aKey, patch) => {
        setGroups((gs) => gs.map((g) => (g.key === gKey ? { ...g, activities: g.activities.map((a) => (a.key === aKey ? { ...a, ...patch } : a)) } : g)));
        edited();
    };
    const choose = (key) => { setChosen(key); setOpenKey(''); };

    const addGroup = (e) => {
        e?.preventDefault();
        const name = newGroup.trim();
        if (!name) { setGroupNote('Type the category name first, e.g. Academic Excellence.'); return; }
        if (groups.some((g) => same(g.name, name))) { setGroupNote(`${name} is already in the list.`); return; }
        const g = { key: `g${nextKey++}`, name, activities: [] };
        setGroups((gs) => [...gs, g]);
        setNewGroup(''); setGroupNote(''); edited();
        choose(g.key);
    };
    const removeGroup = (g) => {
        const named = g.activities.filter((a) => a.name.trim()).length;
        if (named && !window.confirm(`Delete ${g.name || 'this category'} and its ${plural(named, 'activity', 'activities')}? Marks already given for them stop counting when you save.`)) return;
        const at = groups.findIndex((x) => x.key === g.key);
        const rest = groups.filter((x) => x.key !== g.key);
        setGroups(rest); edited();
        choose(rest[Math.min(at, rest.length - 1)]?.key || '');
    };
    // A new activity opens straight in its editor, name first (2026-11-14).
    const addActivity = (g) => {
        const a = { key: `a${nextKey++}`, ...NEW_ACTIVITY, fresh: true };
        changeGroup(g.key, { activities: [...g.activities, a] });
        setOpenKey(a.key);
    };
    const removeActivity = (gKey, aKey) => { setGroups((gs) => gs.map((g) => (g.key === gKey ? { ...g, activities: g.activities.filter((a) => a.key !== aKey) } : g))); edited(); };

    const toggle360 = async () => {
        setSwitching(true); setError('');
        try {
            const r = await api.put(BASE, { enabled: !open360 });
            setOpen360(Boolean(r.data.enabled));
            onNotice(r.data.enabled ? `${title} is open: students added by your ranking teachers now see these activities.` : `${title} is closed to your students.`);
        } catch (err) { setError(errorOf(err, 'That did not go through.')); }
        finally { setSwitching(false); }
    };
    /** Rename it for this institution (blank: back to Student Ranking). The menu follows at once. */
    const saveName = async (e) => {
        e?.preventDefault();
        setSwitching(true); setError('');
        try {
            const r = await api.put(BASE, { title: naming || '' });
            setTitle(r.data.title); setNaming(null);
            window.dispatchEvent(new CustomEvent('organization-ranking-name', { detail: r.data.title }));
            onNotice(`Renamed. Your teachers and students now see “${r.data.title}”.`);
        } catch (err) { setError(errorOf(err, 'The name could not be saved.')); }
        finally { setSwitching(false); }
    };
    const save = async () => {
        setBusy(true); edited();
        try {
            const body = groups.map((g) => ({ ...(g._id ? { _id: g._id } : {}), name: g.name.trim(),
                activities: g.activities.map((a) => ({ ...(a._id ? { _id: a._id } : {}), name: a.name.trim(), mode: a.mode, marks: a.marks === '' ? NaN : Number(a.marks),
                    cap: capOf(a), bonus: Boolean(a.bonus), bonusMax: String(a.bonusMax).trim() === '' ? 0 : Number(a.bonusMax),
                    proofKinds: a.proofKinds, maxImages: (a.proofKinds || []).includes('image') ? Number(a.maxImages) || 0 : 0 })) }));
            const r = await api.put(`${BASE}/activities`, { groups: body, targetTotal: String(target).trim() === '' ? null : Number(target) });
            take({ activityGroups: r.data.activityGroups, enabled: open360, summary: r.data.summary || { target: String(target).trim() === '' ? null : Number(target) } }, { groups, chosen });
            onNotice('Activities saved.');
        } catch (err) {
            setError(errorOf(err, 'The activities could not be saved.'));
            const d = err.response?.data;
            if (typeof d?.group === 'number' && groups[d.group]) {
                setBad({ group: d.group, activity: d.activity, field: d.field });
                setChosen(groups[d.group].key);
            }
        } finally { setBusy(false); }
    };
    const undo = () => { setGroups(saved); setTarget(savedTarget); setExcelErrors([]); edited(); if (!saved.some((g) => g.key === chosen)) choose(saved[0]?.key || ''); };

    // The standard 360 list (the college score sheet) into the page, to check and Save.
    const loadStandard = async () => {
        const { keepIds } = await import('./activitiesExcel');
        const { groups: next, kept, dropped } = keepIds(STANDARD.map((g) => ({ ...g, activities: g.activities.map((a) => ({ ...a })) })), plain(groups));
        const lines = ['Replace the list on this page with the standard ranking list (10 categories, adding up to 360, plus extra)?'];
        if (kept) lines.push(`${plural(kept, 'activity', 'activities')} already here keep their proof and marks.`);
        if (dropped) lines.push(`${plural(dropped, 'activity', 'activities')} not in it will be removed when you save: marks given for them stop counting.`);
        if (count && !window.confirm(lines.join('\n\n'))) return;
        const g = groupsOf(next);
        setGroups(g); setTarget(String(STANDARD_TARGET)); setExcelErrors([]); edited();
        choose(g[0]?.key || '');
        onNotice('Standard ranking list loaded. Check it, then press Save.');
    };

    // ── Excel: the list out to edit, and back in to check and Save ────────
    const plain = (list) => list.map((g) => ({ _id: g._id, name: g.name.trim(), activities: g.activities.map((a) => ({ _id: a._id, name: a.name.trim(), mode: a.mode, marks: Number(a.marks) || 0, cap: capOf(a) ?? '', bonus: Boolean(a.bonus), bonusMax: Number(a.bonusMax) || 0, proofKinds: a.proofKinds, maxImages: Number(a.maxImages) || 0 })) }));
    // Always the standard 360 template (2026-11-06): the organization edits it and uploads it back.
    const downloadExcel = async () => {
        try {
            const { downloadWorkbook } = await import('./activitiesExcel');
            downloadWorkbook([], '', '360-activities-template.xlsx');
        } catch { setError('The Excel file could not be made. Please try again.'); }
    };
    const uploadExcel = async (e) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        setExcelErrors([]); edited();
        if (!/\.(xlsx|xls)$/i.test(file.name)) { setExcelErrors(['Upload an Excel file (.xlsx).']); return; }
        if (file.size > MAX_FILE_BYTES) { setExcelErrors(['That file is over 2 MB. Upload the activities sheet only.']); return; }
        setReading(true);
        try {
            const { parseWorkbook, keepIds } = await import('./activitiesExcel');
            const read = parseWorkbook(new Uint8Array(await file.arrayBuffer()));
            if (read.errors.length) { setExcelErrors(read.errors); return; }
            const { groups: next, kept, dropped } = keepIds(read.groups, plain(groups));
            const n = next.reduce((c, g) => c + g.activities.length, 0);
            const sum = sumOf(next);
            const lines = [`Replace the list on this page with the ${plural(next.length, 'category', 'categories')} and ${plural(n, 'activity', 'activities')} in ${file.name}?`,
                `It adds up to ${fmt(sum.possible)}${sum.extra ? ` (+${fmt(sum.extra)} extra)` : ''}.`];
            if (kept) lines.push(`${plural(kept, 'activity', 'activities')} already here keep their proof and marks.`);
            if (dropped) lines.push(`${plural(dropped, 'activity', 'activities')} not in the file will be removed when you save: marks given for them stop counting.`);
            if (!window.confirm(lines.join('\n\n'))) return;
            const g = groupsOf(next);
            setGroups(g);
            if (read.target !== undefined) setTarget(read.target === '' ? '' : String(read.target));
            choose(g[0]?.key || '');
            onNotice('Loaded from Excel. Check the list, then press Save.');
        } catch { setExcelErrors(['That file could not be read. Upload the Excel file downloaded from this page.']); }
        finally { setReading(false); }
    };

    if (!groups) return <div className={CARD}>{failed ? <LoadFailed what="your activities" onRetry={reload} /> : <Rows count={3} height="h-12" />}</div>;
    const count = groups.reduce((n, g) => n + g.activities.length, 0);
    const gi = Math.max(0, groups.findIndex((g) => g.key === chosen));
    const current = groups[gi];
    const badHere = current && bad?.group === gi ? bad : null;
    const sum = sumOf(groups);
    const currentSum = current ? sumOf([current]) : null;

    const page = (
        <section className={CARD} aria-labelledby="org-activities-title">
            <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-start sm:justify-between sm:p-5">
                <div className="min-w-0">
                    {naming === null ? (
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 id="org-activities-title" className="text-lg font-bold text-slate-800">{title}</h1>
                            <button type="button" onClick={() => setNaming(title === 'Student Ranking' ? '' : title)} className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm shadow-indigo-600/30 transition-colors hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400" aria-label="Rename">
                                <Pencil size={13} aria-hidden="true" /> Rename
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={saveName} className="flex flex-wrap items-center gap-2">
                            <input autoFocus value={naming} maxLength={40} onChange={(e) => setNaming(e.target.value)} placeholder="Student Ranking" aria-label="Name your students and teachers see"
                                onKeyDown={(e) => { if (e.key === 'Escape') setNaming(null); }} className={`${INPUT} !w-64 !py-1.5`} />
                            <button type="submit" disabled={switching} className={`${BTN} !py-1.5 text-xs`}><Check size={14} />Save</button>
                            <button type="button" onClick={() => setNaming(null)} className={`${BTN2} !py-1.5 text-xs`}><X size={14} />Cancel</button>
                        </form>
                    )}
                    <p className="mt-1 text-xs text-slate-400 tabular-nums">{plural(groups.length, 'category', 'categories')} · {plural(count, 'activity', 'activities')}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                        <button type="button" onClick={downloadExcel} className={`${BTN2} !py-1.5 text-xs`}><Download size={14} />Download template</button>
                        <button type="button" onClick={() => fileInput.current?.click()} disabled={reading} className={`${BTN2} !py-1.5 text-xs`}>
                            {reading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}Upload Excel
                        </button>
                        <button type="button" onClick={loadStandard} className={`${BTN2} !py-1.5 text-xs`} title="The college score sheet: 10 categories adding up to 360">Use the standard ranking list</button>
                        <input ref={fileInput} type="file" accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="hidden" onChange={uploadExcel} aria-label="Upload the activities Excel file" />
                    </div>
                </div>
                <div className="flex shrink-0 items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-2">
                    <span className="text-sm font-semibold text-slate-700">Open to students</span>
                    <button type="button" role="switch" aria-checked={open360} aria-label={`Open ${title} to students`} onClick={toggle360} disabled={switching}
                        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-60 ${open360 ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                        <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${open360 ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
                    </button>
                </div>
            </div>

            <p className={`flex items-start gap-2 border-b px-4 py-2 text-xs sm:px-5 ${open360 ? 'border-emerald-100 bg-emerald-50 text-emerald-800' : 'border-amber-100 bg-amber-50 text-amber-800'}`}>
                <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${open360 ? 'bg-emerald-500' : 'bg-amber-500'}`} aria-hidden />
                {open360
                    ? `Open: the students your ranking teachers have added to their list see these activities and upload proof. Other students do not see ${title}.`
                    : `Closed: students do not see ${title} yet. Switch it on when the list is ready; only students added by your ranking teachers will see it.`}
            </p>

            {/* The total (2026-11-14): worked out from the activities added, not typed in. */}
            <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:px-5">
                <div className="flex items-center gap-4 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 px-5 py-3 text-white shadow-lg shadow-indigo-600/20">
                    <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-indigo-100">Total</span>
                    <span className="text-3xl font-black leading-none tabular-nums" aria-label={`Total ${fmt(sum.possible)} marks`}>{fmt(sum.possible)}</span>
                    {sum.extra > 0 && <span className="rounded-full bg-white/15 px-2.5 py-1 text-xs font-bold tabular-nums ring-1 ring-white/25">+{fmt(sum.extra)} extra</span>}
                </div>
                <p className="min-w-0 flex-1 text-sm text-slate-600">
                    The sum of every activity’s marks{sum.extra > 0 ? ', with extra activities on top' : ''}.
                    {sum.uncapped > 0 && <span className="mt-1 flex items-start gap-1.5 text-xs font-medium text-amber-800"><AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden />{plural(sum.uncapped, '“per proof” activity has', '“per proof” activities have')} no “Most proofs counted”, so a student can go past the total.</span>}
                </p>
            </div>
            {excelErrors.length > 0 && (
                <div className="border-b border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800 sm:px-5" role="alert">
                    <p className="font-semibold">The Excel file was not loaded. Fix these and upload it again:</p>
                    <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs">
                        {excelErrors.slice(0, 15).map((m) => <li key={m}>{m}</li>)}
                        {excelErrors.length > 15 && <li>…and {excelErrors.length - 15} more.</li>}
                    </ul>
                    <button type="button" onClick={() => setExcelErrors([])} className="mt-2 text-xs font-bold underline">Close</button>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-[17rem_minmax(0,1fr)]">
                {/* ── The categories ───────────────────────────────────────── */}
                <aside className="min-w-0 border-b border-slate-100 p-4 sm:p-5 lg:border-b-0 lg:border-r" aria-label="Categories">
                    <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">Categories</p>
                    {groups.length > 0 && (
                        <>
                            {/* A phone: one dropdown. */}
                            <div className="lg:hidden">
                                <Select value={current?.key || ''} onChange={(e) => choose(e.target.value)} aria-label="Category" className={INPUT}>
                                    {groups.map((g) => <option key={g.key} value={g.key}>{`${g.name || 'Unnamed category'} (${g.activities.length})`}</option>)}
                                </Select>
                            </div>
                            {/* A wider screen: the list. */}
                            <ul className="hidden space-y-1 lg:block">
                                {groups.map((g, i) => {
                                    const on = g.key === current?.key;
                                    return (
                                        <li key={g.key}>
                                            <button type="button" onClick={() => choose(g.key)} aria-current={on ? 'true' : undefined}
                                                className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors ${on ? 'bg-indigo-50 font-bold text-indigo-700 ring-1 ring-indigo-200' : 'font-semibold text-slate-700 hover:bg-slate-50'}`}>
                                                {bad?.group === i && <span className="h-2 w-2 shrink-0 rounded-full bg-red-500" aria-label="Needs a fix" />}
                                                <span className="min-w-0 flex-1 truncate" title={g.name || undefined}>{g.name || <span className="italic text-slate-400">Unnamed category</span>}</span>
                                                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums ${on ? 'bg-white text-indigo-700' : 'bg-slate-100 text-slate-500'}`}>{g.activities.length}</span>
                                                <ChevronRight size={15} className={`shrink-0 ${on ? 'text-indigo-400' : 'text-slate-300'}`} aria-hidden />
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        </>
                    )}
                    <form onSubmit={addGroup} className={groups.length ? 'mt-3 border-t border-slate-100 pt-3' : ''} noValidate>
                        <div className="flex gap-2">
                            <input value={newGroup} onChange={(e) => { setNewGroup(e.target.value); setGroupNote(''); }} maxLength={80}
                                placeholder="New category" aria-label="New category name" className={`${INPUT} min-w-0 flex-1`} />
                            <button type="submit" className={`${BTN2} shrink-0 !px-3`} aria-label="Add category"><FolderPlus size={16} /><span className="lg:hidden xl:inline">Add</span></button>
                        </div>
                        {groupNote && <p className="mt-1.5 text-xs font-medium text-red-600" role="alert">{groupNote}</p>}
                    </form>
                </aside>

                {/* ── The chosen category ──────────────────────────────────── */}
                <div className="min-w-0 p-4 sm:p-5">
                    {!current ? (
                        <div className="flex flex-col items-center py-10 text-center">
                            <span className="rounded-2xl bg-indigo-50 p-3 text-indigo-600"><ListChecks size={22} /></span>
                            <p className="mt-3 font-semibold text-slate-700">No activities yet</p>
                            <p className="mt-1 max-w-sm text-sm text-slate-500">Add a category, such as Academic Excellence, then the activities in it and the marks each can give.</p>
                        </div>
                    ) : (
                        <>
                            <div className="flex items-end gap-2">
                                <label className="block min-w-0 flex-1">
                                    <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500">Category name</span>
                                    <input value={current.name} onChange={(e) => changeGroup(current.key, { name: e.target.value })} maxLength={80} aria-label="Category name"
                                        aria-invalid={badHere && badHere.activity == null && badHere.field === 'name' ? 'true' : undefined}
                                        className={`${INPUT} font-semibold ${badHere && badHere.activity == null && badHere.field === 'name' ? RED : ''}`} />
                                </label>
                                <button type="button" onClick={() => removeGroup(current)} aria-label={`Delete ${current.name || 'this category'}`}
                                    className="inline-flex h-[42px] w-[42px] shrink-0 items-center justify-center gap-2 rounded-xl border border-red-200 bg-white text-sm font-bold text-red-600 transition-colors hover:bg-red-50 sm:w-auto sm:px-3.5">
                                    <Trash2 size={15} /><span className="hidden sm:inline">Delete category</span>
                                </button>
                            </div>

                            <p className="mt-2 text-xs text-slate-500 tabular-nums">{current.name || 'This category'} gives up to <strong className="text-slate-700">{fmt(currentSum.possible)}</strong>{currentSum.extra > 0 ? ` (+${fmt(currentSum.extra)} extra)` : ''}.</p>
                            {/* The activities (redesigned 2026-11-14): one plain line each — name, how it is marked,
                                what proof it takes — and a labelled editor that opens under the line clicked. */}
                            <div className="mt-3 overflow-hidden rounded-xl border border-slate-200">
                                {current.activities.length === 0 ? (
                                    <p className="px-4 py-8 text-center text-sm text-slate-500">No activities in {current.name || 'this category'} yet.</p>
                                ) : (
                                    <ul className="divide-y divide-slate-100">
                                        {current.activities.map((a, ai) => {
                                            const here = badHere && badHere.activity === ai ? badHere : null;
                                            const open = openKey === a.key || Boolean(here);
                                            const set = (patch) => changeActivity(current.key, a.key, patch);
                                            // Per proof (2026-11-14): "most" is how many proofs count; the cap is marks × that.
                                            const per = Number(a.marks) || 0;
                                            const count = String(a.cap).trim() === '' || !per ? '' : String(Math.round((Number(a.cap) / per) * 100) / 100);
                                            const setCount = (v) => set({ cap: String(v).trim() === '' ? '' : String(Math.round(Number(v) * per * 100) / 100) });
                                            const setMarks = (v) => set(a.mode === 'each' && count !== '' && String(v).trim() !== '' ? { marks: v, cap: String(Math.round(Number(count) * Number(v) * 100) / 100) } : { marks: v });
                                            const gives = a.mode === 'each' ? (String(a.cap).trim() === '' ? '∞' : fmt(Number(a.cap) || 0)) : fmt(Number(a.marks) || 0);
                                            const images = (a.proofKinds || []).includes('image');
                                            return (
                                                <li key={a.key} className={open ? 'bg-indigo-50/30' : ''}>
                                                    {/* The line: click to edit. */}
                                                    <div className="flex items-center gap-3 px-3 py-3 sm:px-4">
                                                        <span className="w-5 shrink-0 text-xs font-semibold tabular-nums text-slate-400">{ai + 1}</span>
                                                        <button type="button" onClick={() => setOpenKey(open && !here ? '' : a.key)} aria-expanded={open}
                                                            className="flex min-w-0 flex-1 items-center gap-3 text-left">
                                                            <span className="min-w-0 flex-1">
                                                                <span className={`block truncate text-sm font-semibold ${a.name ? 'text-slate-800' : 'italic text-slate-400'}`}>{a.name || 'New activity'}</span>
                                                                <span className="mt-1 flex flex-wrap gap-1.5">
                                                                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                                                                        {a.mode === 'each' ? `${fmt(per)} per proof${count !== '' ? ` × ${count} = ${fmt(Number(a.cap) || 0)}` : ' · no limit'}` : `Teacher gives up to ${fmt(Number(a.marks) || 0)}`}
                                                                    </span>
                                                                    <span className="rounded-md bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-700">
                                                                        {PROOF_OPTIONS.find(([k]) => k === kindKey(a.proofKinds))[1]}{images && Number(a.maxImages) > 0 ? ` · max ${a.maxImages} images` : ''}
                                                                    </span>
                                                                    {Number(a.bonusMax) > 0 && <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">+{fmt(Number(a.bonusMax))} bonus</span>}
                                                                    {a.bonus && <span className="rounded-md bg-violet-50 px-2 py-0.5 text-[11px] font-semibold text-violet-700">Extra</span>}
                                                                    {here && <span className="rounded-md bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700">Needs a fix</span>}
                                                                </span>
                                                            </span>
                                                            <span className="shrink-0 text-right">
                                                                <span className="block text-lg font-black leading-none tabular-nums text-slate-800">{gives}</span>
                                                                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">marks</span>
                                                            </span>
                                                            <ChevronRight size={16} aria-hidden className={`shrink-0 text-slate-300 transition-transform ${open ? 'rotate-90 text-indigo-500' : ''}`} />
                                                        </button>
                                                    </div>

                                                    {/* The editor: every field with its own label. */}
                                                    {open && (
                                                        <div className="grid gap-4 border-t border-indigo-100 px-4 pb-4 pt-4 sm:grid-cols-2 sm:pl-12">
                                                            <label className="sm:col-span-2">
                                                                <span className={FIELD_LABEL}>Activity name</span>
                                                                <input value={a.name} autoFocus={a.fresh} onChange={(e) => set({ name: e.target.value })} maxLength={120} placeholder="e.g. Presentations"
                                                                    aria-invalid={here?.field === 'name' ? 'true' : undefined} className={`${INPUT} ${here?.field === 'name' ? RED : ''}`} />
                                                            </label>
                                                            <label>
                                                                <span className={FIELD_LABEL}>How marks are given</span>
                                                                <Select value={a.mode} onChange={(e) => set({ mode: e.target.value })} className={INPUT}>
                                                                    <option value="max">Teacher gives one mark, up to a limit</option>
                                                                    <option value="each">Marks for each accepted proof</option>
                                                                </Select>
                                                            </label>
                                                            <div className="grid grid-cols-2 gap-3">
                                                                <label>
                                                                    <span className={FIELD_LABEL}>{a.mode === 'each' ? 'Marks per proof' : 'Up to (marks)'}</span>
                                                                    <input type="number" inputMode="decimal" min={0} max={1000} step="any" value={a.marks} onChange={(e) => setMarks(e.target.value)}
                                                                        aria-invalid={here?.field === 'marks' ? 'true' : undefined} className={`${INPUT} tabular-nums ${here?.field === 'marks' ? RED : ''}`} />
                                                                </label>
                                                                {a.mode === 'each' && (
                                                                    <label>
                                                                        <span className={FIELD_LABEL}>Most proofs counted</span>
                                                                        <input type="number" inputMode="numeric" min={1} max={1000} step={1} value={count} onChange={(e) => setCount(e.target.value)} placeholder="No limit"
                                                                            aria-invalid={here?.field === 'cap' ? 'true' : undefined} className={`${INPUT} tabular-nums ${here?.field === 'cap' ? RED : ''}`} />
                                                                    </label>
                                                                )}
                                                                {a.mode === 'each' && (
                                                                    <p className="col-span-2 -mt-1 text-sm text-slate-600">
                                                                        {count !== '' ? <><span className="tabular-nums">{fmt(per)} × {count}</span> = <strong className="tabular-nums text-indigo-700">{fmt(Number(a.cap) || 0)} marks</strong> in all</> : <>{fmt(per)} marks for every accepted proof, <strong className="text-amber-700">no limit</strong></>}
                                                                    </p>
                                                                )}
                                                            </div>
                                                            <label>
                                                                <span className={FIELD_LABEL}>Proof the student uploads</span>
                                                                <Select value={kindKey(a.proofKinds)} onChange={(e) => set({ proofKinds: PROOF_OPTIONS.find(([k]) => k === e.target.value)[2] })} className={INPUT}>
                                                                    {PROOF_OPTIONS.map(([k, word]) => <option key={k} value={k}>{word}</option>)}
                                                                </Select>
                                                            </label>
                                                            {images ? (
                                                                <label>
                                                                    <span className={FIELD_LABEL}>Most pictures</span>
                                                                    <input type="number" inputMode="numeric" min={0} max={100} value={a.maxImages} onChange={(e) => set({ maxImages: e.target.value })} placeholder="Any number"
                                                                        className={`${INPUT} tabular-nums`} />
                                                                </label>
                                                            ) : <span className="hidden sm:block" />}
                                                            <label>
                                                                <span className={FIELD_LABEL}>Bonus the teacher can add</span>
                                                                <input type="number" inputMode="decimal" min={0} max={1000} step="any" value={a.bonusMax} onChange={(e) => set({ bonusMax: e.target.value })} placeholder="None"
                                                                    aria-invalid={here?.field === 'bonusMax' ? 'true' : undefined} className={`${INPUT} tabular-nums ${here?.field === 'bonusMax' ? RED : ''}`} />
                                                            </label>
                                                            <label className="flex cursor-pointer items-center gap-3 self-end rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                                                                <input type="checkbox" checked={a.bonus} onChange={(e) => set({ bonus: e.target.checked })} className="h-4 w-4 rounded border-slate-300 text-indigo-600" />
                                                                <span className="text-sm font-semibold text-slate-700">Extra <span className="font-normal text-slate-500">— on top of the total</span></span>
                                                            </label>
                                                            {here?.message && <p className="text-sm font-medium text-red-600 sm:col-span-2" role="alert">{here.message}</p>}
                                                            <div className="flex items-center justify-between gap-2 sm:col-span-2">
                                                                <button type="button" onClick={() => removeActivity(current.key, a.key)} className="inline-flex items-center gap-1.5 rounded-lg px-2 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"><Trash2 size={15} /> Delete activity</button>
                                                                <button type="button" onClick={() => setOpenKey('')} className={BTN2}><Check size={16} /> Done</button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </li>
                                            );
                                        })}
                                    </ul>
                                )}
                                <button type="button" onClick={() => addActivity(current)}
                                    className="flex w-full items-center justify-center gap-2 border-t border-dashed border-indigo-200 bg-indigo-50/40 px-4 py-3 text-sm font-bold text-indigo-700 transition-colors hover:bg-indigo-50">
                                    <Plus size={16} /> Add activity
                                </button>
                            </div>
                        </>
                    )}
                    {error && <div className="mt-3"><Banner onClose={() => setError('')}>{error}</Banner></div>}
                </div>
            </div>

            {/* Save stays in reach while scrolling a long list (on a wider screen; a phone has its bottom bar there). */}
            <div className="z-10 flex flex-col-reverse gap-2 rounded-b-2xl lg:sticky lg:bottom-0 border-t border-slate-100 bg-slate-50/95 px-4 py-3 backdrop-blur sm:flex-row sm:items-center sm:justify-end sm:px-5">
                {dirty ? <span className="text-xs font-semibold text-amber-700 sm:mr-auto">Unsaved changes: Save to keep them</span>
                    : <span className="hidden text-xs text-slate-400 sm:mr-auto sm:inline">All changes saved</span>}
                {dirty && <button type="button" onClick={undo} disabled={busy} className={BTN2}>Undo changes</button>}
                <button type="button" onClick={save} disabled={!dirty || busy} className={BTN}>{busy && <Loader2 size={16} className="animate-spin" />}Save</button>
            </div>
        </section>
    );
    if (allowed) return page;
    // Locked by the platform: the page, blurred and out of reach, behind a note
    // that says what 360 is, so the organization knows what it would get (2026-11-04).
    return (
        <div className="relative min-h-[36rem]">
            <div aria-hidden="true" inert="" className="pointer-events-none select-none opacity-60 blur-[3px]">{page}</div>
            <div className="absolute inset-0 flex items-start justify-center p-4 pt-10 sm:pt-16">
                <div role="status" className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl sm:p-7">
                    <div className="text-center">
                        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 text-indigo-600"><Lock size={22} aria-hidden="true" /></span>
                        <h1 className="mt-3 text-lg font-bold text-slate-800">Student Ranking is locked</h1>
                        <p className="mt-1.5 text-sm leading-relaxed text-slate-600"><strong className="text-slate-800">Student Ranking</strong> tracks each student’s growth beyond the classroom (academics, campus involvement, skills, internships and more) and turns it into marks.</p>
                    </div>
                    <ol className="mt-5 space-y-3">
                        {LOCKED_STEPS.map(([title, text], i) => (
                            <li key={title} className="flex gap-3">
                                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white" aria-hidden="true">{i + 1}</span>
                                <p className="text-sm leading-relaxed text-slate-600"><span className="font-semibold text-slate-800">{title}</span> {text}</p>
                            </li>
                        ))}
                    </ol>
                    <p className="mt-5 rounded-xl bg-indigo-50 px-4 py-3 text-center text-sm font-medium text-indigo-800">This section is not unlocked for your organization yet. Ask the YATICORP team to unlock Student Ranking.</p>
                </div>
            </div>
        </div>
    );
};

export default OrgActivities;
