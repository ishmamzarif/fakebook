import React, { useCallback, useEffect, useRef, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { useUser } from "../context/UserContext";
import { useNotifications } from "../context/NotificationContext";
import Sidebar from "./Sidebar";
import SearchOverlay from "./SearchOverlay";
import ChatOverlay from "./ChatOverlay";
import Settings from "./Settings";
import FriendsBar from "./FriendsBar";

// Keys that fire after '?' is pressed
const SHORTCUTS = {
  h: "home",
  s: "search",
  n: "notifications",
  l: "logout",
  t: "settings",
  u: "profile",
  m: "messages",
  f: "friends",
};

const isTypingTarget = (el) =>
  el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);

const Layout = () => {
  // sidebar off by default -> false

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const navigate = useNavigate();
  const { setCurrentUser, currentUser } = useUser();
  const { unreadCount } = useNotifications();
  const awaitingChord = useRef(false);   // true after '?' was pressed
  const chordTimer = useRef(null);       // clears chord window after 1.5s
  const [selectedUserForChat, setSelectedUserForChat] = useState(null);

  const [chatOpen, setChatOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [friendsBarOpen, setFriendsBarOpen] = useState(true);

  const handleLogout = useCallback(() => {
    setCurrentUser(null);
    navigate("/");
  }, [setCurrentUser, navigate]);

  // Keyboard shortcut handler
  useEffect(() => {
    const onKeyDown = (e) => {
      const key = e.key;

      // Arrow keys: open/close sidebar (work even in inputs)
      if (key === "ArrowRight" && !isTypingTarget(document.activeElement)) {
        setSidebarOpen(true);
        return;
      }
      if ((key === "ArrowLeft" || key === "Escape") && !isTypingTarget(document.activeElement)) {
        setSidebarOpen(false);
        return;
      }

      // Ignore chord shortcuts when typing in a field or using modifier combos
      if (isTypingTarget(document.activeElement)) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      if (awaitingChord.current) {
        // Second key of the chord
        clearTimeout(chordTimer.current);
        awaitingChord.current = false;

        const action = SHORTCUTS[key];
        if (!action) return;

        e.preventDefault();
        switch (action) {
          case "home": navigate("/home"); break;
          case "search": setSearchOpen(true); break;
          case "logout": handleLogout(); break;
          case "profile": if (currentUser?.user_id) navigate(`/users/${currentUser.user_id}`); break;
          case "notifications": navigate("/notifications"); break;
          case "messages": setChatOpen(prev => !prev); break;
          case "settings": setSettingsOpen(true); break;
          case "friends": setFriendsBarOpen(prev => !prev); break;
          default: break;
        }
        return;
      }

      // First key — must be '?'
      if (key === "?") {
        e.preventDefault();
        awaitingChord.current = true;
        chordTimer.current = setTimeout(() => {
          awaitingChord.current = false;
        }, 1500);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      clearTimeout(chordTimer.current);
    };
  }, [navigate, handleLogout, currentUser]);

  return (
    <div className="layout">
      <header className="layout-topbar">
        <div className="topbar-left">
          <button
            type="button"
            className={`sidebar-toggle ${sidebarOpen ? "active" : ""}`}
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle menu"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
        </div>

        {currentUser && (
          <nav className="topbar-center">
            <button 
              type="button" 
              className="topbar-nav-icon"
              onClick={() => navigate("/home")}
              title="Home"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                <polyline points="9 22 9 12 15 12 15 22"></polyline>
              </svg>
            </button>

            <button 
              type="button" 
              className="topbar-nav-icon"
              onClick={() => setSearchOpen(true)}
              title="Search"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </button>

            <button 
              type="button" 
              className="topbar-nav-icon"
              onClick={() => navigate("/notifications")}
              title="Notifications"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
              {unreadCount > 0 && (
                <span className="notif-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
              )}
            </button>

            <button 
              type="button" 
              className="topbar-nav-icon"
              onClick={() => setSettingsOpen(true)}
              title="Settings"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33 1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82 1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
              </svg>
            </button>
          </nav>
        )}

        <div className="topbar-right">
          {currentUser && (
            <button 
              type="button" 
              className={`topbar-nav-icon friends-bar-toggle-btn ${friendsBarOpen ? "active" : ""}`}
              onClick={() => setFriendsBarOpen(!friendsBarOpen)}
              title="Toggle Friends Bar"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
            </button>
          )}
          {currentUser ? (
            <button type="button" className="app-link layout-logout-btn" onClick={handleLogout}>
              log out
            </button>
          ) : (
            <button type="button" className="app-link layout-logout-btn" onClick={() => navigate("/")}>
              log in
            </button>
          )}
        </div>
      </header>

      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onSearchOpen={() => {
          setSidebarOpen(false);
          setSearchOpen(true);
        }}
        onMessagesOpen={() => {
          setChatOpen(true);
        }}
        onSettingsOpen={() => {
          setSettingsOpen(true);
        }}
      />

      {searchOpen && (
        <SearchOverlay onClose={() => setSearchOpen(false)} />
      )}

      {settingsOpen && (
        <Settings isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
      )}

      <main className="layout-main">
        <Outlet context={{
          openChat: (user) => {
            setSelectedUserForChat(user);
            setChatOpen(true);
          }
        }} />
      </main>

      {currentUser && (
        <ChatOverlay
          isOpen={chatOpen}
          onToggle={() => setChatOpen(!chatOpen)}
          onClose={() => {
            setChatOpen(false);
            setSelectedUserForChat(null);
          }}
          externalUser={selectedUserForChat}
          onUserSelected={() => setSelectedUserForChat(null)}
        />
      )}

      {currentUser && (
        <FriendsBar 
          isOpen={friendsBarOpen} 
          setIsOpen={setFriendsBarOpen} 
        />
      )}
    </div>
  );
};

export default Layout;
