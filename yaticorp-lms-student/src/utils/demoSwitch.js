/**
 * A demo (presentation) card in this browser (2026-11-19): its switch pass, and which of its
 * dashboards is open. The scan at sign-in gives the pass (POST /api/auth/card-scan, `demoSwitch`);
 * the bar at the top of the student and teacher dashboards (components/DemoBar.jsx) trades it for
 * another dashboard without scanning again (POST /api/auth/demo/open). Signing in or out as anyone
 * forgets it (utils/sessionExpiry.js LOGIN_KEYS).
 */
import api from './api';
import { forgetStudent, DEMO_KEY } from './sessionExpiry';
import { forgetTeacher, enterTeacher } from '../teacher/teacherSession';
import { adminAppUrl } from './adminUrl';

/** { token, as } when a demo card is open here — as `as` ('student' | 'teacher'), when given. */
export const readDemo = (as) => {
    try {
        const d = JSON.parse(localStorage.getItem(DEMO_KEY) || 'null');
        return d?.token && (!as || d.as === as) ? d : null;
    } catch { return null; }
};
/**
 * Whether the student signed in here is a demo card: by the account (`demoCard`, from the sign-in — a number and
 * password too), or by its switch pass. Its compulsory prompts (a photo in uniform, the passport bonus) are left out.
 */
export const isDemoCard = (user) => Boolean(user?.demoCard) || Boolean(readDemo('student'));
const remember = (token, as) => { try { localStorage.setItem(DEMO_KEY, JSON.stringify({ token, as })); } catch { /* storage off: no switch bar */ } };

/** A student's sign-in, as AuthContext's enterApp does it (this also runs outside the student's own pages). */
const enterStudent = (data) => {
    forgetStudent({ keep: ['yati.signupOrg'] });
    forgetTeacher();
    localStorage.setItem('studentToken', data.token);
    localStorage.setItem('studentData', JSON.stringify(data));
    window.location.assign('/');
};

/**
 * Open one of the card's dashboards. `have`: the student session the scan already answered with,
 * so opening Student straight after a scan asks nothing more. Rejects with the server's error.
 */
export const openDemoDashboard = async (token, id, have) => {
    if (id === 'organization') {
        const { data } = await api.post('/auth/demo/open', { token, dashboard: id });
        // The organisation panel is another app: the pass rides in the fragment, which is never sent to a server.
        window.location.assign(`${adminAppUrl(data.adminUrl)}/demo-access#code=${encodeURIComponent(data.code)}`);
        return;
    }
    const data = id === 'student' && have ? have : (await api.post('/auth/demo/open', { token, dashboard: id })).data;
    const { demo: _demo, dashboards: _dashboards, demoSwitch, ...session } = data;
    if (id === 'teacher') enterTeacher(session); else enterStudent(session);
    // After the sign-in above, which forgets whoever was here before — this card's pass included.
    remember(demoSwitch || token, id);
};
