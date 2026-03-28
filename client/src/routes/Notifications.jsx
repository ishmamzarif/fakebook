import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useUser } from "../context/UserContext";

const Notifications = () => {
  const { currentUser } = useUser();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchNotifications = async () => {
    if (!currentUser?.token) {
      setLoading(false);
      setError("Please log in to view notifications.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/v1/notifications", {
        headers: {
          Authorization: `Bearer ${currentUser.token}`,
        },
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.message || "Failed to load");
      setNotifications(data.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [currentUser?.token]);

  const handleAction = async (senderId, action) => {
    console.log(`Notification action: ${action} for sender ${senderId}`);
    if (!senderId) {
      console.error("Missing senderId for notification action");
      return;
    }
    try {
      const res = await fetch(`/api/v1/friends/${action}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${currentUser.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ senderId }),
      });

      if (res.ok) {
        console.log(`Action ${action} successful`);
        fetchNotifications();
      } else {
        const errData = await res.json();
        console.error(`Action ${action} failed:`, errData.message);
      }
    } catch (err) {
      console.error(`Failed to ${action}:`, err);
    }
  };


  const markAllRead = async () => {
    try {
      await fetch("/api/v1/notifications/read", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${currentUser.token}`,
        },
      });
      fetchNotifications();
    } catch (err) {
      console.error("Failed to mark read:", err);
    }
  };

  const newNotifications = notifications.filter((n) => !n.is_read);
  const previousNotifications = notifications.filter((n) => n.is_read);

  const renderNotification = (n) => {
    const { sender, type, created_at } = n;
    
    let content = null;
    let buttons = null;
    const senderName = sender?.full_name || sender?.username || "Someone";

    if (type === "friend_request") {
      const status = sender?.status || 'pending';

      if (status === 'pending') {
        content = (
          <p className="notification-text">
            <strong>{senderName}</strong> sent you a friend request.
          </p>
        );
        buttons = (
          <div className="notification-actions">
            <button className="notif-btn notif-btn-accept" onClick={() => handleAction(sender?.user_id, "accept")}>
              Accept
            </button>
            <button className="notif-btn notif-btn-reject" onClick={() => handleAction(sender?.user_id, "reject")}>
              Reject
            </button>
          </div>
        );
      } else if (status === 'accepted') {
        content = (
          <p className="notification-text notification-text-success">
            You have accepted the friend request from <strong>{senderName}</strong>.
          </p>
        );
      } else if (status === 'rejected') {
        content = (
          <p className="notification-text notification-text-error">
            You have rejected the friend request from <strong>{senderName}</strong>.
          </p>
        );
      }
    } else if (type === "friend_request_accepted") {
      content = (
        <p className="notification-text">
          <strong>{senderName}</strong> accepted your friend request!
        </p>
      );
    } else {
      content = <p className="notification-text">{type.replace(/_/g, " ")}</p>;
    }

    return (
      <article key={n.notification_id} className={`notification-item ${!n.is_read ? 'notification-item-new' : ''}`}>
        <div className="notification-main">
          {sender?.profile_picture ? (
            <img src={sender.profile_picture} alt="" className="notification-avatar" />
          ) : (
            <div className="notification-avatar-placeholder">{senderName[0]?.toUpperCase()}</div>
          )}
          <div className="notification-body">
            {content}
            <span className="notification-time">{new Date(created_at).toLocaleString()}</span>
          </div>
        </div>
        {buttons}
      </article>
    );
  };



  return (
    <section className="notifications-page">
      <div className="notifications-container">
        <div className="notifications-header">
          <h1 className="notifications-title">Notifications</h1>
          {!loading && newNotifications.length > 0 && (
            <button className="mark-read-btn" onClick={markAllRead}>Mark all as read</button>
          )}
        </div>

        {loading && <p className="notifications-placeholder">Loading...</p>}
        {error && <p className="notifications-error">{error}</p>}

        {!loading && !error && notifications.length === 0 && (
          <p className="notifications-placeholder">No notifications yet.</p>
        )}

        {newNotifications.length > 0 && (
          <div className="notifications-section">
            <h2 className="section-title">New</h2>
            <div className="notifications-list">
              {newNotifications.map(renderNotification)}
            </div>
          </div>
        )}

        {previousNotifications.length > 0 && (
          <div className="notifications-section">
            <h2 className="section-title">Previous</h2>
            <div className="notifications-list">
              {previousNotifications.map(renderNotification)}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default Notifications;

