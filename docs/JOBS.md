# Jobs (CareerCompass)

The job board of the **student** web app. It was a standalone MERN app
("CareerCompass") and was merged into this monorepo rather than deployed beside
it, so students get one login, one database and one deploy — the same treatment
[Career Path](./CAREER-PATH.md) got.

It ranks real listings — ingested from global job boards into MongoDB — against
a student's skills, and tells them which skills they still need for the role
they want.

---

## Where it lives

| | |
|---|---|
| API | `yaticorp-lms-server/src/jobboard/`, mounted at `/api/jobs` (one line in `server.js`) |
| UI | `yaticorp-lms-student/src/pages/Jobs.jsx` + `src/jobs/`, routed at `/jobs` |
| Nav | "Jobs" in the student sidebar (`layouts/StudentLayout.jsx`) |
| Lock | Platform Settings → Student Features, in the admin app |

**Not `src/jobs/` on the server.** That directory already existed and holds
`ticketCleanup.js` — a scheduled background task, the other meaning of "job".
The port lives in `src/jobboard/` so the two are never confused.

---

## Decisions worth knowing before you edit it

**One identity, not none.** CareerCompass was anonymous: it identified a browser
by a `sessionId` it generated itself and put in localStorage. Inside the LMS
every caller is signed in, so searches are keyed on the real user, and
`GET /meta/history` reads the session rather than a query parameter — a
guessable id in a URL would have let one student read another's searches.

**The models are namespaced.** Every schema registers as `JobBoard*` over a
`jobboard_*` collection: `jobboard_jobs`, `jobboard_roles`, `jobboard_geocache`,
`jobboard_embeddings`, `jobboard_searches`, `jobboard_api_usage`. Without that,
generic names — `Job`, `Role`, `Search` — would collide with any LMS model added
later. Same convention as `career_*`.

**Admin routes are mounted ahead of the lock.** `/api/jobs/admin/*` is guarded by
`protectAdmin` and sits above both the feature gate and `protectUser` in
`src/jobboard/index.js`. Locking the section for students must not stop an
operator refreshing the index; and an admin holds an admin token, not a student
one, so it could not pass the student guard anyway.

**Ingestion is not a student endpoint.** The standalone app exposed
`POST /api/jobs/ingest` to anyone. It spends metered JSearch and Adzuna calls, so
here it is `POST /api/jobs/admin/ingest`. The handler stays in `routes/jobs.js`
and is exported, because it shares the lazy-ingest cooldown with the search path:
a manual refresh has to satisfy that cooldown too, or the next student search
re-fetches everything an admin just pulled.

**Rate limiting is per student, not per IP.** A college behind one NAT would
otherwise share a single 120/minute allowance between everybody in the building.

**Two form fields were dropped.** The standalone form refused to search without a
resume upload and an experience level. Neither was ever sent to the ranking
endpoint — they blocked a search without changing a single result. Expected
salary is kept, but as an optional field that labels each listing's pay rather
than filtering anything.

**ESM → CommonJS.** CareerCompass was `"type": "module"`. The conversion was
mechanical (`import` → `require`, `export` → `module.exports`); the logic in
`services/` was not otherwise edited.

---

## Filling the index

The board ships empty. Nothing works until it has listings.

```bash
cd yaticorp-lms-server
npm run jobs:seed      # role taxonomy (135 roles) — run once
npm run jobs:ingest    # pull listings — schedule this daily
npm run jobs:geocode   # resolve place names so distance ranking works
npm run jobs:setup     # all three, in order
```

Optional, and only useful once the above has run:

```bash
npm run jobs:embed     # Gemini vectors for semantic matching
npm run jobs:dedupe    # collapse the same role posted to several boards
npm run jobs:warm      # pre-resolve popular cities
```

`jobs:geocode` is the slow one — it resolves each distinct place name at about
one per second and caches the answer permanently, so only the first run pays for
it.

---

## Job sources

Keyless and always on: employers' own Greenhouse and Ashby boards (the registry
is `src/jobboard/data/companies.js`), plus Remotive and Arbeitnow. These supply
the bulk of the index and a real careers URL per company.

