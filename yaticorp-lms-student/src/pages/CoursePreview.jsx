/**
 * @author Preethesh Kulal
 * @description Admin course preview page opened in new tab with preview mode banner
 */
import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import axios from 'axios';
import { PlayCircle, FileText, HelpCircle, PenTool, Layout, ChevronDown, ChevronRight, Eye, ArrowLeft } from 'lucide-react';
import VideoPlayer from '../components/VideoPlayer';

const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const CoursePreview = () => {
    const { courseId } = useParams();
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');

    const [courseData, setCourseData] = useState(null);
    // A missing token is known at first render, so seed the state directly
    // instead of correcting it from inside the effect.
    const [loading, setLoading] = useState(() => Boolean(token));
    const [error, setError] = useState(() => (token ? null : 'No admin token provided.'));
    const [activeLesson, setActiveLesson] = useState(null);
    const [expandedModules, setExpandedModules] = useState({});

    useEffect(() => {
        if (!token) return;

        axios.get(`${apiBase}/admin/preview/${courseId}`, {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(res => {
                setCourseData(res.data);
                if (res.data.modules?.length > 0) {
                    setExpandedModules({ [res.data.modules[0]._id]: true });
                    if (res.data.modules[0].lessons?.length > 0) {
                        setActiveLesson(res.data.modules[0].lessons[0]);
                    }
                }
            })
            .catch(err => setError(err.response?.data?.message || 'Failed to load preview.'))
            .finally(() => setLoading(false));
    }, [courseId, token]);

    const toggleModule = (id) => setExpandedModules(prev => ({ ...prev, [id]: !prev[id] }));

    if (loading) return (
        <div className="flex justify-center items-center min-h-screen bg-slate-50">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
        </div>
    );

    if (error) return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 text-center p-8">
            <p className="text-red-600 font-semibold mb-4">{error}</p>
            <button onClick={() => window.close()} className="px-5 py-2 bg-slate-800 text-white rounded-xl font-bold">Close Tab</button>
        </div>
    );

    const { course, modules } = courseData;

    const getLessonIcon = (lesson) => {
        if (lesson.videoUrl || lesson.videoId) return <PlayCircle size={16} className="text-emerald-600" />;
        if (lesson.pdfUrl) return <FileText size={16} className="text-red-500" />;
        if (lesson.quizId) return <HelpCircle size={16} className="text-purple-600" />;
        if (lesson.assignmentId) return <PenTool size={16} className="text-blue-600" />;
        return <Layout size={16} className="text-slate-400" />;
    };

    return (
        <div className="min-h-screen bg-slate-100">
            {/* Preview Banner */}
            <div className="bg-amber-500 text-white text-center py-2 px-4 text-sm font-bold flex items-center justify-center gap-2 sticky top-0 z-50">
                <Eye size={16} />
                Admin Preview Mode — This is how students see this course
                <button onClick={() => window.close()} className="ml-4 text-xs bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full transition-colors">
                    Close Preview
                </button>
            </div>

            <div className="flex flex-col lg:flex-row h-[calc(100vh-36px)]">
                {/* Sidebar */}
                <div className="w-full lg:w-80 xl:w-96 bg-white border-r border-slate-200 flex flex-col overflow-hidden">
                    <div className="p-5 border-b border-slate-100 bg-slate-50">
                        <h2 className="font-bold text-slate-800 text-base line-clamp-2">{course.title}</h2>
                        {!course.isPublished && (
                            <span className="mt-1.5 inline-block text-xs font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded">
                                Draft — Not published
                            </span>
                        )}
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {modules.map((mod, mIdx) => (
                            <div key={mod._id} className="border-b border-slate-100">
                                <button
                                    onClick={() => toggleModule(mod._id)}
                                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors text-left"
                                >
                                    <div className="flex items-center gap-2">
                                        {expandedModules[mod._id] ? <ChevronDown size={15} className="text-slate-400" /> : <ChevronRight size={15} className="text-slate-400" />}
                                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Section {mIdx + 1}</span>
                                    </div>
                                    <span className="text-xs text-slate-400">{mod.lessons.length} lessons</span>
                                </button>
                                <p className="px-9 pb-2 text-sm font-semibold text-slate-700">{mod.title}</p>

                                {expandedModules[mod._id] && (
                                    <div className="pb-2">
                                        {mod.lessons.map((lesson, lIdx) => (
                                            <button
                                                key={lesson._id}
                                                onClick={() => setActiveLesson(lesson)}
                                                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${activeLesson?._id === lesson._id ? 'bg-indigo-50 border-r-2 border-indigo-600' : 'hover:bg-slate-50'}`}
                                            >
                                                <span className="text-xs text-slate-400 w-4 flex-shrink-0">{lIdx + 1}</span>
                                                {getLessonIcon(lesson)}
                                                <span className={`text-sm font-medium line-clamp-1 ${activeLesson?._id === lesson._id ? 'text-indigo-700' : 'text-slate-700'}`}>
                                                    {lesson.title}
                                                </span>
                                                {!lesson.isPublished && (
                                                    <span className="ml-auto text-[10px] font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded flex-shrink-0">Hidden</span>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 overflow-y-auto bg-slate-50">
                    {activeLesson ? (
                        <div className="max-w-4xl mx-auto p-6 space-y-4">
                            <h1 className="text-xl font-bold text-slate-800">{activeLesson.title}</h1>

                            {/* Video */}
                            {(activeLesson.videoUrl || activeLesson.videoId) && (
                                <div className="rounded-2xl overflow-hidden bg-black">
                                    <VideoPlayer lesson={activeLesson} />
                                </div>
                            )}

                            {/* PDF */}
                            {activeLesson.pdfUrl && (
                                <div className="bg-white rounded-2xl border border-slate-200 p-6 flex items-center gap-4">
                                    <FileText size={32} className="text-red-500 flex-shrink-0" />
                                    <div>
                                        <p className="font-semibold text-slate-800">PDF Document</p>
                                        <a href={activeLesson.pdfUrl} target="_blank" rel="noreferrer"
                                            className="text-sm text-indigo-600 hover:underline">
                                            Open PDF →
                                        </a>
                                    </div>
                                </div>
                            )}

                            {/* Attachments */}
                            {activeLesson.attachments?.length > 0 && (
                                <div className="bg-white rounded-2xl border border-slate-200 p-6">
                                    <p className="font-semibold text-slate-800 mb-3">Lesson Resources</p>
                                    <div className="space-y-2">
                                        {activeLesson.attachments.map((att, idx) => (
                                            <a key={idx} href={att.url} target="_blank" rel="noreferrer"
                                                className="flex items-center gap-3 text-sm text-indigo-600 hover:underline">
                                                <FileText size={16} className="text-slate-400 flex-shrink-0" />
                                                {att.name || 'Attachment'}
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Quiz placeholder */}
                            {activeLesson.quizId && !activeLesson.videoUrl && !activeLesson.pdfUrl && (
                                <div className="bg-purple-50 border border-purple-200 rounded-2xl p-8 text-center">
                                    <HelpCircle size={40} className="text-purple-400 mx-auto mb-3" />
                                    <p className="font-bold text-purple-800">Quiz Lesson</p>
                                    <p className="text-sm text-purple-600 mt-1">Quiz content is interactive — available to enrolled students.</p>
                                </div>
                            )}

                            {/* Generic */}
                            {!activeLesson.videoUrl && !activeLesson.videoId && !activeLesson.pdfUrl && !activeLesson.quizId && (
                                <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-400">
                                    <Layout size={40} className="mx-auto mb-3" />
                                    <p className="font-medium">No content attached to this lesson yet.</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center p-8 text-slate-400">
                            <PlayCircle size={48} className="mb-4 opacity-30" />
                            <p className="font-medium">Select a lesson from the sidebar to preview it.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CoursePreview;
