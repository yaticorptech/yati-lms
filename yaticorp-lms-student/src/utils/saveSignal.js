/**
 * Every save that succeeds says so on the window ('yati:saved', with the
 * request's url). The server pays XP for many saves the page itself never
 * mentions — a forum post or comment, a profile picture, an achievement, a
 * job application (xpOnSuccess pays once the answer has gone) — so anything
 * that has to follow XP wherever it was earned listens here instead of
 * relying on each page to announce it (RankUpWatcher, the leaderboard climb).
 * Used as a response interceptor on each of the app's API clients.
 */
export const onSaved = (response) => {
    const config = response?.config;
    if (config && (config.method || 'get').toLowerCase() !== 'get' && typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('yati:saved', { detail: { url: config.url || '' } }));
    }
    return response;
};
