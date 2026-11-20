/**
 * A college's public admission form (2026-11-16): /apply/<orgCode>, the link the college shares.
 * New students applying for the 1st year fill their full admission form here — no sign-in. It
 * carries the college's own name and logo; YATICORPX3 appears only small at the foot.
 * The application waits in the college's Campus → Admissions → Applications.
 * Server: GET|POST /api/organizations/apply/:orgCode (src/campus/apply.js).
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { Loader2, CheckCircle2, AlertCircle, MapPin, Phone, Mail, GraduationCap, ArrowRight, ArrowLeft, Send, Info } from 'lucide-react';

const API = `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/organizations/apply`;

// [section key, its usual title, its fields]. The key is what the college's own words are kept under.
const GROUPS = [
    ['personal', 'Personal', ['dob', 'gender', 'bloodGroup', 'category', 'nationality', 'religion', 'motherTongue']],
    ['parents', 'Parents and guardian', ['fatherName', 'fatherPhone', 'fatherOccupation', 'motherName', 'motherPhone', 'guardianName', 'guardianPhone']],
    ['address', 'Address', ['address', 'city', 'state', 'pincode']],
    ['education', 'Previous education', ['previousInstitution', 'previousBoard', 'previousPercentage']],
    ['other', 'Other', ['quota', 'hostel', 'transport']]
];
// The page's own words; the college may change each in Customize form (server campus/apply.js cleanText).
const WORDS = {
    heading: 'Application for admission',
    sub: '1st year · fields marked * are required · takes about 5 minutes',
    submit: 'Send application',
    note: 'By sending, you confirm these details are correct.',
    done: 'The admission office will contact you on your email or mobile number.',
    closed: 'The college is not taking online applications right now. Please contact its admission office.'
};
const SECTION_WORDS = {
    course: ['Course', 'The course you want to join in the 1st year.'],
    about: ['About you', 'We contact you on this email and mobile number.'],
    more: ['More about you', 'What the college would also like to know.']
};
const STANDARD_LABELS = { course: 'Course', section: 'Section', name: 'Full name (as in your marks card)', email: 'Email', phone: 'Mobile number' };
/** Live preview inside the college's form editor (admin, Customize form): it sends its draft here. */
const inPreview = () => { try { return new URLSearchParams(window.location.search).get('preview') === '1' && window.parent !== window; } catch { return false; } };
const CHOICES = { gender: ['Female', 'Male', 'Other'], bloodGroup: ['A+', 'A−', 'B+', 'B−', 'AB+', 'AB−', 'O+', 'O−'], category: ['General', 'OBC', 'SC', 'ST', 'EWS', 'Other'], quota: ['Merit', 'Management', 'NRI', 'Sports', 'Other'], hostel: ['Yes', 'No'], transport: ['Yes', 'No'] };
const NUMERIC = /Phone|pincode|Percentage/;

const initials = (name) => String(name || '').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

const Field = ({ label, required, error, children, wide }) => (
    <label className={`block min-w-0 ${wide ? 'sm:col-span-2 lg:col-span-3' : ''}`}>
        <span className="mb-1.5 block text-[13px] font-semibold text-stone-700">{label}{required && <span className="text-rose-600"> *</span>}</span>
        {children}
        {error && <span role="alert" className="mt-1 block text-xs font-semibold text-rose-600">{error}</span>}
    </label>
);
const INPUT = 'h-12 w-full rounded-xl border border-stone-300 bg-white px-3.5 text-[15px] text-stone-900 placeholder:text-stone-400 transition focus:border-stone-900 focus:outline-none focus:ring-4 focus:ring-stone-900/10 aria-[invalid=true]:border-rose-400';

const Section = ({ n, title, sub, children }) => (
    <section className="grid gap-5 border-t border-stone-200 py-8 first:border-t-0 first:pt-0 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-10">
        <div>
            <span className="font-mono text-xs font-semibold text-stone-400">{String(n).padStart(2, '0')}</span>
            <h2 className="mt-1 text-lg font-bold tracking-tight text-stone-900">{title}</h2>
            {sub && <p className="mt-1 text-sm leading-relaxed text-stone-500">{sub}</p>}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </section>
);

