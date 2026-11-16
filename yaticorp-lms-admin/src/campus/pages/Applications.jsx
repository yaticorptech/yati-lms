/**
 * Online applications (2026-11-16): Admissions → 1 · Applications. New students apply for the 1st year
 * through the college's own admission link (student app /apply/<orgCode>). The office copies or shares
 * that link here, opens or closes it, reads each application, and admits it — the admission form opens
 * filled in, the student's AI card is added, and they are admitted — or rejects it.
 * Server: /api/organizations/me/campus/applications (src/campus/orgAdmin.js), public form src/campus/apply.js.
 */
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Link2, Copy, Check, Share2, ExternalLink, Inbox, ChevronDown, UserCheck, X, SlidersHorizontal, Pencil } from 'lucide-react';
import api, { CAMPUS, errorOf } from '../api';
import { useCampus } from '../context';
import { AdmissionForm } from './StudentRecord';
import { MoreDetails, QUESTION_TYPES } from '../CustomAnswers';
import { Plus, Trash2, ArrowUp, ArrowDown, ArrowLeft, Monitor, Smartphone } from 'lucide-react';
import { Card, Button, Chip, Empty, Skeleton, LoadFailed, Banner, Dialog, Field, Input, Select, Textarea, SearchBox, Tabs, useData, useToast, useSubmit, plural } from '../ui';

// The admission form's detail fields, in the same groups as the admission form (StudentRecord.jsx).
const GROUPS = [
    ['Personal', ['dob', 'gender', 'bloodGroup', 'category', 'nationality', 'religion', 'motherTongue']],
    ['Parents and guardian', ['fatherName', 'fatherPhone', 'fatherOccupation', 'motherName', 'motherPhone', 'guardianName', 'guardianPhone']],
    ['Address', ['address', 'city', 'state', 'pincode']],
    ['Previous education', ['previousInstitution', 'previousBoard', 'previousPercentage']],
    ['Other', ['quota', 'hostel', 'transport']]
];
const CHOICES = { gender: ['Female', 'Male', 'Other'], bloodGroup: ['A+', 'A−', 'B+', 'B−', 'AB+', 'AB−', 'O+', 'O−'], category: ['General', 'OBC', 'SC', 'ST', 'EWS', 'Other'], quota: ['Merit', 'Management', 'NRI', 'Sports', 'Other'], hostel: ['Yes', 'No'], transport: ['Yes', 'No'] };
const MODES = [['off', 'Hidden'], ['optional', 'Optional'], ['required', 'Required']];

// The page's words and their usual text (the public page's own: student app admission/ApplyPage.jsx WORDS).
const WORDS = [
    ['heading', 'Form title', 'Application for admission'],
    ['sub', 'Line under the title', '1st year · fields marked * are required · takes about 5 minutes'],
    ['submit', 'Send button', 'Send application'],
    ['note', 'Line beside the button', 'By sending, you confirm these details are correct.'],
    ['done', 'After sending', 'The admission office will contact you on your email or mobile number.'],
    ['closed', 'When the link is closed', 'The college is not taking online applications right now. Please contact its admission office.']
];
const SECTIONS = [
    ['course', 'Course', 'The course you want to join in the 1st year.'],
    ['about', 'About you', 'We contact you on this email and mobile number.'],
    ['personal', 'Personal', ''], ['parents', 'Parents and guardian', ''], ['address', 'Address', ''],
    ['education', 'Previous education', ''], ['other', 'Other', ''],
    ['more', 'More about you', 'What the college would also like to know.']
];
const ALWAYS = [['course', 'Course'], ['section', 'Section'], ['name', 'Full name (as in your marks card)'], ['email', 'Email'], ['phone', 'Mobile number']];
const GROUP_KEY = { 'Personal': 'personal', 'Parents and guardian': 'parents', 'Address': 'address', 'Previous education': 'education', 'Other': 'other' };

/**
 * Customize form (2026-11-16): the college's admission page, edited beside a live copy of it — the
 * real public page in a frame (student app /apply/<orgCode>?preview=1), sent each change as it is made.
 * Words: the title, lines, every section's title and description, the button and the messages.
 * Fields: each one hidden, optional or required, and renamed. Questions: the college's own.
 */
