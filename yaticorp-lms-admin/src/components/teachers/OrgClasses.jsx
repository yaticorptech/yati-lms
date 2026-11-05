/**
 * Teachers → Courses & sections (2026-10-30): one card, one list — each
 * course the organization offers (BBA, BCA…) and how many sections it has
 * (Section A, B…) — edited in place and saved together. The organization only
 * lists them: each teacher with 360 marks the course, section and subject
 * they teach in their 360 dashboard. ("Open 360 to students" is on the
 * 360 Activities page, 2026-10-31.) Server: src/three60 (/organizations/me/classes).
 */
import React, { useEffect, useRef, useState } from 'react';
import { Plus, Trash2, Loader2, Minus } from 'lucide-react';
import api from '../../utils/api';
import useAutoRefresh from '../../hooks/useAutoRefresh';
import { CARD, INPUT, BTN, BTN2, Banner, Rows, LoadFailed } from '../orgUi';

const BASE = '/organizations/me/classes';
const errorOf = (err, fallback) => err.response?.data?.message || fallback;
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const MAX_SECTIONS = 26;

// What the form edits: { key, _id?, name, sections } per course.
let nextKey = 0;
const rowsOf = (programs) => programs.map((p) => ({ key: `r${nextKey++}`, _id: p._id, name: p.name, sections: p.sections.length, sectionNames: p.sections.map((s) => s.name), teachers: p.teachers || 0 }));
const same = (a, b) => JSON.stringify(a.map(({ _id, name, sections }) => [_id || null, name.trim(), Number(sections)]))
    === JSON.stringify(b.map(({ _id, name, sections }) => [_id || null, name.trim(), Number(sections)]));
/** The section names a row will have: the ones it keeps, then the next letters. */
const namesFor = (row) => {
    const kept = (row.sectionNames || []).slice(0, row.sections);
    const used = new Set(kept.map((n) => n.toLowerCase()));
    const out = [...kept];
    for (const l of LETTERS) { if (out.length >= row.sections) break; if (!used.has(`section ${l}`.toLowerCase())) out.push(`Section ${l}`); }
    return out;
};

