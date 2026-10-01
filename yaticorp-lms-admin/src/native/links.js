/**
 * Which links leave the app. Pure, so the test runner can check it without a
 * browser: the shell opens these in the system browser sheet instead of
 * navigating the app's own web view away from the app.
 */
export function isExternalLink(href, origin) {
    if (!href) return false;
    let url;
    try {
        url = new URL(href, origin);
    } catch {
        return false;
    }
    if (!/^https?:$/.test(url.protocol)) return false;
    // Inside the shell the app's own origin is capacitor://localhost or
    // https://localhost; anything else on http(s) is the outside web.
    return url.origin !== origin;
}

/** A safe file name for something saved to the device. */
export const safeFileName = (name, fallback = 'download') => {
    const cleaned = String(name || '').replace(/[\\/:*?"<>|]+/g, '_').trim();
    return cleaned || fallback;
};
