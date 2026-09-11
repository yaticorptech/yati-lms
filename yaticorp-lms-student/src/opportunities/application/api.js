/** The part-time application, and the guardian permission it may need. */
import client from '../../utils/api';

const unwrap = (err) => {
    const body = err.response?.data;
    throw new Error(body?.error || body?.message || 'Something went wrong. Try again.');
};
const get = (path) => client.get(`/jobs${path}`).then((r) => r.data).catch(unwrap);
const post = (path, body) => client.post(`/jobs${path}`, body).then((r) => r.data).catch(unwrap);
const put = (path, body) => client.put(`/jobs${path}`, body).then((r) => r.data).catch(unwrap);

const base = '/opportunities/applications';

export const applicationApi = {
    start: (opportunityId) => post(base, { opportunityId }),
    read: (id) => get(`${base}/${id}`),
    setGuardian: (id, name, email) => put(`${base}/${id}/guardian`, { name, email }),
    // Answers { application, mail } — the mail half says whether the email
    // was really accepted, so the screen can say which.
    sendRequest: (id) => post(`${base}/${id}/request`),
    continue: (id) => post(`${base}/${id}/continue`)
};

/** The guardian's own half, opened by a link rather than a login. */
export const guardianApi = {
    read: (token) => get(`/guardian-approval/${token}`),
    approve: (token) => post(`/guardian-approval/${token}/approve`),
    decline: (token, reason) => post(`/guardian-approval/${token}/decline`, { reason })
};
