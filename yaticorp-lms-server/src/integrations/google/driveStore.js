/**
 * Files a student uploads are kept in THEIR Google Drive, not here (2026-11-02):
 * certificates (My Certificates), 360 proofs, their resume, and Extra-curricular
 * proofs and award certificates. Each goes into the app's "YATICORP Learning"
 * folder, is shared "anyone with the link can view" — the link teachers and
 * organizations open to check it — and only that link is kept in our database.
 *
 * Not linked: the upload is refused with 409 DRIVE_REQUIRED and the app asks
 * the student to link Drive first (the user chose to block, not to keep a copy
 * here). On a server where Google sign-in is not set up at all the feature does
 * not exist, so `driveRequired()` is false and the caller keeps its old storage.
 * Files uploaded before stay where they are.
 */
// Looked up at call time (not destructured), so the tests can stand a pretend Drive in (tests/helpers.js fakeDrive).
const config = require('./config');
const oauth = require('./oauth');
const drive = require('./drive');

const MESSAGE = 'Link your Google Drive first: the files you upload are saved in your own Drive.';

class DriveRequired extends Error {
  constructor(message = MESSAGE) { super(message); this.code = 'DRIVE_REQUIRED'; this.status = 409; }
}

/** Is Drive the store on this server? (Google sign-in set up.) */
const driveRequired = () => config.isConfigured();

/**
 * Developer cards (DEVICE_LIMIT_EXEMPT_CARDS in .env) keep their files on our
 * storage, not in a Drive (asked 2026-11-04): no Drive link is asked for.
 */
const isDriveExempt = async (userId) => {
  try {
    const user = await require('../../models/User').findById(userId).select('cardNumber').lean();
    return Boolean(user) && require('../../services/deviceGuard').isExemptCard(user.cardNumber);
  } catch { return false; }
};

/** Does this student's upload go to their Drive? */
const usesDrive = async (userId) => driveRequired() && !(await isDriveExempt(userId));

/** The student must have Drive linked; throws DriveRequired when not. True when Drive is the store. */
const assertDriveLinked = async (userId) => {
  if (!(await usesDrive(userId))) return false;
  const token = await oauth.accessTokenFor(userId).catch(() => null);
  if (!token) throw new DriveRequired();
  return true;
};

/** A picture of the file anyone with the link can load: images, and a PDF's first page. */
const previewUrlOf = (fileId, width = 1600) => `https://drive.google.com/thumbnail?id=${encodeURIComponent(fileId)}&sz=w${width}`;

/** Save into the student's Drive and share by link: { driveFileId, viewUrl, previewUrl }. */
const storeInDrive = async (userId, buffer, { name, mimeType, description = '' }) => {
  const saved = await drive.saveFile(userId, { name, mimeType, content: buffer, description });
  if (!saved.ok) throw new DriveRequired();
  const shared = await drive.shareByLink(userId, saved.id).catch(() => ({ ok: false }));
  if (!shared.ok) {
    await drive.removeFile(userId, saved.id);
    throw Object.assign(new Error('Google Drive did not let us share the file. Please try again.'), { status: 502 });
  }
  return { driveFileId: saved.id, viewUrl: saved.link || `https://drive.google.com/file/d/${saved.id}/view`, previewUrl: previewUrlOf(saved.id) };
};

/** Answer a refused upload: 409 with DRIVE_REQUIRED, which the app turns into the link-Drive popup. */
const sendDriveError = (res, error) => {
  // `error` too: the Jobs pages read that field.
  if (error instanceof DriveRequired || error?.code === 'DRIVE_REQUIRED') return res.status(409).json({ code: 'DRIVE_REQUIRED', message: error.message || MESSAGE, error: error.message || MESSAGE }), true;
  return false;
};

/** Express middleware for an upload route: refuse before anything else runs (a wallet charge, a parse). */
const requireDriveFor = async (req, res, next) => {
  try { await assertDriveLinked(req.user._id); next(); }
  catch (error) { if (!sendDriveError(res, error)) next(error); }
};

/** Stream a stored file back through our server (downloads, framing): nothing is kept. */
const sendFromDrive = async (res, userId, fileId, fileName = 'file') => {
  const file = await drive.readFile(userId, fileId);
  if (!file.ok) {
    if (file.reason === 'not-connected') return res.status(409).json({ code: 'DRIVE_REQUIRED', message: 'Link your Google Drive again to open this file.' });
    return res.status(404).json({ message: 'That file is no longer in your Google Drive.' });
  }
  res.setHeader('Content-Type', file.mimeType);
  res.setHeader('Content-Disposition', `inline; filename="${String(fileName).replace(/[^\w.\- ]+/g, '_')}"`);
  return res.send(file.buffer);
};

/** Remove one stored file from their Drive (the student deleted it here). Never throws. */
const removeFile = (userId, fileId) => drive.removeFile(userId, fileId).catch(() => ({ ok: false }));

module.exports = { DriveRequired, driveRequired, usesDrive, assertDriveLinked, storeInDrive, previewUrlOf, sendDriveError, requireDriveFor, sendFromDrive, removeFile };
