# YATICORP LMS — Student App Documentation
> **Path:** `yaticorp-lms-student/`  
> **Framework:** React 18 + Vite  
> **Runs on:** http://localhost:5173

---

## 📦 Key Dependencies

| Package | Purpose |
|---------|---------|
| `react` + `react-dom` | UI framework |
| `vite` | Build tool + dev server |
| `react-router-dom` | Client-side routing |
| `axios` | API requests |
| `lucide-react` | Icons |

---

## 🗂 Folder Structure

```
yaticorp-lms-student/src/
├── App.jsx              # Route definitions
├── main.jsx             # React entry point
├── context/
│   └── AuthContext.jsx  # Global auth state (user, login, logout)
├── layouts/
│   └── StudentLayout.jsx  # Sidebar, mobile menu, Contact Support modal
├── pages/
│   ├── Login.jsx          # Login form + Forgot Password modal + Contact Admin modal
│   ├── Signup.jsx         # Registration form + Contact Admin modal
│   ├── Dashboard.jsx      # Enrolled courses + stats + greeting
│   ├── CoursePlayer.jsx   # Video player + lesson list + quiz + progress tracking
│   ├── Profile.jsx        # Student profile view
│   └── ResetPassword.jsx  # Password reset via email token
└── utils/
    └── api.js             # Axios instance — baseURL: http://localhost:5000/api
```

---

## 🗺 Routes

| Path | Component | Auth Required | Description |
|------|-----------|:---:|-------------|
| `/login` | Login | ❌ | Student login page |
| `/signup` | Signup | ❌ | Student self-registration |
| `/reset-password` | ResetPassword | ❌ | Password reset via email |
| `/` | Dashboard | ✅ | Homepage + Announcements |
| `/courses` | EnrolledCourses | ✅ | All your enrolled content |
| `/community` | Community | ✅ | Discussion forum feed |
| `/community/:id` | PostDetail | ✅ | View post and comments |
| `/learn/:courseId` | CoursePlayer | ✅ | Video player + quiz + credits |
| `/profile` | Profile | ✅ | Personal info + Certificates |

---

## 🧩 Pages in Detail

### `Login.jsx`
- Login form with **Card Number + Password**
- **Forgot Password** modal — enter card number to receive email reset link
- **Contact Admin** modal — submit support ticket with phone number 📞 9535440195

### `Signup.jsx`
- Registration form: Name, Email, Phone, Card Number, CVV, Password
- Validates card against backend (must be `unactivated` or `activated`, not `used` or `inactive`)
- On success, card is marked as `used` and user is redirected to login
- **Contact Admin** modal — for registration issues

### `Dashboard.jsx`
- Welcome banner with time-based greeting (Good morning / afternoon / evening)
- Stats: Total Courses, In Progress, Completed
- **Announcements Feed** — Stay updated with the latest news from YATICORP.
- Course cards with progress bars & "Continue Learning" / "Start" buttons.
- **Splash Screen** — A custom brand-themed splash screen is shown while the app initializes.

### `CoursePlayer.jsx`
- Fetches full course + lessons from `/api/user/courses/:id`
- Renders **VdoCipher embedded video** via OTP (DRM-protected, no download)
- Lesson list in sidebar with ✅ completion marks and currently active highlight
- Marks lesson as complete on video end → updates progress in DB
- Shows course completion % in header
- **Quiz** after each applicable lesson:
  - Multiple-choice questions
  - Submit answers → get instant score feedback
  - **Rewards** — Earn credits for successfully passing quizzes.
  - **Certificates** — Unlock a downloadable PDF certificate once the course hits 100% completion.

### `Profile.jsx`
- View personal details: name, email, phone, card number, serial number

### `ResetPassword.jsx`
- Reads `?token=` from URL query params
- Form: New Password + Confirm Password
- On submit → `POST /api/user/reset-password`
- Redirects to `/login` after 3 seconds on success

### `StudentLayout.jsx`
- Desktop sidebar: Logo, nav links (Dashboard, Profile, Enrolled Courses), user info card, **Contact Support** button, Logout
- Mobile: hamburger menu with slide-out panel
- **Contact Support modal** — pre-fills user name/email/card from auth context
- Sidebar refreshes on every route change

---

## 🔐 Auth Flow

1. Student logs in → `POST /api/user/login`
2. JWT token stored in `localStorage` as `studentToken`
3. `AuthContext` reads token on mount, fetches `/api/user/profile`
4. `ProtectedRoute` wraps all student pages — redirects to `/login` if no token
5. Axios interceptor adds `Authorization: Bearer <token>` to all requests

---

## 📞 Contact Support

Available on:
- Login page (before login)
- Signup page (before login)
- Student Dashboard sidebar (after login)

Phone: **9535440195** (clickable `tel:` link)

Submitting the form creates a ticket via `POST /api/tickets`.

---

## Environment Configuration

Create `.env` in `yaticorp-lms-student`:

```env
VITE_API_URL=http://localhost:5000/api
```

This should point to the running backend API base.

---

## Scripts

```bash
npm run dev
npm run build
npm run preview
npm run lint
```

---

## Startup Checklist

1. Start `yaticorp-lms-server`.
2. Set `VITE_API_URL` correctly.
3. Run:
   ```bash
   cd yaticorp-lms-student
   npm install
   npm run dev
   ```
4. Test login, dashboard data, and course playback.

---

## API Dependencies

Student web app consumes:

- `/api/auth/register`
- `/api/auth/student/login`
- `/api/auth/student/forgot-password`
- `/api/auth/student/reset-password`
- `/api/user/profile`
- `/api/user/courses`
- `/api/user/courses/:id`
- `/api/user/progress/update`
- `/api/user/lessons/:lessonId/quiz`
- `/api/user/lessons/:lessonId/quiz/submit`
- `/api/user/announcements`
- `/api/user/certificates`
- `/api/community/*`
- `/api/tickets` (support submissions)

---

## Troubleshooting

- **Login failing**
  - Verify card number/password and backend auth route status.
- **Blank dashboard**
  - Check token in storage and `VITE_API_URL` correctness.
- **Course not loading**
  - Confirm enrollment exists and API returns modules/lessons.
- **Reset password link invalid**
  - Token may be expired; request a new reset email.
