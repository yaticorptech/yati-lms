/**
 * Before an upload (2026-11-02): files a student uploads — certificates, 360
 * proofs, their resume, Extra-curricular proofs — are kept only in their own
 * Google Drive, so the upload waits until Drive is linked. On a server without
 * Google sign-in set up there is nothing to link and the upload goes ahead
 * (the server then keeps it as before).
 */
import { getSnapshot, refresh, requestConsent } from './googleStore';

/** The server refused an upload because Drive is not linked (409 DRIVE_REQUIRED). */
export const isDriveRequired = (err) => err?.response?.status === 409 && err?.response?.data?.code === 'DRIVE_REQUIRED';

/**
 * True when the upload may go ahead. Otherwise it opens the link-Drive popup
 * (Continue goes to Google, and back here) and answers false: no upload.
 */
export async function ensureDriveLinked(reason) {
  let state = getSnapshot();
  if (!state.loaded) state = await refresh();
  if (!state.available) return true;
  if (state.connected && !state.needsReconnect) return true;
  await requestConsent(reason, { required: true });
  return false;
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
