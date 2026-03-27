import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

const SearchOverlay = ({ onClose }) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  // Auto-focus the input when the overlay opens
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Close on Escape key
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  // Debounced search
  useEffect(() => {
    const term = query.trim();
    if (!term) {
      setResults([]);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/v1/users?q=${encodeURIComponent(term)}&limit=8`,
          { signal: controller.signal }
        );
        const data = await res.json();
        setResults(Array.isArray(data.data) ? data.data : []);
      } catch (err) {
        if (err.name !== "AbortError") setResults([]);
      } finally {
        setLoading(false);
      }
    }, 220);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const goToProfile = (userId) => {
    onClose();
    navigate(`/users/${userId}`);
  };

  return (
    <div className="search-overlay" onClick={onClose} aria-modal="true" role="dialog">
      <div className="search-overlay-panel" onClick={(e) => e.stopPropagation()}>
        {/* Search input */}
        <div className="search-overlay-bar">
          <svg className="search-overlay-icon" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={inputRef}
            className="search-overlay-input"
            type="text"
            placeholder="Search people..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoComplete="off"
          />
          {query && (
            <button
              type="button"
              className="search-overlay-clear"
              onClick={() => setQuery("")}
            >
              ✕
            </button>
          )}
        </div>

        {/* Results */}
        {query.trim() && (
          <div className="search-overlay-results">
            {loading ? (
              <div className="search-overlay-status">Searching...</div>
            ) : results.length === 0 ? (
              <div className="search-overlay-status">No results for "{query}"</div>
            ) : (
              results.map((user) => (
                <button
                  key={user.user_id}
                  type="button"
                  className="search-overlay-result"
                  onClick={() => goToProfile(user.user_id)}
                >
                  {user.profile_picture ? (
                    <img
                      src={user.profile_picture}
                      alt=""
                      className="search-result-avatar"
                    />
                  ) : (
                    <div className="search-result-avatar-placeholder">—</div>
                  )}
                  <div className="search-result-info">
                    <span className="search-result-name">
                      {user.full_name || user.username}
                    </span>
                    <span className="search-result-handle">@{user.username}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchOverlay;
