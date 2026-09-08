/**
 * My Learning Bio — the calls, on the LMS's axios client. Every call answers
 * the full bio object the server builds (see server src/learningbio/index.js).
 */
import client from '../utils/api';

const unwrap = (err) => {
    const body = err.response?.data;
    const e = new Error(body?.message || body?.error || (!err.response ? 'You appear to be offline.' : 'Something went wrong.'));
    e.code = body?.code || (err.response?.status === 401 ? 'SESSION_EXPIRED' : !err.response ? 'OFFLINE' : 'ERROR');
    e.status = err.response?.status;
    throw e;
};
const get = (p) => client.get(`/learning-bio${p}`).then((r) => r.data).catch(unwrap);
const post = (p, b) => client.post(`/learning-bio${p}`, b).then((r) => r.data).catch(unwrap);
const put = (p, b) => client.put(`/learning-bio${p}`, b).then((r) => r.data).catch(unwrap);

export const bioApi = {
    full: () => get(''),
    summary: () => get('/summary'),
    regenerate: () => post('/regenerate'),
    refresh: () => post('/refresh'),
    saveBio: (body) => put('/bio', body),
    interests: (body) => put('/interests', body),
    settings: (body) => put('/settings', body)
};

export const STATUS_TONE = {
    Learning: { bar: 'from-slate-400 to-slate-500', chip: 'bg-slate-100 text-slate-700' },
    Developing: { bar: 'from-sky-400 to-indigo-500', chip: 'bg-sky-100 text-sky-800' },
    Proficient: { bar: 'from-indigo-500 to-violet-500', chip: 'bg-indigo-100 text-indigo-800' },
    Advanced: { bar: 'from-emerald-500 to-teal-500', chip: 'bg-emerald-100 text-emerald-800' }
};

export const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '');
