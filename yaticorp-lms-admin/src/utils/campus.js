/**
 * Campus (the Institution app, yaticorp-lms-institution) has no sign-in page of
 * its own: everyone signs in here, and Campus is opened with this session. The
 * token travels in the address's #fragment — never sent to any server — and the
 * Institution app takes it and clears it from the address at once.
 */
export const INSTITUTION_URL = (import.meta.env.VITE_INSTITUTION_URL || 'http://localhost:5175').replace(/\/$/, '');
export const campusUrl = () => {
    const token = localStorage.getItem('adminToken') || '';
    return token ? `${INSTITUTION_URL}/#token=${encodeURIComponent(token)}` : INSTITUTION_URL;
};
