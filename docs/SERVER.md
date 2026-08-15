# YATICORP LMS — Server Documentation
> **Path:** `yaticorp-lms-server/`  
> **Runtime:** Node.js + Express.js  
> **Database:** MongoDB (via Mongoose)

---

## 📦 Dependencies

| Package | Purpose |
|---------|---------|
| `express` | HTTP server framework |
| `mongoose` | MongoDB ODM |
| `jsonwebtoken` | JWT auth tokens |
| `bcrypt` | Password hashing |
| `cors` | Cross-Origin Resource Sharing |
| `dotenv` | Environment variable loader |
| `nodemon` | Dev auto-restart |
| `axios` | HTTP requests (VdoCipher API) |
| `sib-api-v3-sdk` | Brevo email API SDK |
| `nodemailer` | SMTP email (alternative) |
| `crypto` | Password reset token generation |
| `speakeasy` | 2FA TOTP generation + verification |
| `qrcode` | QR code generation for 2FA setup |

---

## 🗂 Folder Structure

```
yaticorp-lms-server/
├── src/
│   ├── config/
│   │   └── db.js                         # Connects to YATI_LMS MongoDB database
│   ├── controllers/
│   │   ├── adminAuthController.js         # Admin login, 2FA setup/enable/verify
│   │   ├── adminBundleController.js       # Bundle CRUD
│   │   ├── adminCommunityController.js    # Admin: view all posts, delete post/comment
│   │   ├── adminCourseController.js       # Course + Module + Lesson CRUD + reorder
│   │   ├── adminEnrollmentController.js   # Enroll / remove students
│   │   ├── adminManagementController.js   # Manage admin accounts (superadmin only)
│   │   ├── adminQuizController.js         # Admin: get/save quiz for a lesson
│   │   ├── adminUserController.js         # Student management + progress reset + welcome email
│   │   ├── certificateController.js       # Course completion certificate generation
│   │   ├── registrationController.js      # Student self-registration
│   │   ├── syncController.js              # Data sync utilities
│   │   ├── ticketController.js            # Support ticket CRUD + email notifications
│   │   ├── userAuthController.js          # Student login + auto-sync + profile
│   │   ├── userCommunityController.js     # Student: get posts, create post, add comment
│   │   ├── userCourseController.js        # Course access + progress tracking + certificate check
│   │   ├── userPasswordController.js      # Forgot password + reset password
│   │   ├── userQuizController.js          # Student: get quiz, submit answers
│   │   └── vdoCipherController.js         # VdoCipher upload, OTP, delete
│   ├── middleware/
│   │   └── authMiddleware.js              # protectAdmin / superAdminOnly / protectUser JWT guards
│   ├── models/
│   │   ├── Admin.js                       # Admin user schema (name, email, password, role, 2FA)
│   │   ├── Bundle.js                      # Course bundle schema
│   │   ├── Card.js                        # Activation card schema (CardNumber, CVV, SerialNumber, status)
│   │   ├── Course.js                      # Course schema (custom string _id, modules[])
│   │   ├── Enrollment.js                  # Student enrollment records
│   │   ├── Lesson.js                      # Lesson/video schema (quiz[])
│   │   ├── Progress.js                    # Student lesson completion progress
│   │   ├── Ticket.js                      # Support ticket schema
│   │   └── User.js                        # Student user schema
│   ├── routes/
│   │   ├── adminRoutes.js                 # All /api/admin/* routes
│   │   ├── authRoutes.js                  # /api/auth/* (admin auth)
│   │   ├── certificateRoutes.js           # /api/certificates/*
│   │   ├── communityRoutes.js             # /api/community/* (student + admin sub-routes)
│   │   ├── syncRoutes.js                  # /api/sync/*
│   │   ├── ticketRoutes.js                # Public POST /api/tickets
│   │   ├── userRoutes.js                  # /api/user/* (auth + courses + quiz)
│   │   └── vdoCipherRoutes.js             # /api/vdocipher/*
│   └── utils/
│       ├── emailService.js                # Brevo API email sender
│       └── generateToken.js              # JWT token creator
├── seedCard.js                            # Seed activation cards to DB
├── testBrevoApi.js                        # Test Brevo email sending
├── .env                                   # Environment variables (not committed)
└── package.json
```

---

## 🔌 API Routes Overview

### Admin Routes — `/api/admin/*`

