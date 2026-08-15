# YATICORP LMS - API Documentation
> **Service:** `yaticorp-lms-server`  
> **Base URL (local):** `http://localhost:5000/api`

---

## Authentication and Headers

- Protected routes require:
  - `Authorization: Bearer <token>`
- Token types:
  - Student token for `/user/*` protected endpoints
  - Admin token for `/admin/*` and `/community/admin/*`
  - Platform token for `/platform/*`
- Content type:
  - `Content-Type: application/json` for JSON requests
  - `multipart/form-data` for file uploads (`/admin/users/bulk`, `/user/profile/picture`)

---

## Auth Endpoints (`/auth`)

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| GET | `/auth/published-content` | Public | Get published content summary |
| POST | `/auth/validate-qr` | Public | Validate QR data |
| POST | `/auth/verify-card` | Public | Verify activation card details |
| POST | `/auth/register` | Public | Register student |
| POST | `/auth/student/login` | Public | Student login |
| POST | `/auth/student/forgot-password` | Public | Send reset password link |
| POST | `/auth/student/reset-password` | Public | Reset student password |
| POST | `/auth/admin/verify-org` | Public | Validate organization before admin login |
| POST | `/auth/admin/login` | Public | Admin login |
| POST | `/auth/admin/verify-2fa` | Public | Verify admin TOTP |
| POST | `/auth/admin/setup-2fa` | Admin | Generate QR/secret for 2FA setup |
| POST | `/auth/admin/enable-2fa` | Admin | Enable admin 2FA |
| POST | `/auth/platform/verify-secret` | Public | Validate platform secret |
| POST | `/auth/platform/login` | Public | Platform admin login |

---

## Admin Endpoints (`/admin`)

### Users

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| GET | `/admin/users` | Admin | List students |
| POST | `/admin/users` | Admin | Create student |
| POST | `/admin/users/bulk` | Admin | Bulk create students via file upload |
| GET | `/admin/users/:id` | Admin | Get student details |
| PUT | `/admin/users/:id` | Admin | Update student |
| DELETE | `/admin/users/:id` | Admin | Delete student |
| PUT | `/admin/users/:id/status` | Admin | Block/unblock student |
| DELETE | `/admin/users/:id/progress/:courseId` | Admin | Reset student course progress |

### Courses, Modules, Lessons, Quiz

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| GET | `/admin/courses` | Admin | List courses |
| POST | `/admin/courses` | Admin | Create course |
| GET | `/admin/courses/:id` | Admin | Get course details |
| PUT | `/admin/courses/:id` | Admin | Update course |
| DELETE | `/admin/courses/:id` | Admin | Delete course |
| GET | `/admin/courses/:id/students` | Admin | List enrolled students for course |
| POST | `/admin/modules` | Admin | Create module |
| PUT | `/admin/modules/reorder` | Admin | Reorder modules |
| PUT | `/admin/modules/:id` | Admin | Update module |
| DELETE | `/admin/modules/:id` | Admin | Delete module |
| POST | `/admin/lessons` | Admin | Create lesson |
| PUT | `/admin/lessons/reorder` | Admin | Reorder lessons |
| PUT | `/admin/lessons/:id` | Admin | Update lesson |
| DELETE | `/admin/lessons/:id` | Admin | Delete lesson |
| GET | `/admin/lessons/:lessonId/quiz` | Admin | Get lesson quiz |
| POST | `/admin/lessons/:lessonId/quiz` | Admin | Save lesson quiz |
| GET | `/admin/preview/:courseId` | Admin | Preview unpublished course |

### Bundles and Enrollments

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| GET | `/admin/bundles` | Admin | List bundles |
| POST | `/admin/bundles` | Admin | Create bundle |
| GET | `/admin/bundles/:id` | Admin | Get bundle details |
| PUT | `/admin/bundles/:id` | Admin | Update bundle |
| DELETE | `/admin/bundles/:id` | Admin | Delete bundle |
| GET | `/admin/enrollments` | Admin | List enrollments |
| POST | `/admin/enrollments` | Admin | Create enrollment |
| DELETE | `/admin/enrollments/:id` | Admin | Delete enrollment |

