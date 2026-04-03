import React, { useState, useEffect } from "react";
import { useUser } from "../context/UserContext";
import { formatDateShort } from "../utils/dateUtils";
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
  const [groupCreationPhoto, setGroupCreationPhoto] = useState(null);
  const [groupCreationPreview, setGroupCreationPreview] = useState("");
  const [creatingGroupAction, setCreatingGroupAction] = useState(false);

  // Group Management State
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [groupMembers, setGroupMembers] = useState([]);
  const [isViewingMembers, setIsViewingMembers] = useState(false);
  const [isEditingGroup, setIsEditingGroup] = useState(false);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [editGroupName, setEditGroupName] = useState("");
  const [groupPhotoFile, setGroupPhotoFile] = useState(null);
  const [groupPhotoPreview, setGroupPhotoPreview] = useState("");
  const [selectedToAdd, setSelectedToAdd] = useState({});

  const fetchGroupMembers = async (conversationId) => {
    if (!currentUser?.token) return;
    try {
      const res = await fetch(`/api/v1/groups/${conversationId}/members`, {
        headers: { Authorization: `Bearer ${currentUser.token}` },
      });
      const data = await res.json();
      if (res.ok) setGroupMembers(data.data);
    } catch (err) {
      console.error("Failed to fetch group members:", err);
    }
  };


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
    const formData = new FormData();
    formData.append("name", groupName.trim());
    formData.append("member_ids", JSON.stringify(memberIds));
    if (groupCreationPhoto) {
        formData.append("image", groupCreationPhoto);
    }

    setCreatingGroupAction(true);
    try {
      const res = await fetch("/api/v1/groups", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${currentUser.token}`,
        },
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setGroupName("");
        setSelectedFriends({});
        setGroupCreationPhoto(null);
        setGroupCreationPreview("");
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

  const handleUpdateGroup = async () => {
    if (!editGroupName.trim()) {
      alert("Group name cannot be empty.");
      return;
    }
    const formData = new FormData();
    if (editGroupName.trim() !== selectedUser.group_name) {
        formData.append("groupName", editGroupName.trim());
    }
    if (groupPhotoFile) {
        formData.append("image", groupPhotoFile);
    }

    try {
      const res = await fetch(`/api/v1/groups/${selectedUser.conversation_id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${currentUser.token}`,
        },
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setIsEditingGroup(false);
        setGroupPhotoFile(null);
        setGroupPhotoPreview("");
        fetchConversations();
        setSelectedUser(prev => ({ ...prev, ...data.data }));
      }
    } catch (err) {
      alert("Failed to update group.");
    }
  };

  const handleAddMember = async () => {
    const userIds = Object.keys(selectedToAdd).filter(id => selectedToAdd[id]).map(id => Number(id));
    if (userIds.length === 0) {
        alert("Select at least one member to add.");
        return;
    }

    try {
      const res = await fetch(`/api/v1/groups/${selectedUser.conversation_id}/members`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentUser.token}`,
        },
        body: JSON.stringify({ userIds }),
      });
      if (res.ok) {
        setIsAddingMember(false);
        setSelectedToAdd({});
        fetchGroupMembers(selectedUser.conversation_id);
      }
    } catch (err) {
      alert("Failed to add member.");
    }
  };

  const handleRemoveMember = async (userId) => {
    try {
      const res = await fetch(`/api/v1/groups/${selectedUser.conversation_id}/members/${userId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${currentUser.token}` },
      });
      if (res.ok) {
        fetchGroupMembers(selectedUser.conversation_id);
      } else {
        const errorData = await res.json();
        alert(errorData.message || "Failed to remove member.");
      }
    } catch (err) {
      alert("Failed to remove member.");
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
      setIsCreatingGroup(false);
      setIsNewMessage(false);
    }
  }, [isOpen]);

  useEffect(() => {
    setShowOptionsMenu(false);
    setIsViewingMembers(false);
    setIsEditingGroup(false);
    setIsAddingMember(false);
    setSelectedToAdd({});
  }, [selectedUser]);

  if (!currentUser) return null;

  return (
    <div className="chat-overlay-container">
      {isOpen && (
        <div className="chat-window" style={{ position: "relative" }}>
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
                  selectedUser.group_photo_url ? (
                    <img src={selectedUser.group_photo_url} alt="" className="convo-header-avatar" />
                  ) : (
                    <div className="convo-header-avatar-placeholder" style={{ background: "#333" }}>👥</div>
                  )
                ) : selectedUser.profile_picture ? (
                  <img src={selectedUser.profile_picture} alt="" className="convo-header-avatar" />
                ) : (
                  <div className="convo-header-avatar-placeholder">—</div>
                )}
                <span className="chat-window-title">
                  {selectedUser.is_group ? selectedUser.group_name : selectedUser.full_name}
                </span>
                {showOptionsMenu && selectedUser && selectedUser.is_group && (
                  <div className="chat-options-menu" style={{ position: "absolute", top: "45px", right: "10px", background: "#1a1a1a", border: "1px solid #333", borderRadius: "8px", zIndex: 1000, overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 4px 12px rgba(0,0,0,0.5)" }}>
                    <button onClick={() => { setIsViewingMembers(true); setShowOptionsMenu(false); }} style={{ padding: "10px 16px", background: "none", border: "none", borderBottom: "1px solid #333", color: "white", cursor: "pointer", textAlign: "left", fontSize: "0.85rem" }}>Show Members</button>
                    {selectedUser.created_by === currentUser.user_id && (
                      <>
                        <button onClick={() => { 
                             setIsEditingGroup(true); 
                             setEditGroupName(selectedUser.group_name); 
                             setGroupPhotoPreview(selectedUser.group_photo_url || ""); 
                             setGroupPhotoFile(null);
                             setShowOptionsMenu(false); 
                        }} style={{ padding: "10px 16px", background: "none", border: "none", borderBottom: "1px solid #333", color: "white", cursor: "pointer", textAlign: "left", fontSize: "0.85rem" }}>Edit Info</button>
                        <button onClick={() => { setIsAddingMember(true); fetchFriends(); setSelectedToAdd({}); setShowOptionsMenu(false); }} style={{ padding: "10px 16px", background: "none", border: "none", color: "white", cursor: "pointer", textAlign: "left", fontSize: "0.85rem" }}>Add Member</button>
                      </>
                    )}
                  </div>
                )}
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
            <div style={{ display: "flex", alignItems: "center" }}>
              {selectedUser && selectedUser.is_group && (
                <button 
                  className="chat-group-options-btn"
                  onClick={() => {
                      setShowOptionsMenu(!showOptionsMenu);
                      if (!showOptionsMenu) fetchGroupMembers(selectedUser.conversation_id);
                  }}
                  style={{ background: "none", border: "none", color: "white", cursor: "pointer", fontSize: "1.2rem", padding: "0 4px" }}
                >
                  ⋮
                </button>
              )}
              <button
                className="chat-window-close"
                onClick={onClose}
              >
                ×
              </button>
            </div>
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
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "8px 0" }}>
                    {groupCreationPreview ? (
                      <img src={groupCreationPreview} alt="" style={{ width: "32px", height: "32px", borderRadius: "50%", objectFit: "cover", border: "1px solid #444" }} />
                    ) : (
                      <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "#222", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", border: "1px solid #444" }}>👥</div>
                    )}
                    <input 
                      type="file" 
                      accept="image/*"
                      id="group-create-photo"
                      style={{ display: "none" }}
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                          setGroupCreationPhoto(file);
                          setGroupCreationPreview(URL.createObjectURL(file));
                        }
                      }}
                    />
                    <label htmlFor="group-create-photo" style={{ background: "#222", border: "1px solid #333", color: "white", padding: "4px 10px", borderRadius: "6px", cursor: "pointer", fontSize: "0.7rem", flexShrink: 0 }}>
                      Add Group Photo
                    </label>
                  </div>
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
                        convo.group_photo_url ? (
                          <img src={convo.group_photo_url} alt="" className="convo-avatar" />
                        ) : (
                          <div className="convo-avatar-placeholder" style={{ background: "#333" }}>👥</div>
                        )
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
                            {formatDateShort(convo.created_at)}
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

          {/* Group Management Overlays */}
          {isViewingMembers && (
            <div className="chat-modal-overlay" style={{ position: "absolute", inset: 0, background: "#000", zIndex: 1100, display: "flex", flexDirection: "column" }}>
              <div className="chat-window-header">
                <div className="chat-window-header-user" style={{ width: "100%" }}>
                  <button type="button" className="chat-window-back" onClick={(e) => { e.stopPropagation(); setIsViewingMembers(false); }}>←</button>
                  <span className="chat-window-title">Group Members</span>
                </div>
              </div>
              <div className="conversations-list" style={{ overflowY: "auto", flex: 1 }}>
                {groupMembers.map(member => (
                  <div key={member.user_id} className="conversation-item" style={{ cursor: "default" }}>
                      {member.profile_picture ? (
                      <img src={member.profile_picture} alt="" className="convo-avatar" />
                    ) : (
                      <div className="convo-avatar-placeholder">—</div>
                    )}
                    <div className="convo-info">
                      <div className="convo-row">
                        <span className="convo-name">{member.full_name || member.username}</span>
                      </div>
                      {selectedUser.created_by === member.user_id && <span style={{ fontSize: "0.7rem", color: "#4ade80", fontWeight: "600" }}>Admin</span>}
                    </div>
                    {selectedUser.created_by === currentUser.user_id && member.user_id !== currentUser.user_id && (
                      <button 
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleRemoveMember(member.user_id); }} 
                        style={{ background: "#222", border: "1px solid #333", color: "#f44336", padding: "4px 8px", borderRadius: "6px", cursor: "pointer", fontSize: "0.7rem", marginLeft: "auto" }}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {isEditingGroup && (
            <div className="chat-modal-overlay" style={{ position: "absolute", inset: 0, background: "#000", zIndex: 1100, display: "flex", flexDirection: "column" }}>
              <div className="chat-window-header">
                <div className="chat-window-header-user" style={{ width: "100%" }}>
                  <button type="button" className="chat-window-back" onClick={(e) => { e.stopPropagation(); setIsEditingGroup(false); }}>←</button>
                  <span className="chat-window-title">Edit Group</span>
                </div>
              </div>
              <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
                <div>
                  <label style={{ fontSize: "0.8rem", color: "#888", display: "block", marginBottom: "4px" }}>Group Name</label>
                  <input 
                    className="sidebar-search-input" 
                    value={editGroupName} 
                    onChange={e => setEditGroupName(e.target.value)} 
                  />
                </div>
                <div>
                  <label style={{ fontSize: "0.8rem", color: "#888", display: "block", marginBottom: "4px" }}>Group Photo</label>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                     {(groupPhotoPreview || selectedUser.group_photo_url) ? (
                      <img src={groupPhotoPreview || selectedUser.group_photo_url} alt="" style={{ width: "40px", height: "40px", borderRadius: "50%", objectFit: "cover", border: "1px solid #333" }} />
                    ) : (
                      <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "#333", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px" }}>👥</div>
                    )}
                    <input 
                      type="file" 
                      accept="image/*"
                      id="group-photo-upload"
                      style={{ display: "none" }}
                      onChange={(e) => {
                         const file = e.target.files[0];
                         if (file) {
                           setGroupPhotoFile(file);
                           setGroupPhotoPreview(URL.createObjectURL(file));
                         }
                      }}
                    />
                    <label htmlFor="group-photo-upload" style={{ background: "#222", border: "1px solid #333", color: "white", padding: "6px 12px", borderRadius: "8px", cursor: "pointer", fontSize: "0.75rem" }}>
                      Choose Photo
                    </label>
                  </div>
                </div>
                <button 
                  type="button"
                  className="sidebar-search-btn" 
                  onClick={handleUpdateGroup}
                  style={{ background: "white", color: "black", fontWeight: "600", marginTop: "10px" }}
                >
                  Save Changes
                </button>
              </div>
            </div>
          )}

          {isAddingMember && (
            <div className="chat-modal-overlay" style={{ position: "absolute", inset: 0, background: "#000", zIndex: 1100, display: "flex", flexDirection: "column" }}>
              <div className="chat-window-header">
                <div className="chat-window-header-user" style={{ width: "100%" }}>
                  <button type="button" className="chat-window-back" onClick={(e) => { e.stopPropagation(); setIsAddingMember(false); }}>←</button>
                  <span className="chat-window-title">Add Member</span>
                </div>
              </div>
              <div style={{ padding: "12px 16px", borderBottom: "1px solid #333" }}>
                  <input
                    type="text"
                    className="sidebar-search-input"
                    placeholder="Search friends..."
                    value={friendSearch}
                    onChange={(e) => setFriendSearch(e.target.value)}
                  />
                  <button 
                    onClick={handleAddMember}
                    className="sidebar-search-btn"
                    style={{ background: "white", border: "none", height: "34px", borderRadius: "8px", color: "black", fontWeight: "600", marginTop: "4px" }}
                  >
                    Add Selected
                  </button>
                </div>
                <div className="conversations-list" style={{ overflowY: "auto", flex: 1 }}>
                  {friends
                    .filter(f => (f.full_name || f.username).toLowerCase().includes(friendSearch.toLowerCase()))
                    .filter(f => !groupMembers.find(m => m.user_id === f.user_id))
                    .map((friend) => (
                      <div
                        key={friend.user_id}
                        className="conversation-item"
                        onClick={() => setSelectedToAdd(prev => ({ ...prev, [friend.user_id]: !prev[friend.user_id] }))}
                      >
                         <input
                           type="checkbox"
                           checked={!!selectedToAdd[friend.user_id]}
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
                  }
                </div>
            </div>
          )}
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
