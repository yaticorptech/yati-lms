/**
 * Campus inside the organization dashboard (2026-11-14): the admin panel's own API client and
 * session, at the Campus endpoints (yaticorp-lms-server/src/campus/orgAdmin.js).
 */
import api from '../utils/api';

export const CAMPUS = '/organizations/me/campus';
export const errorOf = (err, fallback = 'Something went wrong. Please try again.') => err?.response?.data?.message || fallback;
export default api;
