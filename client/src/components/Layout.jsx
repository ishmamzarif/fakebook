import React, { useCallback, useEffect, useRef, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { useUser } from "../context/UserContext";
import Sidebar from "./Sidebar";
import SearchOverlay from "./SearchOverlay";
import ChatOverlay from "./ChatOverlay";
import Settings from "./Settings";

// Keys that fire after '?' is pressed
const SHORTCUTS = {
  h: "home",
  s: "search",
  n: "notifications",
  l: "logout",
  t: "settings",
  u: "profile",
  m: "messages",
};

const isTypingTarget = (el) =>
  el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const navigate = useNavigate();
  const { setCurrentUser, currentUser } = useUser();
  const awaitingChord = useRef(false);   // true after '?' was pressed
  const chordTimer = useRef(null);       // clears chord window after 1.5s
  const [selectedUserForChat, setSelectedUserForChat] = useState(null);

  const [chatOpen, setChatOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

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
  }, [navigate, handleLogout]);

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
          <button type="button" className="app-link layout-logout-btn" onClick={handleLogout}>
            log out
          </button>
        </nav>
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
    </div>
  );
};

export default Layout;