| Method | Path | Controller | Description |
|--------|------|-----------|-------------|
| POST | `/login` | adminAuthController | Admin login |
| POST | `/verify-2fa` | adminAuthController | Verify 2FA TOTP code |
| POST | `/setup-2fa` | adminAuthController | Generate 2FA QR code |
| POST | `/enable-2fa` | adminAuthController | Activate 2FA after first verify |
| GET | `/users` | adminUserController | List all students |
| POST | `/users` | adminUserController | Create student (validates card, sends welcome email) |
| GET | `/users/:id` | adminUserController | Get student + enrollments |
| PUT | `/users/:id` | adminUserController | Update student |
| DELETE | `/users/:id` | adminUserController | Delete student + resets card |
| PUT | `/users/:id/status` | adminUserController | Block/Unblock student |
| DELETE | `/users/:id/progress/:courseId` | adminUserController | Reset student progress |
| GET | `/courses` | adminCourseController | List courses |
| POST | `/courses` | adminCourseController | Create course |
| GET | `/courses/:id` | adminCourseController | Get course + modules + lessons |
| PUT | `/courses/:id` | adminCourseController | Update course |
| DELETE | `/courses/:id` | adminCourseController | Delete course |
| POST | `/modules` | adminCourseController | Add module to course |
| PUT | `/modules/reorder` | adminCourseController | Reorder modules |
| PUT | `/modules/:id` | adminCourseController | Update module |
| DELETE | `/modules/:id` | adminCourseController | Delete module |
| POST | `/lessons` | adminCourseController | Add lesson to module |
| PUT | `/lessons/reorder` | adminCourseController | Reorder lessons |
| PUT | `/lessons/:id` | adminCourseController | Update lesson |
| DELETE | `/lessons/:id` | adminCourseController | Delete lesson |
| GET | `/lessons/:lessonId/quiz` | adminQuizController | Get quiz for a lesson |
| POST | `/lessons/:lessonId/quiz` | adminQuizController | Save/replace quiz for a lesson |
| GET | `/bundles` | adminBundleController | List bundles |
| POST | `/bundles` | adminBundleController | Create bundle |
| PUT | `/bundles/:id` | adminBundleController | Update bundle |
| DELETE | `/bundles/:id` | adminBundleController | Delete bundle |
| GET | `/enrollments` | adminEnrollmentController | List all enrollments |
| POST | `/enrollments` | adminEnrollmentController | Enroll student in course/bundle |
| DELETE | `/enrollments/:id` | adminEnrollmentController | Remove enrollment |
| GET | `/tickets` | ticketController | List tickets (filter by status) |
| PUT | `/tickets/:id` | ticketController | Update ticket status + notes |
| GET | `/admins` | adminManagementController | List admins (superadmin only) |
| POST | `/admins` | adminManagementController | Add admin (superadmin only) |
| PUT | `/admins/:id` | adminManagementController | Update admin (superadmin only) |
| DELETE | `/admins/:id` | adminManagementController | Delete admin (superadmin only) |

### User Routes — `/api/user/*`

| Method | Path | Controller | Description |
|--------|------|-----------|-------------|
| POST | `/login` | userAuthController | Student login (+ auto-sync from main DB) |
| GET | `/profile` | userAuthController | Get student profile + enrollments |
| POST | `/forgot-password` | userPasswordController | Send reset email |
| POST | `/reset-password` | userPasswordController | Reset password with token |
| GET | `/courses` | userCourseController | Get enrolled courses |
| GET | `/courses/:id` | userCourseController | Get course + lessons + progress |
| POST | `/progress/update` | userCourseController | Update lesson progress |
| GET | `/lessons/:lessonId/quiz` | userQuizController | Get quiz questions for a lesson |
| POST | `/lessons/:lessonId/quiz/submit` | userQuizController | Submit quiz answers + get score + award credits |
| GET | `/analytics` | adminAnalyticsController | Platform-wide stats |
| GET | `/announcements` | announcementController | List announcements |
| POST | `/announcements` | announcementController | Create announcement |
| GET | `/reports/completion` | adminReportController | Full student completion report |
| GET | `/certificates` | certificateController | List student certificates |

### Community Routes — `/api/community/*`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | Student | Get all posts |
| POST | `/` | Student | Create a post |
| GET | `/:id` | Student | Get a single post + comments |
| POST | `/:id/comments` | Student | Add a comment to a post |
| GET | `/admin/all` | Admin | Get all posts (admin view) |
| DELETE | `/admin/:id` | Admin | Delete a post + its comments |
| DELETE | `/admin/comments/:id` | Admin | Delete a single comment |

