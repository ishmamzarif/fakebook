import { useUser } from "../context/UserContext";
import { useEffect, useState } from "react";

const FriendActions = ({ profileUserId }) => {
  const { currentUser } = useUser();

  const [status, setStatus] = useState("LOADING");
  const [hover, setHover] = useState(null);

  /* ================= LOAD STATUS ================= */
  useEffect(() => {
    if (!currentUser || !profileUserId) return;

    if (String(currentUser.user_id) === String(profileUserId)) {
      setStatus("SELF");
      return;
    }

    fetch(`/api/v1/friends/status/${profileUserId}`, {
      headers: {
        Authorization: `Bearer ${currentUser.token}`,
      },
    })
      .then((res) => res.json())
      .then((data) => setStatus(data.status))
      .catch(() => setStatus("NONE"));
  }, [currentUser, profileUserId]);

  if (!currentUser || status === "SELF") return null;

  /* ================= ACTIONS ================= */
  const sendFriendRequest = async () => {
    setStatus("LOADING");

    const res = await fetch("/api/v1/friends/request", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${currentUser.token}`,
      },
      body: JSON.stringify({
        receiver_id: profileUserId,
      }),
    });

    if (res.ok) setStatus("SENT");
    else setStatus("NONE");
  };

  const acceptFriendRequest = async () => {
    setStatus("LOADING");

    const res = await fetch("/api/v1/friends/accept", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${currentUser.token}`,
      },
      body: JSON.stringify({
        senderId: profileUserId,
      }),
    });

    if (res.ok) setStatus("FRIENDS");
  };

  const unfriendUser = async () => {
    setStatus("LOADING");

    const res = await fetch("/api/v1/friends/unfriend", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${currentUser.token}`,
      },
      body: JSON.stringify({
        userId: profileUserId,
      }),
    });

    if (res.ok) setStatus("NONE");
    else setStatus("FRIENDS");
  };

  /* ================= STYLES ================= */
  const baseBtn = {
    background: "#000",
    color: "#fff",
    border: "1px solid #3a3b3c",
    padding: "8px 16px",
    borderRadius: "6px",
    cursor: "pointer",
    transition: "0.2s",
  };

  const hoverBtn = { background: "#242526" };

  /* ================= RENDER ================= */
  const renderFriendButton = () => {
    if (status === "LOADING") {
      return (
        <button style={{ ...baseBtn, opacity: 0.6 }} disabled>
          Loading...
        </button>
      );
    }

    if (status === "NONE") {
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

    if (status === "SENT") {
      return (
        <button style={{ ...baseBtn, opacity: 0.6 }} disabled>
          Request Sent
        </button>
      );
    }

    if (status === "RECEIVED") {
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

    if (status === "FRIENDS") {
      const isHover = hover === "friends";

      return (
        <button
          style={{
            ...baseBtn,
            ...(isHover && { background: "#3a3b3c" }),
          }}
          onMouseEnter={() => setHover("friends")}
          onMouseLeave={() => setHover(null)}
          onClick={isHover ? unfriendUser : undefined}
        >
          {isHover ? "Unfriend" : "Friends"}
        </button>
      );
    }

    return null;
  };

  return (
    <div style={{ display: "flex", gap: "12px" }}>
      {renderFriendButton()}

      <button
        style={{ ...baseBtn, ...(hover === "msg" && hoverBtn) }}
        onMouseEnter={() => setHover("msg")}
        onMouseLeave={() => setHover(null)}
      >
        Message
      </button>
    </div>
  );
};

export default FriendActions;