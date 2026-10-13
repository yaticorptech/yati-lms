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

const avatarPath = (value) => {
    if (value.startsWith('/avatars/')) return value;
    try {
        const url = new URL(value);
        if (/^https?:$/.test(url.protocol) && url.pathname.startsWith('/avatars/')) return url.pathname;
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
