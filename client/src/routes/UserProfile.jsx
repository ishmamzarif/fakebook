import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useUser } from "../context/UserContext";

const UserProfile = () => {
  const { id } = useParams();
  const { currentUser } = useUser();

  const [user, setUser] = useState(null);
  const [friendStatus, setFriendStatus] = useState("LOADING");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [hover, setHover] = useState(null);

  /* ================= USER ================= */
  useEffect(() => {
    setLoading(true);
    fetch(`/api/v1/users/${id}`)
      .then(res => {
        if (!res.ok) throw new Error("User not found");
        return res.json();
      })
      .then(data => setUser(data.data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  /* ================= FRIEND STATUS ================= */
  useEffect(() => {
    if (!currentUser || !id) return;

    if (String(currentUser.user_id) === String(id)) {
      setFriendStatus("SELF");
      return;
    }
    fetch(`/api/v1/friends/status/${id}`, {
      headers: {
        Authorization: `Bearer ${currentUser.token}`,
      },
    })
      .then(res => res.json())
      .then(data => setFriendStatus(data.status))
      .catch(() => setFriendStatus("NONE"));
  }, [id, currentUser]);

  /* ================= ACTIONS ================= */
  const sendFriendRequest = async () => {
    setFriendStatus("LOADING");

    const res = await fetch("/api/v1/friends/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sender_id: currentUser.user_id,
        receiver_id: user.user_id,
      }),
    });

    if (res.ok) setFriendStatus("SENT");
    else setFriendStatus("NONE");
  };

  const acceptFriendRequest = async () => {
    setFriendStatus("LOADING");

    const res = await fetch("/api/v1/friends/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sender_id: user.user_id,
      }),
    });

    if (res.ok) setFriendStatus("FRIENDS");
  };

  /* ================= BUTTON STYLES ================= */
  const baseBtn = {
    background: "#000",
    color: "#fff",
    border: "1px solid #3a3b3c",
    padding: "8px 18px",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "0.2s",
  };

  const hoverBtn = { background: "#242526" };

  const renderFriendButton = () => {
    if (!currentUser || friendStatus === "SELF") return null;

    if (friendStatus === "NONE") {
      return (
        <button
          style={{ ...baseBtn, ...(hover === "add" && hoverBtn) }}
          onMouseEnter={() => setHover("add")}
          onMouseLeave={() => setHover(null)}
          onClick={sendFriendRequest}
        >
          Add Friend
        </button>
      );
    }

    if (friendStatus === "SENT") {
      return (
        <button style={{ ...baseBtn, opacity: 0.6 }} disabled>
          Request Sent
        </button>
      );
    }

    if (friendStatus === "RECEIVED") {
      return (
        <button
          style={{ ...baseBtn, ...(hover === "confirm" && hoverBtn) }}
          onMouseEnter={() => setHover("confirm")}
          onMouseLeave={() => setHover(null)}
          onClick={acceptFriendRequest}
        >
          Confirm
        </button>
      );
    }

    if (friendStatus === "FRIENDS") {
      return (
        <button style={{ ...baseBtn, opacity: 0.6 }} disabled>
          Friends
        </button>
      );
    }

    return null;
  };

  /* ================= RENDER ================= */
  if (loading)
    return <div className="profile-page"><div className="app-loading">Loading...</div></div>;

  if (error || !user)
    return <div className="profile-page"><div className="app-error">{error || "User not found"}</div></div>;

  return (
    <div className="profile-page">
      <main className="profile-main">

        {/* COVER */}
        <div className="profile-cover-wrap">
          <div
            className="profile-cover"
            style={user.cover_picture ? { backgroundImage: `url(${user.cover_picture})` } : {}}
          />
          <div className="profile-avatar-on-cover">
            {user.profile_picture ? (
              <img src={user.profile_picture} alt="" className="profile-avatar" />
            ) : (
              <div className="profile-avatar-placeholder">—</div>
            )}
          </div>
        </div>

        {/* HEADER */}
        <header className="profile-header">
          <div className="profile-title-row">
            <h1 className="profile-title">{user.username}</h1>
            {currentUser && String(currentUser.user_id) === String(id) && (
              <Link to={`/users/${id}/update`} className="update-profile-btn">
                Update Profile
              </Link>
            )}
          </div>

          <p className="profile-subtitle">{user.full_name || "—"}</p>

          {!currentUser || friendStatus === "SELF" ? null : (
            <div style={{ display: "flex", gap: "12px", marginTop: "14px" }}>
              {renderFriendButton()}
              <button
                style={{ ...baseBtn, ...(hover === "msg" && hoverBtn) }}
                onMouseEnter={() => setHover("msg")}
                onMouseLeave={() => setHover(null)}
              >
                Message
              </button>
            </div>
          )}
        </header>

        {/* INFO */}
        <div className="profile-info">
          <div className="profile-row"><span className="profile-label">email</span> {user.email}</div>
          <div className="profile-row"><span className="profile-label">bio</span> {user.bio || "—"}</div>
          <div className="profile-row"><span className="profile-label">phone</span> {user.phone_number || "—"}</div>
          <div className="profile-row"><span className="profile-label">institution</span> {user.curr_institution || "—"}</div>

          <div className="profile-row">
            <span className="profile-label">profile</span>{" "}
            {user.profile_link ? (
              <a href={user.profile_link} target="_blank" rel="noreferrer" className="profile-ext-link">
                {user.profile_link}
              </a>
            ) : "—"}
          </div>

          <div className="profile-row"><span className="profile-label">friends</span> {user.num_friends ?? "—"}</div>
          <div className="profile-row"><span className="profile-label">joined</span> {user.created_at}</div>
        </div>

      </main>
    </div>
  );
};

export default UserProfile;
