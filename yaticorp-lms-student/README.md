# YatiCorp LMS Student

Student-facing web app for login/signup, course discovery, enrolled learning, profile management, and community interactions.

## Stack

- React 18 + Vite
- React Router
- Axios
- Tailwind CSS
- Lucide React
- `react-easy-crop` (profile image/cropping flows)

## App Structure

```text
src/
  components/   Reusable UI widgets
  context/      Auth/session context
  hooks/        Local hooks
  layouts/      Student shell layout
  pages/        Route components
  shared/       Shared hooks + LMS client abstraction
  utils/        API and helpers
```

## Routes

Defined in `src/App.jsx`:

- Public
  - `/login`
  - `/signup`
  - `/reset-password`
  - `/preview/:courseId`
- Protected (inside `StudentLayout`)
  - `/` (dashboard)
  - `/enrolled-courses`
  - `/profile`
  - `/learn/:courseId`
  - `/community`
  - `/community/:postId`

## Environment

Create `.env`:

```env
VITE_API_URL=http://localhost:5000/api
```

- `VITE_API_URL` is used by the Axios client.
- Missing value may cause warnings/fallback behavior in development but should be set explicitly.

## Scripts

- `npm run dev` - start Vite dev server
- `npm run build` - build production assets
- `npm run preview` - preview build locally
- `npm run lint` - run ESLint checks

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
4. Ensure backend server is running at `VITE_API_URL`.

## Functional Notes

- Uses token-based protected routes with `ProtectedRoute`.
- Course player and quiz/community data depend on `/api/user/*` and `/api/community/*` APIs.
- Preview route supports public pre-enrollment content views.
- Joining an organization (`src/organization/`) is offered in two places, and the
  dashboard is not a panel in either of them:
  - the signup form takes an **optional** Organization ID, sent with
    `POST /auth/register`. Leaving it blank changes nothing about signing up.
  - the dashboard hero carries an **Add organization** button beside the card,
    email and phone pills. It opens a popup and shows the organization's name once
    there is one.
  Entering an ID only looks the institution up; that organization's own admin
  approves the request. A student cannot leave on their own — ending a membership
  belongs to the organization, and there is no endpoint for it either. They can
  still withdraw a request nobody has answered yet.
