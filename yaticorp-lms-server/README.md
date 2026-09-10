# YatiCorp LMS Server

Express/MongoDB backend API for authentication, organization/admin operations, student learning workflows, analytics, tickets, announcements, community, and media integrations.

## Stack

- Node.js + Express
- MongoDB + Mongoose
- JWT auth (`protectAdmin`, `protectUser`, `protectPlatform`)
- Multer + Cloudinary for file uploads
- Brevo (transactional email)
- VdoCipher and Bunny integrations

## Entry Point and Runtime

- Entry file: `server.js`
- Default port: `5000` (`PORT` env overrides)
- CORS behavior:
  - allows localhost/127.0.0.1 origins dynamically
  - allows configured production origins via env
  - allows no-origin requests (mobile/Postman/server-to-server)
- Scheduled job:
  - ticket cleanup runs hourly and once at startup

## Folder Layout

```text
src/
  config/       DB and third-party configs
  controllers/  Route handlers and domain logic
  jobs/         Scheduled/background tasks
  middleware/   Auth, rate-limit, upload, guards
  models/       Mongoose schemas
  routes/       Route definitions by module
  services/     Supporting service utilities
  utils/        Shared helpers
```

## API Modules

Base URL: `http://localhost:5000/api`

- `authRoutes` (`/api/auth`)
  - card/QR registration + student/admin/platform auth
  - password reset and admin 2FA setup/verify flows
- `adminRoutes` (`/api/admin`)
  - users, admins, courses, modules, lessons, quizzes
  - bundles, enrollments, announcements, reports, tickets, settings
- `userRoutes` (`/api/user`)
  - profile/settings/password, course access, progress, quiz attempt
  - tickets, certificates, announcements, search
- `platformRoutes` (`/api/platform`)
  - organization CRUD + platform analytics + org admin management
- `communityRoutes` (`/api/community`)
  - student post/comment CRUD and admin moderation actions
- `vdoCipherRoutes` (`/api/vdocipher`)
  - upload credentials, video status, OTP generation, delete video
- `bunnyRoutes` (`/api/bunny`)
  - Bunny stream/video helper endpoints
- `certificateRoutes` (`/api/certificates`)
  - generate and fetch student certificates
- `ticketRoutes` (`/api/tickets`)
  - ticket creation/reply helpers
- `syncRoutes` (`/api/sync`)
  - activation/sync utility route(s)

## Environment Variables

Create `.env` in this folder. Commonly used keys:

```env
PORT=5000
NODE_ENV=development
MONGO_URI=
MONGODB_URI=
JWT_SECRET=

FRONTEND_URL=http://localhost:5173
ADMIN_URL=http://localhost:5174
ALLOWED_ORIGINS=
VITE_STUDENT_URL=http://localhost:5173

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

# Interview Ready (see docs/INTERVIEW.md) — uses GEMINI_API_KEY; both optional
INTERVIEW_AI_MODEL=                     # defaults to GEMINI_MODEL
INTERVIEW_AI=                           # set to "template" to run without AI
```

## Global Quiz

A general-knowledge paper every student can take, drawn from a bank an
administrator writes. It is deliberately **not** built from the quizzes inside
courses: those belong to their lessons, are already scored there, and reusing
them would make this a re-run of work the student has done rather than
something new.

The bank is one collection, `global_quiz_questions` (`models/GlobalQuestion.js`):
a question, two to six answers, which one is right, an optional explanation, a
free-text category, a difficulty, and `isPublished` so a draft can be held back.

**Admin** (admin → Global Quiz) manages it through
`GET/POST /api/admin/global-quiz` and `PUT/DELETE /api/admin/global-quiz/:id`.
Those routes carry the answers, which is why they sit behind `protectAdmin`.
Two settings live in `Setting.globalQuiz` and save through
`PUT /api/admin/settings`: `enabled` (off removes the student tab and closes
both student endpoints with `GLOBAL_QUIZ_OFF`) and `defaultLength` (3-25).

**Students** get `GET /api/user/quizzes/global?limit=10`, which returns a
shuffled selection of published questions without their answers, and
`POST /api/user/quizzes/global/submit` with `{ answers: [{ questionId, answer }] }`,
which marks them and returns the right answers with their explanations. The
quiz is practice: no credits, no course progress, no pass marks, no reward
activity, so it cannot inflate the credit balance or the "quizzes passed"
figure. The student sees it as the **Global Quiz** tab on the dashboard
(`yaticorp-lms-student/src/components/GlobalQuiz.jsx`).

## Scripts

- `npm run dev` - run with `nodemon`
- `npm start` - run with Node
- `npm run build` - no-op placeholder
- `npm test` - every server suite (`node --test`, one file at a time because
  they share one database); needs `MONGO_URI`
- `node scripts/seedDemoLeaderboard.js` - eight sample learners so the
  leaderboard shows a ladder instead of an empty table. Ordinary accounts at
  `@demo.invalid` (a reserved domain that can never receive mail) with long
  random passwords, ranking through the same XP ledger as everyone else and
  listed for administrators like any other student. Students see them as
  peers. `--remove` deletes them and everything they earned.

## Local Development

1. Install deps:
   ```bash
   npm install
   ```
2. Create `.env` with required values.
3. Run server:
   ```bash
   npm run dev
   ```
4. Health check:
   - `GET /` returns API running message

## Integration Notes

- Web clients usually call `/api/*` via `VITE_API_URL`.
- Some reset/login URLs use `VITE_STUDENT_URL` fallback to localhost.
- For production, configure explicit frontend origins through env to avoid CORS failures.
