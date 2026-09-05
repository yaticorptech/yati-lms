/**
 * @author Preethesh Kulal
 * @description The student's courses — enrolled, bundles, completed, available —
 *              as the tabbed section of the merged Dashboard / My Profile page.
 *
 * This used to be a page of its own with a greeting and three stat cards.
 * The profile already greets the student and counts their courses in "Your
 * Progress", so those went, and what was left — the course tabs, the bundle
 * view and the enrol dialog — became this section. The data comes in as
 * props: the page owns useDashboard, because the "continue learning" card
 * higher up the page reads from the same list.
 */
import React, { useState } from 'react';
import CourseCard from '../components/course/CourseCard';
import { Link } from 'react-router-dom';
import { BookOpen, Award, PlayCircle, Clock, X, Compass, ArrowRight, GraduationCap, Layers, CheckCircle2, Bookmark, Star, Target, Briefcase, CalendarDays } from 'lucide-react';
import { useRewards } from '../context/useRewards';
import { ProgressRing } from '../components/ProfileWidgets';


const getInitials = (title = '') => title.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('') || '?';

/** The open box of the empty state: a course card, a badge and a cap rising
 *  out of it on a glow. Pure SVG so it scales with the panel and needs no file. */
const LearningArt = () => (
    <svg viewBox="0 0 420 340" className="h-full w-full" aria-hidden="true">
        <defs>
            <linearGradient id="la-glow" x1="0" y1="1" x2="0" y2="0">
                <stop offset="0" stopColor="#fde68a" stopOpacity="0.9" />
                <stop offset="1" stopColor="#fde68a" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="la-box" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#8b7cf6" />
                <stop offset="1" stopColor="#6d5ce7" />
            </linearGradient>
            <linearGradient id="la-cap" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#7c6cf2" />
                <stop offset="1" stopColor="#5b4bd6" />
            </linearGradient>
        </defs>
        <path d="M20 250 C 90 200, 140 300, 230 240 S 380 180, 410 260" fill="none" stroke="#c7d2fe" strokeWidth="2" strokeDasharray="6 8" />
        <path d="M165 225 L 210 110 L 255 225 Z" fill="url(#la-glow)" opacity="0.8" />
        {/* box */}
        <path d="M130 215 L 210 250 L 290 215 L 290 300 L 210 335 L 130 300 Z" fill="url(#la-box)" />
        <path d="M210 250 L 210 335 L 130 300 L 130 215 Z" fill="#7b6cf0" />
        <path d="M130 215 L 90 190 L 170 160 L 210 185 Z" fill="#a89cf7" />
        <path d="M290 215 L 330 190 L 250 160 L 210 185 Z" fill="#9486f3" />
        <path d="M172 268 c 8 -6 18 -6 26 0 v 30 c -8 -6 -18 -6 -26 0 z M 198 268 c 8 -6 18 -6 26 0 v 30 c -8 -6 -18 -6 -26 0 z" fill="none" stroke="#e0e7ff" strokeWidth="3" strokeLinejoin="round" />
        {/* course card */}
        <g className="drift">
            <rect x="60" y="70" width="90" height="100" rx="14" fill="#fff" stroke="#e0e7ff" />
            <circle cx="105" cy="108" r="20" fill="#7c6cf2" />
            <path d="M99 98 L 116 108 L 99 118 Z" fill="#fff" />
            <rect x="76" y="140" width="58" height="6" rx="3" fill="#e5e7eb" />
            <rect x="76" y="140" width="34" height="6" rx="3" fill="#34d399" />
        </g>
        {/* badge card */}
        <g className="drift" style={{ animationDelay: '1.2s' }}>
            <rect x="290" y="135" width="86" height="86" rx="14" fill="#fff" stroke="#e0e7ff" transform="rotate(8 333 178)" />
            <circle cx="333" cy="176" r="22" fill="#8b7cf6" />
            <path d="M333 164 l 4 8 l 9 1 l -6.5 6 l 1.5 9 l -8 -4.5 l -8 4.5 l 1.5 -9 l -6.5 -6 l 9 -1 z" fill="#fff" />
        </g>
        {/* graduation cap */}
        <g className="drift" style={{ animationDelay: '0.6s' }}>
            <path d="M270 78 L 342 52 L 374 66 L 302 92 Z" fill="url(#la-cap)" />
            <path d="M288 86 v 16 c 12 10 44 10 56 0 v -18" fill="#5b4bd6" />
            <path d="M362 64 v 26" stroke="#f59e0b" strokeWidth="3" />
            <circle cx="362" cy="94" r="4" fill="#fbbf24" />
        </g>
        {/* sparkles */}
        <path d="M60 40 l 3 8 l 8 3 l -8 3 l -3 8 l -3 -8 l -8 -3 l 8 -3 z" fill="#fbbf24" />
        <path d="M250 40 l 2 5 l 5 2 l -5 2 l -2 5 l -2 -5 l -5 -2 l 5 -2 z" fill="#fde68a" />
        <path d="M380 240 l 2 5 l 5 2 l -5 2 l -2 5 l -2 -5 l -5 -2 l 5 -2 z" fill="#c7d2fe" />
        <circle cx="40" cy="150" r="5" fill="#c7d2fe" />
        <circle cx="395" cy="150" r="4" fill="#ddd6fe" />
    </svg>
);

