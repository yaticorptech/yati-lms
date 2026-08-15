/**
 * @author Preethesh Kulal
 * @description Shared hook for course player state, progress and certificate generation
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { getCourseServices } from '../api/courseService';

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

    // Memoised so fetchCourseContent keeps a stable identity — without this,
    // listing it as an effect dependency would refetch on every render.
    const courseService = useMemo(() => getCourseServices(apiClient), [apiClient]);

    const fetchCourseContent = useCallback(async () => {
        setLoading(true);
        setFetchError(null);
        try {
            const res = await apiClient.get(`/user/courses/${courseId}`);
            setCourseData(res.data);
            setCompletedLessons(res.data.progress?.completedLessons || []);

            if (res.data.modules.length > 0) {
                setExpandedModules({ [res.data.modules[0]._id]: true });
                if (res.data.modules[0].lessons.length > 0) {
                    setActiveLesson(res.data.modules[0].lessons[0]);
                }
            }
        } catch (err) {
            console.error('Failed to fetch course content:', err);
            setFetchError(err.response?.data?.message || 'Course not found or unavailable.');
        } finally {
            setLoading(false);
        }
    }, [apiClient, courseId]);

    useEffect(() => {
        if (courseId) fetchCourseContent();
    }, [courseId, fetchCourseContent]);

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
        setActiveLesson,
        expandedModules,
        completedLessons,
        generatingCert,
        toggleModule,
        markLessonComplete,
        generateCertificate,
        refresh: fetchCourseContent
    };
};
