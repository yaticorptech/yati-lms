/**
 * The endpoints behind "connect your Google account".
 *
 * Two rules run through all of it. Nothing here ever returns a token to the
 * browser, and nothing here does anything to a student's Google account that
 * they have not been shown in plain words first — see PERMISSIONS in config.js,
 * which is what the consent screen renders.
 */
const jwt = require('jsonwebtoken');
const GoogleLink = require('./models/GoogleLink');
const { PERMISSIONS, FOLDER_NAME, CALENDAR_NAME, CALENDAR_SCOPE, isConfigured } = require('./config');
const { consentUrl, exchangeCode, saveLink, disconnect } = require('./oauth');
const { saveFile } = require('./drive');
const { deleteCalendar } = require('./calendar');

/** Ten minutes is plenty to click through a consent screen. */
const STATE_TTL = '10m';
const appUrl = () => process.env.PUBLIC_APP_URL || process.env.CLIENT_URL || '';

/**
 * Where the consent flow puts the student back.
 *
 * The page they connected from — the Calendar or My Profile both offer it —
 * carried through Google inside the signed state. The Calendar is the fallback
 * for an older client that sends none.
 */
const RETURN_TO = '/career/calendar';

/**
 * A path inside the student app, and only that: one leading slash (never two,
 * which a browser reads as another host), plain path characters, no query.
 * It is appended to the app's own URL in any case, so this keeps the redirect
 * on our site even if the check were wrong.
 */
const SAFE_RETURN = /^\/(?!\/)[A-Za-z0-9/_-]{0,80}$/;
const returnPath = (value) => (typeof value === 'string' && SAFE_RETURN.test(value) ? value : RETURN_TO);

const fail = (res, error, what) => {
  console.error(`[google] ${what}:`, error);
  res.status(error.status === 401 ? 401 : 500).json({ message: `Could not ${what}` });
};

// @route GET /api/integrations/google/status
const getStatus = async (req, res) => {
  try {
    const link = await GoogleLink.findOne({ userId: req.user._id }).lean();
    res.json({
      // Whether an administrator has set the integration up at all. The UI
      // hides the whole feature rather than offering a button that cannot work.
      available: isConfigured(),
      connected: Boolean(link) && !link.needsReconnect,
      needsReconnect: Boolean(link?.needsReconnect),
      email: link?.email || '',
      connectedAt: link?.connectedAt || null,
      folderName: FOLDER_NAME,
      calendarName: CALENDAR_NAME,
      // Students who linked before calendar sync existed granted Drive only.
      // Their link still works; it just cannot write a calendar until they
      // connect again, and the card has to be able to say so.
      calendarConnected: Boolean(link) && !link.needsReconnect && (link.scopes || []).includes(CALENDAR_SCOPE),
      // The consent screen is rendered from this, so what a student is told
      // and what is actually requested can never drift apart.
      permissions: PERMISSIONS
    });
  } catch (error) {
    fail(res, error, 'check your Google connection');
  }
};

// @route POST /api/integrations/google/connect
const beginConnect = async (req, res) => {
  try {
    if (!isConfigured()) {
      return res.status(503).json({ message: 'Google is not set up on this server yet.' });
    }
    // The redirect comes back without a session, so the state carries who
    // started it. Signed and short-lived, so it cannot be forged or replayed.
    const state = jwt.sign(
      { uid: String(req.user._id), rt: returnPath(req.body?.returnTo) },
      process.env.JWT_SECRET,
      { expiresIn: STATE_TTL }
    );
    res.json({ url: consentUrl(state) });
  } catch (error) {
    fail(res, error, 'start the Google connection');
  }
};

// @route GET /api/integrations/google/callback
// Google sends the student's browser here. No session, so trust only `state`.
const handleCallback = async (req, res) => {
  // Where to send them is read from the state when it verifies; a denied or
  // expired consent still has an unverified state worth honouring for the
  // path alone, since it is re-checked against SAFE_RETURN either way.
  let to = RETURN_TO;
  const back = (status) => res.redirect(`${appUrl()}${to}?google=${status}`);

  try {
    const { code, state } = req.query;
    if (state) to = returnPath(jwt.decode(String(state))?.rt);
    if (req.query.error) return back('denied');
    if (!code || !state) return back('failed');

    let uid;
    try {
      ({ uid } = jwt.verify(state, process.env.JWT_SECRET));
    } catch {
      return back('expired');
    }

    const tokens = await exchangeCode(code);
    await saveLink(uid, tokens);
    return back('connected');
  } catch (error) {
    console.error('[google] callback:', error);
    return back('failed');
  }
};

// @route POST /api/integrations/google/disconnect
const endConnection = async (req, res) => {
  try {
    // The calendar goes first: it is ours to clean up, it is only a mirror of
    // events they still have here, and once the grant below is revoked there
    // is no longer a token to remove it with. A failure is not fatal — losing
    // the account link is the part the student asked for.
    await deleteCalendar(req.user._id).catch((error) =>
      console.error('[google] could not remove the calendar on disconnect:', error.message)
    );

    // Handed back to Google as well as dropped here, so "disconnect" means
    // what the student thinks it means.
    await disconnect(req.user._id);
    res.json({ ok: true });
  } catch (error) {
    fail(res, error, 'disconnect your Google account');
  }
};

/** Ten megabytes. A certificate or a resume is a fraction of this. */
const MAX_BYTES = 10 * 1024 * 1024;
const SAFE_NAME = /^[\w\-. ()]{1,120}$/;

// @route POST /api/integrations/google/drive/save
// { name, mimeType, dataBase64, description }
const saveToDrive = async (req, res) => {
  try {
    const { name, mimeType, dataBase64, description } = req.body || {};
    if (!name || !SAFE_NAME.test(name)) return res.status(400).json({ message: 'That file name is not allowed.' });
    if (!mimeType || !dataBase64) return res.status(400).json({ message: 'Nothing to save.' });

    const content = Buffer.from(String(dataBase64), 'base64');
    if (content.length === 0) return res.status(400).json({ message: 'That file is empty.' });
    if (content.length > MAX_BYTES) return res.status(413).json({ message: 'That file is larger than 10 MB.' });

    const result = await saveFile(req.user._id, { name, mimeType, content, description });
    if (!result.ok) return res.status(409).json({ message: 'Connect your Google account first.', reason: result.reason });
    res.json(result);
  } catch (error) {
    fail(res, error, 'save that to your Drive');
  }
};

module.exports = { getStatus, beginConnect, handleCallback, endConnection, saveToDrive };
