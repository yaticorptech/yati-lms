# Deployment Guide — YATICORP LMS

Three deployable units, all from this one repo:

| Service | Directory | Typical host | Build | Start |
|---|---|---|---|---|
| API | `yaticorp-lms-server` | Railway / Render | none | `npm start` |
| Student web | `yaticorp-lms-student` | Vercel | `npm run build` → `dist` | static |
| Admin web | `yaticorp-lms-admin` | Vercel | `npm run build` → `dist` | static |

Node **≥ 20.19** is required (Mongoose 9 and Vite 7). Each `package.json`
declares `engines`, so most hosts will pick a correct version automatically.

Deploy the **API first** — you need its public URL before building the web apps.

---

## 1. API server

Root directory: `yaticorp-lms-server`. No build step; start command `npm start`.
It listens on `process.env.PORT` and binds `0.0.0.0`, so platform port
injection works as-is. `trust proxy` is already enabled for correct rate
limiting behind a proxy.

Set every variable from [`.env.example`](yaticorp-lms-server/.env.example) in
the host's environment settings. `.env` is intentionally not committed.

The must-get-right ones:

- **`MONGO_URI`** — include the database name at the end (`.../yati_lms`).
  A name that doesn't exist is created silently and empty, and then *every*
  login fails with "invalid credentials" and no error appears in the logs.
- **`JWT_SECRET`** — changing it logs every user out.
- **`FRONTEND_URL` / `ADMIN_URL` / `ALLOWED_ORIGINS`** — the deployed web app
  URLs, no trailing slash. Wrong values mean the browser is refused on every
  API call while curl still works, which is a confusing way to lose an hour.
- **`SYNC_API_KEY`** — see the security section below.

Health check: `GET /` returns `200` with a plain-text banner. On boot the log
prints the CORS allowlist and `LMS MongoDB Connected: <host>` — check both
after any deploy.

## 2. Web apps (Vercel)

For each app, set the project's **Root Directory** to `yaticorp-lms-admin` or
`yaticorp-lms-student`. Framework preset: Vite. Build `npm run build`, output
`dist`. `vercel.json` already rewrites all routes to `index.html`, which
client-side routing needs.

Set **`VITE_API_URL`** to `https://<your-api-host>/api` — including the `/api`
suffix.

> Vite inlines this at **build** time, not run time. Changing the variable
> requires a **redeploy**; restarting does nothing. If it is unset, the app
> quietly falls back to `http://localhost:5000/api` and the deployed site is
> dead while looking perfectly fine in the build logs.

After deploying, add the resulting URLs to the server's `ALLOWED_ORIGINS` and
restart the API.

---

## Security checklist before going live

- [ ] **Set `SYNC_API_KEY`.** `POST /api/sync/activate` creates active users
      with a caller-supplied password and enrolls them. While the key is unset
      the endpoint is **completely open** — the server logs a warning on every
      such request. Set it on the API host **and** make the main website send
      the same value as an `x-sync-key` header. Setting it in only one place
      breaks activations with a 401.
- [ ] **Change the admin password** from any temporary value, via
      Admin → Settings.
- [ ] **Rotate the MongoDB password** if it has ever been shared or committed.
- [ ] **Confirm activation-card status is what you intend.** Every `activated`
      card can be redeemed by whoever holds it. Cards printed but not yet
      distributed should not be `activated`.
- [ ] **Confirm the student app's gate.** `ACTIVATION_PENDING` in
      `yaticorp-lms-student/src/App.jsx` — while `true`, every signed-in route
      shows the activation notice and the dashboard, courses, community and
      profile are unreachable. Set it to `false` to open the app.

## Operational notes

- **Every server start deletes resolved tickets older than 3 days**
  (`server.js`, `cleanupResolvedTickets`), then repeats hourly. This runs on
  each deploy and restart.
- **Env changes need a process restart.** Editing `.env` has no effect on a
  running server, and `nodemon` does not watch `.env` — it only watches `.js`.
- **The database name is part of `MONGO_URI`.** Switching it points the app at
  a different dataset with different users, admins and cards.

## Rollback

Web apps: redeploy the previous deployment in Vercel. API: redeploy the
previous commit. Neither rolls back database changes — data migrations must be
reversed by hand.
