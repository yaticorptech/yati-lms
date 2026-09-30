/**
 * @author Preethesh Kulal
 * @description Shared API service for course fetching, enrollment and progress
 */
/**
 * Shared Course Service
 */
export const getCourseServices = (apiClient) => ({
    /**
     * Fetch user's enrolled courses and bundles
     */
    getUserCourses: async () => {
        const res = await apiClient.get('/user/courses');
        return {
            courses: res.data.courses || [],
            bundles: res.data.bundles || []
        };
    },

    /**
     * Fetch every published bundle. Open to any signed-in student, so this is
     * the same list for everybody — only the progress on it differs.
     */
    getBundles: async () => {
        const res = await apiClient.get('/user/bundles');
        return res.data.bundles || [];
    },

    /**
     * Fetch one published bundle with the courses inside it
     */
    getBundle: async (bundleId) => {
        const res = await apiClient.get(`/user/bundles/${bundleId}`);
        return res.data.bundle;
    },

    /**
     * Fetch available courses for purchase
     */
    getAvailableCourses: async () => {
        const res = await apiClient.get('/user/courses/available');
        return res.data.availableCourses || [];
    },

    /**
     * Enroll in a course (free enrollment)
     */
    enrollCourse: async (courseId) => {
        const res = await apiClient.post(`/user/courses/${courseId}/enroll`);
        return res.data;
    },

    /**
     * Fetch full lesson content
     */
    getLesson: async (lessonId) => {
        const res = await apiClient.get(`/user/lessons/${lessonId}`);
        return res.data;
    },
    /**
     * Update lesson progress
     */
    updateProgress: async (courseId, lessonId) => {
        const res = await apiClient.post('/user/progress/update', { courseId, lessonId });
        return res.data;
    },

    /**
     * Where the student is in this course's videos, as the server has it:
     * `{ activeLessonId, activeLessonAt, positions: { [lessonId]: { seconds, at } } }`.
     */
    getPlayback: async (courseId) => {
        const res = await apiClient.get(`/user/courses/${courseId}/playback`);
        return res.data;
    },

    /**
     * Save a video position (`{ lessonId, seconds, at }`) and/or the open
     * lesson (`{ activeLessonId, at }`). With `keepalive` the request is made
     * with fetch so it outlives the page being closed — the one moment the
     * position most needs saving, and one axios cannot cover.
     */
    savePlayback: async (courseId, payload, { keepalive = false } = {}) => {
        if (!keepalive) {
            const res = await apiClient.put(`/user/courses/${courseId}/playback`, payload);
            return res.data;
        }
        const base = String(apiClient.defaults?.baseURL || '').replace(/\/$/, '');
        let token = null;
        try { token = localStorage.getItem('studentToken'); } catch { /* no storage, no token */ }
        await fetch(`${base}/user/courses/${courseId}/playback`, {
            method: 'PUT',
            keepalive: true,
            headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
            body: JSON.stringify(payload)
        });
        return null;
    },

    /**
     * Generate course certificate
     */
    generateCertificate: async (courseId) => {
        const res = await apiClient.post(
            '/certificates/generate',
            { courseId },
            { responseType: 'blob' }
        );
        return res.data;
    }
});
