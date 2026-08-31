/**
 * @author Preethesh Kulal
 * @description Root React app with route definitions for student panel and course preview
 */
import React from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from './context/AuthContext';
import StudentLayout from './layouts/StudentLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import EnrolledCourses from './pages/EnrolledCourses';
const Jobs = React.lazy(() => import('./pages/Jobs'));

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useContext(AuthContext);
  if (loading) return <div>Loading...</div>;
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
const CareerMentor = React.lazy(() => import('./career/pages/dashboard/MentorChat'));
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

const CareerGate = () => {
  const { loading, isCareerPathEnabled } = useContext(AuthContext);
  if (loading) return <CareerFallback />;
  return isCareerPathEnabled ? <Outlet /> : <Navigate to="/" replace />;
};

const CareerFallback = () => (
  <div className="flex h-64 items-center justify-center">
    <div className="h-9 w-9 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
  </div>
);

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/preview/:courseId" element={<CoursePreview />} />
      <Route path="/" element={<ProtectedRoute><StudentLayout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="enrolled-courses" element={<EnrolledCourses />} />
        <Route path="profile" element={<Profile />} />
        <Route path="learn/:courseId" element={<CoursePlayer />} />
        <Route path="community" element={<Community />} />
        <Route path="community/:postId" element={<PostDetail />} />

        {/* Career Path. The onboarding wizard sits outside the shell because it
            is a focused five-step flow — the section's tab strip has nothing to
            offer until it has been through once. */}
        <Route element={<JobsGate />}>
          <Route
            path="jobs"
            element={<React.Suspense fallback={<CareerFallback />}><Jobs /></React.Suspense>}
          />
        </Route>

        <Route element={<CareerGate />}>
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
          <Route path="mentor" element={<React.Suspense fallback={<CareerFallback />}><CareerMentor /></React.Suspense>} />
          <Route path="settings" element={<React.Suspense fallback={<CareerFallback />}><CareerSettings /></React.Suspense>} />
        </Route>
        </Route>
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default App;
