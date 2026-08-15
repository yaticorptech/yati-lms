# YatiCorp LMS Admin

Admin web application for operating the LMS: student management, course/bundle authoring, enrollment, analytics, tickets, announcements, and platform access.

## Stack

- React 18 + Vite
- React Router
- Axios
- Tailwind CSS
- Lucide React
- `@hello-pangea/dnd` (drag-and-drop authoring/reordering)

## App Structure

```text
src/
  components/   Shared UI primitives and dialogs
  context/      Auth context and session state
  hooks/        Common hooks (including refresh hooks)
  layouts/      `AdminLayout` shell and navigation
  pages/        Route-level pages and editors
  utils/        API clients and auth/session helpers
```

## Routes

Defined in `src/App.jsx`:

- Public
  - `/login`
  - `/platform/login`
  - `/platform`
- Protected (inside `AdminLayout`)
  - `/` (dashboard)
  - `/users`
  - `/courses`
  - `/courses/:id`
  - `/courses/:courseId/lessons/:lessonId`
  - `/bundles`
  - `/enrollments`
  - `/settings`
  - `/tickets`
  - `/community`
  - `/analytics`
  - `/announcements`

## Environment

Create `.env` (or copy from `.env.example`):

```env
VITE_API_URL=http://localhost:5000/api
VITE_STUDENT_URL=http://localhost:5173
```

- `VITE_API_URL` is required for production and expected for local.
- `VITE_STUDENT_URL` is used for student-facing navigation links from admin workflows.

## Scripts

- `npm run dev` - start Vite dev server
- `npm run build` - build production assets
- `npm run preview` - preview built assets
- `npm run lint` - run ESLint

## Local Development

1. Install dependencies:
   ```bash
   npm install
   ```
2. Configure `.env`.
3. Run app:
   ```bash
   npm run dev
   ```
4. Ensure backend (`yaticorp-lms-server`) is running and reachable from `VITE_API_URL`.

## Operational Notes

- Authentication state is managed via `AuthContext`.
- Most features depend on `/api/admin/*` endpoints.
- Platform login and dashboard routes are separate from regular admin login flow.
