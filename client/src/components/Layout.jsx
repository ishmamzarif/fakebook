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
          ☰
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
