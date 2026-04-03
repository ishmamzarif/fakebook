import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useUser } from "../context/UserContext";
import "../styles/Friends.css";

const Friends = () => {
  const { currentUser } = useUser();
  const navigate = useNavigate();
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!currentUser?.token) {
      setLoading(false);
      setError("Please log in to see your friends.");
      return;
    }

    setLoading(true);
    fetch("/api/v1/friends", {
      headers: {
        Authorization: `Bearer ${currentUser.token}`,
      },
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.message || "Failed to load friends");
        }
        setFriends(Array.isArray(data.data) ? data.data : []);
        setError("");
      })
      .catch((err) => {
        setFriends([]);
        setError(err.message || "Failed to load friends");
      })
      .finally(() => setLoading(false));
  }, [currentUser]);

  return (
    <section className="friends-page">
      <div className="friends-card">
        <header className="friends-header" style={{ flexDirection: 'column', gap: '15px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'baseline' }}>
            <h1>Friends</h1>
            <span className="friends-count">
              {friends.length} {friends.length === 1 ? "friend" : "friends"}
            </span>
          </div>
          <div className="friends-tabs" style={{ display: 'flex', gap: '20px', fontSize: '14px', borderBottom: '1px solid #222', width: '100%', paddingBottom: '10px' }}>
            <span style={{ color: '#fff', borderBottom: '2px solid #4ade80', paddingBottom: '9px', marginBottom: '-11px' }}>All Friends</span>
            <Link to="/friends/requests" style={{ color: '#666', textDecoration: 'none' }}>Pending Requests</Link>
          </div>
        </header>

        {loading ? (
          <div className="friends-state">Loading your friends...</div>
        ) : error ? (
          <div className="friends-state friends-state--error">{error}</div>
        ) : friends.length === 0 ? (
          <div className="friends-state">You don&apos;t have any friends yet.</div>
        ) : (
          <ul className="friends-list">
            {friends.map((friend) => (
              <li key={friend.user_id} className="friends-item">
                  {friend.profile_picture ? (
                    <img
                      src={friend.profile_picture}
                      alt=""
                      className="friends-avatar"
                    />
                  ) : (
                    <div className="friends-avatar friends-avatar--placeholder">—</div>
                  )}
                  <div className="friends-text">
                    <Link
                      to={`/users/${friend.user_id}`}
                      className="friends-name"
                    >
                      {friend.full_name || friend.username}
                    </Link>
                    <span className="friends-handle">@{friend.username}</span>
                  </div>
                </li>
              ))}
          </ul>
        )}
      </div>
    </section>
  );
};

export default Friends;