What they cannot answer is "what is hiring near *this* town" — they publish
wherever the employer has an office, which in practice means tier-1 cities. Read
every board in the registry and you get Bengaluru, Hyderabad and Pune, and
nothing in Mangalore, Udupi or Mysore. Either **JSearch** (Google for Jobs) or
**Adzuna** fixes that, and one is enough. Both are free tier and both are
optional — see `.env.example`.

---

## Matching

Five weighted signals in `services/matchService.js`:

| Signal | Weight | What it compares |
|---|---|---|
| Skills | 0.38 | how much of the listing's requirements the student covers |
| Role | 0.22 | the words in the job title against the target role and its aliases |
| Semantic | 0.15 | meaning, via Gemini embeddings — off unless `jobs:embed` has run |
| Type | 0.12 | Full-time / Part-time / Internship / Contract |
| Location | 0.13 | true distance, once `jobs:geocode` has run |

With no Gemini key the four deterministic signals are reweighted to sum to 1.
Results stay correct, just more literal — a React developer will not be matched
to a Vue job describing identical work.

---

## LMS integration

Three things tie the board into the rest of the LMS rather than beside it:

**Career Path pre-fill.** On a first visit with an empty URL, the Jobs page
reads the student's Career Path goal and skills (`/api/career/goals`,
`/api/career/skills`) and fills the form — and if the result validates, the
first search runs itself. Only skills actually progressed (40%+ or past
Beginner) are carried over: prefilling every roadmap skill would claim
knowledge the student is still working towards, and the readiness score would
congratulate them on being ready for a job they are not. Career Path locked or
empty is a non-event — the form just starts blank.

**Skill gap → courses.** `services/lmsCourses.js` matches the gap's missing
skills against published course titles and descriptions, and the gap card
renders a "We teach this" link per course (grouped by course — one enrol
decision may close several gaps). Matching is conservative on purpose: skills
under three characters never match, and plain-word skills use word boundaries
so "Java" cannot claim a JavaScript course. A wrong link costs more than a
missing one.

**Job alerts.** `services/alertService.js` runs daily (scheduled in
`server.js`, alongside ticket cleanup): each student's most recent search
(within 14 days) is re-ranked against only the listings that arrived since the
last run, at a higher score bar than the search page uses (25 vs 15). A match
becomes a notification in the student bell — third feed beside announcements
and Career Path — deep-linking back to the exact search. One unread alert per
student, ever; the run timestamp lives in `jobboard_state`, so redeploys and
second instances cannot double-announce a day. Locked section → no alerts.

---

## Keeping the index alive

The index maintains itself. `server.js` schedules two runs alongside ticket
cleanup:

| Run | Cadence | What it does |
|---|---|---|
| Maintenance | daily | re-ingest every source, retire listings unseen for 45 days, geocode up to 200 new place names |
| Alerts | daily, after maintenance | notify students whose last search matches newly arrived listings |

"Daily" is enforced by a database-backed claim (`jobboard_state`), not by the
interval: the interval fires every 6 hours, the claim lets exactly one caller
through per ~20h window — so redeploys cannot double-run a day and on a
multi-instance host exactly one instance wins. The same collection holds every
cooldown in the module: the per-country lazy refresh (`ingest:<CC>`) and the
per-city metered fetches (`city-ingest:<city|cc|role>`) moved there from
in-memory Maps, which reset on deploy and multiplied per instance.

Set `JOBS_AUTO_INGEST=false` to hand this to a real cron instead.

A search never waits on freshness it doesn't need: a populated-but-stale index
answers immediately from the store and refreshes behind the response, with
`refreshing: true` in the payload — the UI tells the student newer listings
are loading. Only a genuinely empty index blocks, and then for at most 15
seconds before answering with whatever has arrived.

---

## Student conveniences

**Saved jobs** (`jobboard_saved`). The bookmark on each card copies the listing
server-side — a snapshot, not a reference, because the index churns nightly and
a bookmark that vanished with its listing would read as the student's mistake.
The saved view (header toggle on the Jobs page) renders the snapshots without
match scores — a percentage belongs to a search, not a bookmark — and flags a
listing the index has since retired as "May be filled". One bookmark per
listing per student, enforced by a unique index; save is idempotent.

**Recent searches.** A row of chips above the results, from `GET /meta/history`
(per-user). One tap re-fills the form and re-runs the search.

**Pagination.** Results render 12 cards at a time with a "Show more" button —
sixty at once was a long first paint for a student who reads the top five.

