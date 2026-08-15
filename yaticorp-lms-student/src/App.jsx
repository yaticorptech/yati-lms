/**
 * @author Preethesh Kulal
 * @description Root React app with route definitions for student panel and course preview
 */
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from './context/AuthContext';
import StudentLayout from './layouts/StudentLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import EnrolledCourses from './pages/EnrolledCourses';

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
import ActivationPending from './pages/ActivationPending'; // TEMPORARY ACTIVATION_PENDING

// ─── TEMPORARY ACTIVATION_PENDING ────────────────────────────────────────────
// While courses are being uploaded, every signed-in route shows the activation
// notice instead of the app. Set this to false to restore the normal app, then
// delete this block, the import above and src/pages/ActivationPending.jsx.
const ACTIVATION_PENDING = true;
// ─────────────────────────────────────────────────────────────────────────────

function App() {
  // TEMPORARY ACTIVATION_PENDING — delete this whole `if` block to restore the app.
  if (ACTIVATION_PENDING) {
    return (
      <Routes>
        {/* Public routes stay reachable so students can still sign in / reset. */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/preview/:courseId" element={<CoursePreview />} />
        {/* Everything else, once signed in, is the notice. */}
        <Route path="/*" element={<ProtectedRoute><ActivationPending /></ProtectedRoute>} />
      </Routes>
    );
  }

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
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default App;