### Public Routes

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Student self-registration |
| POST | `/api/tickets` | Submit support ticket |

---

## 🔑 Models Reference

### User
```js
{ name, email, phone, cardNumber, serialNumber, courseId, bundleId,
  password (bcrypt hashed), status: 'active'|'blocked',
  resetPasswordToken, resetPasswordExpiry }
```

### Admin
```js
{ name, email, password (bcrypt hashed),
  role: 'superadmin'|'admin',
  twoFactorSecret, isTwoFactorEnabled }
```

### Course
```js
{ _id: String (custom), title, description, thumbnail, isPublished, modules[] }
```

### Lesson
```js
{ courseId, moduleId, title, videoId, source: 'vdocipher'|'youtube'|'upload',
  order, quiz: [{ question, options: [], correctAnswer }] }
```

### Enrollment
```js
{ userId, type: 'Course'|'Bundle', courseId, bundleId, assignedBy }
```

### Progress
```js
{ userId, courseId, completedLessons[], percentage, lastAccessedLesson }
```

### Card
```js
{ CardNumber, CVV, SerialNumber, status: 'unactivated'|'activated'|'used'|'inactive' }
```

### Ticket
```js
{ name, email, cardNumber, subject, message, page,
  status: 'open'|'in-progress'|'resolved', adminNotes }
```

---

## ⚙️ Environment Variables

```env
PORT=5000
MONGO_URI=                    # LMS database
JWT_SECRET=                   # JWT signing key
FRONTEND_URL=                 # Student app URL (CORS whitelist)
FRONTEND_STUDENT_URL=         # Used in password reset email links
ADMIN_URL=                    # Admin app URL (CORS whitelist)
VDOCIPHER_API_KEY=            # VdoCipher REST API key
BREVO_API_KEY=                # Must start with xkeysib-
ADMIN_EMAIL=                  # Receives ticket notifications
BREVO_SENDER_EMAIL=           # Verified sender address in Brevo
```

---

## 🌱 Seeding Data

```bash
# Seed activation cards
node seedCard.js

# Test Brevo email
node testBrevoApi.js
```

---

## 🚀 Running the Server

```bash
npm run dev    # nodemon (auto-restart on file change)
npm start      # Production
```

---

## Request Flow (High Level)

1. Client sends request with optional Bearer JWT.
2. Route-level middleware verifies role (`protectUser`, `protectAdmin`, `protectPlatform`).
3. Controller validates payload, performs DB operations via models/services.
4. Optional integrations are invoked (Brevo, Cloudinary, VdoCipher, Bunny).
5. Response returns normalized JSON or error.

---

## CORS and Origin Rules

`server.js` builds allowed origins from:

- hardcoded production origins
- `FRONTEND_URL`
- `ADMIN_URL`
- comma-separated `ALLOWED_ORIGINS`

Localhost and 127.0.0.1 variants are automatically allowed for development.

---

## Route Prefixes Mounted in `server.js`

- `/api/auth`
- `/api/admin`
- `/api/user`
- `/api/platform`
- `/api/sync`
- `/api/certificates`
- `/api/vdocipher`
- `/api/bunny`
- `/api/tickets`
- `/api/community`

---

## Environment Variables (Expanded)

```env
PORT=5000
NODE_ENV=development
MONGO_URI=
MONGODB_URI=
JWT_SECRET=

FRONTEND_URL=
ADMIN_URL=
ALLOWED_ORIGINS=
VITE_STUDENT_URL=

ADMIN_EMAIL=
BREVO_API_KEY=
BREVO_SENDER_EMAIL=

CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

VDOCIPHER_API_KEY=
BUNNY_STREAM_LIBRARY_ID=
BUNNY_STREAM_API_KEY=
PLATFORM_SECRET_KEY=
```

---

## Troubleshooting

- **CORS blocked request**
  - Add the frontend origin into `ALLOWED_ORIGINS` or `FRONTEND_URL`/`ADMIN_URL`.
- **JWT verification errors**
  - Ensure all services use same `JWT_SECRET` and correct token type.
- **DB connect failure**
  - Validate `MONGO_URI`/`MONGODB_URI`, IP access, and DB user permissions.
- **Email not sent**
  - Verify `BREVO_API_KEY` and sender identity.
- **Media upload/playback issues**
  - Check Cloudinary/VdoCipher/Bunny keys and route payloads.
