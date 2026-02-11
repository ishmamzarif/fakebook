import { useUser } from "../context/UserContext";
import { useState } from "react";

const FriendActions = ({ profileUserId }) => {
  const { currentUser } = useUser();
  const [status, setStatus] = useState("idle"); // idle | sent | loading | error

  if (!currentUser || currentUser.user_id === profileUserId) return null;

  const sendFriendRequest = async () => {
    setStatus("loading");
    try {
      const res = await fetch("/api/v1/friends/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receiver_id: profileUserId
        })
      });

      const data = await res.json();
      if (data.status === "success") {
        setStatus("sent");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  };

  return (
    <div style={{ display: "flex", gap: "12px" }}>
      <button
        onClick={sendFriendRequest}
        disabled={status === "sent" || status === "loading"}
        style={{
          background: "#1877f2",
          color: "white",
          border: "none",
          padding: "8px 16px",
          borderRadius: "6px",
          cursor: "pointer"
        }}
      >
        {status === "sent" ? "Request Sent" : "Add Friend"}
      </button>

      <button
        style={{
          background: "#242526",
          color: "white",
          border: "1px solid #3a3b3c",
          padding: "8px 16px",
          borderRadius: "6px",
          cursor: "pointer"
        }}
      >
        Message
      </button>
    </div>
  );
};

export default FriendActions;
