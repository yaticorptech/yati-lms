/**
 * The one step before an organization's first course: its institution's logo.
 *
 * Shown on the organization's Courses page once the platform has switched
 * courses on and the organization has no logo yet — and never again after.
 * The server holds the same line (a course cannot be made or published
 * without a logo), so this is the friendly face of a rule, not the rule.
 *
 * `onDone(logoUrl)` runs once the logo is saved. The panel's header is told
 * too (the 'organization-logo' event), so the logo appears there at once.
 */
import React, { useEffect, useRef, useState } from 'react';
import { ImagePlus, Loader2, Upload, CheckCircle2, BookOpen } from 'lucide-react';
import api from '../utils/api';

const MAX_BYTES = 5 * 1024 * 1024;

const OrgLogoStep = ({ onDone }) => {
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [dragging, setDragging] = useState(false);
    const input = useRef(null);

    // The preview's object URL is let go when it is replaced or the step closes.
    useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

    const choose = (picked) => {
        setError('');
        if (!picked) return;
        if (!picked.type.startsWith('image/')) return setError('Choose an image file — PNG, JPG, SVG or WebP.');
        if (picked.size > MAX_BYTES) return setError('That image is over 5 MB. Choose a smaller one.');
        setFile(picked);
        setPreview(URL.createObjectURL(picked));
    };

    const upload = async () => {
        if (!file) return;
        setBusy(true); setError('');
        try {
            const fd = new FormData();
            fd.append('image', file);
            const res = await api.post('/organizations/me/logo', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
            window.dispatchEvent(new CustomEvent('organization-logo', { detail: res.data.logo }));
            onDone(res.data.logo);
        } catch (err) {
            setError(err.response?.data?.message || 'Could not upload the logo. Please try again.');
            setBusy(false);
        }
    };

    return (
        <div className="mx-auto max-w-xl animate-fade-in rounded-2xl border border-slate-200 bg-white shadow-sm" role="region" aria-label="Upload your logo">
            <div className="border-b border-slate-100 p-6 text-center sm:p-8">
                <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-100 text-indigo-600"><ImagePlus size={26} /></span>
                <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-500">One step before your courses</p>
                <h1 className="mt-1 text-xl font-bold text-slate-900">Upload your institution's logo</h1>
                <p className="mt-2 text-sm text-slate-600">
                    Your students see your courses under your name and logo. Add it once, and then you can create and publish your own courses.
                </p>
            </div>

            <div className="space-y-4 p-6 sm:p-8">
                <button type="button" onClick={() => input.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={(e) => { e.preventDefault(); setDragging(false); choose(e.dataTransfer.files?.[0]); }}
                    className={`flex w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-6 transition-colors ${dragging ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 bg-slate-50 hover:border-indigo-300 hover:bg-indigo-50/50'}`}>
                    {preview ? (
                        <img src={preview} alt="Your logo" className="h-28 w-28 rounded-2xl bg-white object-contain p-2 shadow-sm ring-1 ring-slate-200" />
                    ) : (
                        <span className="flex h-28 w-28 items-center justify-center rounded-2xl bg-white text-slate-300 ring-1 ring-slate-200"><ImagePlus size={36} /></span>
                    )}
                    <span className="text-sm font-semibold text-slate-700">{file ? file.name : 'Choose your logo'}</span>
                    <span className="text-xs text-slate-500">{file ? 'Tap to choose a different one' : 'PNG, JPG, SVG or WebP, up to 5 MB. A square image looks best.'}</span>
                </button>
                <input ref={input} type="file" accept="image/*" className="hidden" aria-label="Logo image"
                    onChange={(e) => { choose(e.target.files?.[0]); e.target.value = ''; }} />

                {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700 ring-1 ring-red-200">{error}</p>}

                <button type="button" onClick={upload} disabled={!file || busy}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-600/20 transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50">
                    {busy ? <><Loader2 size={16} className="animate-spin" /> Uploading…</> : <><Upload size={16} /> Upload logo and continue</>}
                </button>

                <ul className="space-y-1.5 text-xs text-slate-500">
                    <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-500" /> Asked for only once — you can change it later in Settings.</li>
                    <li className="flex items-center gap-2"><BookOpen size={14} className="text-indigo-400" /> Then add and publish your courses, for your own students only.</li>
                </ul>
            </div>
        </div>
    );
};

export default OrgLogoStep;