/** The bundles empty state: a lavender box with a ribbon badge rising out of
 *  it on a dashed orbit — drawn to the mock, no words on the frame itself. */
const BundlesArt = () => (
    <svg viewBox="0 0 360 300" className="h-full w-full" aria-hidden="true">
        <defs>
            <linearGradient id="ba-left" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ede9fe" /><stop offset="1" stopColor="#ddd6fe" /></linearGradient>
            <linearGradient id="ba-right" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#d9d2fb" /><stop offset="1" stopColor="#c4b5fd" /></linearGradient>
        </defs>
        <circle cx="180" cy="150" r="118" fill="#f5f3ff" />
        <circle cx="180" cy="72" r="66" fill="#ede9fe" />
        {/* dashed orbit with arrow heads */}
        <path d="M78 150 C 62 84, 120 22, 200 26" fill="none" stroke="#c4b5fd" strokeWidth="2" strokeDasharray="5 7" />
        <path d="M194 18 l 10 8 l -12 4" fill="none" stroke="#c4b5fd" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M286 150 C 306 214, 236 278, 150 272" fill="none" stroke="#c4b5fd" strokeWidth="2" strokeDasharray="5 7" />
        <path d="M158 280 l -10 -8 l 12 -4" fill="none" stroke="#c4b5fd" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {/* box */}
        <path d="M110 150 L 180 178 L 250 150 L 250 232 L 180 262 L 110 232 Z" fill="url(#ba-right)" />
        <path d="M180 178 L 180 262 L 110 232 L 110 150 Z" fill="url(#ba-left)" />
        <path d="M110 150 L 84 128 L 152 104 L 180 126 Z" fill="#e9e4fd" />
        <path d="M250 150 L 276 128 L 208 104 L 180 126 Z" fill="#d6ccfa" />
        <path d="M216 164 v 34 l 8 -6 l 8 6 v -40 z" fill="#a78bfa" />
        <g stroke="#b8a7f5" strokeWidth="2.5" strokeLinecap="round"><path d="M130 220 v 12" /><path d="M138 223 v 12" /><path d="M146 226 v 12" /></g>
        {/* badge disc */}
        <circle cx="180" cy="70" r="42" fill="#fff" />
        <circle cx="180" cy="60" r="15" fill="none" stroke="#8b5cf6" strokeWidth="4" />
        <path d="M180 52 l 2.5 5 l 5.5 0.8 l -4 3.8 l 1 5.4 l -5 -2.6 l -5 2.6 l 1 -5.4 l -4 -3.8 l 5.5 -0.8 z" fill="#8b5cf6" />
        <path d="M172 73 l -6 16 l 8 -3 l 4 7 l 5 -14 M188 73 l 6 16 l -8 -3 l -4 7 l -5 -14" fill="none" stroke="#8b5cf6" strokeWidth="4" strokeLinejoin="round" />
        {/* dots and an x */}
        <circle cx="66" cy="70" r="4" fill="#60a5fa" />
        <circle cx="62" cy="150" r="3" fill="#c4b5fd" />
        <circle cx="74" cy="196" r="4" fill="#c4b5fd" />
        <circle cx="296" cy="188" r="4" fill="#ddd6fe" />
        <circle cx="302" cy="120" r="3" fill="#c4b5fd" />
        <path d="M294 60 l 10 10 M 304 60 l -10 10" stroke="#a78bfa" strokeWidth="3" strokeLinecap="round" />
    </svg>
);

/** The completed empty state: a rosette with ribbon tails on a lavender arch,
 *  with rays and sparkles; drawn to the mock. */
const CompletedArt = () => (
    <svg viewBox="0 0 320 220" className="h-full w-full" aria-hidden="true">
        <defs>
            <linearGradient id="ca-arch" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ede9fe" /><stop offset="1" stopColor="#f5f3ff" /></linearGradient>
            <linearGradient id="ca-rosette" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#c4b5fd" /><stop offset="1" stopColor="#a78bfa" /></linearGradient>
        </defs>
        <path d="M60 190 A 100 100 0 0 1 260 190 Z" fill="url(#ca-arch)" />
        <path d="M40 190 c 0 -22 22 -30 34 -18 c 4 -22 34 -26 44 -6 c 12 -8 26 0 26 12 v 12 z" fill="#f1eefe" />
        <path d="M176 190 c 0 -14 18 -22 30 -10 c 6 -16 34 -16 40 4 c 12 -6 30 0 30 12 v 6 z" fill="#f1eefe" />
        <g stroke="#a78bfa" strokeWidth="3" strokeLinecap="round">
            <path d="M160 40 v 16" /><path d="M130 50 l 6 14" /><path d="M190 50 l -6 14" />
            <path d="M210 30 l 6 10" /><path d="M226 22 l 2 12" />
        </g>
        <path d="M140 150 l -18 42 l 20 -6 l 10 16 l 16 -46 z" fill="#a78bfa" />
        <path d="M180 150 l 18 42 l -20 -6 l -10 16 l -16 -46 z" fill="#8b5cf6" />
        <path d="M160 72 l 9 6 l 11 -3 l 5 10 l 11 3 l -1 11 l 8 8 l -8 8 l 1 11 l -11 3 l -5 10 l -11 -3 l -9 6 l -9 -6 l -11 3 l -5 -10 l -11 -3 l 1 -11 l -8 -8 l 8 -8 l -1 -11 l 11 -3 l 5 -10 l 11 3 z" fill="url(#ca-rosette)" />
        <circle cx="160" cy="116" r="30" fill="#c4b5fd" />
        <circle cx="160" cy="116" r="24" fill="#ddd6fe" />
        <path d="M160 100 l 5 10 l 11 1.5 l -8 7.5 l 2 11 l -10 -5.5 l -10 5.5 l 2 -11 l -8 -7.5 l 11 -1.5 z" fill="#fff" />
        <path d="M62 60 l 2 5 l 5 2 l -5 2 l -2 5 l -2 -5 l -5 -2 l 5 -2 z" fill="#a78bfa" />
        <path d="M40 110 l 2 5 l 5 2 l -5 2 l -2 5 l -2 -5 l -5 -2 l 5 -2 z" fill="#c4b5fd" />
        <path d="M280 130 l 2 5 l 5 2 l -5 2 l -2 5 l -2 -5 l -5 -2 l 5 -2 z" fill="#a78bfa" />
        <circle cx="252" cy="52" r="4" fill="#fca5a5" />
        <circle cx="254" cy="98" r="2.5" fill="#c4b5fd" />
    </svg>
);

