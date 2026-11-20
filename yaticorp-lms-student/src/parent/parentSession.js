/**
 * The signed-in parent (2026-11-19), kept on the device like the student's and the teacher's sign-in, under keys of
 * its own. One person per browser: a parent signing in ends a student or teacher session here.
 */
import axios from 'axios';
import { forgetStudent } from '../utils/sessionExpiry';
import { forgetTeacher } from '../teacher/teacherSession';

export const PARENT_TOKEN = 'parentToken';
export const PARENT_DATA = 'parentData';

export const hasParentSession = () => {
    try { return !!localStorage.getItem(PARENT_TOKEN); } catch { return false; }
};
export const readParent = () => {
    try { return JSON.parse(localStorage.getItem(PARENT_DATA) || 'null'); } catch { return null; }
};
export const forgetParent = () => {
    try { localStorage.removeItem(PARENT_TOKEN); localStorage.removeItem(PARENT_DATA); } catch { /* storage off */ }
};

/** Signed in or registered: keep the session and open the parent dashboard (a full load). */
export const enterParent = (data) => {
    forgetStudent();
    forgetTeacher();
    const { token, ...rest } = data;
    localStorage.setItem(PARENT_TOKEN, token);
    localStorage.setItem(PARENT_DATA, JSON.stringify(rest));
    window.location.assign('/parent');
};

export const signOutParent = () => {
    forgetParent();
    window.location.assign('/login');
};

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/** The parent API: its own client, so its requests never carry a student's or teacher's token. */
const parentApi = axios.create({ baseURL: `${baseURL}/parent` });
parentApi.interceptors.request.use((config) => {
    try {
        const token = localStorage.getItem(PARENT_TOKEN);
        if (token) config.headers.Authorization = `Bearer ${token}`;
    } catch { /* no storage: the server will say 401 */ }
    return config;
});
// A 401 outside auth/: the session is over — back to sign-in.
parentApi.interceptors.response.use((r) => r, (error) => {
    if (error.response?.status === 401 && !String(error.config?.url || '').startsWith('/auth/')) signOutParent();
    return Promise.reject(error);
});

export default parentApi;