const FormEditor = ({ orgCode, form, labels: baseLabels, onClose, onSaved }) => {
    const [tab, setTab] = useState('words');
    const [device, setDevice] = useState('desktop');
    const [intro, setIntro] = useState(form?.intro || '');
    const [fields, setFields] = useState(form?.fields || {});
    const [text, setText] = useState(() => ({ ...(form?.text || {}), sections: { ...(form?.text?.sections || {}) } }));
    const [names, setNames] = useState(form?.labels || {});
    const [custom, setCustom] = useState(() => (form?.custom || []).map((q) => ({ ...q, options: (q.options || []).join('\n') })));
    const [dirty, setDirty] = useState(false);
    const { busy, error, run } = useSubmit();
    const frame = React.useRef(null);
    const touch = (fn) => (...a) => { setDirty(true); fn(...a); };

    // What the page is sent: the same shape the server keeps.
    const draft = React.useMemo(() => ({
        intro, fields, text, labels: names,
        custom: custom.filter((q) => q.label).map((q, i) => ({ id: q.id || `q_draft${i}`, label: q.label, type: q.type, required: !!q.required, options: String(q.options || '').split('\n').map((o) => o.trim()).filter(Boolean) }))
    }), [intro, fields, text, names, custom]);
    const send = React.useCallback(() => frame.current?.contentWindow?.postMessage({ type: 'apply-preview', form: draft }, '*'), [draft]);
    React.useEffect(() => { send(); }, [send]);
    React.useEffect(() => {
        const on = (e) => { if (e.data?.type === 'apply-preview-ready') send(); };
        window.addEventListener('message', on);
        return () => window.removeEventListener('message', on);
    }, [send]);

    const save = () => run(async () => {
        const r = await api.put(`${CAMPUS}/applications/form`, { intro, fields, text, labels: names, custom: custom.map((q) => ({ ...q, options: String(q.options || '').split('\n') })) });
        setDirty(false);
        onSaved(r.data.message);
    });
    const close = () => { if (!dirty || window.confirm('Leave without saving your changes?')) onClose(); };
    const setWord = touch((k, v) => setText((t) => ({ ...t, [k]: v })));
    const setSection = touch((k, part, v) => setText((t) => ({ ...t, sections: { ...t.sections, [k]: { ...(t.sections?.[k] || {}), [part]: v } } })));
    const setName = touch((k, v) => setNames((n) => ({ ...n, [k]: v })));
    const setMode = touch((k, m) => setFields((f) => ({ ...f, [k]: m })));
    const setQ = touch((i, patch) => setCustom((c) => c.map((q, j) => (j === i ? { ...q, ...patch } : q))));
    const moveQ = touch((i, d) => setCustom((c) => { const next = [...c]; const [x] = next.splice(i, 1); next.splice(i + d, 0, x); return next; }));
    const src = `${STUDENT_APP}/apply/${encodeURIComponent(orgCode)}?preview=1`;

    return createPortal(
        <div className="fixed inset-0 z-50 flex flex-col bg-porcelain" role="dialog" aria-modal="true" aria-label="Customize admission form">
            <header className="flex shrink-0 flex-wrap items-center gap-3 border-b border-line bg-white px-4 py-3 sm:px-6">
                <button type="button" onClick={close} className="inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-ink-2 hover:bg-paper"><ArrowLeft size={16} /> Back</button>
                <div className="min-w-0 flex-1">
                    <h2 className="truncate font-display text-lg font-semibold text-ink">Customize admission form</h2>
                    <p className="truncate text-xs text-ink-3">{dirty ? 'Unsaved changes — the preview shows them already' : 'What new students see on your admission link'}</p>
                </div>
                <div className="hidden rounded-xl bg-paper p-1 ring-1 ring-line md:flex">
                    {[['desktop', Monitor, 'Computer'], ['phone', Smartphone, 'Phone']].map(([d, Icon, l]) => (
                        <button key={d} type="button" onClick={() => setDevice(d)} aria-pressed={device === d} className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold ${device === d ? 'bg-white text-ink shadow-sm' : 'text-ink-3 hover:text-ink'}`}><Icon size={14} /> {l}</button>
                    ))}
                </div>
                <Button busy={busy} disabled={!dirty} onClick={save}>Save form</Button>
            </header>
            {error && <div className="shrink-0 px-4 pt-3 sm:px-6"><Banner>{error}</Banner></div>}
            <div className="flex min-h-0 flex-1 flex-col md:flex-row">
                {/* The settings */}
                <aside className="flex min-h-0 flex-col border-b border-line bg-white md:w-[26rem] md:shrink-0 md:border-b-0 md:border-r max-md:max-h-[55%]">
                    <div className="shrink-0 px-4 pt-3 sm:px-5"><Tabs value={tab} onChange={setTab} options={[['words', 'Words'], ['fields', 'Fields'], ['questions', 'Your questions', custom.length]]} /></div>
                    <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-4 sm:px-5">
                        {tab === 'words' && (
                            <>
                                {WORDS.slice(0, 2).map(([k, l, d]) => <Field key={k} label={l}><Input value={text[k] || ''} onChange={(e) => setWord(k, e.target.value)} placeholder={d} maxLength={k === 'sub' ? 400 : 120} /></Field>)}
                                <Field label="Note at the top" hint="Optional — documents to keep ready, last date, fees.">
                                    <Textarea value={intro} onChange={(e) => { setDirty(true); setIntro(e.target.value); }} maxLength={1000} placeholder="Keep your 12th marks card and Aadhaar ready. Last date: 30 June." />
                                </Field>
                                <div>
                                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-[.14em] text-ink-3">Sections</p>
                                    <ul className="space-y-3">
                                        {SECTIONS.map(([k, t, sub]) => (
                                            <li key={k} className="rounded-xl border border-line p-3">
                                                <Input value={text.sections?.[k]?.title || ''} onChange={(e) => setSection(k, 'title', e.target.value)} placeholder={t} maxLength={80} aria-label={`${t} — title`} className="font-semibold" />
                                                <Input value={text.sections?.[k]?.sub || ''} onChange={(e) => setSection(k, 'sub', e.target.value)} placeholder={sub || 'Description (optional)'} maxLength={300} aria-label={`${t} — description`} className="mt-2 text-sm" />
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                {WORDS.slice(2).map(([k, l, d]) => (
                                    <Field key={k} label={l}>{k === 'submit' ? <Input value={text[k] || ''} onChange={(e) => setWord(k, e.target.value)} placeholder={d} maxLength={120} /> : <Textarea value={text[k] || ''} onChange={(e) => setWord(k, e.target.value)} placeholder={d} maxLength={400} className="min-h-16" />}</Field>
                                ))}
                                <p className="text-xs text-ink-3">Leave a box empty to use the usual words shown in grey.</p>
                            </>
                        )}
                        {tab === 'fields' && (
                            <>
                                <section>
                                    <h3 className="mb-2 text-sm font-semibold text-ink">Always asked</h3>
                                    <ul className="space-y-2">{ALWAYS.map(([k, d]) => <li key={k}><Input value={names[k] || ''} onChange={(e) => setName(k, e.target.value)} placeholder={d} maxLength={80} aria-label={`Rename ${d}`} /></li>)}</ul>
                                </section>
                                {GROUPS.map(([title, keys]) => (
                                    <section key={title}>
                                        <div className="mb-2 flex items-center justify-between gap-2">
                                            <h3 className="text-sm font-semibold text-ink">{text.sections?.[GROUP_KEY[title]]?.title || title}</h3>
                                            <Select value="" onChange={(e) => { if (e.target.value) keys.forEach((k) => setMode(k, e.target.value)); }} className="!h-8 w-auto text-xs" aria-label={`Set all in ${title}`}>
                                                <option value="">Set all…</option>{MODES.map(([m, l]) => <option key={m} value={m}>{l}</option>)}
                                            </Select>
                                        </div>
                                        <ul className="space-y-2">
                                            {keys.map((k) => {
                                                const mode = fields[k] || 'optional';
                                                return (
                                                    <li key={k} className={`rounded-xl border p-2.5 ${mode === 'off' ? 'border-dashed border-line bg-paper' : 'border-line'}`}>
                                                        <Input value={names[k] || ''} onChange={(e) => setName(k, e.target.value)} placeholder={baseLabels[k] || k} maxLength={80} aria-label={`Rename ${baseLabels[k] || k}`} className={`!h-9 text-sm ${mode === 'off' ? 'opacity-60' : ''}`} />
                                                        <div role="radiogroup" aria-label={baseLabels[k] || k} className="mt-2 grid grid-cols-3 rounded-lg bg-paper p-0.5 ring-1 ring-line">
                                                            {MODES.map(([m, l]) => (
                                                                <button key={m} type="button" role="radio" aria-checked={mode === m} onClick={() => setMode(k, m)}
                                                                    className={`rounded-md py-1 text-xs font-semibold transition ${mode === m ? (m === 'required' ? 'bg-petrol-700 text-white' : m === 'off' ? 'bg-ink-3 text-white' : 'bg-white text-ink shadow-sm') : 'text-ink-3 hover:text-ink'}`}>{l}</button>
                                                            ))}
                                                        </div>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    </section>
                                ))}
                            </>
                        )}
                        {tab === 'questions' && (
                            <>
                                <p className="text-sm text-ink-2">Anything else you need — a text box, dropdown, checkboxes, yes/no, number or date.</p>
                                {custom.length === 0 && <p className="rounded-xl border border-dashed border-line px-4 py-5 text-center text-sm text-ink-3">No questions yet. E.g. “Aadhaar number”, “Sports you play”, “Need a scholarship?”.</p>}
                                <ul className="space-y-3">
                                    {custom.map((q, i) => (
                                        <li key={q.id || i} className="rounded-xl border border-line p-3">
                                            <Input value={q.label} onChange={(e) => setQ(i, { label: e.target.value })} placeholder="Question, e.g. Aadhaar number" maxLength={150} aria-label="Question" />
                                            <Select className="mt-2" value={q.type} onChange={(e) => setQ(i, { type: e.target.value })} aria-label="Answer type">{QUESTION_TYPES.map(([t, l]) => <option key={t} value={t}>{l}</option>)}</Select>
                                            {['select', 'multi'].includes(q.type) && <Textarea className="mt-2" value={q.options} onChange={(e) => setQ(i, { options: e.target.value })} placeholder={'One option per line\nCricket\nFootball\nChess'} aria-label="Options" />}
                                            <div className="mt-2 flex items-center justify-between gap-2">
                                                <label className="inline-flex items-center gap-2 text-sm font-medium text-ink-2"><input type="checkbox" checked={!!q.required} onChange={(e) => setQ(i, { required: e.target.checked })} className="h-4 w-4 accent-petrol-700" /> Required</label>
                                                <div className="flex gap-1">
                                                    <button type="button" onClick={() => moveQ(i, -1)} disabled={i === 0} aria-label="Move up" className="rounded-lg p-2 text-ink-3 hover:bg-paper hover:text-ink disabled:opacity-30"><ArrowUp size={15} /></button>
                                                    <button type="button" onClick={() => moveQ(i, 1)} disabled={i === custom.length - 1} aria-label="Move down" className="rounded-lg p-2 text-ink-3 hover:bg-paper hover:text-ink disabled:opacity-30"><ArrowDown size={15} /></button>
                                                    <button type="button" onClick={() => { setDirty(true); setCustom(custom.filter((_, j) => j !== i)); }} aria-label="Remove question" className="rounded-lg p-2 text-rose-600 hover:bg-rose-50"><Trash2 size={15} /></button>
                                                </div>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                                <Button variant="secondary" icon={Plus} disabled={custom.length >= 30} onClick={() => { setDirty(true); setCustom([...custom, { label: '', type: 'text', options: '', required: false }]); setTab('questions'); }} className="w-full">Add question</Button>
                            </>
                        )}
                    </div>
                </aside>
                {/* The page itself, live. */}
                <section className="flex min-h-0 flex-1 items-stretch justify-center overflow-hidden bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgb(0_0_0/.015)_10px,rgb(0_0_0/.015)_20px)] p-3 sm:p-5" aria-label="Live preview">
                    <div className={`flex min-h-0 w-full flex-col overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-line transition-[max-width] duration-300 ${device === 'phone' ? 'max-w-[390px]' : 'max-w-none'}`}>
                        <div className="flex shrink-0 items-center gap-2 border-b border-line bg-paper px-3 py-2">
                            <span className="flex gap-1" aria-hidden><span className="h-2.5 w-2.5 rounded-full bg-rose-300" /><span className="h-2.5 w-2.5 rounded-full bg-amber-300" /><span className="h-2.5 w-2.5 rounded-full bg-emerald-300" /></span>
                            <span className="min-w-0 flex-1 truncate rounded-md bg-white px-2 py-1 font-mono text-[11px] text-ink-3 ring-1 ring-line">{src.replace('?preview=1', '')}</span>
                            <Chip tone="amber">Preview</Chip>
                        </div>
                        <iframe ref={frame} src={src} title="Admission form preview" className="min-h-0 w-full flex-1 border-0" onLoad={send} />
                    </div>
                </section>
            </div>
        </div>, document.body);
};

/** Correct an application before admitting it (2026-11-16). */
const EditApplication = ({ a, labels, fields, departments, onClose, onSaved }) => {
    const [f, setF] = useState({ name: a.name, email: a.email, phone: a.phone, departmentId: String(a.departmentId || ''), section: a.section || '' });
    const [details, setDetails] = useState(a.details || {});
    const { busy, error, run } = useSubmit();
    const dept = departments.find((d) => String(d._id) === f.departmentId);
    const save = (e) => { e.preventDefault(); run(async () => { const r = await api.put(`${CAMPUS}/applications/${a._id}`, { ...f, details }); onSaved(r.data.message); }); };
    return (
        <Dialog size="max-w-3xl" title="Edit application" sub={`${a.name} · applied ${when(a.at)}`} onClose={onClose}
            footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" form="edit-application" busy={busy}>Save changes</Button></>}>
            <form id="edit-application" onSubmit={save} className="space-y-7">
                <section>
                    <h3 className="mb-3 font-display text-base font-semibold">Applicant</h3>
                    <div className="grid gap-4 sm:grid-cols-3">
                        <Field label="Full name" className="sm:col-span-3"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required /></Field>
                        <Field label="Email"><Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} required /></Field>
                        <Field label="Mobile"><Input type="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} required /></Field>
                        <div className="hidden sm:block" />
                        <Field label="Course"><Select value={f.departmentId} onChange={(e) => setF({ ...f, departmentId: e.target.value, section: '' })}>{departments.map((d) => <option key={d._id} value={String(d._id)}>{d.name}</option>)}</Select></Field>
                        {dept?.sections?.length > 1 && <Field label="Section"><Select value={f.section} onChange={(e) => setF({ ...f, section: e.target.value })}><option value="">Choose</option>{dept.sections.map((s) => <option key={s} value={s}>Section {s}</option>)}</Select></Field>}
                    </div>
                </section>
                {GROUPS.map(([title, keys]) => (
                    <section key={title}>
                        <h3 className="mb-3 font-display text-base font-semibold">{title}</h3>
                        <div className="grid gap-4 sm:grid-cols-3">
                            {keys.map((k) => (
                                <Field key={k} label={labels[k] || k} className={k === 'address' ? 'sm:col-span-3' : ''}>
                                    {CHOICES[k] ? (
                                        <Select value={details[k] || ''} onChange={(e) => setDetails({ ...details, [k]: e.target.value })}><option value="">—</option>{CHOICES[k].map((c) => <option key={c}>{c}</option>)}</Select>
                                    ) : <Input type={k === 'dob' ? 'date' : 'text'} value={details[k] || ''} onChange={(e) => setDetails({ ...details, [k]: e.target.value })} />}
                                </Field>
                            ))}
                        </div>
                    </section>
                ))}
                <MoreDetails fields={fields} details={details} setDetails={setDetails} />
                {error && <Banner>{error}</Banner>}
            </form>
        </Dialog>
    );
};

const STUDENT_APP = (import.meta.env.VITE_STUDENT_URL || 'http://localhost:5173').replace(/\/+$/, '');
const when = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

/** The college's admission link: copy, share, open, and open/close it. */
const ShareLink = ({ orgCode, open, onToggled, onCustomize }) => {
    const toast = useToast();
    const [copied, setCopied] = useState(false);
    const [busy, setBusy] = useState(false);
    const url = `${STUDENT_APP}/apply/${orgCode}`;
    const copy = async () => {
        try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1800); }
        catch { window.prompt('Copy the admission link', url); }
    };
    const share = () => navigator.share?.({ title: 'Admission application', text: 'Apply for admission here:', url }).catch(() => {});
    const toggle = async () => {
        setBusy(true);
        try { const r = await api.put(`${CAMPUS}/applications/open`, { open: !open }); toast(r.data.message); onToggled(); }
        catch (err) { toast(errorOf(err, 'That did not go through.')); }
        finally { setBusy(false); }
    };
    return (
        <Card className="mb-5 overflow-hidden">
            <div className="flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${open ? 'bg-petrol-50 text-petrol-700' : 'bg-paper text-ink-3'}`}><Link2 size={18} aria-hidden /></span>
                    <div className="min-w-0">
                        <p className="flex flex-wrap items-center gap-2 font-semibold text-ink">Admission link {open ? <Chip tone="green">Taking applications</Chip> : <Chip tone="grey">Closed</Chip>}</p>
                        <p className="mt-0.5 text-sm text-ink-3">Send this to new students. They fill the full form with your college’s name and logo; it lands here.</p>
                        <p className="mt-2 truncate rounded-lg bg-paper px-3 py-2 font-mono text-xs text-ink-2 ring-1 ring-line" title={url}>{url}</p>
                    </div>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                    <Button icon={copied ? Check : Copy} onClick={copy}>{copied ? 'Copied' : 'Copy link'}</Button>
                    {typeof navigator !== 'undefined' && navigator.share && <Button variant="secondary" icon={Share2} onClick={share}>Share</Button>}
                    <a href={url} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-ink-2 ring-1 ring-line hover:bg-paper"><ExternalLink size={15} /> Preview</a>
                    <Button variant="secondary" icon={SlidersHorizontal} onClick={onCustomize}>Customize form</Button>
                    <Button variant="ghost" busy={busy} onClick={toggle}>{open ? 'Close link' : 'Open link'}</Button>
                </div>
            </div>
        </Card>
    );
};

const Row = ({ a, labels, onAdmit, onEdit, onRejected }) => {
    const toast = useToast();
    const [expanded, setExpanded] = useState(false);
    const [rejecting, setRejecting] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const filled = Object.entries(a.details || {}).filter(([, v]) => v);
    const reject = async () => {
        setBusy(true); setError('');
        try { toast((await api.post(`${CAMPUS}/applications/${a._id}/reject`)).data.message); onRejected(); }
        catch (err) { setError(errorOf(err, 'That did not go through.')); setBusy(false); }
    };
    return (
        <li className="p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <button type="button" onClick={() => setExpanded((v) => !v)} aria-expanded={expanded} className="flex min-w-0 flex-1 items-start gap-3 text-left">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-petrol-50 text-sm font-bold text-petrol-700">{a.name.split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase()}</span>
                    <span className="min-w-0 flex-1">
                        <span className="block font-semibold text-ink">{a.name}</span>
                        <span className="block truncate text-xs text-ink-3">{[a.phone, a.email].filter(Boolean).join(' · ')}</span>
                        <span className="mt-1 block text-xs text-ink-3">Applied {when(a.at)} · <b className="text-ink-2">{a.department || 'Course removed'}{a.section ? ` · Section ${a.section}` : ''}</b></span>
                    </span>
                    <ChevronDown size={16} className={`mt-1 shrink-0 text-ink-3 transition-transform ${expanded ? 'rotate-180' : ''}`} aria-hidden />
                </button>
                {!rejecting ? (
                    <div className="flex shrink-0 gap-2">
                        <Button icon={UserCheck} disabled={!a.department} onClick={() => onAdmit(a)}>Admit</Button>
                        <Button variant="secondary" icon={Pencil} onClick={() => onEdit(a)} aria-label={`Edit ${a.name}’s application`}><span className="hidden sm:inline">Edit</span></Button>
                        <Button variant="secondary" icon={X} onClick={() => setRejecting(true)}>Reject</Button>
                    </div>
                ) : (
                    <div className="flex shrink-0 gap-2">
                        <Button variant="danger" busy={busy} onClick={reject}>Reject application</Button>
                        <Button variant="ghost" onClick={() => setRejecting(false)}>Cancel</Button>
                    </div>
                )}
            </div>
            {expanded && (
                <dl className="mt-4 grid gap-x-6 gap-y-3 rounded-xl bg-paper p-4 ring-1 ring-line sm:grid-cols-2 lg:grid-cols-3">
                    {filled.length ? filled.map(([k, v]) => (
                        <div key={k} className="min-w-0">
                            <dt className="text-[11px] font-semibold uppercase tracking-[.12em] text-ink-3">{labels[k] || k}</dt>
                            <dd className="mt-0.5 break-words text-sm text-ink">{v}</dd>
                        </div>
                    )) : <p className="text-sm text-ink-3">No other details given.</p>}
                </dl>
            )}
            {error && <div className="mt-2"><Banner>{error}</Banner></div>}
        </li>
    );
};

export default function Applications({ onCount }) {
    const toast = useToast();
    const { departments, ctx } = useCampus();
    const labels = Object.fromEntries((ctx?.detailFields || []).map((f) => [f.key, f.label]));
    const { data, loading, failed, error, reload } = useData('/applications');
    const [admitting, setAdmitting] = useState(null);
    const [editing, setEditing] = useState(null);
    const [customizing, setCustomizing] = useState(false);
    const all = data?.applications || [];
    // Many applications (2026-11-16): search by name, mobile or email, and narrow to one course.
    const [term, setTerm] = useState('');
    const [course, setCourse] = useState('');
    const q = term.trim().toLowerCase();
    const rows = all.filter((a) => (!course || String(a.departmentId) === course)
        && (!q || [a.name, a.phone, a.email].some((v) => String(v || '').toLowerCase().includes(q))));
    const courses = [...new Map(all.map((a) => [String(a.departmentId), a.department || 'Course removed'])).entries()];
    const changed = () => { reload(); onCount?.(); };
    const dept = admitting && (departments || []).find((d) => String(d._id) === String(admitting.departmentId));
    return (
        <>
            {data && <ShareLink orgCode={data.orgCode} open={data.open} onToggled={reload} onCustomize={() => setCustomizing(true)} />}
            {all.length > 0 && (
                <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                    <SearchBox value={term} onChange={setTerm} placeholder="Search name, mobile or email" className="sm:w-72" />
                    {courses.length > 1 && (
                        <Select value={course} onChange={(e) => setCourse(e.target.value)} className="sm:w-56" aria-label="Course">
                            <option value="">All courses</option>
                            {courses.map(([id, name]) => <option key={id} value={id}>{name} · {all.filter((a) => String(a.departmentId) === id).length}</option>)}
                        </Select>
                    )}
                    <p className="text-sm text-ink-3 sm:ml-auto">{rows.length === all.length ? `${plural(all.length, 'application')} waiting` : `${rows.length} of ${all.length}`}{!data?.open && ' · link closed'}</p>
                </div>
            )}
            {loading ? <Card><Skeleton rows={4} /></Card> : failed ? <Card><LoadFailed what="the applications" onRetry={reload} error={error} /></Card> : !all.length ? (
                <Card><Empty icon={Inbox} title="No applications waiting">{data?.open ? 'Share your admission link with new students. Their applications show here.' : 'Your link is closed. Open it again to take new applications.'}</Empty></Card>
            ) : !rows.length ? (
                <Card><Empty icon={Inbox} title="No match">Try another name, number or course.</Empty></Card>
            ) : (
                <Card className="overflow-hidden"><ul className="divide-y divide-line">{rows.map((a) => <Row key={a._id} a={a} labels={labels} onAdmit={setAdmitting} onEdit={setEditing} onRejected={changed} />)}</ul></Card>
            )}
            {customizing && <FormEditor orgCode={data?.orgCode} form={data?.form} labels={labels} onClose={() => setCustomizing(false)} onSaved={(m) => { setCustomizing(false); toast(m); reload(); }} />}
            {editing && <EditApplication a={editing} labels={labels} fields={ctx?.detailFields || []} departments={departments || []} onClose={() => setEditing(null)} onSaved={(m) => { setEditing(null); toast(m); reload(); }} />}
            {admitting && dept && (
                <AdmissionForm dept={dept} fresh application={admitting} onClose={() => setAdmitting(null)} onBack={() => setAdmitting(null)}
                    onDone={(m) => { setAdmitting(null); toast(m); changed(); }} />
            )}
        </>
    );
}
