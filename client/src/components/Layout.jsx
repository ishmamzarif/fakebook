import React, { useState } from "react";
import { Outlet, Link, useNavigate } from "react-router-dom";
import { useUser } from "../context/UserContext";
import Sidebar from "./Sidebar";

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const { setCurrentUser } = useUser();

  const handleLogout = () => {
    setCurrentUser(null);
    navigate("/");
  };

  return (
    <div className="layout">
      <header className="layout-topbar">
        <button
          type="button"
          className="sidebar-toggle"
          onClick={() => setSidebarOpen(true)}
          aria-label="Open menu"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
        <nav className="layout-topbar-nav">
          <Link to="/home" className="app-link">users</Link>
          <span className="layout-topbar-sep"> / </span>
          <button type="button" className="app-link layout-logout-btn" onClick={handleLogout}>
            log out
          </button>
        </nav>
      </header>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="layout-main">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
