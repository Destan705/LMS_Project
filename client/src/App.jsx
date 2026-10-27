// All pages of the React app and which URL shows each one.
// RequireRole hides pages from the wrong role. The backend checks again on every API call.
import { Navigate, Route, Routes } from 'react-router-dom';
import { homePathFor, useAuth } from './auth/AuthContext.jsx';
import Layout from './components/Layout.jsx';
import RequireRole from './components/RequireRole.jsx';
import Loading from './components/Loading.jsx';
import LoginPage from './pages/LoginPage.jsx';
import SetupPage from './pages/SetupPage.jsx';
import NotFound from './pages/NotFound.jsx';
import ServerDown from './pages/ServerDown.jsx';
import DashboardPage from './pages/admin/DashboardPage.jsx';
import CoursesPage from './pages/admin/CoursesPage.jsx';
import CourseFormPage from './pages/admin/CourseFormPage.jsx';
import CoursePage from './pages/admin/CoursePage.jsx';
import LessonFormPage from './pages/admin/LessonFormPage.jsx';
import StudentsPage from './pages/admin/StudentsPage.jsx';
import StudentFormPage from './pages/admin/StudentFormPage.jsx';
import AdminExamPage from './pages/admin/ExamPage.jsx';
import MyCoursesPage from './pages/student/MyCoursesPage.jsx';
import StudentCoursePage from './pages/student/CoursePage.jsx';
import LessonPage from './pages/student/LessonPage.jsx';
import ExamPage from './pages/student/ExamPage.jsx';
import SummaryPage from './pages/student/SummaryPage.jsx';

// The whole app. First waits until we know who is logged in,
// then shows the page that matches the address in the browser.
export default function App() {
  const { user, needsSetup, loading, serverError } = useAuth();

  if (loading) return <Loading />;
  if (serverError && !user) return <ServerDown message={serverError} />;

  return (
    <Routes>
      {/* Home: send people to the right place */}
      <Route path="/" element={<Navigate to={user ? homePathFor(user) : needsSetup ? '/setup' : '/login'} replace />} />

      {/* Pages for people who are not logged in */}
      <Route path="/setup" element={<SetupPage />} />
      <Route path="/login" element={user ? <Navigate to={homePathFor(user)} replace /> : <LoginPage />} />

      {/* Pages with the top bar, for logged-in users */}
      <Route element={<Layout />}>
        {/* Admin pages */}
        <Route path="/admin" element={<RequireRole role="admin" />}>
          <Route index element={<DashboardPage />} />
          <Route path="courses" element={<CoursesPage />} />
          <Route path="courses/new" element={<CourseFormPage />} />
          <Route path="courses/:courseId" element={<CoursePage />} />
          <Route path="courses/:courseId/edit" element={<CourseFormPage />} />
          <Route path="courses/:courseId/lessons/new" element={<LessonFormPage />} />
          <Route path="courses/:courseId/lessons/:lessonId/edit" element={<LessonFormPage />} />
          <Route path="courses/:courseId/exam" element={<AdminExamPage />} />
          <Route path="students" element={<StudentsPage />} />
          <Route path="students/new" element={<StudentFormPage />} />
        </Route>

        {/* Student pages */}
        <Route path="/my-courses" element={<RequireRole role="student" />}>
          <Route index element={<MyCoursesPage />} />
          <Route path=":courseId" element={<StudentCoursePage />} />
          <Route path=":courseId/lessons/:lessonId" element={<LessonPage />} />
          <Route path=":courseId/exam" element={<ExamPage />} />
        </Route>
        <Route path="/my-progress" element={<RequireRole role="student" />}>
          <Route index element={<SummaryPage />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
