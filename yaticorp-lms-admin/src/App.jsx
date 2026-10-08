/**
 * @author Preethesh Kulal
 * @description Root React app with route definitions for the platform admin panel,
 *              the organization admin panel and public organization registration
 */
import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { getViewedOrganization } from './utils/viewOrganization';
import AdminLayout from './layouts/AdminLayout';
import Login from './pages/Login';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';

/**
 * Two guards rather than one, because there are now two panels behind a single
 * sign-in. Each checks that somebody is signed in and then that they belong in
 * the panel they are asking for. The one ProtectedRoute they replace checked
 * only the first, and would have dropped an organization administrator into the
 * platform panel.
 *
 * Sending someone to the other panel rather than letting them in is for their
 * benefit, not security: every endpoint behind these pages already refuses the
 * wrong kind of token, so without the redirect the pages would load and then
 * fail one request at a time. The boundary itself is on the server.
 */
const PlatformRoute = ({ children }) => {
  const { admin, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div>Loading...</div>;
  // Signed out: remember the page, so signing in lands on it — a parent's
  // approval link opens one application in Jobs, and it must still be that
  // application after the sign-in, not the dashboard.
  if (!admin) {
    try { sessionStorage.setItem('afterLogin', location.pathname + location.search); } catch { /* storage unavailable */ }
    return <Navigate to="/login" replace />;
  }
  if (admin.role === 'orgadmin') return <Navigate to="/organization" replace />;
  return children;
};

/**
 * The organization panel: an organization administrator's own, or a superadmin
 * managing one organization they opened from Organizations.
 */
const OrgRoute = ({ children }) => {
  const { admin, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  if (!admin) return <Navigate to="/login" replace />;
  if (admin.role === 'superadmin' && getViewedOrganization()) return children;
  if (admin.role !== 'orgadmin') return <Navigate to="/" replace />;
  return children;
};

import Users from './pages/Users';
import Courses from './pages/Courses';
import CourseEditor from './pages/CourseEditor';
import LessonEditor from './pages/LessonEditor';
import Bundles from './pages/Bundles';
import Enrollments from './pages/Enrollments';
import Settings from './pages/Settings';
import Tickets from './pages/Tickets';
import Community from './pages/Community';
import NotFound from './pages/NotFound';
import Analytics from './pages/Analytics';
import GlobalQuiz from './pages/GlobalQuiz';
import Announcements from './pages/Announcements';
import CareerPath from './pages/CareerPath';
import Jobs from './pages/Jobs';
import Rewards from './pages/Rewards';
import Organizations from './pages/Organizations';
import RegisterOrganization from './pages/RegisterOrganization';
import OrgAdminLayout from './layouts/OrgAdminLayout';
import OrgDashboard from './pages/org/OrgDashboard';
import OrgStudents from './pages/org/OrgStudents';
import OrgStudentDetail from './pages/org/OrgStudentDetail';
import OrgRequests from './pages/org/OrgRequests';
import OrgSettings from './pages/org/OrgSettings';
import OrgNotFound from './pages/org/OrgNotFound';
// Games & Competitions: the platform runs inter-college competitions; colleges enter teams.
import Competitions from './pages/Competitions';
import CompetitionAdmin from './pages/CompetitionAdmin';
import OrgCompetitions from './pages/org/OrgCompetitions';
import { CourseScope, ORGANIZATION_SCOPE } from './utils/courseScope';

/** The platform's course pages, working on this organization's own courses. */
const OrgCourses = ({ children }) => <CourseScope.Provider value={ORGANIZATION_SCOPE}>{children}</CourseScope.Provider>;

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      {/* Public: opened from the emailed link by someone who cannot sign in. */}
      <Route path="/reset-password" element={<ResetPassword />} />
      {/* Public on purpose: nobody registering an organization has an account yet. */}
      <Route path="/register-organization" element={<RegisterOrganization />} />

      {/* The organization admin's own shell — a sibling of the platform panel
          rather than a page inside it, because it shares none of its navigation
          and none of its endpoints. */}
      <Route path="/organization" element={<OrgRoute><OrgAdminLayout /></OrgRoute>}>
        <Route index element={<OrgDashboard />} />
        <Route path="students" element={<OrgStudents />} />
        <Route path="students/:studentId" element={<OrgStudentDetail />} />
        <Route path="requests" element={<OrgRequests />} />
        <Route path="courses" element={<OrgCourses><Courses /></OrgCourses>} />
        <Route path="courses/:id" element={<OrgCourses><CourseEditor /></OrgCourses>} />
        <Route path="courses/:courseId/lessons/:lessonId" element={<OrgCourses><LessonEditor /></OrgCourses>} />
        <Route path="competitions" element={<OrgCompetitions />} />
        <Route path="competitions/host/:id" element={<CompetitionAdmin apiBase="/competitions/org/host" backTo="/organization/competitions?tab=host" />} />
        <Route path="settings" element={<OrgSettings />} />
        {/* Any other address in here: said inside the shell, menu and all. */}
        <Route path="*" element={<OrgNotFound />} />
      </Route>

      <Route path="/" element={<PlatformRoute><AdminLayout /></PlatformRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="users" element={<Users />} />
        <Route path="courses" element={<Courses />} />
        <Route path="courses/:id" element={<CourseEditor />} />
        <Route path="courses/:courseId/lessons/:lessonId" element={<LessonEditor />} />
        <Route path="bundles" element={<Bundles />} />
        <Route path="enrollments" element={<Enrollments />} />
        <Route path="organizations" element={<Organizations />} />
        <Route path="settings" element={<Settings />} />
        <Route path="tickets" element={<Tickets />} />
        <Route path="community" element={<Community />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="career-path" element={<CareerPath />} />
        <Route path="jobs" element={<Jobs />} />
        <Route path="rewards" element={<Rewards />} />
        <Route path="global-quiz" element={<GlobalQuiz />} />
        <Route path="announcements" element={<Announcements />} />
        <Route path="competitions" element={<Competitions />} />
        <Route path="competitions/:id" element={<CompetitionAdmin />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default App;
