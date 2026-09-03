import React, { useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../utils/api';
import CertificatesFrame from '../components/CertificatesFrame';
import ResumeSection from '../components/ResumeSection';
import Cropper from 'react-easy-crop';
import {
    CreditCard, Mail, Phone, Award, Loader2, Edit2, Check, X, Camera, ZoomIn, ZoomOut, Compass, ArrowRight,
    Flame, Gem, Coins, BookOpen, PlayCircle, CalendarDays
} from 'lucide-react';
import { levelProgress, currentStreak, recentActivity } from '../career/utils/progress';
import { StatTile, ProgressRing, ActivityStrip, SpeechBubble } from '../components/ProfileWidgets';
import ProfileHeroArt from '../components/ProfileHeroArt';

// Helper: convert crop area to a cropped blob
const getCroppedBlob = (imageSrc, pixelCrop) =>
    new Promise((resolve) => {
        const image = new Image();
        image.src = imageSrc;
        image.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = pixelCrop.width;
            canvas.height = pixelCrop.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(image, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, pixelCrop.width, pixelCrop.height);
            canvas.toBlob(resolve, 'image/jpeg', 0.92);
        };
    });

const Profile = () => {
    const { user, setUser, isCareerPathEnabled } = useContext(AuthContext);
    const [certificates, setCertificates] = useState([]);
    // Career Path standing. Fetched here so the profile shows one student rather
    // than two: credits are earned in courses, XP and levels in Career Path, and
    // until now neither page mentioned the other's existence.
    const [career, setCareer] = useState(null);
    // Courses with progress, for "continue where you left off"; Career Path
    // task history, for the streak and the week's activity dots.
    const [courses, setCourses] = useState([]);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [downloadingId, setDownloadingId] = useState(null);
    const [certError, setCertError] = useState(null);

    // Edit mode
    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState({ name: '', email: '', phone: '' });
    const [formErrors, setFormErrors] = useState({});
    const [saving, setSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    // Profile picture
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const photoInputRef = useRef(null);

    // Photo viewer
    const [viewingPhoto, setViewingPhoto] = useState(false);

    // Crop modal
    const [cropSrc, setCropSrc] = useState(null);       // raw data URL of selected image
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
    const onCropComplete = useCallback((_, pixels) => setCroppedAreaPixels(pixels), []);

    useEffect(() => {
        const fetchCertificates = async () => {
            try {
                api.get('/user/profile')
                    .then(r => setCareer(r.data?.user || null))
                    .catch(() => setCareer(null));
                api.get('/user/courses')
                    .then(r => setCourses(Array.isArray(r.data?.courses) ? r.data.courses : []))
                    .catch(() => setCourses([]));
                if (isCareerPathEnabled) {
                    api.get('/career/tasks/history')
                        .then(r => setHistory(Array.isArray(r.data) ? r.data : []))
                        .catch(() => setHistory([]));
                }
                const res = await api.get('/certificates');
                setCertificates(res.data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchCertificates();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const openEdit = () => {
        setForm({ name: user?.name || '', email: user?.email || '', phone: user?.phone || '' });
        setFormErrors({});
        setSaveSuccess(false);
        setEditing(true);
    };

    const validate = () => {
        const errors = {};
        if (!form.name.trim()) errors.name = 'Name is required';
        else if (form.name.trim().length < 2) errors.name = 'Name must be at least 2 characters';
        else if (form.name.trim().length > 60) errors.name = 'Name must be 60 characters or less';

        if (!form.email.trim()) errors.email = 'Email is required';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = 'Enter a valid email address (e.g. name@domain.com)';

        if (!form.phone.trim()) errors.phone = 'Phone number is required';
        else {
            // Strip all non-digit characters to count digits
            const digits = form.phone.replace(/\D/g, '');
            if (digits.length < 7 || digits.length > 15) errors.phone = 'Phone must be 7–15 digits (international format supported, e.g. +91 98765 43210)';
        }

        return errors;
    };

    const handleSave = async () => {
        const errors = validate();
        if (Object.keys(errors).length > 0) { setFormErrors(errors); return; }
        setSaving(true);
        try {
            const res = await api.put('/user/profile', {
                name: form.name.trim(),
                email: form.email.trim(),
                phone: form.phone.trim(),
            });
            const updated = { ...user, ...res.data };
            setUser(updated);
            localStorage.setItem('studentData', JSON.stringify(updated));
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
            setEditing(false);
        } catch (err) {
            setFormErrors({ api: err.response?.data?.message || 'Failed to save. Please try again.' });
        } finally {
            setSaving(false);
        }
    };

    // Step 1: user picks a file → open crop modal
    const handlePhotoSelect = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) { alert('Please select an image file.'); return; }
        if (file.size > 10 * 1024 * 1024) { alert('Image must be under 10MB.'); return; }
        const reader = new FileReader();
        reader.onload = () => { setCropSrc(reader.result); setCrop({ x: 0, y: 0 }); setZoom(1); };
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    // Step 2: user confirms crop → send cropped blob to backend → Cloudinary → MongoDB
    const handleCropConfirm = async () => {
        if (!croppedAreaPixels || !cropSrc) return;
        setUploadingPhoto(true);
        setCropSrc(null);
        try {
            const blob = await getCroppedBlob(cropSrc, croppedAreaPixels);
            const fd = new FormData();
            fd.append('profilePicture', blob, 'profile.jpg');
            // POST to our backend — it uploads to Cloudinary and saves URL to MongoDB
            const res = await api.post('/user/profile/picture', fd, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            const profilePicture = res.data.profilePicture;
            const updated = { ...user, profilePicture };
            setUser(updated);
            localStorage.setItem('studentData', JSON.stringify(updated));
        } catch {
            alert('Failed to upload photo. Please try again.');
        } finally {
            setUploadingPhoto(false);
        }
    };

    const handleDownloadCertificate = async (cert) => {
        setDownloadingId(cert._id);
        setCertError(null);
        try {
            const res = await api.post(
                '/certificates/generate',
                { courseId: cert.courseId?._id || cert.courseId },
                { responseType: 'blob' }
            );
            const blob = new Blob([res.data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `Certificate_${(cert.courseId?.title || 'Course').replace(/\s+/g, '_')}.pdf`;
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch {
            setCertError('Failed to download certificate. Please try again.');
        } finally {
            setDownloadingId(null);
        }
    };

    const getInitials = (name = '') =>
        name.trim().split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';

    const firstName = (user?.name || 'there').trim().split(' ')[0];
    const level = Math.max(1, Number(career?.level) || 1);
    const xp = Number(career?.xp) || 0;
    const ring = levelProgress(xp, level);
    const streak = useMemo(() => currentStreak(history), [history]);
    const week = useMemo(() => recentActivity(history, 7).map((d) => ({ ...d, dayNum: Number(d.key.slice(-2)) })), [history]);
    const activeThisWeek = week.filter((d) => d.active).length;
    const inProgress = useMemo(() => courses
        .filter((c) => c.progress > 0 && c.progress < 100)
        .sort((a, b) => b.progress - a.progress)
        .slice(0, 3), [courses]);
    const completedCourses = courses.filter((c) => c.progress >= 100).length;
    const hour = new Date().getHours();
    const dayGreeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

    /* What the mascot says: the streak when there is one, the next level
       when there isn't, a nudge when nothing has started. */
    const bubble = streak >= 2
        ? <>You&apos;re on fire! 🔥 Keep the <strong>{streak}-day</strong> streak going!</>
        : inProgress[0]
            ? <>Pick up <strong>{inProgress[0].title}</strong> — you&apos;re {inProgress[0].progress}% of the way there.</>
            : xp > 0
                ? <><strong>{ring.remaining} XP</strong> to level {ring.nextLevel}. One task today does it.</>
                : <>Welcome! Start a course today and your first certificate is on its way. ✨</>;

    return (
        <div className="space-y-6 animate-fade-in relative z-0 w-full">
            {/* Floating success toast */}
            {saveSuccess && (
                <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[200] bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-xl font-bold text-sm flex items-center gap-2">
                    <Check size={16} /> Profile updated successfully!
                </div>
            )}
            {/* ── Hero: greeting, avatar, mascot line, contact ─────────── */}
            <div className="sheen relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-500 p-6 text-white shadow-xl shadow-indigo-200 sm:p-8">
                <div aria-hidden="true" className="drift pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/15 blur-2xl" />
                <div aria-hidden="true" className="pointer-events-none absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-fuchsia-300/30 blur-3xl" />
                <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgb(255_255_255/0.12)_1px,transparent_1px)] bg-[size:20px_20px] [mask-image:radial-gradient(ellipse_at_top_left,black,transparent_70%)]" />
                <span aria-hidden="true" className="absolute right-10 top-6 text-xl text-amber-200">✦</span>
                <span aria-hidden="true" className="absolute right-24 top-16 text-sm text-white/70">✦</span>

                {/* The illustration bleeds to the card's right edge; the text keeps clear of it on wide screens. */}
                <ProfileHeroArt className="pointer-events-none absolute -bottom-2 right-0 hidden h-[calc(100%+8px)] w-auto lg:block animate-fade-in" />

                <div className="relative flex flex-col gap-6 md:flex-row md:items-start lg:pr-[300px] xl:pr-[340px]">
                    {/* Avatar with a slowly turning ring */}
                    <div className="relative mx-auto shrink-0 md:mx-0">
                        <div className="profile-ring rounded-full p-1">
                            <div
                                className="h-28 w-28 cursor-pointer overflow-hidden rounded-full border-4 border-white bg-indigo-100 shadow-lg sm:h-32 sm:w-32"
                                onClick={() => user?.profilePicture && setViewingPhoto(true)}
                                title={user?.profilePicture ? 'Click to view photo' : ''}
                            >
                                {user?.profilePicture ? (
                                    <img src={user.profilePicture} alt={user.name} className="h-full w-full object-cover transition-opacity hover:opacity-90" />
                                ) : (
                                    <span className="flex h-full w-full items-center justify-center text-3xl font-black text-indigo-600">{getInitials(user?.name)}</span>
                                )}
                            </div>
                        </div>
                        <button
                            onClick={() => photoInputRef.current?.click()}
                            disabled={uploadingPhoto}
                            className="absolute bottom-1 right-1 flex h-9 w-9 items-center justify-center rounded-full bg-white text-indigo-600 shadow-md transition-transform hover:scale-110 disabled:opacity-60"
                            title="Change photo" aria-label="Change photo"
                        >
                            {uploadingPhoto ? <Loader2 size={15} className="animate-spin" /> : <Camera size={15} />}
                        </button>
                        <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoSelect} />
                        <span className="absolute -left-2 top-2 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-950 shadow">Lv {level}</span>
                    </div>

                    <div className="min-w-0 flex-1">
                        {!editing ? (
                            <>
                                <p className="text-sm font-semibold text-indigo-100">{dayGreeting} 👋</p>
                                <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
                                    <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Hello, {firstName}!</h1>
                                    <button
                                        onClick={openEdit}
                                        className="inline-flex items-center gap-1.5 rounded-xl bg-white/15 px-4 py-2 text-sm font-bold text-white ring-1 ring-white/30 backdrop-blur transition-colors hover:bg-white/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                                    >
                                        <Edit2 size={14} /> Edit Profile
                                    </button>
                                </div>
                                <div className="mt-4 text-slate-900"><SpeechBubble>{bubble}</SpeechBubble></div>
                                <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold">
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 ring-1 ring-white/25"><CreditCard size={13} /> <span className="font-mono">{user?.cardNumber}</span></span>
                                    <span className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 ring-1 ring-white/25"><Mail size={13} /> <span className="truncate">{user?.email || 'No email yet'}</span></span>
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 ring-1 ring-white/25"><Phone size={13} /> {user?.phone || 'No phone yet'}</span>
                                </div>
                            </>
                        ) : (
                            <div className="w-full space-y-4 rounded-2xl bg-white p-5 text-slate-800 shadow-lg animate-pop-in">
                                <div className="mb-1 flex items-center justify-between">
                                    <h2 className="font-bold text-slate-800">Edit Profile</h2>
                                    <button onClick={() => setEditing(false)} className="p-1 text-slate-400 hover:text-slate-600" aria-label="Close"><X size={18} /></button>
                                </div>

                                {formErrors.api && (
                                    <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{formErrors.api}</div>
                                )}

                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div>
                                        <label className="mb-1 block text-xs font-bold text-slate-600">Full Name <span className="text-red-500">*</span></label>
                                        <input type="text" maxLength={60} value={form.name}
                                            onChange={e => { setForm(p => ({ ...p, name: e.target.value })); setFormErrors(p => ({ ...p, name: '' })); }}
                                            className={`w-full rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 ${formErrors.name ? 'border-red-400' : 'border-slate-300'}`}
                                            placeholder="Your full name" />
                                        {formErrors.name && <p className="mt-1 text-xs text-red-500">{formErrors.name}</p>}
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-xs font-bold text-slate-600">Email Address <span className="text-red-500">*</span></label>
                                        <input type="email" value={form.email}
                                            onChange={e => { setForm(p => ({ ...p, email: e.target.value })); setFormErrors(p => ({ ...p, email: '' })); }}
                                            className={`w-full rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 ${formErrors.email ? 'border-red-400' : 'border-slate-300'}`}
                                            placeholder="you@example.com" />
                                        {formErrors.email && <p className="mt-1 text-xs text-red-500">{formErrors.email}</p>}
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-xs font-bold text-slate-600">Phone Number <span className="text-red-500">*</span></label>
                                        <input type="tel" value={form.phone} maxLength={16}
                                            onChange={e => { setForm(p => ({ ...p, phone: e.target.value })); setFormErrors(p => ({ ...p, phone: '' })); }}
                                            className={`w-full rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 ${formErrors.phone ? 'border-red-400' : 'border-slate-300'}`}
                                            placeholder="+91 98765 43210" />
                                        {formErrors.phone && <p className="mt-1 text-xs text-red-500">{formErrors.phone}</p>}
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-xs font-bold text-slate-600">Student Card ID <span className="font-normal text-slate-400">(not editable)</span></label>
                                        <input type="text" value={user?.cardNumber || ''} readOnly
                                            className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-sm text-slate-500" />
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-1">
                                    <button onClick={() => setEditing(false)} className="flex-1 rounded-xl border border-slate-200 py-2 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50">Cancel</button>
                                    <button onClick={handleSave} disabled={saving}
                                        className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2 text-sm font-bold text-white transition-colors hover:bg-indigo-700 disabled:opacity-60">
                                        {saving ? <><Loader2 size={14} className="animate-spin" /> Saving...</> : <><Check size={14} /> Save Changes</>}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Stat tiles ───────────────────────────────────────────── */}
            <div className="stagger grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                <StatTile tone="amber" icon={Coins} value={xp} label="Current XP" sub={`${ring.remaining} XP to level ${ring.nextLevel}`} emoji="🪙" to={isCareerPathEnabled ? '/career' : undefined} />
                <StatTile tone="sky" icon={Gem} value={level} label="Your level" sub={isCareerPathEnabled ? 'From Career Path tasks' : 'Levels come from Career Path'} percent={ring.percent} to={isCareerPathEnabled ? '/career' : undefined} />
                <StatTile tone="orange" icon={Flame} value={streak} suffix={streak === 1 ? ' day' : ' days'} label="Streak" sub={streak ? 'Keep it alive today' : 'Finish a task to start one'} emoji="🔥" to={isCareerPathEnabled ? '/career/planner' : undefined} />
                <StatTile tone="rose" icon={Award} value={user?.credits || 0} label="Credits" sub="Earned from course quizzes" emoji="🏅" />
            </div>

            {/* ── Continue learning + this week ────────────────────────── */}
            <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="mb-4 flex items-center justify-between gap-3">
                        <div>
                            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900"><BookOpen size={18} className="text-indigo-500" /> Course progress</h2>
                            <p className="text-sm text-slate-500">Continue where you left off</p>
                        </div>
                        <Link to="/enrolled-courses" className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 transition-colors hover:border-indigo-300 hover:text-indigo-600">
                            All courses <ArrowRight size={13} />
                        </Link>
                    </div>
                    {inProgress.length ? (
                        <ul className="stagger space-y-3">
                            {inProgress.map((c, i) => (
                                <li key={c._id} className="group flex items-center gap-4 rounded-2xl border border-slate-100 bg-slate-50/60 p-3 transition-all hover:-translate-y-0.5 hover:border-indigo-200 hover:bg-white hover:shadow-md">
                                    <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-base font-black text-white shadow-md ${['bg-indigo-500', 'bg-fuchsia-500', 'bg-sky-500'][i % 3]}`}>
                                        {getInitials(c.title)}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate font-bold text-slate-800">{c.title}</p>
                                        <p className="text-xs text-slate-500">{c.completedLessons || 0} lesson{c.completedLessons === 1 ? '' : 's'} done · {c.progress}% complete</p>
                                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200">
                                            <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500 transition-[width] duration-1000 ease-out" style={{ width: `${c.progress}%` }} />
                                        </div>
                                    </div>
                                    <ProgressRing percent={c.progress} size={48} stroke={5} label={`${c.progress}% complete`}>
                                        <span className="text-[11px] font-black tabular-nums text-slate-700">{c.progress}%</span>
                                    </ProgressRing>
                                    <Link to={`/learn/${c._id}`} className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white shadow-md shadow-indigo-200 transition-all hover:bg-indigo-700 group-hover:translate-x-0.5">
                                        <PlayCircle size={14} /> Continue
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-200 p-6 text-center sm:flex-row sm:text-left">
                            <span className="text-4xl drift" aria-hidden="true">🚀</span>
                            <div className="flex-1">
                                <p className="font-bold text-slate-800">{completedCourses ? 'Everything you started is finished!' : 'Nothing in progress yet'}</p>
                                <p className="text-sm text-slate-500">{completedCourses ? `${completedCourses} course${completedCourses === 1 ? '' : 's'} completed — start the next one.` : 'Pick a course and your progress shows up here.'}</p>
                            </div>
                            <Link to="/enrolled-courses" className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700">Browse courses <ArrowRight size={14} /></Link>
                        </div>
                    )}
                </div>

                <div className="relative overflow-hidden rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-orange-50 p-5 shadow-sm">
                    <span aria-hidden="true" className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-amber-200/50 blur-2xl" />
                    <div className="relative">
                        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900"><CalendarDays size={18} className="text-amber-500" /> Weekly activity</h2>
                        <p className="mb-4 text-sm text-slate-500">{isCareerPathEnabled ? `${activeThisWeek} active day${activeThisWeek === 1 ? '' : 's'} this week` : 'Turn on Career Path to track daily activity'}</p>
                        <ActivityStrip days={week} />
                        <div className="mt-5 grid grid-cols-3 gap-2 text-center">
                            <div className="rounded-xl bg-white/80 p-2 ring-1 ring-amber-100"><p className="text-lg font-black text-slate-900">{streak}</p><p className="text-[11px] font-semibold text-slate-500">🔥 Streak</p></div>
                            <div className="rounded-xl bg-white/80 p-2 ring-1 ring-amber-100"><p className="text-lg font-black text-slate-900">{completedCourses}</p><p className="text-[11px] font-semibold text-slate-500">🎓 Completed</p></div>
                            <div className="rounded-xl bg-white/80 p-2 ring-1 ring-amber-100"><p className="text-lg font-black text-slate-900">{certificates.length}</p><p className="text-[11px] font-semibold text-slate-500">🏆 Certificates</p></div>
                        </div>
                        {isCareerPathEnabled && (
                            <Link to="/career" className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-slate-900 py-2.5 text-sm font-bold text-white transition-colors hover:bg-slate-800">
                                <Compass size={15} /> Open Career Path <ArrowRight size={14} />
                            </Link>
                        )}
                    </div>
                </div>
            </div>

            {/* Certificates — course-issued and uploaded, in one frame */}
            <CertificatesFrame
                certificates={certificates}
                loading={loading}
                certError={certError}
                downloadingId={downloadingId}
                onDownload={handleDownloadCertificate}
            />

            {/* Resume — the uploaded file, and the ATS resume built from courses */}
            <ResumeSection />

            {/* ── Photo Viewer Modal ── */}
            {viewingPhoto && user?.profilePicture && (
                <div
                    className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
                    onClick={() => setViewingPhoto(false)}
                >
                    <div className="relative max-w-sm w-full" onClick={e => e.stopPropagation()}>
                        <img
                            src={user.profilePicture}
                            alt={user.name}
                            className="w-full rounded-2xl shadow-2xl object-cover"
                        />
                        <button
                            onClick={() => setViewingPhoto(false)}
                            className="absolute top-3 right-3 w-8 h-8 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center transition-colors"
                        >
                            <X size={16} />
                        </button>
                        <p className="text-center text-white/70 text-sm mt-3 font-medium">{user.name}</p>
                    </div>
                </div>
            )}

            {/* ── Crop Modal ── */}
            {cropSrc && (
                <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                            <h3 className="font-bold text-slate-800">Crop Photo</h3>
                            <button onClick={() => setCropSrc(null)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
                        </div>

                        {/* Crop area */}
                        <div className="relative w-full bg-slate-900" style={{ height: 300 }}>
                            <Cropper
                                image={cropSrc}
                                crop={crop}
                                zoom={zoom}
                                aspect={1}
                                cropShape="round"
                                showGrid={false}
                                onCropChange={setCrop}
                                onZoomChange={setZoom}
                                onCropComplete={onCropComplete}
                            />
                        </div>

                        {/* Zoom slider */}
                        <div className="px-5 py-3 flex items-center gap-3 border-t border-slate-100">
                            <ZoomOut size={16} className="text-slate-400 flex-shrink-0" />
                            <input
                                type="range" min={1} max={3} step={0.05}
                                value={zoom}
                                onChange={e => setZoom(Number(e.target.value))}
                                className="flex-1 accent-indigo-600"
                            />
                            <ZoomIn size={16} className="text-slate-400 flex-shrink-0" />
                        </div>

                        <div className="flex gap-3 px-5 pb-5">
                            <button
                                onClick={() => setCropSrc(null)}
                                className="flex-1 py-2.5 border border-slate-200 text-slate-600 font-bold rounded-xl text-sm hover:bg-slate-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCropConfirm}
                                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
                            >
                                <Check size={14} /> Apply & Upload
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Profile;
