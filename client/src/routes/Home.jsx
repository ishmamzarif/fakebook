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

  if (loading) return <div>Loading users...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h1>Home</h1>
      <p>Total users: {users.length}</p>
      <ul>
        {users.map((u) => (
          <li key={u.user_id}>
            <strong>{u.full_name || "No name"}</strong>{" "}
            (<em>{u.username}</em>) —{" "}
            <Link to={`/users/${u.user_id}`}>View profile</Link>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Home;
