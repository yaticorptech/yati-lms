/**
 * The address a profile picture is shown from.
 *
 * A preset avatar is saved as a link to the student website's own address
 * (`https://<site>/avatars/boys/3.jpg`). Inside the app that site may be
 * unreachable — and the very same files travel in the app's bundle — so a
 * bundled avatar is shown from its path. Uploaded photos are Cloudinary
 * links and are left alone, as is anything unparseable.
 */
/** The ready-made avatars the app carries (public/avatars/<group>/<n>.jpg); PhotoPicker offers exactly these. */
export const AVATAR_COUNTS = { boys: 6, girls: 6, kids: 6, elders: 9 };

/**
 * An avatar the app does not carry — saved from an older, larger set
 * (girls/7, boys/8 on 2026-10-14) — is shown as one it does, the same one
 * every time, rather than as a broken image.
 */
const carried = (path) => {
    const m = path.match(/^\/avatars\/(boys|girls|kids|elders)\/(\d+)\.(?:jpe?g|png|webp)$/i);
    if (!m) return path;
    const group = m[1].toLowerCase();
    const count = AVATAR_COUNTS[group];
    const n = Number(m[2]);
    if (n >= 1 && n <= count) return path;
    return `/avatars/${group}/${((Math.max(1, n) - 1) % count) + 1}.jpg`;
};

export function pictureUrl(value) {
    if (!value || typeof value !== 'string') return value || '';
    if (value.startsWith('/avatars/')) return carried(value);
    try {
        const url = new URL(value);
        if (/^https?:$/.test(url.protocol) && url.pathname.startsWith('/avatars/')) return carried(url.pathname);
    } catch {
        // relative or odd: shown as given
    }
    return value;
}
