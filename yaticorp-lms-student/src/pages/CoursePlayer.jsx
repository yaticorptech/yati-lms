/**
 * @author Preethesh Kulal
 * @description Full course player with sidebar curriculum, video/PDF/quiz lesson rendering
 */
import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../utils/api';
import { AuthContext } from '../context/AuthContext';
import { PlayCircle, FileText, CheckCircle2, ChevronDown, ChevronRight, CheckSquare, Briefcase, Award, Download, HelpCircle, Lock, Paperclip } from 'lucide-react';
import VideoPlayer from '../components/VideoPlayer';
import QuizTaker from '../components/QuizTaker';
import { useCoursePlayer } from '../shared/hooks/useCoursePlayer';

const CoursePlayer = () => {
    const { courseId } = useParams();
    const { user, setUser } = React.useContext(AuthContext);

    const {
        courseData,
        loading,
        fetchError,
        activeLesson,
        setActiveLesson,
        expandedModules,
        completedLessons,
        generatingCert,
        toggleModule,
        markLessonComplete,
        generateCertificate: sharedGenerateCertificate
    } = useCoursePlayer(api, courseId);

    // Platform-specific UI states
    const [certResult, setCertResult] = useState(null);
    const [creditToast, setCreditToast] = useState(null);

    // Tracks which lesson's video has been watched to the end. Storing the
    // lesson id (rather than a boolean reset by an effect) makes the flag
    // reset itself the moment a different lesson becomes active.
    const [watchedLessonId, setWatchedLessonId] = useState(null);
    const videoWatched = Boolean(activeLesson?._id) && watchedLessonId === activeLesson._id;

    const handleDownloadPdf = async (url, filename) => {
        if (!url) return;
        try {
            // Fetch the file as a complete blob (this works because Cloudinary free tier sends proper CORS headers for raw GETs, its just the Content-Disposition that fails)
            const response = await fetch(url);
            const blob = await response.blob();

            // Create a fake local URL pointing to that blob
            const blobUrl = window.URL.createObjectURL(blob);

            // Create a temporary anchor to click and trigger the download of the blob
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = filename || 'document.pdf';
            document.body.appendChild(a);
            a.click();

            // Clean up the fake URL
            window.URL.revokeObjectURL(blobUrl);
            document.body.removeChild(a);
        } catch (error) {
            console.error('Failed to download PDF directly:', error);
            // Fallback: Just open the URL normally if blob fetching fails (e.g. strict CORS proxy)
            window.open(url, '_blank');
        }
    };

    const handleQuizPassed = async (lessonId, creditsEarned) => {
        if (creditsEarned && creditsEarned > 0) {
            setCreditToast({ credits: creditsEarned });
            setTimeout(() => setCreditToast(null), 5000);

            if (user && setUser) {
                const updatedUser = { ...user, credits: (user.credits || 0) + creditsEarned };
                setUser(updatedUser);
                localStorage.setItem('studentData', JSON.stringify(updatedUser));
            }
        }
        if (lessonId) {
            await markLessonComplete(lessonId);
        }
    };

    const generateCertificate = async () => {
        try {
            const blob = await sharedGenerateCertificate();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Certificate_${courseData.course.title.replace(/\s+/g, '_')}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
            window.URL.revokeObjectURL(url);
            setCertResult({ downloaded: true });
        } catch {
            alert('Failed to generate certificate');
        }
    };

    if (loading) return (
        <div className="flex justify-center items-center h-full min-h-[500px]">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
        </div>
    );

    if (fetchError || !courseData) return (
        <div className="flex flex-col items-center justify-center min-h-[500px] text-center p-8">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-4">
                <span className="text-4xl">📚</span>
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">Course Unavailable</h2>
            <p className="text-slate-500 max-w-sm mb-6">
                {fetchError || 'This course could not be loaded. It may be unpublished or you may not have access.'}
            </p>
            <Link to="/" className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors">
                Back to Dashboard
            </Link>
        </div>
    );

    const { course, modules, progress } = courseData;
    const isCompleted = completedLessons.includes(activeLesson?._id);
    const courseFullyCompleted = progress?.percentage === 100;

    // A generic/AWS HTML5 video must be watched fully before it can be completed.
    const isVideoLesson = !!(activeLesson && (activeLesson.videoUrl || activeLesson.videoId));
    const requiresWatch = isVideoLesson && (activeLesson.videoSource === 'generic' || activeLesson.videoSource === 'aws');
    const watchGateOpen = isCompleted || !requiresWatch || videoWatched;

    // Sequential unlocking: a lesson is accessible only once every lesson before
    // it is completed (i.e. completed lessons + the current one to do).
    const orderedLessons = modules.flatMap(m => m.lessons);
    let firstIncompleteIdx = orderedLessons.findIndex(l => !completedLessons.includes(l._id));
    if (firstIncompleteIdx === -1) firstIncompleteIdx = orderedLessons.length;
    const unlockedIds = new Set(orderedLessons.slice(0, firstIncompleteIdx + 1).map(l => l._id));

    // Friendly label for a drip-locked module's unlock time.
    const dripLabel = (unlockAt) => {
        if (!unlockAt) return null;
        const d = new Date(unlockAt);
        const days = Math.ceil((d - new Date()) / (1000 * 60 * 60 * 24));
        const dateStr = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        if (days <= 0) return `Available ${dateStr}`;
        return `Unlocks in ${days} day${days === 1 ? '' : 's'} · ${dateStr}`;
    };

    return (
        <div className="flex flex-col lg:flex-row gap-6 animate-fade-in h-[calc(100vh-6rem)] relative z-0">

            {/* In-app Credit Toast Notification */}
            {creditToast && (
                <div className="fixed bottom-6 right-6 z-[200] animate-fade-in">
                    <div className="bg-white border border-emerald-200 shadow-2xl rounded-2xl px-6 py-4 flex items-center space-x-4">
                        <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <Award size={24} className="text-emerald-600" />
                        </div>
                        <div>
                            <p className="font-bold text-slate-800 text-base">Credits Earned!</p>
                            <p className="text-emerald-600 font-semibold text-sm">+{creditToast.credits} credits added to your balance</p>
                        </div>
                        <button onClick={() => setCreditToast(null)} className="text-slate-400 hover:text-slate-600 ml-2">
                            <span className="text-lg leading-none">&times;</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Main Content Area (Video/PDF/Quiz) */}
            <div className="flex-1 flex flex-col space-y-4">
                <div className={`bg-black rounded-2xl overflow-hidden shadow-xl shadow-slate-200/50 relative flex flex-col ${activeLesson?.type === 'quiz' ? 'min-h-[75vh]' : 'aspect-video'}`}>
                    {activeLesson ? (
                        <>
                            {activeLesson.type === 'quiz' ? (
                                <QuizTaker
                                    lessonId={activeLesson._id}
                                    onQuizPassed={(lessonId, creditsEarned) => handleQuizPassed(lessonId, creditsEarned)}
                                    isAlreadyCompleted={isCompleted}
                                />
                            ) : activeLesson.videoUrl || activeLesson.videoId ? (
                                <VideoPlayer
                                    source={activeLesson.videoSource || 'youtube'}
                                    url={activeLesson.videoUrl}
                                    videoId={activeLesson.videoId}
                                    libraryId={activeLesson.libraryId}
                                    title={activeLesson.title}
                                    onEnded={() => setWatchedLessonId(activeLesson?._id ?? null)}
                                    preventSkip={true}
                                />
                            ) : activeLesson.pdfUrl ? (
                                activeLesson.allowDownload ? (
                                    <div className="w-full h-full bg-slate-900 flex flex-col items-center justify-center p-8 absolute inset-0 text-white">
                                        <FileText size={48} className="text-slate-500 mb-4" />
                                        <h3 className="text-xl font-bold mb-2 text-center">Download PDF Material</h3>
                                        <button
                                            onClick={() => handleDownloadPdf(activeLesson.pdfUrl, `${activeLesson.title.replace(/\s+/g, '_')}.pdf`)}
                                            className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-lg flex items-center font-medium transition-colors"
                                        >
                                            Download PDF <Download size={18} className="ml-2" />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="w-full h-full absolute inset-0 bg-slate-900">
                                        <iframe
                                            src={`${activeLesson.pdfUrl}#toolbar=0&navpanes=0`}
                                            title={activeLesson.title}
                                            className="w-full h-full border-none"
                                            onError={(e) => console.log('Iframe failed to load PDF', e)}
                                        />
                                    </div>
                                )
                            ) : (
                                <div className="w-full h-full bg-slate-900 flex items-center justify-center absolute inset-0 text-slate-500">
                                    No video or document provided for this lesson.
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="w-full h-full bg-slate-900 flex items-center justify-center absolute inset-0 text-slate-500">
                            Select a lesson from the curriculum to begin learning.
                        </div>
                    )}
                </div>

                {/* Lesson Metadata Bar */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800">{activeLesson?.title || 'Course Overview'}</h2>
                        <p className="text-sm text-slate-500 mt-1">{course.title}</p>
                    </div>

                    {activeLesson && activeLesson.type !== 'quiz' && (
                        <div className="flex flex-col items-start sm:items-end">
                            <button
                                onClick={() => markLessonComplete(activeLesson._id)}
                                disabled={isCompleted || !watchGateOpen}
                                className={`px-6 py-3 rounded-xl font-bold flex items-center shadow-sm transition-all duration-300 ${isCompleted ? 'bg-emerald-100 text-emerald-700 cursor-not-allowed' : !watchGateOpen ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 text-white focus:ring-4 focus:ring-indigo-100'}`}
                            >
                                {isCompleted ? (
                                    <><CheckCircle2 size={20} className="mr-2" /> Completed</>
                                ) : !watchGateOpen ? (
                                    <><Lock size={18} className="mr-2" /> Mark Complete</>
                                ) : (
                                    <><CheckCircle2 size={20} className="mr-2" /> Mark Complete</>
                                )}
                            </button>
                            {!isCompleted && !watchGateOpen && (
                                <p className="text-xs text-slate-400 mt-1.5">Finish watching the video to complete this lesson.</p>
                            )}
                        </div>
                    )}
                    {activeLesson && activeLesson.type === 'quiz' && (
                        <div className={`px-6 py-3 rounded-xl font-bold flex items-center shadow-sm ${isCompleted ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                            {isCompleted ? (
                                <><CheckCircle2 size={20} className="mr-2" /> Quiz Passed</>
                            ) : (
                                <><HelpCircle size={20} className="mr-2" /> Pass Quiz to Complete</>
                            )}
                        </div>
                    )}
                </div>

                {/* Lesson Attachments */}
                {activeLesson?.attachments?.length > 0 && (
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                        <h3 className="font-bold text-slate-800 mb-4 flex items-center">
                            <Paperclip size={18} className="mr-2 text-indigo-500" /> Lesson Resources
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {activeLesson.attachments.map((att, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => handleDownloadPdf(att.url, att.name)}
                                    className="flex items-center justify-between p-3 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded-xl transition-colors text-left group"
                                >
                                    <div className="flex items-center min-w-0">
                                        <FileText size={16} className="text-indigo-500 mr-3 flex-shrink-0" />
                                        <span className="text-sm font-semibold text-slate-700 truncate">{att.name || 'Attachment'}</span>
                                    </div>
                                    <Download size={16} className="text-slate-400 group-hover:text-indigo-600 flex-shrink-0 ml-3" />
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Certificate Generation Action */}
                {courseFullyCompleted && (
                    <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between shadow-sm">
                        <div className="flex items-center mb-4 sm:mb-0">
                            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm text-emerald-500 mr-4">
                                <Award size={24} />
                            </div>
                            <div>
                                <h3 className="font-bold text-emerald-900 text-lg">Course Completed!</h3>
                                <p className="text-emerald-700 text-sm">You have finished all lessons. Claim your certificate.</p>
                            </div>
                        </div>
                        {certResult ? (
                            <button
                                onClick={generateCertificate}
                                disabled={generatingCert}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-bold flex items-center shadow-sm transition-colors disabled:opacity-50"
                            >
                                {generatingCert ? 'Downloading...' : 'Download Certificate Again'}
                            </button>
                        ) : (
                            <button
                                onClick={generateCertificate}
                                disabled={generatingCert}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-bold flex items-center shadow-sm transition-colors disabled:opacity-50"
                            >
                                {generatingCert ? 'Generating...' : 'Get Certificate'}
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Curriculum Sidebar */}
            <div className="w-full lg:w-96 bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-hidden h-full flex-shrink-0">
                <div className="p-6 border-b border-slate-100 bg-slate-50">
                    <h3 className="font-bold text-lg text-slate-800 tracking-tight">Curriculum</h3>
                    <div className="mt-4">
                        <div className="flex justify-between text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">
                            <span>Overall Progress</span>
                            <span className="text-indigo-600">{progress?.percentage || 0}%</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2">
                            <div
                                className="bg-indigo-600 h-2 rounded-full transition-all duration-1000 ease-out"
                                style={{ width: `${progress?.percentage || 0}%` }}
                            ></div>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {modules.map((module, mIdx) => (
                        <div key={module._id} className="border-b border-slate-100">
                            {/* Module Header */}
                            <button
                                onClick={() => toggleModule(module._id)}
                                className={`w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 transition-colors ${expandedModules[module._id] ? 'bg-slate-50' : ''}`}
                            >
                                <div>
                                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Module {mIdx + 1}</div>
                                    <div className="font-bold text-slate-800 text-sm">{module.title}</div>
                                    {module.locked && (
                                        <div className="flex items-center gap-1 mt-1 text-xs font-semibold text-amber-600">
                                            <Lock size={12} /> {dripLabel(module.unlockAt)}
                                        </div>
                                    )}
                                </div>
                                {expandedModules[module._id] ? <ChevronDown size={20} className="text-slate-400" /> : <ChevronRight size={20} className="text-slate-400" />}
                            </button>

                            {/* Lesson List */}
                            {expandedModules[module._id] && (
                                <div className="bg-white">
                                    {module.lessons.map((lesson, lIdx) => {
                                        const isLessonActive = activeLesson?._id === lesson._id;
                                        const isLessonCompleted = completedLessons.includes(lesson._id);
                                        const isLocked = module.locked || !unlockedIds.has(lesson._id);

                                        return (
                                            <button
                                                key={lesson._id}
                                                onClick={() => { if (!isLocked) setActiveLesson(lesson); }}
                                                disabled={isLocked}
                                                title={isLocked ? 'Complete the previous lessons to unlock this one' : undefined}
                                                className={`w-full flex items-start p-4 text-left border-l-4 transition-colors ${isLessonActive
                                                    ? 'bg-indigo-50 border-indigo-600'
                                                    : isLocked
                                                        ? 'border-transparent opacity-50 cursor-not-allowed'
                                                        : 'border-transparent hover:bg-slate-50/80 hover:border-slate-300'
                                                    }`}
                                            >
                                                <div className="mt-0.5 mr-3 flex-shrink-0">
                                                    {isLessonCompleted ? (
                                                        <CheckCircle2 size={18} className="text-emerald-500" />
                                                    ) : isLocked ? (
                                                        <Lock size={16} className="text-slate-400" />
                                                    ) : (
                                                        <div className={`w-[18px] h-[18px] border-2 rounded-full ${isLessonActive ? 'border-indigo-600' : 'border-slate-300'}`}></div>
                                                    )}
                                                </div>
                                                <div className="flex-1">
                                                    <p className={`text-sm font-medium ${isLessonActive ? 'text-indigo-900 font-bold' : 'text-slate-700'}`}>
                                                        {lIdx + 1}. {lesson.title}
                                                    </p>
                                                    <div className="flex items-center space-x-3 mt-1.5 opacity-60">
                                                        {(lesson.videoUrl || lesson.videoId) && <div className="flex items-center text-xs text-slate-500"><PlayCircle size={12} className="mr-1" /> Video</div>}
                                                        {lesson.pdfUrl && <div className="flex items-center text-xs text-slate-500"><FileText size={12} className="mr-1" /> Reading</div>}
                                                        {lesson.quizId && <div className="flex items-center text-xs text-slate-500"><CheckSquare size={12} className="mr-1" /> Quiz</div>}
                                                        {lesson.assignmentId && <div className="flex items-center text-xs text-slate-500"><Briefcase size={12} className="mr-1" /> Assignment</div>}
                                                    </div>
                                                </div>
                                            </button>
                                        );
                                    })}
                                    {module.lessons.length === 0 && (
                                        <div className="p-4 text-sm text-slate-500 italic">No lessons in this module.</div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default CoursePlayer;
