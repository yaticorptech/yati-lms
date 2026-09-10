/**
 * @author Preethesh Kulal
 * @description Student enrolled courses and bundles listing with progress bars
 */
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { PlayCircle, Clock, BookOpen, Award, X, Compass, Layers, CheckCircle2, TrendingUp, Sparkles } from 'lucide-react';
import { CoursesArt, NoBundlesArt, NoCoursesArt } from '../components/PageArt';
import api from '../utils/api';
import useAutoRefresh from '../hooks/useAutoRefresh';
import YatiLoader from '../components/YatiLoader';
import useMinimumLoading from '../hooks/useMinimumLoading';

const EnrolledCourses = () => {
    const [courses, setCourses] = useState([]);
    const [bundles, setBundles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('courses');
    const [selectedBundle, setSelectedBundle] = useState(null);

    const fetchMyCourses = async () => {
            try {
                const res = await api.get('/user/courses');
                setCourses(res.data.courses);
                setBundles(res.data.bundles || []);
            } catch (err) {
                console.error('Failed to fetch courses:', err);
            } finally {
                setLoading(false);
            }
        };

    useAutoRefresh(fetchMyCourses, 30000);
    // The same loader as Career Path: the mascot, a line, a bar — held for a
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

    const getProgressVal = (id, isBundle = false) => {
        if (isBundle) {
            const bundle = bundles.find(b => b._id === id);
            return bundle?.progress || 0;
        }
        const course = courses.find(c => c._id === id);
        return course?.progress || 0;
    };

    return (
        <div className="space-y-8 animate-fade-in pb-12">
            <div>
                <div className="lms-rise lms-sheen relative overflow-hidden rounded-3xl bg-[#1e1b4b] p-6 text-white shadow-xl shadow-indigo-900/30 md:p-8">
                    <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-br from-indigo-900 via-violet-800 to-indigo-700" />
                    <div aria-hidden className="pointer-events-none absolute -top-32 -left-24 h-80 w-80 rounded-full bg-fuchsia-500/30 blur-3xl" />
                    <div aria-hidden className="pointer-events-none absolute -right-16 -bottom-36 h-96 w-96 rounded-full bg-amber-400/25 blur-3xl" />
                    <div
                        aria-hidden
                        className="pointer-events-none absolute inset-0 opacity-[0.16]"
                        style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.8) 1px, transparent 1px)', backgroundSize: '22px 22px' }}
                    />
                    <div aria-hidden className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent" />
                    <span aria-hidden className="cm-drift pointer-events-none absolute top-6 left-[48%] hidden text-2xl md:block" style={{ animationDelay: '-1.2s' }}>📚</span>
                    <span aria-hidden className="cm-drift pointer-events-none absolute bottom-8 left-[60%] hidden text-xl md:block" style={{ animationDelay: '-3.4s' }}>🎓</span>
                    <span aria-hidden className="cm-drift pointer-events-none absolute top-5 right-[24%] hidden text-lg md:block" style={{ animationDelay: '-0.5s' }}>✨</span>

                    <div className="relative grid items-center gap-6 md:grid-cols-[minmax(0,1fr)_auto]">
                        <div className="min-w-0">
                            <p className="flex items-center gap-2 text-[0.7rem] font-black tracking-[0.18em] text-indigo-200 uppercase">
                                <BookOpen size={14} />
                                Enrolled courses
                            </p>
                            <h1 className="mt-2 text-3xl font-black leading-tight sm:text-4xl">
                                {courses.length > 0 ? (
                                    <>Pick up where you <span className="lms-shimmer bg-gradient-to-r from-amber-300 via-orange-300 to-amber-300 bg-clip-text text-transparent">left off.</span></>
                                ) : (
                                    <>Your courses, <span className="lms-shimmer bg-gradient-to-r from-amber-300 via-orange-300 to-amber-300 bg-clip-text text-transparent">all in one place.</span></>
                                )}
                            </h1>
                            <p className="mt-2 max-w-lg text-sm font-medium text-indigo-200 sm:text-base">
                                {courses.length > 0
                                    ? 'Every course you are enrolled in, with how far you have come on each one.'
                                    : 'Once you enrol, each course lands here with its progress, ready to resume any time.'}
                            </p>

                            <div className="lms-stagger mt-5 flex flex-wrap items-center gap-2.5">
                                {resume && (
                                    <Link
                                        to={`/learn/${resume._id}`}
                                        className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-black text-indigo-700 shadow-lg shadow-indigo-900/20 transition-all hover:-translate-y-0.5 hover:bg-indigo-50 active:scale-[0.98]"
                                    >
                                        <PlayCircle size={18} />
                                        Resume {resume.title.length > 28 ? `${resume.title.slice(0, 28)}…` : resume.title}
                                    </Link>
                                )}
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold ring-1 ring-white/25 ring-inset tabular-nums">
                                    <BookOpen size={14} />
                                    {courses.length} {courses.length === 1 ? 'course' : 'courses'}
                                </span>
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold ring-1 ring-white/25 ring-inset tabular-nums">
                                    <CheckCircle2 size={14} />
                                    {finished} finished
                                </span>
                                {courses.length > 0 && (
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold ring-1 ring-white/25 ring-inset tabular-nums">
                                        <TrendingUp size={14} />
                                        {avgProgress}% on average
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* The mascot on its lit stage. Decorative. */}
                        <div aria-hidden className="relative hidden h-52 w-64 items-end justify-center pb-3 md:flex">
                            <span className="cm-glow absolute bottom-6 left-1/2 h-40 w-40 rounded-full bg-white/35 blur-2xl" />
                            <span className="cm-ring absolute bottom-3 left-1/2 h-10 w-44 rounded-[50%] border-2 border-white/50" />
                            <span className="absolute bottom-2 left-1/2 h-9 w-44 -translate-x-1/2 rounded-[50%] bg-indigo-950/30" />
                            <span className="absolute bottom-4 left-1/2 h-9 w-44 -translate-x-1/2 rounded-[50%] bg-gradient-to-b from-white/70 to-indigo-100/60 shadow-lg" />
                            <span className="absolute bottom-[26px] left-1/2 h-4 w-28 -translate-x-1/2 rounded-[50%] bg-white/50" />
                            <CoursesArt className="mc-pop relative h-44 w-44" />
                        </div>
                    </div>
                </div>

                {/* Courses or bundles: one segmented switch, with counts. */}
                <div className="lms-rise mt-6 mb-6 inline-flex w-full gap-1 rounded-2xl bg-white p-1.5 shadow-sm ring-1 ring-slate-200 sm:w-auto" style={{ animationDelay: '0.15s' }}>
                    {[
                        ['courses', 'My courses', BookOpen, courses.length],
                        ['bundles', 'Bundles', Layers, bundles.length]
                    ].map(([key, label, Icon, count]) => {
                        const on = activeTab === key;
                        return (
                            <button
                                key={key}
                                type="button"
                                onClick={() => setActiveTab(key)}
                                aria-pressed={on}
                                className={`inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl px-4 text-sm font-black whitespace-nowrap transition-all sm:flex-none ${
                                    on
                                        ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/25'
                                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                }`}
                            >
                                <Icon size={16} />
                                {label}
                                <span className={`rounded-full px-1.5 py-0.5 text-[0.68rem] tabular-nums ${on ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                    {count}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {showLoader ? (
                    <YatiLoader label="Loading your courses" />
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
                                look at what's available, or pick up your Career Path in the meantime.
                            </p>
                            <div className="lms-stagger relative flex flex-wrap items-center justify-center gap-3">
                                <Link
                                    to="/"
                                    className="inline-flex items-center gap-2 px-6 py-3 min-h-12 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-black rounded-xl shadow-lg shadow-indigo-600/25 transition-all hover:-translate-y-0.5 hover:shadow-xl active:scale-[0.98]"
                                >
                                    <Sparkles size={18} />
                                    Browse courses
                                </Link>
                                <Link
                                    to="/career"
                                    className="inline-flex items-center gap-2 px-6 py-3 min-h-12 bg-white hover:bg-slate-50 text-slate-700 font-bold rounded-xl border border-slate-200 transition-colors"
                                >
                                    <Compass size={18} />
                                    See my path
                                </Link>
                            </div>
                        </div>
                    )
                ) : (
                    bundles.length > 0 ? (
                        <div className="lms-stagger grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {bundles.map(bundle => {
                                const progress = getProgressVal(bundle._id, true);
                                return (
                                    <div key={bundle._id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:-translate-y-1 hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-300 group flex flex-col">
                                        <div className="h-48 bg-gradient-to-br from-indigo-900 to-purple-900 relative overflow-hidden flex items-center justify-center">
                                            {bundle.thumbnail ? (
                                                <img src={bundle.thumbnail} alt={bundle.title} className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-500" />
                                            ) : (
                                                <BookOpen size={48} className="text-white/30 absolute" />
                                            )}
                                            <h3 className="font-bold text-xl text-white relative z-10 drop-shadow-md px-4 text-center">{bundle.title}</h3>
                                        </div>

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
                                                        className={`h-2.5 rounded-full transition-all duration-1000 ease-out relative ${progress >= 100 ? 'bg-gradient-to-r from-emerald-500 to-teal-500' : 'bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500'}`}
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
                        <div className="animate-fade-in-up relative overflow-hidden bg-gradient-to-br from-white to-indigo-50/60 rounded-3xl border border-indigo-100 p-8 sm:p-12 text-center flex flex-col items-center">
                            <div className="drift absolute -top-10 -left-10 w-48 h-48 bg-indigo-200/30 rounded-full blur-3xl pointer-events-none"></div>
                            <div className="relative mb-3 flex h-40 w-48 items-end justify-center" aria-hidden>
                                <span className="absolute bottom-1 left-1/2 h-5 w-32 -translate-x-1/2 rounded-full bg-indigo-400/30 blur-lg" />
                                <NoBundlesArt className="mc-pop relative h-36 w-36" />
                            </div>
                            <h3 className="relative text-xl sm:text-2xl font-black text-slate-900 mb-2">No bundles yet</h3>
                            <p className="text-slate-500 max-w-sm mb-6">
                                No course bundles have been published yet. Check back soon.
                            </p>
                        </div>
                    )
                )}
            </div>

            {/* Bundle View Overlay Modal */}
            {selectedBundle && (
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
                            <div className="lms-stagger grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {selectedBundle.courses && selectedBundle.courses.length > 0 ? (
                                    selectedBundle.courses.map(bc => {
                                        // Attempt to match bundle sub-course with full course object from primary courses array
                                        const fullCourse = courses.find(c => c._id === bc._id) || bc;
                                        const progress = getProgressVal(bc._id);
                                        return (
                                            <div key={bc._id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:-translate-y-1 hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-300 group flex flex-col">
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
                                                        <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden mb-4">
                                                            <div
                                                                className={`h-2.5 rounded-full transition-all duration-1000 ease-out relative ${progress >= 100 ? 'bg-gradient-to-r from-emerald-500 to-teal-500' : 'bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500'}`}
                                                                style={{ width: `${progress}%` }}
                                                            />
                                                        </div>
                                                        <Link
                                                            to={`/learn/${bc._id}`}
                                                            className="w-full flex justify-center items-center space-x-2 py-2.5 bg-slate-50 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 font-bold text-sm rounded-lg transition-colors border border-slate-200 hover:border-indigo-200"
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
            )}
        </div>
    );
};

export default EnrolledCourses;
