# YATICORP LMS — Features Overview

A complete breakdown of every feature in the YATICORP Learning Management System.

---

## 🎓 Student Features

### Registration & Authentication
- **Card-Based Registration** — Students sign up using a physical activation card (CardNumber + CVV)
- Card is validated against the database; must be `unactivated` or `activated` (not `used` or `inactive`)
- After registration, card is marked `used` so it cannot be reused
- **Login** with Card Number + Password
- **Splash Screen** — Beautifully animated, theme-consistent loading screen on initial app load.
- **Login** with Card Number + Password
- **Forgot Password** — enter card number → receive password reset email
- **Reset Password** — secure link via email (token expires in 1 hour)

### Dashboard
- Time-based greeting: *Good morning / Good afternoon / Good evening, [Name]!*
- **Stats**: Total Courses, In Progress, Completed
- Course cards showing:
  - Course thumbnail
  - Title
  - Progress bar (percentage)
  - "Continue Learning" or "Start Course" button
- **Enrolled Courses** link in the sidebar (shortcut back to dashboard)

### Course Player
- VdoCipher **DRM-protected video** streaming (no download possible)
- Lesson list in the sidebar with:
  - ✅ Completed lesson indicator
  - Currently active lesson highlight
  - Lesson navigation (click to switch)
- Progress auto-saved when lesson is completed
- Progress percentage shown in the header
- Course completion detection
- **Quiz per lesson** — multiple-choice questions, scored on submit.
- **Credit Rewards** — Passing a quiz awards credits to the student's profile.
- **Certificates** — Automatic certificate generation upon 100% course completion.
- **Announcements** — View platform-wide updates and news directly on the dashboard.
- **Community** — Real-time discussion forum for students to interact, share, and learn together.
- **Course Purchase** — Use earned credits to buy new courses or content.

### Profile
- View personal details: name, email, phone, card number, serial number

### Contact Support
Available at:
- **Login page** (before login)
- **Signup page** (before/during registration)
- **Sidebar** (while logged in — always accessible)

Includes:
- 📞 Phone number: **9535440195** (clickable on mobile)
- Form: Subject + Message (name/email pre-filled if logged in)
- Submitting creates a ticket AND sends a confirmation email to the student

---

## 🛠 Admin Features

### Admin Authentication
- Separate login from students
- JWT-based session
- **2FA (Two-Factor Authentication)** — optional:
  - Setup: generates a QR code to scan with Google Authenticator
  - Enable: verify first TOTP code to activate
  - Login: if enabled, a second screen prompts for the 6-digit code

### Student Management
- View all students in a table (name, email, card number, status)
- **Create student** manually (validates card + CVV, marks card as `used`, sends welcome email)
- **Edit student** — update name, email, phone, card number, password
- **Block / Unblock** student (prevents login when blocked)
- **Delete student** — removes all enrollments + resets activation card to `unactivated`
- **View student profile** modal:
  - Full details (email, phone, card, serial, join date, ID)
  - All active enrollments
  - Assign new Course or Bundle

### Enrollment Management
- Assign a **single course** or **bundle** to any student
- Remove enrollment from a student
- **Reset Course Progress** — wipe a student's progress to 0% for a specific course
- View all enrollments across the platform

### Course & Lesson Builder
- Create courses with title, description, thumbnail
- Publish / Unpublish a course
- **Module management**: add, rename, reorder, delete modules
- **Lesson management**:
  - Add lessons with title and video source (VdoCipher DRM, YouTube, direct upload)
  - Reorder and delete lessons
- **Full Lesson Editor** with:
  - Video configuration
  - **Quiz Builder** — add questions with options + correct answer
  - **CSV Bulk Upload** — download a template, fill in questions, upload to bulk-create the quiz

### Bundle Management
- Create bundles of multiple courses
- Set bundle title, description, thumbnail
- Assign bundles to students

### Support Ticket System
- **Admin receives email** when a student submits a ticket
- View all tickets with:
  - Open / In Progress / Resolved stats
  - Filter by status
  - Full ticket details (student name, email, card no., page, message)
- Update ticket status (Open → In Progress → Resolved)
- Add **admin notes** to a ticket
- **Student receives email** when ticket status is updated (includes admin notes)

### Community Moderation
- View all student discussion posts in a table (title, content preview, author, comment count, date)
- **Delete post** — permanently removes the post and all its comments

