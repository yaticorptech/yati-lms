/**
 * The student app's address. VITE_STUDENT_URL when the build sets it; otherwise, on a live
 * admin host, the same domain without "admin." (learn.admin.yaticorp.com → learn.yaticorp.com),
 * so a build missing the variable never sends anyone to localhost. `devUrl` for local development.
 */
export const studentAppUrl = (devUrl = 'http://localhost:5173') => {
    const set = import.meta.env.VITE_STUDENT_URL;
    if (set) return String(set).replace(/\/+$/, '');
    if (typeof window !== 'undefined') {
        const { protocol, hostname, port } = window.location;
        if (/^https?:$/.test(protocol) && hostname !== 'localhost' && hostname !== '127.0.0.1' && /(^|\.)admin\./.test(hostname)) {
            return `${protocol}//${hostname.replace(/(^|\.)admin\./, '$1')}${port ? `:${port}` : ''}`;
        }
    }
    return devUrl;
};
