/**
 * Before an upload (2026-11-02): files a student uploads — certificates, 360
 * proofs, their resume, Extra-curricular proofs — are kept only in their own
 * Google Drive, so the upload waits until Drive is linked. On a server without
 * Google sign-in set up there is nothing to link and the upload goes ahead
 * (the server then keeps it as before).
 */
import { getSnapshot, refresh, requestConsent } from './googleStore';
import saveToDrive from './saveToDrive';
import { saveBlob } from '../../native/saveFile';

/** Why a download asks for Drive, unless the page says something more particular. */
export const DOWNLOAD_DRIVE_REASON = 'Files you download are kept in your own Google Drive.';

/** The server refused an upload because Drive is not linked (409 DRIVE_REQUIRED). */
// Also an error a page's own api module has already unwrapped into { code }.
export const isDriveRequired = (err) => (err?.response?.status === 409 && err?.response?.data?.code === 'DRIVE_REQUIRED') || (err?.code === 'DRIVE_REQUIRED' && !err?.response);

/**
 * True when the upload may go ahead. Otherwise it opens the link-Drive popup
 * (Continue goes to Google, and back here) and answers false: no upload.
 */
export async function ensureDriveLinked(reason) {
  let state = getSnapshot();
  if (!state.loaded) state = await refresh();
  if (!state.available) return true;
  // A developer card keeps its uploads on our storage: nothing to link.
  if (state.driveNeeded === false) return true;
  if (state.connected && !state.needsReconnect) return true;
  await requestConsent(reason, { required: true });
  return false;
}

/**
 * Every download (2026-11-05): certificates, badges, the learning bio, the
 * resume, course PDFs. Not linked → the link-Drive popup and no download.
 * Linked → the file comes down to the device and a copy goes to their Drive.
 * Call ensureDriveLinked at the start of a download too, before anything is
 * made or charged; this checks again and keeps the two in step.
 * True when the file was handed over.
 */
export async function downloadWithDrive(blob, fileName, { title, description = '', reason = DOWNLOAD_DRIVE_REASON } = {}) {
  if (!(await ensureDriveLinked(reason))) return false;
  await saveBlob(blob, fileName, { title });
  saveToDrive(blob, { name: fileName, description, reason, ask: false });
  return true;
}

/** Ask to link Drive now (the server said it is not linked, whatever this page last knew). */
export function askToLinkDrive(reason) {
  refresh(true).catch(() => {});
  return requestConsent(reason, { required: true });
}

/** After a refused upload: ask to link Drive. True if it was that refusal. */
export function askIfDriveRequired(err, reason) {
  if (!isDriveRequired(err)) return false;
  refresh(true).catch(() => {});
  requestConsent(reason, { required: true });
  return true;
}
