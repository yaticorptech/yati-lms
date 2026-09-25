/**
 * The organization endpoints, wrapped over the shared LMS axios instance —
 * the same thin-wrapper shape as src/jobs/api.js and src/learningbio/api.js, so
 * the section's component never builds a URL itself.
 */
import api from '../utils/api';

const organizationApi = {
    /** My organization, or my pending/decided request if I have no membership. */
    me: () => api.get('/organizations/student/me').then((r) => r.data),

    /** Look an active organization up by the ID printed on a handout. */
    lookup: (orgCode) => api.get(`/organizations/student/lookup/${encodeURIComponent(orgCode)}`).then((r) => r.data),

    /** Ask to join. The organization's own admin decides. */
    requestJoin: (orgCode) => api.post('/organizations/student/requests', { orgCode }).then((r) => r.data),

    /**
     * Withdraw a request that has not been decided yet.
     *
     * The only thing a student can take back. There is deliberately no "leave":
     * ending a membership belongs to the organization, not to its student, and
     * the server has no endpoint for it either.
     */
    cancelRequest: (requestId) => api.delete(`/organizations/student/requests/${requestId}`).then((r) => r.data)
};

export default organizationApi;
