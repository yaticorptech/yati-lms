/**
 * The Certificate Builder (asked 2026-10-31): one page for both dashboards — the platform admin's Games &
 * Competitions (Yaticorp's branding by default) and an organization's Competition management (its own branding if it
 * wants, none forced). Pick the competition, a template from the gallery, the wording, the signatories and the
 * branding; the preview on the right changes as you type. Nobody's name is typed (2026-10-31, "when the competition
 * is over, whoever won — their name and place — and the student sees it"): Save, and once the results are out the
 * 1st, 2nd and 3rd place players — and everyone else who took part, if chosen — get their certificates by themselves,
 * each with its own ID and QR code, in their own app. Their PDFs download here or from Issued certificates.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Award, BadgeCheck, Building2, Download, FileStack, ImagePlus, Loader2, Plus, Sparkles, Trash2, User, Users, X } from 'lucide-react';
import api from '../utils/api';
import { CARD, BTN, BTN2 } from '../components/orgUi';
import { errorOf } from '../competitions/constants';
import CertificateCanvas from './CertificateCanvas';
import Dropdown from './Dropdown';
import { CT, imagesOf, inputOf } from './design';
import { SIDES, downloadPdf, readPicture } from './shared';

const INPUT = 'w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100';
const TYPES = [['chess', 'Chess'], ['rapidfire', 'Rapid Fire'], ['codeclash', 'Code Clash'], ['brainsprint', 'Brain Sprint'], ['arena', 'Quiz Arena']].map(([id, name]) => ({ kind: 'game', id, name }));

/** Digits typed as a date, DD/MM/YYYY: the slashes go in by themselves (2026-10-31). */
const asDate = (v) => {
    const d = String(v).replace(/\D/g, '').slice(0, 8);
    return [d.slice(0, 2), d.slice(2, 4), d.slice(4)].filter(Boolean).join('/');
};
const LABEL = 'mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500';

function Section({ icon: Icon, title, hint, children, aside }) {
    return (
        <section className={`${CARD} p-4 sm:p-5`}>
            <div className="mb-3 flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600"><Icon size={17} /></span>
                    <div><h2 className="text-sm font-black text-slate-900">{title}</h2>{hint && <p className="text-xs text-slate-500">{hint}</p>}</div>
                </div>
                {aside}
            </div>
            {children}
        </section>
    );
}

/** A picture to upload (optional), shown small once chosen, with Remove. */
function PictureField({ label, value, onChange, onError, hint }) {
    const input = useRef(null);
    return (
        <div>
            <span className={LABEL}>{label}</span>
            <div className="flex items-center gap-2">
                <button type="button" onClick={() => input.current?.click()} className="flex h-14 min-w-0 flex-1 items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-2 text-xs font-bold text-slate-500 hover:border-indigo-300 hover:bg-indigo-50/50">
                    {value ? <img src={value} alt="" className="max-h-11 max-w-full object-contain" /> : <><ImagePlus size={16} /> Upload</>}
                </button>
                {value && <button type="button" onClick={() => onChange('')} aria-label={`Remove ${label}`} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"><X size={16} /></button>}
            </div>
            {hint && <p className="mt-1 text-[11px] text-slate-400">{hint}</p>}
            <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; readPicture(f, 600, null, true).then(onChange).catch((err) => onError(err.message)); }} />
        </div>
    );
}

