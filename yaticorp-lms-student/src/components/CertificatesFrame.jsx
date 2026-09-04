/**
 * @description "My Certificates" on the profile — the frame the student's
 *              achievements sit in. Two sources, one wall: certificates the
 *              LMS issues when a course hits 100%, and ones the student
 *              uploads from anywhere else (school, a competition, another
 *              platform). The newest sits in the big frame at the top; the
 *              rest hang in the gallery beneath.
 */
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    Award, Download, Loader2, Upload, Trash2, ExternalLink, Sparkles, BadgeCheck, CalendarDays,
    ShieldCheck, Briefcase, ArrowRight, ChevronRight, BookOpen, Lightbulb, FileText, X, Image as ImageIcon,
    Lock, RefreshCw, Frame, Check
} from 'lucide-react';
import api from '../utils/api';
import { Tile, Artwork } from './profileBlocks';

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '');

/** Course certificates and uploads, one shape, newest first. */
const merge = (certificates, achievements) => [
    ...certificates.map((c) => ({
        id: `course-${c._id}`, source: 'course', raw: c,
        title: c.courseId?.title || 'Course certificate', issuer: 'YATI LMS',
        date: c.issuedAt || c.createdAt, number: c.certificateNumber, thumbnailUrl: '', fileType: 'pdf'
    })),
    ...achievements.map((a) => ({
        id: `up-${a.id}`, source: 'upload', raw: a,
        title: a.title, issuer: a.issuer || 'Uploaded by you',
        date: a.issuedOn || a.createdAt, thumbnailUrl: a.thumbnailUrl, fileUrl: a.fileUrl, fileType: a.fileType
    }))
].sort((a, b) => new Date(b.date) - new Date(a.date));

/* A certificate in a frame: matted, bevelled, with a ribbon when it is one
   the LMS issued. Images and PDF thumbnails render inside; anything else
   gets the seal. */
const Framed = ({ item, large = false }) => (
    <div className={`relative rounded-2xl bg-gradient-to-br from-amber-100 via-amber-50 to-amber-200 p-1.5 shadow-md ${large ? 'sm:p-3' : ''}`}>
        <div className="rounded-xl border-4 border-white bg-white p-1.5 shadow-inner">
            <div className={`flex items-center justify-center overflow-hidden rounded-lg bg-slate-100 ${large ? 'aspect-[4/3]' : 'aspect-[4/3]'}`}>
                {item.thumbnailUrl ? (
                    <img src={item.thumbnailUrl} alt={item.title} loading="lazy" className="h-full w-full object-cover" />
                ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-emerald-50 via-white to-teal-50 text-emerald-600">
                        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 ring-4 ring-emerald-50"><Award size={large ? 30 : 22} /></span>
                        {large && <span className="px-4 text-center text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">Certificate of completion</span>}
                    </div>
                )}
            </div>
        </div>
        {item.source === 'course' && (
            <span className="absolute -right-1.5 -top-1.5 inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow">
                <BadgeCheck size={11} /> Verified
            </span>
        )}
    </div>
);

