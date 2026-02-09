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

  if (loading) return <div style={styles.page}><div style={styles.loading}>Loading users...</div></div>;
  if (error) return <div style={styles.page}><div style={styles.error}>Error: {error}</div></div>;

  return (
    <div style={styles.page}>
      <nav style={styles.nav}>
        <Link to="/" style={styles.link}>← login</Link>
      </nav>
      <main style={styles.main}>
        <h1 style={styles.title}>USERS</h1>
        <p style={styles.subtitle}>{users.length} total</p>
        <ul style={styles.list}>
          {users.map((u) => (
            <li key={u.user_id} style={styles.listItem}>
              <span style={styles.name}>{u.full_name || "—"}</span>
              <span style={styles.muted}> ({u.username})</span>
              <Link to={`/users/${u.user_id}`} style={styles.link}> → view</Link>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
};

const styles = {
  page: {
    minHeight: "100vh",
    background: "#000",
    color: "#fff",
    padding: "24px 32px",
  },
  nav: {
    marginBottom: 48,
  },
  link: {
    color: "#fff",
    textDecoration: "underline",
    fontSize: 12,
  },
  main: {
    maxWidth: 480,
    border: "1px solid #222",
    padding: "32px 24px",
  },
  title: {
    margin: "0 0 8px 0",
    fontSize: 18,
    fontWeight: 500,
    letterSpacing: 2,
  },
  subtitle: {
    margin: "0 0 24px 0",
    color: "#666",
    fontSize: 11,
  },
  list: {
    listStyle: "none",
    margin: 0,
    padding: 0,
  },
  listItem: {
    padding: "12px 0",
    borderBottom: "1px solid #111",
    fontSize: 13,
  },
  name: { color: "#fff" },
  muted: { color: "#666" },
  loading: { color: "#666", fontSize: 12 },
  error: { color: "#999", fontSize: 12 },
};

export default Home;
