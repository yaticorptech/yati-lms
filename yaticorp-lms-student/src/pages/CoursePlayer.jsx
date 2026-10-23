/**
 * @author Preethesh Kulal
 * @description Full course player with sidebar curriculum, video/PDF/quiz lesson rendering
 */
import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../utils/api';
import saveToDrive from '../integrations/google/saveToDrive';
import { AuthContext } from '../context/AuthContext';
import { PlayCircle, FileText, CheckCircle2, ChevronDown, ChevronRight, CheckSquare, Briefcase, Award, Download, HelpCircle, Lock, Paperclip, ArrowLeft, ArrowRight, Eye, Loader2 } from 'lucide-react';
import VideoPlayer from '../components/VideoPlayer';
import CourseOutlineDialog from '../components/course/CourseOutlineDialog';
import PdfViewer from '../components/course/PdfViewer';
import Portal from '../components/Portal';
import { useHideLoop } from '../components/loopVisibility';
import QuizTaker from '../components/QuizTaker';
import { useCoursePlayer } from '../shared/hooks/useCoursePlayer';
import { unlockedLessonIds, nextLessonAfter, hasWatched, markWatched } from '../shared/playback/resume';
import { useMascot } from '../mascot/useMascot';
import { REACTIONS } from '../mascot/reactions';
import { saveBlob } from '../native/saveFile';
import PriceTag from '../components/rewards/PriceTag';
import { isShortOfFunds, serverMessage } from '../utils/walletCharge';

