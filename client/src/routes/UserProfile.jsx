import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";

const UserProfile = () => {
  const { id } = useParams();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`/api/v1/users/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("User not found");
        return res.json();
      })
      .then((data) => {
        setUser(data.data || null);
        setError(null);
      })
      .catch((err) => {
        setError(err.message || "Failed to load user");
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div style={styles.page}><div style={styles.loading}>Loading...</div></div>;
  if (error) return <div style={styles.page}><div style={styles.error}>Error: {error}</div></div>;
  if (!user) return <div style={styles.page}><div style={styles.error}>User not found</div></div>;

  return (
    <div style={styles.page}>
      <nav style={styles.nav}>
        <Link to="/" style={styles.link}>log out</Link>
        <span style={styles.sep}> / </span>
        <Link to="/home" style={styles.link}>users</Link>
      </nav>
      <main style={styles.main}>
        <header style={styles.header}>
          {user.profile_picture ? (
            <img
              src={user.profile_picture}
              alt=""
              style={styles.avatar}
            />
          ) : (
            <div style={styles.avatarPlaceholder}>—</div>
          )}
          <div>
            <h1 style={styles.title}>{user.username}</h1>
            <p style={styles.subtitle}>{user.full_name || "—"}</p>
          </div>
        </header>
        <div style={styles.info}>
          <div style={styles.row}><span style={styles.label}>email</span> {user.email}</div>
          <div style={styles.row}><span style={styles.label}>bio</span> {user.bio || "—"}</div>
          <div style={styles.row}><span style={styles.label}>phone</span> {user.phone_number || "—"}</div>
          <div style={styles.row}><span style={styles.label}>institution</span> {user.curr_institution || "—"}</div>
          <div style={styles.row}>
            <span style={styles.label}>profile</span>{" "}
            {user.profile_link ? (
              <a href={user.profile_link} style={styles.extLink} target="_blank" rel="noopener noreferrer">{user.profile_link}</a>
            ) : (
              "—"
            )}
          </div>
          <div style={styles.row}><span style={styles.label}>friends</span> {user.num_friends ?? "—"}</div>
          <div style={styles.row}><span style={styles.label}>joined</span> {user.created_at || "—"}</div>
        </div>
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
    fontSize: 12,
  },
  link: {
    color: "#fff",
    textDecoration: "underline",
  },
  sep: { color: "#444" },
  main: {
    maxWidth: 480,
    border: "1px solid #222",
    padding: "32px 24px",
  },
  header: {
    display: "flex",
    gap: 24,
    marginBottom: 32,
    paddingBottom: 24,
    borderBottom: "1px solid #222",
  },
  avatar: {
    width: 64,
    height: 64,
    objectFit: "cover",
    border: "1px solid #333",
  },
  avatarPlaceholder: {
    width: 64,
    height: 64,
    border: "1px solid #333",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#444",
    fontSize: 12,
  },
  title: {
    margin: "0 0 4px 0",
    fontSize: 18,
    fontWeight: 500,
    letterSpacing: 2,
  },
  subtitle: {
    margin: 0,
    color: "#666",
    fontSize: 12,
  },
  info: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    fontSize: 13,
  },
  row: {
    color: "#ccc",
  },
  label: {
    color: "#666",
    marginRight: 8,
    minWidth: 80,
    display: "inline-block",
  },
  extLink: {
    color: "#fff",
    textDecoration: "underline",
  },
  loading: { color: "#666", fontSize: 12 },
  error: { color: "#999", fontSize: 12 },
};

export default UserProfile;
