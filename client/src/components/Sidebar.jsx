import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useUser } from "../context/UserContext";

const Sidebar = ({ isOpen, onClose, onSearchOpen, onMessagesOpen, onSettingsOpen }) => {
  const { currentUser } = useUser();
  const navigate = useNavigate();

  const [pendingRequests, setPendingRequests] = React.useState([]);
  const [unreadNotifCount, setUnreadNotifCount] = React.useState(0);
  const [unreadMsgCount, setUnreadMsgCount] = React.useState(0);

  const fetchCounts = React.useCallback(async () => {
    if (!currentUser?.token) return;
    try {
      // Fetch notifications to count unread
      const nRes = await fetch("/api/v1/notifications", {
        headers: { Authorization: `Bearer ${currentUser.token}` }
      });
      const nData = await nRes.json();
      if (nRes.ok) {
        const count = nData.data.filter(n => !n.is_seen).length;
        setUnreadNotifCount(count);
      }

      // Fetch conversations to count unread
      const cRes = await fetch("/api/v1/conversations", {
        headers: { Authorization: `Bearer ${currentUser.token}` }
      });
      const cData = await cRes.json();
      if (cRes.ok) {
        const count = cData.data.filter(c => c.unread_count > 0).length;
        setUnreadMsgCount(count);
      }

      // Fetch pending friend requests
      const rRes = await fetch("/api/v1/friends/requests", {
        headers: { Authorization: `Bearer ${currentUser.token}` }
      });
      const rData = await rRes.json();
      if (rRes.ok) {
        setPendingRequests(rData.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch sidebar counts:", err);
    }
  }, [currentUser?.token]);

  React.useEffect(() => {
    if (isOpen) {
      fetchCounts();
    }
  }, [isOpen, fetchCounts]);

  // Also poll every 30s
  React.useEffect(() => {
    if (!currentUser) return;
    const interval = setInterval(fetchCounts, 30000);
    return () => clearInterval(interval);
  }, [currentUser, fetchCounts]);

  // Listen for view events from the Notifications page
  React.useEffect(() => {
    const handleSeen = () => setUnreadNotifCount(0);
    window.addEventListener("notifications_seen", handleSeen);
    return () => window.removeEventListener("notifications_seen", handleSeen);
  }, []);

  const navItems = [
    { to: "/home", label: "Home" },
    { to: "/friends", label: "Friends" },
    ...(pendingRequests.length > 0 ? [{ to: "/friends/requests", label: "Friend Requests", count: pendingRequests.length }] : []),
    { action: "search", label: "Search" },
    { action: "messages", label: "Messages", count: unreadMsgCount },
    { to: "/notifications", label: "Notifications", count: unreadNotifCount },
    { action: "settings", label: "Settings" },
  ];

  const handleUserClick = () => {
    if (currentUser?.user_id) {
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

      <nav className="sidebar-nav">
        {navItems.map((item) =>
          item.action === "search" ? (
            <button
              key={item.label}
              className="sidebar-nav-item sidebar-nav-button"
              onClick={() => {
                onSearchOpen();
              }}
            >
              <span className="sidebar-nav-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                {item.label}
                {item.count > 0 && <span className="sidebar-badge" style={{ background: '#f44336', color: 'white', borderRadius: '50%', padding: '2px 8px', fontSize: '0.75rem', fontWeight: 'bold' }}>{item.count > 99 ? "99+" : item.count}</span>}
              </span>
            </button>
          ) : item.action === "messages" ? (
            <button
              key={item.label}
              className="sidebar-nav-item sidebar-nav-button"
              onClick={() => {
                onMessagesOpen();
              }}
            >
              <span className="sidebar-nav-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                {item.label}
                {item.count > 0 && <span className="sidebar-badge" style={{ background: '#f44336', color: 'white', borderRadius: '50%', padding: '2px 8px', fontSize: '0.75rem', fontWeight: 'bold' }}>{item.count > 99 ? "99+" : item.count}</span>}
              </span>
            </button>
          ) : item.action === "settings" ? (
            <button
              key={item.label}
              className="sidebar-nav-item sidebar-nav-button"
              onClick={() => {
                onSettingsOpen();
              }}
            >
              <span className="sidebar-nav-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                {item.label}
                {item.count > 0 && <span className="sidebar-badge" style={{ background: '#f44336', color: 'white', borderRadius: '50%', padding: '2px 8px', fontSize: '0.75rem', fontWeight: 'bold' }}>{item.count > 99 ? "99+" : item.count}</span>}
              </span>
            </button>
          ) : (
            <Link
              key={item.label}
              to={item.to}
              className="sidebar-nav-item"
            >
              <span className="sidebar-nav-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                {item.label}
                {item.count > 0 && <span className="sidebar-badge" style={{ background: '#f44336', color: 'white', borderRadius: '50%', padding: '2px 8px', fontSize: '0.75rem', fontWeight: 'bold' }}>{item.count > 99 ? "99+" : item.count}</span>}
              </span>
            </Link>
          )
        )}
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
          <Link to="/" className="sidebar-signin">
            Sign in
          </Link>
        )}
      </div>
      </aside>
    </>
  );
};

export default Sidebar;