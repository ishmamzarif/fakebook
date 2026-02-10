import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useUser } from "../context/UserContext";

const Sidebar = ({ isOpen, onClose }) => {
  const { currentUser } = useUser();
  const navigate = useNavigate();

  const navItems = [
    { to: "/home", label: "Home" },
    { to: "#", label: "Search" },
    { to: "#", label: "Messages" },
    { to: "#", label: "Notifications" },
    { to: "#", label: "Settings" },
  ];

  const handleUserClick = () => {
    if (currentUser?.user_id) {
      onClose();
      navigate(`/users/${currentUser.user_id}`);
    }
  };

  return (
    <>
      <div
        className={`sidebar-overlay ${isOpen ? "sidebar-overlay--open" : ""}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside className={`sidebar ${isOpen ? "sidebar--open" : ""}`}>
        <button
          type="button"
          className="sidebar-close"
          onClick={onClose}
          aria-label="Close menu"
        >
          ×
        </button>
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <Link
              key={item.label}
              to={item.to}
              className="sidebar-nav-item"
              onClick={item.to === "#" ? undefined : onClose}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="sidebar-footer">
          {currentUser ? (
            <button
              type="button"
              className="sidebar-user"
              onClick={handleUserClick}
            >
              {currentUser.profile_picture ? (
                <img
                  src={currentUser.profile_picture}
                  alt=""
                  className="sidebar-user-avatar"
                />
              ) : (
                <div className="sidebar-user-avatar-placeholder">—</div>
              )}
              <div className="sidebar-user-text">
                <span className="sidebar-user-name">
                  {currentUser.full_name || "—"}
                </span>
                <span className="sidebar-user-username">
                  @{currentUser.username}
                </span>
              </div>
            </button>
          ) : (
            <Link to="/" className="sidebar-signin" onClick={onClose}>
              Sign in
            </Link>
          )}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
