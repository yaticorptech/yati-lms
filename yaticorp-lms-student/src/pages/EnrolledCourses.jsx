/**
 * @author Preethesh Kulal
 * @description Student enrolled courses and bundles listing with progress bars
 */
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { PlayCircle, Clock, BookOpen, Award, X, Compass } from 'lucide-react';
import api from '../utils/api';
import useAutoRefresh from '../hooks/useAutoRefresh';

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
                <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center">
                    <span className="bg-indigo-100 text-indigo-600 p-2 rounded-lg mr-3">
                        <BookOpen size={20} />
                    </span>
                    Enrolled Courses
                </h2>

                <div className="-mx-4 mb-6 flex overflow-x-auto border-b border-slate-200 px-4 sm:mx-0 sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    <button
                        onClick={() => setActiveTab('courses')}
                        className={`shrink-0 whitespace-nowrap pb-4 px-2 mr-5 sm:mr-6 font-bold text-base sm:text-lg transition-colors relative ${activeTab === 'courses' ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        My Courses
                        {activeTab === 'courses' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-t-full"></div>}
                    </button>
                    <button
                        onClick={() => setActiveTab('bundles')}
                        className={`shrink-0 whitespace-nowrap pb-4 px-2 font-bold text-base sm:text-lg transition-colors relative ${activeTab === 'bundles' ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Bundles
                        {activeTab === 'bundles' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-t-full"></div>}
                    </button>
                </div>

                {loading ? (
                    <div className="flex justify-center p-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
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
                        <div className="animate-fade-in-up relative overflow-hidden bg-gradient-to-br from-white to-indigo-50/60 rounded-3xl border border-indigo-100 p-8 sm:p-12 text-center flex flex-col items-center">
                            <div className="drift absolute -top-10 -right-10 w-48 h-48 bg-indigo-200/30 rounded-full blur-3xl pointer-events-none"></div>
                            <div className="animate-pop-in relative w-20 h-20 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl flex items-center justify-center mb-5 shadow-lg shadow-indigo-500/30">
                                <BookOpen size={34} className="text-white" />
                            </div>
                            <h3 className="relative text-xl sm:text-2xl font-bold text-slate-800 mb-2">Nothing enrolled yet</h3>
                            <p className="relative text-slate-600 max-w-md mb-6">
                                Once you're enrolled, your courses live here with your progress on each one. Have a
                                look at what's available, or pick up your Career Path in the meantime.
                            </p>
                            <div className="relative flex flex-wrap items-center justify-center gap-3">
                                <Link
                                    to="/"
                                    className="lift inline-flex items-center gap-2 px-6 py-3 min-h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/25 transition-colors"
                                >
                                    <BookOpen size={18} />
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
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {bundles.map(bundle => {
                                const progress = getProgressVal(bundle._id, true);
                                return (
                                    <div key={bundle._id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-lg transition-all duration-300 group flex flex-col">
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
                                <BookOpen size={32} className="text-slate-400" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 mb-2">No bundles yet</h3>
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
                                                        <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden mb-4">
                                                            <div
                                                                className="bg-indigo-600 h-2.5 rounded-full transition-all duration-1000 ease-out relative"
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
