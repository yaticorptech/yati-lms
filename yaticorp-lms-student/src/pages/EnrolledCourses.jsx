/**
 * @author Preethesh Kulal
 * @description Student enrolled courses listing with progress bars (no bundles:
 *              taken off every dashboard, 2026-10-26; a course open through a
 *              bundle is listed with the student's courses by the server)
 */
import React, { useState, useEffect, useRef, useContext } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { PlayCircle, Clock, BookOpen, Compass, CheckCircle2, Check, TrendingUp, Sparkles, Building2, Loader2, RotateCcw } from 'lucide-react';
import HeroWallet from '../components/rewards/HeroWallet';
import { useRewards } from '../context/useRewards';
import { NoCoursesArt } from '../components/PageArt';
import api from '../utils/api';
import { AuthContext } from '../context/AuthContext';
import useAutoRefresh from '../hooks/useAutoRefresh';
import YatiLoader from '../components/YatiLoader';
import useMinimumLoading from '../hooks/useMinimumLoading';

// The banner heading's second line: violet, shimmering, with the design's
// yellow underline under "off" and yellow strokes after it.
const HERO_ACCENT = 'lms-shimmer bg-gradient-to-r from-violet-700 via-purple-500 to-violet-700 bg-clip-text text-transparent';
const HeroUnderline = () => (
    <svg aria-hidden viewBox="0 0 100 12" preserveAspectRatio="none" className="pointer-events-none absolute -bottom-[0.12em] left-0 h-[0.2em] w-[92%]" fill="none" stroke="#f5b20b" strokeWidth="5" strokeLinecap="round">
        <path d="M4 8 C 30 3, 70 2, 96 6" />
    </svg>
);
const HeroSparks = () => (
    <svg aria-hidden viewBox="0 0 24 24" className="pointer-events-none absolute top-1/2 left-full ml-3 hidden h-[0.62em] w-[0.62em] -translate-y-1/2 @2xl:block" fill="none" stroke="#fbbf24" strokeWidth="2.6" strokeLinecap="round">
        <path d="M3 7 L11 3" /><path d="M3 12 H14" /><path d="M3 17 L11 21" />
    </svg>
);
const HERO_CHIP = 'inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[0.8rem] font-semibold whitespace-nowrap tabular-nums ring-1 ring-inset @2xl:px-3.5 @2xl:py-2.5 @2xl:text-[0.95rem]';
const HERO_SCENE_FADE = 'linear-gradient(to right, transparent 0, #000 20%, #000 90%, transparent 100%)';

