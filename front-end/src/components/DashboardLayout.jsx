import { NavLink, useNavigate } from "react-router-dom";
import { Bell, BookOpen, LogOut, Settings, GraduationCap } from "lucide-react";
import { useApp } from "../context/useApp.js";

export default function DashboardLayout({ children }) {
  const navigate = useNavigate();
  const { user, logout } = useApp();

  function getInitials(name) {
    if (!name) return "?";
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2)
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }

  const profile = {
    initials: getInitials(user?.name),
    name: user?.name ?? "Guest",
    email: user?.email ?? ""
  };

  function handleLogout() {
    logout();
    navigate("/login?loggedOut=1");
  }

  return (
    <div className="dashboard-shell">
      <aside className="dashboard-sidebar" aria-label="Main navigation">
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <span className="sidebar-brand-icon" aria-hidden="true">
              <GraduationCap size={20} strokeWidth={2.25} />
            </span>
            <span className="sidebar-brand-text">HelpQ</span>
          </div>

          <div className="sidebar-profile">
            <span className="sidebar-avatar">{profile.initials}</span>
            <div className="sidebar-profile-copy">
              <p className="sidebar-profile-name">{profile.name}</p>
              <p className="sidebar-profile-email">{profile.email}</p>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <NavLink
            className={({ isActive }) =>
              `sidebar-nav-link${isActive ? " active" : ""}`
            }
            end
            to="/">
            <BookOpen aria-hidden="true" size={20} />
            My Classes
          </NavLink>
          <NavLink
            className={({ isActive }) =>
              `sidebar-nav-link${isActive ? " active" : ""}`
            }
            to="/notifications">
            <Bell aria-hidden="true" size={20} />
            Notifications
          </NavLink>
          <NavLink
            className={({ isActive }) =>
              `sidebar-nav-link${isActive ? " active" : ""}`
            }
            to="/settings">
            <Settings aria-hidden="true" size={20} />
            Settings
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <button
            className="sidebar-logout"
            type="button"
            onClick={handleLogout}>
            <LogOut aria-hidden="true" size={20} />
            Logout
          </button>
        </div>
      </aside>

      <div className="dashboard-main">{children}</div>
    </div>
  );
}
