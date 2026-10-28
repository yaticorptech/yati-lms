/** Linguistic Ability — the calls, on the LMS's axios client (as interview/api.js). */
import client from '../utils/api';

const unwrap = (err) => {
    const body = err.response?.data;
    const e = new Error(body?.message || (!err.response ? 'You appear to be offline.' : 'Something went wrong.'));
    e.code = body?.code || (err.response?.status === 401 ? 'SESSION_EXPIRED' : !err.response ? 'OFFLINE' : 'ERROR');
    e.status = err.response?.status;
    throw e;
};
const get = (p) => client.get(`/linguistic${p}`).then((r) => r.data).catch(unwrap);
const post = (p, b) => client.post(`/linguistic${p}`, b).then((r) => r.data).catch(unwrap);
const del = (p) => client.delete(`/linguistic${p}`).then((r) => r.data).catch(unwrap);

export const linguisticApi = {
    dashboard: () => get('/'),
    /** The learning path: each level's units and lessons, with which are open and which is next. */
    path: () => get('/path'),
    /** Start at a level chosen instead of taking the placement test. */
    chooseLevel: (level) => post('/level', { level }),
    /** Why they are learning, and how much English they know (0 new … 4 most topics). */
    setAbout: (reason, know, more = {}) => post('/about', { reason, know, ...more }),
    setKnows: (knows) => post('/knows', knows),
    /** The daily XP goal: 10, 20, 30 or 50. */
    setGoal: (xp) => post('/goal', { xp }),
    // The learning plan (2026-10-24): the roadmap, the times to choose (before the student has started: as they said), making or changing it.
    plan: () => get('/plan'),
    planOptions: (course, language, level) => get(`/plan/options?${new URLSearchParams({ course: course || 'en', language: language || '', level: level || '' })}`),
    setPlan: (days) => post('/plan', { days }),
    /** The language to learn: 'en', or another course (Vocabulary and Translation), starting at a level. */
    setCourse: (course, start = null) => post('/course', { course, start }),
    /** Choose the student's own language (meanings and translation). */
    setLanguage: (code) => post('/language', { language: code }),
    /** Open a unit's treasure chest on the path: bonus XP, once. */
    openChest: (unitId) => post(`/chest/${unitId}`),
    placement: () => get('/placement'),
    submitPlacement: (answers) => post('/placement', { answers }),
    module: (module) => get(`/modules/${module}`),
    lesson: (id) => get(`/lessons/${id}`),
    step: (id, step) => post(`/lessons/${id}/step`, { step }),
    check: (id, section, qid, given) => post(`/lessons/${id}/check`, { section, id: qid, given }),
    /** Check one quiz answer as it is given (nothing saved); the quiz is still submitted whole at the end. */
    quizCheck: (id, qid, given) => post(`/lessons/${id}/quiz/check`, { id: qid, given }),
    quiz: (id, answers) => post(`/lessons/${id}/quiz`, { answers }),
    writing: (id, taskId, answer) => post(`/lessons/${id}/writing/${taskId}`, { answer }),
    // Said, not ticked (2026-10-28): the server ticks the checklist from what was said.
    speaking: (id, said, seconds, recorded) => post(`/lessons/${id}/speaking`, { said, seconds, recorded }),
    // Speak on a topic (Advanced): what was said → each sentence corrected, and why.
    talk: (id, text) => post(`/lessons/${id}/talk`, { text }),
    daily: () => get('/daily'),
    submitDaily: (answers) => post('/daily', { answers }),
    review: () => get('/review'),
    answerReview: (id, given) => post(`/review/${id}`, { given }),
    submissions: () => get('/submissions'),
    history: () => get('/history'),
    certificates: () => get('/certificates'),
    /** The certificate PDF, as a Blob. */
    certificatePdf: (level, course = null) => client.get(`/linguistic/certificates/${level}/pdf${course ? `?course=${encodeURIComponent(course)}` : ''}`, { responseType: 'blob' }).then((r) => r.data).catch(unwrap),
    hideCertificate: (level, course = null) => del(`/certificates/${level}${course ? `?course=${encodeURIComponent(course)}` : ''}`)
};

/** Show the reward toasts and celebrations the rest of the app shows (RewardsContext listens). */
export const announceRewards = (events) => {
    if (events?.length) window.dispatchEvent(new CustomEvent('yati:rewards', { detail: events }));
    window.dispatchEvent(new CustomEvent('yati:progress-changed'));
};

/**
 * A recording's address. Seeded recordings live on the API server
 * (/linguistic/audio/…); uploaded ones are full web addresses already.
 */
const API_ORIGIN = String(import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');
export const mediaUrl = (src) => (!src ? '' : /^https?:\/\//i.test(src) ? src : `${API_ORIGIN}${src.startsWith('/') ? '' : '/'}${src}`);
