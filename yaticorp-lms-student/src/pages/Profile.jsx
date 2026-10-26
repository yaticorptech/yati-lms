import React, { useCallback, useContext, useState, useEffect, useMemo } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../utils/api';
import saveToDrive from '../integrations/google/saveToDrive';
import CertificatesFrame from '../components/CertificatesFrame';
import ResumeSection from '../components/ResumeSection';
import AiKeySettings from '../components/AiKeySettings';
import GoogleConnectionCard from '../integrations/google/GoogleConnectionCard';
import {
    Award, Loader2, Check, X,
    Flame, Gem, Coins, Building2
} from 'lucide-react';
import ContinueStrip from '../components/ContinueStrip';
import useBackClose from '../native/useBackClose';
import { currentStreak, recentActivity, weeklyMomentum } from '../career/utils/progress';
import useLevelProgress from '../career/context/useLevelProgress';
import { StatTile, ProgressRing } from '../components/ProfileWidgets';
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
import WeeklyActivityCard from '../components/WeeklyActivityCard';
import { MyClubsCard } from '../nccnss/ActivityCalendar';

/**
 * The line under "Your account is ready" when the Organization ID given at
 * signup did not lead to a join request. "Whenever you have the right ID" is
 * only true when the ID was the problem — not shaped like an ID ('invalid'),
 * or no active organization has it ('not_found'). When the server could not
 * send the request ('error') it read as blaming the student for an outage.
 * An older server says 'unknown', or nothing: the plain pointer then.
 */