### Admin Management, Tickets, Settings, Reports

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| GET | `/admin/admins` | Superadmin | List admins |
| POST | `/admin/admins` | Superadmin | Add admin |
| PUT | `/admin/admins/:id` | Superadmin | Update admin |
| DELETE | `/admin/admins/:id` | Superadmin | Delete admin |
| GET | `/admin/tickets` | Admin | List support tickets |
| PUT | `/admin/tickets/:id` | Admin | Update ticket status/notes |
| GET | `/admin/settings` | Admin | Get settings |
| PUT | `/admin/settings` | Admin | Update settings |
| GET | `/admin/analytics` | Admin | Get analytics summary |
| GET | `/admin/announcements` | Admin | List announcements |
| POST | `/admin/announcements` | Admin | Create announcement |
| PUT | `/admin/announcements/:id` | Admin | Update announcement |
| DELETE | `/admin/announcements/:id` | Admin | Delete announcement |
| GET | `/admin/reports/completion` | Admin | Completion report |
| GET | `/admin/reports/export/csv` | Admin | Export analytics CSV |
| GET | `/admin/reports/export/excel` | Admin | Export analytics Excel |

---

## Student Endpoints (`/user`)

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| GET | `/user/profile` | Student | Get profile |
| PUT | `/user/profile` | Student | Update profile |
| PUT | `/user/update-password` | Student | Change password |
| POST | `/user/profile/picture` | Student | Upload profile picture |
| GET | `/user/courses` | Student | Get enrolled courses |
| GET | `/user/courses/available` | Student | Get available courses |
| GET | `/user/courses/:id` | Student | Get course content |
| POST | `/user/courses/:id/enroll` | Student | Enroll into a course |
| POST | `/user/progress/update` | Student | Update lesson progress |
| GET | `/user/settings` | Student | Get user settings |
| GET | `/user/lessons/:lessonId/quiz` | Student | Get lesson quiz |
| POST | `/user/lessons/:lessonId/quiz/submit` | Student | Submit quiz answers |
| POST | `/user/tickets` | Student | Create support ticket |
| GET | `/user/tickets` | Student | Get own tickets |
| GET | `/user/certificates` | Student | Get own certificates |
| GET | `/user/announcements` | Student | Get announcements |
| POST | `/user/announcements/clear` | Student | Clear announcement notifications |
| GET | `/user/search` | Student | Search content |

---

## Platform Endpoints (`/platform`)

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| GET | `/platform/orgs` | Platform | List organizations |
| POST | `/platform/orgs` | Platform | Create organization |
| GET | `/platform/orgs/:orgId` | Platform | Get organization |
| PUT | `/platform/orgs/:orgId` | Platform | Update org status |
| DELETE | `/platform/orgs/:orgId` | Platform | Delete organization |
| POST | `/platform/orgs/:orgId/admins` | Platform | Add org admin |
| PUT | `/platform/orgs/:orgId/admins/:adminId` | Platform | Update org admin |
| DELETE | `/platform/orgs/:orgId/admins/:adminId` | Platform | Delete org admin |
| GET | `/platform/orgs/:orgId/students` | Platform | List org students |
| GET | `/platform/analytics` | Platform | Platform analytics |

---

## Community Endpoints (`/community`)

### Student

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| GET | `/community` | Student | List posts |
| POST | `/community` | Student | Create post |
| GET | `/community/:id` | Student | Get post by id |
| PUT | `/community/:id` | Student | Update own post |
| DELETE | `/community/:id` | Student | Delete own post |
| POST | `/community/:id/comments` | Student | Add comment |

### Admin moderation

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| GET | `/community/admin/all` | Admin | List all posts |
| DELETE | `/community/admin/:id` | Admin | Delete post |
| POST | `/community/admin/:id/reply` | Admin | Reply to post |
| DELETE | `/community/admin/comments/:id` | Admin | Delete comment |

---

## Certificates Endpoints (`/certificates`)

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| POST | `/certificates/generate` | Student | Generate certificate |
| GET | `/certificates` | Student | Get certificates |

---

## Tickets Endpoints (`/tickets`)

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| POST | `/tickets` | Public | Create support ticket |
| POST | `/tickets/admin/:id/message` | Public/Admin* | Send admin message for ticket |

\* Route currently has no explicit middleware in file.

---

## Media and Utility Endpoints

### VdoCipher (`/vdocipher`)

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| POST | `/vdocipher/upload-credentials` | Open* | Get upload credentials |
| GET | `/vdocipher/status/:videoId` | Open* | Get video status |
| POST | `/vdocipher/generate-otp` | Open* | Generate playback OTP |
| DELETE | `/vdocipher/video/:videoId` | Open* | Delete video |

### Bunny (`/bunny`)

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| POST | `/bunny/create-video` | Open* | Create Bunny video |

### Sync (`/sync`)

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| POST | `/sync/activate` | Open* | Sync activation flow |

\* These routes are currently not protected in route files and should be reviewed for production hardening.

---

## Common Response Pattern

Most controllers return JSON in one of these forms:

- success payload (object or array)
- error payload: `{ "message": "..." }`

Recommended client handling:

- treat `2xx` as success
- parse `message` for `4xx/5xx`
- re-auth on `401`

