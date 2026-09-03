/**
 * @author Preethesh Kulal
 * @description Student dashboard with enrolled courses, bundles, completed tab and available courses
 */
import React, { useState, useContext } from 'react';
import api from '../utils/api';
import useCountUp from '../hooks/useCountUp';
import ContinueLearningCard from '../components/course/ContinueLearningCard';
import CourseCard from '../components/course/CourseCard';
import { AuthContext } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { BookOpen, Award, PlayCircle, BarChart3, Clock, X, Compass } from 'lucide-react';

import { useDashboard } from '../shared/hooks/useDashboard';

const Dashboard = () => {
    const { user } = useContext(AuthContext);
    const {
        courses,
        bundles,
        availableCourses,
        loading,
        error,
        buyingCourseId,
        enrollCourse,
        refresh
    } = useDashboard(api);

    const [activeTab, setActiveTab] = useState('courses');
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

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good morning';
        if (hour < 18) return 'Good afternoon';
        return 'Good evening';
    };

    // Only count courses where progress > 1%
    const activeCourses = courses.filter(c => getProgressVal(c._id) > 1);

    // Completed courses (100%)
    const completedCourses = activeCourses.filter(c => getProgressVal(c._id) === 100);
    const completedCount = completedCourses.length;

    // In-progress courses (between 1% and 99%)
    const inProgressCourses = activeCourses.filter(c => {
        const progress = getProgressVal(c._id);
        return progress > 1 && progress < 100;
    });
    const inProgressCount = inProgressCourses.length;

    // What "Continue learning" points at: the in-progress course the student has
    // taken furthest. Undefined when nothing is in progress, and the hero simply
    // does not render — the dashboard already has an empty state for that.
    const resumeCourse = [...inProgressCourses].sort(
        (a, b) => getProgressVal(b._id) - getProgressVal(a._id)
    )[0];

    const totalShown = useCountUp(courses.length);
    const inProgressShown = useCountUp(inProgressCount);
    const completedShown = useCountUp(completedCount);

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
        <div className="space-y-8 animate-fade-in pb-12">
            {/* Welcome Header */}
            <div className="animate-fade-in-up sheen bg-gradient-to-br from-indigo-600 via-indigo-600 to-violet-700 rounded-3xl p-6 sm:p-8 md:p-10 shadow-xl shadow-indigo-600/25 text-white relative overflow-hidden">
                <div className="drift absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                <div className="drift absolute bottom-0 left-1/3 w-48 h-48 bg-fuchsia-400/20 rounded-full blur-3xl -mb-20 pointer-events-none" style={{ animationDelay: '1.5s' }}></div>
                <div className="relative z-10">
                    <h1 className="text-3xl md:text-4xl font-bold mb-2">{getGreeting()}, {user?.name.split(' ')[0]}! 👋</h1>
                    <p className="text-indigo-100 text-base sm:text-lg max-w-xl">Pick up right where you left off and keep moving towards your learning goals.</p>
                </div>
            </div>

            {/* The next step, before anything else on the page. Renders nothing
                when no course is part-finished. */}
            <ContinueLearningCard course={resumeCourse} progress={getProgressVal(resumeCourse?._id)} />

            {/* Stats Summary */}
            <div className="stagger grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="lift bg-white rounded-2xl p-4 sm:p-6 border border-slate-100 shadow-sm flex items-center space-x-4">
                    <div className="animate-pop-in p-3 bg-blue-50 text-blue-600 rounded-xl">
                        <BookOpen size={24} />
                    </div>
                    <div>
                        <p className="text-xs sm:text-sm font-semibold text-slate-500 uppercase tracking-wider">Total Courses</p>
                        <p className="text-2xl font-bold text-slate-800 tabular-nums">{totalShown}</p>
                    </div>
                </div>
                <div className="lift bg-white rounded-2xl p-4 sm:p-6 border border-slate-100 shadow-sm flex items-center space-x-4">
                    <div className="animate-pop-in p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                        <BarChart3 size={24} />
                    </div>
                    <div>
                        <p className="text-xs sm:text-sm font-semibold text-slate-500 uppercase tracking-wider">In Progress</p>
                        <p className="text-2xl font-bold text-slate-800 tabular-nums">{inProgressShown}</p>
                    </div>
                </div>
                <div className="lift bg-white rounded-2xl p-4 sm:p-6 border border-slate-100 shadow-sm flex items-center space-x-4">
                    <div className="animate-pop-in p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                        <Award size={24} />
                    </div>
                    <div>
                        <p className="text-xs sm:text-sm font-semibold text-slate-500 uppercase tracking-wider">Completed</p>
                        <p className="text-2xl font-bold text-slate-800 tabular-nums">{completedShown}</p>
                    </div>
                </div>
            </div>

            {/* My Learning Tabs */}
            {/* Four tabs at text-lg do not fit a phone. Left as a plain flex
                they widened the page itself, which is what pushed every other
                section off the left edge. The strip now scrolls on its own —
                the negative margin lets it bleed to the screen edges so the
                scroll reads as more-to-see rather than as a clipped box. */}
            <div className="-mx-4 flex overflow-x-auto border-b border-slate-200 px-4 sm:mx-0 sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <button
                    onClick={() => setActiveTab('courses')}
                    className={`shrink-0 whitespace-nowrap pb-4 px-2 mr-5 sm:mr-6 font-bold text-base sm:text-lg transition-colors relative ${activeTab === 'courses' ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    My Courses
                    {activeTab === 'courses' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-t-full"></div>}
                </button>
                <button
                    onClick={() => setActiveTab('bundles')}
                    className={`shrink-0 whitespace-nowrap pb-4 px-2 mr-5 sm:mr-6 font-bold text-base sm:text-lg transition-colors relative ${activeTab === 'bundles' ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    Bundles
                    {activeTab === 'bundles' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-t-full"></div>}
                </button>
                <button
                    onClick={() => setActiveTab('completed')}
                    className={`shrink-0 whitespace-nowrap pb-4 px-2 mr-5 sm:mr-6 font-bold text-base sm:text-lg transition-colors relative ${activeTab === 'completed' ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    Completed
                    {completedCount > 0 && (
                        <span className="ml-2 text-xs font-black bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">{completedCount}</span>
                    )}
                    {activeTab === 'completed' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-t-full"></div>}
                </button>
                <button
                    onClick={() => setActiveTab('available')}
                    className={`shrink-0 whitespace-nowrap pb-4 px-2 font-bold text-base sm:text-lg transition-colors relative ${activeTab === 'available' ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    Available Courses
                    {activeTab === 'available' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-t-full"></div>}
                </button>
            </div>

            {/* My Learning Content */}
            <div>
                <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center">
                    <span className="bg-indigo-100 text-indigo-600 p-2 rounded-lg mr-3">
                        <PlayCircle size={20} />
                    </span>
                    My Learning
                </h2>

                {loading ? (
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
                    courses.length > 0 ? (
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
                    ) : (
                        <div className="animate-fade-in-up relative overflow-hidden bg-gradient-to-br from-white to-indigo-50/60 rounded-3xl border border-indigo-100 p-8 sm:p-12 text-center flex flex-col items-center">
                            <div className="drift absolute -top-10 -right-10 w-48 h-48 bg-indigo-200/30 rounded-full blur-3xl pointer-events-none"></div>
                            <div className="drift absolute -bottom-12 -left-8 w-40 h-40 bg-violet-200/30 rounded-full blur-3xl pointer-events-none" style={{ animationDelay: '2s' }}></div>
                            <div className="animate-pop-in relative w-20 h-20 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl flex items-center justify-center mb-5 shadow-lg shadow-indigo-500/30">
                                <BookOpen size={34} className="text-white" />
                            </div>
                            <h3 className="relative text-xl sm:text-2xl font-bold text-slate-800 mb-2">Your first course is waiting</h3>
                            <p className="relative text-slate-600 max-w-md mb-6">
                                Nothing here yet. Browse what's available and start something today — every course
                                you finish adds XP and moves your Career Path forward.
                            </p>
                            <div className="relative flex flex-wrap items-center justify-center gap-3">
                                <button
                                    onClick={() => setActiveTab('available')}
                                    className="lift inline-flex items-center gap-2 px-6 py-3 min-h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/25 transition-colors"
                                >
                                    <BookOpen size={18} />
                                    Browse courses
                                </button>
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
                        <div className="bg-white rounded-3xl border border-slate-200 border-dashed p-12 text-center flex flex-col items-center">
                            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                                <Award size={32} className="text-slate-400" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 mb-2">No bundles yet</h3>
                            <p className="text-slate-500 max-w-sm mb-6">
                                No course bundles have been published yet. Check back soon.
                            </p>
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
                        <div className="bg-white rounded-3xl border border-slate-200 border-dashed p-12 text-center flex flex-col items-center">
                            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                                <Award size={32} className="text-slate-400" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 mb-2">No completed courses yet</h3>
                            <p className="text-slate-500 max-w-sm">Keep learning — your completed courses will appear here.</p>
                        </div>
                    )
                ) : activeTab === 'available' ? (
                    availableCourses.length > 0 ? (
                        <div className="stagger grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {availableCourses.map(course => (
                                <div key={course._id} className="lift bg-white rounded-2xl border border-slate-200 overflow-hidden transition-shadow duration-300 group flex flex-col">
                                    <div className="h-48 bg-slate-100 relative overflow-hidden">
                                        {course.thumbnail ? (
                                            <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                        ) : (
                                            <div className="w-full h-full flex justify-center items-center bg-indigo-50 text-indigo-200">
                                                <BookOpen size={48} />
                                            </div>
                                        )}
                                        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-3 py-1.5 rounded-full shadow-sm flex items-center">
                                            <span className="text-indigo-600 font-bold text-sm">
                                                {course.price > 0 ? `₹${course.price}` : 'Free'}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="p-6 flex-1 flex flex-col">
                                        <h3 className="font-bold text-lg text-slate-800 line-clamp-2 min-h-[56px] mb-2 group-hover:text-indigo-600 transition-colors">
                                            {course.title}
                                        </h3>
                                        <p className="text-sm text-slate-500 mb-4 line-clamp-2 overflow-hidden text-ellipsis">
                                            {course.description}
                                        </p>

                                        <div className="mt-auto pt-4">
                                            <button
                                                onClick={() => handleEnrollClick(course)}
                                                disabled={buyingCourseId === course._id}
                                                className={`w-full flex justify-center items-center py-3 font-bold rounded-xl transition-colors shadow-sm ${buyingCourseId === course._id ? 'bg-indigo-400 text-white cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}
                                            >
                                                {buyingCourseId === course._id ? 'Enrolling...' : 'Enroll Now'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-white rounded-3xl border border-slate-200 border-dashed p-12 text-center flex flex-col items-center">
                            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                                <Award size={32} className="text-slate-400" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 mb-2">No courses available for purchase</h3>
                            <p className="text-slate-500 max-w-sm mb-6">
                                Keep an eye out for new courses, or earn more credits by completing quizzes!
                            </p>
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
        </div >
    );
};

export default Dashboard;
