import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useUser } from "../context/UserContext";
import { parseTimestamp } from "../utils/dateUtils";

const Notifications = () => {
  const { currentUser } = useUser();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const markAllSeen = async () => {
    if (!currentUser?.token) return;
    try {
      const res = await fetch("/api/v1/notifications/seen", {
        method: "PUT",
        headers: { Authorization: `Bearer ${currentUser.token}` }
      });
      if (res.ok) {
        window.dispatchEvent(new Event("notifications_seen"));
      }
    } catch (err) {
      console.error("Failed to mark seen:", err);
    }
  };

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
    fetchNotifications().then(() => markAllSeen());
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
    const { type, created_at, is_read, actor_id, actor_username, actor_full_name, actor_profile_picture, post_id, conversation_id } = n;
    
    let content = null;
    let buttons = null;
    const actorName = actor_full_name || actor_username || "Someone";
    const actorLink = actor_id ? `/users/${actor_id}` : null;
    const actorNameEl = actorLink
      ? <Link to={actorLink} className="notification-actor-link" onClick={e => e.stopPropagation()}><strong>{actorName}</strong></Link>
      : <strong>{actorName}</strong>;

    // Build navigation URL
    let navUrl = null;
    if (post_id) navUrl = `/posts/${post_id}`;
    else if (conversation_id) navUrl = `/messages/${conversation_id}`;
    else if (actor_id && (type === 'friend_request' || type === 'friend_request_accepted')) navUrl = `/users/${actor_id}`;

    const avatarEl = actor_profile_picture ? (
      <img src={actor_profile_picture} alt="" className="notification-avatar" />
    ) : (
      <div className="notification-avatar-placeholder">{actorName[0]?.toUpperCase()}</div>
    );

    if (type === "friend_request") {
      content = (
        <p className="notification-text">
          {actorNameEl} sent you a friend request.
        </p>
      );
      buttons = (
        <div className="notification-actions" onClick={e => e.stopPropagation()}>
          <button className="notif-btn notif-btn-accept" onClick={() => handleAction(actor_id, "accept")}>
            Accept
          </button>
          <button className="notif-btn notif-btn-reject" onClick={() => handleAction(actor_id, "reject")}>
            Reject
          </button>
        </div>
      );
    } else if (type === "friend_request_accepted") {
      content = <p className="notification-text">You and {actorNameEl} are now friends.</p>;
    } else if (type === "now_friends") {
      content = <p className="notification-text">You and {actorNameEl} are now friends.</p>;
    } else if (type === "message") {
      content = <p className="notification-text">{actorNameEl} sent you a message.</p>;
    } else if (type === "comment") {
      content = <p className="notification-text">{actorNameEl} commented on your post.</p>;
    } else if (type === "comment_reply") {
      content = <p className="notification-text">{actorNameEl} replied to your comment.</p>;
    } else if (type === "like") {
      content = <p className="notification-text">{actorNameEl} liked your content.</p>;
    } else if (type === "new_post") {
      content = <p className="notification-text">{actorNameEl} shared a new post.</p>;
    } else if (type === "post_tag") {
      content = <p className="notification-text">{actorNameEl} tagged you in a post.</p>;
    } else if (type === "post_flagged") {
      content = <p className="notification-text">System flagged your post for inappropriate content.</p>;
    } else if (type === "comment_flagged") {
      content = <p className="notification-text">System flagged your comment for inappropriate content.</p>;
    } else if (type === "story_flagged") {
      content = <p className="notification-text">System flagged your story for inappropriate content.</p>;
    } else {
      content = <p className="notification-text">{type.replace(/_/g, " ")}</p>;
    }

    const itemClass = `notification-item ${!is_read ? 'notification-unread' : ''} ${navUrl ? 'notification-clickable' : ''}`;

    return (
      <article
        key={n.notification_id}
        className={itemClass}
        onClick={() => navUrl && navigate(navUrl)}
        role={navUrl ? "button" : undefined}
        tabIndex={navUrl ? 0 : undefined}
      >
        <div className="notification-main">
          {actorLink ? (
            <Link to={actorLink} className="notification-avatar-link" onClick={e => e.stopPropagation()}>{avatarEl}</Link>
          ) : avatarEl}
          <div className="notification-body">
            {content}
            <span className="notification-time">{parseTimestamp(created_at)?.toLocaleString()}</span>
          </div>
          {navUrl && <span className="notification-arrow">›</span>}
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