const CoursePlayer = () => {
    // Loop, the mascot, stays off the whole player: everything here is a
    // lesson's video, its notes or its quiz, and a figure walking across the
    // screen pulls the eye off them.
    useHideLoop();
    const { courseId } = useParams();
    const { user, setUser } = React.useContext(AuthContext);
    const navigate = useNavigate();
    // A lesson named in the address (/learn/:courseId?lesson=<id>) opens
    // first, when the student can open it. Read once, then taken out of the
    // address, so a reload later reopens where they are, not where they came in.
    const [searchParams, setSearchParams] = useSearchParams();
    const [requestedLessonId] = useState(() => searchParams.get('lesson'));
    useEffect(() => {
        if (!searchParams.has('lesson')) return;
        const rest = new URLSearchParams(searchParams);
        rest.delete('lesson');
        setSearchParams(rest, { replace: true });
    }, [searchParams, setSearchParams]);

    // The player is opened from My Courses, the Dashboard and Career Path's
    // planner, so Back returns to whichever it was (picking a lesson does not
    // change the address, so one step back always leaves the player). Opened
    // straight from a link, with nothing in the app to go back to: My Courses.
    // The router counts its own steps in history.state.idx.
    const goBack = () => {
        if ((window.history.state?.idx ?? 0) > 0) navigate(-1);
        else navigate('/enrolled-courses');
    };

    const {
        courseData,
        loading,
        fetchError,
        fetchErrorCode,
        activeLesson,
        setActiveLesson,
        openLesson,
        expandedModules,
        completedLessons,
        generatingCert,
        toggleModule,
        markLessonComplete,
        resumePositionFor,
        reportPlayback,
        generateCertificate: sharedGenerateCertificate
    } = useCoursePlayer(api, courseId, { requestedLessonId });
    const mascot = useMascot();

    // Platform-specific UI states
    const [certResult, setCertResult] = useState(null);
    // A course the student has not enrolled in: its Preview, from the page
    // that says so, with Enroll leading to the Dashboard's confirmation.
    const [showOutline, setShowOutline] = useState(false);
    const [creditToast, setCreditToast] = useState(null);
    // Why a lesson was not marked done (the server can refuse: an earlier lesson
    // is not done, or the quiz is not passed), or why no certificate came.
    // Said on the page; a refused completion used to go nowhere at all.
    const [lessonNote, setLessonNote] = useState(null);
    const [certError, setCertError] = useState('');
    // The lesson whose completion is on its way to the server: its button
    // waits, so a double-click cannot send it twice.
    const [savingLessonId, setSavingLessonId] = useState(null);
    // A quiz lesson with nothing to take (no quiz, or no questions in it):
    // marked done with the button, as a quiz with nothing in it cannot be passed.
    const [emptyQuizLessonId, setEmptyQuizLessonId] = useState(null);
    // The locked lesson the student tapped, whose reason is shown under it.
    const [lockedNoteId, setLockedNoteId] = useState(null);

    // Tracks which lesson's video has been watched to the end. Storing the
    // lesson id (rather than a boolean reset by an effect) makes the flag
    // reset itself the moment a different lesson becomes active. It is kept
    // on the device too (per student), so a reload does not ask for the whole
    // video again before the lesson can be marked done.
    const userKey = user?._id || user?.id || user?.cardNumber || 'me';
    const [watchedLessonId, setWatchedLessonId] = useState(null);
    const videoWatched = Boolean(activeLesson?._id) && (watchedLessonId === activeLesson._id || hasWatched(userKey, activeLesson._id));
    const onVideoEnded = () => {
        if (!activeLesson?._id) return;
        markWatched(userKey, activeLesson._id);
        setWatchedLessonId(activeLesson._id);
    };

    const handleDownloadPdf = async (url, filename) => {
        if (!url) return;
        try {
            // Fetch the file as a complete blob (this works because Cloudinary free tier sends proper CORS headers for raw GETs, its just the Content-Disposition that fails)
            const response = await fetch(url);
            const blob = await response.blob();
            // The browser's download on the web; the share sheet in the app.
            await saveBlob(blob, filename || 'document.pdf');
        } catch (error) {
            console.error('Failed to download PDF directly:', error);
            // Fallback: Just open the URL normally if blob fetching fails (e.g. strict CORS proxy)
            window.open(url, '_blank');
        }
    };

    // Finishing a lesson for the first time is the mascot's cue to celebrate;
    // re-sending one that was already done is not.
    const completeLesson = async (lessonId) => {
        const firstTime = !completedLessons.includes(lessonId);
        setLessonNote(null);
        setSavingLessonId(lessonId);
        try {
            await markLessonComplete(lessonId);
        } catch (err) {
            setLessonNote({ lessonId, text: (err.response?.status < 500 && err.response?.data?.message) || 'Your progress was not saved. Please try again.' });
            return;
        } finally {
            setSavingLessonId(null);
        }
        if (firstTime) mascot.react(REACTIONS.lessonComplete);
    };

    // A quiz's first attempt earns credits whether it passes or not: shown,
    // and nothing more. Only a pass completes the lesson (QuizTaker's onQuizPassed).
    // The balance is the server's figure after the attempt; adding to this
    // page's own copy drifted from it (a second tab, or a stale copy).
    const showCredits = (creditsEarned, totalCredits) => {
        if (!(creditsEarned > 0)) return;
        setCreditToast({ credits: creditsEarned });
        setTimeout(() => setCreditToast(null), 5000);
        if (user && setUser) {
            const credits = Number.isFinite(totalCredits) ? totalCredits : (user.credits || 0) + creditsEarned;
            const updatedUser = { ...user, credits };
            setUser(updatedUser);
            localStorage.setItem('studentData', JSON.stringify(updatedUser));
        }
    };

    const generateCertificate = async () => {
        setCertError('');
        try {
            const blob = await sharedGenerateCertificate();
            const fileName = `Certificate_${courseData.course.title.replace(/\s+/g, '_')}.pdf`;
            // A browser download on the web; in the app, where a web view
            // cannot download, the phone's save/share sheet (native/saveFile).
            await saveBlob(blob, fileName, { title: 'Certificate' });
            setCertResult({ downloaded: true });

            // The best moment there is to offer this: they have just finished
            // the course. Not awaited — the file is already downloaded.
            saveToDrive(blob, {
                name: fileName,
                description: `Your certificate for ${courseData.course.title}, issued by YATICORP.`,
                reason: 'So the certificates you earn here are kept in your own Google Drive.'
            });
        } catch (e) {
            // A short wallet balance says what the certificate costs (Wallet rules).
            setCertError(isShortOfFunds(e) ? serverMessage(e) : 'Your certificate could not be made. Please try again.');
        }
    };

    if (loading) return (
        <div className="flex justify-center items-center h-full min-h-[500px]">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
        </div>
    );

    // Opened without enrolling (a pasted or old link): the lessons stay shut,
    // and the page says how to open them instead of "unavailable".
    if (fetchErrorCode === 'NOT_ENROLLED') return (
        <div className="flex min-h-[500px] flex-col items-center justify-center p-8 text-center animate-fade-in">
            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                <Lock size={34} />
            </div>
            <h2 className="mb-2 text-xl font-bold text-slate-800">Enrol to open this course</h2>
            <p className="mb-6 max-w-sm text-slate-500">
                Its lessons open once you're enrolled. See what's inside first, then enrol from your Dashboard.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
                <button type="button" onClick={goBack} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 font-bold text-slate-700 transition-colors hover:bg-slate-50">
                    <ArrowLeft size={16} /> Back
                </button>
                <button type="button" onClick={() => setShowOutline(true)} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 font-bold text-white transition-colors hover:bg-indigo-700">
                    <Eye size={16} /> See what's inside
                </button>
            </div>
            {showOutline && (
                <CourseOutlineDialog
                    courseId={courseId}
                    onClose={() => setShowOutline(false)}
                    onEnroll={() => navigate(`/?tab=available&enroll=${encodeURIComponent(courseId)}`)}
                />
            )}
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
    // A course published before its lessons were added (found in QA,
    // 2026-10-16): it says so, instead of asking for a lesson that is not there.
    const hasLessons = modules.some((m) => (m.lessons || []).length > 0);
    const isCompleted = completedLessons.includes(activeLesson?._id);
    const courseFullyCompleted = progress?.percentage === 100;
    const saving = Boolean(activeLesson) && savingLessonId === activeLesson._id;
    const quizIsEmpty = activeLesson?.type === 'quiz' && emptyQuizLessonId === activeLesson._id;
    // A reading shown in the page: a PDF lesson whose file is not for download.
    const showsPdf = Boolean(activeLesson && activeLesson.type !== 'quiz' && !(activeLesson.videoUrl || activeLesson.videoId) && activeLesson.pdfUrl && !activeLesson.allowDownload);

    // A generic/AWS HTML5 video must be watched fully before it can be completed.
    const isVideoLesson = !!(activeLesson && (activeLesson.videoUrl || activeLesson.videoId));
    const requiresWatch = isVideoLesson && (activeLesson.videoSource === 'generic' || activeLesson.videoSource === 'aws');
    const watchGateOpen = isCompleted || !requiresWatch || videoWatched;

    // Sequential unlocking: a lesson is accessible only once every lesson before
    // it is completed (i.e. completed lessons + the current one to do).
    const unlockedIds = unlockedLessonIds(modules, completedLessons);

    // Friendly label for a drip-locked module's unlock time.
    const dripLabel = (unlockAt) => {
        if (!unlockAt) return null;
        const d = new Date(unlockAt);
        const days = Math.ceil((d - new Date()) / (1000 * 60 * 60 * 24));
        const dateStr = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        if (days <= 0) return `Available ${dateStr}`;
        return `Unlocks in ${days} day${days === 1 ? '' : 's'} · ${dateStr}`;
    };
    const availableOn = (unlockAt) => (unlockAt
        ? `Available on ${new Date(unlockAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}.`
        : 'Not available yet.');
    // Why a lesson is locked, said where the student tapped it: a module that
    // waits on its date says the date, not "complete the previous lessons".
    const lockReason = (module) => (module.locked ? availableOn(module.unlockAt) : 'Complete the previous lessons to unlock this one.');

    // Where to go once this lesson is done: the next lesson, if it is open.
    const next = activeLesson ? nextLessonAfter(modules, completedLessons, activeLesson._id) : null;

    // Side by side and one screen tall on a computer, the curriculum scrolling
    // inside itself. On a phone the page simply grows: the curriculum card is
    // as tall as its modules and lessons, no taller and no shorter.
    return (
        <div className="flex flex-col lg:flex-row gap-6 animate-fade-in lg:h-[calc(100vh-6rem)] relative z-0">

            {/* In-app Credit Toast Notification. Out at the end of the page
                (Portal): inside this `relative z-0` wrapper it sat under the
                phone's bottom bar. On a phone it sits above that bar. */}
            {creditToast && (
                <Portal>
                    <div role="status" aria-live="polite" className="mascot-clear fixed right-4 bottom-[calc(6rem+env(safe-area-inset-bottom))] z-[130] animate-fade-in sidebar:right-6 sidebar:bottom-6">
                        <div className="bg-white border border-emerald-200 shadow-2xl rounded-2xl px-6 py-4 flex items-center space-x-4">
                            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                                <Award size={24} className="text-emerald-600" aria-hidden="true" />
                            </div>
                            <div>
                                <p className="font-bold text-slate-800 text-base">Credits Earned!</p>
                                <p className="text-emerald-600 font-semibold text-sm">+{creditToast.credits} credits added to your balance</p>
                            </div>
                            <button type="button" onClick={() => setCreditToast(null)} aria-label="Dismiss" className="text-slate-400 hover:text-slate-600 ml-2">
                                <span className="text-lg leading-none" aria-hidden="true">&times;</span>
                            </button>
                        </div>
                    </div>
                </Portal>
            )}

            {/* Main Content Area (Video/PDF/Quiz) */}
            <div className="flex-1 flex flex-col space-y-4">
                {/* The way out, with the course's name beside it. On a phone
                    the player had none: the bottom bar's sections, but nothing
                    back to the page the student came from. */}
                <div className="flex min-w-0 items-center gap-3">
                    <button type="button" onClick={goBack} className="group inline-flex shrink-0 items-center gap-2 text-sm font-bold text-slate-600 transition-colors hover:text-indigo-600">
                        <span className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors group-hover:border-indigo-300 group-hover:text-indigo-600">
                            <ArrowLeft size={17} aria-hidden="true" />
                        </span>
                        Back
                    </button>
                    {course?.title && (
                        <>
                            <span aria-hidden="true" className="h-5 w-px shrink-0 bg-slate-200" />
                            <h1 className="min-w-0 truncate text-base font-black text-slate-900">{course.title}</h1>
                        </>
                    )}
                </div>
                {/* A reading gets a tall box that scrolls through its pages; a
                    quiz grows with its questions; a video keeps its shape. */}
                <div className={`${showsPdf ? 'bg-slate-200 h-[75vh]' : 'bg-black'} rounded-2xl overflow-hidden shadow-xl shadow-slate-200/50 relative flex flex-col ${activeLesson?.type === 'quiz' ? 'min-h-[75vh]' : showsPdf ? '' : 'aspect-video'}`}>
                    {activeLesson ? (
                        <>
                            {activeLesson.type === 'quiz' ? (
                                <QuizTaker
                                    key={activeLesson._id}
                                    lessonId={activeLesson._id}
                                    onQuizPassed={(lessonId) => completeLesson(lessonId)}
                                    onCreditsEarned={showCredits}
                                    onEmpty={setEmptyQuizLessonId}
                                    isAlreadyCompleted={isCompleted}
                                />
                            ) : activeLesson.videoUrl || activeLesson.videoId ? (
                                <VideoPlayer
                                    key={activeLesson._id}
                                    source={activeLesson.videoSource || 'youtube'}
                                    url={activeLesson.videoUrl}
                                    videoId={activeLesson.videoId}
                                    libraryId={activeLesson.libraryId}
                                    title={activeLesson.title}
                                    lessonId={activeLesson._id}
                                    resumeFrom={resumePositionFor(activeLesson._id)}
                                    onPositionSaved={(seconds, reason) => reportPlayback(activeLesson._id, seconds, reason)}
                                    onEnded={onVideoEnded}
                                    // A lesson already done can be watched in any order.
                                    preventSkip={!isCompleted}
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
                                    // Drawn in the page with pdf.js: an <iframe> shows nothing
                                    // in Android's web view or Chrome on Android.
                                    <PdfViewer key={activeLesson._id} url={activeLesson.pdfUrl} title={activeLesson.title} />
                                )
                            ) : (
                                <div className="w-full h-full bg-slate-900 flex items-center justify-center absolute inset-0 text-slate-500">
                                    No video or document provided for this lesson.
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="w-full h-full bg-slate-900 flex flex-col items-center justify-center gap-1 absolute inset-0 px-6 text-center text-slate-400">
                            {hasLessons ? 'Select a lesson from the curriculum to begin learning.' : (
                                <>
                                    <span className="font-semibold text-slate-200">No lessons yet</span>
                                    <span className="text-sm">This course's lessons are on their way. They will appear here as soon as they are added.</span>
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* Lesson Metadata Bar */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800">{activeLesson?.title || 'Course Overview'}</h2>
                        <p className="text-sm text-slate-500 mt-1">{course.title}</p>
                    </div>

                    {activeLesson && (activeLesson.type !== 'quiz' || quizIsEmpty) && (
                        <div className="flex flex-col items-start sm:items-end">
                            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                                <button
                                    type="button"
                                    onClick={() => completeLesson(activeLesson._id)}
                                    disabled={isCompleted || !watchGateOpen || saving}
                                    data-mascot-cta
                                    className={`px-6 py-3 rounded-xl font-bold flex items-center shadow-sm transition-all duration-300 ${isCompleted ? 'bg-emerald-100 text-emerald-700 cursor-not-allowed' : !watchGateOpen ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 text-white focus:ring-4 focus:ring-indigo-100 disabled:cursor-wait disabled:opacity-70'}`}
                                >
                                    {isCompleted ? (
                                        <><CheckCircle2 size={20} className="mr-2" /> Completed</>
                                    ) : saving ? (
                                        <><Loader2 size={18} className="mr-2 animate-spin" /> Saving…</>
                                    ) : !watchGateOpen ? (
                                        <><Lock size={18} className="mr-2" /> Mark Complete</>
                                    ) : (
                                        <><CheckCircle2 size={20} className="mr-2" /> Mark Complete</>
                                    )}
                                </button>
                                {isCompleted && next?.open && (
                                    <button
                                        type="button"
                                        onClick={() => openLesson(next.lesson, next.module._id)}
                                        className="px-5 py-3 rounded-xl font-bold flex items-center bg-indigo-600 text-white shadow-sm transition-colors hover:bg-indigo-700"
                                    >
                                        Next lesson <ArrowRight size={18} className="ml-2" />
                                    </button>
                                )}
                            </div>
                            {!isCompleted && !watchGateOpen && (
                                <p className="text-xs text-slate-400 mt-1.5">Finish watching the video to complete this lesson.</p>
                            )}
                            {!isCompleted && quizIsEmpty && (
                                <p className="text-xs text-slate-500 mt-1.5">This quiz has no questions yet, so you can mark the lesson complete.</p>
                            )}
                            {isCompleted && next && !next.open && next.module.locked && (
                                <p className="text-xs text-slate-500 mt-1.5">The next module opens soon. {availableOn(next.module.unlockAt)}</p>
                            )}
                        </div>
                    )}
                    {activeLesson && activeLesson.type === 'quiz' && !quizIsEmpty && (
                        <div className="flex flex-wrap items-center gap-2">
                            <div className={`px-6 py-3 rounded-xl font-bold flex items-center shadow-sm ${isCompleted ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                {isCompleted ? (
                                    <><CheckCircle2 size={20} className="mr-2" /> Quiz Passed</>
                                ) : saving ? (
                                    <><Loader2 size={18} className="mr-2 animate-spin" /> Saving…</>
                                ) : (
                                    <><HelpCircle size={20} className="mr-2" /> Pass Quiz to Complete</>
                                )}
                            </div>
                            {isCompleted && next?.open && (
                                <button
                                    type="button"
                                    onClick={() => openLesson(next.lesson, next.module._id)}
                                    className="px-5 py-3 rounded-xl font-bold flex items-center bg-indigo-600 text-white shadow-sm transition-colors hover:bg-indigo-700"
                                >
                                    Next lesson <ArrowRight size={18} className="ml-2" />
                                </button>
                            )}
                        </div>
                    )}
                </div>
                {lessonNote && lessonNote.lessonId === activeLesson?._id && (
                    <p role="alert" className="-mt-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{lessonNote.text}</p>
                )}

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
                                <p className="text-emerald-700 text-sm">You have finished all lessons. Your certificate is in your profile — download a copy here.</p>
                            </div>
                        </div>
                        {certResult ? (
                            <button
                                onClick={generateCertificate}
                                disabled={generatingCert}
                                data-mascot-cta
                                className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-bold flex items-center shadow-sm transition-colors disabled:opacity-50"
                            >
                                {generatingCert ? 'Downloading...' : <>Download Certificate Again <PriceTag action="download_certificate" className="ml-1" /></>}
                            </button>
                        ) : (
                            <button
                                onClick={generateCertificate}
                                disabled={generatingCert}
                                data-mascot-cta
                                className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-bold flex items-center shadow-sm transition-colors disabled:opacity-50"
                            >
                                {generatingCert ? 'Generating...' : <>Get Certificate <PriceTag action="download_certificate" className="ml-1" /></>}
                            </button>
                        )}
                    </div>
                )}
                {courseFullyCompleted && certError && (
                    <p role="alert" className="-mt-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{certError}</p>
                )}
            </div>

            {/* Curriculum Sidebar */}
            <div className="mascot-clear-after w-full lg:w-96 bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-hidden lg:h-full flex-shrink-0">
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

                <div className="mascot-clear-scroll mascot-clear-below lg:flex-1 lg:overflow-y-auto">
                    {modules.length === 0 && (
                        <p className="p-6 text-sm text-slate-500">No lessons have been added to this course yet.</p>
                    )}
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
                                        const showReason = isLocked && lockedNoteId === lesson._id;

                                        // A locked lesson still answers a tap: with why it is
                                        // locked, under it. A disabled button said so only in a
                                        // tooltip, which a phone never shows.
                                        return (
                                            <React.Fragment key={lesson._id}>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        if (isLocked) { setLockedNoteId(showReason ? null : lesson._id); return; }
                                                        setLockedNoteId(null);
                                                        setActiveLesson(lesson);
                                                    }}
                                                    aria-disabled={isLocked || undefined}
                                                    aria-expanded={isLocked ? showReason : undefined}
                                                    className={`w-full flex items-start p-4 text-left border-l-4 transition-colors ${isLessonActive
                                                        ? 'bg-indigo-50 border-indigo-600'
                                                        : isLocked
                                                            ? 'border-transparent opacity-50 cursor-help'
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
                                                {showReason && (
                                                    <p role="status" className="flex items-center gap-1.5 bg-amber-50 px-4 py-2 pl-12 text-xs font-semibold text-amber-700">
                                                        <Lock size={12} aria-hidden="true" /> {lockReason(module)}
                                                    </p>
                                                )}
                                            </React.Fragment>
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
