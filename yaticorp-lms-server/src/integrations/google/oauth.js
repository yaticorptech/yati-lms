/**
 * The OAuth dance with Google, in plain fetch.
 *
 * No SDK: the official googleapis package is tens of megabytes for what is
 * three HTTP calls, and a dependency that large in a server that only needs
 * to swap a code for a token is not worth its weight.
 */
const { seal, open } = require('../../jobboard/utils/secretBox');
const GoogleLink = require('./models/GoogleLink');
const { SCOPES, clientId, clientSecret, redirectUri, isConfigured } = require('./config');
const { fireDisconnect } = require('./hooks');

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const REVOKE_URL = 'https://oauth2.googleapis.com/revoke';
const USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo';

/** Where to send the student to grant consent. */
const consentUrl = (state) => {
  const p = new URLSearchParams({
    client_id: clientId(),
    redirect_uri: redirectUri(),
    response_type: 'code',
    scope: SCOPES.join(' '),
    // We need to act while the student is not at their keyboard, which is what
    // a refresh token is for; consent forces Google to actually issue one.
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
    state
  });
  return `${AUTH_URL}?${p.toString()}`;
};

const postForm = async (url, body) => {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(body).toString()
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error_description || data.error || `Google refused the request (${res.status})`);
    err.status = res.status;
    err.googleError = data.error;
    throw err;
  }
  return data;
};

/** Swap the one-time code from the redirect for tokens. */
const exchangeCode = (code) =>
  postForm(TOKEN_URL, {
    code,
    client_id: clientId(),
    client_secret: clientSecret(),
    redirect_uri: redirectUri(),
    grant_type: 'authorization_code'
  });

const whoAmI = async (accessToken) => {
  const res = await fetch(USERINFO_URL, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) return {};
  return res.json().catch(() => ({}));
};

/** Store, or update, one student's link. The refresh token is sealed. */
const saveLink = async (userId, tokens) => {
  const profile = tokens.access_token ? await whoAmI(tokens.access_token) : {};
  const patch = {
    userId,
    email: profile.email || '',
    accessToken: seal(tokens.access_token || ''),
    accessExpiresAt: tokens.expires_in ? new Date(Date.now() + (tokens.expires_in - 60) * 1000) : null,
    scopes: (tokens.scope || '').split(' ').filter(Boolean),
    needsReconnect: false,
    connectedAt: new Date()
  };
  // Google only returns a refresh token on first consent; never wipe the one
  // we have because a later grant did not repeat it.
  if (tokens.refresh_token) patch.refreshToken = seal(tokens.refresh_token);

  await GoogleLink.findOneAndUpdate({ userId }, patch, { upsert: true, new: true, setDefaultsOnInsert: true });
};

/**
 * A usable access token for this student, refreshing if the old one expired.
 * Returns null when there is no link, or when Google has stopped honouring
 * our refresh token and the student has to connect again.
 */
const accessTokenFor = async (userId) => {
  if (!isConfigured()) return null;
  const link = await GoogleLink.findOne({ userId }).select('+refreshToken +accessToken').lean();
  if (!link || link.needsReconnect) return null;

  const current = open(link.accessToken);
  if (current && link.accessExpiresAt && new Date(link.accessExpiresAt) > new Date()) return current;

  const refresh = open(link.refreshToken);
  if (!refresh) {
    await GoogleLink.updateOne({ userId }, { needsReconnect: true });
    return null;
  }

  try {
    const fresh = await postForm(TOKEN_URL, {
      refresh_token: refresh,
      client_id: clientId(),
      client_secret: clientSecret(),
      grant_type: 'refresh_token'
    });
    await GoogleLink.updateOne(
      { userId },
      {
        accessToken: seal(fresh.access_token),
        accessExpiresAt: new Date(Date.now() + ((fresh.expires_in || 3600) - 60) * 1000),
        needsReconnect: false
      }
    );
    return fresh.access_token;
  } catch (error) {
    // A revoked or expired grant is not a server fault; it is the student
    // having disconnected us at Google's end, and they must be told.
    if (error.googleError === 'invalid_grant') {
      await GoogleLink.updateOne({ userId }, { needsReconnect: true });
      return null;
    }
    throw error;
  }
};

/** Hand the grant back to Google, then forget it here. */
const disconnect = async (userId) => {
  const link = await GoogleLink.findOne({ userId }).select('+refreshToken').lean();
  const token = link && open(link.refreshToken);
  if (token) {
    // Best effort: if Google is unreachable we still drop our copy.
    await fetch(`${REVOKE_URL}?token=${encodeURIComponent(token)}`, { method: 'POST' }).catch(() => {});
  }
  await GoogleLink.deleteOne({ userId });
  // Anything mirrored into the account they just took back is now pointing at
  // something they no longer own. Whoever put it there gets to clear it.
  await fireDisconnect(userId);
};

module.exports = { consentUrl, exchangeCode, saveLink, accessTokenFor, disconnect };
