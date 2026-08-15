/**
 * @author Preethesh Kulal
 * @description Axios instance for admin API calls with auth token interceptor and 401 redirect
 */
import axios from 'axios';

const apiBaseURL = import.meta.env.VITE_API_URL;

if (!apiBaseURL) {
    console.warn(
        '[API] WARNING: VITE_API_URL environment variable is not set. ' +
        'All API requests will fall back to http://localhost:5000/api. ' +
        'This will NOT work in production. Set VITE_API_URL in your hosting environment.'
    );
}

const api = axios.create({
    baseURL: apiBaseURL || 'http://localhost:5000/api',
});

// ✅ REQUEST INTERCEPTOR (already correct)
api.interceptors.request.use(config => {
    const token = localStorage.getItem('adminToken');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// 🔥 ADD THIS BLOCK (VERY IMPORTANT)
api.interceptors.response.use(
    (response) => response,
    (error) => {
        console.log("API ERROR:", error?.response);

        // If token expired or unauthorized — but NOT for the login/auth calls,
        // whose 401 ("Invalid email or password") must surface as a form error
        // instead of triggering a full-page redirect that swallows the message.
        const url = error.config?.url || '';
        // Any /auth/* 401 is a credential/secret error that must surface on the
        // form, not trigger a full-page redirect that swallows the message and
        // bounces the user to the org-admin login.
        const isAuthCall = url.includes('/auth/');
        if (error.response?.status === 401 && !isAuthCall) {
            localStorage.removeItem("adminToken");
            localStorage.removeItem("adminData");

            // redirect to login
            window.location.replace("/login");
        }

        return Promise.reject(error);
    }
);

export default api;