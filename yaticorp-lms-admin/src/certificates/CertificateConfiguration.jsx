/**
 * Certificate Configuration (organisations only, 2026-10-31): a college sets up the certificates of its intra- or
 * inter-college competitions once — the organising college, its logo and department, the competition, which places
 * get one (1st, 2nd, 3rd, participation), the signatories and the template. Nobody's name is typed: when a
 * competition of that kind is over and its results are published, each winner (and participant, if ticked) gets
 * theirs with their own name and place, in their own dashboard (certificates/auto.js). The preview shows a stand-in.
 * Since 2026-11-07 the platform admin's Certificate Builder is this same page (side="platform"): its own saved
 * certificates, templates and defaults, the organising name starting as Yaticorp's.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Upload, RotateCcw, ArrowLeft, Award, BadgeCheck, Building2, Download, FileStack, ImagePlus, Loader2, Plus, School, Sparkles, Trash2, User, Users, X } from 'lucide-react';
import api from '../utils/api';
import { CARD, BTN, BTN2 } from '../components/orgUi';
import { errorOf } from '../competitions/constants';
import CertificateCanvas from './CertificateCanvas';
import CertificateEditor from './CertificateEditor';
import Dropdown from './Dropdown';
import { CT, imagesOf, inputOf } from './design';
import { SIDES, downloadPdf, readPicture } from './shared';
import { loadDraft, saveDraft, clearDraft } from './draft';

const INPUT = 'w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100';
const LABEL = 'mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500';
const SAMPLES = [['first', '1st'], ['second', '2nd'], ['third', '3rd'], ['participation', 'Participation']];
const PLACE = { first: 1, second: 2, third: 3 };

function Section({ icon: Icon, title, children, aside }) {
    return (
        <section className={`${CARD} p-4 sm:p-5`}>
            <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600"><Icon size={17} /></span>
                    <h2 className="text-sm font-black text-slate-900">{title}</h2>
                </div>
                {aside}
            </div>
            {children}
        </section>
    );
}

/** A picture to upload (optional), shown small once chosen, with Remove. */
function PictureField({ label, value, onChange, onError }) {
    const input = useRef(null);
    return (
        <div>
            <span className={LABEL}>{label}</span>
            <div className="flex items-center gap-2">
                <button type="button" onClick={() => input.current?.click()} className="flex h-12 min-w-0 flex-1 items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-2 text-xs font-bold text-slate-500 hover:border-indigo-300 hover:bg-indigo-50/50">
                    {value ? <img src={value} alt="" className="max-h-9 max-w-full object-contain" /> : <><ImagePlus size={16} /> Upload</>}
                </button>
                {value && <button type="button" onClick={() => onChange('')} aria-label={`Remove ${label}`} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"><X size={16} /></button>}
            </div>
            <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; readPicture(f, 600, null, true).then(onChange).catch((err) => onError(err.message)); }} />
        </div>
    );
}

const fresh = (college = '') => ({
    template: 'custom', competition: { kind: 'game', id: '', name: '' }, description: '', date: '', participation: true, places: [1, 2, 3],
    details: { type: 'intra', college, department: '', address: '', affiliation: '', tagline: '', title: '', intro: '' },
    signatories: [{ name: '', designation: '', signature: '' }, { name: '', designation: '', signature: '' }],
    branding: { yaticorp: false, name: 'Intra College Competition', tagline: '', org: college, logo: '', seal: '', background: '' },
    // The Smart Certificate Builder: each element's edits, and the QR code on or off.
    elements: {}, showQr: false
});

