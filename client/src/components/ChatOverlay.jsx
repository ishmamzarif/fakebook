import React, { useState, useEffect } from "react";
import { useUser } from "../context/UserContext";
import Messages from "../routes/Messages";

const ChatOverlay = ({ isOpen, onToggle, onClose, externalUser, onUserSelected }) => {
  const { currentUser } = useUser();
  const [conversations, setConversations] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (externalUser) {
      setSelectedUser(externalUser);
      if (onUserSelected) onUserSelected();
    }
  }, [externalUser, onUserSelected]);

  const fetchConversations = async () => {
    if (!currentUser?.token) return;
    setLoading(true);
    try {
      const res = await fetch("/api/v1/conversations", {
        headers: { Authorization: `Bearer ${currentUser.token}` },
      });
      const data = await res.json();
      if (res.ok) setConversations(data.data);
    } catch (err) {
      console.error("Failed to fetch conversations:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchConversations();
    } else {
      setSelectedUser(null);
    }
  }, [isOpen]);

  if (!currentUser) return null;

  return (
    <div className="chat-overlay-container">
      {isOpen && (
        <div className="chat-window">
          <div className="chat-window-header">
            {selectedUser ? (
              <div className="chat-window-header-user">
                <button 
                  className="chat-window-back"
                  onClick={() => setSelectedUser(null)}
                >
                  ←
                </button>
                {selectedUser.profile_picture ? (
                  <img src={selectedUser.profile_picture} alt="" className="convo-header-avatar" />
                ) : (
                  <div className="convo-header-avatar-placeholder">—</div>
                )}
                <span className="chat-window-title">{selectedUser.full_name}</span>
              </div>
            ) : (
              <span className="chat-window-title">Messages</span>
            )}
            <button
              className="chat-window-close"
              onClick={onClose}
            >
              ×
            </button>
          </div>

          <div className="chat-window-content">
            {selectedUser ? (
              <div className="conversation-thread">
                <Messages 
                  targetUserId={selectedUser.other_user_id} 
                  compact={true} 
                  hideHeader={true}
                  onClose={() => setSelectedUser(null)} 
                />
              </div>
            ) : (
              <div className="conversations-list">
                {loading ? (
                  <div style={{ padding: "20px", textAlign: "center", color: "var(--color-text-dimmed)" }}>
                    Loading...
                  </div>
                ) : conversations.length === 0 ? (
                  <div style={{ padding: "20px", textAlign: "center", color: "var(--color-text-dimmed)" }}>
                    No conversations yet.
                  </div>
                ) : (
                  conversations.map((convo) => (
                    <div
                      key={convo.other_user_id}
                      className="conversation-item"
                      onClick={() => setSelectedUser(convo)}
                    >
                      {convo.profile_picture ? (
                        <img
                          src={convo.profile_picture}
                          alt={convo.username}
                          className="convo-avatar"
                        />
                      ) : (
                        <div className="convo-avatar-placeholder">—</div>
                      )}
                      <div className="convo-info">
                        <div className="convo-row">
                          <span className="convo-name">{convo.full_name}</span>
                          <span className="convo-time">
                            {new Date(convo.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                        <div className="convo-preview">{convo.message_text}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <button
        className="chat-bubble-btn"
        onClick={onToggle}
        title="Messages"
      >
        <img src="/chat-bubble.png" alt="Messages" className="chat-bubble-icon" />
      </button>
    </div>
  );
};

export default ChatOverlay;
