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
        <header className="friends-header">
          <h1>Friends</h1>
          <span className="friends-count">
            {friends.length} {friends.length === 1 ? "friend" : "friends"}
          </span>
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

