/**
 * The end of a session, the same way from every API client in the app.
 *
 * A sign-in lasts thirty days (an administrator's view-as-student, two
 * hours), and the server also ends one when the student's password changes
 * or the account is switched off. Nothing in the app noticed: the saved login
 * was trusted, every request came back 401, and each screen showed it as its
 * own load error — while the sign-in page, seeing a saved login, sent the
 * student straight back to the dashboard. Now any client that gets a 401 for
 * a signed-in request calls expireSessionOn401: the saved login is cleared,
 * the reason is remembered for the sign-in page to say once, and the browser
 * goes to /login — once, however many requests fail together — with the page
 * they were on kept as ?next=, so signing in again lands them back there.
 *
 * Callers keep their own interceptor logic and still reject the promise.
 */

/** Set while an administrator is viewing a student's dashboard (pages/AdminAccess). */
export const ADMIN_VIEW_KEY = 'adminViewing';

/** "Your session has ended" — said once on the sign-in page, then removed. */
export const SESSION_ENDED_KEY = 'yati:sessionEnded';

/** The saved login. Device-wide, in localStorage, shared by every tab. */
const LOGIN_KEYS = ['studentToken', 'studentData', ADMIN_VIEW_KEY];

/**
 * What a tab remembers about the student signed in to it (sessionStorage).
 * It belongs to that student: the next one to sign in on the same tab must
 * not inherit "already seen today's activity", a leaderboard celebration, an
 * interview's voice log, or the previous sign-up's organization notice.
 */
const STUDENT_SESSION_KEYS = ['yati:dailyActivitySeen', 'yati.voiceLog', 'yati.signupOrg', 'iv-dashboard-scroll', 'iv-dashboard-return'];
const STUDENT_SESSION_PREFIXES = ['lb-celebrated:'];

/**
 * Forget the signed-in student on this device: the saved login and this tab's
 * per-student memory. `keep` names session keys to leave (sign-up hands the
 * dashboard its organization notice across the sign-in).
 */
export const forgetStudent = ({ keep = [] } = {}) => {
    try {
        for (const key of LOGIN_KEYS) localStorage.removeItem(key);
    } catch { /* storage off: nothing was saved */ }
    try {
        for (const key of Object.keys(sessionStorage)) {
            if (keep.includes(key)) continue;
            if (STUDENT_SESSION_KEYS.includes(key) || STUDENT_SESSION_PREFIXES.some((p) => key.startsWith(p))) {
                sessionStorage.removeItem(key);
            }
        }
    } catch { /* as above */ }
};

/** Pages that are not somewhere to come back to after signing in. */
const NOT_A_DESTINATION = ['/login', '/signup', '/admin-access', '/reset-password'];

/**
 * A place in this app to go after signing in, or '/'.
 *
 * It comes from the address bar (?next=), so anything could be in it: only a
 * path on this same site is taken — it must start with one '/' (never '//',
 * which a browser reads as another host) and must resolve to this origin.
 */
export const safeNextPath = (value) => {
    if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return '/';
    try {
        const base = 'https://app.invalid';
        const url = new URL(value, base);
        if (url.origin !== base) return '/';
        const path = url.pathname.replace(/\/+$/, '') || '/';
        if (NOT_A_DESTINATION.includes(path)) return '/';
        return `${url.pathname}${url.search}${url.hash}`;
    } catch {
        return '/';
    }
};

/** The sign-in page, remembering where to return to (nothing for the home page). */
export const loginPathFor = (next) => {
    const target = safeNextPath(next);
    return target === '/' ? '/login' : `/login?next=${encodeURIComponent(target)}`;
};

// One redirect per page load, however many requests come back 401 together.
let ending = false;

/**
 * Call from a response error interceptor. Does nothing unless the server
 * answered 401 to a request that is not itself a sign-in (/auth/…: a wrong
 * password is a 401 too, and is the sign-in page's to show).
 */
export function expireSessionOn401(error) {
    if (error?.response?.status !== 401) return;
    const url = String(error.config?.url || '');
    if (url.includes('/auth/')) return;
    if (typeof window === 'undefined') return;

    forgetStudent();
    // 'device': this device was taken off the account (the device limit); the sign-in page says so.
    try { sessionStorage.setItem(SESSION_ENDED_KEY, error.response?.data?.code === 'DEVICE_NOT_ALLOWED' ? 'device' : error.response?.data?.code === 'SESSION_REPLACED' ? 'replaced' : '1'); } catch { /* storage off: the sign-in page just won't say why */ }

    if (ending) return;
    ending = true;
    const { pathname, search, hash } = window.location;
    window.location.assign(loginPathFor(`${pathname}${search}${hash}`));
}