### Analytics & Reporting
- **Operations Dashboard** — Real-time stats for revenue, enrollments, and active users.
- **Student Analytics** — Track individual student progress and engagement across all courses.
- **Reports** — Exportable completion and usage reports.

### Admin Management (Superadmin Only)
- View, add, update, and delete other admin accounts
- Limited to users with the `superadmin` role

### Announcements Management
- Create, Edit, and Delete platform-wide announcements.
- Instant visibility for all students.

### VdoCipher Video Management
- Upload video to VdoCipher
- Check video processing status
- Generate OTP for secure student playback
- Delete videos

---

## 📧 Email System (Brevo)

| Event | Who Gets Email |
|-------|---------------|
| Student submits support ticket | Admin (ticket details) |
| Student submits support ticket | Student (confirmation) |
| Admin updates ticket status | Student (status + admin notes) |
| Student requests password reset | Student (secure reset link) |
| Student resets password | Student (success confirmation) |
| Admin creates a new student account | Student (welcome + login credentials) |

---

## 🔑 Card Activation System

Cards are physical tokens distributed to students before registration.

| Card Status | Meaning |
|-------------|---------|
| `unactivated` | Fresh card, never used |
| `activated` | Card activated but not yet registered |
| `used` | Student registered — card consumed |
| `inactive` | Manually disabled by admin |

Cards can be seeded using `seedCard.js`. When a student is deleted by admin, their card is reset to `unactivated` so it can be reused.

---

## 🎬 VdoCipher DRM Video

- All course videos are **DRM-protected** via VdoCipher
- Students cannot download or screen-record videos (DRM enforcement)
- Each playback session uses a unique **OTP** (One-Time Password) valid for a short time
- OTP is generated server-side using admin VdoCipher API key
- Student never sees the raw video ID

---

## 🔒 Security Features

- **Separate JWT flows** for admin and students (different tokens, different middleware)
- Admin routes guarded by `protectAdmin` middleware
- Student routes guarded by `protectUser` middleware
- Superadmin-only routes further guarded by `superAdminOnly` middleware
- Passwords hashed with **bcrypt** (both admin and student)
- Password reset tokens expire after **1 hour**
- Card-based registration prevents unauthorized signups
- Blocked students cannot log in
- VdoCipher OTP-based streaming prevents video sharing/downloading
- Optional **2FA** (TOTP) for admin accounts

---

## 📊 Progress Tracking

- Each student has a `Progress` document per course
- Tracks: `completedLessons[]`, `percentage`, `lastAccessedLesson`
- Progress is updated via `POST /api/user/progress/update`
- Admin can **reset progress** for any student on any course
- Dashboard shows real-time completion status

---

## 📝 Quiz System

- Each lesson can have an optional quiz (multiple-choice questions)
- Admin creates/edits quiz through the Lesson Editor:
  - Manually add questions one by one
  - Or **bulk upload via CSV** (download template → fill → upload)
- Students take quizzes after watching a lesson
- Quiz results are returned immediately on submit

---

## 💬 Community

- Students can create discussion posts (title + content)
- Other students can add comments to posts
- Admins can view and delete any post or comment from the admin panel

---

## 🔄 Auto-Sync Feature

- On student login, if the card number is not found in the LMS database:
  - The system checks the external **AI_DATA** MongoDB database
  - If a matching user is found and password matches, they are automatically imported into the LMS
  - Their course enrollments from the external DB are also synced

---

## 📦 Summary of Features by Module

| Module | Features |
|--------|---------|
| Auth | Card-based registration, JWT login (admin/student separate), auto-sync, 2FA, forgot/reset password |
| Dashboard | Stats, course cards, progress bars, greeting, enrolled courses sidebar |
| Courses | CRUD, modules, lessons, VdoCipher/YouTube/upload video, publish/unpublish |
| Quiz | Per-lesson quizzes, manual builder, CSV bulk upload, student submission + scoring |
| Bundles | Group courses, assign to students |
| Enrollments | Assign, remove, view all, reset progress |
| Progress | Track completion per lesson, percentage, last accessed |
| Tickets | Submit, view, update status, email notifications (admin + student) |
| Community | Create posts, comment, admin moderation (delete posts/comments) |
| Email | Password reset, ticket confirmation, status updates, welcome email |
| VdoCipher | DRM upload, OTP playback, delete |
| Cards | Seed, validate, track usage, reset on user delete |
| Admin Mgmt | CRUD admin users (superadmin only) |
