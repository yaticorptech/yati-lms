/**
 * The Opportunities section's calls, on the LMS's own axios client — the
 * same thin layer as jobs/api.js, against /api/jobs/opportunities.
 */
import client from '../utils/api';

const BASE = '/jobs/opportunities';

const unwrap = (err) => {
    const body = err.response?.data;
    const message = body?.error || body?.message || err.message || 'Something went wrong.';
    const wrapped = new Error(message);
    wrapped.status = err.response?.status;
    wrapped.code = body?.code;
    throw wrapped;
};

const get = (path, config) => client.get(`${BASE}${path}`, config).then((r) => r.data).catch(unwrap);
const post = (path, body) => client.post(`${BASE}${path}`, body).then((r) => r.data).catch(unwrap);
const put = (path, body) => client.put(`${BASE}${path}`, body).then((r) => r.data).catch(unwrap);

export const opportunitiesApi = {
    profile: () => get('/profile'),
    saveProfile: (body) => put('/profile', body),
    list: (params) => get('/', { params }),
    interested: () => get('/interested'),
    recent: () => get('/recent'),
    details: (id) => get(`/${id}`),
    preference: (id, verdict) => post(`/${id}/preference`, { verdict }),
    report: (id, body) => post(`/${id}/report`, body),
    requestGuardian: (guardianName) => post('/guardian/request', { guardianName }),
    // Part-time listings from Google Jobs (via JSearch) near a place.
    web: (params) => get('/web', { params }),
    // A rough place from the connection, to prefill the Google search box.
    ipLocation: () => client.get('/jobs/meta/ip-location').then((r) => r.data).catch(() => ({ label: '' }))
};