const orgHint = (org) => {
    const why = org?.reason;
    const where = <strong>My Profile → Personal Information → Organization/College</strong>;
    if (why === 'invalid' || why === 'not_found') return <>Add it from {where} whenever you have the right Organization ID.</>;
    if (why === 'error') return <>You can try again from {where}.</>;
    return <>You can add it from {where}.</>;
};

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
    const { user, setUser, isCareerPathEnabled, isCreditSystemEnabled } = useContext(AuthContext);
    // Streak, XP, rank, badges and wallet from the rewards system. Null while
    // loading or when an admin has locked the section; the page then falls
    // back to the Career Path numbers it always showed.
    const rewards = useRewards();
    const rw = rewards.enabled ? rewards.summary : null;
    // Links to #leaderboard, #wallet or #certificates on this page are scrolled
    // to by the layout (StudentLayout), which waits for the section to exist.
    // This page used to do it as well, keyed on the rewards summary — so every
    // refresh of the wallet (a quiz started, a prize won, any charge) threw the
    // student back up to #wallet from wherever they had scrolled.
    const [certificates, setCertificates] = useState([]);
    // Career Path standing. Fetched here so the profile shows one student rather
    // than two: credits are earned in courses, XP and levels in Career Path, and
    // until now neither page mentioned the other's existence.
    const [career, setCareer] = useState(null);
    // The course data the Dashboard used to own. The page is the two merged,
    // so one hook feeds "Your Progress", the Continue strip under the welcome
    // banner and the course tabs alike, refreshing every 30s as before.
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

    // Photo viewer. A dialog like the others: Escape and Android's back button close it.
    const [viewingPhoto, setViewingPhoto] = useState(false);
    const photoOpen = viewingPhoto && !!user?.profilePicture;
    useBackClose(() => setViewingPhoto(false), photoOpen);
    useEffect(() => {
        if (!photoOpen) return undefined;
        const onKey = (e) => { if (e.key === 'Escape') setViewingPhoto(false); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [photoOpen]);

    // What the server says about the student, kept with the rest of what the
    // device saves about them, so the banner opens on their own level next
    // time and My Profile shows their details as they are now. The details
    // used to come only from sign-in: a name an administrator corrected, or a
    // phone changed on another device, stayed old here until the student
    // signed out — and Edit Profile, filled in from them, wrote the old values
    // back. Only fields the server sent are taken.
    const rememberStudent = (fresh) => {
        if (!fresh) return;
        const latest = {};
        for (const k of ['name', 'email', 'phone', 'cardNumber', 'profilePicture', 'credits']) {
            if (fresh[k] != null) latest[k] = fresh[k];
        }
        if (fresh.level != null) Object.assign(latest, { xp: Number(fresh.xp) || 0, level: Number(fresh.level) || 1 });
        const stale = (held) => !!held && Object.keys(latest).some((k) => held[k] !== latest[k]);
        setUser((prev) => (stale(prev) ? { ...prev, ...latest } : prev));
        try {
            const saved = JSON.parse(localStorage.getItem('studentData') || 'null');
            if (stale(saved)) localStorage.setItem('studentData', JSON.stringify({ ...saved, ...latest }));
        } catch { /* no storage: the banner waits for the profile next time */ }
    };

    // The level and XP on the welcome banner. Read again whenever XP may have
    // moved without a page change — a lesson, a quiz, a Global Quiz win, a
    // Career Path task (they say so on the window) — or the banner sat on the
    // figure the page opened with until the next reload. A failed re-read
    // keeps what is shown; only the first one falls back to the saved session.
    const loadStanding = useCallback((first = false) => api.get('/user/profile')
        .then(r => { const u = r.data?.user || null; setCareer(u); rememberStudent(u); })
        // eslint-disable-next-line react-hooks/exhaustive-deps
        .catch(() => { if (first) setCareer(null); }), []);
    useEffect(() => {
        const again = () => loadStanding();
        window.addEventListener('yati:progress-changed', again);
        window.addEventListener('yati:rewards', again);
        return () => {
            window.removeEventListener('yati:progress-changed', again);
            window.removeEventListener('yati:rewards', again);
        };
    }, [loadStanding]);

    // The course certificates. A failed read is said as such in the frame,
    // with a way to try again: read as an empty list, it told the student
    // their frame was empty.
    const [certsFailed, setCertsFailed] = useState(false);
    const loadCertificates = useCallback(() => api.get('/certificates')
        .then((res) => { setCertificates(res.data); setCertsFailed(false); })
        .catch((err) => { console.error(err); setCertsFailed(true); })
        .finally(() => setLoading(false)), []);

    useEffect(() => {
        loadStanding(true);
        if (isCareerPathEnabled) {
            api.get('/career/tasks/history')
                .then(r => setHistory(Array.isArray(r.data) ? r.data : []))
                .catch(() => setHistory([]));
        }
        loadCertificates();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // The details as the form opened with them: Save sends only what the
    // student changed, so a value that changed elsewhere meanwhile is not
    // written over with the one this page was showing.
    const [opened, setOpened] = useState(null);
    const openEdit = () => {
        const start = { name: user?.name || '', email: user?.email || '', phone: user?.phone || '' };
        setForm(start);
        setOpened(start);
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
            // Strip all non-digit characters to count digits. Digits, spaces,
            // brackets, dots, dashes and a leading + only — the server's rule.
            const digits = form.phone.replace(/\D/g, '');
            if (!/^\+?[\d\s().-]+$/.test(form.phone.trim()) || digits.length < 7 || digits.length > 15) errors.phone = 'Phone must be 7–15 digits (international format supported, e.g. +91 98765 43210)';
        }

        return errors;
    };

    const handleSave = async () => {
        const errors = validate();
        if (Object.keys(errors).length > 0) { setFormErrors(errors); return; }
        const changed = {};
        for (const k of ['name', 'email', 'phone']) {
            if (form[k].trim() !== (opened?.[k] || '').trim()) changed[k] = form[k].trim();
        }
        // Nothing to send: the form simply closes.
        if (!Object.keys(changed).length) { setEditing(false); return; }
        setSaving(true);
        try {
            const res = await api.put('/user/profile', changed);
            const updated = { ...user, ...res.data };
            setUser(updated);
            localStorage.setItem('studentData', JSON.stringify(updated));
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
            setEditing(false);
        } catch (err) {
            // A refusal about one field ("An account already uses this email
            // address") goes under that field; anything else above the form.
            const { field, message } = err.response?.data || {};
            if (message && ['name', 'email', 'phone'].includes(field)) setFormErrors({ [field]: message });
            else setFormErrors({ api: message || 'Failed to save. Please try again.' });
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
    // What the server says, and until it has answered, what was saved on the
    // device. Read from a default, the banner opened on "Level 1 · 100 XP to
    // the next level" and changed to the real level a second or two later.
    const standing = career || (user?.level != null ? user : null);
    const level = Math.max(1, Number(standing?.level) || 1);
    const xp = Number(standing?.xp) || 0;
    const ring = useLevelProgress(xp, level);
    const careerStreak = useMemo(() => currentStreak(history), [history]);
    const streak = rw ? rw.streak.current : careerStreak;
    // The seven day tiles come from the same record as the number above
    // them. With rewards on, that is the rewards streak — lessons, quizzes
    // and Career Path tasks all count — and its calendar says which days were
    // active. Built from Career Path's tasks alone, the card read "3 days"
    // over a week of empty tiles for a student who had been taking lessons.
    const streakDays = rw?.streak?.calendar;
    const week = useMemo(() => {
        if (!streakDays?.length) return recentActivity(history, 7);
        return streakDays.slice(-7).map((d, i, days) => ({
            key: d.day,
            label: new Date(`${d.day}T12:00:00`).toLocaleDateString(undefined, { weekday: 'narrow' }),
            active: !!d.active,
            isToday: i === days.length - 1
        }));
    }, [streakDays, history]);
    // This week's quests against last week's, as Career Path's Overview shows them.
    const weekly = useMemo(() => weeklyMomentum(history), [history]);
    const completedCourses = courses.filter((c) => c.progress >= 100).length;
    const hour = new Date().getHours();
    const dayGreeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

    // The weekly activity card. It lives on the Weekly activity tab of My
    // Learning now, so it is built here where its numbers are and passed down.
    // The streak half is Career Path's own learning-streak panel.
    const weeklyActivity = (
        <WeeklyActivityCard
            streak={streak}
            activity={week}
            weekly={weekly}
            careerOn={isCareerPathEnabled || !!streakDays?.length}
            completedCourses={completedCourses}
            certificates={certificates.length}
        />
    );

    return (
        <div className="relative z-0 w-full space-y-6 pb-8 animate-fade-in">
            {/* Floating success toast. On <body>: inside this page's z-0 layer
                it sat under the phone's bottom bar, where nobody saw it. Above
                the bar on a phone; in the corner once the sidebar is there. */}
            {saveSuccess && (
                <Portal>
                    <div role="status" className="fixed right-4 bottom-[calc(6rem+env(safe-area-inset-bottom))] z-[200] flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-xl sidebar:bottom-6 sidebar:right-6">
                        <Check size={16} aria-hidden="true" /> Profile updated successfully!
                    </div>
                </Portal>
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
                            {!signupOrg.requested && <p className="mt-0.5 text-xs text-slate-500">{orgHint(signupOrg)}</p>}
                        </div>
                        <button type="button" onClick={() => setSignupOrg(null)} aria-label="Dismiss" className="shrink-0 rounded-lg p-1 text-slate-400 hover:bg-white hover:text-slate-600"><X size={16} /></button>
                    </div>
                )}
                <WelcomeBanner
                    name={user?.name || ''}
                    firstName={firstName}
                    photo={user?.profilePicture}
                    level={standing ? level : null}
                    greeting={dayGreeting}
                    greetingIcon={hour < 12 ? '☀️' : hour < 17 ? '🌤️' : '🌙'}
                    xpRemaining={standing && ring.known ? ring.remaining : null}
                    percent={standing ? ring.percent : 0}
                    xpTo={isCareerPathEnabled ? '/career' : undefined}
                    onViewPhoto={() => setViewingPhoto(true)}
                />
                {/* The one course to go back to, straight under the greeting. */}
                <ContinueStrip courses={courses} />
                </>
            )}

            {/* ── My Profile: Your Progress ─────────────────────────────── */}
            {/* Stat tiles (Career Path numbers, shown only when rewards are locked;
                otherwise the progress card carries them) */}
            {onProfile && !rw && (
            <div className={`stagger grid grid-cols-2 gap-3 sm:gap-4 ${isCreditSystemEnabled === false ? 'lg:grid-cols-3' : 'lg:grid-cols-4'}`}>
                <StatTile tone="amber" icon={Coins} value={xp} label="Current XP" sub={`${ring.remaining} XP to level ${ring.nextLevel}`} emoji="🪙" to={isCareerPathEnabled ? '/career' : undefined} />
                <StatTile tone="sky" icon={Gem} value={level} label="Your level" sub={isCareerPathEnabled ? 'From Career Path tasks' : 'Levels come from Career Path'} percent={ring.percent} to={isCareerPathEnabled ? '/career' : undefined} />
                <StatTile tone="orange" icon={Flame} value={streak} suffix={streak === 1 ? ' day' : ' days'} label="Streak" sub={streak ? 'Keep it alive today' : 'Finish a task to start one'} emoji="🔥" to={isCareerPathEnabled ? '/career/planner' : undefined} />
                {/* Only while the credit system is on: with it off, credits are
                    neither earned nor spent, and a "0 Credits" tile is a promise. */}
                {isCreditSystemEnabled !== false && <StatTile tone="rose" icon={Award} value={user?.credits || 0} label="Credits" sub="Earned from course quizzes" emoji="🏅" />}
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

            {/* ── Dashboard: the clubs, NCC/NSS and Scouts the student is in, with
                their posts and what is coming up (nothing until they join one). ── */}
            {!onProfile && <MyClubsCard />}

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
                    loadFailed={certsFailed}
                    onRetry={loadCertificates}
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
                // page past the screen. Side by side, the two are one height —
                // the taller card's — so the row reads as a pair.
                <div className="grid gap-4 lg:grid-cols-2 lg:items-stretch [&>*]:min-w-0">
                    <GoogleConnectionCard compact />
                    <AiKeySettings />
                </div>
            )}

            {/* ── Photo Viewer Modal ── */}
            {photoOpen && (
                <Portal>
                    <div
                        className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
                        onClick={() => setViewingPhoto(false)}
                    >
                        <div role="dialog" aria-modal="true" aria-label={`Profile photo of ${user.name || 'you'}`} className="relative max-w-sm w-full" onClick={e => e.stopPropagation()}>
                            <img
                                src={pictureUrl(user.profilePicture)}
                                alt={user.name}
                                className="w-full rounded-2xl shadow-2xl object-cover"
                            />
                            <button
                                type="button"
                                autoFocus
                                onClick={() => setViewingPhoto(false)}
                                aria-label="Close photo"
                                className="absolute top-3 right-3 w-8 h-8 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center transition-colors"
                            >
                                <X size={16} aria-hidden="true" />
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
