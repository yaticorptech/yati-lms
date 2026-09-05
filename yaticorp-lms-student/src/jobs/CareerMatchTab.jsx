/**
 * Career Match.
 *
 * Step one asks which resume to match against: upload a new one, or carry on
 * with the resume already on the profile. Step two lists the jobs that fit
 * that resume best, each with a "Find Job" button to the listing.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Upload, FileText, Sparkles, ExternalLink, Loader2, RefreshCw, MapPin, Building2, Check, AlertCircle } from 'lucide-react';
import { jobsApi, learnerSkills } from './api';

const MAX_BYTES = 5 * 1024 * 1024;

const ring = (t) => t >= 75 ? 'text-emerald-600 bg-emerald-50 border-emerald-200' : t >= 50 ? 'text-indigo-600 bg-indigo-50 border-indigo-200' : 'text-slate-500 bg-slate-50 border-slate-200';

/** One matched job: score, title, company, place, the skills that matched, and the way in. */
export const MatchCard = ({ job }) => {
    const m = job.match || { total: 0, matched: [], missing: [] };
    return (
        <article className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 transition-all hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-lg">
            <div className="flex items-start justify-between gap-3">
                <div className={`flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl border ${ring(m.total)}`} aria-label={`${m.total}% match`}>
                    <span className="text-lg font-bold leading-none tabular-nums">{m.total}</span>
                    <span className="text-[9px] font-bold uppercase tracking-wider opacity-70">match</span>
                </div>
                <div className="flex flex-wrap justify-end gap-1.5">
                    {job.type && job.type !== 'Unknown' && <span className="rounded bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-600">{job.type}</span>}
                    {job.remote && <span className="rounded bg-emerald-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700">Remote</span>}
                </div>
            </div>
            <h3 className="mt-3 text-lg font-bold leading-snug text-slate-800">{job.title}</h3>
            <ul className="mt-1.5 space-y-1 text-sm text-slate-600">
                {job.company && <li className="flex items-center gap-1.5"><Building2 size={14} className="text-slate-400" /> {job.company}</li>}
                {job.location && <li className="flex items-center gap-1.5"><MapPin size={14} className="text-slate-400" /> {job.location}</li>}
            </ul>
            {m.matched?.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                    {m.matched.slice(0, 6).map((s) => <span key={s} className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700"><Check size={11} /> {s}</span>)}
                    {m.missing?.slice(0, 3).map((s) => <span key={s} className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">+ {s}</span>)}
                </div>
            )}
            <div className="mt-auto flex items-center justify-between gap-3 pt-4">
                <span className="text-xs text-slate-500">{job.source ? `via ${job.source}` : ''}</span>
                <a href={job.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700">
                    Find Job <ExternalLink size={14} />
                </a>
            </div>
        </article>
    );
};

export default function CareerMatchTab({ profile, onProfile, onSwitchTab, location = '' }) {
    const [source, setSource] = useState(null);      // null = choosing · 'profile' | 'upload'
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');
    const inputRef = useRef(null);
    // The resume is the student's own account of themselves; the courses
    // they have finished here are this LMS's. Both are evidence, so both are
    // matched on — a course in React counts even if the resume predates it.
    const [learned, setLearned] = useState(null);
    useEffect(() => { learnerSkills().then(setLearned); }, [profile?.parsedAt]);
    const skills = useMemo(
        () => [...new Set([...(profile?.skills || []), ...(learned?.bySource.course || []), ...(learned?.bySource.career || [])])],
        [profile?.skills, learned]
    );
    const fromCourses = learned?.bySource.course?.length || 0;
    const skillsKey = skills.join('|');

    // Once a resume is chosen, ask the ranker for what fits it. The answer is
    // tagged with the query it answers, so a re-upload or a background read
    // finishing shows the skeleton again rather than stale matches.
    const query = source && skills.length ? `${source}|${skillsKey}|${location}` : null;
    const [answer, setAnswer] = useState({ query: null, results: null, error: '' });
    useEffect(() => {
        if (!query) return undefined;
        let cancelled = false;
        jobsApi.recommend({ skills, role: '', jobType: 'Any', location, remoteOnly: false, strictType: false, sortBy: 'relevance', limit: 40, quiet: true })
            .then((r) => { if (!cancelled) setAnswer({ query, results: [...(r.results || [])].sort((a, b) => (b.match?.total ?? 0) - (a.match?.total ?? 0)), error: '' }); })
            .catch((e) => { if (!cancelled) setAnswer({ query, results: [], error: e.message || 'Could not fetch matches right now.' }); });
        return () => { cancelled = true; };
    }, [query, skills, location]);
    const results = answer.query === query ? answer.results : null;
    const loading = !!query && answer.query !== query;
    const fetchError = answer.query === query ? answer.error : '';

    const upload = async (file) => {
        if (!file) return;
        setError('');
        if (file.size > MAX_BYTES) return setError('That file is over 5 MB — export a lighter one and try again.');
        setUploading(true);
        try {
            const res = await jobsApi.resumeUpload(file);
            onProfile(res.profile);
            setSource('upload');
        } catch (e) {
            setError(e.message || 'Upload failed. Please try again.');
        } finally {
            setUploading(false);
            if (inputRef.current) inputRef.current.value = '';
        }
    };

    if (profile === undefined) return <div className="skeleton h-64 rounded-3xl" />;

    /* ── Step 1: which resume? ─────────────────────────────────────── */
    if (!source) {
        // A student who has finished courses here can match on those alone,
        // even before they upload anything.
        const hasProfileResume = skills.length > 0;
        return (
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                <div className="mx-auto max-w-2xl text-center">
                    <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-200"><Sparkles size={26} /></span>
                    <h2 className="mt-4 text-2xl font-black text-slate-900">Career Match</h2>
                    <p className="mt-1 text-slate-500">Choose the resume to match against, and we'll find the jobs that fit it best.</p>
                </div>
                <div className="mx-auto mt-6 grid max-w-2xl gap-4 sm:grid-cols-2">
                    <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading}
                        className="group flex flex-col items-center rounded-2xl border-2 border-dashed border-indigo-200 bg-indigo-50/50 p-6 text-center transition-all hover:-translate-y-0.5 hover:border-indigo-400 hover:bg-indigo-50 disabled:opacity-60">
                        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-indigo-600 shadow-sm">{uploading ? <Loader2 size={22} className="animate-spin" /> : <Upload size={22} />}</span>
                        <span className="mt-3 text-base font-bold text-slate-900">{uploading ? 'Uploading…' : 'Upload a resume'}</span>
                        <span className="mt-1 text-xs text-slate-500">PDF or image, up to 5 MB</span>
                    </button>
                    <button type="button" onClick={() => setSource('profile')} disabled={!hasProfileResume}
                        className="group flex flex-col items-center rounded-2xl border-2 border-emerald-200 bg-emerald-50/50 p-6 text-center transition-all hover:-translate-y-0.5 hover:border-emerald-400 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50">
                        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-emerald-600 shadow-sm"><FileText size={22} /></span>
                        <span className="mt-3 text-base font-bold text-slate-900">Continue with profile resume</span>
                        <span className="mt-1 text-xs text-slate-500">{hasProfileResume ? `${profile.filename || 'Your resume'} · ${skills.length} skills${fromCourses ? `, ${fromCourses} from your courses` : ''}` : profile ? 'No skills could be read from it yet' : 'No resume on your profile yet'}</span>
                    </button>
                </div>
                <input ref={inputRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/*" className="hidden" onChange={(e) => upload(e.target.files?.[0])} />
                {error && <p className="mx-auto mt-4 flex max-w-2xl items-center gap-2 rounded-xl bg-rose-50 px-4 py-2.5 text-sm text-rose-700"><AlertCircle size={15} /> {error}</p>}
            </section>
        );
    }

    /* ── Step 2: the jobs that fit ────────────────────────────────── */
    return (
        <section className="space-y-4">
            <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600"><FileText size={18} /></span>
                    <div>
                        <p className="text-sm font-bold text-slate-900">Matching against {source === 'upload' ? 'your uploaded resume' : 'your profile resume'}</p>
                        <p className="text-xs text-slate-500">{profile?.filename || 'Resume'}{fromCourses > 0 ? ` + ${fromCourses} skill${fromCourses === 1 ? '' : 's'} from your courses` : ''} · {skills.slice(0, 6).join(', ')}{skills.length > 6 ? ` +${skills.length - 6} more` : ''}{location ? ` · near ${location}` : ''}</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button type="button" onClick={() => setSource(null)} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"><RefreshCw size={14} /> Change resume</button>
                    <button type="button" onClick={() => onSwitchTab('jobs')} className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800">Search jobs by hand</button>
                </div>
            </div>

            {!skills.length && <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">No skills could be read from this resume. Upload a text-based PDF, or search jobs by hand.</p>}
            {(error || fetchError) && <p className="flex items-center gap-2 rounded-xl bg-rose-50 px-4 py-2.5 text-sm text-rose-700"><AlertCircle size={15} /> {error || fetchError}</p>}
            {loading && <div className="grid gap-4 xl:grid-cols-2">{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-52 rounded-2xl" />)}</div>}

            {!loading && results && (
                results.length ? (
                    <>
                        <p className="text-sm text-slate-500"><strong className="text-slate-800">{results.length}</strong> job{results.length === 1 ? '' : 's'} match your resume, best fit first.</p>
                        <div className="grid gap-4 xl:grid-cols-2">{results.map((job) => <MatchCard key={job.id} job={job} />)}</div>
                    </>
                ) : (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center">
                        <p className="font-bold text-slate-800">No listings matched this resume yet</p>
                        <p className="mt-1 text-sm text-slate-500">Try searching by hand with a role name, or check back after the next job refresh.</p>
                    </div>
                )
            )}
        </section>
    );
}
