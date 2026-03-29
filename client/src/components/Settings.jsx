import React, { useState, useEffect } from "react";
import { useUser } from "../context/UserContext";
import { useNavigate } from "react-router-dom";

const Settings = ({ isOpen, onClose }) => {
  const { currentUser, setCurrentUser } = useUser();
  const [isPrivate, setIsPrivate] = useState(false);
  const [hideInappropriate, setHideInappropriate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (currentUser) {
      setIsPrivate(!!currentUser.is_private);
      setHideInappropriate(!!currentUser.hide_inappropriate);
    }
  }, [currentUser]);

  const handleTogglePrivate = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/v1/users/${currentUser.user_id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentUser.token}`,
        },
        body: JSON.stringify({ is_private: !isPrivate }),
      });
      const data = await res.json();
      if (res.ok) {
        setIsPrivate(!isPrivate);
        setCurrentUser({ ...currentUser, ...data.data });
      } else {
        setError(data.message || "Failed to update privacy setting");
      }
    } catch (err) {
      setError("Network error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleInappropriate = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/v1/users/${currentUser.user_id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentUser.token}`,
        },
        body: JSON.stringify({ hide_inappropriate: !hideInappropriate }),
      });
      const data = await res.json();
      if (res.ok) {
        setHideInappropriate(!hideInappropriate);
        setCurrentUser({ ...currentUser, ...data.data });
      } else {
        setError(data.message || "Failed to update content setting");
      }
    } catch (err) {
      setError("Network error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm("Are you sure you want to delete your account? This action is permanent and cannot be undone.");
    if (!confirmed) return;

    try {
      setLoading(true);
      const res = await fetch(`/api/v1/users/${currentUser.user_id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${currentUser.token}`,
        },
      });
      if (res.ok) {
        setCurrentUser(null);
        navigate("/");
        onClose();
      } else {
        const data = await res.json();
        setError(data.message || "Failed to delete account");
      }
    } catch (err) {
      setError("Network error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h2>Settings</h2>
          <button className="settings-close" onClick={onClose}>×</button>
        </div>

        <div className="settings-content">
          {error && <div className="settings-error">{error}</div>}

          <div className="settings-section">
            <div className="settings-item">
              <div className="settings-info">
                <h3>Private Account</h3>
                <p>Only people you approve can see your posts and stories.</p>
              </div>
              <button
                className={`settings-toggle ${isPrivate ? "active" : ""}`}
                onClick={handleTogglePrivate}
                disabled={loading}
              >
                {isPrivate ? "On" : "Off"}
              </button>
            </div>

            <div className="settings-item">
              <div className="settings-info">
                <h3>Hide Inappropriate Content</h3>
                <p>Automatically hide content that may be offensive or sensitive.</p>
              </div>
              <button
                className={`settings-toggle ${hideInappropriate ? "active" : ""}`}
                onClick={handleToggleInappropriate}
                disabled={loading}
              >
                {hideInappropriate ? "On" : "Off"}
              </button>
            </div>
          </div>

          <div className="settings-section danger-zone">
            <h3>Caution</h3>
            <div className="settings-item">
              <div className="settings-info">
                <p>Deleting your account is permanent. All your data will be cleared.</p>
              </div>
              <button className="settings-delete-btn" onClick={handleDeleteAccount} disabled={loading}>
                Delete Account
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
