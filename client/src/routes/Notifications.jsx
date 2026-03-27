import React, { useEffect, useState } from "react";
import { useUser } from "../context/UserContext";

const notificationLabel = (type) => {
  if (type === "friend_request") return "Friend request";
  if (type === "friend_request_accepted") return "Friend request accepted";
  return type;
};

const Notifications = () => {
  const { currentUser } = useUser();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchNotifications = async () => {
      if (!currentUser?.token) {
        setLoading(false);
        setError("Please log in to view notifications.");
        return;
      }

      setLoading(true);
      setError("");

      try {
        const res = await fetch("/api/v1/notifications", {
          headers: {
            Authorization: `Bearer ${currentUser.token}`,
          },
        });
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.message || "Could not load notifications");
        }

        setNotifications(Array.isArray(data.data) ? data.data : []);
      } catch (err) {
        setError(err.message || "Could not load notifications");
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, [currentUser?.token]);

  return (
    <section className="notifications-page">
      <div className="notifications-card">
        <h1 className="notifications-title">Notifications</h1>

        {loading ? <p className="notifications-info">Loading notifications...</p> : null}
        {!loading && error ? <p className="notifications-error">{error}</p> : null}

        {!loading && !error && notifications.length === 0 ? (
          <p className="notifications-info">No notifications yet.</p>
        ) : null}

        {!loading && !error && notifications.length > 0 ? (
          <div className="notifications-list">
            {notifications.map((notification) => (
              <article key={notification.notification_id} className="notification-item">
                <p className="notification-type">{notificationLabel(notification.type)}</p>
                <p className="notification-meta">Reference ID: {notification.reference_id ?? "N/A"}</p>
                <p className="notification-time">
                  {new Date(notification.created_at).toLocaleString()}
                </p>
              </article>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
};

export default Notifications;
