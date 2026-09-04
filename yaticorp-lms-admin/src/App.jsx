/**
 * @author Preethesh Kulal
 * @description Root React app with route definitions for admin panel and platform admin
 */
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import AdminLayout from './layouts/AdminLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

const ProtectedRoute = ({ children }) => {
  const { admin, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  if (!admin) return <Navigate to="/login" replace />;
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
import Announcements from './pages/Announcements';
import CareerPath from './pages/CareerPath';
import Jobs from './pages/Jobs';
import Rewards from './pages/Rewards';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="users" element={<Users />} />
        <Route path="courses" element={<Courses />} />
        <Route path="courses/:id" element={<CourseEditor />} />
        <Route path="courses/:courseId/lessons/:lessonId" element={<LessonEditor />} />
        <Route path="bundles" element={<Bundles />} />
        <Route path="enrollments" element={<Enrollments />} />
        <Route path="settings" element={<Settings />} />
        <Route path="tickets" element={<Tickets />} />
        <Route path="community" element={<Community />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="career-path" element={<CareerPath />} />
        <Route path="jobs" element={<Jobs />} />
        <Route path="rewards" element={<Rewards />} />
        <Route path="announcements" element={<Announcements />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default App;
