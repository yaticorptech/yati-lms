# YATICORP LMS — Admin App Documentation
> **Path:** `yaticorp-lms-admin/`  
> **Framework:** React 18 + Vite  
> **Runs on:** http://localhost:5174

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
yaticorp-lms-admin/src/
├── App.jsx              # Route definitions
├── main.jsx             # React entry point
├── context/
│   └── AuthContext.jsx  # Admin auth state (admin, login, logout, verify2FA)
├── components/
│   └── DeleteConfirmModal.jsx  # Reusable delete confirmation dialog
├── layouts/
│   └── AdminLayout.jsx  # Sidebar with nav links, badge, logout
├── pages/
│   ├── Login.jsx        # Admin login + optional 2FA step
│   ├── Dashboard.jsx    # Stats overview
│   ├── Users.jsx        # Student management
│   ├── Courses.jsx      # Course list + creation
│   ├── CourseEditor.jsx # Module + lesson builder
│   ├── LessonEditor.jsx # Full lesson editor
│   ├── Analytics.jsx    # Real-time analytics dashboard
│   ├── Announcements.jsx # Manage platform announcements
│   ├── Bundles.jsx      # Bundle management
│   ├── Enrollments.jsx  # Enrollment overview
│   ├── Tickets.jsx      # Support ticket management
│   ├── Community.jsx    # Community post moderation
│   └── Settings.jsx     # Admin settings + 2FA
└── utils/
    └── api.js           # Axios instance — baseURL: http://localhost:5000/api
