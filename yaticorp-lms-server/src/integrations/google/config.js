/**
 * What this integration is allowed to touch, and why.
 *
 * The scopes are deliberately the narrowest Google offers for the job, and
 * that is a privacy decision rather than a technical one:
 *
 *   drive.file            Only files this application itself creates. It
 *                         cannot read, list or touch anything else in the
 *                         student's Drive. Not a restricted scope, so it
 *                         needs no security assessment.
 *
 *   openid, email         So the settings screen can say which account is
 *                         linked. Nothing else.
 *
 * Widening this would mean asking a student to hand over their whole Drive to
 * keep a copy of their own certificate, which is not a trade worth offering.
 */
const SCOPES = ['openid', 'email', 'https://www.googleapis.com/auth/drive.file'];

/** What each permission is for, in the words the student is shown. */
const PERMISSIONS = [
  {
    key: 'drive',
    scope: 'https://www.googleapis.com/auth/drive.file',
    title: 'Save your documents to your Drive',
    why:
      'Certificates you earn here, certificates you upload, your resume and your learning bio ' +
      'are copied into one folder in your Google Drive, so they outlive your account on this site.',
    limit: 'We can only see files this site puts there. The rest of your Drive stays private to you.'
  },
  {
    key: 'identity',
    scope: 'openid email',
    title: 'Know which account you connected',
    why: 'So this page can show you which Google account is linked, and you can tell if it is the wrong one.',
    limit: 'Your email address, and nothing else about your Google profile.'
  }
];

const FOLDER_NAME = 'YATICORP Learning';

const clientId = () => process.env.GOOGLE_CLIENT_ID || '';
const clientSecret = () => process.env.GOOGLE_CLIENT_SECRET || '';
const redirectUri = () =>
  process.env.GOOGLE_REDIRECT_URI || `${process.env.PUBLIC_API_URL || ''}/api/integrations/google/callback`;

/** Whether an administrator has actually set this up. */
const isConfigured = () => Boolean(clientId() && clientSecret() && redirectUri());

module.exports = {
  SCOPES,
  PERMISSIONS,
  FOLDER_NAME,
  clientId,
  clientSecret,
  redirectUri,
  isConfigured
};
