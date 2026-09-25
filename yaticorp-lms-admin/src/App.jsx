/**
 * @author Preethesh Kulal
 * @description Root React app with route definitions for the platform admin panel,
 *              the organization admin panel and public organization registration
 */
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import AdminLayout from './layouts/AdminLayout';
import Login from './pages/Login';
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
  if (loading) return <div>Loading...</div>;
  if (!admin) return <Navigate to="/login" replace />;
  if (admin.role === 'orgadmin') return <Navigate to="/organization" replace />;
  return children;
};

/** The organization panel, which only an organization administrator can use. */
const OrgRoute = ({ children }) => {
  const { admin, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  if (!admin) return <Navigate to="/login" replace />;
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

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
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
        <Route path="settings" element={<OrgSettings />} />
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
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default App;
