import { BookOpen, ClipboardCheck, LogOut, Shield, Users } from "lucide-react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext.jsx";

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === "admin" || user?.role === "superadmin";

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  return (
    <div className="min-h-screen bg-[#f7f8f5]">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded bg-ink text-white">
              <BookOpen size={20} />
            </div>
            <div>
              <p className="text-sm text-slate-500">Local LMS</p>
              <h1 className="text-lg font-semibold text-ink">{user?.fullName}</h1>
            </div>
          </div>
          <button
            className="focus-ring inline-flex items-center gap-2 rounded border border-line bg-white px-3 py-2 text-sm hover:bg-slate-50"
            onClick={handleLogout}
          >
            <LogOut size={16} /> Logout
          </button>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[220px_1fr]">
        <aside className="h-fit border-r border-line pr-4">
          <nav className="grid gap-2">
            {isAdmin ? (
              <>
                <NavItem to="/admin" icon={<Shield size={17} />} label="Dashboard" />
                <NavItem to="/admin/users" icon={<Users size={17} />} label="Users" />
                <NavItem to="/admin/classes" icon={<BookOpen size={17} />} label="Classes" />
                <NavItem to="/admin/answers" icon={<ClipboardCheck size={17} />} label="Grading" />
              </>
            ) : (
              <NavItem to="/learn" icon={<BookOpen size={17} />} label="My Lesson" />
            )}
          </nav>
        </aside>
        <main>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function NavItem({ to, icon, label }) {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        `focus-ring inline-flex items-center gap-2 rounded px-3 py-2 text-sm ${
          isActive ? "bg-ink text-white" : "text-slate-700 hover:bg-white"
        }`
      }
    >
      {icon}
      {label}
    </NavLink>
  );
}
