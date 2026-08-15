/**
 * @author Preethesh Kulal
 * @description Axios instance for student API calls with auth token interceptor
 */
import axios from 'axios';

const apiBaseURL = import.meta.env.VITE_API_URL;

if (!apiBaseURL) {
    console.warn(
        '[API] WARNING: VITE_API_URL environment variable is not set. ' +
        'All API requests will fall back to http://localhost:5000/api.'
    );
}

const api = axios.create({
    baseURL: apiBaseURL || 'http://localhost:5000/api',
});

api.interceptors.request.use(config => {
    const token = localStorage.getItem('studentToken');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default api;
