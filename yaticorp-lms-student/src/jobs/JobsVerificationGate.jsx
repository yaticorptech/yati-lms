/**
 * @description The one-time check before the job board opens: Aadhaar number,
 *              LinkedIn profile, a photo and date of birth. The photo comes
 *              from the student's profile when they already have one; otherwise
 *              they add one here, and it becomes their profile photo too.
 */
import { useContext, useRef, useState } from 'react';
import { ShieldCheck, Linkedin, Camera, CalendarDays, Loader2, CheckCircle2, Upload, ArrowRight, Smartphone } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import api from '../utils/api';
import { jobsApi } from './api';
import { aadhaarDigits, formatAadhaar, isValidAadhaar } from './aadhaar';
import { FIELD_LABEL, FIELD_INPUT, FIELD_OK, FIELD_BAD } from './ui';

const MIN_AGE = 14;

const maxDob = () => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - MIN_AGE);
    return d.toISOString().slice(0, 10);
};

const mobileDigits = (raw) => String(raw || '').replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '').replace(/^0(?=\d{10}$)/, '').slice(0, 10);

export default function JobsVerificationGate({ profilePhoto, profilePhone, previous, onVerified }) {
    const { user, setUser } = useContext(AuthContext);
    const [aadhaar, setAadhaar] = useState('');
    const [linkedinUrl, setLinkedinUrl] = useState(previous?.linkedinUrl || '');
    const [dateOfBirth, setDateOfBirth] = useState(() => (previous?.dateOfBirth ? String(previous.dateOfBirth).slice(0, 10) : ''));
    const [mobile, setMobile] = useState(() => mobileDigits(profilePhone || user?.phone || ''));
    const [photo, setPhoto] = useState(profilePhoto || user?.profilePicture || null);
    const [uploading, setUploading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [problems, setProblems] = useState({});
    const [error, setError] = useState('');
    const fileRef = useRef(null);

    const aadhaarOk = isValidAadhaar(aadhaar);
    const linkedinOk = /^(?:https?:\/\/)?(?:[a-z]{2,3}\.)?linkedin\.com\/in\/[A-Za-z0-9\-_%]{3,100}\/?$/i.test(linkedinUrl.trim());
    const dobOk = !!dateOfBirth && dateOfBirth <= maxDob();
    const mobileOk = /^[6-9]\d{9}$/.test(mobile);
    const ready = aadhaarOk && linkedinOk && dobOk && mobileOk && !!photo && !uploading && !submitting;

    const state = (ok, touched) => (!touched ? '' : ok ? FIELD_OK : FIELD_BAD);

    /** Shrinks a photo to a 900px JPEG so a phone camera shot does not trip the
     *  server's 5 MB limit; anything the browser cannot decode is sent as it is. */
    const shrink = (file) => new Promise((resolve) => {
        if (!file.type.startsWith('image/') || file.size < 400 * 1024) return resolve(file);
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            const max = 900;
            const scale = Math.min(1, max / Math.max(img.width, img.height));
            const canvas = document.createElement('canvas');
            canvas.width = Math.round(img.width * scale);
            canvas.height = Math.round(img.height * scale);
            canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
            URL.revokeObjectURL(url);
            canvas.toBlob((blob) => resolve(blob ? new File([blob], 'photo.jpg', { type: 'image/jpeg' }) : file), 'image/jpeg', 0.85);
        };
        img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
        img.src = url;
    });

    const uploadPhoto = (file) => {
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            setProblems((p) => ({ ...p, photo: 'Choose an image file (JPG or PNG).' }));
            return;
        }
        setUploading(true);
        setProblems((p) => ({ ...p, photo: undefined }));
        shrink(file)
            .then((ready) => {
                const fd = new FormData();
                fd.append('profilePicture', ready, ready.name || 'photo.jpg');
                return api.post('/user/profile/picture', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
            })
            .then((res) => {
                const profilePicture = res.data.profilePicture;
                setPhoto(profilePicture);
                // It is the profile photo now as well, so the header and profile agree.
                const updated = { ...user, profilePicture };
                setUser(updated);
                try { localStorage.setItem('studentData', JSON.stringify(updated)); } catch { /* storage may be unavailable */ }
            })
            .catch((err) => {
                const reason = err.response?.data?.message || err.response?.data?.error || err.message;
                setProblems((p) => ({ ...p, photo: `Could not upload that photo${reason ? ` (${reason})` : ''}. Try another.` }));
            })
            .finally(() => setUploading(false));
    };

    const submit = (e) => {
        e.preventDefault();
        if (!ready) return;
        setSubmitting(true);
        setError('');
        jobsApi.verificationSubmit({ aadhaar: aadhaarDigits(aadhaar), linkedinUrl: linkedinUrl.trim(), dateOfBirth, mobile })
            .then((r) => onVerified(r))
            .catch((err) => {
                setProblems(err.problems || {});
                setError(err.message || 'Could not save. Try again.');
            })
            .finally(() => setSubmitting(false));
    };

    return (
        <div className="animate-fade-in-up mx-auto max-w-2xl">
            <form onSubmit={submit} className="relative overflow-hidden rounded-3xl border border-indigo-100 bg-white p-6 shadow-sm sm:p-8">
                <span aria-hidden="true" className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-indigo-100/70 blur-2xl" />
                <div className="relative mb-6 flex items-start gap-4">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-200">
                        <ShieldCheck size={24} />
                    </span>
                    <div>
                        <h2 className="text-xl font-extrabold text-slate-900">Verify before you search</h2>
                        <p className="mt-1 text-sm text-slate-500">
                            {previous
                                ? `Welcome back. Confirm your Aadhaar number to open the job board — last verified ending ${previous.aadhaarLast4}.`
                                : 'Employers see real people. This takes a minute each time you open Jobs.'}
                        </p>
                    </div>
                </div>

                <div className="relative grid gap-5 sm:grid-cols-2">
                    {/* Photo */}
                    <div className="sm:col-span-2">
                        <span className={FIELD_LABEL}><Camera size={14} className="inline -mt-0.5 mr-1" /> Your photo</span>
                        <div className="mt-2 flex items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white ring-2 ring-indigo-100">
                                {photo ? <img src={photo} alt="" className="h-full w-full object-cover" /> : <Camera size={26} className="text-slate-300" />}
                            </div>
                            <div className="min-w-0 flex-1">
                                {photo ? (
                                    <p className="flex items-center gap-1.5 text-sm font-semibold text-emerald-700"><CheckCircle2 size={16} /> Using your profile photo</p>
                                ) : (
                                    <p className="text-sm font-semibold text-slate-700">No photo on your profile yet</p>
                                )}
                                <p className="mt-0.5 text-xs text-slate-500">{photo ? 'Want a different one? Upload it and your profile updates too.' : 'Add a clear photo of your face. It becomes your profile photo as well.'}</p>
                                {problems.photo && <p className="mt-1 text-xs font-semibold text-rose-600">{problems.photo}</p>}
                            </div>
                            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => uploadPhoto(e.target.files?.[0])} />
                            <button
                                type="button"
                                onClick={() => fileRef.current?.click()}
                                disabled={uploading}
                                className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-indigo-200 bg-white px-3.5 py-2 text-sm font-bold text-indigo-600 transition-colors hover:bg-indigo-50 disabled:opacity-60"
                            >
                                {uploading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
                                {photo ? 'Change' : 'Upload'}
                            </button>
                        </div>
                    </div>

                    {/* Aadhaar */}
                    <div>
                        <label className={FIELD_LABEL} htmlFor="jv-aadhaar"><ShieldCheck size={14} className="inline -mt-0.5 mr-1" /> Aadhaar number</label>
                        <input
                            id="jv-aadhaar"
                            inputMode="numeric"
                            autoComplete="off"
                            placeholder="1234 5678 9012"
                            value={formatAadhaar(aadhaar)}
                            onChange={(e) => { setAadhaar(aadhaarDigits(e.target.value)); setProblems((p) => ({ ...p, aadhaar: undefined })); }}
                            className={`${FIELD_INPUT} ${state(aadhaarOk, aadhaar.length === 12 || problems.aadhaar)} tracking-widest`}
                        />
                        <p className="mt-1 text-xs text-slate-500">
                            {problems.aadhaar
                                ? <span className="font-semibold text-rose-600">{problems.aadhaar}</span>
                                : aadhaar.length === 12 && !aadhaarOk
                                    ? <span className="font-semibold text-rose-600">That number does not check out. Compare it with your card.</span>
                                    : 'We keep only the last 4 digits and a fingerprint of the number, never the number itself.'}
                        </p>
                    </div>

                    {/* Date of birth */}
                    <div>
                        <label className={FIELD_LABEL} htmlFor="jv-dob"><CalendarDays size={14} className="inline -mt-0.5 mr-1" /> Date of birth</label>
                        <input
                            id="jv-dob"
                            type="date"
                            max={maxDob()}
                            value={dateOfBirth}
                            onChange={(e) => { setDateOfBirth(e.target.value); setProblems((p) => ({ ...p, dateOfBirth: undefined })); }}
                            className={`${FIELD_INPUT} ${state(dobOk, !!dateOfBirth || problems.dateOfBirth)}`}
                        />
                        <p className="mt-1 text-xs text-slate-500">
                            {problems.dateOfBirth
                                ? <span className="font-semibold text-rose-600">{problems.dateOfBirth}</span>
                                : `You need to be at least ${MIN_AGE}.`}
                        </p>
                    </div>

                    {/* Mobile */}
                    <div className="sm:col-span-2">
                        <label className={FIELD_LABEL} htmlFor="jv-mobile"><Smartphone size={14} className="inline -mt-0.5 mr-1" /> Mobile number</label>
                        <div className={`${FIELD_INPUT} flex items-center gap-2 p-0 ${state(mobileOk, mobile.length === 10 || problems.mobile)}`}>
                            <span className="pl-4 text-sm font-bold text-slate-500">+91</span>
                            <input
                                id="jv-mobile"
                                inputMode="numeric"
                                autoComplete="tel-national"
                                placeholder="98765 43210"
                                value={mobile}
                                onChange={(e) => { setMobile(mobileDigits(e.target.value)); setProblems((p) => ({ ...p, mobile: undefined })); }}
                                className="w-full bg-transparent py-3 pr-4 tracking-wider outline-none"
                            />
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                            {problems.mobile
                                ? <span className="font-semibold text-rose-600">{problems.mobile}</span>
                                : mobile.length === 10 && !mobileOk
                                    ? <span className="font-semibold text-rose-600">Indian mobile numbers start with 6, 7, 8 or 9.</span>
                                    : 'Your verification confirmation is sent to this number by SMS.'}
                        </p>
                    </div>

                    {/* LinkedIn */}
                    <div className="sm:col-span-2">
                        <label className={FIELD_LABEL} htmlFor="jv-linkedin"><Linkedin size={14} className="inline -mt-0.5 mr-1" /> LinkedIn profile</label>
                        <input
                            id="jv-linkedin"
                            type="text"
                            autoComplete="off"
                            placeholder="linkedin.com/in/your-name"
                            value={linkedinUrl}
                            onChange={(e) => { setLinkedinUrl(e.target.value); setProblems((p) => ({ ...p, linkedinUrl: undefined })); }}
                            className={`${FIELD_INPUT} ${state(linkedinOk, !!linkedinUrl || problems.linkedinUrl)}`}
                        />
                        <p className="mt-1 text-xs text-slate-500">
                            {problems.linkedinUrl
                                ? <span className="font-semibold text-rose-600">{problems.linkedinUrl}</span>
                                : linkedinUrl && !linkedinOk
                                    ? <span className="font-semibold text-rose-600">That is not a profile link. It looks like linkedin.com/in/your-name</span>
                                    : 'Open LinkedIn, tap your profile, copy the link from the address bar. With or without https:// is fine.'}
                        </p>
                    </div>
                </div>

                {error && <p className="relative mt-4 rounded-xl bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700">{error}</p>}

                <button
                    type="submit"
                    disabled={!ready}
                    className="relative mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 py-3.5 text-base font-bold text-white shadow-lg shadow-indigo-500/25 transition-all hover:from-indigo-700 hover:to-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {submitting ? <Loader2 size={18} className="animate-spin" /> : <ShieldCheck size={18} />}
                    Verify and open Jobs
                    <ArrowRight size={18} />
                </button>
            </form>
        </div>
    );
}
