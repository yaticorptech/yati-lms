/**
 * The API client: the organization sign-in's token on every request; a lapsed
 * session (401) goes back to the admin app's sign-in page. Server: yaticorp-lms-server.
 */
import axios from 'axios';

export const TOKEN_KEY = 'institutionToken';
/** Everyone signs in on the admin app's sign-in page; it opens Campus with the session. */
export const ADMIN_URL = (import.meta.env.VITE_ADMIN_URL || 'http://localhost:5174').replace(/\/$/, '');
export const toSignIn = () => window.location.replace(`${ADMIN_URL}/login`);
export const toSignOut = () => window.location.replace(`${ADMIN_URL}/login?logout=1`);

// The session handed over by the admin app (#token=…): kept, and taken out of the address at once.
{
    const m = window.location.hash.match(/token=([^&]+)/);
    if (m) {
        localStorage.setItem(TOKEN_KEY, decodeURIComponent(m[1]));
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
}
export const CAMPUS = '/organizations/me/campus';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5001/api' });

api.interceptors.request.use((config) => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});
api.interceptors.response.use((r) => r, (error) => {
    const url = error.config?.url || '';
    if (error.response?.status === 401 && !url.includes('/auth/')) {
        localStorage.removeItem(TOKEN_KEY);
        toSignIn();
    }
    return Promise.reject(error);
});

export const errorOf = (err, fallback = 'Something went wrong. Please try again.') => err?.response?.data?.message || fallback;
export default api;
