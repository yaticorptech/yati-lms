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
        // /api/auth/register — the route the sign-up page uses. There has
        // never been a /user/register on the server; this answered 404.
        const res = await apiClient.post('/auth/register', userData);
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