const PoweredBy = () => (
    <footer className="flex items-center justify-center gap-2 py-8 text-[11px] font-medium text-stone-400">
        <span>Powered by</span>
        <img src="/assets/YATICORP-dark.png" alt="YATICORPX3" className="h-4 w-auto opacity-70" onError={(e) => { e.currentTarget.replaceWith(Object.assign(document.createElement('span'), { textContent: 'YATICORPX3', className: 'font-bold tracking-wide text-stone-500' })); }} />
    </footer>
);

/** One of the college's own questions, by its type (2026-11-16). A checkboxes answer is "A, B". */
const Answer = ({ q, value, onChange, invalid }) => {
    if (q.type === 'select' || q.type === 'yesno') {
        const options = q.type === 'yesno' ? ['Yes', 'No'] : q.options;
        if (options.length <= 4) {
            return (
                <div role="radiogroup" aria-invalid={invalid} className="flex flex-wrap gap-2">
                    {options.map((o) => (
                        <button key={o} type="button" role="radio" aria-checked={value === o} onClick={() => onChange(value === o ? '' : o)}
                            className={`h-11 rounded-xl px-4 text-sm font-semibold ring-1 transition ${value === o ? 'bg-stone-900 text-white ring-stone-900' : 'bg-white text-stone-700 ring-stone-300 hover:ring-stone-500'}`}>{o}</button>
                    ))}
                </div>
            );
        }
        return <select value={value} onChange={(e) => onChange(e.target.value)} className={INPUT} aria-invalid={invalid}><option value="">Choose</option>{options.map((o) => <option key={o}>{o}</option>)}</select>;
    }
    if (q.type === 'multi') {
        const picked = String(value || '').split(', ').filter(Boolean);
        const toggle = (o) => onChange(q.options.filter((x) => (x === o ? !picked.includes(o) : picked.includes(x))).join(', '));
        return (
            <div className="flex flex-wrap gap-2" aria-invalid={invalid}>
                {q.options.map((o) => (
                    <label key={o} className={`inline-flex h-11 cursor-pointer items-center gap-2 rounded-xl px-3.5 text-sm font-medium ring-1 transition ${picked.includes(o) ? 'bg-stone-900 text-white ring-stone-900' : 'bg-white text-stone-700 ring-stone-300 hover:ring-stone-500'}`}>
                        <input type="checkbox" checked={picked.includes(o)} onChange={() => toggle(o)} className="h-4 w-4 accent-amber-300" /> {o}
                    </label>
                ))}
            </div>
        );
    }
    if (q.type === 'long') return <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3} maxLength={1000} className={`${INPUT} h-auto py-3`} aria-invalid={invalid} />;
    return <input type={q.type === 'number' ? 'number' : q.type === 'date' ? 'date' : 'text'} value={value} onChange={(e) => onChange(e.target.value)} maxLength={300} className={INPUT} aria-invalid={invalid} inputMode={q.type === 'number' ? 'decimal' : undefined} />;
};

