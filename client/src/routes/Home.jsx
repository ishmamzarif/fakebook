import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const Home = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch("/api/v1/users")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load users");
        return res.json();
      })
      .then((data) => {
        setUsers(data.data || []);
        setError(null);
      })
      .catch((err) => setError(err.message || "Error"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="home-page"><div className="app-loading">Loading users...</div></div>;
  if (error) return <div className="home-page"><div className="app-error">Error: {error}</div></div>;

  return (
    <div className="home-page">
      <main className="home-main">
        <h1 className="home-title">USERS</h1>
        <p className="home-subtitle">{users.length} total</p>
        <ul className="home-list">
          {users.map((u) => (
            <li key={u.user_id} className="home-list-item">
              <span className="home-name">{u.full_name || "—"}</span>
              <span className="home-muted"> ({u.username})</span>
              <Link to={`/users/${u.user_id}`} className="home-link"> → view</Link>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
};

export default Home;
