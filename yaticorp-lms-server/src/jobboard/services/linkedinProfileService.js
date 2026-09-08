/** LinkedIn profile URL: format check and normalisation. Status ADDED, method 'format' — ownership is not proven; an OAuth provider can replace this later. */
const HANDLE = '[A-Za-z0-9\\-_%.]{3,100}';
const PROFILE = new RegExp(`^(?:https?:\\/\\/)?(?:[a-z]{2,3}\\.)?linkedin\\.com\\/(?:mwlite\\/)?(in|pub)\\/(${HANDLE})(?:\\/[A-Za-z0-9\\/]*)?\\/?(?:[?#].*)?$`, 'i');
const validateProfileUrl = (raw) => {
    const text = String(raw || '').trim();
    if (!text) return { ok: false, code: 'EMPTY', message: 'Enter your LinkedIn profile URL.' };
    if (text.length > 300 || /\s/.test(text)) return { ok: false, code: 'INVALID_URL', message: 'Please enter a valid LinkedIn profile URL.' };
    if (/^(?:https?:\/\/)?(?:www\.)?[a-z0-9.-]+\.[a-z]{2,}/i.test(text) && !/linkedin\.com/i.test(text)) return { ok: false, code: 'NOT_LINKEDIN', message: 'That is not a LinkedIn URL. It should look like linkedin.com/in/your-name.' };
    const m = text.match(PROFILE);
    if (!m) return { ok: false, code: 'NOT_PROFILE', message: 'Please enter a valid LinkedIn profile URL, like linkedin.com/in/your-name.' };
    const handle = m[2].replace(/\.+$/, '');
    if (handle.length < 3) return { ok: false, code: 'NOT_PROFILE', message: 'Please enter a valid LinkedIn profile URL.' };
    return { ok: true, profileUrl: `https://www.linkedin.com/in/${handle}`, handle };
};
const validateProfile = async (raw) => { const r = validateProfileUrl(raw); return r.ok ? { ok: true, profileUrl: r.profileUrl, handle: r.handle, method: 'format' } : r; };
module.exports = { validateProfileUrl, validateProfile };
