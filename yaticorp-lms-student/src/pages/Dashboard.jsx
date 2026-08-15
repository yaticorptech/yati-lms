/**
 * @author Preethesh Kulal
 * @description Student dashboard with enrolled courses, bundles, completed tab and available courses
 */
import React, { useState, useContext } from 'react';
import api from '../utils/api';
import { AuthContext } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { BookOpen, Award, PlayCircle, BarChart3, Clock, X } from 'lucide-react';

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
            <div className="bg-indigo-600 rounded-3xl p-8 md:p-10 shadow-lg shadow-indigo-600/20 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                <div className="relative z-10">
                    <h1 className="text-3xl md:text-4xl font-bold mb-2">{getGreeting()}, {user?.name.split(' ')[0]}! 👋</h1>
                    <p className="text-indigo-100 text-lg max-w-xl">Pick up right where you left off and keep moving towards your learning goals.</p>
                </div>
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex items-center space-x-4">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                        <BookOpen size={24} />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Total Courses</p>
                        <p className="text-2xl font-bold text-slate-800">{courses.length}</p>
                    </div>
                </div>
                <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex items-center space-x-4">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                        <BarChart3 size={24} />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">In Progress</p>
                        <p className="text-2xl font-bold text-slate-800">{inProgressCount}</p>
                    </div>
                </div>
                <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex items-center space-x-4">
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                        <Award size={24} />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Completed</p>
                        <p className="text-2xl font-bold text-slate-800">{completedCount}</p>
                    </div>
                </div>
            </div>

            {/* My Learning Tabs */}
            <div className="flex border-b border-slate-200">
                <button
                    onClick={() => setActiveTab('courses')}
                    className={`pb-4 px-2 mr-6 font-bold text-lg transition-colors relative ${activeTab === 'courses' ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    My Courses
                    {activeTab === 'courses' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-t-full"></div>}
                </button>
                <button
                    onClick={() => setActiveTab('bundles')}
                    className={`pb-4 px-2 mr-6 font-bold text-lg transition-colors relative ${activeTab === 'bundles' ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    My Bundles
                    {activeTab === 'bundles' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-t-full"></div>}
                </button>
                <button
                    onClick={() => setActiveTab('completed')}
                    className={`pb-4 px-2 mr-6 font-bold text-lg transition-colors relative ${activeTab === 'completed' ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    Completed
                    {completedCount > 0 && (
                        <span className="ml-2 text-xs font-black bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">{completedCount}</span>
                    )}
                    {activeTab === 'completed' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-t-full"></div>}
                </button>
                <button
                    onClick={() => setActiveTab('available')}
                    className={`pb-4 px-2 font-bold text-lg transition-colors relative ${activeTab === 'available' ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
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
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {courses.map(course => {
                                const progress = getProgressVal(course._id);
                                return (
                                    <div key={course._id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-lg transition-all duration-300 group flex flex-col">
                                        {/* Thumbnail Area */}
                                        <div className="h-48 bg-slate-100 relative overflow-hidden">
                                            {course.thumbnail ? (
                                                <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                            ) : (
                                                <div className="w-full h-full flex justify-center items-center bg-indigo-50 text-indigo-200">
                                                    <BookOpen size={48} />
                                                </div>
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
                                                        className="bg-indigo-600 h-2.5 rounded-full transition-all duration-1000 ease-out relative"
                                                        style={{ width: `${progress}%` }}
                                                    >
                                                        <div className="absolute top-0 right-0 bottom-0 left-0 bg-white/20"></div>
                                                    </div>
                                                </div>

                                                <Link
                                                    to={`/learn/${course._id}`}
                                                    className="mt-6 w-full flex justify-center items-center space-x-2 py-3 bg-slate-50 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 font-bold rounded-xl transition-colors border border-slate-200 hover:border-indigo-200"
                                                >
                                                    {progress > 0 ? (
                                                        <><span>Resume Course</span> <PlayCircle size={18} /></>
                                                    ) : (
                                                        <><span>Start Course</span> <PlayCircle size={18} /></>
                                                    )}
                                                </Link>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="bg-white rounded-3xl border border-slate-200 border-dashed p-12 text-center flex flex-col items-center">
                            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                                <BookOpen size={32} className="text-slate-400" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 mb-2">No active course enrollments</h3>
                            <p className="text-slate-500 max-w-sm mb-6">
                                You are currently not enrolled in any individual courses.
                            </p>
                        </div>
                    )
                ) : activeTab === 'bundles' ? (
                    bundles.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {bundles.map(bundle => {
                                const progress = getProgressVal(bundle._id, true);
                                return (
                                    <div key={bundle._id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-lg transition-all duration-300 group flex flex-col">
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
                            <h3 className="text-xl font-bold text-slate-800 mb-2">No active bundle enrollments</h3>
                            <p className="text-slate-500 max-w-sm mb-6">
                                You are currently not enrolled in any course bundles.
                            </p>
                        </div>
                    )
                ) : activeTab === 'completed' ? (
                    completedCourses.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {availableCourses.map(course => (
                                <div key={course._id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-lg transition-all duration-300 group flex flex-col">
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
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {selectedBundle.courses && selectedBundle.courses.length > 0 ? (
                                        selectedBundle.courses.map(bc => {
                                            // Attempt to match bundle sub-course with full course object from primary courses array
                                            const fullCourse = courses.find(c => c._id === bc._id) || bc;
                                            const progress = getProgressVal(bc._id);
                                            return (
                                                <div key={bc._id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-lg transition-all duration-300 group flex flex-col">
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
