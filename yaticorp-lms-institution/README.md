# YATICORP Institution (Campus)

The student management system for organizations with **Campus** switched on
(superadmin → Organizations → Campus). Its own React + Vite app; the API is
`yaticorp-lms-server` (`src/campus`).

| Sign-in | Made where | Sees |
|---|---|---|
| Organization administrator | its own account | everything, every department; Departments; Exam board |
| Admission office | Departments → Admission office | New admissions for every department (a new student from their AI card, or one already in the organization), students' records, fees at the counter |
| Department (HOD/office) | Departments → Office sign-ins | its department: Overview, Students (the list the admission office admitted), Subjects, Attendance, Internal marks, Fees, Feedback |
| Examination board | Departments → Examination board | Semester exams: timetable, applications, admit cards, marks entry, marks cards, publish |
| Teacher | organization panel → Teachers (Organisation dashboard on) | My classes, Attendance, Internal marks for their subjects |

There is no sign-in page here. Everyone signs in on the **admin app's** sign-in page:
department, examination board and admission office sign-ins are sent straight to
Campus, signed in; the organization's administrator and teachers open it with
**Open Campus** in their panel. Signing out of Campus signs out of the admin app too.

Students with an AI card get an **Institution** tab on their Dashboard in the student
app, and their published marks cards on their profile.

```bash
cp .env.example .env      # VITE_API_URL, VITE_ADMIN_URL
npm install && npm run dev   # http://localhost:5175
```

Deploy like the admin app (static build, `vercel.json` rewrites); set `VITE_ADMIN_URL` to the admin app. Set the server's
`INSTITUTION_URL` to this app's address (CORS), and the admin app's
`VITE_INSTITUTION_URL` so the organization panel's "Open Campus" link points here.
