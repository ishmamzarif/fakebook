import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useUser } from "../context/UserContext";

const UserProfile = () => {
  const { id } = useParams();
  const { currentUser } = useUser();
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

  if (loading) return <div className="profile-page"><div className="app-loading">Loading...</div></div>;
  if (error) return <div className="profile-page"><div className="app-error">Error: {error}</div></div>;
  if (!user) return <div className="profile-page"><div className="app-error">User not found</div></div>;

  const coverStyle = user.cover_picture ? { backgroundImage: `url(${user.cover_picture})` } : undefined;
  const isOwner = currentUser && String(currentUser.user_id) === String(id);

  return (
    <div className="profile-page">
      <main className="profile-main">
        <div className="profile-cover-wrap">
          <div className="profile-cover" style={coverStyle} />
          <div className="profile-avatar-on-cover">
            {user.profile_picture ? (
              <img src={user.profile_picture} alt="" className="profile-avatar" />
            ) : (
              <div className="profile-avatar-placeholder">—</div>
            )}
          </div>
        </div>
        <header className="profile-header">
          <div className="profile-title-row">
            <h1 className="profile-title">{user.username}</h1>
            {isOwner && (
              <Link to={`/users/${id}/update`} className="update-profile-btn">
                Update Profile
              </Link>
            )}
          </div>
          <p className="profile-subtitle">{user.full_name || "—"}</p>
        </header>
        <div className="profile-info">
          <div className="profile-row"><span className="profile-label">email</span> {user.email}</div>
          <div className="profile-row"><span className="profile-label">bio</span> {user.bio || "—"}</div>
          <div className="profile-row"><span className="profile-label">phone</span> {user.phone_number || "—"}</div>
          <div className="profile-row"><span className="profile-label">institution</span> {user.curr_institution || "—"}</div>
          <div className="profile-row">
            <span className="profile-label">profile</span>{" "}
            {user.profile_link ? (
              <a href={user.profile_link} className="profile-ext-link" target="_blank" rel="noopener noreferrer">{user.profile_link}</a>
            ) : (
              "—"
            )}
          </div>
          <div className="profile-row"><span className="profile-label">friends</span> {user.num_friends ?? "—"}</div>
          <div className="profile-row"><span className="profile-label">joined</span> {user.created_at || "—"}</div>
        </div>
      </main>
    </div>
  );
};

export default UserProfile;
