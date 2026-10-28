# Group Brain — setup and deployment

Group Brain is the students' group brain-games feature: ten games played in
rooms (Games → Group games in the student app), with server-side scoring,
leaderboards, achievements, chess ratings, tournaments and certificates, and
an admin page (Group Brain in the super admin's menu).

## Where things are

| Part | Code |
|---|---|
| Games (rules, scoring) | `src/competitions/games/` — `chess.js`, `quizCore.js` (Pattern Master, Number Logic, Word Logic, Deduction Detective, Spatial IQ), `roundCore.js` (Memory Matrix, Sequence & Reaction, Strategy Arena), `sudoku.js`; questions in `games/banks/` |
| Rooms | `src/competitions/services/roomService.js`, played through `gameService.js` |
| Results, XP, ratings, flags | `src/competitions/groupbrain/results.js` |
| Dashboard numbers, leaderboards, Brain Performance Score | `groupbrain/stats.js` |
| Achievements, automatic certificates | `groupbrain/awards.js`, `groupbrain/certificates.js` |
| Tournaments, admin questions, settings, audit | `groupbrain/tournaments.js`, `questions.js`, `settings.js` |
| Admin API | `groupbrain/admin.js` → `/api/competitions/group-brain/admin/*` (super admin only) |
| Public certificate check | `GET /api/competitions/group-brain/verify/:certId`; student app page `/verify/group-brain/:certId` |

## The 3D adventure game

Lost Treasure is a room
game like the others (create, code, lobby, ready, start, results, XP), on
one engine: `src/competitions/games/stageCore.js`, with their stages and maps
made fresh each game in `games/banks/adventure.js`. Every player runs the same
stages against the same clock at their own pace; the server checks every
answer and move (a move names its stage, so a double click cannot count
twice), keeps each player's answers private (others see only progress), and
ends the game when everyone has finished, failed or left, or time runs out.

The student app draws them in 3D with **three.js** (`npm install` in
`yaticorp-lms-student` adds it; it loads only when one of these games opens).
The scenes are built in code — no model or texture files to host — in
`src/competitions/games/adventure/scenes/`. Sound is made live with the Web
Audio API (`adventure/audio.js`), starts only after the player taps, and has
mute, music and volume controls. A browser without WebGL gets a drawn
backdrop and plays the same; neither the scene nor the sound decides
anything.

## Database

Group Brain uses the LMS's existing **MongoDB** (Mongoose), like the rest of
the platform; no other database is needed.

- Games are `competition_games` documents (`kind: 'room'`).
- Everything else — results, profiles (chess ratings), achievements,
  certificates, settings, tournaments, admin questions, audit log — is in
  **one** collection, `group_brain`, told apart by its `type` field.

It is one collection on purpose: the Atlas cluster this runs on has a limit of
500 collections, shared by every database on it, and it was already at that
limit (504) on 2026-10-27. **Before deploying, make sure the production
cluster can create one more collection** (drop unused databases or
collections, or move to a larger cluster tier); otherwise the first Group
Brain write fails with "cannot create a new collection". Mongoose creates the
collection and its indexes by itself on first use; there is no migration to
run.

Duplicates are stopped by unique indexes (one result per game and player, one
achievement per player and key, one valid certificate per player and rule,
unique certificate IDs) and XP by the XP ledger's own key, so a retry, a
second server or a refresh can never record or pay twice.

## Environment

No new variables. Uses the existing ones:

- `MONGO_URI` (or whatever the server already connects with)
- `JWT_SECRET`
- `FRONTEND_URL` — the student app's address; certificate QR codes and the
  verify link point to `${FRONTEND_URL}/verify/group-brain/<ID>`. Set it to
  the production student URL.

Libraries used are already in `package.json`: `chess.js`, `pdfkit`, `qrcode`.

## Running

1. `cd yaticorp-lms-server && npm install && npm start` (the sweeper starts
   with the server unless `GAMES_SWEEP=off`; it times out turns, closes rooms
   nobody started within 2 hours, records any result a restart missed, and
   finalises tournaments that have ended).
2. `cd yaticorp-lms-student && npm install && npm run build` (or `npm run dev`).
3. `cd yaticorp-lms-admin && npm install && npm run build` (or `npm run dev`).

Run more than one server instance safely: every game write is conditional on
the game's version, and recording a result claims the game first.

## Real-time (Socket.IO)

Rooms and games are live: `src/competitions/realtime.js` runs Socket.IO on
the API's own port (path `/socket.io`). A player's browser connects with
their sign-in token and follows only games they are seated in. Every change
to a game (join, ready, start, answer, move, timer) is pushed to its players
at once as `game:changed`; each browser then fetches its own view from the
API, so hidden information (another player's answer) never leaves the
server. Polling continues as a slower fallback, so a dropped connection never
stalls a game.

Deployment:
- A reverse proxy (nginx, a load balancer) must pass WebSocket upgrades on
  `/socket.io/` (`Upgrade` and `Connection` headers); without it the socket
  falls back to long-polling, which still works.
- One server process is assumed. With several, add `@socket.io/redis-adapter`
  so a change made on one instance reaches players connected to another.
- The socket uses the same allowed origins as the API's CORS (`server.js`).

Presence: in a room's lobby a player not heard from for 20 seconds shows as
offline and the host cannot start until they are back or removed; a host gone
45 seconds hands the room to the next player still there.

## Tests

```
cd yaticorp-lms-server
node --test --test-concurrency=1 tests/competitions/groupBrain.test.js tests/competitions/groupBrain.banks.test.js tests/competitions/groupBrainScoring.test.js tests/competitions/groupBrainLive.test.js
```

## Notes

- The Brain Performance Score is a measure of how a student does in these
  games, shown on a 0–100 scale. It is **not** an IQ score and not a
  scientifically validated measure of intelligence; the student app and the
  certificates say so.
- A result is flagged (and its XP held until an admin approves it) when every
  answer is right faster than a person can read, a reaction is under 100 ms,
  a Sudoku is solved too fast, or the same players finish too many rooms in a
  day. The thresholds are in the admin page's Settings.
- Admin corrections (approve, void, adjust), certificate issue / reissue /
  revoke, room closing, settings and tournaments are all in the audit log.