## Admin page

"Jobs" in the admin sidebar renders `GET /api/jobs/admin/overview`: index size
and coordinate coverage, searches over 30 days, top searched roles / skills /
places, metered provider spend, and the semantic-matching status — plus the
same Lock/Unlock control Platform Settings has. The roles chart is the demand
signal: a role that keeps appearing there and matches no course in the
catalogue is a course waiting to be built.

---

## Three reconsidered behaviours

**Gemini allowance separation.** Embeddings prefer `JOBS_GEMINI_API_KEY` (any
of its forms); when one is set, the shared `GEMINI_API_KEY` — the key Career
Path's mentor runs on — is never touched, so a big embed run cannot starve a
mentor conversation mid-class. Without a dedicated key the shared one is used
as before, and the admin Jobs page shows an amber "shares Career Path's
allowance" flag. Embeds also moved off-peak: the nightly maintenance run
vectors up to 500 new or reworded listings, so `jobs:embed` is now a backfill
tool rather than a routine.

**The company registry** (`data/companies.js`) took seven India-relevant
employers beyond pure tech — Paytm, Freshworks (Chennai), InMobi, Porter
(logistics), CRED, Cars24, ServiceNow — every token verified against its live
board API before being added. What could NOT be verified is the more important
finding: Indian hospitals and pharma (Practo, Tata 1mg, PharmEasy, Apollo,
Medibuddy, Pristyn) publish on none of the keyless ATSes. A cohort aiming at
medicine — and the onboarding data says part of this one is — is reachable
only through JSearch/Adzuna. The key matters more than the registry.

**The salary field is now a real filter.** "Hide pay below my expectation"
(under the salary input, active once a search has captured a figure) hides
listings whose *disclosed* pay falls below the expectation, using exactly the
comparison the cards' pay flags already show — list and labels cannot
disagree. Undisclosed and cross-currency pay always stays visible: most
employers publish no figure, and hiding them would silently empty the list. A
count-with-undo bar reports what was hidden, and "everything hidden by pay"
gets its own empty state so nobody edits skills that were fine.

**Career Path ↔ Jobs, visibly.** Beyond the silent prefill, the two sections
now point at each other. The Career Path Overview carries a "Jobs for you"
tile — top three live matches for the student's goal, ranked by the same
engine with the same profile the prefill sends, linking into /jobs. Its query
carries `quiet: true`, which skips search logging: an automatic tile query
must not pollute the admin demand charts, the student's recent-search chips,
or — worst — become the "latest search" the daily job alerts re-run. (Quiet
role-only queries are also why the recommend endpoint now accepts a
recognised role without skills; free text alone is still refused.) In the
other direction the Jobs skill-gap card knows whose goal it is looking at:
searching your own career goal links to the roadmap that turns the missing
skills into daily tasks; having no Career Path yet offers to build one for
this role; searching some other role says nothing — exploring is not a
commitment. Both directions respect the admin locks on each section.

---

## Resume parsing

"Drop your resume — the form fills itself." The panel's top card takes a PDF
(≤5 MB), Gemini extracts skills, experience level, education, past roles and a
one-line headline (`services/resumeService.js`), and a **review modal** stands
between the parser and the form: every extracted skill arrives as a ticked
chip the student can untick, and only what they confirm is applied — the
parser is instructed never to invent, but the student stays the authority on
their own resume.

Privacy is structural, not policy: the file is parsed from memory and
discarded in the same request; only the extraction persists
(`jobboard_resumes`, one document per student), it is shown in full on the
card, and the ✕ deletes it server-side. Extracted skills are normalised
against the job taxonomy so they slot straight into the ranking, and on a
blank first visit they join the prefill (resume first, Career Path progressed
skills second — written evidence beats bookkeeping).

Spend is bounded three ways: the job board's own Gemini keys (`JOBS_GEMINI_*`
when set), a monthly parse meter (`JOBS_RESUME_MONTHLY_LIMIT`, default 300),
and 5 parses per student per day. The parser retries an overloaded model once
and falls back to `JOBS_RESUME_FALLBACK_MODEL` before giving up. DOC/DOCX are
refused with instructions to export as PDF. The stored `seniority` and
`experienceYears` are the designed input for seniority-aware ranking when
that lands.
