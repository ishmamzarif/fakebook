import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

const Login = () => {
  const [usernameOrEmail, setUsernameOrEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username_or_email: usernameOrEmail,
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Login failed");
        return;
      }

      if (data.status === "success" && data.data?.user_id) {
        navigate(`/users/${data.data.user_id}`);
      } else {
        setError("Invalid response from server");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Fakebook</h1>
        <p style={styles.subtitle}>Sign in to continue</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            type="text"
            placeholder="Username or email"
            value={usernameOrEmail}
            onChange={(e) => setUsernameOrEmail(e.target.value)}
            autoComplete="username"
            style={styles.input}
            disabled={loading}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            style={styles.input}
            disabled={loading}
          />

          {error && <p style={styles.error}>{error}</p>}

          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p style={styles.footer}>
          <Link to="/home" style={styles.link}>Browse users without signing in</Link>
        </p>
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#000",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 320,
    border: "1px solid #222",
    padding: "48px 32px",
  },
  title: {
    margin: "0 0 8px 0",
    fontSize: 18,
    fontWeight: 500,
    color: "#fff",
    letterSpacing: 2,
  },
  subtitle: {
    margin: "0 0 32px 0",
    color: "#666",
    fontSize: 12,
    letterSpacing: 1,
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  input: {
    padding: "10px 12px",
    fontSize: 13,
    fontFamily: "'IBM Plex Mono', monospace",
    background: "#0a0a0a",
    color: "#fff",
    border: "1px solid #333",
    outline: "none",
  },
  error: {
    margin: 0,
    color: "#999",
    fontSize: 12,
  },
  button: {
    padding: "10px 12px",
    fontSize: 13,
    fontFamily: "'IBM Plex Mono', monospace",
    fontWeight: 500,
    color: "#000",
    background: "#fff",
    border: "1px solid #fff",
    cursor: "pointer",
  },
  footer: {
    margin: "32px 0 0 0",
    fontSize: 11,
    color: "#444",
    textAlign: "center",
  },
  link: {
    color: "#fff",
    textDecoration: "underline",
  },
};

export default Login;
