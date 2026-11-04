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
 * Locked until the platform's superadmin unlocks 360 for the organization
 * (2026-11-04, Organizations → 360): the page shows blurred behind a note
 * asking the YATICORP team to unlock it (the server answers allowed: false,
 * and refuses changes with a 403). The 60-second refresh opens it once unlocked.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Plus, Trash2, Loader2, ListChecks, FolderPlus, ChevronRight, Lock } from 'lucide-react';
import api from '../../utils/api';
import useAutoRefresh from '../../hooks/useAutoRefresh';
import Select from '../Select';
import { CARD, INPUT, BTN, BTN2, Banner, Rows, LoadFailed } from '../orgUi';

const BASE = '/organizations/me/classes';
const errorOf = (err, fallback) => err.response?.data?.message || fallback;
const plural = (n, word, words = `${word}s`) => `${n} ${n === 1 ? word : words}`;
const RED = 'border-red-400 ring-2 ring-red-200';

// What the form edits: { key, _id?, name, activities: [{ key, _id?, name, mode, marks }] }.
let nextKey = 0;
const groupsOf = (list) => list.map((g) => ({
    key: `g${nextKey++}`, _id: g._id, name: g.name,
    activities: (g.activities || []).map((a) => ({ key: `a${nextKey++}`, _id: a._id, name: a.name, mode: a.mode || 'max', marks: String(a.marks ?? 0) }))
}));
const shape = (groups) => JSON.stringify(groups.map((g) => [g._id || null, g.name.trim(), g.activities.map((a) => [a._id || null, a.name.trim(), a.mode, Number(a.marks)])]));
const same = (a, b) => a.trim().toLowerCase() === b.trim().toLowerCase();
const NEW_ACTIVITY = { name: '', mode: 'max', marks: '10' };
// How 360 works, on the note shown while it is locked.
const LOCKED_STEPS = [
    ['You set the activities', 'in categories, such as Presentations or an NSS camp, and the most marks each can give.'],
    ['Students upload proof', 'for each activity: a certificate, a marks card or a photo.'],
    ['Their 360 teacher checks it', 'and gives the marks, so each student builds up a 360 score.']
];

