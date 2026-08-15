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
```

## Scripts

- `npm run dev` - run with `nodemon`
- `npm start` - run with Node
- `npm run build` - no-op placeholder

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
