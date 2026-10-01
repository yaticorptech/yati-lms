/**
 * The address a profile picture is shown from.
 *
 * A preset avatar is saved as a link to the student website's own address
 * (`https://<site>/avatars/boys/3.jpg`). Inside the app that site may be
 * unreachable — and the very same files travel in the app's bundle — so a
 * bundled avatar is shown from its path. Uploaded photos are Cloudinary
 * links and are left alone, as is anything unparseable.
 */
export function pictureUrl(value) {
    if (!value || typeof value !== 'string') return value || '';
    if (value.startsWith('/avatars/')) return value;
    try {
        const url = new URL(value);
        if (/^https?:$/.test(url.protocol) && url.pathname.startsWith('/avatars/')) return url.pathname;
    } catch {
        // relative or odd: shown as given
    }
    return value;
}
