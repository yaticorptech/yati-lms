/**
 * A superadmin managing one organization's own panel.
 *
 * Which organization, kept per tab (sessionStorage): opening one in a tab
 * does not change what another tab shows, and closing the tab ends it. The
 * API client sends it as the X-View-Organization header on the
 * organization panel's requests; the server lets only a superadmin use it,
 * and lets them change anything but the organization's password.
 */
const KEY = 'viewOrganization';

/** { id, name } of the organization being viewed, or null. */
export const getViewedOrganization = () => {
    try { return JSON.parse(sessionStorage.getItem(KEY) || 'null'); } catch { return null; }
};

export const startViewingOrganization = (org) => {
    try { sessionStorage.setItem(KEY, JSON.stringify({ id: org._id, name: org.name })); } catch { /* storage refused */ }
};

export const stopViewingOrganization = () => {
    try { sessionStorage.removeItem(KEY); } catch { /* storage refused */ }
};
