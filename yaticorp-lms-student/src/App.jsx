/**
 * @author Preethesh Kulal
 * @description Root React app with route definitions for student panel and course preview
 */
import React from 'react';
import { Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import useJobsAccess from './hooks/useJobsAccess';
import JobsLockedNotice from './jobs/JobsLockedNotice';
import { useContext } from 'react';
import { AuthContext } from './context/AuthContext';
import StudentLayout from './layouts/StudentLayout';
import YatiLoader from './components/YatiLoader';
import LoopWalker from './components/LoopWalker';
import { useLoopHidden } from './components/loopVisibility';
import { useSayPageOnNav } from './components/loopGuide';
import Login from './pages/Login';
import { loginPathFor } from './utils/sessionExpiry';
import { hasTeacherSession, enterEmbedded } from './teacher/teacherSession';
import EnrolledCourses from './pages/EnrolledCourses';
// A guardian answering a part-time job permission request. Outside the auth
// guard on purpose: a parent has no account and arrives from a link.
const GuardianReview = React.lazy(() => import('./opportunities/application/GuardianReview'));
const Privacy = React.lazy(() => import('./pages/legal/Privacy'));
const Terms = React.lazy(() => import('./pages/legal/Terms'));
const Jobs = React.lazy(() => import('./pages/Jobs'));
const Scholarships = React.lazy(() => import('./pages/Scholarships'));
// My Learning Bio — the AI-written, data-backed profile behind the dashboard card.
const LearningBioPage = React.lazy(() => import('./learningbio/LearningBioPage'));
const SharedBioPage = React.lazy(() => import('./learningbio/SharedBioPage'));
// Interview Ready — preparation, AI mock interviews, reports and history.
const InterviewDashboard = React.lazy(() => import('./interview/InterviewDashboard'));
// Competitions: online Chess, Ludo and Carrom in inter-college competitions.
const CompetitionsHome = React.lazy(() => import('./competitions/CompetitionsHome'));
// Extra Curricular: NCC, NSS, Scouts & Guides and the organization's clubs.
const ExtraCurricular = React.lazy(() => import('./nccnss/ExtraCurricular'));
const CompetitionDetail = React.lazy(() => import('./competitions/CompetitionDetail'));
const GamePage = React.lazy(() => import('./competitions/GamePage'));
const PracticePage = React.lazy(() => import('./interview/PracticePage'));
const AptitudePage = React.lazy(() => import('./interview/AptitudePage'));
const MockInterview = React.lazy(() => import('./interview/MockInterview'));
const InterviewReport = React.lazy(() => import('./interview/InterviewReport'));
const QuestionReview = React.lazy(() => import('./interview/QuestionReview'));
const InterviewHistory = React.lazy(() => import('./interview/InterviewHistory'));
// Job Preparation's tab strip: Mock Interview, Aptitude Test, Job Search.
const JobPrepShell = React.lazy(() => import('./interview/JobPrepShell'));
// Linguistic Ability: English learning, Beginner to Advanced.
const LinguisticShell = React.lazy(() => import('./linguistic/LingoShell'));
const LinguisticHome = React.lazy(() => import('./linguistic/LinguisticHome'));
const LinguisticPractice = React.lazy(() => import('./linguistic/PracticeHub'));
const LinguisticBadges = React.lazy(() => import('./linguistic/Badges'));
const LinguisticPlacement = React.lazy(() => import('./linguistic/Placement'));
const LinguisticModule = React.lazy(() => import('./linguistic/ModulePage'));
const LinguisticLesson = React.lazy(() => import('./linguistic/LessonPage'));
const LinguisticReview = React.lazy(() => import('./linguistic/Review'));
const LinguisticDaily = React.lazy(() => import('./linguistic/Daily'));
const LinguisticWriting = React.lazy(() => import('./linguistic/MyWriting'));

/**
 * Signed in, or off to the sign-in page — which is told where the student was
 * heading (?next=), so a shared or bookmarked link still lands there once they
 * have signed in. No loading screen: the saved student is known at once
 * (context/AuthContext), and a login the server no longer accepts is caught by
 * the first request it makes (utils/sessionExpiry).
 */
const ProtectedRoute = ({ children }) => {
  const { user } = useContext(AuthContext);
  const location = useLocation();
  // A teacher signed in on this device belongs on the teacher dashboard.
  if (!user && hasTeacherSession()) return <Navigate to="/teacher" replace />;
  if (!user) return <Navigate to={loginPathFor(`${location.pathname}${location.search}${location.hash}`)} replace />;
  return children;
};

/* The teacher dashboard (src/teacher): its own sign-in, layout and pages. */
/* From the organization panel's Research tab: take the teacher session it hands over, then open the page it asked for. */
const TeacherSso = () => {
  const params = new URLSearchParams(window.location.hash.slice(1));
  const token = params.get('token');
  const query = new URLSearchParams(window.location.search);
  const next = query.get('next') || '/teacher';
  if (!token) return <Navigate to="/login?as=teacher" replace />;
  let teacher = null;
  try { teacher = JSON.parse(params.get('teacher') || 'null'); } catch { /* the dashboard reads it again */ }
  // embed=1 inside the panel; without it ("Open in a new tab") the full dashboard.
  enterEmbedded(token, teacher, query.get('embed') === '1');
  return <Navigate to={next.startsWith('/teacher') ? next : '/teacher'} replace />;
};
const TeacherRoute = ({ children }) => (hasTeacherSession() ? children : <Navigate to="/login?as=teacher" replace />);
const TeacherProvider = React.lazy(() => import('./teacher/TeacherContext').then((m) => ({ default: m.TeacherProvider })));
const TeacherLayout = React.lazy(() => import('./teacher/TeacherLayout'));
const TeacherDashboard = React.lazy(() => import('./teacher/pages/TeacherDashboard'));
const TeacherMethodologies = React.lazy(() => import('./teacher/pages/Methodologies'));
const TeacherResearchPath = React.lazy(() => import('./teacher/pages/ResearchPath'));
const TeacherPublications = React.lazy(() => import('./teacher/pages/Publications'));
const TeacherThesisList = React.lazy(() => import('./teacher/pages/ThesisList'));
const TeacherThesisEditor = React.lazy(() => import('./teacher/pages/ThesisEditor'));
const TeacherWriting = React.lazy(() => import('./teacher/pages/Writing'));
const TeacherClubs = React.lazy(() => import('./teacher/pages/Clubs'));
const TeacherWritingEditor = React.lazy(() => import('./teacher/pages/WritingEditor'));
const TeacherPlagiarism = React.lazy(() => import('./teacher/pages/Plagiarism'));
const TeacherProfile = React.lazy(() => import('./teacher/pages/TeacherProfile'));
const teacherPage = (Page) => <React.Suspense fallback={<YatiLoader label="Loading this page" />}><Page /></React.Suspense>;

import Profile from './pages/Profile';
import Signup from './pages/Signup';
import AdminAccess from './pages/AdminAccess';
import NotFound from './pages/NotFound';
// Downloaded when first opened rather than with the sign-in page: the player
// brings the video players, the community its editor, and every student sees
// the sign-in page first. Login and Signup stay in the first download.
const CoursePlayer = React.lazy(() => import('./pages/CoursePlayer'));
const CoursePreview = React.lazy(() => import('./pages/CoursePreview'));
const ResetPassword = React.lazy(() => import('./pages/ResetPassword'));
import { RewardsProvider } from './context/RewardsContext';

// ─── Career Path (FuturePath) ────────────────────────────────────────────────
// The AI career-roadmap section, ported from the standalone FuturePath app. It
// is student-only and self-contained under src/career/; the API it talks to is
// mounted at /api/career on the same server, behind the same student token.
// Lazily loaded, shell and pages alike — the section pulls in chart.js and
// react-markdown, which no other student screen needs.
const CareerShell = React.lazy(() => import('./career/CareerShell'));
const CareerProviders = React.lazy(() => import('./career/CareerProviders'));
// The mascot workbench: dev builds only, reached by typing /dev/mascot.
const MascotDemo = import.meta.env.DEV ? React.lazy(() => import('./pages/dev/MascotDemo')) : null;
const CareerOverview = React.lazy(() => import('./career/pages/dashboard/Overview'));
const CareerPlanner = React.lazy(() => import('./career/pages/dashboard/Planner'));
const CareerCalendar = React.lazy(() => import('./career/pages/dashboard/Calendar'));
const CareerRoadmap = React.lazy(() => import('./career/pages/dashboard/RoadmapPage'));
const CareerSkills = React.lazy(() => import('./career/pages/dashboard/Skills'));
const CareerRecommendations = React.lazy(() => import('./career/pages/dashboard/Recommendations'));
const CareerProfile = React.lazy(() => import('./career/pages/Profile'));
const CareerBadges = React.lazy(() => import('./career/pages/dashboard/Badges'));
const CareerGames = React.lazy(() => import('./career/pages/dashboard/Games'));
const CareerSettings = React.lazy(() => import('./career/pages/dashboard/SettingsPage'));
const CareerOnboarding = React.lazy(() => import('./career/pages/Onboarding'));

/**
 * The lock an administrator can put on the whole section.
 *
 * Hiding the sidebar tab is not enough — /career is a URL a student may have
 * bookmarked, and the section's own pages would otherwise mount and start
 * calling an API that now answers 403. Waiting on `settingsLoading` matters:
 * the setting arrives with it, and redirecting before it does would bounce
 * every student off a section that is open. The wait is bounded — the
 * settings read gives up after ten seconds and leaves sections open.
 */
/**
 * The lock an administrator can put on the Jobs section, same shape as the
 * career one below: the sidebar tab is not the only way in.
 */
const JobsGate = () => {
  const { settingsLoading, isJobsEnabled } = useContext(AuthContext);
  if (settingsLoading) return <CareerFallback />;
  return isJobsEnabled ? <Outlet /> : <Navigate to="/" replace />;
};

/**
 * The second lock on Jobs, and the student's own to open: the section stays
 * shut until five of their Career Path skills are each at 25% or more (the
 * rule is the server's — see hooks/useJobsAccess). A few accounts are exempt.
 *
 * It shows a message rather than redirecting. A student who clicks Jobs has
 * asked a question, and "two more skills to 25%" answers it, where a silent
 * bounce back to the home page would not.
 */
const SkillsGate = () => {
  const { isCareerPathEnabled } = useContext(AuthContext);
  const access = useJobsAccess();
  // There used to be a VITE_JOBS_GATE_BYPASS flag here. It was read from the
  // build, which meant it opened Jobs for every account that signed in on the
  // machine that had it set, and opened nothing for those same accounts
  // anywhere else. Exemptions are per account now and come from the server
  // (JOBS_ALWAYS_OPEN), so they follow the person rather than the computer.
  if (access.loading) return <CareerFallback />;
  if (access.open) return <Outlet />;
  return <JobsLockedNotice {...access} careerPathEnabled={isCareerPathEnabled} />;
};

const CareerGate = () => {
  const { settingsLoading, isCareerPathEnabled } = useContext(AuthContext);
  if (settingsLoading) return <CareerFallback />;
  return isCareerPathEnabled ? <Outlet /> : <Navigate to="/" replace />;
};

/** Linguistic Ability, locked by an admin: its pages go back to the dashboard (the server refuses it too). */
const LinguisticGate = () => {
  const { settingsLoading, isLinguisticEnabled } = useContext(AuthContext);
  if (settingsLoading) return <CareerFallback />;
  return isLinguisticEnabled ? <Outlet /> : <Navigate to="/" replace />;
};

// Every lazily-loaded route waits behind this, so it is the thing a student
// actually sees while a page is downloading.
const CareerFallback = () => <YatiLoader label="Loading this page" />;

// ─── Loop Walker ─────────────────────────────────────────────────────────────
// Loop stands in the bottom-right corner and never walks (mode 'stand', asked
// 2026-10-15): not after the cursor or a finger, not over to what it explains,
// not away when poked. It explains any element tagged data-explain="<key>" and
// the main buttons from there, pointing at them. Never anything in a nav bar.
// The words live here, module-level so every render hands the mascot
// the same objects. On a touch screen there is no cursor, so Loop says "tap"
// rather than "click".
const LOOP_TOUCH = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;
const LOOP_CLICK = LOOP_TOUCH ? 'tap' : 'click';
// Not on the Login and Sign up pages: they have a mascot of their own.
const LOOP_HIDDEN_ON = ['/login', '/signup'];
// Out of sight, but kept loaded so it is back at once on the next page: the
// student's own profile and Career Path's settings (asked 2026-10-10).
const LOOP_QUIET_ON = ['/profile', '/career/settings'];
// Short on purpose: a hello, not instructions. The mascot shows what it does by doing it.
// Its name, to students, is Yati (the code still calls it Loop, after the package).
const LOOP_GREETING = { text: "Hi, I'm Yati, your friend!" };
const LOOP_EXPLAIN = {
  // Dashboard → Available courses: the price tag on every course card.
  pricing: { label: 'Pricing', emo: 'proud', gesture: 'point', text: 'Every course shows its price right on the card: a green Free tag, or the cost in ₹. Paid ones come out of your wallet.' },
  // The mock interview's feature row.
  features: { label: 'Features', emo: 'excited', gesture: 'idea', text: 'Answer out loud like a real interview, get feedback after every answer, and let the AI tips help you keep improving.' },
  // Career Path → Roadmap: the platform of the phase the student is on. Just
  // where they are, no push to press it. The platform supplies its own line
  // with the phase's number and name (JourneyMap); this is the fallback.
  'roadmap-here': { label: 'Roadmap', emo: 'joy', gesture: 'point', text: "You are here! This is the phase you're on right now." },
  // Career Path → Planner: "Generate another task", once today's plan is
  // cleared (the only time it is unlocked and tagged).
  'another-task': { label: 'One more task', emo: 'excited', gesture: 'point', text: `Today's tasks are all done! 🎉 Got time for more? ${LOOP_CLICK[0].toUpperCase()}${LOOP_CLICK.slice(1)} “Generate another task” and I'll find you one.` },
  // The contact footer on the Privacy and Terms pages.
  contact: { label: 'Contact', emo: 'polite', gesture: 'wave', text: "Questions about your privacy or these terms? Write to us at this email, we're happy to help." }
};

// Buttons need no tag, but Loop only explains the main ones: the presses that
// move a student forward. The everyday ones (Save, Close, Back, Next, Download…)
// say what they do already, and a mascot walking over to every one of them was
// noise. When Loop reaches one of these, it says the button's name and what it
// is for, then asks them to press it. `label` is the button's own name (its
// aria-label, title or first line of text); each line finishes the sentence
// "“<name>” …". The first pattern that matches wins.
const LOOP_BUTTON_LINES = [
  [/contact admin|contact support/i, "sends our team a message when you're stuck, and we'll get back to you."],
  [/(start|continue).*quest/i, "opens today's quest. Finish it to earn XP!"],
  [/get today'?s quest/i, "opens your planner, where today's quest is waiting."],
  [/quest complete/i, "means today's quest is done! 🎉 It shows you tomorrow's."],
  [/start onboarding/i, 'sets up your Career Path: a few questions, then your own roadmap.'],
  [/enrol/i, 'adds this course to your courses. Paid ones come out of your wallet.'],
  [/^preview\b/i, "shows what's inside this course before you enrol: its sections, lessons and quizzes."],
  [/^resume/i, 'takes you back to where you left off.'],
  [/let'?s do this/i, 'sets up your AI mock interview: check the type and role, then start.'],
  [/start interview/i, 'starts the interview. The AI asks out loud, and you answer with your voice.'],
  [/eligibility form/i, 'asks a few questions and finds the scholarships you qualify for.'],
  [/view report/i, 'opens the full report.']
];
// Anything this answers nothing for, Loop leaves alone.
const describeLoopButton = (label, el) => {
  // Not the navigation: the sidebar, the top bars and the phone's menus
  // (data-loop-skip, which also keeps Loop from standing on them), and the
  // tab strips along the top of a page (My learning, Jobs, Games &
  // Competitions…), which are nav bars too.
  if (el.closest('[data-loop-skip], nav, [role="navigation"], [role="tablist"]')) return null;
  const line = LOOP_BUTTON_LINES.find(([re]) => re.test(label))?.[1];
  if (!line) return null;
  const name = `“${label}”`;
  if (el.disabled || el.getAttribute('aria-disabled') === 'true') {
    return /…|\.\.\.$/.test(label) ? `${name} is working on it. Hang on!` : `${name} switches on once you've filled in what it needs. Then ${LOOP_CLICK} it!`;
  }
  return `${name} ${line} Go on, ${LOOP_CLICK} it!`;
};

// What each page is for, said every time a student opens it from the navigation
// (the sidebar, top bar, phone menus and Career Path's strip; asked
// 2026-10-15). Taken from what each page shows. Short enough to read at a
// glance: the words appear all at once, stay a few seconds and then go.
// Not for My Profile and Career Path's Settings, where Loop is out of sight,
// nor for a page that opens with a popup of its own (Jobs while it is
// locked): Loop says nothing over a popup.
const LOOP_PAGES = {
  '/': { label: 'Dashboard', text: "Your home base. Jump back into your last course, find new ones to enrol in, and see how far you've come." },
  '/enrolled-courses': { label: 'My Courses', text: `Every course you're enrolled in, with how far you've got in each. ${LOOP_CLICK[0].toUpperCase()}${LOOP_CLICK.slice(1)} Resume to carry on where you left off.` },
  '/career': { label: 'Career Path', text: "Your career journey: today's quest, the stages to your goal and your fastest-growing skills. New here? Start onboarding to get your roadmap." },
  '/career/planner': { label: "Today's Plan", text: "Today's tasks, picked from your roadmap. Finish them all and you can unlock one more." },
  '/career/calendar': { label: 'Calendar', text: 'Your tasks day by day. Add exams and events, and set up your class timetable. The day before an exam stays free.' },
  '/career/roadmap': { label: 'Roadmap', text: `Your step-by-step path to your goal. ${LOOP_CLICK[0].toUpperCase()}${LOOP_CLICK.slice(1)} a phase to open it, or turn it into daily tasks.` },
  '/career/skills': { label: 'Skills', text: 'The skills you build as you finish tasks: the ones in progress, the ones you have mastered, and the ones ready to start.' },
  '/career/recommendations': { label: 'Ideas & Resources', text: 'Handpicked for your goal: courses, certifications, books, internships, scholarships and practice sites, plus ideas from your roadmap.' },
  '/career/profile': { label: 'My Progress', text: 'Where you stand: your level and XP, your skills and achievements, and any tasks still to do from earlier days.' },
  '/career/badges': { label: 'Rewards', text: 'Your level, XP and badges, how close the next badge is, and the roadmap milestones you can share.' },
  '/interview': { label: 'Job Preparation', text: 'Get interview-ready: practise common questions, then take an AI mock interview by voice and get feedback to improve.' },
  '/jobs': { label: 'Jobs', text: 'Jobs that match your skills and goal. Filter by type and location, apply, and save the ones you like.' },
  '/scholarships': { label: 'Scholarships', text: 'Scholarships you qualify for. Fill in the eligibility form once, then see each match with its amount and deadline.' },
  '/games': { label: 'Games', text: "Quick memory, logic, word and number games. Each level's stars earn you XP, within today's play time." },
  '/competitions': { label: 'Competitions', text: 'Play Chess, Ludo and Carrom in competitions, for your college.' },
  '/linguistic': { label: 'Linguistic Ability', text: 'Learn English step by step: vocabulary, grammar, reading and writing, speaking and listening, and Kannada–English translation.' }
};

// What each tab of a page is for, said every time a student opens
// that tab (asked 2026-10-15). Keyed by the page's ?tab= id; `default` is the
// tab the page shows with no ?tab. Written from what each panel shows (and the
// server's rules: bundles cost nothing, the Global Quiz pays XP for a win, a
// competition takes teams from a college's coordinator).
const CAP_CLICK = `${LOOP_CLICK[0].toUpperCase()}${LOOP_CLICK.slice(1)}`;
const LOOP_TABS = {
  '/': {
    default: 'available',
    available: { label: 'Available Courses', text: `Courses you can join: free ones say Free, paid ones show the price from your wallet. ${CAP_CLICK} Enroll Now to join, or the play button to preview.` },
    completed: { label: 'Completed', text: 'Every course you have finished. Review Course takes you back through one whenever you like.' },
    bundles: { label: 'Bundles', text: 'Groups of courses that go together. View Courses Inside shows them, and the bar shows your progress across the bundle.' },
    quiz: { label: 'Global Quiz', text: 'A general-knowledge quiz your institution sets from time to time. One attempt each; score high enough and you win XP.' },
    activity: { label: 'Weekly activity', text: 'Your learning streak, the days you were active this week, and how this week compares with the last.' }
  },
  '/enrolled-courses': {
    default: 'courses',
    courses: { label: 'My courses', text: "The courses you're enrolled in, with how far you've got in each. Start, resume or review any of them." },
    bundles: { label: 'Bundles', text: 'Groups of courses that go together. Open one to see its courses and your progress across them.' },
    organization: { label: 'Organization', text: 'Courses your organization made just for its students, all free. Start one and it opens straight away.' }
  },
  '/competitions': {
    default: 'games',
    games: { label: 'Games', text: 'Chess, Ludo and Carrom. See competitions shows the ones for each game; your college enters you in a team.' },
    competitions: { label: 'Competitions', text: "Inter-college competitions: live, open and coming up. Your college's coordinator picks the team, so ask them to put you in." },
    mine: { label: 'My Games', text: 'The competitions your coordinator put you in: your team, and your upcoming, live and finished matches.' },
    leaderboard: { label: 'Leaderboard', text: 'Overall rankings by college, team or player, from the points earned across every competition.' },
    results: { label: 'Results', text: 'The winners of every finished competition: first, second and third place.' },
    history: { label: 'History', text: 'Your own past competitions: your team, your place, the matches you won, and your certificate to download.' }
  },
  '/jobs': {
    default: 'jobs',
    jobs: { label: 'Jobs', text: 'Search for jobs: add your skills or resume, choose the job type and location, then Find jobs.' },
    match: { label: 'Career Match', text: 'Jobs ranked by how well they match your resume or your course skills, best match first.' },
    hidden: { label: 'Hidden Opportunities', text: 'Jobs you qualify for that a plain search would not show, found from your skills.' },
    saved: { label: 'Saved Jobs', text: 'The jobs you bookmarked, kept here so you can come back to them.' },
    opportunities: { label: 'Part-Time Jobs', text: "Part-time jobs on the dates you're free that match your interests. No resume needed." }
  }
};

function App() {
  const { pathname, search } = useLocation();
  const here = pathname.replace(/\/+$/, '') || '/';
  useSayPageOnNav(here, new URLSearchParams(search).get('tab'), LOOP_PAGES, LOOP_TABS);
  // Yati is the students' companion: not on the teacher dashboard either.
  const showLoop = !LOOP_HIDDEN_ON.includes(here) && !here.startsWith('/teacher');
  // A game in play hides Loop without unmounting it (components/loopVisibility).
  const loopHidden = useLoopHidden() || LOOP_QUIET_ON.includes(here);
  return (
    <>
    {/* At most 120px on a laptop (the package's 170 filled too much of the
        screen) and 108px on a phone; within that it follows the screen, about
        a quarter of its shorter side (loop-walker.js, figH): ~94px on a 360px
        phone, ~101px on a 390px one.
        hint={false}: no "Drag to lead it…" pill in the corner, on any screen.
        On a phone its feet stay above the bottom bar (data-loop-skip). */}
    {showLoop && <LoopWalker hidden={loopHidden} mode="stand" side="right" greeting={LOOP_GREETING} explain={LOOP_EXPLAIN} describeButton={describeLoopButton} height={120} mobileHeight={108} hint={false} />}
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/reset-password" element={<React.Suspense fallback={<CareerFallback />}><ResetPassword /></React.Suspense>} />
      {/* A superadmin opening a student's dashboard from the admin Users page. */}
      <Route path="/admin-access" element={<AdminAccess />} />
      {/* Public and outside the auth guard on purpose: Google's OAuth reviewer
          has to be able to open these, and so does anyone deciding whether to
          sign up at all. */}
      <Route path="/jobs/guardian/:token" element={<React.Suspense fallback={<CareerFallback />}><GuardianReview /></React.Suspense>} />
      <Route path="/privacy" element={<React.Suspense fallback={<CareerFallback />}><Privacy /></React.Suspense>} />
      <Route path="/terms" element={<React.Suspense fallback={<CareerFallback />}><Terms /></React.Suspense>} />
      <Route path="/preview/:courseId" element={<React.Suspense fallback={<CareerFallback />}><CoursePreview /></React.Suspense>} />
      <Route path="/learning-bio/shared/:code" element={<React.Suspense fallback={<YatiLoader fullScreen label="Loading Learning Bio" />}><SharedBioPage /></React.Suspense>} />
      {/* RewardsProvider sits inside the auth guard so every page in the
          shell can show XP toasts and milestone celebrations. */}
      <Route path="/" element={<ProtectedRoute><RewardsProvider><StudentLayout /></RewardsProvider></ProtectedRoute>}>
        {/* Two routes, one component: see pages/Profile.jsx. The keys make each
            its own page — without them React would keep one instance across the
            switch, and an edit form left open on one would reappear on the other. */}
        <Route index element={<Profile key="dashboard" />} />
        <Route path="enrolled-courses" element={<EnrolledCourses />} />
        <Route path="learning-bio" element={<React.Suspense fallback={<CareerFallback />}><LearningBioPage /></React.Suspense>} />
        {/* Games: the brain games (Brain Boosters), a section of their own since
            2026-10-23 (no longer a Career Path tab); their server routes stay
            open when Career Path is locked. Competitions: Chess, Ludo and Carrom. */}
        <Route path="games" element={<React.Suspense fallback={<CareerFallback />}><CareerProviders><CareerGames /></CareerProviders></React.Suspense>} />
        <Route path="competitions" element={<React.Suspense fallback={<CareerFallback />}><CompetitionsHome /></React.Suspense>} />
        <Route path="extracurricular" element={<React.Suspense fallback={<CareerFallback />}><ExtraCurricular /></React.Suspense>} />
        <Route path="extracurricular/:id" element={<React.Suspense fallback={<CareerFallback />}><ExtraCurricular /></React.Suspense>} />
        <Route path="ncc-nss" element={<Navigate to="/extracurricular" replace />} />
        <Route path="competitions/play/:gameId" element={<React.Suspense fallback={<CareerFallback />}><GamePage /></React.Suspense>} />
        <Route path="competitions/:id" element={<React.Suspense fallback={<CareerFallback />}><CompetitionDetail /></React.Suspense>} />
        <Route element={<React.Suspense fallback={<CareerFallback />}><JobPrepShell /></React.Suspense>}>
        <Route path="interview" element={<React.Suspense fallback={<CareerFallback />}><InterviewDashboard /></React.Suspense>} />
        <Route path="interview/practice" element={<React.Suspense fallback={<CareerFallback />}><PracticePage /></React.Suspense>} />
        <Route path="interview/aptitude" element={<React.Suspense fallback={<CareerFallback />}><AptitudePage /></React.Suspense>} />
        <Route path="interview/aptitude/:id" element={<React.Suspense fallback={<CareerFallback />}><AptitudePage /></React.Suspense>} />
        <Route path="interview/report/:id" element={<React.Suspense fallback={<CareerFallback />}><InterviewReport /></React.Suspense>} />
        <Route path="interview/report/:id/questions" element={<React.Suspense fallback={<CareerFallback />}><QuestionReview /></React.Suspense>} />
        <Route path="interview/history" element={<React.Suspense fallback={<CareerFallback />}><InterviewHistory /></React.Suspense>} />
        <Route element={<JobsGate />}>
          <Route element={<SkillsGate />}>
            <Route
              path="jobs"
              element={<React.Suspense fallback={<CareerFallback />}><Jobs /></React.Suspense>}
            />
          </Route>
        </Route>
        </Route>
        {/* The live interview covers the screen, outside Job Preparation's tabs. */}
        <Route path="interview/mock/:id" element={<React.Suspense fallback={<CareerFallback />}><MockInterview /></React.Suspense>} />
        <Route element={<LinguisticGate />}>
          {/* The tabs share the shell (stats, quests); the sessions below cover the whole screen. */}
          <Route path="linguistic" element={<React.Suspense fallback={<CareerFallback />}><LinguisticShell /></React.Suspense>}>
            <Route index element={<React.Suspense fallback={<CareerFallback />}><LinguisticHome /></React.Suspense>} />
            <Route path="practice" element={<React.Suspense fallback={<CareerFallback />}><LinguisticPractice /></React.Suspense>} />
            <Route path="badges" element={<React.Suspense fallback={<CareerFallback />}><LinguisticBadges /></React.Suspense>} />
            <Route path="writing" element={<React.Suspense fallback={<CareerFallback />}><LinguisticWriting /></React.Suspense>} />
          </Route>
          <Route path="linguistic/placement" element={<React.Suspense fallback={<CareerFallback />}><LinguisticPlacement /></React.Suspense>} />
          <Route path="linguistic/review" element={<React.Suspense fallback={<CareerFallback />}><LinguisticReview /></React.Suspense>} />
          <Route path="linguistic/daily" element={<React.Suspense fallback={<CareerFallback />}><LinguisticDaily /></React.Suspense>} />
          <Route path="linguistic/:module" element={<React.Suspense fallback={<CareerFallback />}><LinguisticModule /></React.Suspense>} />
          <Route path="linguistic/:module/:lessonId" element={<React.Suspense fallback={<CareerFallback />}><LinguisticLesson /></React.Suspense>} />
        </Route>
        <Route path="profile" element={<Profile key="profile" view="profile" />} />
        <Route path="learn/:courseId" element={<React.Suspense fallback={<CareerFallback />}><CoursePlayer /></React.Suspense>} />

        {/* Career Path. The onboarding wizard sits outside the shell because it
            is a focused five-step flow — the section's tab strip has nothing to
            offer until it has been through once. */}
        <Route element={<CareerGate />}>
        {/* Scholarships is its own section in the navigation, but the list
            it shows is built with the student's Career Path resources, so it
            rides on the same switch. */}
        <Route
          path="scholarships"
          element={
            <React.Suspense fallback={<CareerFallback />}>
              <Scholarships />
            </React.Suspense>
          }
        />
        <Route
          path="career/onboarding"
          element={
            <React.Suspense fallback={<CareerFallback />}>
              <CareerProviders>
                <React.Suspense fallback={<CareerFallback />}>
                  <CareerOnboarding />
                </React.Suspense>
              </CareerProviders>
            </React.Suspense>
          }
        />
        <Route path="career" element={<React.Suspense fallback={<CareerFallback />}><CareerShell /></React.Suspense>}>
          <Route index element={<React.Suspense fallback={<CareerFallback />}><CareerOverview /></React.Suspense>} />
          <Route path="planner" element={<React.Suspense fallback={<CareerFallback />}><CareerPlanner /></React.Suspense>} />
          <Route path="calendar" element={<React.Suspense fallback={<CareerFallback />}><CareerCalendar /></React.Suspense>} />
          <Route path="roadmap" element={<React.Suspense fallback={<CareerFallback />}><CareerRoadmap /></React.Suspense>} />
          <Route path="skills" element={<React.Suspense fallback={<CareerFallback />}><CareerSkills /></React.Suspense>} />
          <Route path="recommendations" element={<React.Suspense fallback={<CareerFallback />}><CareerRecommendations /></React.Suspense>} />
          <Route path="profile" element={<React.Suspense fallback={<CareerFallback />}><CareerProfile /></React.Suspense>} />
          <Route path="badges" element={<React.Suspense fallback={<CareerFallback />}><CareerBadges /></React.Suspense>} />
          {/* The brain games (Brain Boosters) are the Games section since 2026-10-23; an old link goes there. */}
          <Route path="games" element={<Navigate to="/games" replace />} />
          <Route path="settings" element={<React.Suspense fallback={<CareerFallback />}><CareerSettings /></React.Suspense>} />
        </Route>
        </Route>
      </Route>
      <Route path="/teacher/sso" element={<TeacherSso />} />
      <Route path="/teacher" element={<TeacherRoute><React.Suspense fallback={<YatiLoader fullScreen label="Opening your dashboard" />}><TeacherProvider><TeacherLayout /></TeacherProvider></React.Suspense></TeacherRoute>}>
        <Route index element={teacherPage(TeacherDashboard)} />
        <Route path="methods" element={teacherPage(TeacherMethodologies)} />
        <Route path="methods/:key" element={teacherPage(TeacherMethodologies)} />
        <Route path="research-path" element={teacherPage(TeacherResearchPath)} />
        <Route path="publications" element={teacherPage(TeacherPublications)} />
        <Route path="thesis" element={teacherPage(TeacherThesisList)} />
        <Route path="thesis/:id" element={teacherPage(TeacherThesisEditor)} />
        <Route path="writing" element={teacherPage(TeacherWriting)} />
        <Route path="writing/:id" element={teacherPage(TeacherWritingEditor)} />
        <Route path="plagiarism" element={teacherPage(TeacherPlagiarism)} />
        <Route path="clubs" element={teacherPage(TeacherClubs)} />
        <Route path="profile" element={teacherPage(TeacherProfile)} />
        <Route path="*" element={<Navigate to="/teacher" replace />} />
      </Route>
      {MascotDemo && <Route path="/dev/mascot" element={<React.Suspense fallback={<CareerFallback />}><MascotDemo /></React.Suspense>} />}
      <Route path="*" element={<NotFound />} />
    </Routes>
    </>
  );
}

export default App;
