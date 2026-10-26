/**
 * The signed-in teacher, kept on the device the way the student's login is
 * (localStorage, shared by every tab) but under keys of its own. One person
 * per browser: a teacher signing in ends any student session here, and a
 * student signing in ends the teacher's (AuthContext.enterApp → forgetTeacher).
 */
import axios from 'axios';
import { forgetStudent } from '../utils/sessionExpiry';

export const TEACHER_TOKEN = 'teacherToken';
export const TEACHER_DATA = 'teacherData';
/** Which sign-in the person chose last on this device: 'student' | 'teacher'. */
export const SIGNIN_AS = 'yati:signinAs';
export const TEACHER_SESSION_ENDED = 'yati:teacherSessionEnded';

export const readTeacher = () => {
    try {
        const token = localStorage.getItem(TEACHER_TOKEN);
        const data = localStorage.getItem(TEACHER_DATA);
        return token && data ? JSON.parse(data) : null;
    } catch { return null; }
};

export const hasTeacherSession = () => {
    try { return !!localStorage.getItem(TEACHER_TOKEN); } catch { return false; }
};

export const forgetTeacher = () => {
    try { localStorage.removeItem(TEACHER_TOKEN); localStorage.removeItem(TEACHER_DATA); } catch { /* storage off */ }
};

export const rememberSigninAs = (role) => {
    try { localStorage.setItem(SIGNIN_AS, role); } catch { /* asked again next time */ }
};
export const readSigninAs = () => {
    try { const v = localStorage.getItem(SIGNIN_AS); return v === 'teacher' || v === 'student' ? v : null; } catch { return null; }
};

/** Signed in or registered: keep the session and open the teacher dashboard (a full load, as for students). */
export const enterTeacher = (data) => {
    forgetStudent();
    localStorage.setItem(TEACHER_TOKEN, data.token);
    const { token: _token, ...rest } = data;
    localStorage.setItem(TEACHER_DATA, JSON.stringify(rest));
    rememberSigninAs('teacher');
    window.location.assign('/teacher');
};

/**
 * Inside the organization panel's Research tab: the panel hands over a session
 * for the teacher's own account (in the URL fragment), and the teacher
 * dashboard opens in its embedded layout — no sidebar, the panel has the tabs.
 * The student's own session, if any, is left alone.
 */
export const TEACHER_EMBED = 'teacher:embed';
export const isEmbedded = () => { try { return sessionStorage.getItem(TEACHER_EMBED) === '1'; } catch { return false; } };
export const enterEmbedded = (token, teacher, embed = true) => {
    localStorage.setItem(TEACHER_TOKEN, token);
    localStorage.setItem(TEACHER_DATA, JSON.stringify(teacher || {}));
    try { if (embed) sessionStorage.setItem(TEACHER_EMBED, '1'); else sessionStorage.removeItem(TEACHER_EMBED); } catch { /* the layout shows its sidebar then */ }
};

export const signOutTeacher = () => {
    forgetTeacher();
    window.location.assign('/login?as=teacher');
};

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * The teacher API. Its own client, so a teacher's requests never carry a
 * student token (and the student client's 401 handling never fires for them).
 * A 401 outside auth/ means the teacher's session is over: back to sign-in.
 */
const teacherApi = axios.create({ baseURL: `${baseURL}/teacher` });

teacherApi.interceptors.request.use((config) => {
    try {
        const token = localStorage.getItem(TEACHER_TOKEN);
        if (token) config.headers.Authorization = `Bearer ${token}`;
    } catch { /* no storage: the server will say 401 */ }
    return config;
});

let ending = false;
teacherApi.interceptors.response.use(undefined, (error) => {
    const url = String(error.config?.url || '');
    if (error.response?.status === 401 && !url.startsWith('/auth/') && !ending) {
        ending = true;
        forgetTeacher();
        try { sessionStorage.setItem(TEACHER_SESSION_ENDED, '1'); } catch { /* the page just won't say why */ }
        window.location.assign('/login?as=teacher');
    }
    return Promise.reject(error);
});

export default teacherApi;

/** The server's words for a failed request, or `fallback`. */
export const messageOf = (error, fallback = 'Something went wrong. Please try again.') =>
    error?.response?.data?.message || (!error?.response ? 'Check your connection and try again.' : fallback);
