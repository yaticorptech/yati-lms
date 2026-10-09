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
import Login from './pages/Login';
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
// Games & Competitions: online Chess, Ludo, Carrom and UNO, and inter-college competitions.
const CompetitionsHome = React.lazy(() => import('./competitions/CompetitionsHome'));
const CompetitionDetail = React.lazy(() => import('./competitions/CompetitionDetail'));
const GamePage = React.lazy(() => import('./competitions/GamePage'));
const PracticePage = React.lazy(() => import('./interview/PracticePage'));
const MockInterview = React.lazy(() => import('./interview/MockInterview'));
const InterviewReport = React.lazy(() => import('./interview/InterviewReport'));
const QuestionReview = React.lazy(() => import('./interview/QuestionReview'));
const InterviewHistory = React.lazy(() => import('./interview/InterviewHistory'));

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useContext(AuthContext);
  if (loading) return <YatiLoader fullScreen label="Loading your account" />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

import Profile from './pages/Profile';
import CoursePlayer from './pages/CoursePlayer';
import CoursePreview from './pages/CoursePreview';
import Signup from './pages/Signup';
import ResetPassword from './pages/ResetPassword';
import AdminAccess from './pages/AdminAccess';
import Community from './pages/Community';
import PostDetail from './pages/PostDetail';
import NotFound from './pages/NotFound';
import { RewardsProvider } from './context/RewardsContext';

// ─── Career Path (FuturePath) ────────────────────────────────────────────────
// The AI career-roadmap section, ported from the standalone FuturePath app. It
// is student-only and self-contained under src/career/; the API it talks to is
// mounted at /api/career on the same server, behind the same student token.
// Lazily loaded — it pulls in chart.js and react-markdown, which no other
// student screen needs.
import CareerShell from './career/CareerShell';
import CareerProviders from './career/CareerProviders';
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
 * calling an API that now answers 403. Waiting on `loading` matters: the
 * setting arrives with it, and redirecting before it does would bounce every
 * student off a section that is open.
 */
/**
 * The lock an administrator can put on the Jobs section, same shape as the
 * career one below: the sidebar tab is not the only way in.
 */
const JobsGate = () => {
  const { loading, isJobsEnabled } = useContext(AuthContext);
  if (loading) return <CareerFallback />;
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
  const { loading, isCareerPathEnabled } = useContext(AuthContext);
  if (loading) return <CareerFallback />;
  return isCareerPathEnabled ? <Outlet /> : <Navigate to="/" replace />;
};

// Every lazily-loaded route waits behind this, so it is the thing a student
// actually sees while a page is downloading.
const CareerFallback = () => <YatiLoader label="Loading this page" />;

// ─── Loop Walker ─────────────────────────────────────────────────────────────
// Loop explains, from its corner, any element tagged data-explain="<key>", and
// any button. The words live here, module-level so every render hands the mascot
// the same objects. On a touch screen there is no cursor, so Loop says "tap"
// rather than "click".
const LOOP_TOUCH = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;
const LOOP_CLICK = LOOP_TOUCH ? 'tap' : 'click';
// Not on the Login and Sign up pages: they have a mascot of their own.
const LOOP_HIDDEN_ON = ['/login', '/signup'];
const LOOP_GREETING = {
  text: LOOP_TOUCH
    ? "Hi, I'm Loop, your YATICORP LMS guide! Tap anything and I'll explain it."
    : "Hi, I'm Loop, your YATICORP LMS guide! Pause on any button and I'll explain it."
};
const LOOP_EXPLAIN = {
  // Dashboard → Available courses: the price tag on every course card.
  pricing: { label: 'Pricing', emo: 'proud', gesture: 'point', text: 'Every course shows its price right on the card: a green Free tag, or the cost in ₹. Paid ones come out of your wallet.' },
  // The mock interview's feature row.
  features: { label: 'Features', emo: 'excited', gesture: 'idea', text: 'Answer out loud like a real interview, get feedback after every answer, and let the AI tips help you keep improving.' },
  // The contact footer on the Privacy and Terms pages.
  contact: { label: 'Contact', emo: 'polite', gesture: 'wave', text: "Questions about your privacy or these terms? Write to us at this email, we're happy to help." }
};