const OrgClasses = ({ onNotice }) => {
    const [saved, setSaved] = useState(null);       // the rows as the server has them
    const [rows, setRows] = useState(null);         // the rows as edited
    const [failed, setFailed] = useState(false);
    const [error, setError] = useState('');
    const [errorRow, setErrorRow] = useState(null);  // { row, field }
    const [busy, setBusy] = useState('');            // 'save'

    // The latest rows, for the background refresh: it never throws away what is being typed.
    const now = useRef({ rows: null, saved: null });
    useEffect(() => { now.current = { rows, saved }; });
    const take = (data) => { const r = rowsOf(data.programs || []); setSaved(r); setRows(r); };
    const load = async ({ signal, isCurrent = () => true } = {}) => {
        try {
            const r = await api.get(BASE, { signal });
            if (!isCurrent()) return;
            const { rows: editing, saved: last } = now.current;
            if (!last || !editing || same(last, editing)) take(r.data);
            setFailed(false);
        } catch { if (isCurrent() && !now.current.saved) setFailed(true); }
    };
    const reload = useAutoRefresh(load, 60000, []);
    const dirty = Boolean(rows && saved && !same(rows, saved));

    const change = (key, patch) => { setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r))); setError(''); setErrorRow(null); };
    const addRow = () => { setRows((rs) => [...rs, { key: `r${nextKey++}`, name: '', sections: 1, sectionNames: [], teachers: 0 }]); setError(''); };
    const removeRow = (row) => {
        if (row.teachers && !window.confirm(`Remove ${row.name || 'this course'}? ${plural(row.teachers, 'teacher')} marked classes in it; those go too when you save.`)) return;
        setRows((rs) => rs.filter((r) => r.key !== row.key)); setError(''); setErrorRow(null);
    };
    const save = async () => {
        setBusy('save'); setError(''); setErrorRow(null);
        try {
            const r = await api.put(`${BASE}/programs`, { programs: rows.map(({ _id, name, sections }) => ({ ...(_id ? { _id } : {}), name: name.trim(), sections: Number(sections) })) });
            take(r.data);
            onNotice('Courses and sections saved.');
        } catch (err) {
            setError(errorOf(err, 'The courses could not be saved.'));
            if (typeof err.response?.data?.row === 'number') setErrorRow({ row: err.response.data.row, field: err.response.data.field });
        } finally { setBusy(''); }
    };

    if (!rows) return <div className={CARD}>{failed ? <LoadFailed what="your courses" onRetry={reload} /> : <Rows count={3} height="h-12" />}</div>;
    const sections = rows.reduce((n, r) => n + (Number(r.sections) || 0), 0);

    return (
        <section className={`${CARD} overflow-hidden`} aria-labelledby="org-classes-title">
            <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-start sm:justify-between sm:p-5">
                <div className="min-w-0">
                    <h2 id="org-classes-title" className="font-bold text-slate-800">Courses &amp; sections</h2>
                    <p className="mt-1 text-sm text-slate-500">Your courses and how many sections each has. Your courses and how many sections each has. Your teachers pick from this list the course, section and year they teach, and add their subject.</p>
                    <p className="mt-1 text-xs text-slate-400 tabular-nums">{plural(rows.length, 'course')} · {plural(sections, 'section')}</p>
                </div>
            </div>

            <div className="p-4 sm:p-5">
                {rows.length === 0 ? (
                    <p className="py-4 text-center text-sm text-slate-500">No courses yet. Add one, such as BBA or BCA.</p>
                ) : (
                    <ul className="space-y-2">
                        <li aria-hidden className="hidden grid-cols-[minmax(0,1fr)_9rem_2.5rem] gap-3 px-1 text-[11px] font-bold uppercase tracking-wider text-slate-500 sm:grid">
                            <span>Course</span><span>Sections</span><span />
                        </li>
                        {rows.map((r, i) => {
                            const bad = errorRow?.row === i;
                            return (
                                <li key={r.key} className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 gap-y-1 rounded-xl border border-slate-200 p-2.5 sm:grid-cols-[minmax(0,1fr)_9rem_2.5rem] sm:border-0 sm:p-1">
                                    <input value={r.name} onChange={(e) => change(r.key, { name: e.target.value })} maxLength={80} placeholder="Course name, e.g. BBA" aria-label={`Course ${i + 1} name`}
                                        aria-invalid={bad && errorRow.field === 'name' ? 'true' : undefined}
                                        className={`${INPUT} col-span-2 sm:col-span-1 ${bad && errorRow.field === 'name' ? 'border-red-400 ring-2 ring-red-200' : ''}`} />
                                    <div className={`flex h-[42px] items-center justify-between rounded-xl border bg-white ${bad && errorRow.field === 'sections' ? 'border-red-400' : 'border-slate-300'}`} role="group" aria-label={`Sections in ${r.name || `course ${i + 1}`}`}>
                                        <button type="button" onClick={() => change(r.key, { sections: Math.max(1, Number(r.sections) - 1) })} disabled={Number(r.sections) <= 1} aria-label="One section fewer"
                                            className="inline-flex h-full w-10 items-center justify-center text-slate-500 hover:text-slate-800 disabled:opacity-30"><Minus size={15} /></button>
                                        <span className="min-w-[2rem] text-center text-sm font-bold text-slate-800 tabular-nums" aria-live="polite">{r.sections}</span>
                                        <button type="button" onClick={() => change(r.key, { sections: Math.min(MAX_SECTIONS, Number(r.sections) + 1) })} disabled={Number(r.sections) >= MAX_SECTIONS} aria-label="One section more"
                                            className="inline-flex h-full w-10 items-center justify-center text-slate-500 hover:text-slate-800 disabled:opacity-30"><Plus size={15} /></button>
                                    </div>
                                    <button type="button" onClick={() => removeRow(r)} aria-label={`Remove ${r.name || `course ${i + 1}`}`}
                                        className="inline-flex h-[42px] w-10 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={16} /></button>
                                    <p className="col-span-2 px-1 text-xs text-slate-400 sm:col-span-3">{namesFor(r).join(' · ')}{r.teachers ? ` · ${plural(r.teachers, 'teacher')} marked classes here` : ''}</p>
                                </li>
                            );
                        })}
                    </ul>
                )}
                <button type="button" onClick={addRow} className={`${BTN2} mt-3`}><Plus size={16} /> Add course</button>
                {error && <div className="mt-3"><Banner onClose={() => setError('')}>{error}</Banner></div>}
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-end sm:px-5">
                {dirty && <span className="text-xs font-semibold text-amber-700 sm:mr-auto">Unsaved changes</span>}
                {dirty && <button type="button" onClick={() => { setRows(saved); setError(''); setErrorRow(null); }} disabled={busy === 'save'} className={BTN2}>Undo changes</button>}
                <button type="button" onClick={save} disabled={!dirty || busy === 'save'} className={BTN}>{busy === 'save' && <Loader2 size={16} className="animate-spin" />}Save</button>
            </div>
        </section>
    );
};

export default OrgClasses;
