/** Quiz Arena — the calls (server: competitions/arena/student.js), on the LMS's axios client. */
import client from '../../utils/api';

const unwrap = (err) => {
    const body = err.response?.data;
    const e = new Error(body?.message || (!err.response ? 'You appear to be offline.' : 'Something went wrong.'));
    e.status = err.response?.status;
    throw e;
};
const base = '/competitions/arena';

export const arenaApi = {
    list: () => client.get(base).then((r) => r.data.competitions).catch(unwrap),
    detail: (id) => client.get(`${base}/${id}`).then((r) => r.data.competition).catch(unwrap),
    join: (id, code) => client.post(`${base}/${id}/join`, { code }).then((r) => r.data).catch(unwrap),
    live: (id) => client.get(`${base}/${id}/live`).then((r) => r.data).catch(unwrap),
    answer: (id, index, choice) => client.post(`${base}/${id}/answer`, { index, choice }).then((r) => r.data).catch(unwrap),
    results: (id) => client.get(`${base}/${id}/results`).then((r) => r.data).catch(unwrap),
    pay: (id) => client.post(`${base}/${id}/pay`).then((r) => r.data).catch(unwrap),
    payVerify: (id, body) => client.post(`${base}/${id}/pay/verify`, body).then((r) => r.data).catch(unwrap),
    certificate: (id) => client.get(`${base}/${id}/certificate`, { responseType: 'blob' }).then((r) => r.data).catch(unwrap)
};

export const ROUND_NAMES = { 1: 'Live Quiz Battle', 2: 'Picture Challenge', 3: 'Current Affairs Clash' };
export const ROUND_BLURBS = {
    1: 'General knowledge, science, technology, reasoning, maths, history and geography.',
    2: 'Identify personalities, monuments, sports, logos and flags from pictures.',
    3: 'Indian and world news, government schemes, sports, awards and recent events.'
};
export const STATE = {
    registration: ['Registration open', 'bg-emerald-50 text-emerald-700 ring-emerald-200'],
    upcoming: ['Starting soon', 'bg-sky-50 text-sky-700 ring-sky-200'],
    live: ['Live now', 'bg-rose-50 text-rose-700 ring-rose-200'],
    ended: ['Results coming', 'bg-amber-50 text-amber-800 ring-amber-200'],
    results: ['Results out', 'bg-indigo-50 text-indigo-700 ring-indigo-200'],
    cancelled: ['Cancelled', 'bg-slate-100 text-slate-500 ring-slate-200']
};
export const fmt = (d) => (d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '');
export const duration = (ms) => `${Math.round(ms / 60000)} min`;
