/* ── The old address ──────────────────────────────────────────────────── */

/**
 * /competitions?tab=… was one page of six tabs until 2026-11-04; each is a page of its own now (hub/). Links and
 * pop-ups across the app still say ?tab=: they land on the page that took the tab's place, its other options kept.
 */
const TAB_PAGES = { games: '/competitions', competitions: '/competitions/open', mine: '/competitions/teams', leaderboard: '/competitions/leaderboard', results: '/competitions/results', history: '/competitions/results?show=certificates' };
export const pageForTab = (search) => {
    const params = new URLSearchParams(search);
    const to = TAB_PAGES[params.get('tab')];
    if (!to) return null;
    params.delete('tab');
    const rest = params.toString();
    return rest ? `${to}${to.includes('?') ? '&' : '?'}${rest}` : to;
};
