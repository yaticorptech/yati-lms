/**
 * @author Preethesh Kulal
 * @description Axios instance for student API calls with auth token interceptor
 */
import axios from 'axios';
import { clearCareerCache } from '../career/services/api';

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
    // A save anywhere in the LMS (a finished lesson, a redeemed reward) can
    // change what Career Path shows, so its cached reads are dropped.
    if ((config.method || 'get').toLowerCase() !== 'get') clearCareerCache();
    return config;
});

const clearAfterSave = (config) => {
    if (config && (config.method || 'get').toLowerCase() !== 'get') clearCareerCache();
};
api.interceptors.response.use(
    (response) => { clearAfterSave(response.config); return response; },
    (error) => { clearAfterSave(error.config); return Promise.reject(error); }
);

export default api;
