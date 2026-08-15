/**
 * @author Preethesh Kulal
 * @description Shared API service for quiz retrieval and submission
 */
/**
 * Shared Quiz Service
 */

export const getQuizServices = (apiClient) => ({
    /**
     * Fetch quiz data for a specific lesson
     */
    getQuiz: async (lessonId) => {
        const res = await apiClient.get(`/user/lessons/${lessonId}/quiz`);
        return res.data;
    },

    /**
     * Submit quiz answers
     */
    submitQuiz: async (lessonId, answers) => {
        const res = await apiClient.post(`/user/lessons/${lessonId}/quiz/submit`, { answers });
        return res.data;
    }
});
