import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

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

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!user) return <div>User not found</div>;

  return (
    <div>
      <h1>
        {user.username} {user.full_name ? `(${user.full_name})` : ""}
      </h1>
      {user.profile_picture ? (
        <img
          src={user.profile_picture}
          alt={`${user.username} avatar`}
          style={{ maxWidth: 200 }}
        />
      ) : null}
      <p>Email: {user.email}</p>
      <p>Bio: {user.bio}</p>
      <p>Phone: {user.phone_number}</p>
      <p>Institution: {user.curr_institution}</p>
      <p>
        Profile link:{" "}
        {user.profile_link ? (
          <a href={user.profile_link}>{user.profile_link}</a>
        ) : (
          "—"
        )}
      </p>
      <p>Friends: {user.num_friends}</p>
      <p>Account created: {user.created_at}</p>
    </div>
  );
};

export default UserProfile;