// Buttons need no tag. When Loop reaches a button the student paused on,
// tapped or tabbed to, it says the button's name and what it is for, then asks
// them to press it. `label` is the button's own name (its aria-label, title or
// first line of text); each line finishes the sentence "“<name>” …". The first
// pattern that matches wins.
const LOOP_BUTTON_LINES = [
  [/contact admin|contact support/i, "sends our team a message when you're stuck, and we'll get back to you."],
  [/(start|continue).*quest/i, "opens today's quest. Finish it to earn XP!"],
  [/get today'?s quest/i, "opens your planner, where today's quest is waiting."],
  [/quest complete/i, "means today's quest is done! 🎉 It shows you tomorrow's."],
  [/enrol/i, 'adds this course to your courses. Paid ones come out of your wallet.'],
  [/^resume/i, 'takes you back to where you left off.'],
  [/let'?s do this/i, 'sets up your AI mock interview: check the type and role, then start.'],
  [/start interview/i, 'starts the interview. The AI asks out loud, and you answer with your voice.'],
  [/eligibility form/i, 'asks a few questions and finds the scholarships you qualify for.'],
  [/clear all/i, 'clears every notification from the list.'],
  [/view all|see all/i, 'shows the full list.'],
  [/view report/i, 'opens the full report.'],
  [/notification/i, 'shows your latest notifications.'],
  [/wallet/i, 'shows your wallet balance.'],
  [/^dashboard$|^home$/i, 'takes you to your dashboard.'],
  [/retry|try again|retake/i, 'gives it another go!'],
  [/download/i, 'saves a copy to your device.'],
  [/upload/i, 'lets you pick a file from your device.'],
  [/^save/i, 'saves it for you.'],
  [/^(send|submit)/i, 'sends it off.'],
  [/^cancel/i, 'stops here, without changing anything.'],
  [/^(close|hide|dismiss)/i, 'closes this.'],
  [/^back\b|go back/i, 'takes you back a step.'],
  [/^(next|continue)\b/i, 'takes you to the next step.']
];
const describeLoopButton = (label, el) => {
  const name = `“${label}”`;
  if (el.disabled || el.getAttribute('aria-disabled') === 'true') {
    return /…|\.\.\.$/.test(label) ? `${name} is working on it. Hang on!` : `${name} switches on once you've filled in what it needs. Then ${LOOP_CLICK} it!`;
  }
  // Taking something away is the one press Loop does not cheer on.
  if (/log ?out|sign ?out/i.test(label)) return `${name} signs you out. Only ${LOOP_CLICK} it if you're done for now.`;
  if (/delete|remove/i.test(label)) return `${name} removes it for good. Only ${LOOP_CLICK} it if you're sure.`;
  const line = LOOP_BUTTON_LINES.find(([re]) => re.test(label))?.[1];
  // A card that is a button names itself on its first line and says what it is on the rest.
  const rest = (el.innerText || '').split('\n').slice(1).map((s) => s.trim()).filter(Boolean).join(' ');
  const role = el.getAttribute('role');
  let topic;
  if (line) topic = `${name} ${line}`;
  else if (role === 'tab' || el.hasAttribute('aria-selected')) topic = `${name} switches to that tab.`;
  else if (rest) topic = `${name}: ${rest}${/[.!?]$/.test(rest) ? '' : '.'}`;
  else topic = `This is the ${name} button.`;
  return `${topic} Go on, ${LOOP_CLICK} it!`;
};

function App() {
  const { pathname } = useLocation();
  const showLoop = !LOOP_HIDDEN_ON.includes(pathname.replace(/\/+$/, '') || '/');
  return (
    <>
    {/* 120px on a laptop (the package's 170 filled too much of the screen);
        86px on a phone (screens under 640px): standing in the corner at
        140px it covered the buttons it was explaining (2026-10-09).
        hint={false}: no "Drag to lead it…" pill in the corner, on any screen.
        mode="stand": Loop stands still in the bottom right corner and does
        not walk around the page (the account owner's call, 2026-10-09; the
        walking modes are still in the package if they want it back). On a
        phone it stands above the bottom bar, not on it. */}
    {showLoop && <LoopWalker greeting={LOOP_GREETING} explain={LOOP_EXPLAIN} describeButton={describeLoopButton} height={120} mobileHeight={86} hint={false}
      mode="stand" side="right" standAbove='nav[aria-label="Main sections"]' />}
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      {/* A superadmin opening a student's dashboard from the admin Users page. */}
      <Route path="/admin-access" element={<AdminAccess />} />
      {/* Public and outside the auth guard on purpose: Google's OAuth reviewer
          has to be able to open these, and so does anyone deciding whether to
          sign up at all. */}
      <Route path="/jobs/guardian/:token" element={<React.Suspense fallback={<CareerFallback />}><GuardianReview /></React.Suspense>} />
      <Route path="/privacy" element={<React.Suspense fallback={<CareerFallback />}><Privacy /></React.Suspense>} />
      <Route path="/terms" element={<React.Suspense fallback={<CareerFallback />}><Terms /></React.Suspense>} />
      <Route path="/preview/:courseId" element={<CoursePreview />} />
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
        <Route path="competitions" element={<React.Suspense fallback={<CareerFallback />}><CompetitionsHome /></React.Suspense>} />
        <Route path="competitions/play/:gameId" element={<React.Suspense fallback={<CareerFallback />}><GamePage /></React.Suspense>} />
        <Route path="competitions/:id" element={<React.Suspense fallback={<CareerFallback />}><CompetitionDetail /></React.Suspense>} />
        <Route path="interview" element={<React.Suspense fallback={<CareerFallback />}><InterviewDashboard /></React.Suspense>} />
        <Route path="interview/practice" element={<React.Suspense fallback={<CareerFallback />}><PracticePage /></React.Suspense>} />
        <Route path="interview/mock/:id" element={<React.Suspense fallback={<CareerFallback />}><MockInterview /></React.Suspense>} />
        <Route path="interview/report/:id" element={<React.Suspense fallback={<CareerFallback />}><InterviewReport /></React.Suspense>} />
        <Route path="interview/report/:id/questions" element={<React.Suspense fallback={<CareerFallback />}><QuestionReview /></React.Suspense>} />
        <Route path="interview/history" element={<React.Suspense fallback={<CareerFallback />}><InterviewHistory /></React.Suspense>} />
        <Route path="profile" element={<Profile key="profile" view="profile" />} />
        <Route path="learn/:courseId" element={<CoursePlayer />} />
        <Route path="community" element={<Community />} />
        <Route path="community/:postId" element={<PostDetail />} />

        {/* Career Path. The onboarding wizard sits outside the shell because it
            is a focused five-step flow — the section's tab strip has nothing to
            offer until it has been through once. */}
        <Route element={<JobsGate />}>
          <Route element={<SkillsGate />}>
            <Route
              path="jobs"
              element={<React.Suspense fallback={<CareerFallback />}><Jobs /></React.Suspense>}
            />
          </Route>
        </Route>

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
            <CareerProviders>
              <React.Suspense fallback={<CareerFallback />}>
                <CareerOnboarding />
              </React.Suspense>
            </CareerProviders>
          }
        />
        <Route path="career" element={<CareerShell />}>
          <Route index element={<React.Suspense fallback={<CareerFallback />}><CareerOverview /></React.Suspense>} />
          <Route path="planner" element={<React.Suspense fallback={<CareerFallback />}><CareerPlanner /></React.Suspense>} />
          <Route path="calendar" element={<React.Suspense fallback={<CareerFallback />}><CareerCalendar /></React.Suspense>} />
          <Route path="roadmap" element={<React.Suspense fallback={<CareerFallback />}><CareerRoadmap /></React.Suspense>} />
          <Route path="skills" element={<React.Suspense fallback={<CareerFallback />}><CareerSkills /></React.Suspense>} />
          <Route path="recommendations" element={<React.Suspense fallback={<CareerFallback />}><CareerRecommendations /></React.Suspense>} />
          <Route path="profile" element={<React.Suspense fallback={<CareerFallback />}><CareerProfile /></React.Suspense>} />
          <Route path="badges" element={<React.Suspense fallback={<CareerFallback />}><CareerBadges /></React.Suspense>} />
          <Route path="games" element={<React.Suspense fallback={<CareerFallback />}><CareerGames /></React.Suspense>} />
          <Route path="settings" element={<React.Suspense fallback={<CareerFallback />}><CareerSettings /></React.Suspense>} />
        </Route>
        </Route>
      </Route>
      {MascotDemo && <Route path="/dev/mascot" element={<React.Suspense fallback={<CareerFallback />}><MascotDemo /></React.Suspense>} />}
      <Route path="*" element={<NotFound />} />
    </Routes>
    </>
  );
}

export default App;
