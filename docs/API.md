# YATICORP LMS - API Documentation
> **Service:** `yaticorp-lms-server`  
> **Base URL (local):** `http://localhost:5000/api`

---

## Authentication and Headers

- Protected routes require:
  - `Authorization: Bearer <token>`
- Token types:
  - Student token for `/user/*` protected endpoints
  - Admin token for `/admin/*` and `/community/admin/*`. An `orgadmin` token is
    refused here with `403 ORG_ADMIN_SCOPE`
  - Organization admin token for `/organizations/me/*`
  - Superadmin token for `/admin/admins` and `/organizations/admin/*`
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
| POST | `/auth/register` | Public | Register student; optional `orgCode` sends a join request |
| POST | `/auth/student/login` | Public | Student login |
| POST | `/auth/student/forgot-password` | Public | Send reset password link |
| POST | `/auth/student/reset-password` | Public | Reset student password |
| POST | `/auth/admin/login` | Public | Admin login — platform admins and organization admins alike |
| POST | `/auth/admin/verify-2fa` | Public | Verify admin TOTP |
| POST | `/auth/admin/setup-2fa` | Admin | Generate QR/secret for 2FA setup |
| POST | `/auth/admin/enable-2fa` | Admin | Enable admin 2FA |

One login serves every kind of administrator. The response carries `role`; when
that is `orgadmin` it also carries `organizationId`, `orgCode`,
`organizationName`, `organizationStatus` and `organizationStatusReason`, so the
admin app knows to open the organization panel and can show an application still
under review. For a platform admin the response is unchanged.

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
| GET | `/admin/users/:id/progress/:courseId` | Admin | Student's progress in a course, lesson by lesson |
| PUT | `/admin/users/:id/progress/:courseId` | Admin | Set student course progress (`{ percentage }` or `{ completedLessons: [] }`) |
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
| GET | `/user/ai-key` | User | Whether the student has saved their own Gemini key (masked, never the key itself) |
| PUT | `/user/ai-key` | User | Save the student's Gemini key (`{ key }`); checked live with Google, stored encrypted |
| DELETE | `/user/ai-key` | User | Remove the key; AI features fall back to the platform key |
| GET | `/user/lessons/:lessonId/quiz` | Student | Get lesson quiz |
| POST | `/user/lessons/:lessonId/quiz/submit` | Student | Submit quiz answers |
| POST | `/user/tickets` | Student | Create support ticket |
| GET | `/user/tickets` | Student | Get own tickets |
| GET | `/user/certificates` | Student | Get own certificates |
| GET | `/user/announcements` | Student | Get announcements |
| POST | `/user/announcements/clear` | Student | Clear announcement notifications |
| GET | `/user/search` | Student | Search content |

---

## Organization Endpoints (`/organizations`)

Schools, colleges and companies that bring their own students. Three audiences
share the mount, each behind its own guard.

The organization a request may touch is always read from the authenticated
account, never from the URL or the body. An organization admin asking for
`/organizations/me/students/:studentId` with another organization's student id
gets a 404 — the lookup includes the organization, so it matches nothing.

### Public

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| GET | `/organizations/types` | Public | The organization types the form offers |
| POST | `/organizations/register` | Public | Register an organization; creates it `pending` plus its `orgadmin` account |

### Superadmin

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| GET | `/organizations/admin/options` | Admin | Every organization, for a filter dropdown |
| GET | `/organizations/admin` | SuperAdmin | List, with `?status=`, `?type=`, `?search=` |
| POST | `/organizations/admin` | SuperAdmin | Create an organization and its administrator (opens `active`) |
| GET | `/organizations/admin/:id` | SuperAdmin | One organization, with its admins and status history |
| PUT | `/organizations/admin/:id` | SuperAdmin | Edit details (never `orgCode`, never `status`) |
| PUT | `/organizations/admin/:id/status` | SuperAdmin | `{ status, reason }` — approve, reject, suspend, reinstate |
| GET | `/organizations/admin/:id/students` | SuperAdmin | Its students, with progress |
| GET | `/organizations/admin/:id/assignable` | SuperAdmin | Students who could be put into it, `?search=`, capped at 50 |
| POST | `/organizations/admin/:id/students` | SuperAdmin | `{ studentId }` — put a student into it, moving them if needed; refused (400) while it is pending |
| DELETE | `/organizations/admin/:id/students/:studentId` | SuperAdmin | Take a student out of it |
| GET | `/organizations/admin/students/:studentId` | SuperAdmin | Any student's full learning record |

