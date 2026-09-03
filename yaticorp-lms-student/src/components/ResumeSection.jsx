/**
 * @description "Your Resume" on the profile — the file the student uploaded,
 *              and the ATS resume the LMS writes for them from their courses.
 *
 * The download is the point: a single-column PDF assembled server-side from
 * the student's name and contact, the skills their resume and Career Path
 * say they have, every course they have progressed (with the lessons ticked
 * so far), and their certificates. A student with no resume of their own
 * still gets one — that is the case this exists for.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    FileText, Download, Upload, Trash2, Briefcase, ShieldCheck, Zap, RefreshCw, Lock, Lightbulb,
    CalendarDays, Check, Loader2, ExternalLink, Sparkles, AlertCircle
} from 'lucide-react';
import api from '../utils/api';
import { Tile, Feature, Artwork } from './profileBlocks';

const fmtDateTime = (d) => (d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '');

export default function ResumeSection() {
    const [resume, setResume] = useState(null);
    const [ats, setAts] = useState(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [removing, setRemoving] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const inputRef = useRef(null);

    // A failed load is not the student's problem to read about: the card
    // simply shows the "nothing uploaded" state and the actions still work.
    const load = useCallback(() => api.get('/user/resume')
        .then((r) => { setResume(r.data.resume); setAts(r.data.ats); })
        .catch((err) => console.warn('[resume] load failed:', err.response?.data?.message || err.message))
        .finally(() => setLoading(false)), []);
    useEffect(() => { load(); }, [load]);

    const pick = async (file) => {
        if (!file) return;
        setError('');
        setNotice('');
        if (file.size > 5 * 1024 * 1024) return setError('That file is over 5 MB.');
        setUploading(true);
        try {
            const fd = new FormData();
            fd.append('resume', file);
            const r = await api.post('/user/resume', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
            setResume(r.data.resume);
            setAts(r.data.ats);
            setNotice(r.data.parsed
                ? `Uploaded — ${r.data.resume.skills?.length || 0} skills read from it and added to your ATS resume.`
                : 'Uploaded and saved. The skill reader was unavailable, so your ATS resume uses your courses for now.');
        } catch (err) {
            setError(err.response?.data?.message || 'Upload failed. Please try again.');
        } finally {
            setUploading(false);
            if (inputRef.current) inputRef.current.value = '';
        }
    };

    const remove = async () => {
        if (!window.confirm('Remove your uploaded resume?\n\nYour ATS resume stays available — it is built from your courses.')) return;
        setRemoving(true);
        setError('');
        try {
            const r = await api.delete('/user/resume');
            setResume(null);
            setAts(r.data.ats);
            setNotice('Resume removed.');
        } catch (err) {
            setError(err.response?.data?.message || 'Could not remove your resume.');
        } finally {
            setRemoving(false);
        }
    };

    const download = async () => {
        setDownloading(true);
        setError('');
        try {
            const r = await api.get('/user/resume/ats', { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([r.data], { type: 'application/pdf' }));
            const a = document.createElement('a');
            a.href = url;
            a.download = 'ATS_Resume.pdf';
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch {
            setError('Could not generate your resume. Please try again.');
        } finally {
            setDownloading(false);
        }
    };

    const skillsLine = ats
        ? `${ats.skills} skill${ats.skills === 1 ? '' : 's'}${ats.fromCourses ? ` (${ats.fromCourses} from your courses)` : ''} · ${ats.courses} course${ats.courses === 1 ? '' : 's'}${ats.completed ? `, ${ats.completed} completed` : ''} · ${ats.certifications} certificate${ats.certifications === 1 ? '' : 's'}`
        : '';

    return (
        <section aria-labelledby="your-resume-title" className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm divide-y divide-slate-100">
            {/* ── Header ───────────────────────────────────────────────── */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:px-5">
                <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-200"><FileText size={22} /></span>
                    <div>
                        <h2 id="your-resume-title" className="text-lg font-black tracking-tight text-slate-900 sm:text-xl">Your Resume <span className="text-amber-400">✨</span></h2>
                        <p className="text-xs text-slate-500 sm:text-sm">Keep your resume updated and get noticed by top opportunities.</p>
                    </div>
                </div>
                <button type="button" onClick={download} disabled={downloading || loading}
                    className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 text-sm font-bold text-white shadow-md shadow-indigo-200 transition-all hover:from-indigo-700 hover:to-violet-700 disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60 focus-visible:ring-offset-2">
                    {downloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />} Download Resume
                </button>
            </div>

            {error && <div className="flex items-center gap-2 bg-red-50 px-5 py-2.5 text-sm font-medium text-red-600"><AlertCircle size={15} /> {error}</div>}
            {notice && !error && <div className="flex items-center gap-2 bg-emerald-50 px-5 py-2.5 text-sm font-medium text-emerald-700"><Check size={15} /> {notice}</div>}

            {/* ── Status ───────────────────────────────────────────────── */}
            <div className="relative overflow-hidden border-l-4 border-l-emerald-500 p-4 sm:px-5">
                <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-violet-100/60 blur-3xl" />
                {loading ? (
                    <div className="skeleton h-32 rounded-2xl" />
                ) : (
                    <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center">
                        <div className="relative shrink-0 self-center sm:self-auto">
                            <span className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-dashed border-emerald-200 bg-white">
                                <span className={`flex h-14 w-14 items-center justify-center rounded-xl ${resume ? 'bg-gradient-to-br from-emerald-400 to-teal-500 text-white' : 'bg-slate-100 text-slate-400'}`}><FileText size={26} /></span>
                            </span>
                            {resume && <span className="absolute bottom-1 right-1 flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-white ring-2 ring-white"><Check size={16} strokeWidth={3} /></span>}
                        </div>
                        <div className="min-w-0 flex-1">
                            {resume ? (
                                <>
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700"><Check size={12} strokeWidth={3} /> Uploaded successfully</span>
                                    <h3 className="mt-1.5 truncate text-lg font-bold text-slate-900 sm:text-xl" title={resume.filename}>{resume.filename || 'Your resume'}</h3>
                                    <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-500">
                                        <span className="inline-flex items-center gap-1"><CalendarDays size={13} className="text-slate-400" /> Uploaded on {fmtDateTime(resume.uploadedAt)}</span>
                                        {resume.fileUrl && <a href={resume.fileUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-indigo-600 hover:underline"><ExternalLink size={12} /> Open file</a>}
                                    </p>
                                    <p className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-800"><ShieldCheck size={15} className="text-emerald-500" /> Your resume is updated and ready to go!</p>
                                </>
                            ) : (
                                <>
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700"><Sparkles size={12} /> ATS resume ready</span>
                                    <h3 className="mt-1.5 text-lg font-bold text-slate-900 sm:text-xl">No resume uploaded yet</h3>
                                    <p className="mt-1 text-sm text-slate-500">You still have one: the LMS writes an ATS resume from your courses, skills and certificates. Upload your own to add its skills too.</p>
                                </>
                            )}
                            {skillsLine && <p className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-slate-500"><Zap size={13} className="text-emerald-500" /> In your ATS resume: {skillsLine}</p>}
                        </div>
                        <div className="hidden scale-75 lg:block"><Artwork /></div>
                    </div>
                )}
            </div>

            {/* ── Action tiles ─────────────────────────────────────────── */}
            <div className="grid gap-2.5 p-4 sm:px-5 md:grid-cols-[1fr_1fr_1.5fr]">
                <Tile onClick={() => inputRef.current?.click()} disabled={uploading} icon={uploading ? Loader2 : Upload}
                    title={resume ? 'Replace Resume' : 'Upload Resume'} sub={uploading ? 'Uploading…' : resume ? 'Upload a new resume' : 'PDF or image, up to 5 MB'} tone="indigo" />
                <Tile onClick={remove} disabled={!resume || removing} icon={Trash2} title="Remove Resume" sub={resume ? 'Delete current resume' : 'Nothing uploaded yet'} tone="rose" />
                <Tile to="/jobs" icon={Briefcase} title={<>Find Matching Jobs <span aria-hidden="true">🚀</span></>} sub="Discover jobs that match your skills" tone="cta" />
            </div>
            <input ref={inputRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/*" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />

            {/* ── Feature strip ────────────────────────────────────────── */}
            <div className="grid gap-4 p-4 sm:grid-cols-2 sm:px-5 xl:grid-cols-4">
                <Feature icon={ShieldCheck} tone="bg-gradient-to-br from-violet-500 to-indigo-600" title="ATS Friendly">Built in a single-column format that works with all ATS systems.</Feature>
                <Feature icon={Zap} tone="bg-gradient-to-br from-emerald-400 to-green-600" title="Auto Skills">Skills from your courses are added automatically — even ones you've only half finished.</Feature>
                <Feature icon={RefreshCw} tone="bg-gradient-to-br from-sky-400 to-blue-600" title="Stay Updated">Every download is rebuilt from your latest progress, so it is never out of date.</Feature>
                <Feature icon={Lock} tone="bg-gradient-to-br from-amber-400 to-orange-500" title="Secure &amp; Private">We keep your data secure and private at all times.</Feature>
            </div>

            {/* ── Tip ──────────────────────────────────────────────────── */}
            <div className="relative overflow-hidden bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-3.5 sm:px-5">
                <div className="relative flex items-center gap-3 pr-16">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-orange-400 text-white shadow-md"><Lightbulb size={20} /></span>
                    <div>
                        <p className="text-sm font-bold text-slate-900">Tip for Better Results <span className="text-amber-400">✨</span></p>
                        <p className="text-xs leading-relaxed text-slate-600">Keep your resume updated and complete more courses to improve your job matches and stand out!</p>
                    </div>
                </div>
                <span aria-hidden="true" className="absolute right-5 top-1/2 -translate-y-1/2 text-4xl drop-shadow-sm">🎯</span>
                <span aria-hidden="true" className="absolute right-20 top-2 text-xs text-fuchsia-300">✦</span>
            </div>
        </section>
    );
}
