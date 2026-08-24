# Career Path (FuturePath)

The AI career-roadmap section of the **student** web app. It was a standalone
MERN app ("FuturePath") and was merged into this monorepo rather than deployed
beside it, so students get one login, one database and one deploy.

It is student-only by design. Nothing was added to `yaticorp-lms-admin`, and the
standalone app's own admin panel was not ported.

---

## Where it lives

| | |
|---|---|
| API | `yaticorp-lms-server/src/career/`, mounted at `/api/career` (one line in `server.js`) |
| UI | `yaticorp-lms-student/src/career/`, routed at `/career/*` |
| Nav | "Career Path" in the student sidebar (`layouts/StudentLayout.jsx`) |

Ten screens: Overview, Today's Plan, Calendar, Roadmap, Skills, Ideas &
Resources, My Progress, Rewards, AI Mentor, Settings — plus a five-step
onboarding wizard at `/career/onboarding`.

---

## Decisions worth knowing before you edit it

**One identity, not two.** FuturePath had its own `User` collection and its own
sign-in. Both were dropped. `src/career/middleware/authMiddleware.js` maps the
`protect` name every ported route uses onto the LMS `protectUser` guard, and
`src/career/models/User.js` re-exports the LMS `User`. Those two files are the
whole of the auth merge — the ported controllers were not edited.

**XP lives on the student, not on a roadmap.** `xp`, `level`, `lastActiveDate`
and `dailyTimeBudget` were added to `src/models/User.js`. They are additive with
defaults, so existing student documents need no migration: an untouched account
reads as level 1 with 0 XP.

**Every other model is namespaced.** The database is shared, so a collection
called `tasks`, `badges` or `notifications` is the first thing a future LMS
feature collides with. Each model registers as `Career*` over a `career_*`
collection — `CareerTask` → `career_tasks`, and so on. If you add a model here,
follow the pattern, and point its `ref:` at the `Career*` name (`ref: 'User'` is
the one exception: that really is the LMS student).

**The CSS is scoped to `.futurepath`.** `src/career/career.css` carries the
section's design tokens *and* its base typography. The tokens are global —
`@theme` only generates utility classes (`bg-surface`, `text-ink-900`,
`border-line-200`), and none of them existed in the student app before. Anything
that used to style `body` or a bare element selector is now behind
`.futurepath`, which `CareerProviders` puts around the section. Left global, the
Inter stack and the `--canvas` background would have quietly restyled Dashboard,
Enrolled Courses and Community. Anything portalled to `document.body` from
inside the section has to opt back in with `className="futurepath-portal"`.

**API paths kept their shape, one level down.** `/api/roadmap` became
`/api/career/roadmap`. That is done once, in `src/career/services/api.js`, which
is an axios instance based at `${VITE_API_URL}/career` — so ported code still
reads `api.get('/tasks')` and needed no rewriting.

---

## It knows the course catalogue

Career Path is not a bolt-on that ignores the LMS around it. `src/career/services/lmsContext.js`
is the single place it reads the course side — read-only, best-effort, and
deliberately one file so the coupling stays reviewable. It feeds three things:

- **The roadmap and the recommendations** are generated with the student's
  enrolments and the published catalogue in the prompt, so a phase covered by a
  YATICORP course names that course instead of sending them to Coursera. The
  model returns `yaticorpCourses` with ids copied from the list it was given;
  the server then throws away anything whose id is not a real published course,
  so a hallucinated id can never render as a dead "Start this course" button.
- **Today's tasks** carry a `courseLesson` when a lesson in one of the student's
  own courses teaches that task, and the planner links straight to
  `/learn/:courseId`. Matching is a token-overlap score, not a model call —
  it runs per task, and asking Gemini would multiply the daily quota by the size
  of every plan. Two guards keep it honest: a 0.45 similarity threshold and a
  floor of two shared words, because a two-word title like "Practice Python
  Coding" otherwise scores 0.50 against any Python lesson on the strength of one
  generic word.
- **The mentor** sees each course and how far through it the student is, and is
  told to point at half-finished work first. Asked "what should I learn next?",
  it now answers with the course they are 45% through rather than a YouTube
  channel.

All of it degrades to the old behaviour if the course lookup fails: no context
in the prompt, no lesson links, and the section works exactly as it did before.

---

## It shares the panel's furniture

Career Path is not a second app wearing the LMS's shell:

- **One notification bell.** Career Path arrived with a bell inside its own
  section, so a badge earned on Monday was only discoverable by going back into
  Career Path. Both feeds now land in the header bell (`StudentLayout`), tagged
  `NOTICE` or `CAREER`, newest first; opening the panel marks the career ones
  read server-side. `DELETE /api/career/notifications` clears them in one call.
- **One search box.** The sidebar queries the LMS search and
  `GET /api/career/search` together and merges the results. Two endpoints rather
  than one on purpose: the LMS must never read `career_*` data, so composing
  them is the frontend's job (see the note in `career/controllers/searchController.js`).
- **Shareable badges for roadmap phases.** Finishing a phase earns a milestone
  badge, not a certificate — see below.

### Milestone badges

