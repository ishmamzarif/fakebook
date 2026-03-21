import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useUser } from "../context/UserContext";

const Sidebar = ({ isOpen, onClose }) => {
  const { currentUser } = useUser();
  const navigate = useNavigate();

  const [showSearch, setShowSearch] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [searchError, setSearchError] = useState("");

  const navItems = [
    { to: "/home", label: "Home" },
    { action: "search", label: "Search" },
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

  const normalizedSearchTerm = useMemo(
    () => searchTerm.trim().toLowerCase(),
    [searchTerm]
  );

  useEffect(() => {
    if (!showSearch) return;

    const term = searchTerm.trim();
    if (!term) {
      setSuggestions([]);
      setSearchError("");
      setLoadingSuggestions(false);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoadingSuggestions(true);
      try {
        const res = await fetch(`/api/v1/users?q=${encodeURIComponent(term)}&limit=8`, {
          signal: controller.signal,
        });
        if (!res.ok) {
          throw new Error("Could not fetch users");
        }

        const data = await res.json();
        setSuggestions(Array.isArray(data.data) ? data.data : []);
        setSearchError("");
      } catch (err) {
        if (err.name !== "AbortError") {
          setSuggestions([]);
          setSearchError("Search failed. Try again.");
        }
      } finally {
        setLoadingSuggestions(false);
      }
    }, 220);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [searchTerm, showSearch]);

  const closeSearch = () => {
    setShowSearch(false);
    setSearchTerm("");
    setSuggestions([]);
    setSearchError("");
    setLoadingSuggestions(false);
  };

  const openProfile = (userId) => {
    navigate(`/users/${userId}`);
    onClose();
    closeSearch();
  };

  const handleSearchSubmit = () => {
    if (!normalizedSearchTerm) return;

    const exactMatch = suggestions.find(
      (user) => user.username?.toLowerCase() === normalizedSearchTerm
    );

    if (exactMatch) {
      openProfile(exactMatch.user_id);
      return;
    }

    if (suggestions.length > 0) {
      openProfile(suggestions[0].user_id);
      return;
    }

    setSearchError("No user found for this handle.");
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
          {navItems.map((item) =>
            item.action === "search" ? (
              <button
                key={item.label}
                className="sidebar-nav-item sidebar-nav-button"
                onClick={() => {
                  if (showSearch) {
                    closeSearch();
                  } else {
                    setShowSearch(true);
                    setSearchError("");
                  }
                }}
              >
                {item.label}
              </button>
            ) : (
              <Link
                key={item.label}
                to={item.to}
                className="sidebar-nav-item"
                onClick={item.to === "#" ? undefined : onClose}
              >
                {item.label}
              </Link>
            )
          )}
        </nav>

        {/* 🔍 Search Bar */}
        {showSearch && (
          <div className="sidebar-search">
            <input
              type="text"
              placeholder="Search by handle..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="sidebar-search-input"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSearchSubmit();
              }}
            />
            <button
              className="sidebar-search-btn"
              onClick={handleSearchSubmit}
            >
              Search
            </button>
            {loadingSuggestions ? (
              <div className="sidebar-search-info">Searching...</div>
            ) : null}
            {searchError ? (
              <div className="sidebar-search-error">{searchError}</div>
            ) : null}
            {searchTerm.trim() && suggestions.length > 0 ? (
              <div className="sidebar-search-results">
                {suggestions.map((user) => (
                  <button
                    key={user.user_id}
                    type="button"
                    className="sidebar-search-result-item"
                    onClick={() => openProfile(user.user_id)}
                  >
                    <span className="sidebar-search-result-handle">@{user.username}</span>
                    <span className="sidebar-search-result-name">
                      {user.full_name || "No name"}
                    </span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        )}

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