/** The scene behind it: lavender hills, a dashed flight path looping from
 *  the left hill up to a paper plane on the right. Stretches with the frame. */
const CompletedScene = () => (
    <svg viewBox="0 0 1200 300" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden="true">
        <path d="M0 240 C 120 200, 220 280, 360 250 S 620 300, 1200 220 V 300 H 0 Z" fill="#ede9fe" opacity="0.8" />
        <path d="M0 270 C 200 240, 400 300, 700 260 S 1000 290, 1200 250 V 300 H 0 Z" fill="#e4dffc" opacity="0.7" />
    </svg>
);

const CompletedPath = () => (
    <svg viewBox="0 0 1200 300" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <path d="M60 250 C 90 220, 110 190, 130 190 C 150 190, 150 240, 120 250 C 100 258, 100 224, 140 220 C 200 214, 260 250, 330 262 C 380 270, 400 300, 420 310" fill="none" stroke="#c4b5fd" strokeWidth="2" strokeDasharray="6 8" />
        <path d="M760 300 C 860 270, 950 240, 990 210 C 1030 180, 980 160, 960 180 C 940 200, 1000 220, 1030 200 C 1060 180, 1080 150, 1120 110" fill="none" stroke="#c4b5fd" strokeWidth="2" strokeDasharray="6 8" />
        <path d="M1100 118 l 60 -34 l -20 44 l -14 -10 l -12 6 z" fill="#c4b5fd" />
        <path d="M1140 84 l -14 44 l -14 -10 z" fill="#a78bfa" />
        <circle cx="100" cy="242" r="4" fill="#a5b4fc" />
        <circle cx="180" cy="180" r="4" fill="#fca5a5" />
    </svg>
);

/** The available-courses empty state: a bookmarked course card on a lavender
 *  arch with a magnifier, rays and sparkles — the same family as the others. */
const AvailableArt = () => (
    <svg viewBox="0 0 320 220" className="h-full w-full" aria-hidden="true">
        <defs>
            <linearGradient id="aa-arch" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ede9fe" /><stop offset="1" stopColor="#f5f3ff" /></linearGradient>
            <linearGradient id="aa-tag" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#c4b5fd" /><stop offset="1" stopColor="#8b5cf6" /></linearGradient>
        </defs>
        <path d="M60 190 A 100 100 0 0 1 260 190 Z" fill="url(#aa-arch)" />
        <path d="M40 190 c 0 -22 22 -30 34 -18 c 4 -22 34 -26 44 -6 c 12 -8 26 0 26 12 v 12 z" fill="#f1eefe" />
        <path d="M176 190 c 0 -14 18 -22 30 -10 c 6 -16 34 -16 40 4 c 12 -6 30 0 30 12 v 6 z" fill="#f1eefe" />
        <g stroke="#a78bfa" strokeWidth="3" strokeLinecap="round">
            <path d="M160 34 v 14" /><path d="M132 44 l 6 12" /><path d="M188 44 l -6 12" />
        </g>
        {/* course card */}
        <rect x="110" y="70" width="100" height="112" rx="14" fill="#fff" stroke="#ddd6fe" strokeWidth="2" />
        <rect x="110" y="70" width="100" height="52" rx="14" fill="#ede9fe" />
        <rect x="110" y="108" width="100" height="14" fill="#ede9fe" />
        <path d="M150 88 c 4 -4 12 -4 16 0 v 20 c -4 -4 -12 -4 -16 0 z M 150 88 c -4 -4 -12 -4 -16 0 v 20 c 4 -4 12 -4 16 0" fill="none" stroke="#a78bfa" strokeWidth="2.5" strokeLinejoin="round" />
        <rect x="124" y="134" width="56" height="7" rx="3.5" fill="#c4b5fd" />
        <rect x="124" y="148" width="40" height="6" rx="3" fill="#e9e4fd" />
        <rect x="124" y="162" width="72" height="10" rx="5" fill="#8b5cf6" />
        {/* bookmark tag on the card */}
        <path d="M188 62 h 18 v 34 l -9 -7 l -9 7 z" fill="url(#aa-tag)" />
        {/* magnifier */}
        <circle cx="228" cy="150" r="20" fill="#fff" stroke="#8b5cf6" strokeWidth="5" />
        <path d="M243 165 l 18 18" stroke="#8b5cf6" strokeWidth="7" strokeLinecap="round" />
        <path d="M221 150 h 14 M 228 143 v 14" stroke="#c4b5fd" strokeWidth="3" strokeLinecap="round" />
        {/* sparkles and dots */}
        <path d="M62 60 l 2 5 l 5 2 l -5 2 l -2 5 l -2 -5 l -5 -2 l 5 -2 z" fill="#a78bfa" />
        <path d="M40 110 l 2 5 l 5 2 l -5 2 l -2 5 l -2 -5 l -5 -2 l 5 -2 z" fill="#c4b5fd" />
        <path d="M282 96 l 2 5 l 5 2 l -5 2 l -2 5 l -2 -5 l -5 -2 l 5 -2 z" fill="#a78bfa" />
        <circle cx="252" cy="52" r="4" fill="#fca5a5" />
        <circle cx="72" cy="150" r="2.5" fill="#c4b5fd" />
    </svg>
);

