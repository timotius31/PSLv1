import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./components/AuthContext.jsx";
import Layout from "./components/Layout.jsx";
import AdminDashboard from "./pages/admin/AdminDashboard.jsx";
import AnswersPage from "./pages/admin/AnswersPage.jsx";
import ClassesPage from "./pages/admin/ClassesPage.jsx";
import UsersPage from "./pages/admin/UsersPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import StudentLessonPage from "./pages/student/StudentLessonPage.jsx";

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<PrivateRoute />}>
          <Route element={<Layout />}>
            <Route path="/admin" element={<AdminOnly><AdminDashboard /></AdminOnly>} />
            <Route path="/admin/users" element={<AdminOnly><UsersPage /></AdminOnly>} />
            <Route path="/admin/classes" element={<AdminOnly><ClassesPage /></AdminOnly>} />
            <Route path="/admin/answers" element={<AdminOnly><AnswersPage /></AdminOnly>} />
            <Route path="/learn" element={<StudentOnly><StudentLessonPage /></StudentOnly>} />
          </Route>
        </Route>
        <Route path="*" element={<LandingRedirect />} />
      </Routes>
    </AuthProvider>
  );
}

function PrivateRoute() {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-8 text-slate-600">Loading...</div>;
  return user ? <Outlet /> : <Navigate to="/login" replace />;
}

function AdminOnly({ children }) {
  const { user } = useAuth();
  return user?.role === "admin" || user?.role === "superadmin" ? children : <Navigate to="/learn" replace />;
}

function StudentOnly({ children }) {
  const { user } = useAuth();
  return user?.role === "student" ? children : <Navigate to="/admin" replace />;
}

function LandingRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === "student" ? "/learn" : "/admin"} replace />;
}