export default function CertificateConfiguration({ side = 'organization' }) {
    const S = SIDES[side];
    const platform = side === 'platform';
    const DRAFT = platform ? 'certificate-builder-platform' : 'certificate-configuration';
    const whose = platform ? 'your' : 'your organisation';
    const [design, setDesign] = useState(() => fresh());
    const [status, setStatus] = useState(null);           // the saved certificate's: { issued }
    // The saved certificate being changed (Certificate 1, 2, …); null: a new one, numbered when it is saved.
    const [designId, setDesignId] = useState(null);
    const [picked, setSample] = useState('first');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState('');
    const [saved, setSaved] = useState(null);             // { issued, issuedNow } after Issue
    useEffect(() => { if (!saved) return undefined; const t = setTimeout(() => setSaved(null), 2500); return () => clearTimeout(t); }, [saved]);
    const templateFile = useRef(null);

    /*
     * Undo / redo (2026-10-31): every change keeps the design before it. A drag or a toolbar edit is one step.
     */
    const latest = useRef(design);
    useEffect(() => { latest.current = design; }, [design]);
    const [hist, setHist] = useState({ past: [], future: [] });
    const remember = () => { const now = latest.current; setHist((h) => ({ past: [...h.past.slice(-99), now], future: [] })); };
    const undo = () => {
        if (!hist.past.length) return;
        const prev = hist.past[hist.past.length - 1];
        setHist((h) => ({ past: h.past.slice(0, -1), future: [latest.current, ...h.future] }));
        setDesign(prev); setSaved(null);
    };
    const redo = () => {
        if (!hist.future.length) return;
        const next = hist.future[0];
        setHist((h) => ({ past: [...h.past, latest.current], future: h.future.slice(1) }));
        setDesign(next); setSaved(null);
    };
    const [selected, setSelected] = useState(null);

    const set = (patch) => { remember(); setDesign((d) => ({ ...d, ...patch })); setSaved(null); };
    const setDetails = (patch) => { remember(); setDesign((d) => {
        const details = { ...d.details, ...patch };
        // The organising college is also the name by the logo and in "Digitally signed by"; the event title follows the type.
        return { ...d, details, branding: { ...d.branding, org: details.college, name: details.type === 'inter' ? 'Inter College Competition' : 'Intra College Competition' } };
    }); };
    const setBrand = (patch) => { remember(); setDesign((d) => ({ ...d, branding: { ...d.branding, ...patch } })); setSaved(null); };
    const setSign = (i, patch) => set({ signatories: design.signatories.map((s, j) => (j === i ? { ...s, ...patch } : s)) });

    // The organising college: the organisation's own name to start with.
    useEffect(() => {
        api.get(`${S.apiBase}/defaults`).then((r) => setDesign((d) => (d.details.college ? d : { ...d, details: { ...d.details, college: r.data.org || '' }, branding: { ...d.branding, org: r.data.org || '' } }))).catch(() => {});
    }, [S.apiBase]);

    /*
     * The organisation's defaults (2026-10-31): what it saved once — logo, seal, signatures, the college's lines, the
     * template and the layout — loaded into the form; only the competition's own details are left to fill in.
     */
    const [defaultsNote, setDefaultsNote] = useState('');
    const [savingDefaults, setSavingDefaults] = useState(false);
    // On opening: the form as it was left in this browser (its draft); else the organisation's defaults.
    const [ready, setReady] = useState(false);
    const applyDefaults = () => api.get(`${S.apiBase}/org-defaults`).then((r) => {
        const df = r.data.defaults;
        if (!df) return;
        setDesign((d) => ({
            ...d,
            template: df.template || d.template,
            details: { ...d.details, ...df.details },
            description: df.description ?? d.description,
            signatories: df.signatories?.length ? df.signatories : d.signatories,
            branding: { ...d.branding, ...df.branding },
            elements: df.elements || {}, showQr: Boolean(df.showQr),
            participation: df.participation !== false, places: Array.isArray(df.places) ? df.places : d.places
        }));
    }).catch(() => {});
    useEffect(() => {
        let alive = true;
        loadDraft(DRAFT).then((draft) => {
            if (!alive) return null;
            if (draft?.design) { setDesign({ ...fresh(), ...draft.design }); if (draft.sample) setSample(draft.sample); setDesignId(draft.designId || null); return null; }
            return applyDefaults();
        }).finally(() => { if (alive) setReady(true); });
        return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [S.apiBase]);
    // Opened from a saved certificate's Edit (?design=<id>): that one loaded to change; Create certificate (?new=1): a new one.
    const [params, setParams] = useSearchParams();
    useEffect(() => {
        if (!ready) return;
        const id = params.get('design');
        if (params.get('new')) {
            setParams({}, { replace: true });
            setHist({ past: [], future: [] }); setSelected(null); setSaved(null); setStatus(null); setDesignId(null);
            setDesign(fresh(design.details.college)); applyDefaults();
            return;
        }
        if (!id) return;
        setParams({}, { replace: true });
        api.get(`${S.apiBase}/designs/${id}`).then((r) => {
            const d = r.data.design;
            setDesignId(d.id); setStatus(null); setSaved(null); setHist({ past: [], future: [] }); setSelected(null);
            setDesign({
                template: d.template, competition: { kind: 'template', id: '', name: '' }, description: d.description || '', date: '',
                participation: d.participation !== false, places: Array.isArray(d.places) ? d.places : [1, 2, 3],
                details: d.details?.type ? d.details : { type: 'intra', college: d.branding?.org || '', department: '' },
                signatories: d.signatories?.length ? d.signatories : [{ name: '', designation: '', signature: '' }],
                branding: { ...fresh().branding, ...d.branding },
                elements: d.elements || {}, showQr: Boolean(d.showQr)
            });
        }).catch((err) => setError(errorOf(err)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ready, params]);
    // Every change kept in this browser, half a second after it is made: a refresh brings it all back.
    useEffect(() => {
        if (!ready) return undefined;
        const t = setTimeout(() => saveDraft(DRAFT, { design, designId, sample: picked, savedAt: Date.now() }), 500);
        return () => clearTimeout(t);
    }, [design, designId, picked, ready, DRAFT]);
    const startOver = () => {
        if (!window.confirm(`Clear this certificate and start over? ${platform ? 'Your' : 'Your organisation'} defaults are loaded again.`)) return;
        clearDraft(DRAFT);
        setHist({ past: [], future: [] }); setSelected(null); setSaved(null); setStatus(null); setDesignId(null);
        setDesign(fresh(design.details.college));
        applyDefaults();
    };
    const saveDefaults = () => {
        setSavingDefaults(true); setDefaultsNote(''); setError('');
        api.put(`${S.apiBase}/org-defaults`, design)
            .then(() => setDefaultsNote(`Saved as ${whose}${platform ? '' : '’s'} default: it opens like this next time.`))
            .catch((err) => setError(err.response ? errorOf(err) : 'Can’t reach the server right now. Try again in a moment.'))
            .finally(() => setSavingDefaults(false));
    };

    // Text typed on the certificate itself: into the field it comes from, or (fixed words) into the element.
    const SIGTEXT = /^sig(name|des)(\d)$/;
    const textOf = (key) => {
        const m = SIGTEXT.exec(key || '');
        if (m) { const sg = design.signatories[Number(m[2])]; return sg ? (m[1] === 'name' ? sg.name : sg.designation) : undefined; }
        const map = {
            college: design.details.college, address: design.details.address || '', affil: design.details.affiliation || '',
            title: [design.details.title, design.details.tagline].filter(Boolean).join(' '), tagline: [design.details.title, design.details.tagline].filter(Boolean).join(' '), intro: design.details.intro || undefined,   // the standard line until it is typed over on the certificate
            comp: design.elements?.comp?.text ?? '{competition}', desc: design.description
        };
        if (key in map) return map[key];
        // What changes with each certificate (2026-11-07: every text editable) — written with its fill-in words, so it
        // can be reworded and each student still gets their own name, place and college.
        const own = design.elements?.[key]?.text;
        if (own !== undefined) return own;
        const part = sample === 'participation';
        const by = [design.details.department && `organised by the ${design.details.department}`, 'at {college}'].filter(Boolean).join(' ');
        const standard = {
            name: '{name}', award: '{place}', inst: '{institution}', place: '{rank}',
            sentence: `${part ? 'has actively participated in the' : 'has secured {place} in the'} {competition}, ${by}, held on {date}. ${design.description || (part
                ? 'This certificate is presented in appreciation of the enthusiasm, effort and sportsmanship shown. We wish you continued success in all your future endeavours.'
                : 'This certificate is awarded in recognition of outstanding performance, dedication and excellence. We wish you continued success in all your future endeavours.')}`
        };
        return standard[key];
    };
    const onText = (key, v) => {
        const m = SIGTEXT.exec(key);
        if (m) { setSign(Number(m[2]), m[1] === 'name' ? { name: v } : { designation: v }); return; }
        if (key === 'college') return setDetails({ college: v });
        if (key === 'address') return setDetails({ address: v });
        if (key === 'affil') return setDetails({ affiliation: v });
        if (key === 'title' || key === 'tagline') return setDetails({ title: v, tagline: '' });
        if (key === 'intro') return setDetails({ intro: v });
        if (key === 'desc') return set({ description: v });
        remember();
        setDesign((d) => ({ ...d, elements: { ...(d.elements || {}), [key]: { ...(d.elements || {})[key], text: v } } }));
    };
    // Every text can be typed over (2026-11-07); nothing is read-only.
    const readOnly = () => null;


    // Shown only if it is ticked; otherwise the first one that is.
    const on = (k) => (k === 'participation' ? design.participation : design.places.includes(PLACE[k]));
    const sample = on(picked) ? picked : SAMPLES.map(([k]) => k).find(on) || picked;
    const input = useMemo(() => ({ ...inputOf({ ...design, venue: '', date: 'DD/MM/YYYY', competition: { ...design.competition, name: 'Competition Name' } }, {
        name: sample === 'participation' ? 'Participant’s Name' : 'Winner’s Name',
        institution: design.details.type === 'inter' ? 'Participating College' : '', course: '', award: { kind: sample, title: '' }
    }), noQr: !design.showQr, plain: true }), [design, sample]);
    const images = useMemo(() => imagesOf(design.template, design.branding, design.signatories), [design.template, design.branding, design.signatories]);

    const issue = () => {
        setError(''); setSaved(null);
        if (!design.details.college.trim()) { setError('Enter the organising college name.'); return; }
        if (!design.places.length && !design.participation) { setError('Tick at least one: 1st, 2nd, 3rd or Participation.'); return; }
        setBusy('issue');
        const body = { ...design, venue: '', date: '', competitionName: '' };
        (designId ? api.put(`${S.apiBase}/designs/${designId}`, body) : api.post(`${S.apiBase}/designs`, body))
            .then((r) => { setDesignId(r.data.design.id); setSaved(r.data); setStatus({ issued: r.data.issued }); })
            .catch((err) => setError(err.response ? errorOf(err) : 'Can’t reach the server right now. Try again in a moment.'))
            .finally(() => setBusy(''));
    };
    /** The preview as it stands, as a PDF (POST preview-pdf): nothing is saved. */
    const downloadPreview = () => {
        setBusy('download'); setError('');
        // With the same stand-ins as the preview on the page, so the PDF matches it.
        api.post(`${S.apiBase}/preview-pdf`, { ...design, competition: { ...design.competition, name: 'Competition Name' }, date: 'DD/MM/YYYY', sample, sampleName: sample === 'participation' ? 'Participant’s Name' : 'Winner’s Name' }, { responseType: 'blob' })
            .then((r) => {
                const href = URL.createObjectURL(r.data);
                const a = Object.assign(document.createElement('a'), { href, download: `Certificate_${(design.competition.name || 'preview').replace(/[^\w.-]+/g, '_')}.pdf` });
                document.body.appendChild(a); a.click(); a.remove();
                setTimeout(() => URL.revokeObjectURL(href), 10000);
            })
            .catch(async (err) => {
                const blob = err.response?.data;
                let msg = 'Could not make the PDF.';
                if (blob instanceof Blob) { try { msg = JSON.parse(await blob.text()).message || msg; } catch { /* not JSON */ } }
                else if (!err.response) msg = 'Can’t reach the server right now. Try again in a moment.';
                setError(msg);
            })
            .finally(() => setBusy(''));
    };
    const issuedCount = saved?.issued ?? status?.issued ?? 0;
    /*
     * The organisation's own templates (2026-10-31): only what it uploaded — Add uploads one and keeps it on the server
     * (GET/POST/DELETE own-templates); a bin on each deletes it. Choosing one puts its picture under the words.
     */
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
                set({ template: 'custom', branding: { ...design.branding, background: '' } });
            }
        }).catch((err) => setError(errorOf(err)));
    };

    return (
        <div className="space-y-5 pb-16" data-certificate-configuration>
            {/* Back close to the top (2026-11-07): pulled up into the dashboard's page padding. */}
            <div className="-mt-3 flex flex-wrap items-end justify-between gap-3 sm:-mt-5 lg:-mt-7">
                <div>
                    <Link to={S.back} className="mb-1 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-indigo-700"><ArrowLeft size={16} /> Back</Link>
                    <h1 className="flex items-center gap-2 text-2xl font-black text-slate-900 sm:text-3xl"><Award className="text-indigo-600" /> {platform ? 'Certificate Builder' : 'Certificate Configuration'}</h1>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={startOver} className={BTN2} data-cert-start-over><RotateCcw size={16} /> Start over</button>
                    <Link to={`${S.base}/issued`} className={BTN2}><FileStack size={16} /> Issued certificates</Link>
                </div>
            </div>

            {/* Intra- or inter-college. */}
            <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Competition type">
                {[['intra', 'Intra-College Competition', 'Conducted within the same college', School], ['inter', 'Inter-College Competition', 'Students from external colleges', Building2]].map(([k, title, sub, Icon]) => (
                    <label key={k} className={`${CARD} flex cursor-pointer items-center gap-3 p-4 transition ${design.details.type === k ? 'border-indigo-500 ring-2 ring-indigo-200' : 'hover:border-indigo-300'}`} data-cert-mode={k}>
                        <input type="radio" name="cert-mode" value={k} checked={design.details.type === k} onChange={() => { setDetails({ type: k }); setSaved(null); }} className="h-4 w-4 accent-indigo-600" />
                        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${design.details.type === k ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}><Icon size={19} /></span>
                        <span className="min-w-0"><span className="block text-sm font-black text-slate-900">{title}</span><span className="block text-xs text-slate-500">{sub}</span></span>
                    </label>
                ))}
            </div>

            {error && <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</p>}

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
                <div className="space-y-4">
                    <Section icon={Building2} title="Organising college">
                        <div className="grid gap-3 sm:grid-cols-2">
                            <label className="sm:col-span-2"><span className={LABEL}>Organising college name</span><input value={design.details.college} onChange={(e) => { setDetails({ college: e.target.value }); setSaved(null); }} maxLength={160} placeholder="RV College of Engineering" className={INPUT} data-cert-college /></label>
                            <div className="grid grid-cols-[1fr_8.5rem] gap-2">
                                <PictureField label="College logo" value={design.branding.logo} onChange={(v) => setBrand(v ? { logo: v, yaticorp: false } : { logo: v })} onError={setError} />
                                <label><span className={LABEL}>Logo shape</span>
                                    <Dropdown value={design.branding.logoShape || 'original'} onChange={(v) => setBrand({ logoShape: v })} options={[['original', 'Original'], ['circle', 'Circle'], ['square', 'Square']]} className={`${INPUT} h-12`} data-cert-logo-shape />
                                </label>
                            </div>
                            <PictureField label="Organisation seal (optional)" value={design.branding.seal} onChange={(v) => setBrand({ seal: v })} onError={setError} />
                            <label><span className={LABEL}>College address</span><input value={design.details.address || ''} onChange={(e) => { setDetails({ address: e.target.value }); setSaved(null); }} maxLength={120} placeholder="Mangaluru, Karnataka" className={INPUT} data-cert-address /></label>
                            <label><span className={LABEL}>Affiliation (optional)</span><input value={design.details.affiliation || ''} onChange={(e) => { setDetails({ affiliation: e.target.value }); setSaved(null); }} maxLength={120} placeholder="Affiliated to Mangalore University" className={INPUT} data-cert-affiliation /></label>
                            <label><span className={LABEL}>{design.details.type === 'inter' ? 'Organising department' : 'Department name'}</span><input value={design.details.department} onChange={(e) => { setDetails({ department: e.target.value }); setSaved(null); }} maxLength={160} placeholder="Department of Computer Science" className={INPUT} data-cert-department /></label>
                            {/* The platform admin only (2026-11-07): Yaticorp's logo at the top of the certificate, in the college logo's place. */}
                            {platform && (
                                <label className={`flex cursor-pointer items-center gap-3 self-end rounded-xl border px-3 py-2.5 text-sm font-bold transition ${design.branding.yaticorp ? 'border-indigo-400 bg-indigo-50 text-indigo-900' : 'border-slate-300 bg-white text-slate-700 hover:border-indigo-300'}`} data-cert-yaticorp-logo>
                                    <input type="checkbox" checked={Boolean(design.branding.yaticorp)} onChange={(e) => setBrand(e.target.checked ? { yaticorp: true, logo: '' } : { yaticorp: false })} className="h-4 w-4 accent-indigo-600" />
                                    <img src="/assets/certificates/yaticorp-logo.png" alt="" className="h-6 w-auto max-w-[6rem] object-contain" />
                                    Use Yaticorp logo
                                </label>
                            )}
                        </div>
                    </Section>

                    <Section icon={Award} title="Wording">
                        <div className="grid gap-3 sm:grid-cols-2">
                            <label className="sm:col-span-2"><span className={LABEL}>Certificate title</span><input value={[design.details.title, design.details.tagline].filter(Boolean).join(' ')} onChange={(e) => { setDetails({ title: e.target.value, tagline: '' }); setSaved(null); }} maxLength={80} placeholder="Certificate of Achievement" className={INPUT} data-cert-title /></label>
                            <label className="sm:col-span-2"><span className={LABEL}>Description (optional)</span><textarea value={design.description || ''} onChange={(e) => set({ description: e.target.value })} maxLength={600} rows={2} placeholder="Leave empty for the standard two lines" className={INPUT} data-cert-description /></label>
                            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 sm:col-span-2"><input type="checkbox" checked={Boolean(design.showQr)} onChange={(e) => set({ showQr: e.target.checked })} className="h-4 w-4 accent-indigo-600" data-cert-show-qr /> QR verification code on the certificate</label>
                        </div>
                    </Section>

                    {/* Who gets one: the results decide the names; the ticks decide the places. */}
                    <Section icon={Users} title="Certificates for">
                        <div className="grid gap-2 sm:grid-cols-4" role="group" aria-label="Who gets a certificate">
                            {[[1, '1st place'], [2, '2nd place'], [3, '3rd place']].map(([n, l]) => (
                                <label key={n} className={`flex cursor-pointer items-center gap-2.5 rounded-xl p-3 text-sm font-bold ring-1 transition ${design.places.includes(n) ? 'bg-amber-50 text-amber-900 ring-amber-300' : 'bg-slate-50 text-slate-500 ring-slate-200'}`}>
                                    <input type="checkbox" checked={design.places.includes(n)} data-cert-place={n} className="h-4 w-4 accent-amber-600"
                                        onChange={(e) => set({ places: e.target.checked ? [...design.places, n].sort() : design.places.filter((x) => x !== n) })} />
                                    {l}
                                </label>
                            ))}
                            <label className={`flex cursor-pointer items-center gap-2.5 rounded-xl p-3 text-sm font-bold ring-1 transition ${design.participation ? 'bg-indigo-50 text-indigo-900 ring-indigo-200' : 'bg-slate-50 text-slate-500 ring-slate-200'}`}>
                                <input type="checkbox" checked={design.participation} onChange={(e) => set({ participation: e.target.checked })} className="h-4 w-4 accent-indigo-600" data-cert-participation />
                                Participation
                            </label>
                        </div>
                    </Section>

                    <Section icon={User} title="Signatories"
                        aside={design.signatories.length < 3 && <button type="button" onClick={() => set({ signatories: [...design.signatories, { name: '', designation: '', signature: '' }] })} className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800"><Plus size={14} /> Add</button>}>
                        <div className="space-y-3">
                            {design.signatories.map((s, i) => (
                                <div key={i} className="grid gap-2 rounded-xl bg-slate-50 p-3 sm:grid-cols-[1fr_1fr_9rem_auto] sm:items-end">
                                    <label><span className={LABEL}>Name</span><input value={s.name} onChange={(e) => setSign(i, { name: e.target.value })} maxLength={80} placeholder="Dr. K N Subramanya" className={INPUT} /></label>
                                    <label><span className={LABEL}>Designation</span><input value={s.designation} onChange={(e) => setSign(i, { designation: e.target.value })} maxLength={80} placeholder="Principal" className={INPUT} /></label>
                                    <PictureField label="Signature (optional)" value={s.signature} onChange={(v) => setSign(i, { signature: v })} onError={setError} />
                                    <button type="button" onClick={() => set({ signatories: design.signatories.filter((_, j) => j !== i) })} aria-label="Remove signatory" className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={16} /></button>
                                </div>
                            ))}
                        </div>
                    </Section>

                    {/* The organisation's own templates (2026-10-31): Add to upload one, the bin to delete it. */}
                    <Section icon={Sparkles} title="Choose the template"
                        aside={<button type="button" onClick={() => templateFile.current?.click()} disabled={busy === 'template'} className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 disabled:opacity-50" data-cert-add-template>{busy === 'template' ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Add</button>}>
                        {/* First the plain white page, then our five white designs (always there), then the organisation's own
                            (saved; only the bin removes one). */}
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Template">
                            {[{ id: 'custom', name: 'Plain white' }, ...CT.TEMPLATES.filter((t) => t.white)].map((t) => {
                                const on = t.id === 'custom' ? design.template === 'custom' && !design.branding.background : design.template === t.id;
                                return (
                                    <button key={t.id} type="button" role="radio" aria-checked={on} onClick={() => set({ template: t.id, branding: { ...design.branding, background: '' } })} data-cert-template={t.id === 'custom' ? 'plain' : t.id}
                                        className={`overflow-hidden rounded-xl border-2 text-left transition ${on ? 'border-indigo-500 ring-2 ring-indigo-200' : 'border-slate-200 hover:border-indigo-300'}`}>
                                        <CertificateCanvas template={t.id} input={input} images={{ ...imagesOf(t.id, design.branding, design.signatories), background: '' }} className="block w-full bg-white" />
                                        <span className="block truncate px-2 py-1.5 text-xs font-bold text-slate-700">{t.name}</span>
                                    </button>
                                );
                            })}
                            {(own || []).map((t) => {
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
                            {own === null && <p className="flex items-center gap-2 p-3 text-xs text-slate-500"><Loader2 size={14} className="animate-spin" /> Loading your templates…</p>}
                        </div>
                        <input ref={templateFile} type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
                            onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; addTemplate(f); }} />
                    </Section>

                    {/* Under the gallery (2026-11-02): upload a picture of their own; Issue certificates is in the preview. */}
                    <button type="button" onClick={() => templateFile.current?.click()} disabled={busy === 'template'} className={`${BTN} w-full py-3 text-base`} data-cert-use-own>
                        {busy === 'template' ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />} Use your own certificate
                    </button>
                </div>

                {/* ---- The live preview ---- */}
                <div className="xl:sticky xl:top-4 xl:self-start">
                    <section className={`${CARD} overflow-hidden`}>
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
                            <div className="flex items-center gap-3">
                                <p className="flex items-center gap-2 text-sm font-black text-slate-900"><span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" /> Live preview</p>
                                <button type="button" onClick={downloadPreview} disabled={busy === 'download'} className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50" data-cert-download-preview>
                                    {busy === 'download' ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} Download
                                </button>
                            </div>
                            <div className="flex flex-wrap gap-1" role="radiogroup" aria-label="Preview the certificate for">
                                {SAMPLES.filter(([k]) => on(k)).map(([k, l]) => (
                                    <button key={k} type="button" role="radio" aria-checked={sample === k} onClick={() => setSample(k)} data-cert-sample={k}
                                        className={`rounded-full px-2.5 py-1 text-xs font-bold ${sample === k ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{l}</button>
                                ))}
                            </div>
                        </div>
                        <div className="bg-slate-100 p-3 sm:p-5">
                            <CertificateEditor template={design.template} input={input} images={images}
                                elements={design.elements || {}} onElements={(els) => setDesign((d) => ({ ...d, elements: els }))} onBegin={remember}
                                selected={selected} onSelect={setSelected} textOf={textOf} onText={onText} readOnly={readOnly}
                                onUndo={undo} onRedo={redo} canUndo={hist.past.length > 0} canRedo={hist.future.length > 0}
                                onResetAll={() => { remember(); setDesign((d) => ({ ...d, elements: {}, branding: { ...d.branding, logoAt: null, sealAt: null } })); setSelected(null); }}
                                onSaveDefaults={saveDefaults} savingDefaults={savingDefaults} />
                            {defaultsNote && <p className="mt-2 text-xs font-semibold text-emerald-700" role="status">{defaultsNote}</p>}
                        </div>
                        <div className="space-y-3 p-4">
                            <button type="button" onClick={issue} disabled={!!busy} className={`${BTN} w-full`} data-cert-issue>
                                {busy === 'issue' ? <Loader2 size={16} className="animate-spin" /> : <BadgeCheck size={16} />} {designId ? 'Save changes' : 'Save certificate'}
                            </button>
                            {saved && (
                                <div className="fixed inset-x-0 top-4 z-50 flex justify-center px-4 pointer-events-none">
                                    <p className="pointer-events-auto rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg" role="status" data-cert-saved>✓ {saved.design?.label || 'Certificate'} saved</p>
                                </div>
                            )}
                            {issuedCount > 0 && designId && (
                                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm">
                                    <span className="font-semibold text-slate-700">{issuedCount} certificate{issuedCount === 1 ? '' : 's'} issued</span>
                                    <span className="flex gap-3">
                                        <button type="button" onClick={() => downloadPdf(`${S.apiBase}/designs/${designId}/pdf`, `Certificates.pdf`).catch((e) => setError(e.message))} className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:underline" data-cert-download><Download size={14} /> Download PDF</button>
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
