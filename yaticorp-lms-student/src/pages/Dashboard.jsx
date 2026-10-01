/**
 * @author Preethesh Kulal
 * @description The student's courses — bundles, completed, available — as the
 *              tabbed "My Learning" section of the Dashboard.
 *
 * This used to be a page of its own with a greeting and three stat cards.
 * The profile already greets the student and counts their courses in "Your
 * Progress", so those went, and what was left — the course tabs, the bundle
 * view and the enrol dialog — became this section. The data comes in as
 * props: the page owns useDashboard, because other cards on the page read
 * from the same list.
 *
 * There is no "My Courses" tab: the courses a student is enrolled in have a
 * page of their own, Enrolled Courses, and the Dashboard does not repeat it.
 */
import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import GlobalQuiz from '../components/GlobalQuiz';
import { Link, useNavigate } from 'react-router-dom';
import { BookOpen, Award, PlayCircle, Clock, X, ArrowRight, Layers, CheckCircle2, Bookmark, CalendarDays, Globe } from 'lucide-react';
import Portal from '../components/Portal';


const getInitials = (title = '') => title.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('') || '?';

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

const TABS = [
    { key: 'available', label: 'Available Courses', icon: Bookmark },
    { key: 'completed', label: 'Completed', icon: CheckCircle2 },
    { key: 'bundles', label: 'Bundles', icon: Layers },
    { key: 'quiz', label: 'Global Quiz', icon: Globe },
    { key: 'activity', label: 'Weekly activity', icon: CalendarDays }
];

