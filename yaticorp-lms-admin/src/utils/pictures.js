/**
 * Where a student's profile picture can be shown from, best first.
 *
 * A preset avatar is saved as a link to the student website as it was when
 * the student chose it — on a test server that is http://localhost:5173/
 * avatars/boys/3.jpg, which on a phone means the phone itself, so the picture
 * never arrived. The file is the student app's own (public/avatars), so:
 *
 *   - inside the app the admin panel lives beside the student app's files
 *     (https://localhost/admin/ next to https://localhost/), so the path
 *     alone finds the copy that travels in the app;
 *   - on the web, the student website this panel is set up with has it;
 *   - and the saved link itself is the last thing tried.
 *
 * An uploaded photo (a CDN link) is shown as saved. The student app does the
 * same for itself (yaticorp-lms-student/src/native/pictures.js).
 */
import { isNative } from '../native/platform';

/**
 * The ready-made avatars the student app carries (its public/avatars), and what
 * its own pictures.js does with one it does not: an avatar saved from an older,
 * larger set (girls/7, boys/8) is shown as one that exists, the same one every
 * time, rather than as a broken image. Kept in step with the student app's
 * AVATAR_COUNTS by hand — the two apps share no code.
 */
const AVATAR_COUNTS = { boys: 6, girls: 6, kids: 6, elders: 9 };
const carried = (path) => {
    const m = path.match(/^\/avatars\/(boys|girls|kids|elders)\/(\d+)\.(?:jpe?g|png|webp)$/i);
    if (!m) return path;
    const group = m[1].toLowerCase();
    const n = Number(m[2]);
    if (n >= 1 && n <= AVATAR_COUNTS[group]) return path;
    return `/avatars/${group}/${((Math.max(1, n) - 1) % AVATAR_COUNTS[group]) + 1}.jpg`;
};

const avatarPath = (value) => {
    if (value.startsWith('/avatars/')) return carried(value);
    try {
        const url = new URL(value);
        if (/^https?:$/.test(url.protocol) && url.pathname.startsWith('/avatars/')) return carried(url.pathname);
    } catch {
        // relative or odd: shown as given
    }
    return null;
};

export function pictureSources(value) {
    if (!value || typeof value !== 'string') return [];
    const path = avatarPath(value);
    if (!path) return [value];
    const site = (import.meta.env.VITE_STUDENT_URL || '').replace(/\/+$/, '');
    const sources = [];
    if (isNative()) sources.push(path);
    if (site) sources.push(`${site}${path}`);
    sources.push(value);
    return [...new Set(sources)];
}
