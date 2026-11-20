/** Dates as a parent reads them (2026-11-19). */
/** "today", "yesterday", "3 days ago", or the date. */
export const ago = (when) => {
    if (!when) return '';
    const d = new Date(when);
    const days = Math.floor((new Date().setHours(0, 0, 0, 0) - new Date(d).setHours(0, 0, 0, 0)) / 864e5);
    if (days <= 0) return 'today';
    if (days === 1) return 'yesterday';
    if (days < 7) return `${days} days ago`;
    return `on ${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: d.getFullYear() === new Date().getFullYear() ? undefined : 'numeric' })}`;
};
export const dateOf = (when) => (when ? new Date(when).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '');