const DashboardCourses = ({ courses, bundles, availableCourses, loading, error, buyingCourseId, enrollCourse, refresh, weeklyActivity }) => {
    const [activeTab, setActiveTab] = useState('available');
    const navigate = useNavigate();
    // An administrator can take the Global Quiz away; its tab goes with it.
    const { isGlobalQuizEnabled } = useContext(AuthContext);
    const tabs = TABS.filter((t) => t.key !== 'quiz' || isGlobalQuizEnabled !== false);
    const [selectedBundle, setSelectedBundle] = useState(null);

    /* The tab strip scrolls sideways rather than wrapping. Two things make a
       scrolling strip usable, and both need to know where it has been
       scrolled to, which only the DOM knows: a fade on whichever edge still
       has tabs beyond it, and bringing the chosen tab into view. Both are
       written straight to the node — they are readings of what the browser
       did, and feeding them back through a render only to measure again is
       the cascade the effect rules warn about. */
    const stripRef = useRef(null);
    const tappedRef = useRef(false);
    const markEdges = useCallback(() => {
        const el = stripRef.current;
        if (!el?.parentElement) return;
        const slack = 4;
        el.parentElement.dataset.moreLeft = String(el.scrollLeft > slack);
        el.parentElement.dataset.moreRight = String(el.scrollLeft + el.clientWidth < el.scrollWidth - slack);
    }, []);
    // The underline that glides to the chosen tab: its place and width are the
    // tab's own, read from the DOM and written straight to the strip.
    const moveInk = useCallback(() => {
        const strip = stripRef.current;
        const tab = strip?.querySelector('[data-active="true"]');
        if (!tab) return;
        strip.style.setProperty('--ink-x', `${tab.offsetLeft}px`);
        strip.style.setProperty('--ink-w', `${tab.offsetWidth}px`);
    }, []);
    useEffect(() => {
        const onResize = () => { markEdges(); moveInk(); };
        onResize();
        window.addEventListener('resize', onResize);
        // Fonts settling and the badge appearing change the tabs' widths.
        const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(moveInk) : null;
        stripRef.current?.querySelectorAll('[role="tab"]').forEach((el) => ro?.observe(el));
        return () => { window.removeEventListener('resize', onResize); ro?.disconnect(); };
    }, [markEdges, moveInk, tabs.length]);
    useEffect(() => {
        // The chosen tab moves to the front of the strip, so the tabs after it
        // come into view. Scrolled only far enough to be seen, it stayed where
        // it was and the next tab sat cut off under the right-hand fade until
        // the strip was swiped. It stops the strip's scroll padding short of
        // the edge — the width of the left-hand fade — so the fade never lies
        // over it. The first tab takes the strip back to the start; the last
        // ones go as far as the strip goes. Only the strip scrolls, never the
        // page.
        const strip = stripRef.current;
        const tab = strip?.querySelector('[data-active="true"]');
        if (tab) {
            const pad = parseFloat(getComputedStyle(strip).scrollPaddingInlineStart) || 0;
            const left = strip.scrollLeft + tab.getBoundingClientRect().left - strip.getBoundingClientRect().left - pad;
            const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
            strip.scrollTo({ left: Math.max(0, left), behavior: still ? 'auto' : 'smooth' });
        }
        markEdges();
        moveInk();
        // A tab the student tapped (not the first one shown on arrival) also
        // brings the page to it: the strip settles at the top of the screen,
        // just under the header, with that tab's content beneath it.
        if (tappedRef.current) {
            tappedRef.current = false;
            const bar = strip?.closest('[data-tab-bar]');
            const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
            bar?.scrollIntoView({ block: 'start', behavior: still ? 'auto' : 'smooth' });
        }
    }, [activeTab, markEdges, moveInk]);
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
            // To the new course, on the page that lists what they are enrolled in.
            navigate('/enrolled-courses');
        } catch (error) {
            alert(error.response?.data?.message || 'Enrollment failed');
        } finally {
            setEnrolling(false);
        }
    };

    return (
        <section className="space-y-6">
            {/* My Learning Tabs */}
            {/* Five tabs do not fit a phone at reading size, so the strip
                scrolls sideways in one line. The two things that used to make
                that a bad trade are handled: a tab past the edge is announced
                by a fade on that side, and whichever tab is chosen moves to the
                front, bringing the ones after it into view. The strip once bled to the screen edges with a
                negative margin, which widened the page by that margin on a
                phone and set every section scrolling sideways; it stays inside
                its column. */}
            <div data-tab-bar className="flex scroll-mt-20 items-end gap-3 border-b border-slate-200 lg:scroll-mt-6">
                {/* The fades are drawn in the page's own grey, so they blend
                    into it instead of showing as white blocks at the edges. */}
                <div className="tab-scroll-wrap relative min-w-0 flex-1 [--tab-fade:var(--color-slate-50)]">
                    <div
                        ref={stripRef}
                        onScroll={markEdges}
                        role="tablist"
                        aria-label="My learning"
                        className="tab-scroll relative flex scroll-ps-7 items-center gap-x-4 sm:gap-x-5 lg:gap-x-7"
                    >
                        {tabs.map(({ key, label, icon: Icon }) => (
                            <button
                                key={key}
                                role="tab"
                                aria-selected={activeTab === key}
                                data-active={activeTab === key ? 'true' : 'false'}
                                onClick={() => { if (key === activeTab) stripRef.current?.closest('[data-tab-bar]')?.scrollIntoView({ block: 'start', behavior: 'smooth' }); else { tappedRef.current = true; setActiveTab(key); } }}
                                className={`tab-btn relative flex shrink-0 items-center gap-2 whitespace-nowrap px-1 pb-3 pt-1 text-sm font-bold lg:text-base ${activeTab === key ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                <Icon size={18} strokeWidth={1.8} className={`tab-icon ${activeTab === key ? 'text-indigo-500' : 'text-slate-400'}`} />
                                {label}
                                {key === 'completed' && completedCount > 0 && (
                                    <span className="tab-count rounded-full bg-emerald-100 px-1.5 py-0.5 text-[11px] font-black text-emerald-700">{completedCount}</span>
                                )}
                            </button>
                        ))}
                        <span aria-hidden="true" className="tab-ink" />
                    </div>
                </div>
            </div>

            {/* My Learning Content */}
            <div>
                <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center">
                    <span className="mr-3 rounded-2xl bg-indigo-100/80 p-3 text-indigo-600">
                        <BookOpen size={24} />
                    </span>
                    My Learning
                </h2>

                {/* Each tab's content eases in when it is chosen. */}
                <div key={activeTab} className="tab-panel">
                {activeTab === 'activity' ? (
                    weeklyActivity
                ) : activeTab === 'quiz' ? (
                    /* Its own loader and empty state: the paper comes from the
                       quizzes in the courses, not from the course list above. */
                    <GlobalQuiz />
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
            </div>

            {/* Enroll Confirmation Modal */}
            {enrollModal && (
                <Portal>
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
                </Portal>
            )}

            {/* Bundle View Overlay Modal */}
            {
                selectedBundle && (
                    <Portal>
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
                    </Portal>
                )
            }
        </section>
    );
};

export default DashboardCourses;