const UploadDialog = ({ onClose, onDone }) => {
    const [file, setFile] = useState(null);
    const [title, setTitle] = useState('');
    const [issuer, setIssuer] = useState('');
    const [issuedOn, setIssuedOn] = useState('');
    const [kind, setKind] = useState('certificate');
    const [dragging, setDragging] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const inputRef = useRef(null);

    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    const pick = (f) => {
        if (!f) return;
        if (!(f.type.startsWith('image/') || f.type === 'application/pdf' || /\.(pdf|png|jpe?g|webp)$/i.test(f.name))) return setError('Upload an image (PNG, JPG, WebP) or a PDF.');
        if (f.size > 10 * 1024 * 1024) return setError('That file is over 10 MB.');
        setError('');
        setFile(f);
        if (!title) setTitle(f.name.replace(/\.[a-z0-9]+$/i, '').replace(/[-_]+/g, ' '));
    };

    const submit = async (e) => {
        e.preventDefault();
        if (!file) return setError('Choose the certificate file first.');
        if (!title.trim()) return setError('Give the certificate a title.');
        setBusy(true);
        setError('');
        try {
            const fd = new FormData();
            fd.append('file', file);
            fd.append('title', title.trim());
            fd.append('issuer', issuer.trim());
            fd.append('issuedOn', issuedOn);
            fd.append('kind', kind);
            const res = await api.post('/user/achievements', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
            onDone(res.data.achievement);
        } catch (err) {
            setError(err.response?.data?.message || 'Upload failed. Please try again.');
        } finally {
            setBusy(false);
        }
    };

    const input = 'w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500';
    const label = 'mb-1.5 block text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500';

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm" onClick={onClose}>
            <form role="dialog" aria-modal="true" aria-labelledby="cert-upload-title" onSubmit={submit} onClick={(e) => e.stopPropagation()}
                className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-white shadow-2xl animate-fade-in-up">
                <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 p-5">
                    <h3 id="cert-upload-title" className="flex items-center gap-2 font-bold text-slate-800"><Upload size={17} className="text-indigo-600" /> Add a certificate to your frame</h3>
                    <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-slate-700"><X size={16} /></button>
                </div>
                <div className="space-y-4 overflow-y-auto p-5">
                    <div
                        role="button" tabIndex={0}
                        onClick={() => inputRef.current?.click()}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inputRef.current?.click(); } }}
                        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                        onDragLeave={() => setDragging(false)}
                        onDrop={(e) => { e.preventDefault(); setDragging(false); pick(e.dataTransfer.files?.[0]); }}
                        className={`cursor-pointer rounded-2xl border-2 border-dashed px-4 py-6 text-center transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/40 ${dragging ? 'border-indigo-500 bg-indigo-50' : 'border-indigo-200 bg-indigo-50/30 hover:border-indigo-400 hover:bg-indigo-50/60'}`}
                    >
                        {file ? (
                            <div className="flex items-center justify-center gap-3 text-left">
                                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-indigo-600 shadow-sm">{file.type === 'application/pdf' ? <FileText size={22} /> : <ImageIcon size={22} />}</span>
                                <div className="min-w-0">
                                    <p className="truncate font-semibold text-slate-800">{file.name}</p>
                                    <p className="text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(1)} MB · tap to change</p>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-indigo-600 shadow-sm ring-1 ring-indigo-100"><Upload size={22} /></div>
                                <p className="font-bold text-slate-800">Drop your certificate here</p>
                                <p className="text-sm text-slate-500">or choose a file from your computer</p>
                                <div className="mt-2 flex items-center justify-center gap-2 text-[10px] font-bold tracking-wider">
                                    <span className="rounded border border-rose-200 bg-rose-50 px-1.5 py-0.5 text-rose-600">PDF</span>
                                    <span className="rounded border border-sky-200 bg-sky-50 px-1.5 py-0.5 text-sky-700">IMAGE</span>
                                    <span className="text-xs font-semibold tracking-normal text-slate-400">Max 10 MB</span>
                                </div>
                            </>
                        )}
                    </div>
                    <input ref={inputRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/*" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />

                    <div>
                        <label htmlFor="cert-title" className={label}>Title</label>
                        <input id="cert-title" value={title} onChange={(e) => setTitle(e.target.value)} className={input} placeholder="e.g. State-level Science Fair — 1st place" maxLength={120} required />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <label htmlFor="cert-issuer" className={label}>Issued by <span className="font-medium normal-case tracking-normal text-slate-400">(optional)</span></label>
                            <input id="cert-issuer" value={issuer} onChange={(e) => setIssuer(e.target.value)} className={input} placeholder="School, organisation…" maxLength={120} />
                        </div>
                        <div>
                            <label htmlFor="cert-date" className={label}>Date <span className="font-medium normal-case tracking-normal text-slate-400">(optional)</span></label>
                            <input id="cert-date" type="date" value={issuedOn} onChange={(e) => setIssuedOn(e.target.value)} className={input} max={new Date().toISOString().slice(0, 10)} />
                        </div>
                    </div>
                    <div>
                        <span className={label}>Type</span>
                        <div className="flex gap-2">
                            {[['certificate', 'Certificate'], ['award', 'Award'], ['other', 'Other']].map(([id, l]) => (
                                <button key={id} type="button" onClick={() => setKind(id)} aria-pressed={kind === id}
                                    className={`min-h-10 flex-1 rounded-xl border text-sm font-semibold ${kind === id ? 'border-indigo-300 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-600'}`}>{l}</button>
                            ))}
                        </div>
                    </div>
                    {error && <p role="alert" className="rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
                </div>
                <div className="flex justify-end gap-2 border-t border-slate-100 p-4">
                    <button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100">Cancel</button>
                    <button type="submit" disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
                        {busy ? <><Loader2 size={15} className="animate-spin" /> Uploading…</> : <><Frame size={15} /> Add to my frame</>}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default function CertificatesFrame({ certificates, loading, certError, downloadingId, onDownload }) {
    const [achievements, setAchievements] = useState([]);
    const [loadingUploads, setLoadingUploads] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [removingId, setRemovingId] = useState(null);
    const [error, setError] = useState('');
    const [justAdded, setJustAdded] = useState(null);

    useEffect(() => {
        api.get('/user/achievements')
            .then((r) => setAchievements(r.data.achievements || []))
            .catch(() => {})
            .finally(() => setLoadingUploads(false));
    }, []);

    const remove = async (item) => {
        if (!window.confirm(`Remove "${item.title}" from your frame?`)) return;
        setRemovingId(item.id);
        setError('');
        try {
            await api.delete(`/user/achievements/${item.raw.id}`);
            setAchievements((rows) => rows.filter((a) => a.id !== item.raw.id));
        } catch (err) {
            setError(err.response?.data?.message || 'Could not remove that certificate.');
        } finally {
            setRemovingId(null);
        }
    };

    const items = merge(certificates, achievements);
    const busy = loading || loadingUploads;

    /* One card, five bands, separated by hairlines rather than gaps — the
       resume block below it needs the room. */
    return (
        <section aria-labelledby="my-certificates-title" className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm divide-y divide-slate-100">
            {/* ── Header ───────────────────────────────────────────────── */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5">
                <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-200"><Award size={20} /></span>
                    <div>
                        <h2 id="my-certificates-title" className="text-base font-black tracking-tight text-slate-900 sm:text-lg">My Certificates <span className="text-amber-400">✨</span></h2>
                        <p className="text-xs text-slate-500 sm:text-sm">Your achievements, in one frame — earned here or uploaded from anywhere.</p>
                    </div>
                </div>
                <button type="button" onClick={() => setUploading(true)}
                    className="inline-flex min-h-9 items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 text-sm font-bold text-white shadow-md shadow-indigo-200 transition-all hover:from-indigo-700 hover:to-violet-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60 focus-visible:ring-offset-2">
                    <Upload size={16} /> Upload Certificate
                </button>
            </div>

            {(certError || error) && (
                <div className="bg-red-50 px-5 py-2.5 text-sm font-medium text-red-600">{certError || error}</div>
            )}

            {/* ── Empty frame ──────────────────────────────────────────── */}
            {busy ? (
                <div className="px-4 py-3 sm:px-5"><div className="skeleton h-24 rounded-2xl" /></div>
            ) : items.length === 0 && (
                <div className="relative overflow-hidden px-4 py-3 sm:px-5">
                    <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-violet-100/60 blur-3xl" />
                    <div className="relative flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
                        <div className="w-28 shrink-0"><Framed item={{ title: 'Your first certificate', source: 'empty' }} /></div>
                        <div className="min-w-0 flex-1">
                            <h3 className="text-base font-bold text-slate-800">Your frame is empty — for now</h3>
                            <p className="mt-1 text-sm leading-relaxed text-slate-500">
                                Finish a course to earn a verified certificate, or use <strong>Upload Certificate</strong> above to add one you already have — it goes straight into this frame.
                            </p>
                            <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
                                <Link to="/enrolled-courses" className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 text-xs font-bold text-slate-700 hover:border-indigo-300 hover:text-indigo-600"><BookOpen size={14} /> Continue a course</Link>
                            </div>
                        </div>
                        <div className="hidden scale-[0.6] lg:block"><Artwork /></div>
                    </div>
                </div>
            )}

            {/* ── Gallery ──────────────────────────────────────────────── */}
            {!busy && items.length > 0 && (
                <div className="px-4 py-3 sm:px-5">
                    <h3 className="mb-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                        <Frame size={13} className="text-indigo-500" /> Your frame
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 normal-case tracking-normal text-emerald-700"><ShieldCheck size={12} /> {items.length} {items.length === 1 ? 'achievement' : 'achievements'} on your profile</span>
                        {justAdded && <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 normal-case tracking-normal text-indigo-700"><Check size={12} strokeWidth={3} /> Uploaded successfully</span>}
                    </h3>
                    <div className="stagger grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-6">
                        {items.map((item) => (
                            <article key={item.id} title={`${item.title}${item.issuer ? ` · ${item.issuer}` : ''}${item.date ? ` · ${fmtDate(item.date)}` : ''}`}
                                className="group flex flex-col rounded-xl border border-slate-200 bg-white p-2 transition-all hover:-translate-y-0.5 hover:shadow-md">
                                {/* The picture is the certificate. An uploaded one is
                                    titled after whatever the file was called —
                                    "Screenshot 2026 09 04 at 11.28.05 AM" — which
                                    tells nobody anything, so the frame speaks for
                                    itself and the name stays in the tooltip. */}
                                <Framed item={item} />
                                <div className="mt-auto flex items-center gap-1 pt-2">
                                    {item.source === 'course' ? (
                                        <button type="button" onClick={() => onDownload(item.raw)} disabled={downloadingId === item.raw._id}
                                            className="inline-flex min-h-8 flex-1 items-center justify-center gap-1 rounded-lg border border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-700 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 disabled:opacity-60">
                                            {downloadingId === item.raw._id ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />} PDF
                                        </button>
                                    ) : (
                                        <>
                                            <a href={item.fileUrl} target="_blank" rel="noopener noreferrer"
                                                className="inline-flex min-h-8 flex-1 items-center justify-center gap-1 rounded-lg border border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-700 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700">
                                                <ExternalLink size={12} /> Open
                                            </a>
                                            <button type="button" onClick={() => remove(item)} disabled={removingId === item.id} aria-label={`Remove ${item.title}`}
                                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-60">
                                                {removingId === item.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={13} />}
                                            </button>
                                        </>
                                    )}
                                </div>
                            </article>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Action tiles ─────────────────────────────────────────── */}
            <div className="grid gap-2.5 px-4 py-3 sm:px-5 md:grid-cols-[1fr_1.5fr]">
                <Tile to="/enrolled-courses" icon={RefreshCw} title="Earn More" sub="Finish a course to get a verified one" tone="rose" />
                <Tile to="/jobs" icon={Briefcase} title={<>Find Matching Jobs <span aria-hidden="true">🚀</span></>} sub="Discover jobs that match your skills" tone="cta" />
            </div>

            {/* ── Tip ──────────────────────────────────────────────────── */}
            <div className="relative overflow-hidden bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-3 sm:px-5">
                <div className="relative flex items-center gap-3 pr-16">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-orange-400 text-white shadow-md"><Lightbulb size={20} /></span>
                    <div>
                        <p className="text-sm font-bold text-slate-900">Tip for Better Results <span className="text-amber-400">✨</span></p>
                        <p className="text-xs leading-relaxed text-slate-600">Complete more courses and add your certificates here to improve your job matches and stand out.</p>
                    </div>
                </div>
                <span aria-hidden="true" className="absolute right-5 top-1/2 -translate-y-1/2 text-4xl drop-shadow-sm">🎯</span>
                <span aria-hidden="true" className="absolute right-20 top-2 text-xs text-fuchsia-300">✦</span>
            </div>

            {uploading && (
                <UploadDialog
                    onClose={() => setUploading(false)}
                    onDone={(a) => { setAchievements((rows) => [a, ...rows]); setJustAdded(`up-${a.id}`); setUploading(false); }}
                />
            )}
        </section>
    );
}