Finishing a roadmap phase earns a badge built to be posted. A PDF certificate
was the obvious move — the LMS already issues one for finishing a course — but
a certificate lands in a downloads folder and is never seen again. A badge has
a public link and an image sized for a feed.

- **The image** is drawn by `career/services/badgeImage.js` with node-canvas at
  1200×630. Not square: a badge is almost never opened as a file, it is seen as
  the preview card on a link, and LinkedIn, X and WhatsApp all crop to roughly
  1.91:1. A square badge loses its top and bottom in the only place it is
  actually looked at.
- **The share link** is `/b/<code>` — mounted in `server.js`, outside `/api`
  and outside auth, because the crawler that fetches it has no account and
  never will. `<code>` is 16 hex characters from a CSPRNG; that is what keeps
  badges from being enumerable, and nothing in the response identifies the
  student beyond the name on the badge.
- **The page** at that link carries Open Graph *and* Twitter card tags — X
  reads its own set and ignores the rest. Everything interpolated into it is
  escaped once: the phase title comes from a language model and the name from
  the student, and both land in a public page.
- **Snapshots, not lookups.** Name, phase title and goal are copied onto the
  badge when it is issued. The link is permanent and public: it has to render
  for a stranger long after the student regenerated their roadmap or changed
  their goal.
- **Issued lazily**, when the student first opens the share sheet — minting a
  public link for someone who never asked to post anything is not a decision to
  make on their behalf. Re-opening it reuses the same link.

Badges appear under *Milestones* on the Rewards page, deliberately grouped apart
from the XP badges there: those are unlocked by accumulating XP and never leave
the app.

**Deploy note:** node-canvas draws text through fontconfig. A slim Linux image
with no fonts installed renders the badge silently blank — the renderer logs a
clear error when it detects this, but the fix is to install a font package
(`fonts-dejavu-core` and `fontconfig` on Debian/Ubuntu). Set `PUBLIC_API_URL`
so share links point at the public hostname rather than an internal one; a
posted link cannot be taken back.

### XP and credits are deliberately NOT the same thing

They are shown side by side on the profile and named plainly on the Rewards
page, but nothing converts between them. Credits are bounded and auditable —
one award per quiz, worth the student's score. Career Path XP is not: a student
can ask the planner for another task whenever they like. Feeding an unbounded
source into a figure the LMS treats as earned (and that
`buyCourseWithCredits` is clearly meant to spend one day) is the kind of thing
that cannot be undone once students hold balances. If you do want a conversion
later, it needs a per-day cap and an admin switch, not a multiplier.

---

## Running it without it running away

**Every Gemini call is metered.** Not at the fourteen call sites — at
`generateWithRetry`, the single funnel they all pass through. Whose call it is
comes from an `AsyncLocalStorage` store opened by the router
(`services/aiContext.js`), which is what lets the meter attribute a generation
started three layers deep inside `dailyPlanService` without a userId being
threaded through every signature. One row per call in `career_ai_usage`, tagged
with the feature that spent it.

**Two caps**, both in `services/aiQuota.js`:
`CAREER_AI_DAILY_PER_STUDENT` (default 30) stops one person draining the day by
hammering Regenerate; `CAREER_AI_DAILY_TOTAL` (default 0 = off) is a
whole-service ceiling. Neither replaces billing — they make running out bounded
and legible instead of sudden.

Running out is **429 with a `code`**, never a 500: `student-daily-cap`,
`service-daily-cap` or `provider-daily-quota`. The student sees a notice saying
which allowance ran out, when it returns, and that nothing already generated is
lost — and the header shows what is left once it drops below five. Reading the
app never depends on the budget: the roadmap, the plan, past lessons and badges
all stay available. The planner in particular degrades rather than failing,
because building today's plan is itself a Gemini call.

If the meter itself cannot be read, the call is **allowed through**. A cap
exists to protect a budget; enforcing it by breaking the feature when Mongo
hiccups gets that backwards.

## What an administrator can see

`/career-path` in the admin app, served by `career/routes/adminRoutes.js` behind
the LMS's own `protectAdmin`. Read-only, and no endpoint returns a named
student's roadmap, tasks or mentor conversation — Career Path stays a student
feature.

It answers two questions that were previously invisible. **What students are
aiming for** — careers, education levels, branches and locations, aggregated
case-insensitively because students type them by hand. That is the clearest
signal available about which course to build next. And **what the AI is
costing** — today's calls broken down by feature, a fortnight of history, the
heaviest users, and how many students have hit their cap (the number that tells
you the cap is set too low).

It lives inside the career module rather than in `adminRoutes.js` so the
dependency still points career → LMS and never the reverse.

---

## Configuration

Three new server variables (see `yaticorp-lms-server/.env.example`):

- `GEMINI_API_KEY` — **required**. Roadmaps, daily tasks, lessons and the mentor
  all fail without it.
- `GEMINI_MODEL` — optional, defaults to `gemini-flash-lite-latest`. The free
  tier is metered *per day, per model*: the newest flash models allow ~20
  requests/day and a single onboarding costs 3, which is why the default is the
  lite model.
- `YOUTUBE_API_KEY` — optional. Lessons embed a real video when it is set and
  fall back to a search link when it is not.

The student app needs no new variables — same `VITE_API_URL`, same host.
