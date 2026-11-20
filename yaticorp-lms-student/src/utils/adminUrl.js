/**
 * The admin app's address (the organisation panel lives there) — the twin of the admin app's
 * utils/studentUrl.js. VITE_ADMIN_URL when the build sets it, else what the server knows
 * (ADMIN_URL); otherwise, on a live host, the same domain with "admin." after its first name
 * (learn.yaticorp.com → learn.admin.yaticorp.com). `devUrl` for local development.
 */
export const adminAppUrl = (fromServer = '', devUrl = 'http://localhost:5174') => {
    const set = import.meta.env.VITE_ADMIN_URL || fromServer;
    if (set) return String(set).replace(/\/+$/, '');
    if (typeof window !== 'undefined') {
        const { protocol, hostname, port } = window.location;
        const live = /^https?:$/.test(protocol) && hostname !== 'localhost' && !/^[\d.]+$/.test(hostname) && hostname.includes('.');
        if (live && !/(^|\.)admin\./.test(hostname)) {
            const [first, ...rest] = hostname.split('.');
            return `${protocol}//${first}.admin.${rest.join('.')}${port ? `:${port}` : ''}`;
        }
    }
    return devUrl;
};
