/**
 * @author Preethesh Kulal
 * @description Shared auth API service for student login
 */
/**
 * Shared Auth Service
 */
export const getAuthServices = (apiClient) => ({
    /**
     * Login student
     */
    login: async (credentials) => {
        const res = await apiClient.post('/auth/student/login', credentials);
        return res.data;
    },

    /**
     * Signup student
     */
    signup: async (userData) => {
        const res = await apiClient.post('/user/register', userData);
        return res.data;
    },

    /**
     * Get current user profile
     */
    getProfile: async () => {
        const res = await apiClient.get('/user/profile');
        return res.data.user;
    }
});
