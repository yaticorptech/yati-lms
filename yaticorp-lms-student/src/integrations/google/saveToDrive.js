/**
 * Save one file this site produced into the student's own Drive.
 *
 * The one call every download point uses. It handles the whole path: if the
 * account is not connected it raises the consent screen, explains why this
 * particular file wants saving, and only then uploads.
 *
 * Returns { ok, reason } rather than throwing, because a download should never
 * fail on account of a copy that could not be filed.
 */
import { saveFile } from './api';
import { getSnapshot, refresh, requestConsent } from './googleStore';

const toBase64 = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read that file'));
    reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
    reader.readAsDataURL(blob);
  });

/** Trim a name to what the server will accept, keeping it recognisable. */
const tidyName = (name) => String(name).replace(/[^\w\-. ()]+/g, '_').slice(0, 120) || 'file';

export default async function saveToDrive(blob, { name, description = '', reason = '', ask = true } = {}) {
  let state = getSnapshot();
  if (!state.loaded) state = await refresh();

  // Not set up on this server: the feature does not exist for this student.
  if (!state.available) return { ok: false, reason: 'unavailable' };

  if (!state.connected) {
    // Consent leaves the page for Google's screen. That is fine when the
    // student just pressed Download and is standing still, and destructive
    // halfway through a verification wizard or a job application — those call
    // sites pass ask:false and simply file no copy rather than losing the
    // student's place. They can connect later and the next file will land.
    if (!ask) return { ok: false, reason: 'not-connected' };

    const granted = await requestConsent(reason);
    // Consent leaves the page for Google's screen, so this resolves false and
    // the download itself carries on regardless.
    if (!granted) return { ok: false, reason: 'declined' };
    state = await refresh(true);
    if (!state.connected) return { ok: false, reason: 'declined' };
  }

  try {
    const dataBase64 = await toBase64(blob);
    const saved = await saveFile({
      name: tidyName(name),
      mimeType: blob.type || 'application/octet-stream',
      dataBase64,
      description
    });
    return { ok: true, ...saved };
  } catch (error) {
    return { ok: false, reason: error?.response?.data?.message || 'failed' };
  }
}