```

---

## 🗺 Routes

| Path | Component | Description |
|------|-----------|-------------|
| `/login` | Login | Admin login (+ 2FA step if enabled) |
| `/` | Dashboard | Stats overview |
| `/users` | Users | Student management |
| `/courses` | Courses | Course list + creation |
| `/courses/:id` | CourseEditor | Module + lesson builder |
| `/courses/:courseId/lessons/:lessonId` | LessonEditor | Full lesson + quiz editor |
| `/bundles` | Bundles | Bundle management |
| `/enrollments` | Enrollments | All enrollments |
| `/analytics` | Analytics | Business & User Analytics |
| `/announcements` | Announcements | Platform updates |
| `/tickets` | Tickets | Support tickets |
| `/community` | Community | Community moderation |
| `/settings` | Settings | Admin account settings |

---

## 🧩 Pages in Detail

### `Login.jsx`
- Email + Password login for admin accounts
- If account has **2FA enabled**, shows a second screen to enter the 6-digit TOTP code from an authenticator app
- Bug fix: `requires2FA` is now correctly checked before the generic error check

### `Dashboard.jsx`
- Summary cards: Total Students, Courses, Bundles, Active Enrollments
- Recent activity overview

### `Users.jsx` ⭐ Most Feature-Rich
- **Table** of all students (name, email, card number, status)
- **Search** bar to filter students
- **Add User** modal — create student manually (validates card number + CVV)
- **Edit User** modal — update name, email, phone, card number, password
- **Manage modal** (click on a student row):
  - View full student details (email, phone, card, serial, join date, ID)
  - Assign Course or Bundle using dropdowns
  - View active enrollments with:
    - 🔴 **Remove** button (removes enrollment)
    - 🟡 **Reset Progress** button (for Courses — wipes progress to 0%)
- **Block/Unblock** student toggle
- **Delete** student (also resets their activation card to `unactivated`)
- Welcome email sent automatically when admin creates a new user

### `Courses.jsx`
- List of all courses with thumbnail, title, status badge
- Create course modal
- Edit course (title, description, thumbnail, publish status)
- Delete course with confirmation
- After creating a course → automatically navigates to the CourseEditor

### `CourseEditor.jsx`
- Add, rename, reorder, and delete **Modules**
- Add, rename, reorder, and delete **Lessons** within modules
- Navigate into a lesson to open the full `LessonEditor`

### `LessonEditor.jsx` ⭐
- Set lesson title and video source (VdoCipher / YouTube / Upload)
- Full **Quiz Builder**:
  - Add questions with multiple options & mark the correct answer
  - Reorder, edit, delete questions
  - **CSV Bulk Upload** — download a template CSV, fill in questions, upload to auto-generate the quiz
- Save all changes to the backend

### `Bundles.jsx`
- Create + manage bundles
- Add multiple courses to a bundle
- Set bundle title, description, thumbnail

### `Enrollments.jsx`
- View all enrollments across all students
- Filter by type (Course / Bundle)

### `Tickets.jsx` ⭐
- **Stats cards**: Open / In Progress / Resolved counts
- **Filter** by status
- **Ticket list** with student name, email, subject, page, date
- Expandable ticket detail panel with:
  - Full message
  - Admin notes textarea
  - Status buttons: Open / In Progress / Resolved
  - Saving updates sends an email to the student automatically

### `Community.jsx`
- Table of all student discussion posts across the platform
- Shows: post title, preview, author name/email, comment count, date
- **Delete post** button — permanently removes the post and all its comments

### `Analytics.jsx`
- Interactive charts showing revenue, user growth, and enrollment trends.
- Breakdowns by course and student category.

### `Announcements.jsx`
- List of current active announcements.
- Simple form to broadcast new messages to all students instantly.

### `Settings.jsx`
- Admin profile settings
- **Setup 2FA** — generates a QR code to scan with an authenticator app
- **Enable 2FA** — verify first TOTP code to activate 2FA on the account
- **Splash Screen Logic** — The admin panel now features a beautiful brand-consistent splash screen that fades out once the app is loaded.

---

## 🗄 Sidebar — `AdminLayout.jsx`

- Logo
- Navigation links: Dashboard, Users, Courses, Bundles, Enrollments, Support Tickets, Community, Settings
- **Red badge** on Support Tickets showing count of open tickets (auto-refreshes on route change)
- Admin name + role display
- Logout button

---

## 🔐 Auth Flow

1. Admin submits email + password → `POST /api/admin/login`
2. If 2FA is enabled → server returns `requires2FA: true` → admin enters TOTP → `POST /api/admin/verify-2fa`
3. JWT stored in `localStorage` as `adminToken` + `adminData`
4. `AuthContext` reads both on mount to restore session
5. All protected routes redirect to `/login` if no token
6. Axios interceptor adds `Authorization: Bearer <adminToken>` header

---

## 🔑 Admin Roles

| Role | Access |
|------|--------|
| `superadmin` | Full access including Admin Management |
| `admin` | Full access to all other pages |

---

## Environment Configuration

Create `.env` inside `yaticorp-lms-admin`:

```env
VITE_API_URL=http://localhost:5000/api
VITE_STUDENT_URL=http://localhost:5173
```

- `VITE_API_URL` is required for API connectivity.
- `VITE_STUDENT_URL` is used for links from admin workflows to student-facing pages.

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

1. Start backend (`yaticorp-lms-server`) first.
2. Confirm `VITE_API_URL` points to running backend.
3. Run admin app:
   ```bash
   cd yaticorp-lms-admin
   npm install
   npm run dev
   ```
4. Login using valid admin credentials.

---

## Backend Dependencies (Critical Endpoints)

Admin app relies primarily on:

- `/api/auth/admin/*` for login and 2FA
- `/api/admin/users*` for user lifecycle
- `/api/admin/courses*`, `/api/admin/modules*`, `/api/admin/lessons*`
- `/api/admin/bundles*`, `/api/admin/enrollments*`
- `/api/admin/tickets*`, `/api/admin/analytics`
- `/api/admin/announcements*`
- `/api/community/admin/*` for moderation

---

## Troubleshooting

- **401 Unauthorized**
  - Confirm `adminToken` exists and is valid.
  - Re-login and check token expiration/server JWT secret consistency.
- **No data shown on pages**
  - Verify `VITE_API_URL` and backend route availability.
  - Check CORS origins configured in backend.
- **2FA login loop**
  - Ensure device time is synchronized for TOTP validation.
- **Course editor save failures**
  - Verify lesson/module payload structure matches backend controllers.
