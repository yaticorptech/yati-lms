# YATICORP LMS - Mobile App Documentation
> **Path:** `yaticorp-lms-mobile/`  
> **Framework:** React Native + Expo  
> **Role:** Student mobile learning app

---

## Overview

The mobile app gives students access to core LMS workflows on phone:

- login and authenticated session management
- dashboard and enrolled course access
- course player with lesson content rendering
- quiz attempts
- community browsing/post detail
- profile updates and password changes
- support tickets and certificates

---

## Navigation Architecture

Main navigation is defined in `App.js`:

- Root: `NavigationContainer`
- Unauthenticated stack:
  - `Login`
- Authenticated stack:
  - `Main` (bottom tabs)
  - `CoursePlayer`
  - `Quiz`
  - `PostDetail`
  - `EditProfile`
  - `ChangePassword`
  - `SupportTickets`
  - `Certificates`

Bottom tabs:

- `Home` -> `DashboardScreen`
- `Community` -> `CommunityListScreen`
- `Profile` -> `ProfileScreen`

---

## Folder Structure

```text
yaticorp-lms-mobile/
  App.js
  src/
    components/
    context/
    screens/
      LoginScreen.js
      DashboardScreen.js
      CoursePlayerScreen.js
      QuizScreen.js
      CommunityListScreen.js
      CommunityScreen.js
      ProfileScreen.js
      EditProfileScreen.js
      ChangePasswordScreen.js
      TicketListScreen.js
      CertificatesScreen.js
    shared/
    utils/
```

---

## API Integration

Current API clients exist in two places:

- `src/utils/api.js` (deployed backend URL configured)
- `src/shared/api/client.js` (fallback supports localhost)

For physical-device local testing, use your machine LAN IP (not plain `localhost`).

---

## Scripts

```bash
npm start
npm run android
npm run ios
npm run web
```

---

## Local Development Setup

1. Install dependencies:
   ```bash
   cd yaticorp-lms-mobile
   npm install
   ```
2. Run Expo:
   ```bash
   npm start
   ```
3. Open through Expo Go or emulator/simulator.

---

## Operational Notes

- Auth state is managed through `AuthProvider` and loaded before route selection.
- `CoursePlayerScreen` supports HTML lesson content, embedded docs/PDF, and video playback sources.
- Ensure backend CORS and endpoint availability when testing community, tickets, and profile APIs.
