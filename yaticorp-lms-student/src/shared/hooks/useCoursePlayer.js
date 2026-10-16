/**
 * @author Preethesh Kulal
 * @description Shared hook for course player state, progress and certificate generation
 */
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { getCourseServices } from '../api/courseService';
import {
    readActiveLessonEntry, rememberActiveLesson, chooseLessonToOpen, findOpenLesson,
    readPositionEntry, newest
} from '../playback/resume';

// Server writes while a video plays are spaced out. A pause, a hidden tab or
// a page unload is written at once, whatever the spacing.
const SERVER_SAVE_INTERVAL_MS = 15000;

// XP, streak and badge events the server reports; the rewards provider
// listens and shows the toast / celebration.
const announceRewards = (rewards) => {
    if (rewards?.events?.length) window.dispatchEvent(new CustomEvent('yati:rewards', { detail: rewards.events }));
};

/**
 * Shared hook for the Course Player.
 * Manages course content, active lesson, and progress.
 *
 * `requestedLessonId` is a lesson asked for by the address (/learn/:id?lesson=…),
 * opened when the student can open it, ahead of the one remembered.
 */
export const useCoursePlayer = (apiClient, courseId, { requestedLessonId = null } = {}) => {
    const [courseData, setCourseData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState(null);
    // The server's reason, when it gave one: NOT_ENROLLED is a course the
    // student can see but has not enrolled in, which the player answers with
    // the way to enrol rather than "unavailable".
    const [fetchErrorCode, setFetchErrorCode] = useState(null);
    const [activeLesson, setActiveLesson] = useState(null);
    const [expandedModules, setExpandedModules] = useState({});
    const [completedLessons, setCompletedLessons] = useState([]);
    const [generatingCert, setGeneratingCert] = useState(false);
    // The server's copy of where the student is in this course's videos.
    const [serverPlayback, setServerPlayback] = useState(null);
    const lastServerSaveRef = useRef(0);
    // Only the latest load is applied: opening another course while one is
    // still loading must not let the first one's reply land on the second.
    const loadRef = useRef(0);
    // A lesson's completion already on its way to the server, so a second
    // click (or a quiz pass arriving with a click) sends it once.
    const savingRef = useRef(new Map());

    // Memoised so fetchCourseContent keeps a stable identity — without this,
    // listing it as an effect dependency would refetch on every render.
    const courseService = useMemo(() => getCourseServices(apiClient), [apiClient]);

    const fetchCourseContent = useCallback(async () => {
        const load = ++loadRef.current;
        setLoading(true);
        setFetchError(null);
        setFetchErrorCode(null);
        try {
            const [res, playback] = await Promise.all([
                apiClient.get(`/user/courses/${courseId}`),
                // Nothing saved yet, or an older server, is not an error: this
                // device's own copy still works.
                courseService.getPlayback(courseId).catch(() => null)
            ]);
            if (load !== loadRef.current) return;
            const modules = res.data.modules || [];
            const completed = res.data.progress?.completedLessons || [];
            setCourseData(res.data);
            setCompletedLessons(completed);
            setServerPlayback(playback);
            // Opening a course can find it finished (a lesson removed since),
            // which settles its XP and certificate on the server.
            announceRewards(res.data.rewards);

            // Reopen the lesson the student was on, wherever they were on it
            // last. A page reload is not always deliberate — a phone locking
            // its screen is enough — and landing on lesson one every time is
            // what made a paused video look like it had started over. A
            // lesson named in the address comes first, when it can be opened.
            const remembered = newest(
                readActiveLessonEntry(courseId),
                playback?.activeLessonId ? { id: playback.activeLessonId, at: playback.activeLessonAt || 0 } : null
            );
            const { module, lesson } = findOpenLesson(modules, completed, requestedLessonId)
                || chooseLessonToOpen(modules, completed, remembered?.id || null);
            if (module) setExpandedModules({ [module._id]: true });
            if (lesson) setActiveLesson(lesson);
        } catch (err) {
            if (load !== loadRef.current) return;
            console.error('Failed to fetch course content:', err);
            setFetchError(err.response?.data?.message || 'Course not found or unavailable.');
            setFetchErrorCode(err.response?.data?.code || null);
        } finally {
            if (load === loadRef.current) setLoading(false);
        }
    }, [apiClient, courseService, courseId, requestedLessonId]);

    useEffect(() => {
        if (courseId) fetchCourseContent();
    }, [courseId, fetchCourseContent]);

    const selectLesson = useCallback((lesson) => {
        setActiveLesson(lesson);
        if (!lesson?._id) return;
        const at = Date.now();
        rememberActiveLesson(courseId, lesson._id, undefined, at);
        courseService.savePlayback(courseId, { activeLessonId: lesson._id, at }).catch(() => {});
    }, [courseId, courseService]);

    /** Open a lesson and unfold its module in the curriculum (the "Next lesson" button). */
    const openLesson = useCallback((lesson, moduleId) => {
        if (!lesson) return;
        if (moduleId) setExpandedModules((prev) => ({ ...prev, [moduleId]: true }));
        selectLesson(lesson);
    }, [selectLesson]);

    /** Where this lesson's video should start: the newer of this device's copy and the server's. */
    const resumePositionFor = useCallback((lessonId) => {
        const local = readPositionEntry(lessonId);
        const remote = serverPlayback?.positions?.[lessonId] || null;
        return newest(local, remote)?.seconds || 0;
    }, [serverPlayback]);

    /**
     * The player reports every position it writes down on this device. The
     * server's copy is written at once for anything that is not a routine
     * tick — a pause, a hidden tab, leaving the page — and spaced out while
     * the video plays. Leaving the page uses a request that outlives it.
     *
     * The page's own record of the server's copy is updated with each write.
     * It was read once, when the course opened, so a video watched to the end
     * (this device's copy cleared) reopened at the server's old position.
     */
    const reportPlayback = useCallback((lessonId, seconds, reason = 'tick') => {
        if (!lessonId) return;
        const now = Date.now();
        if (reason === 'tick' && now - lastServerSaveRef.current < SERVER_SAVE_INTERVAL_MS) return;
        lastServerSaveRef.current = now;
        const keepalive = reason === 'unload' || reason === 'hidden';
        courseService.savePlayback(courseId, { lessonId, seconds, at: now }, { keepalive }).catch(() => {});
        setServerPlayback((prev) => ({ ...(prev || {}), positions: { ...(prev?.positions || {}), [lessonId]: { seconds, at: now } } }));
    }, [courseId, courseService]);

    const toggleModule = (moduleId) => {
        setExpandedModules(prev => ({ ...prev, [moduleId]: !prev[moduleId] }));
    };

    const markLessonComplete = (lessonId) => {
        const pending = savingRef.current.get(lessonId);
        if (pending) return pending;
        const saving = (async () => {
            try {
                const data = await courseService.updateProgress(courseId, lessonId);
                setCompletedLessons(data.progress.completedLessons);
                setCourseData(prev => ({
                    ...prev,
                    progress: data.progress
                }));
                // XP, streak and badge events from this completion, and from
                // the course and its certificate when this was the last lesson.
                announceRewards(data.rewards);
                return data;
            } catch (err) {
                console.error('Failed to update progress:', err);
                throw err;
            } finally {
                savingRef.current.delete(lessonId);
            }
        })();
        savingRef.current.set(lessonId, saving);
        return saving;
    };

    const generateCertificate = async () => {
        setGeneratingCert(true);
        try {
            const blob = await courseService.generateCertificate(courseId);
            return blob;
        } catch (err) {
            console.error('Certificate generation failed:', err);
            throw err;
        } finally {
            setGeneratingCert(false);
        }
    };

    return {
        courseData,
        loading,
        fetchError,
        fetchErrorCode,
        activeLesson,
        setActiveLesson: selectLesson,
        openLesson,
        expandedModules,
        completedLessons,
        generatingCert,
        toggleModule,
        markLessonComplete,
        generateCertificate,
        resumePositionFor,
        reportPlayback,
        refresh: fetchCourseContent
    };
};
