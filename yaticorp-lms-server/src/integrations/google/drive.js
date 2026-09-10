/**
 * Putting this site's documents into the student's own Drive.
 *
 * Everything lands in one folder the app creates. Because the grant is
 * `drive.file`, this code physically cannot see or touch anything else the
 * student keeps there, which is the point.
 */
const GoogleLink = require('./models/GoogleLink');
const { FOLDER_NAME } = require('./config');
const { accessTokenFor } = require('./oauth');

const FILES = 'https://www.googleapis.com/drive/v3/files';
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3/files';

const call = async (url, token, init = {}) => {
  const res = await fetch(url, { ...init, headers: { Authorization: `Bearer ${token}`, ...(init.headers || {}) } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error?.message || `Google Drive refused the request (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
};

/**
 * The app's folder, made once and remembered. If the student deleted it we
 * make it again rather than failing: their Drive is theirs to tidy.
 */
const ensureFolder = async (userId, token) => {
  const link = await GoogleLink.findOne({ userId }).lean();
  if (link?.driveFolderId) {
    const still = await fetch(`${FILES}/${link.driveFolderId}?fields=id,trashed`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null);
    if (still && !still.trashed) return link.driveFolderId;
  }

  const folder = await call(`${FILES}?fields=id`, token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: FOLDER_NAME, mimeType: 'application/vnd.google-apps.folder' })
  });
  await GoogleLink.updateOne({ userId }, { driveFolderId: folder.id });
  return folder.id;
};

/**
 * Upload one file. `content` is a Buffer.
 *
 * Multipart is built by hand because the body mixes JSON metadata with raw
 * bytes, and the tidy alternatives all arrive with a very large dependency.
 */
const saveFile = async (userId, { name, mimeType, content, description = '' }) => {
  const token = await accessTokenFor(userId);
  if (!token) return { ok: false, reason: 'not-connected' };

  const folderId = await ensureFolder(userId, token);
  const boundary = `yati${Date.now().toString(36)}`;
  const metadata = JSON.stringify({ name, parents: [folderId], description });

  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n`),
    Buffer.from(`--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`),
    Buffer.isBuffer(content) ? content : Buffer.from(content),
    Buffer.from(`\r\n--${boundary}--\r\n`)
  ]);

  const file = await call(`${UPLOAD}?uploadType=multipart&fields=id,name,webViewLink`, token, {
    method: 'POST',
    headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
    body
  });
  return { ok: true, id: file.id, name: file.name, link: file.webViewLink, folderId };
};

module.exports = { saveFile, ensureFolder };
