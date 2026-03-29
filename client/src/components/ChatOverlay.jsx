import React, { useState, useEffect } from "react";
import { useUser } from "../context/UserContext";
import Messages from "../routes/Messages";

const ChatOverlay = ({ isOpen, onToggle, onClose, externalUser, onUserSelected }) => {
  const { currentUser } = useUser();
  const [conversations, setConversations] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [isNewMessage, setIsNewMessage] = useState(false);
  const [friendSearch, setFriendSearch] = useState("");
  const [friends, setFriends] = useState([]);
  const [selectedFriends, setSelectedFriends] = useState({});
  const [groupName, setGroupName] = useState("");
  const [creatingGroupAction, setCreatingGroupAction] = useState(false);

  const fetchFriends = async () => {
    if (!currentUser?.token) return;
    try {
      const res = await fetch("/api/v1/friends", {
        headers: { Authorization: `Bearer ${currentUser.token}` },
      });
      const data = await res.json();
      if (res.ok) setFriends(Array.isArray(data.data) ? data.data : []);
    } catch (err) {
      console.error("Failed to fetch friends:", err);
    }
  };

  const handleCreateGroup = async () => {
    const memberIds = friends.filter((f) => selectedFriends[f.user_id]).map((f) => f.user_id);
    if (!groupName.trim() || memberIds.length === 0) {
      alert("Enter group name and select at least one friend.");
      return;
    }
    setCreatingGroupAction(true);
    try {
      const res = await fetch("/api/v1/groups", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentUser.token}`,
        },
        body: JSON.stringify({ name: groupName.trim(), member_ids: memberIds }),
      });
      const data = await res.json();
      if (res.ok) {
        setGroupName("");
        setSelectedFriends({});
        setIsCreatingGroup(false);
        fetchConversations();
        setSelectedUser({
          ...data.data,
          is_group: true
        });
      }
    } catch (err) {
      alert("Failed to create group.");
    } finally {
      setCreatingGroupAction(false);
    }
  };

  useEffect(() => {
    if (externalUser) {
      setSelectedUser(externalUser);
      if (onUserSelected) onUserSelected();
    }
  }, [externalUser, onUserSelected]);

  const markAsRead = async (conversationId) => {
    if (!currentUser?.token || !conversationId) return;
    try {
      await fetch(`/api/v1/conversations/${conversationId}/read`, {
        method: "POST",
        headers: { Authorization: `Bearer ${currentUser.token}` },
      });
      setConversations(prev => 
        prev.map(c => c.conversation_id === conversationId ? { ...c, unread_count: 0 } : c)
      );
    } catch (err) {
      console.error("Failed to mark as read:", err);
    }
  };

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
                {selectedUser.is_group ? (
                  <div className="convo-header-avatar-placeholder">👥</div>
                ) : selectedUser.profile_picture ? (
                  <img src={selectedUser.profile_picture} alt="" className="convo-header-avatar" />
                ) : (
                  <div className="convo-header-avatar-placeholder">—</div>
                )}
                <span className="chat-window-title">
                  {selectedUser.is_group ? selectedUser.group_name : selectedUser.full_name}
                </span>
              </div>
            ) : isCreatingGroup ? (
              <div className="chat-window-header-user">
                <button className="chat-window-back" onClick={() => { setIsCreatingGroup(false); setIsNewMessage(true); setFriendSearch(""); }}>
                  ←
                </button>
                <span className="chat-window-title">New Group</span>
              </div>
            ) : isNewMessage ? (
              <div className="chat-window-header-user">
                <button className="chat-window-back" onClick={() => { setIsNewMessage(false); setFriendSearch(""); }}>
                  ←
                </button>
                <span className="chat-window-title">New Message</span>
              </div>
            ) : (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
                <span className="chat-window-title">Messages</span>
                <button 
                  style={{ background: "none", border: "none", color: "white", cursor: "pointer", fontSize: "1.2rem" }}
                  onClick={() => { setIsNewMessage(true); fetchFriends(); }}
                  title="New Message"
                >
                  📝
                </button>
              </div>
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
                  conversationId={selectedUser.conversation_id}
                  isGroup={selectedUser.is_group}
                  compact={true} 
                  hideHeader={true}
                  onClose={() => setSelectedUser(null)} 
                />
              </div>
            ) : isCreatingGroup ? (
              <div className="chat-create-group">
                <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--color-border-dark)" }}>
                  <input
                    type="text"
                    className="sidebar-search-input"
                    placeholder="Group Name"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                  />
                  <input
                    type="text"
                    className="sidebar-search-input"
                    placeholder="Search friends..."
                    value={friendSearch}
                    onChange={(e) => setFriendSearch(e.target.value)}
                  />
                  <button
                    onClick={handleCreateGroup}
                    disabled={creatingGroupAction}
                    className="sidebar-search-btn"
                    style={{ background: "white", border: "none", height: "34px", borderRadius: "8px", color: "black", fontWeight: "600", marginTop: "4px" }}
                  >
                    {creatingGroupAction ? "Creating..." : "Create Group Chat"}
                  </button>
                </div>
                <div className="conversations-list">
                  {friends.filter(f => (f.full_name || f.username).toLowerCase().includes(friendSearch.toLowerCase())).length === 0 ? (
                    <div style={{ padding: "20px", textAlign: "center", color: "var(--color-text-dimmed)" }}>
                      No friends found.
                    </div>
                  ) : (
                    friends.filter(f => (f.full_name || f.username).toLowerCase().includes(friendSearch.toLowerCase())).map((friend) => (
                      <div key={friend.user_id} className="conversation-item" onClick={() => setSelectedFriends(prev => ({ ...prev, [friend.user_id]: !prev[friend.user_id] }))}>
                        <input
                          type="checkbox"
                          checked={!!selectedFriends[friend.user_id]}
                          readOnly
                          style={{ marginRight: "10px", accentColor: "black" }}
                        />
                        {friend.profile_picture ? (
                          <img src={friend.profile_picture} alt="" className="convo-avatar" />
                        ) : (
                          <div className="convo-avatar-placeholder">—</div>
                        )}
                        <span className="convo-name">{friend.full_name || friend.username}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : isNewMessage ? (
              <div className="chat-new-message">
                <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--color-border-dark)" }}>
                  <input
                    type="text"
                    className="sidebar-search-input"
                    placeholder="Search friends..."
                    value={friendSearch}
                    onChange={(e) => setFriendSearch(e.target.value)}
                    style={{ marginBottom: "12px" }}
                  />
                  <button
                    onClick={() => { setIsNewMessage(false); setIsCreatingGroup(true); setFriendSearch(""); }}
                    className="sidebar-search-btn"
                    style={{ background: "transparent", border: "1px dashed var(--color-border-dark)", color: "white", fontWeight: "600" }}
                  >
                    + Create New Group
                  </button>
                </div>
                <div className="conversations-list">
                  {friends.filter(f => (f.full_name || f.username).toLowerCase().includes(friendSearch.toLowerCase())).length === 0 ? (
                    <div style={{ padding: "20px", textAlign: "center", color: "var(--color-text-dimmed)" }}>
                      No friends found.
                    </div>
                  ) : (
                    friends.filter(f => (f.full_name || f.username).toLowerCase().includes(friendSearch.toLowerCase())).map((friend) => (
                      <div
                        key={friend.user_id}
                        className="conversation-item"
                        onClick={() => {
                          setSelectedUser({
                            other_user_id: friend.user_id,
                            full_name: friend.full_name || friend.username,
                            profile_picture: friend.profile_picture,
                            is_group: false
                          });
                          setIsNewMessage(false);
                          setFriendSearch("");
                        }}
                      >
                        {friend.profile_picture ? (
                          <img src={friend.profile_picture} alt="" className="convo-avatar" />
                        ) : (
                          <div className="convo-avatar-placeholder">—</div>
                        )}
                        <span className="convo-name">{friend.full_name || friend.username}</span>
                      </div>
                    ))
                  )}
                </div>
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
                      key={convo.conversation_id}
                      className={`conversation-item ${convo.unread_count > 0 ? "unread" : ""}`}
                      onClick={() => {
                        setSelectedUser(convo);
                        if (convo.unread_count > 0) markAsRead(convo.conversation_id);
                      }}
                      style={{ background: convo.unread_count > 0 ? "rgba(255,255,255,0.08)" : "" }}
                    >

                      {convo.is_group ? (
                        <div className="convo-avatar-placeholder">👥</div>
                      ) : convo.profile_picture ? (
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
                          <span className="convo-name" style={{ fontWeight: convo.unread_count > 0 ? "700" : "500" }}>
                            {convo.is_group ? convo.group_name : convo.full_name}
                          </span>
                          <span className="convo-time">
                            {new Date(convo.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                        <div className="convo-preview" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: convo.unread_count > 0 ? "#fff" : "var(--color-text-dimmed)" }}>
                            {convo.message_text}
                          </span>
                          {convo.unread_count > 0 && (
                            <span className="unread-badge">{convo.unread_count}</span>
                          )}
                        </div>
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
        style={{ position: "relative" }}
      >
        <img src="/chat-bubble.png" alt="Messages" className="chat-bubble-icon" />
        {conversations.reduce((acc, c) => acc + (c.unread_count || 0), 0) > 0 && (
          <div className="main-unread-badge">
            {conversations.reduce((acc, c) => acc + (c.unread_count || 0), 0)}
          </div>
        )}
      </button>
    </div>
  );
};

export default ChatOverlay;
