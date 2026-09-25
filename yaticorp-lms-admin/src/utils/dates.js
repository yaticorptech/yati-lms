/**
 * Turning stored timestamps into the words an administrator reads.
 *
 * Plain functions in a plain module, deliberately not beside the shared
 * components: a file that exports components must export only components, or
 * fast refresh stops working for everything that imports it.
 */

/** "12 Mar 2026". An empty or unparseable value reads as a dash, never as
 *  "Invalid Date". */
export const formatDate = (value) => {
    if (!value) return '—';
    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? '—'
        : date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};

/**
 * "Today", "Yesterday", "3 days ago" — how an institution actually talks about
 * when a student was last seen.
 *
 * Counted in calendar days, not in elapsed hours, so something at 11pm last
 * night reads as "Yesterday" rather than "Today". Past a fortnight it gives the
 * date instead, because "23 days ago" is harder to read than the date itself.
 */
export const relativeDay = (value) => {
    if (!value) return 'Never';
    const then = new Date(value);
    if (Number.isNaN(then.getTime())) return 'Never';

    const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const days = Math.round((startOfDay(new Date()) - startOfDay(then)) / 86_400_000);

    if (days <= 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 14) return `${days} days ago`;
    return formatDate(value);
};
