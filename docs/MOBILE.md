# The iOS and Android apps

> This replaces the earlier note about a React Native / Expo app in a
> `yaticorp-lms-mobile` folder; that folder is not part of this repository.
> The apps described here are built from the two web apps themselves.

The LMS ships as one native app, built with
[Capacitor](https://capacitorjs.com): the student site is the app, and the
admin site travels inside the same bundle under `/admin/`, reached from the
"Admin sign in" link on the app's sign-in screen (and back again from the
admin's). The same React code as the websites, in a native shell with a real
store listing and native access to the microphone, camera, files and the
system browser. A change to either website is a change to the app, taken
across with one command.

| App | Built from | Bundle / package id | Native projects |
|---|---|---|---|
| Yaticorp LMS | `yaticorp-lms-student` (+ `yaticorp-lms-admin` under `/admin/`) | `com.yaticorp.lms` | `yaticorp-lms-student/ios/`, `yaticorp-lms-student/android/` |

The server does not become an app. The app calls the public API over HTTPS,
exactly as the websites do.

## 1. One-time setup on a Mac

Install, in this order:

1. **Xcode** from the Mac App Store (iOS). Open it once and accept the
   licence, then in a terminal: `sudo xcode-select -s /Applications/Xcode.app`.
2. **Android Studio** from developer.android.com (Android). On first launch
   let its setup wizard install the Android SDK, platform tools and an
   emulator image. It bundles the Java runtime the builds need.
3. In each app folder: `npm install`.

CocoaPods is not needed: the iOS projects use Swift Package Manager.

## 2. Point the apps at the live backend

A phone cannot reach `localhost`. Each app reads its API base from
`.env.mobile` when built for the app:

```
yaticorp-lms-student/.env.mobile   VITE_API_URL=https://<api host>/api
yaticorp-lms-admin/.env.mobile     VITE_API_URL=https://<api host>/api
                                   VITE_STUDENT_URL=https://<student site>
```

`.env.mobile` is git-ignored, like every `.env` file. Each of the two web
app folders has a committed `.env.mobile.example` with placeholders: copy
each to `.env.mobile` and put the real hosts in before the first build. The API already allows the app origins (`capacitor://localhost` on
iOS, `https://localhost` on Android) in its CORS rule, so nothing changes on
the server per app.

## 2a. Testing against the API on your own Mac

For a quick test on a phone on the same Wi-Fi, `.env.mobile` can point at
the API running on your Mac, for example `http://192.168.0.193:5000/api`.
That is plain http, which Android blocks from the app's https pages unless
two settings in `capacitor.config.json` allow it:

```
"server":  { "androidScheme": "https", "cleartext": true },
"android": { "allowMixedContent": true }
```

Without the second, the app reports "could not reach the server" although
the API is up. Remove both for store builds, which talk https.

## 3. Build the web app and hand it to the native projects

In `yaticorp-lms-student`:

```
npm run cap:sync
```

This builds the student site, then the admin site into `dist/admin/`, each
with its own `.env.mobile`, and copies the whole bundle into both native
projects. Run it after every change you want in the app.

## 4. Run on a simulator or a phone

```
npm run cap:ios        # opens the project in Xcode
npm run cap:android    # opens the project in Android Studio
```

Xcode: pick a simulator or your plugged-in iPhone at the top and press Run.
The first run on a real iPhone needs a signing team: Xcode → the `App`
target → Signing & Capabilities → Team. Android Studio: pick an emulator or
your plugged-in phone (with USB debugging on) and press Run.

## 5. Icons and splash screens

The icons and splash screens were generated from the mascot and the
wordmark with `@capacitor/assets`. To change them, replace the files in
`resources/` (`icon.png` 1024×1024, `icon-foreground.png`,
`icon-background.png`, `splash.png` 2732×2732, `splash-dark.png`) and run:

```
npm run cap:assets
```

## 6. Publishing

**Apple App Store**: an Apple Developer account, then in Xcode: Product →
Archive → Distribute App. App Store Connect needs screenshots, a privacy
policy URL (the site's `/privacy` page) and, because the student app records
the microphone and uses the camera, the reasons already written into
`Info.plist`.

**Google Play**: a Google Play Console account. In Android Studio: Build →
Generate Signed Bundle (an `.aab`). Create the upload keystore when asked
and keep it safe; the same keystore signs every future update. Play will ask
about the microphone and camera permissions the manifest declares.

Versions: bump `version`/`build` in Xcode and `versionCode`/`versionName`
in `android/app/build.gradle` for each release.

## What behaves differently inside the app

- **Downloads** (certificates, the ATS resume, the Learning Bio PDF, badge
  images, the admin's CSV and Excel exports) open the system share sheet,
  where the file can be saved to Files, Drive, mail or AirDrop. A web view
  cannot download on its own.
- **Links to the outside web** (Apply, scholarship portals, previews) open
  in the system browser sheet and return to the app when closed.
- **Connecting Google Calendar** opens Google's sign-in in the system
  browser, because Google refuses to sign in inside an app's web view. The
  connection is saved on the server and the card refreshes when the student
  returns to the app. There is no Google *login* for the LMS itself, so no
  OAuth client ids are needed for the apps.
- **Mock interview speech**: web views have neither the browser's voice nor
  its speech recognition, so in the app the phone's own text-to-speech reads
  the questions and the phone's own recognition hears the answers (two
  Capacitor community plugins). Android asks for the microphone the first
  time; the typed-answer path remains for phones without a recognition
  service.
- **The recogniser plugin is vendored** in `yaticorp-lms-student/native-plugins/speech-recognition`
  (package.json points at it with `file:`), with small changes to its Android
  code: an error after listening starts is reported to the page as a
  `listeningState` event carrying `error` and the numeric `code`, where the
  published plugin drops it; the error codes Android 13 added have names; and
  each start forgets the last transcript, so a repeated answer is not dropped
  as a duplicate. Commit that folder with the app. If speaking or listening
  fails in the app, the interview screen says why in its amber note, and the
  voice log under the mic button (share it with the button there) shows every
  step with its timing and the recogniser's error code.
- **Profile pictures**: a preset avatar is saved as a link to the website's
  address; the app shows it from its own bundle, where the same files are.
- **The screen**: the web view sits between the status bar and the
  navigation bar (`android.insetsHandling: "native"`), with the header's
  navy behind both, so nothing sits under the system bars.
- **Android's back button** goes back through the app's own screens and
  leaves the app from the first one.
- **The Career Path mascot and the lesson-page mascot** work as on the
  website; on phones the mascot keeps to its corner.

## Updating the app after a website change

```
npm run cap:sync
```

then build and upload a new version from Xcode and Android Studio. The
native projects rarely change; the web bundle inside them does.
