/**
 * @author Preethesh Kulal
 * @description Shared hook for dashboard course and bundle data fetching
 */
import { useRef, useState } from 'react';
import { getCourseServices } from '../api/courseService';
import useAutoRefresh from '../../hooks/useAutoRefresh';

/**
 * Shared hook for the student dashboard.
 * Manages courses, bundles, and available courses.
 */
export const useDashboard = (apiClient) => {
    const [courses, setCourses] = useState([]);
    const [bundles, setBundles] = useState([]);
    const [availableCourses, setAvailableCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [buyingCourseId, setBuyingCourseId] = useState(null);

    const courseService = getCourseServices(apiClient);
    // Whether the lists have loaded once. The spinner is for that first load
    // (and a Try Again after it failed): the 30-second refresh used to run
    // through it too, and the course list blinked away and back every time.
    const loaded = useRef(false);

    const fetchData = async () => {
        if (!loaded.current) setLoading(true);
        try {
            // The enrolled list straight from the server rather than through
            // courseService.getUserCourses, which keeps only the two lists:
            // the answer can also carry rewards events — XP for a course the
            // server has just found complete (a completion repaired on read) —
            // and those go to the celebrations like any other.
            const [mine, available] = await Promise.all([
                apiClient.get('/user/courses'),
                courseService.getAvailableCourses()
            ]);
            const events = mine.data?.rewards?.events;
            if (Array.isArray(events) && events.length) {
                window.dispatchEvent(new CustomEvent('yati:rewards', { detail: events }));
            }
            setCourses(mine.data?.courses || []);
            setBundles(mine.data?.bundles || []);
            setAvailableCourses(available);
            setError(null);
            loaded.current = true;
        } catch (err) {
            console.error('Dashboard fetch failed:', err);
            // A background refresh that fails keeps the list already shown.
            if (!loaded.current) setError(err.response?.data?.message || 'Failed to fetch data');
        } finally {
            setLoading(false);
        }
    };

    useAutoRefresh(fetchData, 30000);

    const enrollCourse = async (courseId) => {
        setBuyingCourseId(courseId);
        try {
            const result = await courseService.enrollCourse(courseId);
            const enrolledCourse = availableCourses.find(c => c._id === courseId);
            if (enrolledCourse) {
                setAvailableCourses(prev => prev.filter(c => c._id !== courseId));
                setCourses(prev => [...prev, { ...enrolledCourse, progress: 0 }]);
            }
            return result;
        } catch (err) {
            console.error('Enrollment failed:', err);
            throw err;
        } finally {
            setBuyingCourseId(null);
        }
    };

    return {
        courses,
        bundles,
        availableCourses,
        loading,
        error,
        buyingCourseId,
        enrollCourse,
        refresh: fetchData
    };
};
