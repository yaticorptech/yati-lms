/**
 * Step 3 — the resume. The file goes through the LMS's own resume endpoint
 * (the one the profile page uses, so there is one resume per student); this
 * step only confirms it is on record. A resume already on file is offered as
 * done, with the option to replace it.
 */
import { useEffect, useRef, useState } from 'react';
import { FileText, UploadCloud, CheckCircle2, RefreshCw, Loader2 } from 'lucide-react';
import { verificationApi } from './api';
import { Card, Heading, PrimaryButton, SecondaryButton, ErrorNotice, SuccessMark } from './ui';
const MAX_MB = 5;
const ACCEPT = '.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const OK_EXT = ['pdf', 'doc', 'docx'];
const checkFile = (file) => {
    if (!file) return 'Choose a file.';
    const ext = String(file.name || '').toLowerCase().split('.').pop();
    if (!OK_EXT.includes(ext)) return 'Unsupported file. Upload a PDF, DOC or DOCX.';
    if (file.size > MAX_MB * 1024 * 1024) return `That file is over ${MAX_MB} MB. Export a lighter copy and try again.`;
    return '';
};
export default function ResumeStep({ view, onView, onContinue }) {
    const step = view.steps.resume; const added = step.status === 'ADDED';
    const [existing, setExisting] = useState(undefined);   // the LMS resume record, when the step is not yet ticked
    const [replacing, setReplacing] = useState(false);
    const [progress, setProgress] = useState(null); const [busy, setBusy] = useState(false); const [error, setError] = useState(null); const [problem, setProblem] = useState(''); const [dragging, setDragging] = useState(false);
    const inputRef = useRef(null);
    useEffect(() => { if (added) return; verificationApi.resumeGet().then(setExisting).catch(() => setExisting(null)); }, [added]);
    const confirm = async () => { setBusy(true); setError(null); try { onView(await verificationApi.resumeConfirm()); } catch (e) { setError(e); } finally { setBusy(false); } };
    const upload = async (file) => {
        const p = checkFile(file); setProblem(p); if (p) return;
        setError(null); setProgress(0);
        try { await verificationApi.resumeUpload(file, setProgress); onView(await verificationApi.resumeConfirm()); setReplacing(false); }
        catch (e) { setError(e.code === 'ERROR' && e.status === 400 ? { ...e, message: e.message || 'Upload failed. Try again.' } : e); }
        finally { setProgress(null); if (inputRef.current) inputRef.current.value = ''; }
    };
    const cont = async () => { setBusy(true); setError(null); try { onView(await onContinue()); } catch (e) { setError(e); } finally { setBusy(false); } };
    if (added && !replacing) return (
        <Card className="animate-fade-in-up"><SuccessMark label="Resume Uploaded" /><p className="mt-2 text-center text-sm text-slate-500">Your resume is on file and will improve your job recommendations.</p>
            {step.filename && <p className="mt-4 flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700"><FileText size={16} className="text-indigo-600" /> <span className="truncate">{step.filename}</span></p>}
            <ErrorNotice error={error} /><PrimaryButton className="mt-6" onClick={cont} loading={busy} loadingText="Continuing…">Continue</PrimaryButton>
            <button type="button" onClick={() => setReplacing(true)} className="mt-3 w-full text-center text-xs font-bold text-slate-500 hover:text-indigo-600">Upload a different resume</button></Card>);
    const uploading = progress !== null;
    return (
        <Card className="animate-fade-in-up">
            <Heading icon={FileText} title="Add Your Resume">Upload your resume to get better job recommendations.</Heading>
            {existing && !replacing && !added && (
                <div className="mb-5 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3"><CheckCircle2 size={20} className="shrink-0 text-emerald-600" /><div className="min-w-0 flex-1"><p className="text-sm font-bold text-emerald-900">A resume is already on file</p><p className="truncate text-xs text-emerald-800">{existing.filename || 'Your uploaded resume'}</p></div><SecondaryButton onClick={confirm} disabled={busy} className="shrink-0">Use it</SecondaryButton></div>
            )}
            <input ref={inputRef} type="file" accept={ACCEPT} className="hidden" onChange={(e) => upload(e.target.files?.[0])} />
            <div role="button" tabIndex={0} aria-label="Upload resume" onClick={() => !uploading && inputRef.current?.click()} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inputRef.current?.click(); } }}
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(e) => { e.preventDefault(); setDragging(false); upload(e.dataTransfer.files?.[0]); }}
                className={`flex cursor-pointer flex-col items-center rounded-2xl border-2 border-dashed p-8 text-center transition-colors ${dragging ? 'border-indigo-500 bg-indigo-50' : problem ? 'border-rose-300 bg-rose-50/40' : 'border-indigo-200 bg-indigo-50/40 hover:bg-indigo-50'}`}>
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-indigo-500 ring-1 ring-indigo-100">{uploading ? <Loader2 size={28} className="animate-spin" /> : <UploadCloud size={30} />}</span>
                <p className="mt-3 text-base font-bold text-slate-900">{uploading ? `Uploading… ${progress}%` : 'Upload Resume'}</p>
                <p className="mt-1 text-xs text-slate-500">{uploading ? 'Reading your resume for skills.' : `Drag a file here or click to choose. Supported: PDF, DOC, DOCX, up to ${MAX_MB} MB.`}</p>
                {uploading && <div className="mt-4 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-indigo-100"><div className="h-full rounded-full bg-indigo-600 transition-all" style={{ width: `${progress}%` }} /></div>}
            </div>
            {problem && <p role="alert" className="mt-2 text-sm font-semibold text-rose-600">{problem}</p>}
            <ErrorNotice error={error} onRetry={() => inputRef.current?.click()} />
            <p className="mt-4 text-xs text-slate-500">Your file is stored privately and never shared publicly. You can remove it any time from your profile.</p>
            <PrimaryButton className="mt-6" disabled title="Upload your resume to continue">Continue</PrimaryButton>
            {added && replacing && <button type="button" onClick={() => setReplacing(false)} className="mt-3 flex w-full items-center justify-center gap-1 text-center text-xs font-bold text-slate-500 hover:text-indigo-600"><RefreshCw size={12} /> Keep the resume I already uploaded</button>}
        </Card>
    );
}