A pending organization cannot be assigned students — it has to be approved
first, and the admin panel hides "Assign student" for it. Other statuses are not
gated (a suspended organization can still be stocked). The response carries
`organizationStatus` and says so in its message, because until the organization
is active its administrator cannot sign in to see those students. Students still cannot *find* a
non-active organization themselves — the student lookup returns active ones only.

`status` accepts `active`, `rejected`, `suspended`, `inactive`. `pending` is
refused — nothing returns to the queue it has left. A rejection requires a
`reason`, which the organization is shown. No status change ever deletes an
organization, a membership, or a student's progress.

### Organization admin

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| GET | `/organizations/me/status` | OrgAdmin | Where my application stands — the only route open before approval |
| GET | `/organizations/me` | OrgAdmin | My organization |
| PUT | `/organizations/me` | OrgAdmin | Edit name, logo, contact, email, phone, address, website |
| PUT | `/organizations/me/password` | OrgAdmin | `{ currentPassword, newPassword }` — change the sign-in password |
| GET | `/organizations/me/dashboard` | OrgAdmin | Headline numbers and recent student activity |
| GET | `/organizations/me/students` | OrgAdmin | My students, with progress |
| GET | `/organizations/me/students/:studentId` | OrgAdmin | One of my students, in full |
| DELETE | `/organizations/me/students/:studentId` | OrgAdmin | Remove from my organization (the account is untouched) |
| GET | `/organizations/me/requests` | OrgAdmin | Join requests, `?status=pending\|approved\|rejected` |
| PUT | `/organizations/me/requests/:requestId` | OrgAdmin | `{ decision: 'approve'\|'reject', reason }` |

Everything but `/me/status` is behind an active-organization gate. A pending,
rejected, suspended or inactive organization gets `403` with
`code: 'ORGANIZATION_NOT_ACTIVE'` and its own status.

### Student

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| GET | `/organizations/student/me` | Student | My organization, or my latest request |
| GET | `/organizations/student/lookup/:code` | Student | Find an **active** organization by its ID |
| POST | `/organizations/student/requests` | Student | `{ orgCode }` — ask to join |
| DELETE | `/organizations/student/requests/:requestId` | Student | Withdraw my pending request |

One student belongs to one organization and may have one request in flight.
Only active organizations can be found or joined. Looking a code up never joins
anything — the organization's own admin decides.

There is deliberately no endpoint for a student to leave. Membership is the
institution's record of who its students are, so ending it belongs to that
organization (`DELETE /organizations/me/students/:studentId`) or to a superadmin
(`DELETE /organizations/admin/:id/students/:studentId`). Withdrawing a request
nobody has answered is still the student's own to do — that is their request,
not a membership. Removing a student, however it happens, clears the membership
and nothing else: the account, courses, progress, XP and certificates are theirs
and are untouched.

A student is offered this in exactly two places: the optional `orgCode` field on
the signup form, and the "Add organization" button on their dashboard. The signup
field is handled by `POST /auth/register` rather than by these endpoints, because
at that point there is no account and therefore no token. It is the one place a
join request is created without a signed-in student, and it still creates nothing
more than a request. Every failure there is soft and reported in the response's
`organization` field — an unrecognised or misshapen ID never costs someone their
account, and `organization` is `null` when the field was left blank.

### Organization IDs

`orgCode` is the public identifier: `<NAME>-<year>-<0001>`, where `<NAME>` is the
organization's own first word, uppercased and stripped of punctuation — so
"ABC College" gives `ABC-2026-0001`. A first word with no letters is skipped, and
a prefix is capped at 12 characters.

It is generated once at creation from an atomic counter, marked immutable on the
schema, and never read from a request body. Renaming an organization does not
change it, because students may already be holding the old one. Codes issued
under the earlier fixed `ORG-` shape remain valid. The database `_id` is never
shown as the organization's ID.

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

