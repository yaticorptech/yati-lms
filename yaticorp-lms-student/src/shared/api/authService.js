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

    /** A 3rd device: remove one of the student's devices (once a year) and sign in here instead. */
    replaceDevice: async (ticket, removeDeviceId) => {
        const res = await apiClient.post('/auth/student/login/replace-device', { ticket, removeDeviceId });
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
