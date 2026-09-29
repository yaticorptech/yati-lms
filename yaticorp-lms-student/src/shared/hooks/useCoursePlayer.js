/**
 * @author Preethesh Kulal
 * @description Shared hook for course player state, progress and certificate generation
 */
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { getCourseServices } from '../api/courseService';
import {
    readActiveLessonEntry, rememberActiveLesson, chooseLessonToOpen,
    readPositionEntry, newest
} from '../playback/resume';

// Server writes while a video plays are spaced out. A pause, a hidden tab or
// a page unload is written at once, whatever the spacing.
const SERVER_SAVE_INTERVAL_MS = 15000;

/**
 * Shared hook for the Course Player.
 * Manages course content, active lesson, and progress.
 */
export const useCoursePlayer = (apiClient, courseId) => {
    const [courseData, setCourseData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState(null);
    const [activeLesson, setActiveLesson] = useState(null);
    const [expandedModules, setExpandedModules] = useState({});
    const [completedLessons, setCompletedLessons] = useState([]);
    const [generatingCert, setGeneratingCert] = useState(false);
    // The server's copy of where the student is in this course's videos.
    const [serverPlayback, setServerPlayback] = useState(null);
    const lastServerSaveRef = useRef(0);

    // Memoised so fetchCourseContent keeps a stable identity — without this,
    // listing it as an effect dependency would refetch on every render.
    const courseService = useMemo(() => getCourseServices(apiClient), [apiClient]);

    const fetchCourseContent = useCallback(async () => {
        setLoading(true);
        setFetchError(null);
        try {
            const [res, playback] = await Promise.all([
                apiClient.get(`/user/courses/${courseId}`),
                // Nothing saved yet, or an older server, is not an error: this
                // device's own copy still works.
                courseService.getPlayback(courseId).catch(() => null)
            ]);
            const modules = res.data.modules || [];
            const completed = res.data.progress?.completedLessons || [];
            setCourseData(res.data);
            setCompletedLessons(completed);
            setServerPlayback(playback);

            // Reopen the lesson the student was on, wherever they were on it
            // last. A page reload is not always deliberate — a phone locking
            // its screen is enough — and landing on lesson one every time is
            // what made a paused video look like it had started over.
            const remembered = newest(
                readActiveLessonEntry(courseId),
                playback?.activeLessonId ? { id: playback.activeLessonId, at: playback.activeLessonAt || 0 } : null
            );
            const { module, lesson } = chooseLessonToOpen(modules, completed, remembered?.id || null);
            if (module) setExpandedModules({ [module._id]: true });
            if (lesson) setActiveLesson(lesson);
        } catch (err) {
            console.error('Failed to fetch course content:', err);
            setFetchError(err.response?.data?.message || 'Course not found or unavailable.');
        } finally {
            setLoading(false);
        }
    }, [apiClient, courseService, courseId]);

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
     */
    const reportPlayback = useCallback((lessonId, seconds, reason = 'tick') => {
        if (!lessonId) return;
        const now = Date.now();
        if (reason === 'tick' && now - lastServerSaveRef.current < SERVER_SAVE_INTERVAL_MS) return;
        lastServerSaveRef.current = now;
        const keepalive = reason === 'unload' || reason === 'hidden';
        courseService.savePlayback(courseId, { lessonId, seconds, at: now }, { keepalive }).catch(() => {});
    }, [courseId, courseService]);

    const toggleModule = (moduleId) => {
        setExpandedModules(prev => ({ ...prev, [moduleId]: !prev[moduleId] }));
    };

    const markLessonComplete = async (lessonId) => {
        try {
            const data = await courseService.updateProgress(courseId, lessonId);
            setCompletedLessons(data.progress.completedLessons);
            setCourseData(prev => ({
                ...prev,
                progress: data.progress
            }));
            // XP, streak and badge events from this completion. The rewards
            // provider listens and shows the toast / celebration.
            if (data.rewards?.events?.length) {
                window.dispatchEvent(new CustomEvent('yati:rewards', { detail: data.rewards.events }));
            }
            return data;
        } catch (err) {
            console.error('Failed to update progress:', err);
            throw err;
        }
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
        activeLesson,
        setActiveLesson: selectLesson,
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