const OrgActivities = ({ onNotice }) => {
    const [saved, setSaved] = useState(null);       // the list as the server has it
    const [groups, setGroups] = useState(null);     // the list as edited
    const [chosen, setChosen] = useState('');       // the key of the category on the right
    const [open360, setOpen360] = useState(false);
    const [allowed, setAllowed] = useState(true);   // unlocked by the platform
    const [failed, setFailed] = useState(false);
    const [error, setError] = useState('');
    const [bad, setBad] = useState(null);           // { group, activity?, field? } from the server
    const [busy, setBusy] = useState(false);
    const [switching, setSwitching] = useState(false);
    const [newGroup, setNewGroup] = useState('');
    const [groupNote, setGroupNote] = useState('');
    const [draft, setDraft] = useState(NEW_ACTIVITY);
    const [draftNote, setDraftNote] = useState('');
    const draftName = useRef(null);
    const [focusDraft, setFocusDraft] = useState(0);
    useEffect(() => { if (focusDraft) draftName.current?.focus(); }, [focusDraft]);

    // The latest list, for the background refresh: it never throws away what is being typed.
    const now = useRef({ groups: null, saved: null, chosen: '' });
    useEffect(() => { now.current = { groups, saved, chosen }; });
    /** The server's list in; the same category stays chosen (matched by id, or by name for one just saved). */
    const take = (data, before) => {
        const g = groupsOf(data.activityGroups || []);
        const was = before?.groups?.find((x) => x.key === before.chosen);
        const match = was && (g.find((x) => was._id && String(x._id) === String(was._id)) || g.find((x) => same(x.name, was.name)));
        setSaved(g); setGroups(g); setOpen360(Boolean(data.enabled));
        if (typeof data.allowed === 'boolean') setAllowed(data.allowed);
        setChosen((match || g[0])?.key || '');
    };
    const load = async ({ signal, isCurrent = () => true } = {}) => {
        try {
            const r = await api.get(BASE, { signal });
            if (!isCurrent()) return;
            setAllowed(r.data.allowed !== false);
            const { groups: editing, saved: last } = now.current;
            if (!last || !editing || shape(last) === shape(editing)) take(r.data, now.current);
            setFailed(false);
        } catch { if (isCurrent() && !now.current.saved) setFailed(true); }
    };
    const reload = useAutoRefresh(load, 60000, []);
    const dirty = Boolean(groups && saved && shape(groups) !== shape(saved));

    const edited = () => { setError(''); setBad(null); };
    const changeGroup = (key, patch) => { setGroups((gs) => gs.map((g) => (g.key === key ? { ...g, ...patch } : g))); edited(); };
    const changeActivity = (gKey, aKey, patch) => {
        setGroups((gs) => gs.map((g) => (g.key === gKey ? { ...g, activities: g.activities.map((a) => (a.key === aKey ? { ...a, ...patch } : a)) } : g)));
        edited();
    };
    const choose = (key) => { setChosen(key); setDraft(NEW_ACTIVITY); setDraftNote(''); };

    const addGroup = (e) => {
        e?.preventDefault();
        const name = newGroup.trim();
        if (!name) { setGroupNote('Type the category name first, e.g. Academic Excellence.'); return; }
        if (groups.some((g) => same(g.name, name))) { setGroupNote(`${name} is already in the list.`); return; }
        const g = { key: `g${nextKey++}`, name, activities: [] };
        setGroups((gs) => [...gs, g]);
        setNewGroup(''); setGroupNote(''); edited();
        choose(g.key);
        setFocusDraft((n) => n + 1);
    };
    const removeGroup = (g) => {
        const named = g.activities.filter((a) => a.name.trim()).length;
        if (named && !window.confirm(`Delete ${g.name || 'this category'} and its ${plural(named, 'activity', 'activities')}? Marks already given for them stop counting when you save.`)) return;
        const at = groups.findIndex((x) => x.key === g.key);
        const rest = groups.filter((x) => x.key !== g.key);
        setGroups(rest); edited();
        choose(rest[Math.min(at, rest.length - 1)]?.key || '');
    };
    const addActivity = (g) => (e) => {
        e?.preventDefault();
        const name = draft.name.trim();
        const marks = Number(draft.marks);
        if (!name) { setDraftNote('Type the activity name first.'); draftName.current?.focus(); return; }
        if (g.activities.some((a) => same(a.name, name))) { setDraftNote(`${name} is already in ${g.name || 'this category'}.`); return; }
        if (draft.marks === '' || !Number.isFinite(marks) || marks < 0 || marks > 1000) { setDraftNote('Marks from 0 to 1000.'); return; }
        changeGroup(g.key, { activities: [...g.activities, { key: `a${nextKey++}`, name, mode: draft.mode, marks: String(marks) }] });
        // The name clears for the next one; how it is marked stays, as the next is often the same.
        setDraft((d) => ({ ...d, name: '' })); setDraftNote('');
        setFocusDraft((n) => n + 1);
    };
    const removeActivity = (gKey, aKey) => { setGroups((gs) => gs.map((g) => (g.key === gKey ? { ...g, activities: g.activities.filter((a) => a.key !== aKey) } : g))); edited(); };

    const toggle360 = async () => {
        setSwitching(true); setError('');
        try {
            const r = await api.put(BASE, { enabled: !open360 });
            setOpen360(Boolean(r.data.enabled));
            onNotice(r.data.enabled ? '360 is open: students added by your 360 teachers now see these activities.' : '360 is closed to your students.');
        } catch (err) { setError(errorOf(err, 'That did not go through.')); }
        finally { setSwitching(false); }
    };
    const save = async () => {
        setBusy(true); edited();
        try {
            const body = groups.map((g) => ({ ...(g._id ? { _id: g._id } : {}), name: g.name.trim(),
                activities: g.activities.map((a) => ({ ...(a._id ? { _id: a._id } : {}), name: a.name.trim(), mode: a.mode, marks: a.marks === '' ? NaN : Number(a.marks) })) }));
            const r = await api.put(`${BASE}/activities`, { groups: body });
            take({ activityGroups: r.data.activityGroups, enabled: open360 }, { groups, chosen });
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
    const undo = () => { setGroups(saved); edited(); if (!saved.some((g) => g.key === chosen)) choose(saved[0]?.key || ''); };

    if (!groups) return <div className={CARD}>{failed ? <LoadFailed what="your activities" onRetry={reload} /> : <Rows count={3} height="h-12" />}</div>;
    const count = groups.reduce((n, g) => n + g.activities.length, 0);
    const gi = Math.max(0, groups.findIndex((g) => g.key === chosen));
    const current = groups[gi];
    const badHere = current && bad?.group === gi ? bad : null;

    const page = (
        <section className={CARD} aria-labelledby="org-activities-title">
            <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-start sm:justify-between sm:p-5">
                <div className="min-w-0">
                    <h1 id="org-activities-title" className="text-lg font-bold text-slate-800">360 Activities</h1>
                    <p className="mt-1 text-sm text-slate-500">What your students earn marks for, and the most each can give. Students upload proof for each activity and their <strong>360</strong> teacher checks it and gives the marks.</p>
                    <p className="mt-1 text-xs text-slate-400 tabular-nums">{plural(groups.length, 'category', 'categories')} · {plural(count, 'activity', 'activities')}</p>
                </div>
                <div className="flex shrink-0 items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-2">
                    <span className="text-sm font-semibold text-slate-700">Open 360 to students</span>
                    <button type="button" role="switch" aria-checked={open360} aria-label="Open 360 to students" onClick={toggle360} disabled={switching}
                        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-60 ${open360 ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                        <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${open360 ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
                    </button>
                </div>
            </div>

            <p className={`flex items-start gap-2 border-b px-4 py-2 text-xs sm:px-5 ${open360 ? 'border-emerald-100 bg-emerald-50 text-emerald-800' : 'border-amber-100 bg-amber-50 text-amber-800'}`}>
                <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${open360 ? 'bg-emerald-500' : 'bg-amber-500'}`} aria-hidden />
                {open360
                    ? 'Open: the students your 360 teachers have added to their list see these activities and upload proof. Other students do not see 360.'
                    : 'Closed: students do not see 360 yet. Switch it on when the list is ready; only students added by your 360 teachers will see it.'}
            </p>

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

                            <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
                                <div aria-hidden className="hidden grid-cols-[2rem_minmax(0,1fr)_8.5rem_6rem_2.75rem] gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-500 sm:grid">
                                    <span>#</span><span>Activity</span><span>Marks are</span><span>Marks</span><span />
                                </div>
                                {current.activities.length === 0 ? (
                                    <p className="px-4 py-6 text-center text-sm text-slate-500">No activities in {current.name || 'this category'} yet. Add the first one below.</p>
                                ) : (
                                    <ul className="divide-y divide-slate-100">
                                        {current.activities.map((a, ai) => {
                                            const here = badHere && badHere.activity === ai ? badHere : null;
                                            const label = a.name || `activity ${ai + 1}`;
                                            return (
                                                <li key={a.key} className="grid grid-cols-[minmax(0,1fr)_5.5rem_2.75rem] items-center gap-x-2 gap-y-1.5 px-3 py-2.5 sm:grid-cols-[2rem_minmax(0,1fr)_8.5rem_6rem_2.75rem] sm:py-2">
                                                    <span className="hidden text-xs font-semibold text-slate-400 tabular-nums sm:block">{ai + 1}</span>
                                                    <input value={a.name} onChange={(e) => changeActivity(current.key, a.key, { name: e.target.value })} maxLength={120} aria-label={`${current.name || 'Category'}: activity ${ai + 1} name`}
                                                        aria-invalid={here?.field === 'name' ? 'true' : undefined}
                                                        className={`${INPUT} col-span-2 font-medium sm:col-span-1 sm:font-normal ${here?.field === 'name' ? RED : ''}`} />
                                                    <Select value={a.mode} onChange={(e) => changeActivity(current.key, a.key, { mode: e.target.value })} aria-label={`How ${label} is marked`} className={INPUT}>
                                                        <option value="max">Up to</option>
                                                        <option value="each">Per proof</option>
                                                    </Select>
                                                    <input type="number" inputMode="decimal" min={0} max={1000} step="any" value={a.marks} onChange={(e) => changeActivity(current.key, a.key, { marks: e.target.value })}
                                                        aria-label={`Marks for ${label}`} aria-invalid={here?.field === 'marks' ? 'true' : undefined}
                                                        className={`${INPUT} col-span-2 tabular-nums sm:col-span-1 ${here?.field === 'marks' ? RED : ''}`} />
                                                    <button type="button" onClick={() => removeActivity(current.key, a.key)} aria-label={`Remove ${label}`}
                                                        className="col-start-3 row-start-1 inline-flex h-[42px] w-11 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 sm:col-start-auto sm:row-start-auto"><Trash2 size={16} /></button>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                )}

                                {/* Add an activity: Enter adds it, and the cursor stays for the next. */}
                                <form onSubmit={addActivity(current)} noValidate className="border-t border-dashed border-indigo-200 bg-indigo-50/40 px-3 py-3">
                                    <div className="grid grid-cols-[minmax(0,1fr)_6rem] items-center gap-2 sm:grid-cols-[2rem_minmax(0,1fr)_8.5rem_6rem_auto]">
                                        <span className="hidden text-indigo-400 sm:block"><Plus size={16} aria-hidden /></span>
                                        <input ref={draftName} value={draft.name} onChange={(e) => { setDraft((d) => ({ ...d, name: e.target.value })); setDraftNote(''); }} maxLength={120}
                                            placeholder="New activity, e.g. Presentations" aria-label="New activity name" className={`${INPUT} col-span-2 sm:col-span-1`} />
                                        <Select value={draft.mode} onChange={(e) => setDraft((d) => ({ ...d, mode: e.target.value }))} aria-label="How the new activity is marked" className={INPUT}>
                                            <option value="max">Up to</option>
                                            <option value="each">Per proof</option>
                                        </Select>
                                        <input type="number" inputMode="decimal" min={0} max={1000} step="any" value={draft.marks} onChange={(e) => { setDraft((d) => ({ ...d, marks: e.target.value })); setDraftNote(''); }}
                                            aria-label="Marks for the new activity" className={`${INPUT} tabular-nums`} />
                                        <button type="submit" className={`${BTN} col-span-2 sm:col-span-1`}><Plus size={16} />Add activity</button>
                                    </div>
                                    {draftNote ? <p className="mt-1.5 text-xs font-medium text-red-600 sm:pl-10" role="alert">{draftNote}</p>
                                        : <p className="mt-1.5 text-[11px] text-slate-500 sm:pl-10">“Up to 10”: the teacher gives 0–10 for the activity. “Per proof”: each accepted proof adds the marks.</p>}
                                </form>
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
                        <h1 className="mt-3 text-lg font-bold text-slate-800">360 is locked</h1>
                        <p className="mt-1.5 text-sm leading-relaxed text-slate-600"><strong className="text-slate-800">360</strong> tracks each student’s growth beyond the classroom (academics, campus involvement, skills, internships and more) and turns it into marks.</p>
                    </div>
                    <ol className="mt-5 space-y-3">
                        {LOCKED_STEPS.map(([title, text], i) => (
                            <li key={title} className="flex gap-3">
                                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white" aria-hidden="true">{i + 1}</span>
                                <p className="text-sm leading-relaxed text-slate-600"><span className="font-semibold text-slate-800">{title}</span> {text}</p>
                            </li>
                        ))}
                    </ol>
                    <p className="mt-5 rounded-xl bg-indigo-50 px-4 py-3 text-center text-sm font-medium text-indigo-800">This section is not unlocked for your organization yet. Ask the YATICORP team to unlock 360.</p>
                </div>
            </div>
        </div>
    );
};

export default OrgActivities;
