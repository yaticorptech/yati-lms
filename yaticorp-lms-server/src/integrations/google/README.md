# Connecting students' Google accounts

Off until three environment variables are set. Until then the endpoints answer
`available: false`, the settings card renders nothing, and every download
behaves exactly as it did before. Nothing half-works.

## What you have to create

None of this can be done from the codebase. It is all in the Google Cloud
Console, on an account you control.

1. **A project**, at <https://console.cloud.google.com>.
2. **The Google Drive API and the Google Calendar API enabled** on it. Both,
   in the *same* project as the OAuth client — credentials only work against
   APIs enabled in their own project.
3. **An OAuth consent screen**. Choose External unless every student has an
   account in your Google Workspace. Fill in the app name, the support email,
   your privacy policy URL and your terms URL — Google requires the last two
   before it will let anyone outside your test list consent.
4. **An OAuth 2.0 Client ID**, of type *Web application*, with these
   authorised redirect URIs:
   - `https://your-api-domain/api/integrations/google/callback`
   - `http://localhost:5000/api/integrations/google/callback` for development

## Environment variables

```
GOOGLE_CLIENT_ID=...apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=https://your-api-domain/api/integrations/google/callback
PUBLIC_APP_URL=https://your-student-app-domain     # where students are sent back to
```

`GOOGLE_REDIRECT_URI` may be omitted if `PUBLIC_API_URL` is set; it is derived
from it. It must match what you registered in the console character for
character, or Google refuses the exchange.

## About verification

The scopes here were chosen so that you very likely do **not** need a security
assessment. Google classifies both as non-sensitive:

- `drive.file` — only files this application creates.
- `calendar.app.created` — only calendars this application creates.

You will still go through Google's normal verification to remove the
"unverified app" warning for users outside your test list. Widening either one —
to `drive`, or to `calendar` / `calendar.events` — pulls the project into a
tier that needs review, and `drive` into a paid third-party security
assessment. Do not widen them without a reason worth that.

## What is stored here

One document per student in `google_links`. Alongside the tokens it remembers
`driveFolderId` and `calendarId` — the one folder and the one calendar this app
made, which are the only two things in the student's account it can touch.

Career Path calendar events keep a `googleEventId` pointing at their copy. That
is a mirror and never the record: the row in `career_calendar_events` is the
truth, and a Google write that fails is logged and retried on the next edit
rather than failing the student's save. The refresh token is sealed with
AES-256-GCM before it is written and is never returned by any endpoint. The
`.select('+refreshToken')` needed to read it appears in exactly two places, in
`oauth.js`.

Disconnecting revokes the grant at Google as well as deleting the row, so it
means what a student thinks it means.
