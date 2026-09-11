/**
 * @author Preethesh Kulal
 * @description Root React app with route definitions for student panel and course preview
 */
import React from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import useCourseCompletion from './hooks/useCourseCompletion';
import JobsLockedNotice from './jobs/JobsLockedNotice';
import { useContext } from 'react';
import { AuthContext } from './context/AuthContext';
import StudentLayout from './layouts/StudentLayout';
import YatiLoader from './components/YatiLoader';
import Login from './pages/Login';
import EnrolledCourses from './pages/EnrolledCourses';
const Privacy = React.lazy(() => import('./pages/legal/Privacy'));
const Terms = React.lazy(() => import('./pages/legal/Terms'));
const Jobs = React.lazy(() => import('./pages/Jobs'));
const Scholarships = React.lazy(() => import('./pages/Scholarships'));
// My Learning Bio — the AI-written, data-backed profile behind the dashboard card.
const LearningBioPage = React.lazy(() => import('./learningbio/LearningBioPage'));
const SharedBioPage = React.lazy(() => import('./learningbio/SharedBioPage'));
// Interview Ready — preparation, AI mock interviews, reports and history.
const InterviewDashboard = React.lazy(() => import('./interview/InterviewDashboard'));
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
const CareerOverview = React.lazy(() => import('./career/pages/dashboard/Overview'));
const CareerPlanner = React.lazy(() => import('./career/pages/dashboard/Planner'));
const CareerCalendar = React.lazy(() => import('./career/pages/dashboard/Calendar'));
const CareerRoadmap = React.lazy(() => import('./career/pages/dashboard/RoadmapPage'));
const CareerSkills = React.lazy(() => import('./career/pages/dashboard/Skills'));
const CareerRecommendations = React.lazy(() => import('./career/pages/dashboard/Recommendations'));
const CareerProfile = React.lazy(() => import('./career/pages/Profile'));
const CareerBadges = React.lazy(() => import('./career/pages/dashboard/Badges'));
const CareerGames = React.lazy(() => import('./career/pages/dashboard/Games'));
// The mascot workbench. Nothing links to it; it is reached by typing the
// path, and it drives the rig in isolation before it goes near a real page.
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
 * shut until every enrolled course reads 100%.
 *
 * It shows a message rather than redirecting. A student who clicks Jobs has
 * asked a question, and "finish these two courses first" answers it, where a
 * silent bounce back to the home page would not.
 */
const CoursesCompleteGate = () => {
  const { loading, allComplete, total } = useCourseCompletion();
  // A developer working on the Jobs section can open the gate with
  // VITE_JOBS_GATE_BYPASS=true in .env.local. It is honoured only in a dev
  // build — a production bundle ignores the flag even if it is set.
  const devBypass = import.meta.env.DEV && import.meta.env.VITE_JOBS_GATE_BYPASS === 'true';
  if (devBypass) return <Outlet />;
  if (loading) return <CareerFallback />;
  if (allComplete) return <Outlet />;
  return <JobsLockedNotice total={total} />;
};

const CareerGate = () => {
  const { loading, isCareerPathEnabled } = useContext(AuthContext);
  if (loading) return <CareerFallback />;
  return isCareerPathEnabled ? <Outlet /> : <Navigate to="/" replace />;
};

// Every lazily-loaded route waits behind this, so it is the thing a student
// actually sees while a page is downloading.
const CareerFallback = () => <YatiLoader label="Loading this page" />;

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      {/* Public and outside the auth guard on purpose: Google's OAuth reviewer
          has to be able to open these, and so does anyone deciding whether to
          sign up at all. */}
      <Route path="/privacy" element={<React.Suspense fallback={<CareerFallback />}><Privacy /></React.Suspense>} />
      <Route path="/terms" element={<React.Suspense fallback={<CareerFallback />}><Terms /></React.Suspense>} />
      <Route path="/preview/:courseId" element={<CoursePreview />} />
      <Route path="/learning-bio/shared/:code" element={<React.Suspense fallback={<YatiLoader fullScreen label="Loading Learning Bio" />}><SharedBioPage /></React.Suspense>} />
      {/* RewardsProvider sits inside the auth guard so every page in the
          shell can show XP toasts and milestone celebrations. */}
      <Route path="/" element={<ProtectedRoute><RewardsProvider><StudentLayout /></RewardsProvider></ProtectedRoute>}>
        <Route index element={<Profile />} />
        <Route path="enrolled-courses" element={<EnrolledCourses />} />
        <Route path="learning-bio" element={<React.Suspense fallback={<CareerFallback />}><LearningBioPage /></React.Suspense>} />
        <Route path="interview" element={<React.Suspense fallback={<CareerFallback />}><InterviewDashboard /></React.Suspense>} />
        <Route path="interview/practice" element={<React.Suspense fallback={<CareerFallback />}><PracticePage /></React.Suspense>} />
        <Route path="interview/mock/:id" element={<React.Suspense fallback={<CareerFallback />}><MockInterview /></React.Suspense>} />
        <Route path="interview/report/:id" element={<React.Suspense fallback={<CareerFallback />}><InterviewReport /></React.Suspense>} />
        <Route path="interview/report/:id/questions" element={<React.Suspense fallback={<CareerFallback />}><QuestionReview /></React.Suspense>} />
        <Route path="interview/history" element={<React.Suspense fallback={<CareerFallback />}><InterviewHistory /></React.Suspense>} />
        {/* Dashboard and My Profile are one page now; the old address still lands there. */}
        <Route path="profile" element={<Navigate to="/" replace />} />
        <Route path="learn/:courseId" element={<CoursePlayer />} />
        <Route path="community" element={<Community />} />
        <Route path="community/:postId" element={<PostDetail />} />

        {/* Career Path. The onboarding wizard sits outside the shell because it
            is a focused five-step flow — the section's tab strip has nothing to
            offer until it has been through once. */}
        <Route element={<JobsGate />}>
          <Route element={<CoursesCompleteGate />}>
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
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default App;
