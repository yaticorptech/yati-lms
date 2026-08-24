/**
 * @author Preethesh Kulal
 * @description Student page to view courses inside a published bundle
 */
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { PlayCircle, Clock, BookOpen, Layers, ArrowLeft } from 'lucide-react';
import api from '../utils/api';

const BundleViewer = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [bundle, setBundle] = useState(null);
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchBundleDetails = async () => {
            try {
                // Fetched by id rather than picked out of the enrolled list: a
                // published bundle is open to anyone signed in, so there is no
                // enrollment to look it up through. The server returns only the
                // published courses inside, already carrying their progress.
                const res = await api.get(`/user/bundles/${id}`);
                setBundle(res.data.bundle);
                setCourses(res.data.bundle?.courses || []);
            } catch (err) {
                // 404 means unpublished or deleted — nothing to show either way.
                console.error('Failed to fetch bundle:', err);
                navigate('/dashboard');
            } finally {
                setLoading(false);
            }
        };
        fetchBundleDetails();
    }, [id, navigate]);

    if (loading) {
        return (
            <div className="flex justify-center p-24">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    if (!bundle) return null;

    return (
        <div className="space-y-8 animate-fade-in pb-12 max-w-6xl mx-auto">
            {/* Header Section */}
            <div>
                <Link to="/dashboard" className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-indigo-600 mb-6 transition-colors group">
                    <ArrowLeft size={16} className="mr-2 group-hover:-translate-x-1 transition-transform" /> Back to Dashboard
                </Link>

                <div className="bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-950 rounded-3xl p-8 md:p-12 shadow-2xl text-white relative overflow-hidden flex flex-col md:flex-row items-center gap-8 md:gap-12">
                    {/* Decorative Elements */}
                    <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl -ml-10 -mb-10 pointer-events-none"></div>
                    
                    {/* Thumbnail */}
                    <div className="w-full md:w-1/3 aspect-video md:aspect-square max-w-xs bg-white/10 rounded-2xl border border-white/20 backdrop-blur-sm overflow-hidden flex items-center justify-center shrink-0 shadow-2xl relative z-10">
                        {bundle.thumbnail ? (
                            <img src={bundle.thumbnail} alt={bundle.title} className="w-full h-full object-cover opacity-90" />
                        ) : (
                            <Layers size={64} className="text-white/50" />
                        )}
                    </div>
                    
                    {/* Details */}
                    <div className="relative z-10 flex-1">
                        <span className="inline-block px-3 py-1 text-xs font-bold tracking-widest text-indigo-200 bg-white/10 rounded-full uppercase mb-4 backdrop-blur-md border border-white/10">
                            Course Bundle
                        </span>
                        <h1 className="text-3xl md:text-5xl font-extrabold mb-4 leading-tight">{bundle.title}</h1>
                        <p className="text-indigo-100/80 text-lg max-w-2xl leading-relaxed">
                            {bundle.description || "Every course in this bundle is yours to open."}
                        </p>
                        
                        <div className="flex items-center gap-6 mt-8">
                            <div className="flex items-center gap-2">
                                <BookOpen size={20} className="text-indigo-300" />
                                <span className="font-semibold text-lg">{courses.length} Courses Inside</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Courses Grid */}
            <div className="pt-4">
                <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center">
                    Bundle Contents
                </h2>

                {courses.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {courses.map((course, index) => (
                            <div key={course._id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group flex flex-col relative">
                                {/* Number Badge */}
                                <div className="absolute top-4 left-4 z-20 w-8 h-8 bg-white/90 backdrop-blur rounded-lg shadow-sm flex items-center justify-center font-bold text-indigo-900 border border-white/20">
                                    {index + 1}
                                </div>
                                
                                {/* Thumbnail */}
                                <div className="h-48 bg-slate-100 relative overflow-hidden">
                                    {course.thumbnail ? (
                                        <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                                    ) : (
                                        <div className="w-full h-full flex justify-center items-center bg-indigo-50/50 text-indigo-200">
                                            <BookOpen size={48} />
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-slate-900/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <div className="w-14 h-14 bg-white/95 backdrop-blur rounded-full flex items-center justify-center text-indigo-600 shadow-xl translate-y-4 group-hover:translate-y-0 transition-all duration-300 delay-75">
                                            <PlayCircle size={32} className="ml-1" />
                                        </div>
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="p-6 flex-1 flex flex-col">
                                    <h3 className="font-bold text-lg text-slate-800 line-clamp-2 mb-2 group-hover:text-indigo-600 transition-colors">
                                        {course.title}
                                    </h3>
                                    
                                    <div className="mt-auto pt-6">
                                        <Link
                                            to={`/learn/${course._id}`}
                                            className="w-full flex justify-center items-center space-x-2 py-3 bg-slate-50 hover:bg-indigo-600 text-slate-700 hover:text-white font-bold rounded-xl transition-all duration-300 border border-slate-200 hover:border-transparent shadow-sm hover:shadow-indigo-500/30"
                                        >
                                            <span>Open Course</span> <PlayCircle size={18} />
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="bg-white rounded-3xl border border-slate-200 border-dashed p-16 text-center flex flex-col items-center">
                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                            <BookOpen size={32} className="text-slate-400" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 mb-2">Bundle is empty</h3>
                        <p className="text-slate-500 max-w-md">
                            There are currently no published courses available inside this bundle. Please check back later or contact support.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BundleViewer;
