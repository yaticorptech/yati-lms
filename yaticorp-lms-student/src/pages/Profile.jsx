import React, { useContext, useState, useEffect, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../utils/api';
import saveToDrive from '../integrations/google/saveToDrive';
import CertificatesFrame from '../components/CertificatesFrame';
import ResumeSection from '../components/ResumeSection';
import AiKeySettings from '../components/AiKeySettings';
import GoogleConnectionCard from '../integrations/google/GoogleConnectionCard';
import {
    Award, Loader2, Check, X,
    Flame, Gem, Coins, CalendarDays, Building2
} from 'lucide-react';
import { currentStreak, recentActivity } from '../career/utils/progress';
import useLevelProgress from '../career/context/useLevelProgress';
import { StatTile, ProgressRing, ActivityStrip } from '../components/ProfileWidgets';
import WelcomeBanner from '../components/WelcomeBanner';
import PersonalInfoCard from '../components/PersonalInfoCard';
import DashboardCourses from './Dashboard';
import { useDashboard } from '../shared/hooks/useDashboard';
import { useRewards } from '../context/useRewards';
import ProgressCard from '../components/rewards/ProgressCard';
import LeaderboardCard from '../components/rewards/LeaderboardCard';
import WalletCard from '../components/rewards/WalletCard';
import Portal from '../components/Portal';
import { saveBlob } from '../native/saveFile';
import { pictureUrl } from '../native/pictures';
import { isShortOfFunds, serverMessage } from '../utils/walletCharge';
import PhotoPicker from '../components/PhotoPicker';

/**
 * The Dashboard and My Profile are two pages drawn by this one component,
 * because they share everything underneath: the student's details, the edit
 * form, the photo picker and cropper, and the same data fetches. `view` picks
 * the sections.
 *
 *   dashboard — a welcome banner (photo, level, greeting, progress to the
 *               next level), then Leaderboard, Wallet & Rewards and My Learning.
 *   profile   — Personal Information (photo, the student's details and Edit
 *               Profile), then Your Progress, My Certificates, Your Resume, Your Google account and
 *               Your Own AI Key.
 */
const Profile = ({ view = 'dashboard' }) => {
    const onProfile = view === 'profile';
    // Set by signup when an Organization ID was given: shown once, on the dashboard.
    const [signupOrg, setSignupOrg] = useState(() => {
        try { const v = sessionStorage.getItem('yati.signupOrg'); sessionStorage.removeItem('yati.signupOrg'); return v ? JSON.parse(v) : null; } catch { return null; }
    });
    const { user, setUser, isCareerPathEnabled } = useContext(AuthContext);
    // Streak, XP, rank, badges and wallet from the rewards system. Null while
    // loading or when an admin has locked the section; the page then falls
    // back to the Career Path numbers it always showed.
    const rewards = useRewards();
    const rw = rewards.enabled ? rewards.summary : null;
    // The stat cards link to #leaderboard / #wallet on this page; client-side
    // routing does not scroll to a hash on its own.
    const { hash } = useLocation();
    useEffect(() => {
        if (!hash) return;
        const el = document.getElementById(hash.slice(1));
        if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150);
    }, [hash, rw]);
    const [certificates, setCertificates] = useState([]);
    // Career Path standing. Fetched here so the profile shows one student rather
    // than two: credits are earned in courses, XP and levels in Career Path, and
    // until now neither page mentioned the other's existence.
    const [career, setCareer] = useState(null);
    // Courses with progress, for "continue where you left off"; Career Path
    // task history, for the streak and the week's activity dots.
    // The course data the Dashboard used to own. The page is the two merged,
    // so one hook feeds "Your Progress", the continue card, the leaderboard's
    // course filter and the course tabs alike, refreshing every 30s as before.
    const dashboard = useDashboard(api);
    const courses = dashboard.courses;
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

    // Photo chooser (components/PhotoPicker): upload a photo, or pick a
    // ready-made avatar instead
    const [pickerOpen, setPickerOpen] = useState(false);

    // Photo viewer
    const [viewingPhoto, setViewingPhoto] = useState(false);

    useEffect(() => {
        const fetchCertificates = async () => {
            try {
                api.get('/user/profile')
                    .then(r => setCareer(r.data?.user || null))
                    .catch(() => setCareer(null));
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

    const openPicker = () => setPickerOpen(true);

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
            const fileName = `Certificate_${(cert.courseId?.title || 'Course').replace(/\s+/g, '_')}.pdf`;
            await saveBlob(blob, fileName, { title: 'Certificate' });

            // And a copy in their own Drive. Not awaited: the certificate is
            // already on their machine, and a filing failure is not a download
            // failure.
            saveToDrive(blob, {
                name: fileName,
                description: `Your certificate for ${cert.courseId?.title || 'a course'}, issued by YATICORP.`,
                reason: 'So the certificates you earn here are kept in your own Google Drive.'
            });
        } catch (e) {
            setCertError(isShortOfFunds(e) ? serverMessage(e) : 'Failed to download certificate. Please try again.');
        } finally {
            setDownloadingId(null);
        }
    };

    const firstName = (user?.name || 'there').trim().split(' ')[0];
    const level = Math.max(1, Number(career?.level) || 1);
    const xp = Number(career?.xp) || 0;
    const ring = useLevelProgress(xp, level);
    const careerStreak = useMemo(() => currentStreak(history), [history]);
    const streak = rw ? rw.streak.current : careerStreak;
    const week = useMemo(() => recentActivity(history, 7).map((d) => ({ ...d, dayNum: Number(d.key.slice(-2)) })), [history]);
    const activeThisWeek = week.filter((d) => d.active).length;
    const completedCourses = courses.filter((c) => c.progress >= 100).length;
    const hour = new Date().getHours();
    const dayGreeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

    // The weekly activity card. It lives on the Weekly activity tab of My
    // Learning now, so it is built here where its numbers are and passed down.
    const weeklyActivity = (
            <div className="relative overflow-hidden rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-orange-50 p-5 shadow-sm">
                <span aria-hidden="true" className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-amber-200/50 blur-2xl" />
                <div className="relative grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
                    <div>
                        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900"><CalendarDays size={18} className="text-amber-500" /> Weekly activity</h2>
                        <p className="mb-4 text-sm text-slate-500 lg:mb-3">{isCareerPathEnabled ? `${activeThisWeek} active day${activeThisWeek === 1 ? '' : 's'} this week` : 'Turn on Career Path to track daily activity'}</p>
                        <div className="max-w-md"><ActivityStrip days={week} /></div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center lg:w-72">
                        <div className="rounded-xl bg-white/80 p-2 ring-1 ring-amber-100"><p className="text-lg font-black text-slate-900">{streak}</p><p className="text-[11px] font-semibold text-slate-500">🔥 Streak</p></div>
                        <div className="rounded-xl bg-white/80 p-2 ring-1 ring-amber-100"><p className="text-lg font-black text-slate-900">{completedCourses}</p><p className="text-[11px] font-semibold text-slate-500">🎓 Completed</p></div>
                        <div className="rounded-xl bg-white/80 p-2 ring-1 ring-amber-100"><p className="text-lg font-black text-slate-900">{certificates.length}</p><p className="text-[11px] font-semibold text-slate-500">🏆 Certificates</p></div>
                    </div>
                </div>
            </div>
    );

    return (
        <div className="relative z-0 w-full space-y-6 pb-8 animate-fade-in">
            {/* Floating success toast */}
            {saveSuccess && (
                <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[200] bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-xl font-bold text-sm flex items-center gap-2">
                    <Check size={16} /> Profile updated successfully!
                </div>
            )}
            {/* ── The opening card ────────────────────────────────────────
                My Profile: Personal Information — the photo and its camera, the
                student's details, and Edit Profile.
                Dashboard: the welcome banner (components/WelcomeBanner).
                The details and the ways to change them are My Profile's, so the
                Dashboard does not repeat them. */}
            {onProfile ? (
                <>
                    <PersonalInfoCard
                        user={user}
                        level={level}
                        levelTo={isCareerPathEnabled ? '/career' : undefined}
                        editing={editing}
                        onEdit={openEdit}
                        onViewPhoto={() => setViewingPhoto(true)}
                        onChangePhoto={openPicker}
                    >
                        <div className="w-full space-y-4 text-slate-800 animate-pop-in">
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
                    </PersonalInfoCard>
                </>
            ) : (
                <>
                {signupOrg && (
                    <div className={`flex items-start gap-3 rounded-2xl border px-4 py-3 ${signupOrg.requested ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
                        <Building2 size={18} className={`mt-0.5 shrink-0 ${signupOrg.requested ? 'text-emerald-600' : 'text-amber-600'}`} />
                        <div className="min-w-0 flex-1 text-sm">
                            <p className="font-bold text-slate-800">Your account is ready</p>
                            {signupOrg.message && <p className="mt-0.5 text-slate-600">{signupOrg.message}</p>}
                            {!signupOrg.requested && <p className="mt-0.5 text-xs text-slate-500">Add it from <strong>My Profile → Personal Information → Organization/College</strong> whenever you have the right Organization ID.</p>}
                        </div>
                        <button type="button" onClick={() => setSignupOrg(null)} aria-label="Dismiss" className="shrink-0 rounded-lg p-1 text-slate-400 hover:bg-white hover:text-slate-600"><X size={16} /></button>
                    </div>
                )}
                <WelcomeBanner
                    name={user?.name || ''}
                    firstName={firstName}
                    photo={user?.profilePicture}
                    level={level}
                    greeting={dayGreeting}
                    greetingIcon={hour < 12 ? '☀️' : hour < 17 ? '🌤️' : '🌙'}
                    xpRemaining={ring.known ? ring.remaining : null}
                    percent={ring.percent}
                    xpTo={isCareerPathEnabled ? '/career' : undefined}
                    onViewPhoto={() => setViewingPhoto(true)}
                />
                </>
            )}

            {/* ── My Profile: Your Progress ─────────────────────────────── */}
            {/* Stat tiles (Career Path numbers, shown only when rewards are locked;
                otherwise the progress card carries them) */}
            {onProfile && !rw && (
            <div className="stagger grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                <StatTile tone="amber" icon={Coins} value={xp} label="Current XP" sub={`${ring.remaining} XP to level ${ring.nextLevel}`} emoji="🪙" to={isCareerPathEnabled ? '/career' : undefined} />
                <StatTile tone="sky" icon={Gem} value={level} label="Your level" sub={isCareerPathEnabled ? 'From Career Path tasks' : 'Levels come from Career Path'} percent={ring.percent} to={isCareerPathEnabled ? '/career' : undefined} />
                <StatTile tone="orange" icon={Flame} value={streak} suffix={streak === 1 ? ' day' : ' days'} label="Streak" sub={streak ? 'Keep it alive today' : 'Finish a task to start one'} emoji="🔥" to={isCareerPathEnabled ? '/career/planner' : undefined} />
                <StatTile tone="rose" icon={Award} value={user?.credits || 0} label="Credits" sub="Earned from course quizzes" emoji="🏅" />
            </div>
            )}

            {onProfile && rw && <ProgressCard summary={rw} courses={courses} />}

            {/* ── Dashboard: leaderboard beside wallet ──────────────────── */}
            {!onProfile && rw && (
                // grid-cols-1 is minmax(0, 1fr): without it the one phone
                // column is as wide as the leaderboard's content and runs it
                // off a narrow screen, where it could not shrink to fit.
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                    <LeaderboardCard />
                    <WalletCard />
                </div>
            )}

            {/* ── Dashboard: My Learning — the tabs, bundles and enrol flow ── */}
            {!onProfile && <DashboardCourses
                courses={dashboard.courses}
                bundles={dashboard.bundles}
                availableCourses={dashboard.availableCourses}
                loading={dashboard.loading}
                error={dashboard.error}
                buyingCourseId={dashboard.buyingCourseId}
                enrollCourse={dashboard.enrollCourse}
                refresh={dashboard.refresh}
                weeklyActivity={weeklyActivity}
            />}

            {/* ── My Profile: certificates — course-issued and uploaded ── */}
            {onProfile && (
                <CertificatesFrame
                    certificates={certificates}
                    loading={loading}
                    certError={certError}
                    downloadingId={downloadingId}
                    onDownload={handleDownloadCertificate}
                    onRemoved={(id) => setCertificates((rows) => rows.filter((c) => c._id !== id))}
                />
            )}

            {/* ── My Profile: resume — the uploaded file, and the ATS resume built from courses ── */}
            {onProfile && <ResumeSection />}

            {/* ── My Profile: the student's Google account, where their certificates,
                resume and exam dates can go. The same card as on the Calendar;
                Google sends them back to whichever page they connected from. ── */}
            {/* ── …and beside it, bring your own Gemini key for the AI features.
                Two small settings cards side by side on a laptop rather than two
                full-width panels; stacked on a phone. ── */}
            {onProfile && (
                // min-w-0 on each card: a grid item will not shrink below its
                // content otherwise, and a long Google address widened a phone
                // page past the screen.
                <div className="grid gap-4 lg:grid-cols-2 lg:items-start [&>*]:min-w-0">
                    <GoogleConnectionCard compact />
                    <AiKeySettings />
                </div>
            )}

            {/* ── Photo Viewer Modal ── */}
            {viewingPhoto && user?.profilePicture && (
                <Portal>
                    <div
                        className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
                        onClick={() => setViewingPhoto(false)}
                    >
                        <div className="relative max-w-sm w-full" onClick={e => e.stopPropagation()}>
                            <img
                                src={pictureUrl(user.profilePicture)}
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
                </Portal>
            )}

            {/* ── Photo / Avatar Picker ── */}
            {pickerOpen && <PhotoPicker onClose={() => setPickerOpen(false)} />}
        </div>
    );
};

export default Profile;
