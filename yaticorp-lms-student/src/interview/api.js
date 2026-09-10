/** Interview Ready — the calls, on the LMS's axios client. */
import client from '../utils/api';

const unwrap = (err) => {
    const body = err.response?.data;
    const e = new Error(body?.message || body?.error || (!err.response ? 'You appear to be offline.' : 'Something went wrong.'));
    e.code = body?.code || (err.response?.status === 401 ? 'SESSION_EXPIRED' : !err.response ? 'OFFLINE' : 'ERROR');
    e.status = err.response?.status;
    throw e;
};
const get = (p) => client.get(`/interview${p}`).then((r) => r.data).catch(unwrap);
const post = (p, b) => client.post(`/interview${p}`, b).then((r) => r.data).catch(unwrap);

export const interviewApi = {
    dashboard: () => get('/dashboard'),
    questions: () => get('/questions'),
    practice: (id) => post(`/questions/${id}/practice`),
    start: (type, role) => post('/sessions', { type, role }),
    answer: (id, answer, inputMode, voice) => post(`/sessions/${id}/answer`, { answer, inputMode, voice }),
    finish: (id) => post(`/sessions/${id}/finish`),
    history: () => get('/sessions'),
    session: (id) => get(`/sessions/${id}`)
};

export const TYPE_META = {
    hr: { label: 'HR Interview', hint: 'Introduction, motivation, behaviour and situations.', emoji: '🤝', tone: 'from-sky-500 to-indigo-500' },
    technical: { label: 'Technical Interview', hint: 'Your skills, concepts and a problem to solve.', emoji: '💻', tone: 'from-indigo-500 to-violet-600' },
    project: { label: 'Project Interview', hint: 'Deep dive into the projects you have built.', emoji: '🚀', tone: 'from-emerald-500 to-teal-500' },
    behavioral: { label: 'Behavioral Interview', hint: 'Tell me about a time when…', emoji: '💬', tone: 'from-amber-500 to-orange-500' },
    full: { label: 'Full Mock Interview', hint: 'All of the above, start to finish.', emoji: '🎤', tone: 'from-rose-500 to-pink-500' }
};

/**
 * The roles a mock interview can be aimed at. Shared by the dashboard and the
 * welcome screen so the same list appears in both, with `ROLE_OTHER` as the
 * option that opens a box for anything not on it.
 */
export const ROLES = ['Full Stack Developer', 'Frontend Developer', 'Backend Developer', 'Data Analyst', 'Data Scientist', 'Software Engineer', 'Business Analyst', 'UI/UX Designer', 'Digital Marketer', 'Customer Support Executive'];
export const ROLE_OTHER = '__other__';

export const DURATION = { hr: '8–10 minutes', technical: '10–12 minutes', project: '10–12 minutes', behavioral: '10–12 minutes', full: '12–15 minutes' };

export const STAGE_LABEL = { intro: 'Introduction', about: 'About you', background: 'Background', skills: 'Skills', technical: 'Technical', project: 'Projects', problem: 'Problem solving', behavioral: 'Behavioural', situational: 'Situational', candidate: 'Your questions', closing: 'Wrap-up' };

export const scoreTone = (n) => (n >= 75 ? 'from-emerald-500 to-teal-500' : n >= 50 ? 'from-indigo-500 to-violet-500' : 'from-amber-400 to-orange-500');
export const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '');

/** Notify the rest of the shell (sidebar XP, streak, toasts) that XP moved. */
export const announceProgress = () => window.dispatchEvent(new CustomEvent('yati:progress-changed'));