export default function CertificateBuilder({ side = 'platform' }) {
    const S = SIDES[side];
    const [defaults, setDefaults] = useState(null);
    // The competition types (Chess, Rapid Fire, Code Clash, Brain Sprint, Quiz Arena): known here, so the dropdown is
    // filled even while the server is out of reach; the server's list replaces it when it answers.
    const [competitions, setCompetitions] = useState(TYPES);
    const [pick, setPick] = useState('');                 // 'competition:<id>' | 'arena:<id>'
    const fresh = (brand) => ({
        template: 'custom', competition: { kind: 'none', id: null, name: '' }, description: '', date: '', venue: '', participation: true, places: [1, 2, 3],
        signatories: [{ name: '', designation: '', signature: '' }],
        branding: { yaticorp: brand ? brand.yaticorp : side === 'platform', name: brand?.brandName || '', tagline: brand?.tagline || '', org: brand?.org || '', logo: '', seal: '' }
    });
    const [design, setDesign] = useState(() => fresh(null));
    const [status, setStatus] = useState(null);           // the competition's: { resultsOut, winners, participants, issued, design }
    const [loading, setLoading] = useState(false);
    const [picked, setSample] = useState('first');        // which award the preview shows
    const [error, setError] = useState('');
    const [busy, setBusy] = useState('');
    const [saved, setSaved] = useState(null);             // { issued, issuedNow, resultsOut } after Save
    const templateFile = useRef(null);

    const set = (patch) => { setDesign((d) => ({ ...d, ...patch })); setSaved(null); };
    const setBrand = (patch) => { setDesign((d) => ({ ...d, branding: { ...d.branding, ...patch } })); setSaved(null); };

    useEffect(() => {
        api.get(`${S.apiBase}/defaults`).then((r) => {
            setError(''); setDefaults(r.data); setDesign((d) => ({ ...d, branding: { ...d.branding, yaticorp: r.data.yaticorp, name: r.data.brandName || '', tagline: r.data.tagline || '', org: r.data.org || '' } })); })
            .catch((err) => setError(err.response ? errorOf(err) : 'Can’t reach the server right now. Refresh the page in a moment.'));
        api.get(`${S.apiBase}/competitions`).then((r) => { if (r.data.competitions?.length) setCompetitions(r.data.competitions); }).catch(() => {});
    }, [S.apiBase]);

    // A competition picked: its saved certificate if it has one (to change), else a new one with its name and date;
    // and where it stands — results out, who placed, how many certificates are out.
    const choose = (value) => {
        setPick(value); setStatus(null); setSaved(null); setError('');
        const [kind, id] = value.split(':');
        const c = (competitions || []).find((x) => x.kind === kind && x.id === id);
        if (!c) { setDesign((d) => ({ ...d, competition: { kind: 'none', id: null, name: d.competition.name } })); return; }
        setLoading(true);
        api.get(`${S.apiBase}/designs/for/${kind}/${id}`).then((r) => {
            setStatus(r.data);
            const d = r.data.design;
            setDesign(d
                ? { template: d.template, competition: { kind, id, name: d.competition.name }, description: d.description, date: d.date, venue: d.venue, participation: d.participation !== false, places: Array.isArray(d.places) ? d.places : [1, 2, 3],
                    signatories: d.signatories.length ? d.signatories : [{ name: '', designation: '', signature: '' }], branding: d.branding }
                : { ...design, competition: { kind, id, name: design.competition.name }, date: design.date || c.date || '' });
        }).catch((err) => setError(errorOf(err))).finally(() => setLoading(false));
    };

    // Shown only if it is ticked; otherwise the first one that is.
    const on = (k) => (k === 'participation' ? design.participation : design.places.includes({ first: 1, second: 2, third: 3 }[k]));
    const sample = on(picked) ? picked : ['first', 'second', 'third', 'participation'].find(on) || picked;
    // The preview: the real 1st-place winner once the results are out, otherwise a stand-in name.
    const winner = status?.winners?.find((w) => w.place === { first: 1, second: 2, third: 3 }[sample]);
    const shownName = winner?.name || (sample === 'participation' ? 'Participant\'s Name' : 'Winner\'s Name');
    const shownCollege = winner?.institution || 'College name';
    const input = useMemo(() => inputOf({ ...design, venue: '' }, { name: shownName, institution: shownCollege, award: { kind: sample, title: '' } }), [design, shownName, shownCollege, sample]);
    const images = useMemo(() => imagesOf(design.template, design.branding, design.signatories), [design.template, design.branding, design.signatories]);

    // The platform's own templates, kept on the server (GET/POST/DELETE own-templates).
    const [own, setOwn] = useState(null);
    useEffect(() => {
        api.get(`${S.apiBase}/own-templates`).then((r) => setOwn(r.data.templates || [])).catch(() => setOwn([]));
    }, [S.apiBase]);
    const pickOwn = (t) => set({ template: 'custom', branding: { ...design.branding, background: t.image } });
    const addTemplate = (file) => {
        if (!file) return;
        setBusy('template'); setError('');
        readPicture(file, 1800, 'jpeg')
            .then((image) => api.post(`${S.apiBase}/own-templates`, { image, name: file.name.replace(/\.[^.]+$/, '').slice(0, 80) }))
            .then((r) => { setOwn((list) => [...(list || []), r.data.template]); pickOwn(r.data.template); })
            .catch((err) => setError(err.response ? errorOf(err) : err.message || 'Could not add the template.'))
            .finally(() => setBusy(''));
    };
    const removeTemplate = (t) => {
        if (!window.confirm(`Delete the template "${t.name}"?`)) return;
        api.delete(`${S.apiBase}/own-templates/${t.id}`).then(() => {
            const rest = (own || []).filter((x) => x.id !== t.id);
            setOwn(rest);
            if (design.branding.background === t.image) {
                if (rest[0]) pickOwn(rest[0]); else set({ branding: { ...design.branding, background: '' } });
            }
        }).catch((err) => setError(errorOf(err)));
    };

    const save = () => {
        setError(''); setSaved(null);
        if (!design.competition.id) { setError('Select the competition.'); return; }
        if (!design.branding.background) { setError('Add a template and choose it first.'); return; }
        if (!design.places.length && !design.participation) { setError('Tick at least one: 1st, 2nd, 3rd or Participation.'); return; }
        setBusy('save');
        api.put(`${S.apiBase}/designs/for/${design.competition.kind}/${design.competition.id}`, { ...design, venue: '', competitionName: design.competition.name })
            .then((r) => { setSaved(r.data); setStatus((st) => ({ ...st, design: r.data.design, issued: r.data.issued })); })
            .catch((err) => setError(errorOf(err)))
            .finally(() => setBusy(''));
    };
    const designId = saved?.design?.id || status?.design?.id || status?.design?._id;
    const issuedCount = saved?.issued ?? status?.issued ?? 0;

    const setSignatory = (i, patch) => set({ signatories: design.signatories.map((s, j) => (j === i ? { ...s, ...patch } : s)) });
    const ORD = { 1: '1st', 2: '2nd', 3: '3rd' };

    return (
        <div className="space-y-5 pb-16" data-certificate-builder={side}>
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <Link to={S.back} className="mb-1 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-indigo-700"><ArrowLeft size={16} /> Back</Link>
                    <h1 className="flex items-center gap-2 text-2xl font-black text-slate-900 sm:text-3xl"><Award className="text-indigo-600" /> Certificate Builder</h1>
                </div>
                <Link to={`${S.base}/issued`} className={BTN2}><FileStack size={16} /> Issued certificates</Link>
            </div>

            {error && <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</p>}

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
                {/* ---- The details ---- */}
                <div className="space-y-4">
                    <Section icon={Award} title="Competition">
                        <div className="grid gap-3 sm:grid-cols-2">
                            <label className="sm:col-span-2"><span className={LABEL}>Competition</span>
                                <Dropdown value={pick} onChange={(v) => choose(v)} options={(competitions || []).map((c) => [`${c.kind}:${c.id}`, c.name])} placeholder={competitions === null ? 'Loading…' : competitions.length ? '— Select competition —' : 'No competitions yet'} className={INPUT} data-cert-competition />
                            </label>
                            <label className="sm:col-span-2"><span className={LABEL}>Competition name</span>
                                <input value={design.competition.name} onChange={(e) => set({ competition: { ...design.competition, name: e.target.value } })} maxLength={160} placeholder="Inter College Competition" className={INPUT} data-cert-competition-name /></label>
                            <label className="sm:col-span-2"><span className={LABEL}>Event date</span><input value={design.date} onChange={(e) => set({ date: asDate(e.target.value) })} inputMode="numeric" maxLength={10} placeholder="DD/MM/YYYY" className={INPUT} data-cert-date /></label>
                        </div>
                    </Section>

                    <Section icon={Users} title="Who gets it">
                        <div className="space-y-3">
                            {/* Each place, and participation, can be switched on or off (2026-10-31). */}
                            <div className="grid gap-2 sm:grid-cols-3" role="group" aria-label="Places that get a certificate">
                                {[[1, '1st place'], [2, '2nd place'], [3, '3rd place']].map(([n, l]) => (
                                    <label key={n} className={`flex cursor-pointer items-center gap-2.5 rounded-xl p-3 text-sm font-bold ring-1 transition ${design.places.includes(n) ? 'bg-amber-50 text-amber-900 ring-amber-300' : 'bg-slate-50 text-slate-500 ring-slate-200'}`}>
                                        <input type="checkbox" checked={design.places.includes(n)} data-cert-place={n} className="h-4 w-4 accent-amber-600"
                                            onChange={(e) => set({ places: e.target.checked ? [...design.places, n].sort() : design.places.filter((x) => x !== n) })} />
                                        <Award size={15} /> {l}
                                    </label>
                                ))}
                            </div>
                            <label className={`flex cursor-pointer items-start gap-2.5 rounded-xl p-3 text-sm ring-1 transition ${design.participation ? 'bg-indigo-50/60 text-slate-800 ring-indigo-200' : 'bg-slate-50 text-slate-500 ring-slate-200'}`}>
                                <input type="checkbox" checked={design.participation} onChange={(e) => set({ participation: e.target.checked })} className="mt-0.5 h-4 w-4 accent-indigo-600" data-cert-participation />
                                <span><span className="font-bold">Participation</span></span>
                            </label>
                            {!design.competition.id ? (
                                null
                            ) : loading || !status ? (
                                <p className="flex items-center gap-2 py-2 text-sm text-slate-500"><Loader2 size={16} className="animate-spin" /> Checking its results…</p>
                            ) : (
                                null
                            )}
                        </div>
                    </Section>

                    <Section icon={BadgeCheck} title="Description">
                        <textarea value={design.description} onChange={(e) => set({ description: e.target.value })} maxLength={600} rows={3} className={INPUT} data-cert-description
                            placeholder="This certificate is awarded in recognition of {name}'s outstanding performance in {competition}." />
                    </Section>

                    <Section icon={User} title="Signatories"
                        aside={design.signatories.length < 3 && <button type="button" onClick={() => set({ signatories: [...design.signatories, { name: '', designation: '', signature: '' }] })} className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800"><Plus size={14} /> Add</button>}>
                        <div className="space-y-3">
                            {design.signatories.map((s, i) => (
                                <div key={i} className="grid gap-2 rounded-xl bg-slate-50 p-3 sm:grid-cols-[1fr_1fr_9rem_auto] sm:items-end">
                                    <label><span className={LABEL}>Name</span><input value={s.name} onChange={(e) => setSignatory(i, { name: e.target.value })} maxLength={80} placeholder="Yatheesha K S" className={INPUT} /></label>
                                    <label><span className={LABEL}>Designation</span><input value={s.designation} onChange={(e) => setSignatory(i, { designation: e.target.value })} maxLength={80} placeholder="Founder" className={INPUT} /></label>
                                    <PictureField label="Signature (optional)" value={s.signature} onChange={(v) => setSignatory(i, { signature: v })} onError={setError} />
                                    <button type="button" onClick={() => set({ signatories: design.signatories.filter((_, j) => j !== i) })} aria-label="Remove signatory" className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={16} /></button>
                                </div>
                            ))}
                        </div>
                    </Section>

                    <Section icon={Building2} title="Branding">
                        <label className="mb-3 flex items-center gap-2.5 text-sm font-semibold text-slate-700">
                            <input type="checkbox" checked={design.branding.yaticorp} onChange={(e) => setBrand({ yaticorp: e.target.checked })} className="h-4 w-4 accent-indigo-600" data-cert-yaticorp />
                            Use the Yaticorp logo{design.branding.logo ? ' (your uploaded logo is used instead)' : ''}
                        </label>
                        <div className="grid gap-3 sm:grid-cols-2">
                            <label><span className={LABEL}>Event title (top left)</span><input value={design.branding.name} onChange={(e) => setBrand({ name: e.target.value })} maxLength={80} placeholder={defaults?.brandName || 'Inter College Competition'} className={INPUT} /></label>
                            <label><span className={LABEL}>Tagline (optional)</span><input value={design.branding.tagline} onChange={(e) => setBrand({ tagline: e.target.value })} maxLength={80} placeholder="Learn · Compete · Grow" className={INPUT} /></label>
                            <label className="sm:col-span-2"><span className={LABEL}>College / institute name</span><input value={design.branding.org || ''} onChange={(e) => setBrand({ org: e.target.value })} maxLength={100} placeholder="RV College of Engineering" className={INPUT} data-cert-org /></label>
                            <PictureField label="Logo (optional)" value={design.branding.logo} onChange={(v) => setBrand({ logo: v })} onError={setError} />
                            <PictureField label="Official seal (optional)" value={design.branding.seal} onChange={(v) => setBrand({ seal: v })} onError={setError} />
                        </div>
                    </Section>
                    {/* The platform's own templates (2026-10-31): Add to upload one (kept on the server), the bin to delete it. */}
                    <Section icon={Sparkles} title="Choose the template"
                        aside={<button type="button" onClick={() => templateFile.current?.click()} disabled={busy === 'template'} className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 disabled:opacity-50" data-cert-add-template>{busy === 'template' ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Add</button>}>
                        {own === null ? (
                            <p className="flex items-center gap-2 py-4 text-sm text-slate-500"><Loader2 size={16} className="animate-spin" /> Loading…</p>
                        ) : !own.length ? (
                            <button type="button" onClick={() => templateFile.current?.click()} className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-sm font-bold text-slate-500 hover:border-indigo-300 hover:text-indigo-700" data-cert-no-templates>
                                <ImagePlus size={22} /> Add your first template
                            </button>
                        ) : (
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Template">
                                {own.map((t) => {
                                    const on = design.template === 'custom' && design.branding.background === t.image;
                                    return (
                                        <div key={t.id} className={`relative overflow-hidden rounded-xl border-2 transition ${on ? 'border-indigo-500 ring-2 ring-indigo-200' : 'border-slate-200 hover:border-indigo-300'}`}>
                                            <button type="button" role="radio" aria-checked={on} onClick={() => pickOwn(t)} className="block w-full text-left" data-cert-template={t.id}>
                                                <CertificateCanvas template="custom" input={input} images={{ ...imagesOf('custom', design.branding, design.signatories), background: t.image }} className="block w-full bg-white" />
                                                <span className="block truncate px-2 py-1.5 pr-9 text-xs font-bold text-slate-700">{t.name}</span>
                                            </button>
                                            <button type="button" onClick={() => removeTemplate(t)} aria-label={`Delete ${t.name}`} title="Delete template"
                                                className="absolute bottom-1.5 right-1.5 flex h-7 w-7 items-center justify-center rounded-lg bg-white text-slate-400 shadow-sm ring-1 ring-slate-200 hover:bg-rose-50 hover:text-rose-600" data-cert-delete-template={t.id}><Trash2 size={14} /></button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                        <input ref={templateFile} type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
                            onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; addTemplate(f); }} />
                    </Section>
                    {/* The last step: issue them (2026-10-31, "at the end, select the template, and an Issue button"). */}
                    <button type="button" onClick={save} disabled={!!busy || !design.competition.id} className={`${BTN} w-full py-3 text-base`} data-cert-issue-bottom>
                        {busy === 'save' ? <Loader2 size={18} className="animate-spin" /> : <BadgeCheck size={18} />} Issue certificates
                    </button>
                </div>

                {/* ---- The live preview, and the buttons ---- */}
                <div className="xl:sticky xl:top-4 xl:self-start">
                    <section className={`${CARD} overflow-hidden`}>
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
                            <p className="flex items-center gap-2 text-sm font-black text-slate-900"><span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" /> Live preview</p>
                            <div className="flex flex-wrap gap-1" role="radiogroup" aria-label="Preview the certificate for">
                                {[['first', '1st'], ['second', '2nd'], ['third', '3rd'], ['participation', 'Participation']].filter(([k]) => (k === 'participation' ? design.participation : design.places.includes({ first: 1, second: 2, third: 3 }[k]))).map(([k, l]) => (
                                    <button key={k} type="button" role="radio" aria-checked={sample === k} onClick={() => setSample(k)} data-cert-sample={k}
                                        className={`rounded-full px-2.5 py-1 text-xs font-bold ${sample === k ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{l}</button>
                                ))}
                            </div>
                        </div>
                        <div className="bg-slate-100 p-3 sm:p-5">
                            <CertificateCanvas template={design.template} input={input} images={images} className="block w-full rounded-md bg-white shadow-xl" />
                        </div>
                        <div className="space-y-3 p-4">
                            <button type="button" onClick={save} disabled={!!busy || !design.competition.id} className={`${BTN} w-full`} data-cert-issue>
                                {busy === 'save' ? <Loader2 size={16} className="animate-spin" /> : <BadgeCheck size={16} />} Issue certificates
                            </button>
                            {saved && (
                                <p className="rounded-xl bg-emerald-50 px-3 py-2.5 text-sm font-semibold text-emerald-800" role="status" data-cert-saved>
                                    {saved.resultsOut
                                        ? `Issued. ${saved.issuedNow ? `${saved.issuedNow} new certificate${saved.issuedNow === 1 ? '' : 's'} — ` : ''}${saved.issued} in all, in the students’ app now.`
                                        : 'Saved. Certificates go out as each competition’s results are published.'}
                                </p>
                            )}
                            {issuedCount > 0 && designId && (
                                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm">
                                    <span className="font-semibold text-slate-700">{issuedCount} certificate{issuedCount === 1 ? '' : 's'} issued</span>
                                    <span className="flex gap-3">
                                        <button type="button" onClick={() => downloadPdf(`${S.apiBase}/designs/${designId}/pdf`, `Certificates_${design.competition.name}.pdf`).catch((e) => setError(e.message))} className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:underline" data-cert-download><Download size={14} /> Download PDF</button>
                                        <Link to={`${S.base}/issued`} className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:underline"><FileStack size={14} /> See them</Link>
                                    </span>
                                </div>
                            )}
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}