/** Loading: the college's logo when this device has seen it before, else a plain spinner — never YATICORPX3's. */
export const ApplyLoading = ({ orgCode }) => {
    let logo = null;
    try { logo = orgCode ? localStorage.getItem(`apply-logo:${String(orgCode).toLowerCase()}`) : null; } catch { /* storage unavailable */ }
    return (
        <div className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-[#f6f4ef]" role="status" aria-label="Loading admission form">
            {logo && <img src={logo} alt="" className="h-20 w-20 animate-pulse rounded-2xl bg-white object-contain p-2 shadow-lg ring-1 ring-stone-200" />}
            <Loader2 className="h-6 w-6 animate-spin text-stone-400" aria-hidden="true" />
        </div>
    );
};

export default function ApplyPage() {
    const { orgCode } = useParams();
    const navigate = useNavigate();
    // Back (2026-11-16): where they came from, or the app's home when the link was opened directly.
    const goBack = () => { if (window.history.length > 1) navigate(-1); else navigate('/'); };
    const [data, setData] = useState(null);
    const [loadError, setLoadError] = useState('');
    const [form, setForm] = useState({ departmentId: '', section: '', name: '', email: '', phone: '' });
    const [details, setDetails] = useState({});
    const [errors, setErrors] = useState({});
    const [busy, setBusy] = useState(false);
    const [problem, setProblem] = useState('');
    const [sent, setSent] = useState('');
    // Preview (2026-11-16): the editor's draft form, sent by postMessage; nothing is ever submitted.
    const preview = useMemo(inPreview, []);
    const [draft, setDraft] = useState(null);
    useEffect(() => {
        if (!preview) return undefined;
        const on = (e) => { if (e.data?.type === 'apply-preview' && e.data.form) setDraft(e.data.form); };
        window.addEventListener('message', on);
        window.parent.postMessage({ type: 'apply-preview-ready' }, '*');
        return () => window.removeEventListener('message', on);
    }, [preview]);

    useEffect(() => {
        axios.get(`${API}/${encodeURIComponent(orgCode || '')}`)
            .then((r) => {
                setData(r.data);
                document.title = `Admission · ${r.data.organization.name}`;
                // Remembered for the loading screen next time (index.html): the college's logo, not ours.
                try { const k = `apply-logo:${String(orgCode).toLowerCase()}`; if (r.data.organization.logo) localStorage.setItem(k, r.data.organization.logo); else localStorage.removeItem(k); } catch { /* storage unavailable */ }
            })
            .catch((e) => setLoadError(e.response?.data?.message || 'The admission form could not be loaded. Please check your connection and try again.'));
    }, [orgCode]);

    // The college's own form (2026-11-16) — or, in the editor's preview, its draft: which fields show,
    // which are required, its own questions, its own words and its own names for the fields.
    const F = draft || data?.form || {};
    const modes = F.fields || {};
    const T = { ...WORDS, ...Object.fromEntries(Object.entries(F.text || {}).filter(([k, v]) => k !== 'sections' && v)) };
    const sectionOf = (key, title, sub = '') => ({ title: F.text?.sections?.[key]?.title || title, sub: F.text?.sections?.[key]?.sub || sub });
    const labels = useMemo(() => ({ ...STANDARD_LABELS, ...Object.fromEntries((data?.catalog || []).map((f) => [f.key, f.label])), ...Object.fromEntries(Object.entries(F.labels || {}).filter(([, v]) => v)) }), [data, F.labels]);
    const shown = new Set(Object.entries(modes).filter(([, m]) => m !== 'off').map(([k]) => k));
    const REQUIRED = Object.entries(modes).filter(([, m]) => m === 'required').map(([k]) => k);
    const custom = F.custom || [];
    const groups = GROUPS.map(([key, t, keys]) => [key, t, keys.filter((k) => shown.has(k))]).filter(([, , keys]) => keys.length);
    const dept = data?.departments.find((d) => d._id === form.departmentId);
    const set = (k) => (e) => { setForm({ ...form, [k]: e.target.value }); setErrors({ ...errors, [k]: '' }); };
    const setD = (k) => (e) => { setDetails({ ...details, [k]: e.target.value }); setErrors({ ...errors, [k]: '' }); };

    const check = () => {
        const e = {};
        if (!form.departmentId) e.departmentId = 'Choose a course.';
        if (dept?.sections?.length > 1 && !form.section) e.section = 'Choose a section.';
        if (form.name.trim().length < 2) e.name = 'Enter your full name.';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e.email = 'Enter a valid email.';
        if (!/^\+?\d{10,13}$/.test(form.phone.replace(/[\s-]/g, ''))) e.phone = 'Enter a 10-digit mobile number.';
        for (const k of REQUIRED) if (!String(details[k] || '').trim()) e[k] = 'Required.';
        for (const q of custom) if (q.required && !String(details[q.id] || '').trim()) e[q.id] = 'Required.';
        return e;
    };
    const submit = async (ev) => {
        ev.preventDefault();
        if (preview) { setProblem('This is a preview — applications are not sent from here.'); return; }
        const e = check();
        setErrors(e);
        if (Object.keys(e).length) {
            setProblem('Please fill in the highlighted fields.');
            document.querySelector('[aria-invalid="true"]')?.focus();
            return;
        }
        setBusy(true); setProblem('');
        try {
            const r = await axios.post(`${API}/${encodeURIComponent(orgCode)}`, { ...form, phone: form.phone.replace(/[\s-]/g, ''), details });
            setSent(r.data.message);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (err) {
            const field = err.response?.data?.field;
            if (field) setErrors({ ...e, [field]: err.response.data.message });
            setProblem(err.response?.data?.message || 'Your application could not be sent. Please check your connection and try again.');
        } finally { setBusy(false); }
    };

    if (!data && !loadError) {
        return <ApplyLoading orgCode={orgCode} />;
    }
    if (loadError) {
        return (
            <div className="flex min-h-dvh flex-col bg-[#f6f4ef]">
                <div className="flex flex-1 items-center justify-center px-4">
                    <div className="max-w-md text-center">
                        <AlertCircle className="mx-auto h-10 w-10 text-stone-400" />
                        <h1 className="mt-4 text-xl font-bold text-stone-900">Admission form not available</h1>
                        <p className="mt-2 text-sm leading-relaxed text-stone-600">{loadError}</p>
                        <button type="button" onClick={goBack} className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl px-5 text-sm font-semibold text-stone-700 ring-1 ring-stone-300 hover:bg-white"><ArrowLeft size={16} aria-hidden="true" /> Back</button>
                    </div>
                </div>
                <PoweredBy />
            </div>
        );
    }

    const { organization: org, departments, open } = data;
    const contact = [[MapPin, org.address], [Phone, org.phone], [Mail, org.email]].filter(([, v]) => v);
    const year = new Date().getFullYear();

    return (
        <div className="min-h-dvh bg-[#f6f4ef] text-stone-900">
            {/* The college's own masthead. */}
            <header className="relative overflow-hidden bg-[#1c1917] text-white">
                <span aria-hidden className="absolute inset-0 opacity-[0.07] [background-image:linear-gradient(white_1px,transparent_1px),linear-gradient(90deg,white_1px,transparent_1px)] [background-size:32px_32px]" />
                <span aria-hidden className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-amber-200/10 blur-3xl" />
                <div className="relative mx-auto max-w-5xl px-4 pb-10 pt-5 sm:px-6 sm:pb-14 sm:pt-8">
                    <button type="button" onClick={preview ? undefined : goBack} tabIndex={preview ? -1 : undefined}
                        className="mb-6 inline-flex h-10 items-center gap-2 rounded-full bg-white/10 pl-3 pr-4 text-sm font-semibold text-white/85 ring-1 ring-inset ring-white/15 transition hover:bg-white/15 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-200 sm:mb-8">
                        <ArrowLeft size={16} aria-hidden="true" /> Back
                    </button>
                    <div className="flex items-center gap-4 sm:gap-5">
                        {org.logo
                            ? <img src={org.logo} alt="" className="h-16 w-16 shrink-0 rounded-2xl bg-white object-contain p-1.5 shadow-xl sm:h-20 sm:w-20" />
                            : <span aria-hidden className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white text-xl font-black text-stone-900 shadow-xl sm:h-20 sm:w-20">{initials(org.name)}</span>}
                        <div className="min-w-0">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-200/80">Admissions {year}–{String(year + 1).slice(2)}</p>
                            <h1 className="mt-1 text-2xl font-bold leading-tight tracking-tight sm:text-4xl">{org.name}</h1>
                        </div>
                    </div>
                    {contact.length > 0 && (
                        <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/65">
                            {contact.map(([Icon, v]) => <li key={v} className="flex min-w-0 items-center gap-2"><Icon size={14} className="shrink-0 text-white/40" aria-hidden="true" /><span className="truncate">{v}</span></li>)}
                        </ul>
                    )}
                </div>
            </header>

            <main className="relative mx-auto -mt-6 max-w-5xl px-3 sm:-mt-8 sm:px-6">
                <div className="rounded-3xl bg-white p-5 shadow-[0_30px_60px_-40px_rgba(28,25,23,0.5)] ring-1 ring-stone-200 sm:p-10">
                    {sent ? (
                        <div className="py-10 text-center sm:py-16">
                            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 ring-8 ring-emerald-50/60"><CheckCircle2 className="h-9 w-9 text-emerald-600" /></span>
                            <h2 className="mt-6 text-2xl font-bold tracking-tight">Application sent</h2>
                            <p className="mx-auto mt-2 max-w-md text-[15px] leading-relaxed text-stone-600">{sent} {T.done}</p>
                            <p className="mt-2 text-sm text-stone-500"><b className="text-stone-800">{form.email}</b> · <b className="text-stone-800">{form.phone}</b></p>
                            <ol className="mx-auto mt-8 grid max-w-xl gap-3 text-left text-sm sm:grid-cols-3">
                                {['The office checks your application', 'You get your YATICORPX3 AI card', 'You are admitted and can sign in'].map((t, i) => (
                                    <li key={t} className="rounded-2xl bg-stone-50 p-4 ring-1 ring-stone-200"><span className="font-mono text-xs text-stone-400">0{i + 1}</span><p className="mt-1 font-semibold text-stone-800">{t}</p></li>
                                ))}
                            </ol>
                        </div>
                    ) : !open && !preview ? (
                        <div className="py-12 text-center">
                            <GraduationCap className="mx-auto h-10 w-10 text-stone-400" />
                            <h2 className="mt-4 text-xl font-bold">Applications are closed</h2>
                            <p className="mx-auto mt-2 max-w-md text-sm text-stone-600">{T.closed}</p>
                        </div>
                    ) : (
                        <form onSubmit={submit} noValidate>
                            <div className="mb-8 flex flex-col gap-2 border-b border-stone-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
                                <div>
                                    <h2 className="text-2xl font-bold tracking-tight sm:text-[28px]">{T.heading}</h2>
                                    {T.sub && <p className="mt-1 text-sm text-stone-500">{T.sub}</p>}
                                </div>
                            </div>

                            {F.intro && (
                                <p className="mb-8 flex items-start gap-3 whitespace-pre-line rounded-2xl bg-amber-50 px-4 py-3.5 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200"><Info size={17} className="mt-0.5 shrink-0 text-amber-600" aria-hidden="true" />{F.intro}</p>
                            )}
                            <Section n={1} {...sectionOf('course', ...SECTION_WORDS.course)}>
                                <Field label={labels.course} required error={errors.departmentId} wide={!(dept?.sections?.length > 1)}>
                                    <select value={form.departmentId} onChange={(e) => { setForm({ ...form, departmentId: e.target.value, section: '' }); setErrors({ ...errors, departmentId: '' }); }} className={INPUT} aria-invalid={!!errors.departmentId}>
                                        <option value="">Choose a course</option>
                                        {departments.map((d) => <option key={d._id} value={d._id}>{d.name}{d.code ? ` (${d.code})` : ''}</option>)}
                                    </select>
                                </Field>
                                {dept?.sections?.length > 1 && (
                                    <Field label={labels.section} required error={errors.section}>
                                        <select value={form.section} onChange={set('section')} className={INPUT} aria-invalid={!!errors.section}>
                                            <option value="">Choose</option>
                                            {dept.sections.map((s) => <option key={s} value={s}>Section {s}</option>)}
                                        </select>
                                    </Field>
                                )}
                            </Section>

                            <Section n={2} {...sectionOf('about', ...SECTION_WORDS.about)}>
                                <Field label={labels.name} required error={errors.name} wide>
                                    <input value={form.name} onChange={set('name')} className={INPUT} autoComplete="name" maxLength={100} aria-invalid={!!errors.name} />
                                </Field>
                                <Field label={labels.email} required error={errors.email}>
                                    <input type="email" value={form.email} onChange={set('email')} className={INPUT} autoComplete="email" inputMode="email" aria-invalid={!!errors.email} />
                                </Field>
                                <Field label={labels.phone} required error={errors.phone}>
                                    <input type="tel" value={form.phone} onChange={set('phone')} className={INPUT} autoComplete="tel" inputMode="tel" placeholder="10-digit number" aria-invalid={!!errors.phone} />
                                </Field>
                            </Section>

                            {groups.map(([key, title, keys], i) => (
                                <Section key={key} n={i + 3} {...sectionOf(key, title)}>
                                    {keys.map((k) => (
                                        <Field key={k} label={labels[k] || k} required={REQUIRED.includes(k)} error={errors[k]} wide={k === 'address'}>
                                            {CHOICES[k] ? (
                                                <select value={details[k] || ''} onChange={setD(k)} className={INPUT} aria-invalid={!!errors[k]}>
                                                    <option value="">Choose</option>
                                                    {CHOICES[k].map((c) => <option key={c}>{c}</option>)}
                                                </select>
                                            ) : k === 'address' ? (
                                                <textarea value={details[k] || ''} onChange={setD(k)} rows={2} maxLength={300} className={`${INPUT} h-auto py-3`} aria-invalid={!!errors[k]} />
                                            ) : (
                                                <input type={k === 'dob' ? 'date' : 'text'} value={details[k] || ''} onChange={setD(k)} maxLength={300}
                                                    inputMode={NUMERIC.test(k) ? 'numeric' : undefined} className={INPUT} aria-invalid={!!errors[k]} />
                                            )}
                                        </Field>
                                    ))}
                                </Section>
                            ))}

                            {custom.length > 0 && (
                                <Section n={groups.length + 3} {...sectionOf('more', ...SECTION_WORDS.more)}>
                                    {custom.map((q) => (
                                        <Field key={q.id} label={q.label} required={q.required} error={errors[q.id]} wide={['long', 'multi'].includes(q.type)}>
                                            <Answer q={q} value={details[q.id] || ''} invalid={!!errors[q.id]} onChange={(v) => { setDetails({ ...details, [q.id]: v }); setErrors({ ...errors, [q.id]: '' }); }} />
                                        </Field>
                                    ))}
                                </Section>
                            )}

                            <div className="sticky bottom-0 -mx-5 mt-2 border-t border-stone-200 bg-white/95 px-5 py-4 backdrop-blur sm:-mx-10 sm:px-10">
                                {problem && <p role="alert" className="mb-3 flex items-start gap-2 rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-100"><AlertCircle size={16} className="mt-0.5 shrink-0" /> {problem}</p>}
                                <div className="flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <p className="text-xs leading-relaxed text-stone-500">{T.note}</p>
                                    <button type="submit" disabled={busy}
                                        className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-stone-900 px-7 text-[15px] font-bold text-white shadow-lg shadow-stone-900/20 transition hover:bg-stone-800 focus:outline-none focus-visible:ring-4 focus-visible:ring-stone-900/20 active:scale-[0.99] disabled:opacity-60">
                                        {busy ? <Loader2 size={17} className="animate-spin" /> : <Send size={16} />} {busy ? 'Sending…' : T.submit} {!busy && <ArrowRight size={16} className="opacity-60" />}
                                    </button>
                                </div>
                            </div>
                        </form>
                    )}
                </div>
            </main>
            <PoweredBy />
        </div>
    );
}