const PERKS = [
    { icon: Target, tone: 'bg-gradient-to-br from-indigo-400 to-violet-500 shadow-indigo-200', title: 'Learn', sub: 'Build skills that matter' },
    { icon: Star, tone: 'bg-gradient-to-br from-emerald-300 to-emerald-500 shadow-emerald-200', title: 'Earn XP', sub: 'Complete courses & grow' },
    { icon: Briefcase, tone: 'bg-gradient-to-br from-amber-300 to-orange-400 shadow-orange-200', title: 'Unlock Opportunities', sub: 'Access jobs & career paths' }
];

const TABS = [
    { key: 'courses', label: 'My Courses', icon: GraduationCap },
    { key: 'bundles', label: 'Bundles', icon: Layers },
    { key: 'completed', label: 'Completed', icon: CheckCircle2 },
    { key: 'available', label: 'Available Courses', icon: Bookmark },
    { key: 'activity', label: 'Weekly activity', icon: CalendarDays }
];

const DashboardCourses = ({ courses, bundles, availableCourses, loading, error, buyingCourseId, enrollCourse, refresh, weeklyActivity }) => {
    const [activeTab, setActiveTab] = useState('courses');
    const { summary: rewards } = useRewards();
    const [selectedBundle, setSelectedBundle] = useState(null);
    const [enrollModal, setEnrollModal] = useState(null); // { _id, title }
    const [enrolling, setEnrolling] = useState(false);

    const getProgressVal = (id, isBundle = false) => {
        if (isBundle) {
            const bundle = bundles.find(b => b._id === id);
            return bundle?.progress || 0;
        }
        const course = courses.find(c => c._id === id);
        return course?.progress || 0;
    };

    // Only count courses where progress > 1%
    const activeCourses = courses.filter(c => getProgressVal(c._id) > 1);

    // Completed courses (100%)
    const completedCourses = activeCourses.filter(c => getProgressVal(c._id) === 100);
    const completedCount = completedCourses.length;

    // "Course progress": the three courses taken furthest, for the card at the
    // top of My Courses. Uses the same progress values as the cards below it.
    const inProgress = activeCourses
        .filter(c => { const p = getProgressVal(c._id); return p > 0 && p < 100; })
        .sort((a, b) => getProgressVal(b._id) - getProgressVal(a._id))
        .slice(0, 3)
        .map(c => ({ ...c, progress: getProgressVal(c._id) }));

    const handleRetry = refresh;

    const handleEnrollClick = (course) => {
        setEnrollModal(course);
    };

    const handleConfirmEnroll = async () => {
        if (!enrollModal) return;
        setEnrolling(true);
        try {
            await enrollCourse(enrollModal._id);
            setEnrollModal(null);
            setActiveTab('courses');
        } catch (error) {
            alert(error.response?.data?.message || 'Enrollment failed');
        } finally {
            setEnrolling(false);
        }
    };

    return (
        <section className="space-y-6">
            {/* My Learning Tabs */}
            {/* Four tabs at text-lg do not fit a phone. Left as a plain flex
                they widened the page itself, which is what pushed every other
                section off the left edge. The strip now scrolls on its own —
                the negative margin lets it bleed to the screen edges so the
                scroll reads as more-to-see rather than as a clipped box. */}
            <div className="-mx-4 flex items-center overflow-x-auto border-b border-slate-200 px-4 sm:mx-0 sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {TABS.map(({ key, label, icon: Icon }) => (
                    <button
                        key={key}
                        onClick={() => setActiveTab(key)}
                        className={`relative mr-6 flex shrink-0 items-center gap-2.5 whitespace-nowrap px-2 pb-4 pt-1 text-base font-bold transition-colors sm:mr-10 sm:text-lg ${activeTab === key ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <Icon size={22} strokeWidth={1.8} className={activeTab === key ? 'text-indigo-500' : 'text-slate-400'} />
                        {label}
                        {key === 'completed' && completedCount > 0 && (
                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-black text-emerald-700">{completedCount}</span>
                        )}
                        {activeTab === key && <div className="absolute inset-x-0 -bottom-px h-0.5 rounded-t-full bg-indigo-600"></div>}
                    </button>
                ))}
                {rewards && (
                    <span className="ml-auto mb-3 inline-flex shrink-0 items-center gap-2 rounded-full border border-indigo-100 bg-white px-4 py-2 text-sm font-bold text-indigo-600 shadow-sm">
                        <Star size={16} className="fill-orange-300 text-orange-400" /> {Number(rewards.xp || 0).toLocaleString('en-IN')} XP
                    </span>
                )}
            </div>

            {/* My Learning Content */}
            <div>
                <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center">
                    <span className="mr-3 rounded-2xl bg-indigo-100/80 p-3 text-indigo-600">
                        <BookOpen size={24} />
                    </span>
                    My Learning
                </h2>

                {activeTab === 'activity' ? (
                    weeklyActivity
                ) : loading ? (
                    <div className="flex justify-center p-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
                    </div>
                ) : error ? (
                    <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center flex flex-col items-center">
                        <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mb-4">
                            <span className="text-red-500 text-2xl">⚠️</span>
                        </div>
                        <h3 className="text-lg font-bold text-red-700 mb-2">Failed to load your courses</h3>
                        <p className="text-red-600 text-sm max-w-sm mb-5">{error}</p>
                        <button
                            onClick={handleRetry}
                            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors shadow-sm"
                        >
                            Try Again
                        </button>
                    </div>
                ) : activeTab === 'courses' ? (
                    courses.length === 0 ? (
                        /* The empty state, drawn to the mock: copy and actions on
                           the left, the open box on the right, perks along the foot. */
                        <div className="animate-fade-in-up relative overflow-hidden rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-50/70 via-white to-violet-100/60 p-5 sm:p-7">
                            <div className="pointer-events-none absolute -right-20 top-10 h-72 w-72 rounded-full bg-violet-200/40 blur-3xl"></div>
                            <div className="pointer-events-none absolute -bottom-16 left-1/3 h-56 w-56 rounded-full bg-indigo-200/40 blur-3xl"></div>
                            <div className="relative grid items-center gap-6 lg:grid-cols-[1.1fr_1fr]">
                                <div className="max-w-xl">
                                    <div className="relative mb-5 h-14 w-14">
                                        <span className="absolute -inset-3 rounded-full bg-indigo-200/40 blur-md"></span>
                                        <span className="animate-pop-in relative flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-lg shadow-indigo-200/60">
                                            <BookOpen size={24} className="text-indigo-500" />
                                        </span>
                                    </div>
                                    <h3 className="text-2xl font-extrabold leading-tight text-slate-900 sm:text-3xl">
                                        Your first course<br />
                                        is <span className="relative inline-block text-indigo-600">waiting
                                            <svg viewBox="0 0 120 10" className="absolute -bottom-2 left-0 h-3 w-full text-indigo-300" preserveAspectRatio="none" aria-hidden="true">
                                                <path d="M2 6 Q 15 1, 30 6 T 60 6 T 90 6 T 118 6" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                                            </svg>
                                        </span>
                                    </h3>
                                    <p className="mt-5 max-w-md text-sm leading-relaxed text-slate-500 sm:text-base">
                                        Nothing here yet. Browse what&apos;s available and start something today — every course
                                        you finish adds XP and moves your Career Path forward.
                                    </p>
                                    <div className="mt-5 flex flex-wrap items-center gap-3">
                                        <button
                                            onClick={() => setActiveTab('available')}
                                            className="lift inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-600/25 transition-colors hover:bg-indigo-700"
                                        >
                                            <BookOpen size={18} /> Browse courses <ArrowRight size={16} />
                                        </button>
                                        <Link
                                            to="/career"
                                            className="inline-flex items-center gap-2 rounded-xl border border-indigo-100 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition-colors hover:bg-indigo-50"
                                        >
                                            <Compass size={18} className="text-indigo-500" /> See my path
                                        </Link>
                                    </div>
                                </div>
                                <div className="mx-auto h-44 w-full max-w-xs sm:h-56 lg:h-60"><LearningArt /></div>
                            </div>
                            <div className="relative mt-6 grid gap-3 rounded-2xl border border-white/80 bg-white/70 p-3 backdrop-blur sm:grid-cols-3 sm:p-4">
                                {PERKS.map(({ icon: Icon, tone, title, sub }) => (
                                    <div key={title} className="flex items-center gap-3">
                                        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white shadow-lg ${tone}`}>
                                            <Icon size={18} />
                                        </span>
                                        <div>
                                            <p className="text-sm font-bold text-slate-900">{title}</p>
                                            <p className="text-xs text-slate-500">{sub}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <>
                        {/* Course progress — continue where you left off */}
                        <div className="mb-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                            <div className="mb-4">
                                <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900"><BookOpen size={18} className="text-indigo-500" /> Course progress</h3>
                                <p className="text-sm text-slate-500">Continue where you left off</p>
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
                                        <p className="font-bold text-slate-800">{completedCount ? 'Everything you started is finished!' : 'Nothing in progress yet'}</p>
                                        <p className="text-sm text-slate-500">{completedCount ? `${completedCount} course${completedCount === 1 ? '' : 's'} completed — start the next one.` : 'Pick a course and your progress shows up here.'}</p>
                                    </div>
                                    <button type="button" onClick={() => setActiveTab('available')} className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700">Browse courses <ArrowRight size={14} /></button>
                                </div>
                            )}
                        </div>
                        <div className="stagger grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {courses.map(course => (
                                <CourseCard
                                    key={course._id}
                                    course={course}
                                    progress={getProgressVal(course._id)}
                                    to={`/learn/${course._id}`}
                                />
                            ))}
                        </div>
                        </>
                    )
                ) : activeTab === 'bundles' ? (
                    bundles.length > 0 ? (
                        <div className="stagger grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {bundles.map(bundle => {
                                const progress = getProgressVal(bundle._id, true);
                                return (
                                    <div key={bundle._id} className="lift bg-white rounded-2xl border border-slate-200 overflow-hidden transition-shadow duration-300 group flex flex-col">
                                        {/* Thumbnail Area */}
                                        <div className="h-48 bg-gradient-to-br from-indigo-900 to-purple-900 relative overflow-hidden flex items-center justify-center">
                                            {bundle.thumbnail ? (
                                                <img src={bundle.thumbnail} alt={bundle.title} className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-500" />
                                            ) : (
                                                <Award size={48} className="text-white/30 absolute" />
                                            )}
                                            <h3 className="font-bold text-xl text-white relative z-10 drop-shadow-md px-4 text-center">{bundle.title}</h3>
                                        </div>

                                        {/* Card Content */}
                                        <div className="p-6 flex-1 flex flex-col">
                                            <div className="mb-3">
                                                <span className="text-xs font-bold text-white bg-indigo-500 px-2 py-1 rounded shadow-sm tracking-wider uppercase">BUNDLE</span>
                                            </div>
                                            <h3 className="font-bold text-lg text-slate-800 line-clamp-2 min-h-[56px] mb-2 group-hover:text-indigo-600 transition-colors">
                                                {bundle.title}
                                            </h3>

                                            <div className="text-sm font-medium text-slate-500 mb-4 line-clamp-2">
                                                Includes {bundle.courses?.length || 0} courses.
                                            </div>

                                            <div className="mt-auto pt-4">
                                                <div className="flex justify-between items-end mb-2">
                                                    <span className="text-sm font-semibold text-slate-500 flex items-center">
                                                        <Clock size={14} className="mr-1.5" /> Overall Progress
                                                    </span>
                                                    <span className="text-sm font-bold text-indigo-600">{progress}%</span>
                                                </div>
                                                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                                                    <div
                                                        className="bg-indigo-600 h-2.5 rounded-full transition-all duration-1000 ease-out relative"
                                                        style={{ width: `${progress}%` }}
                                                    >
                                                        <div className="absolute top-0 right-0 bottom-0 left-0 bg-white/20"></div>
                                                    </div>
                                                </div>

                                                <button
                                                    onClick={() => setSelectedBundle(bundle)}
                                                    className="mt-6 w-full flex justify-center items-center space-x-2 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors shadow-sm"
                                                >
                                                    <span>View Courses Inside</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="relative overflow-hidden rounded-3xl border-2 border-dashed border-indigo-100 bg-[#f8f7ff]">
                            <span aria-hidden="true" className="pointer-events-none absolute -left-16 -bottom-24 h-60 w-72 rounded-[45%] bg-indigo-100/70 blur-xl"></span>
                            <span aria-hidden="true" className="pointer-events-none absolute -right-16 -top-20 h-52 w-72 rounded-[45%] bg-violet-100/80 blur-xl"></span>
                            <span aria-hidden="true" className="pointer-events-none absolute bottom-10 left-14 h-4 w-4 rounded-full bg-white shadow-sm"></span>
                            <span aria-hidden="true" className="pointer-events-none absolute right-16 top-16 h-3 w-3 rounded-full bg-indigo-200/60"></span>
                            <div className="relative mx-auto h-52 w-64 py-3 sm:h-60">
                                <BundlesArt />
                            </div>
                            <h3 className="sr-only">No bundles yet</h3>
                            <p className="sr-only">No course bundles have been published yet. Check back soon.</p>
                        </div>
                    )
                ) : activeTab === 'completed' ? (
                    completedCourses.length > 0 ? (
                        <div className="stagger grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {completedCourses.map(course => (
                                <div key={course._id} className="bg-white rounded-2xl border border-emerald-200 overflow-hidden hover:shadow-lg transition-all duration-300 group flex flex-col">
                                    <div className="h-48 bg-slate-100 relative overflow-hidden">
                                        {course.thumbnail ? (
                                            <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                        ) : (
                                            <div className="w-full h-full flex justify-center items-center bg-emerald-50 text-emerald-200">
                                                <Award size={48} />
                                            </div>
                                        )}
                                        <div className="absolute top-3 right-3 bg-emerald-500 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-sm">
                                            ✓ Completed
                                        </div>
                                    </div>
                                    <div className="p-6 flex-1 flex flex-col">
                                        <h3 className="font-bold text-lg text-slate-800 line-clamp-2 min-h-[56px] mb-2 group-hover:text-emerald-600 transition-colors">
                                            {course.title}
                                        </h3>
                                        <div className="mt-auto pt-4">
                                            <div className="w-full bg-emerald-100 rounded-full h-2.5 overflow-hidden mb-4">
                                                <div className="bg-emerald-500 h-2.5 rounded-full w-full" />
                                            </div>
                                            <Link
                                                to={`/learn/${course._id}`}
                                                className="w-full flex justify-center items-center space-x-2 py-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-xl transition-colors border border-emerald-200"
                                            >
                                                <span>Review Course</span> <PlayCircle size={18} />
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="relative overflow-hidden rounded-3xl border border-indigo-100 bg-white">
                            <CompletedScene />
                            <CompletedPath />
                            <div className="relative flex flex-col items-center px-6 pb-16 pt-6 text-center">
                                <div className="h-40 w-64 sm:h-44"><CompletedArt /></div>
                                <h3 className="mt-2 text-2xl font-extrabold text-slate-900">No completed courses yet</h3>
                                <p className="mt-2 max-w-sm text-slate-500">Keep learning — your completed courses will appear here.</p>
                            </div>
                        </div>
                    )
                ) : activeTab === 'available' ? (
                    availableCourses.length > 0 ? (
                        <div className="stagger grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {availableCourses.map(course => (
                                <div key={course._id} className="group relative flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white transition-all duration-300 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-100">
                                    {/* cover */}
                                    <div className="relative h-44 overflow-hidden">
                                        {course.thumbnail ? (
                                            <img src={course.thumbnail} alt={course.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                                        ) : (
                                            <div className="relative flex h-full w-full items-center justify-center bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500">
                                                <span aria-hidden="true" className="absolute -left-10 -top-10 h-40 w-40 rounded-full bg-white/10" />
                                                <span aria-hidden="true" className="absolute -bottom-12 right-6 h-36 w-36 rounded-full bg-white/10" />
                                                <span aria-hidden="true" className="absolute right-10 top-8 text-white/30">✦</span>
                                                <span className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 text-white shadow-lg backdrop-blur">
                                                    <BookOpen size={30} />
                                                </span>
                                            </div>
                                        )}
                                        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-slate-900/50 to-transparent" />
                                        <span className={`absolute right-4 top-4 rounded-full px-3 py-1 text-xs font-black shadow-sm ${course.price > 0 ? 'bg-white text-indigo-600' : 'bg-emerald-500 text-white'}`}>
                                            {course.price > 0 ? `₹${course.price}` : 'Free'}
                                        </span>
                                        <span className="absolute bottom-3 left-4 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold text-slate-700 backdrop-blur">
                                            <Clock size={12} className="text-indigo-500" /> Self-paced
                                        </span>
                                    </div>

                                    {/* body */}
                                    <div className="flex flex-1 flex-col p-5">
                                        <h3 className="mb-1.5 line-clamp-2 min-h-[52px] text-lg font-bold leading-snug text-slate-900 transition-colors group-hover:text-indigo-600">
                                            {course.title}
                                        </h3>
                                        <p className="mb-4 line-clamp-2 text-sm leading-relaxed text-slate-500">
                                            {course.description || 'Start learning and earn XP as you go.'}
                                        </p>

                                        <div className="mb-4 flex items-center gap-2 text-xs text-slate-500">
                                            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-[11px] font-black text-indigo-600">
                                                {getInitials(course.instructor || 'YATICORP')}
                                            </span>
                                            <span className="truncate font-semibold text-slate-700">{course.instructor || 'YATICORP'}</span>
                                            <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 font-bold text-amber-700">
                                                <Award size={12} /> Certificate
                                            </span>
                                        </div>

                                        <div className="mt-auto flex items-center gap-2">
                                            <button
                                                onClick={() => handleEnrollClick(course)}
                                                disabled={buyingCourseId === course._id}
                                                className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-3 font-bold text-white shadow-md transition-all ${buyingCourseId === course._id ? 'cursor-not-allowed bg-indigo-400' : 'bg-gradient-to-r from-indigo-600 to-violet-600 shadow-indigo-200 hover:from-indigo-700 hover:to-violet-700'}`}
                                            >
                                                {buyingCourseId === course._id ? 'Enrolling...' : <>Enroll Now <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" /></>}
                                            </button>
                                            <Link
                                                to={`/preview/${course._id}`}
                                                aria-label={`Preview ${course.title}`}
                                                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition-colors hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600"
                                            >
                                                <PlayCircle size={20} />
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="relative overflow-hidden rounded-3xl border border-indigo-100 bg-white">
                            <CompletedScene />
                            <CompletedPath />
                            <div className="relative flex flex-col items-center px-6 pb-16 pt-6 text-center">
                                <div className="h-40 w-64 sm:h-44"><AvailableArt /></div>
                                <h3 className="mt-2 text-2xl font-extrabold text-slate-900">No courses available for purchase</h3>
                                <p className="mt-2 max-w-sm text-slate-500">Keep an eye out for new courses, or earn more credits by completing quizzes!</p>
                            </div>
                        </div>
                    )
                ) : null}
            </div>

            {/* Enroll Confirmation Modal */}
            {enrollModal && (
                <div className="fixed inset-0 z-50 flex justify-center items-center bg-slate-900/50 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white rounded-3xl shadow-xl w-full max-w-md p-8 flex flex-col items-center text-center">
                        <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
                            <BookOpen size={28} className="text-indigo-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-800 mb-2">Enroll in Course</h2>
                        <p className="text-slate-500 mb-1">You're about to enroll in:</p>
                        <p className="font-bold text-slate-800 text-lg mb-6">{enrollModal.title}</p>
                        <div className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-6 text-left space-y-2">
                            <p className="text-sm font-semibold text-slate-600">Order Summary</p>
                            <div className="flex justify-between text-sm text-slate-700">
                                <span>{enrollModal.title}</span>
                                <span className="font-bold text-emerald-600">{enrollModal.price > 0 ? `₹${enrollModal.price}` : 'Free'}</span>
                            </div>
                            <div className="border-t border-slate-200 pt-2 flex justify-between text-sm font-bold text-slate-800">
                                <span>Total</span>
                                <span className="text-emerald-600">{enrollModal.price > 0 ? `₹${enrollModal.price}` : 'Free'}</span>
                            </div>
                        </div>
                        <div className="flex w-full space-x-3">
                            <button
                                onClick={() => setEnrollModal(null)}
                                className="flex-1 py-3 border border-slate-300 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmEnroll}
                                disabled={enrolling}
                                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl transition-colors"
                            >
                                {enrolling ? 'Enrolling...' : 'Confirm Enroll'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Bundle View Overlay Modal */}
            {
                selectedBundle && (
                    <div className="fixed inset-0 z-50 flex justify-center items-center bg-slate-900/50 backdrop-blur-sm p-4 animate-fade-in">
                        <div className="bg-white rounded-3xl shadow-xl w-full max-w-5xl max-h-[90vh] overflow-y-auto flex flex-col">
                            <div className="sticky top-0 bg-white/90 backdrop-blur pb-4 pt-6 px-8 border-b border-slate-100 z-10 flex justify-between items-start">
                                <div className="flex items-center space-x-4">
                                    <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl">
                                        <Award size={28} />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-bold text-slate-800">{selectedBundle.title}</h2>
                                        <p className="text-slate-500 font-medium">Included Courses in this Bundle</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSelectedBundle(null)}
                                    className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-full transition-colors"
                                >
                                    <X size={24} />
                                </button>
                            </div>
                            <div className="p-8">
                                <div className="stagger grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {selectedBundle.courses && selectedBundle.courses.length > 0 ? (
                                        selectedBundle.courses.map(bc => {
                                            // Attempt to match bundle sub-course with full course object from primary courses array
                                            const fullCourse = courses.find(c => c._id === bc._id) || bc;
                                            const progress = getProgressVal(bc._id);
                                            return (
                                                <div key={bc._id} className="lift bg-white rounded-2xl border border-slate-200 overflow-hidden transition-shadow duration-300 group flex flex-col">
                                                    <div className="h-40 bg-slate-100 relative overflow-hidden">
                                                        {fullCourse.thumbnail || bc.thumbnail ? (
                                                            <img src={fullCourse.thumbnail || bc.thumbnail} alt={bc.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                                        ) : (
                                                            <div className="w-full h-full flex justify-center items-center bg-indigo-50 text-indigo-200">
                                                                <BookOpen size={40} />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="p-5 flex-1 flex flex-col">
                                                        <h3 className="font-bold text-md text-slate-800 line-clamp-2 min-h-[48px] mb-2 group-hover:text-indigo-600 transition-colors">
                                                            {bc.title}
                                                        </h3>
                                                        <div className="mt-auto pt-4">
                                                            <div className="flex justify-between items-end mb-2">
                                                                <span className="text-xs font-semibold text-slate-500 flex items-center">
                                                                    <Clock size={12} className="mr-1" /> Progress
                                                                </span>
                                                                <span className="text-xs font-bold text-indigo-600">{progress}%</span>
                                                            </div>
                                                            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                                                <div
                                                                    className="bg-indigo-600 h-1.5 rounded-full transition-all duration-1000 ease-out"
                                                                    style={{ width: `${progress}%` }}
                                                                ></div>
                                                            </div>
                                                            <Link
                                                                to={`/learn/${bc._id}`}
                                                                className="mt-4 w-full flex justify-center items-center space-x-2 py-2.5 bg-slate-50 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 font-bold text-sm rounded-lg transition-colors border border-slate-200 hover:border-indigo-200"
                                                            >
                                                                <span>{progress > 0 ? 'Resume Course' : 'Start Course'}</span>
                                                                <PlayCircle size={16} />
                                                            </Link>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="col-span-full py-12 text-center bg-slate-50 rounded-2xl border border-slate-200 border-dashed">
                                            <p className="text-slate-500 font-medium">This bundle does not contain any published courses yet.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
        </section>
    );
};

export default DashboardCourses;
