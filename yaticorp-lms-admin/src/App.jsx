/**
 * @author Preethesh Kulal
 * @description Root React app with route definitions for the platform admin panel,
 *              the organization admin panel and public organization registration
 */
import React from 'react';
import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
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
 * A page only a super admin can use: the server refuses everyone else on
 * Organizations and Competitions. Any other platform admin is told so plainly
 * (found in QA, 2026-10-16) instead of the page loading and then failing —
 * "Not authorized as superadmin", or "Unable to load… Please try again" with a
 * Retry that could never work. The menu leaves these pages out for them too.
 */
const SuperAdminRoute = ({ what, children }) => {
  const { admin } = useAuth();
  if (admin?.role === 'superadmin') return children;
  return (
    <div className="mx-auto mt-6 max-w-xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600"><ShieldAlert size={24} /></span>
      <h1 className="mt-4 text-xl font-bold text-slate-800">Only a super admin can manage {what}</h1>
      <p className="mt-2 text-sm text-slate-500">Your account can use the rest of the admin panel. If something here needs changing, ask a super admin.</p>
      <Link to="/" className="mt-5 inline-flex rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-indigo-700">Back to the dashboard</Link>
    </div>
  );
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

// Every page but sign-in and the dashboard loads when it is first opened (found
// in QA, 2026-10-16): the panel shipped as one 1.8 MB script, every page in it,
// before the sign-in screen could show. The layouts hold the loading state.
const Users = React.lazy(() => import('./pages/Users'));
const Teachers = React.lazy(() => import('./pages/Teachers'));
const VerifyCards = React.lazy(() => import('./pages/VerifyCards'));
const Courses = React.lazy(() => import('./pages/Courses'));
const CourseEditor = React.lazy(() => import('./pages/CourseEditor'));
const LessonEditor = React.lazy(() => import('./pages/LessonEditor'));
const Bundles = React.lazy(() => import('./pages/Bundles'));
const Enrollments = React.lazy(() => import('./pages/Enrollments'));
const Settings = React.lazy(() => import('./pages/Settings'));
const Tickets = React.lazy(() => import('./pages/Tickets'));
import NotFound from './pages/NotFound';
const Analytics = React.lazy(() => import('./pages/Analytics'));
const GlobalQuiz = React.lazy(() => import('./pages/GlobalQuiz'));
const LinguisticAdmin = React.lazy(() => import('./pages/linguistic/LinguisticAdmin'));
const Announcements = React.lazy(() => import('./pages/Announcements'));
const CareerPath = React.lazy(() => import('./pages/CareerPath'));
const Jobs = React.lazy(() => import('./pages/Jobs'));
const Rewards = React.lazy(() => import('./pages/Rewards'));
const Organizations = React.lazy(() => import('./pages/Organizations'));
const RegisterOrganization = React.lazy(() => import('./pages/RegisterOrganization'));
import OrgAdminLayout from './layouts/OrgAdminLayout';
const OrgDashboard = React.lazy(() => import('./pages/org/OrgDashboard'));
const OrgStudents = React.lazy(() => import('./pages/org/OrgStudents'));
const OrgStudentDetail = React.lazy(() => import('./pages/org/OrgStudentDetail'));
const OrgTeachers = React.lazy(() => import('./pages/org/OrgTeachers'));
const OrgNccNss = React.lazy(() => import('./pages/org/OrgNccNss'));
// Research: a teacher's own teacher dashboard, inside the organization panel.
const OrgResearch = React.lazy(() => import('./pages/org/OrgResearch'));
const OrgSettings = React.lazy(() => import('./pages/org/OrgSettings'));
import OrgNotFound from './pages/org/OrgNotFound';
// Games & Competitions: the platform runs inter-college competitions; colleges enter teams.
const Competitions = React.lazy(() => import('./pages/Competitions'));
const CompetitionAdmin = React.lazy(() => import('./pages/CompetitionAdmin'));
const OrgCompetitions = React.lazy(() => import('./pages/org/OrgCompetitions'));
// Quiz Arena: three-round live quiz contests, and their question bank.
const QuizArena = React.lazy(() => import('./pages/QuizArena'));
const QuizArenaCompetition = React.lazy(() => import('./pages/QuizArenaCompetition'));
import { CourseScope, ORGANIZATION_SCOPE } from './utils/courseScope';

/** The platform's course pages, working on this organization's own courses. */
const OrgCourses = ({ children }) => <CourseScope.Provider value={ORGANIZATION_SCOPE}>{children}</CourseScope.Provider>;

function App() {
  return (
    <React.Suspense fallback={null}>
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
        {/* Student requests are a tab of Students now. */}
        <Route path="requests" element={<Navigate to="/organization/students?view=requests" replace />} />
        <Route path="teachers" element={<OrgTeachers />} />
        <Route path="ncc-nss" element={<OrgNccNss />} />
        <Route path="research" element={<OrgResearch />} />
        <Route path="research/:tool" element={<OrgResearch />} />
        <Route path="courses" element={<OrgCourses><Courses /></OrgCourses>} />
        <Route path="courses/:id" element={<OrgCourses><CourseEditor /></OrgCourses>} />
        <Route path="courses/:courseId/lessons/:lessonId" element={<OrgCourses><LessonEditor /></OrgCourses>} />
        <Route path="competitions" element={<OrgCompetitions />} />
        <Route path="competitions/host/:id" element={<CompetitionAdmin apiBase="/competitions/org/host" backTo="/organization/competitions?tab=host" />} />
        {/* A hosting college's own Quiz Arena: its question bank and contests. */}
        <Route path="competitions/question-bank" element={<QuizArena />} />
        <Route path="competitions/arena/:id" element={<QuizArenaCompetition />} />
        {/* English (Linguistic Ability) is no longer in the organization panel; an old link goes to the dashboard. */}
        <Route path="linguistic" element={<Navigate to="/organization" replace />} />
        <Route path="settings" element={<OrgSettings />} />
        {/* Any other address in here: said inside the shell, menu and all. */}
        <Route path="*" element={<OrgNotFound />} />
      </Route>

      <Route path="/" element={<PlatformRoute><AdminLayout /></PlatformRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="verify-cards" element={<SuperAdminRoute what="card verification"><VerifyCards /></SuperAdminRoute>} />
        <Route path="users" element={<Users />} />
        <Route path="teachers" element={<Teachers />} />
        <Route path="courses" element={<Courses />} />
        <Route path="courses/:id" element={<CourseEditor />} />
        <Route path="courses/:courseId/lessons/:lessonId" element={<LessonEditor />} />
        <Route path="bundles" element={<Bundles />} />
        <Route path="enrollments" element={<Enrollments />} />
        <Route path="organizations" element={<SuperAdminRoute what="organizations"><Organizations /></SuperAdminRoute>} />
        <Route path="settings" element={<Settings />} />
        <Route path="tickets" element={<Tickets />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="career-path" element={<CareerPath />} />
        <Route path="jobs" element={<Jobs />} />
        <Route path="rewards" element={<Rewards />} />
        <Route path="global-quiz" element={<GlobalQuiz />} />
        <Route path="linguistic" element={<LinguisticAdmin />} />
        <Route path="announcements" element={<Announcements />} />
        <Route path="competitions" element={<SuperAdminRoute what="competitions"><Competitions /></SuperAdminRoute>} />
        <Route path="competitions/:id" element={<SuperAdminRoute what="competitions"><CompetitionAdmin /></SuperAdminRoute>} />
        {/* Quiz Arena lives in Games & Competitions: its contests in the list, its question bank a page of it. */}
        <Route path="competitions/question-bank" element={<SuperAdminRoute what="competitions"><QuizArena /></SuperAdminRoute>} />
        <Route path="competitions/arena/:id" element={<SuperAdminRoute what="competitions"><QuizArenaCompetition /></SuperAdminRoute>} />
        <Route path="quiz-arena/*" element={<Navigate to="/competitions" replace />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
    </React.Suspense>
  );
}

export default App;
