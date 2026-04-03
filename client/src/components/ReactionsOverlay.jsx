import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";

const ReactionsOverlay = ({ postId, onClose, token }) => {
  const [reactions, setReactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchReactions = useCallback(async () => {
    if (!token || !postId) return;

    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/v1/posts/${postId}/reactions`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to load reactions");
      setReactions(data.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [postId, token]);

  useEffect(() => {
    fetchReactions();
  }, [fetchReactions]);

  return (
    <div className="reactions-overlay-backdrop" onClick={onClose}>
      <div className="reactions-overlay" onClick={(e) => e.stopPropagation()}>
        <div className="reactions-overlay-header">
          <h3>Reactions</h3>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="reactions-overlay-body">
          {loading && <div className="overlay-loading">Loading...</div>}
          {error && <div className="overlay-error">{error}</div>}
          {!loading && !error && reactions.map((r) => (
            <div key={r.user_id} className="reaction-user-item">
              <Link to={`/users/${r.user_id}`} className="reaction-user-link">
                {r.profile_picture ? (
                  <img src={r.profile_picture} alt="" className="reaction-user-avatar" />
                ) : (
                  <div className="reaction-user-avatar-placeholder">—</div>
                )}
                <span className="reaction-user-name">{r.full_name || r.username}</span>
              </Link>
              <span className="reaction-emoji-badge">{r.emoji}</span>
            </div>
          ))}
          {!loading && !error && reactions.length === 0 && (
            <div className="overlay-empty">No reactions yet.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReactionsOverlay;
