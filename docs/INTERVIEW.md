# Interview Ready

The interview-preparation section of the **student** app: a readiness score,
a personalised practice bank, AI mock interviews, an evaluation report with
question-by-question feedback, an improvement plan tied to LMS courses, a
history, and XP and badges for all of it.

| | |
|---|---|
| API | `yaticorp-lms-server/src/interview/`, mounted at `/api/interview` |
| UI | `yaticorp-lms-student/src/interview/`, routed at `/interview/*` |
| Nav | "Interview Ready" in the student sidebar |

## What the interviewer knows

`studentContext.js` builds the candidate profile from the same learning data
the Learning Bio uses (`src/learningbio/learningDataService.js`): skills with
their evidence-backed status, ranked with roadmap skills first; completed and
ongoing courses; passed assessments and average score; projects (completed
build-type Career Path tasks); certificates; education; experience; the
career goal; interests. Nothing is invented, and the profile is snapshotted
on the session so the report judges answers against what was known then.

## The interview

`POST /sessions { type, role }` starts one of `hr`, `technical`, `project`,
`behavioral` or `full`. Each type has a stage plan (`PLANS` in `index.js`);
the full interview walks intro → about → background → skills → technical ×2 →
project → problem → behavioural → situational → candidate questions, then
closes. The server owns the plan and the question cap; the interviewer
(`aiInterviewer.js`) chooses the words: given the transcript, it either
follows up on the last answer (one follow-up per stage) or opens the next
stage, and pitches difficulty to the answers so far. Gemini answers JSON;
when it is not configured, over Career Path's daily AI budget, or answers
badly, `templateInterviewer.js` takes over with stage questions built from
the same profile and rule-based follow-ups — so the section always works,
and every session records which interviewer ran it.

`POST /sessions/:id/finish` evaluates the transcript: overall score, six
dimensions, strengths, improvements, a personal paragraph, a score, feedback
and a stronger example answer for every question, and a plan whose skills
are matched to published courses by `jobboard/services/lmsCourses.js`.

## The voice interview

`MockInterview.jsx` is an interview room, not a chat. `/interview/mock/new`
is the introduction (type, role, planned duration, and why the microphone is
needed — it is requested there, before the first question, and never
recorded: the browser's recogniser turns speech into text on the device).
`/interview/mock/:id` then runs the loop: the interviewer **speaks** the
greeting and the question (`speech.js`, Web Speech synthesis, sentence by
sentence because Chrome cuts long utterances) → the page **listens** (Web
Speech recognition, interim text shown live, stops after a few seconds of
silence) → the recognised answer is shown to **confirm, edit, or try again**
→ **Analyzing** while the server evaluates it and chooses the follow-up →
**Next question**, spoken. States are shown as a pill and on the avatar
(sound-wave while speaking, pulsing ring while listening, dots while
analysing). A timer counts against `plannedMinutes` per type and only nudges
when passed; "Question n of N", progress, a live transcript panel, speaker
mute, a mic button and End Interview are the controls.

Typing is always one tap away, and takes over on its own when recognition is
missing (Firefox), the microphone is refused or absent, the network drops,
or nothing was heard — each with its own message (`listenerErrorMessage`).
Both speech interfaces are small factories (`createSpeaker`, `createListener`)
so a hosted TTS/STT service can replace the browser's later.

**Delivery feedback.** A spoken answer carries what the recogniser could
measure — duration, long silences between phrases — and the server
(`communicationService.js`) recomputes word count, pace, filler words
("um", "you know", …) and hedging phrases ("I think", "maybe") from the text,
keeps them on the turn, and summarises them into the report's
`communication.notes` (pace, pauses, fillers, length, hedging, structure for
behavioural answers). Nothing claims to read mood or personality. The
summary is also handed to the AI evaluator so the communication and
confidence scores reflect delivery. `report.recommendation` is one sentence
built from the first two plan steps.

## Readiness

`readinessService.js`: Technical (skill statuses blended with quiz scores),
Problem solving (assessments and projects, then interview scores),
Communication and Confidence (recent interviews' scores, weighted towards the
latest; modest defaults before any), Interview practice (questions practised
and mocks completed). Weighted 30/20/20/15/15. The snapshot is written to
`interview_prep.readiness` so the rewards badge can read it.

## XP and badges

New activity types in `rewards/config/constants.js`, editable on the admin
Rewards page: `interview_practice` +5 (per question, once), `interview_prep`
+10 (five questions practised), `mock_interview` +30 (per finished session),
`interview_improved` +20 (beating your best), `interview_challenge` +50 (a
full interview scoring 75+, once a week). Badges: **First Mock Interview**
and **Interview Ready** (readiness ≥ 75). `configService` now merges the code
defaults under the saved rules, so rules added after the config document was
created are not read as 0.

## Configuration

`GEMINI_API_KEY` and `GEMINI_MODEL` as for Career Path. Optional:
`INTERVIEW_AI_MODEL` to use a different model here, `INTERVIEW_AI=template`
to force the built-in interviewer (useful for tests and demos).

## Tests

Both suites run on Node's built-in runner, no extra packages.

```
cd yaticorp-lms-server && npm test        # or npm run test:interview
cd yaticorp-lms-student && npm test
```

Server (`tests/interview/`): `communicationService.test.js` (delivery
metrics and notes), `templateInterviewer.test.js` (stage questions,
follow-ups, evaluation), and `interview.routes.test.js` — the whole section
through its real routes with a throwaway student against the database from
`.env`: guards, dashboard, practice bank, a session from first question to
report (follow-ups, voice metrics, closing, evaluation, recommendation, XP),
ownership, history and improvement, abandoning. Everything it creates is
deleted afterwards. `INTERVIEW_AI=template` is forced so no AI key is used.

Student (`tests/interview/`): the speech layer with a fake recogniser and
microphone — interim and final text, duration and long pauses, error
mapping, the no-recognition fallback, the speaker without synthesis, and
microphone permission outcomes.
