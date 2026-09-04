/**
 * @description Resume upload, and the review that stands between the parser
 *              and the search form.
 *
 * The flow is upload → extract → REVIEW → apply, and the review is the point:
 * the parser is instructed never to invent, but the student is still the
 * authority on their own resume, so every extracted skill arrives as a
 * selected chip they can untick before anything reaches the form. The file
 * itself is parsed server-side and discarded; only the extraction is stored,
 * and the ✕ here deletes even that.
 *
 * A PDF or a picture of the page both work — a phone photo of a printed CV is
 * a resume too, and asking for it to be re-typed into a PDF first is a wall.
 */
import { useRef, useState } from 'react';
import {
    FileText, Upload, Loader2, X, Check, GraduationCap, BadgeCheck, ShieldCheck
} from 'lucide-react';
import { jobsApi } from './api';

const ACCEPT = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'];
const MAX_BYTES = 5 * 1024 * 1024;

// The type is the browser's guess and is sometimes blank, so the extension
// gets a say — the server checks the same way.
const looksAccepted = (file) =>
    ACCEPT.includes(file.type) || /\.(pdf|png|jpe?g|webp)$/i.test(file.name || '');

export default function ResumeCard({ profile, onProfile, onApply }) {
    const [uploading, setUploading] = useState(false);
    const [dragging, setDragging] = useState(false);
    const [error, setError] = useState('');
    const [review, setReview] = useState(null);          // extraction being reviewed
    const [selected, setSelected] = useState(new Set()); // skills ticked in review
    const inputRef = useRef(null);

    const startReview = (p) => {
        setReview(p);
        setSelected(new Set(p.skills));
    };

    const handleFile = async (file) => {
        if (!file) return;
        setError('');
        // Both are checked again server-side; failing here just saves a
        // 5 MB round trip that ends in the same sentence.
        if (!looksAccepted(file)) {
            setError('That isn’t a PDF or an image — export your resume as PDF, PNG or JPG.');
            return;
        }
        if (file.size > MAX_BYTES) {
            setError('That file is over 5 MB — export a lighter one and try again.');
            return;
        }
        setUploading(true);
        try {
            const res = await jobsApi.resumeUpload(file);
            onProfile(res.profile);
            startReview(res.profile);
        } catch (err) {
            setError(err.message);
        } finally {
            setUploading(false);
            if (inputRef.current) inputRef.current.value = '';
        }
    };

    const onDrop = (e) => {
        e.preventDefault();
        setDragging(false);
        if (uploading) return;
        handleFile(e.dataTransfer?.files?.[0]);
    };

    const toggleSkill = (skill) => {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(skill)) next.delete(skill); else next.add(skill);
            return next;
        });
    };

    const apply = () => {
        onApply([...selected], review);
        setReview(null);
    };

    const remove = async () => {
        try {
            await jobsApi.resumeDelete();
            onProfile(null);
        } catch (err) {
            setError(err.message);
        }
    };

    // Hidden while the stored state is still unknown — flashing an upload
    // invitation at someone who already uploaded reads as data loss.
    if (profile === undefined) return null;

    return (
        <div>
            {profile ? (
                <div className="flex items-center gap-2.5 rounded-xl border border-emerald-100 bg-emerald-50/50 px-3.5 py-3">
                    <BadgeCheck size={18} className="shrink-0 text-emerald-600" />
                    <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-700">Resume profile</p>
                        <p className="truncate text-xs text-slate-500" title={profile.headline}>
                            {profile.headline || profile.filename}
                        </p>
                    </div>
                    <button type="button" onClick={() => startReview(profile)}
                        className="shrink-0 text-xs font-bold text-indigo-600 hover:text-indigo-700">
                        Apply
                    </button>
                    <button type="button" onClick={() => inputRef.current?.click()}
                        title="Replace with a new resume"
                        className="shrink-0 text-xs font-semibold text-slate-500 hover:text-slate-700">
                        Replace
                    </button>
                    <button type="button" onClick={remove}
                        title="Delete the extracted profile"
                        aria-label="Delete resume profile"
                        className="shrink-0 rounded p-1 text-slate-400 transition-colors hover:bg-white hover:text-rose-500">
                        <X size={13} />
                    </button>
                </div>
            ) : (
                <div
                    role="button"
                    tabIndex={0}
                    aria-label="Upload your resume — PDF or image, up to 5 MB"
                    aria-busy={uploading}
                    onClick={() => !uploading && inputRef.current?.click()}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inputRef.current?.click(); }
                    }}
                    onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={onDrop}
                    className={`cursor-pointer rounded-2xl border-2 border-dashed px-4 py-7 text-center transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/40 ${
                        dragging
                            ? 'border-indigo-500 bg-indigo-50'
                            : 'border-indigo-200 bg-indigo-50/30 hover:border-indigo-400 hover:bg-indigo-50/60'
                    } ${uploading ? 'cursor-wait' : ''}`}
                >
                    <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-indigo-600 shadow-sm ring-1 ring-indigo-100">
                        {uploading ? <Loader2 size={24} className="animate-spin" /> : <Upload size={24} />}
                    </div>
                    <p className="font-bold text-slate-800">
                        {uploading ? 'Reading your resume…' : 'Drop your resume here'}
                    </p>
                    <p className="mt-0.5 text-sm text-slate-500">
                        {uploading ? 'A few seconds — the skills come back for you to check.' : 'or choose a file from your computer'}
                    </p>
                    <div className="mt-3 flex items-center justify-center gap-2">
                        <span className="rounded border border-rose-200 bg-rose-50 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-rose-600">PDF</span>
                        <span className="rounded border border-sky-200 bg-sky-50 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-sky-700">IMAGE</span>
                        <span className="text-xs font-semibold text-slate-400">Max 5 MB</span>
                    </div>
                </div>
            )}

            <input
                ref={inputRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0])}
            />

            {!profile && !error && (
                <div className="mt-3 space-y-1.5 text-xs text-slate-500">
                    <p>Your resume helps us personalize your job matches.</p>
                    <p className="flex items-start gap-1.5">
                        <ShieldCheck size={14} className="mt-px shrink-0 text-emerald-500" />
                        <span>Parsed securely and discarded — only the skills and education are kept, and you can delete them any time.</span>
                    </p>
                </div>
            )}
            {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}

            {/* ── Review before anything is applied ─────────────────────── */}
            {review && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
                    <div className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
                        <div className="border-b border-slate-100 bg-slate-50 p-5">
                            <h3 className="flex items-center gap-2 font-bold text-slate-800">
                                <FileText size={17} className="text-indigo-600" />
                                Here&apos;s what your resume says
                            </h3>
                            <p className="mt-1 text-sm text-slate-500">
                                Untick anything that&apos;s wrong — only what you confirm reaches the search.
                            </p>
                        </div>

                        <div className="flex-1 space-y-4 overflow-y-auto p-5">
                            {review.headline && (
                                <p className="text-sm italic text-slate-600">&ldquo;{review.headline}&rdquo;</p>
                            )}

                            <div className="flex flex-wrap items-center gap-2 text-xs">
                                <span className="rounded-md bg-slate-100 px-2 py-1 font-bold text-slate-600">{review.seniority}</span>
                                {review.experienceYears > 0 && (
                                    <span className="rounded-md bg-slate-100 px-2 py-1 font-semibold text-slate-600">
                                        {review.experienceYears} yr{review.experienceYears === 1 ? '' : 's'} experience
                                    </span>
                                )}
                                {review.education?.degree && (
                                    <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 font-semibold text-slate-600">
                                        <GraduationCap size={12} />
                                        {[review.education.degree, review.education.specialization].filter(Boolean).join(', ')}
                                    </span>
                                )}
                            </div>

                            <div>
                                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                                    Skills found ({selected.size} of {review.skills.length} selected)
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                    {review.skills.map((skill) => {
                                        const on = selected.has(skill);
                                        return (
                                            <button
                                                key={skill}
                                                type="button"
                                                onClick={() => toggleSkill(skill)}
                                                aria-pressed={on}
                                                className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-sm font-medium transition-colors ${
                                                    on
                                                        ? 'border-indigo-200 bg-indigo-50 text-indigo-700'
                                                        : 'border-slate-200 bg-white text-slate-400 line-through'
                                                }`}
                                            >
                                                {on && <Check size={12} />}
                                                {skill}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {review.pastRoles?.length > 0 && (
                                <div>
                                    <p className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-400">Roles held</p>
                                    <p className="text-sm text-slate-600">{review.pastRoles.join(' · ')}</p>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-2 border-t border-slate-100 p-4">
                            <button type="button" onClick={() => setReview(null)}
                                className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100">
                                Not now
                            </button>
                            <button type="button" onClick={apply} disabled={!selected.size}
                                className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:opacity-50">
                                Use {selected.size} skill{selected.size === 1 ? '' : 's'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