const EnrolledCourses = () => {
    // Career Path can be switched off by an administrator; its link goes with it.
    const careerOn = useContext(AuthContext)?.isCareerPathEnabled !== false;
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    // The open tab lives in the address (?tab=organization), so it survives a
    // refresh and the back button returns to it.
    const [params, setParams] = useSearchParams();
    const requestedTab = params.get('tab') === 'organization' ? 'organization' : 'courses';
    const setActiveTab = (tab) => setParams(tab === 'courses' ? {} : { tab }, { replace: true });
    // The student's organization and every course it has published — null for
    // a student who is not in one, and then the tab is not shown at all.
    const [org, setOrg] = useState({ organization: null, courses: [] });
    // ?tab=organization is only honoured while there is an organization to
    // show: a student who was never in one, was removed from it, or whose
    // organization could not be loaded lands on My courses instead.
    const activeTab = requestedTab === 'organization' && !org.organization ? 'courses' : requestedTab;
    const [startingId, setStartingId] = useState(null);
    const [startError, setStartError] = useState('');
    // The list could not be loaded, and there is nothing loaded to show
    // instead. It used to fall through to "Nothing enrolled yet", which told a
    // student with a dropped connection that they had no courses.
    const [loadError, setLoadError] = useState(false);
    const loadedOnce = useRef(false);
    const navigate = useNavigate();
    // Wallet & Rewards sits in the banner only while the admin has rewards on.
    const walletOn = useRewards().enabled;

    const fetchMyCourses = async () => {
            try {
                const [res, orgRes] = await Promise.all([
                    api.get('/user/courses'),
                    // Its own failure must not take My courses down with it.
                    api.get('/user/courses/organization').catch(() => null)
                ]);
                // My courses is the platform's courses only. The organization's
                // own courses have their own section, even once enrolled in.
                setCourses((res.data.courses || []).filter((c) => !c.organizationId));
                if (orgRes) setOrg({ organization: orgRes.data?.organization || null, courses: orgRes.data?.courses || [] });
                loadedOnce.current = true;
                setLoadError(false);
                // A course found complete just now has paid its XP.
                if (res.data.rewards?.events?.length) window.dispatchEvent(new CustomEvent('yati:rewards', { detail: res.data.rewards.events }));
            } catch (err) {
                console.error('Failed to fetch courses:', err);
                // A refresh that fails keeps what is already on screen.
                if (!loadedOnce.current) setLoadError(true);
            } finally {
                setLoading(false);
            }
        };

    const retryLoad = () => {
        setLoadError(false);
        setLoading(true);
        fetchMyCourses();
    };

    // An organization course is free: starting one enrols the student and
    // opens it straight away.
    const startOrgCourse = async (course) => {
        setStartingId(course._id);
        setStartError('');
        try {
            await api.post(`/user/courses/${course._id}/enroll`);
            navigate(`/learn/${course._id}`);
        } catch (err) {
            // Enrolled already (another tab, or an admin did it), or already
            // theirs through a bundle: just open it.
            if (err.response?.status === 400 || err.response?.data?.code === 'IN_BUNDLE') return navigate(`/learn/${course._id}`);
            setStartError(err.response?.data?.message || 'Could not start this course. Please try again.');
            setStartingId(null);
        }
    };

    useAutoRefresh(fetchMyCourses, 30000);
    // Once loaded, drop a stale ?tab=organization from the address too, so a
    // refresh or the back button does not aim at a tab that is not there. The
    // param it writes no longer matches, so this runs at most once.
    useEffect(() => {
        if (!loading && requestedTab === 'organization' && !org.organization) setParams({}, { replace: true });
    }, [loading, requestedTab, org.organization, setParams]);
    // The same loader as Career Path: the orbit, a line, a bar — held for a
    // moment so it never flickers.
    const showLoader = useMinimumLoading(loading);


    // What the hero says: how many, how many finished, how far on average.
    const finished = courses.filter((c) => (c.progress || 0) >= 100).length;
    const avgProgress = courses.length
        ? Math.round(courses.reduce((n, c) => n + (c.progress || 0), 0) / courses.length)
        : 0;
    // The one to go back to: the furthest-along course that is not finished.
    const resume = courses
        .filter((c) => (c.progress || 0) > 0 && (c.progress || 0) < 100)
        .sort((a, b) => (b.progress || 0) - (a.progress || 0))[0];

    const getProgressVal = (id) => {
        const course = courses.find(c => c._id === id);
        return course?.progress || 0;
    };

    return (
        <div className="space-y-8 animate-fade-in pb-12">
            <div>
                {/* The banner, after the supplied design (2026-10-27): light
                    lavender, the words on the left, Yati reading on the books in
                    the middle (cut from the design: public/illustrations/
                    courses-hero-scene.jpg) and Wallet & Rewards on the right.
                    It is sized by its own width, so the picture comes in only
                    where all three fit; a phone stacks the wallet under the
                    words. */}
                <div className="lms-rise @container relative rounded-[1.75rem] text-indigo-950 shadow-[0_22px_44px_-30px_rgba(76,29,149,0.5)] ring-1 ring-violet-200/70">
                    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit] bg-[#f8f6fe]">
                        {/* A phone has the words on top and the wallet below, so its purple
                            comes from below rather than from the right. */}
                        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,#f8f6fe_0,#f8f6fe_40%,#cdc0fc_100%)] @2xl:bg-[linear-gradient(to_left,#aba6fb_0,#d2c5fd_21rem,#f8f6fe_40rem)]" />
                        {/* The purple hills along the foot, under the wallet, rising from
                            nothing on the left so they have no edge where the
                            picture is not shown. */}
                        <svg className="absolute right-0 bottom-0 h-[22%] w-[28rem] max-w-full" viewBox="0 0 448 100" preserveAspectRatio="none">
                            <defs>
                                <linearGradient id="courses-hero-hill" x1="0" x2="1" y1="0" y2="0">
                                    <stop offset="0" stopColor="#6c4dc8" />
                                    <stop offset="1" stopColor="#8f88f8" />
                                </linearGradient>
                            </defs>
                            <path d="M0 100 C 50 40, 120 10, 220 8 C 330 6, 400 15, 448 25 L448 100 Z" fill="#b8a8fa" opacity="0.6" />
                            <path d="M0 100 C 40 60, 80 42, 130 40 C 250 36, 360 45, 448 60 L448 100 Z" fill="url(#courses-hero-hill)" />
                        </svg>
                    </div>

                    <div className={`relative grid items-center gap-6 p-5 @2xl:px-10 @2xl:py-6 ${walletOn ? '@2xl:grid-cols-[minmax(0,1fr)_minmax(0,20rem)] @min-[68rem]:grid-cols-[minmax(0,1fr)_18rem_20rem] @min-[68rem]:gap-0 @min-[68rem]:pr-5' : '@min-[50rem]:grid-cols-[minmax(0,1fr)_18rem] @min-[50rem]:gap-0'}`}>
                        <div className="relative z-10 min-w-0">
                            <p className="inline-flex items-center gap-2 rounded-full bg-violet-100 px-4 py-1.5 text-[0.75rem] font-bold tracking-wide text-violet-700 uppercase ring-1 ring-violet-200/70 @2xl:text-[0.8rem]">
                                <BookOpen size={16} fill="#c4b5fd" aria-hidden />
                                Enrolled courses
                            </p>
                            <h1 className="mt-3 text-[1.75rem] font-black leading-[1.1] @2xl:text-[2.4rem] @min-[68rem]:text-[length:clamp(2.5rem,3.9cqw,3rem)]">
                                {courses.length > 0 ? (
                                    <>
                                        Pick up where you{' '}
                                        <span className="relative inline-block @2xl:block @2xl:w-fit">
                                            <span className={HERO_ACCENT}>left </span>
                                            <span className="relative inline-block">
                                                <span className={HERO_ACCENT}>off.</span>
                                                <HeroUnderline />
                                            </span>
                                            <HeroSparks />
                                        </span>
                                    </>
                                ) : (
                                    <>
                                        Your courses,{' '}
                                        <span className="relative inline-block @2xl:block @2xl:w-fit">
                                            <span className={HERO_ACCENT}>all in one place.</span>
                                            <HeroSparks />
                                        </span>
                                    </>
                                )}
                            </h1>
                            <p className="mt-2.5 max-w-[27.5rem] text-[0.85rem] font-medium leading-relaxed text-slate-500 @2xl:text-[0.95rem]">
                                {courses.length > 0
                                    ? 'Every course you are enrolled in, with how far you have come on each one.'
                                    : 'Once you enrol, each course lands here with its progress, ready to resume any time.'}
                            </p>

                            <div className="lms-stagger relative mt-4 flex flex-wrap items-center gap-2 @2xl:gap-2.5">
                                <svg aria-hidden viewBox="0 0 12 24" className="absolute top-1/2 -left-7 hidden h-6 w-3 -translate-y-1/2 @2xl:block" fill="none" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round">
                                    <path d="M2 3 L10 8" /><path d="M1 12 H10" /><path d="M2 21 L10 16" />
                                </svg>
                                {resume && (
                                    <Link
                                        to={`/learn/${resume._id}`}
                                        className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-violet-600/25 transition-all hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.98] sm:w-auto"
                                    >
                                        <PlayCircle size={18} />
                                        Resume {resume.title.length > 28 ? `${resume.title.slice(0, 28)}…` : resume.title}
                                    </Link>
                                )}
                                <span className={`${HERO_CHIP} bg-violet-100/80 text-indigo-900 ring-violet-200/70`}>
                                    <BookOpen size={18} className="text-violet-600" fill="#c4b5fd" aria-hidden />
                                    {courses.length} {courses.length === 1 ? 'course' : 'courses'}
                                </span>
                                <span className={`${HERO_CHIP} bg-sky-50 text-blue-950 ring-sky-100`}>
                                    <span aria-hidden className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-gradient-to-b from-sky-400 to-blue-600 text-white">
                                        <Check size={12} strokeWidth={3.2} />
                                    </span>
                                    {finished} finished
                                </span>
                                {courses.length > 0 && (
                                    <span className={`${HERO_CHIP} bg-emerald-50 text-emerald-950 ring-emerald-100`}>
                                        <TrendingUp size={18} strokeWidth={2.5} className="text-emerald-600" aria-hidden />
                                        <span>{avgProgress}%<span className="hidden sm:inline"> on average</span><span className="sm:hidden"> avg</span></span>
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Yati reading, from the design itself; it reaches the
                            banner's top and bottom edges, and fades at its sides. */}
                        <div aria-hidden className={`relative -my-6 hidden self-stretch ${walletOn ? '@min-[68rem]:block' : '@min-[50rem]:block'}`}>
                            <img src="/illustrations/courses-hero-scene.jpg" alt="" draggable={false}
                                className="absolute inset-y-0 left-1/2 h-full w-auto max-w-none -translate-x-1/2 select-none"
                                style={{ maskImage: HERO_SCENE_FADE, WebkitMaskImage: HERO_SCENE_FADE }} />
                        </div>

                        <HeroWallet />

                    </div>
                </div>

                {/* My courses, and the organization's: one segmented switch, with counts. */}
                {(() => {
                    const tabs = [
                        ['courses', 'My courses', BookOpen, courses.length],
                        ...(org.organization ? [['organization', 'Organization', Building2, org.courses.length]] : [])
                    ];
                    // Three tabs with their counts beside them do not fit a
                    // phone in one line — "Organization 0" ran off the right
                    // edge on a 360px screen — so on a phone the count sits
                    // under the label and the three share the width equally.
                    // Two tabs have the room, and keep the one-line form.
                    const stacked = tabs.length > 2;
                    return (
                <div className="lms-rise mt-6 mb-6 inline-flex w-full gap-1 rounded-2xl bg-white p-1.5 shadow-sm ring-1 ring-slate-200 sm:w-auto" style={{ animationDelay: '0.15s' }}>
                    {tabs.map(([key, label, Icon, count]) => {
                        const on = activeTab === key;
                        return (
                            <button
                                key={key}
                                type="button"
                                onClick={() => setActiveTab(key)}
                                aria-pressed={on}
                                className={`inline-flex min-h-10 min-w-0 items-center justify-center rounded-xl text-[12.5px] font-black whitespace-nowrap transition-all sm:flex-none sm:flex-row sm:gap-2 sm:px-4 sm:py-0 sm:text-sm ${
                                    stacked ? 'flex-1 flex-col gap-0.5 px-1.5 py-1.5' : 'flex-auto gap-1 px-2'
                                } ${
                                    on
                                        ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/25'
                                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                }`}
                            >
                                <Icon size={16} className={`hidden shrink-0 ${stacked ? 'sm:block' : 'min-[400px]:block'}`} />
                                {label}
                                <span className={`rounded-full px-1.5 py-0.5 text-[0.68rem] tabular-nums ${on ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                    {count}
                                </span>
                            </button>
                        );
                    })}
                </div>
                    );
                })()}

                {showLoader ? (
                    <YatiLoader label="Loading your courses" />
                ) : loadError ? (
                    <div role="alert" className="animate-fade-in-up rounded-3xl border border-rose-200 bg-rose-50 p-8 text-center sm:p-12">
                        <h3 className="text-xl font-black text-slate-900">Your courses could not be loaded</h3>
                        <p className="mx-auto mt-2 max-w-md text-slate-600">Check your connection, then try again.</p>
                        <button
                            type="button"
                            onClick={retryLoad}
                            className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 font-black text-white transition-colors hover:bg-indigo-700"
                        >
                            <RotateCcw size={18} /> Try again
                        </button>
                    </div>
                ) : activeTab === 'courses' ? (
                    courses.length > 0 ? (
                        <div className="lms-stagger grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {courses.map(course => {
                                const progress = getProgressVal(course._id);
                                return (
                                    <div key={course._id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:-translate-y-1 hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-300 group flex flex-col">
                                        {/* Thumbnail Area */}
                                        <div className="h-48 bg-slate-100 relative overflow-hidden">
                                            {course.thumbnail ? (
                                                <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                            ) : (
                                                <div className="w-full h-full flex justify-center items-center bg-indigo-50 text-indigo-200">
                                                    <BookOpen size={48} />
                                                </div>
                                            )}
                                            {progress >= 100 && (
                                                <span className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2.5 py-1 text-[0.68rem] font-black tracking-wider text-white uppercase shadow-md">
                                                    <CheckCircle2 size={12} strokeWidth={3} />
                                                    Finished
                                                </span>
                                            )}
                                            {progress > 0 && progress < 100 && (
                                                <span className="absolute top-3 left-3 rounded-full bg-white/90 px-2.5 py-1 text-[0.68rem] font-black text-indigo-700 shadow-md backdrop-blur tabular-nums">
                                                    {progress}% done
                                                </span>
                                            )}
                                            {/* Floating Play Button overlay on hover */}
                                            <div className="absolute inset-0 bg-slate-900/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <div className="w-14 h-14 bg-white/90 backdrop-blur rounded-full flex items-center justify-center text-indigo-600 shadow-lg translate-y-4 group-hover:translate-y-0 transition-all duration-300">
                                                    <PlayCircle size={32} className="ml-1" />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Card Content */}
                                        <div className="p-6 flex-1 flex flex-col">
                                            <h3 className="font-bold text-lg text-slate-800 line-clamp-2 min-h-[56px] mb-2 group-hover:text-indigo-600 transition-colors">
                                                {course.title}
                                            </h3>

                                            <div className="mt-auto pt-4">
                                                <div className="flex justify-between items-end mb-2">
                                                    <span className="text-sm font-semibold text-slate-500 flex items-center">
                                                        <Clock size={14} className="mr-1.5" /> Progress
                                                    </span>
                                                    <span className="text-sm font-bold text-indigo-600">{progress}%</span>
                                                </div>
                                                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                                                    <div
                                                        className={`h-2.5 rounded-full transition-all duration-1000 ease-out relative ${progress >= 100 ? 'bg-gradient-to-r from-emerald-500 to-teal-500' : 'bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500'}`}
                                                        style={{ width: `${progress}%` }}
                                                    >
                                                        <div className="absolute top-0 right-0 bottom-0 left-0 bg-white/20"></div>
                                                    </div>
                                                </div>

                                                <Link
                                                    to={`/learn/${course._id}`}
                                                    className={`mt-6 w-full flex justify-center items-center space-x-2 py-3 font-black rounded-xl transition-all ${
                                                        progress >= 100
                                                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                                                            : 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/25 hover:-translate-y-0.5 hover:shadow-lg'
                                                    }`}
                                                >
                                                    {progress >= 100 ? (
                                                        <><span>Review course</span> <CheckCircle2 size={18} /></>
                                                    ) : progress > 0 ? (
                                                        <><span>Resume course</span> <PlayCircle size={18} /></>
                                                    ) : (
                                                        <><span>Start course</span> <PlayCircle size={18} /></>
                                                    )}
                                                </Link>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="animate-fade-in-up relative overflow-hidden bg-gradient-to-br from-white to-indigo-50/60 rounded-3xl border border-indigo-100 p-8 sm:p-12 text-center flex flex-col items-center">
                            <div className="drift absolute -top-10 -right-10 w-48 h-48 bg-indigo-200/30 rounded-full blur-3xl pointer-events-none"></div>
                            <div className="relative mb-3 flex h-40 w-48 items-end justify-center" aria-hidden>
                                <span className="absolute bottom-1 left-1/2 h-5 w-32 -translate-x-1/2 rounded-full bg-indigo-400/30 blur-lg" />
                                <NoCoursesArt className="mc-pop relative h-36 w-36" />
                            </div>
                            <h3 className="relative text-xl sm:text-2xl font-black text-slate-900 mb-2">Nothing enrolled yet</h3>
                            <p className="relative text-slate-600 max-w-md mb-6">
                                Once you're enrolled, your courses live here with your progress on each one. Have a
                                look at what's available{careerOn ? ', or pick up your Career Path in the meantime' : ''}.
                            </p>
                            <div className="lms-stagger relative flex flex-wrap items-center justify-center gap-3">
                                <Link
                                    to="/"
                                    className="inline-flex items-center gap-2 px-6 py-3 min-h-12 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-black rounded-xl shadow-lg shadow-indigo-600/25 transition-all hover:-translate-y-0.5 hover:shadow-xl active:scale-[0.98]"
                                >
                                    <Sparkles size={18} />
                                    Browse courses
                                </Link>
                                {/* Only while Career Path is switched on: otherwise the
                                    route sends the student straight back home. */}
                                {careerOn && (
                                    <Link
                                        to="/career"
                                        className="inline-flex items-center gap-2 px-6 py-3 min-h-12 bg-white hover:bg-slate-50 text-slate-700 font-bold rounded-xl border border-slate-200 transition-colors"
                                    >
                                        <Compass size={18} />
                                        See my path
                                    </Link>
                                )}
                            </div>
                        </div>
                    )
                ) : (
                    <OrganizationCourses org={org} startingId={startingId} startError={startError} onStart={startOrgCourse} />
                )}
            </div>

        </div>
    );
};

/**
 * The Organization tab: every course the student's own organization has
 * published, for its students only and always free. One they have not started
 * yet enrols them and opens with a single click; one they have is resumed.
 */
const OrganizationCourses = ({ org, startingId, startError, onStart }) => {
    const { organization, courses } = org;
    // The parent only opens this tab with an organization, but an auto-refresh
    // can take it away mid-render (the student was just removed).
    if (!organization) return null;
    return (
        <div className="space-y-5">
            <div className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                {/* The logo as uploaded, whole: no tile, outline or crop.
                    Cropped into a rounded square it cut a tall logo (the
                    YATICORP mascot) and boxed it in (2026-10-02). */}
                {organization.logo ? (
                    <img src={organization.logo} alt="" className="h-12 w-12 shrink-0 object-contain" />
                ) : (
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600"><Building2 size={22} /></span>
                )}
                <div className="min-w-0">
                    <p className="truncate font-black text-slate-900">{organization.name}</p>
                    <p className="text-sm text-slate-500">Courses from your organization.</p>
                </div>
            </div>

            {startError && (
                <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">{startError}</p>
            )}

            {courses.length === 0 ? (
                <div className="animate-fade-in-up relative overflow-hidden bg-gradient-to-br from-white to-indigo-50/60 rounded-3xl border border-indigo-100 p-8 sm:p-12 text-center flex flex-col items-center">
                    <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600"><Building2 size={30} /></span>
                    <h3 className="text-xl sm:text-2xl font-black text-slate-900 mb-2">No courses yet</h3>
                    <p className="text-slate-500 max-w-sm">{organization.name} hasn't published any courses yet. They'll show up here as soon as it does.</p>
                </div>
            ) : (
                <div className="lms-stagger grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {courses.map((course) => {
                        const progress = course.progress || 0;
                        const done = progress >= 100;
                        const starting = startingId === course._id;
                        const button = `mt-5 w-full flex justify-center items-center gap-2 py-3 font-black rounded-xl transition-all ${
                            done
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                                : 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/25 hover:-translate-y-0.5 hover:shadow-lg'
                        }`;
                        return (
                            <div key={course._id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:-translate-y-1 hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-300 group flex flex-col">
                                <div className="h-44 bg-slate-100 relative overflow-hidden">
                                    {course.thumbnail ? (
                                        <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                    ) : (
                                        <div className="w-full h-full flex justify-center items-center bg-gradient-to-br from-indigo-50 via-violet-50 to-fuchsia-50 text-indigo-400">
                                            <BookOpen size={44} />
                                        </div>
                                    )}
                                    <span className="absolute top-3 right-3 rounded-full bg-emerald-500 px-2.5 py-1 text-[0.68rem] font-black text-white shadow-md">Free</span>
                                    {course.enrolled && (
                                        <span className={`absolute top-3 left-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[0.68rem] font-black shadow-md tabular-nums ${done ? 'bg-emerald-500 text-white' : 'bg-white/90 text-indigo-700 backdrop-blur'}`}>
                                            {done ? <><CheckCircle2 size={12} strokeWidth={3} /> Finished</> : progress > 0 ? `${progress}% done` : 'Enrolled'}
                                        </span>
                                    )}
                                </div>

                                <div className="p-5 flex-1 flex flex-col">
                                    <h3 className="font-bold text-lg text-slate-800 line-clamp-2 min-h-[56px] mb-1.5 group-hover:text-indigo-600 transition-colors">{course.title}</h3>
                                    <p className="line-clamp-2 text-sm text-slate-500">{course.description || `A course from ${organization.name}.`}</p>

                                    <div className="mt-auto pt-4">
                                        {course.enrolled && (
                                            <>
                                                <div className="flex justify-between items-end mb-2">
                                                    <span className="text-sm font-semibold text-slate-500 flex items-center"><Clock size={14} className="mr-1.5" /> Progress</span>
                                                    <span className="text-sm font-bold text-indigo-600">{progress}%</span>
                                                </div>
                                                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                                                    <div className={`h-2.5 rounded-full ${done ? 'bg-gradient-to-r from-emerald-500 to-teal-500' : 'bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500'}`} style={{ width: `${progress}%` }} />
                                                </div>
                                            </>
                                        )}
                                        {course.enrolled ? (
                                            <Link to={`/learn/${course._id}`} className={button}>
                                                {done ? <>Review course <CheckCircle2 size={18} /></> : progress > 0 ? <>Resume course <PlayCircle size={18} /></> : <>Start course <PlayCircle size={18} /></>}
                                            </Link>
                                        ) : (
                                            <button type="button" onClick={() => onStart(course)} disabled={Boolean(startingId)} className={`${button} disabled:cursor-wait disabled:opacity-70`}>
                                                {starting ? <><Loader2 size={18} className="animate-spin" /> Starting…</> : <>Start course <PlayCircle size={18} /></>}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default EnrolledCourses;
