/**
 * A student's profile picture, or what stands in for it.
 *
 * Shown through pictureUrl (native/pictures.js), which finds the app's own
 * copy of a ready-made avatar however its link was saved. When the picture
 * still cannot be loaded — an uploaded photo that was deleted from the CDN, a
 * placeholder site that is down — the browser's broken-image icon used to sit
 * in the circle (in the leaderboard, the header, the profile). Now the
 * `fallback` the caller would show for a student with no picture at all (their
 * initials, in that place's own style) is shown instead.
 */
import { useState } from 'react';
import { pictureUrl } from '../native/pictures';

export default function ProfileImage({ src, alt = '', className = '', fallback = null }) {
    const url = src ? pictureUrl(src) : '';
    // Which address failed, so a new picture (or a new student) is tried afresh.
    const [failed, setFailed] = useState('');
    if (!url || failed === url) return fallback;
    return <img src={url} alt={alt} className={className} onError={() => setFailed(url)} />;
}
