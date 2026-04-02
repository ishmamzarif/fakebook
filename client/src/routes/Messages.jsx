import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useUser } from "../context/UserContext";
import { parseTimestamp, formatTimeShort } from "../utils/dateUtils";

const EMOJIS = ["😀", "😂", "😍", "😎", "👍", "🔥", "❤️", "🎉"];
const REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "😡"];

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const Messages = ({ targetUserId, conversationId, isGroup = false, compact = false, hideHeader = false, onClose }) => {
  const { id: routeUserId } = useParams();
  const id = targetUserId || routeUserId;
  const { currentUser } = useUser();
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  const [otherUser, setOtherUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(conversationId);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [sending, setSending] = useState(false);
  const [openReactionFor, setOpenReactionFor] = useState(null);

  const authHeaders = useMemo(
    () => ({
      Authorization: `Bearer ${currentUser?.token || ""}`,
      "Content-Type": "application/json",
    }),
    [currentUser]
  );

  const fetchThread = async () => {
    if (!currentUser?.token) return;
    if (!isGroup && !id) return;
    if (isGroup && !conversationId) return;

    try {
      const endpoint = isGroup 
        ? `/api/v1/groups/${conversationId}/messages`
        : `/api/v1/messages/${id}`;
        
      const res = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${currentUser.token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Could not load messages");
      }
      
      if (isGroup) {
        setOtherUser({
          full_name: data.data.conversation?.group_name || "Group Chat",
          profile_picture: data.data.conversation?.group_photo_url || "",
          username: `${data.data.members?.length || 0} members`,
          is_group: true
        });
      } else {
        setOtherUser(data.data.other_user);
      }
      
      const conversationIdToUse = isGroup ? conversationId : data.data.conversation_id;
      if (conversationIdToUse) {
        setActiveConversationId(conversationIdToUse);
        // Mark as read after fetching
        fetch(`/api/v1/conversations/${conversationIdToUse}/read`, {
          method: "POST",
          headers: { Authorization: `Bearer ${currentUser.token}` },
        }).catch(err => console.error("Auto mark as read error:", err));
      }
      
      setMessages(Array.isArray(data.data.messages) ? data.data.messages : []);
      setError("");
    } catch (err) {
      setError(err.message || "Could not load messages");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchThread();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, conversationId, isGroup, currentUser?.token]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      fetchThread();
    }, 5000);

    return () => clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, conversationId, isGroup, currentUser?.token]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handlePickFiles = async (event) => {
    const files = Array.from(event.target.files || []);
    const newAttachments = files.slice(0, 4).map((file) => ({
      file,
      media_type: file.type.startsWith("video") ? "video" : "image",
      preview: URL.createObjectURL(file), // use as preview only
      name: file.name,
    }));

    setAttachments((prev) => [...prev, ...newAttachments].slice(0, 4));
    event.target.value = "";
    textareaRef.current?.focus();
  };

  useEffect(() => {
    if (attachments.length > 0) {
      textareaRef.current?.focus();
    }
  }, [attachments]);

  const sendMessage = async () => {
    const trimmed = draft.trim();
    if (!trimmed && attachments.length === 0) return;

    setSending(true);
    try {
      const endpoint = isGroup 
        ? `/api/v1/groups/${conversationId}/messages`
        : `/api/v1/messages`;
        
      const formData = new FormData();
      formData.append("content", trimmed);
      
      if (!isGroup) {
        formData.append("receiver_id", id);
      }
      
      attachments.forEach((attachment) => {
        formData.append("media", attachment.file);
      });

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${currentUser?.token}`,
          // Don't set Content-Type, let browser set boundary
        },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to send message");
      }

      setMessages((prev) => [...prev, data.data]);
      setDraft("");
      setAttachments([]);
      setShowEmoji(false);
      setError("");
      textareaRef.current?.focus();
    } catch (err) {
      setError(err.message || "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const handleUnsend = async (messageId) => {
    try {
      const res = await fetch(`/api/v1/messages/${messageId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${currentUser.token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to unsend");
      }

      setMessages((prev) => prev.filter((msg) => msg.message_id !== messageId));
      setError("");
    } catch (err) {
      setError(err.message || "Failed to unsend");
    }
  };

  const handleReact = async (messageId, emoji) => {
    try {
      const res = await fetch(`/api/v1/messages/${messageId}/react`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ emoji }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to react");
      }
      setOpenReactionFor(null);
      fetchThread();
    } catch (err) {
      setError(err.message || "Failed to react");
    }
  };

  if (!currentUser?.token) {
    return (
      <section className={`messages-page ${compact ? "messages-page--compact" : ""}`}>
        <div className="messages-card">Please log in to use messaging.</div>
      </section>
    );
  }

  if (loading) {
    return (
      <section className={`messages-page ${compact ? "messages-page--compact" : ""}`}>
        <div className="messages-card">Loading chat...</div>
      </section>
    );
  }

  return (
    <section className={`messages-page ${compact ? "messages-page--compact" : ""}`}>
      <div className="messages-card">
        {!hideHeader && (
          <header className="messages-header">
            <div className="messages-header-left">
              {otherUser?.is_group ? (
                <div className="messages-avatar messages-avatar-placeholder">👥</div>
              ) : otherUser?.profile_picture ? (
                <img src={otherUser.profile_picture} alt="" className="messages-avatar" />
              ) : (
                <div className="messages-avatar messages-avatar-placeholder">—</div>
              )}
              <div>
                <div className="messages-name">{otherUser?.full_name || "Unknown User"}</div>
                <div className="messages-handle">@{otherUser?.username || "unknown"}</div>
              </div>
            </div>
            {compact ? (
              <button type="button" className="messages-close-btn" onClick={onClose}>
                ×
              </button>
            ) : null}
          </header>
        )}

        {error ? <div className="messages-error">{error}</div> : null}

        <div className="messages-thread">
          {messages.length === 0 ? (
            <div className="messages-empty">Start the conversation.</div>
          ) : (
            messages.map((msg) => {
              const mine = Number(msg.sender_id) === Number(currentUser.user_id);
              return (
                <div
                  key={msg.message_id}
                  className={`message-row ${mine ? "message-row--mine" : ""}`}
                >
                  <div className={`message-bubble ${mine ? "message-bubble--mine" : ""}`}>
                    {isGroup && !mine && (
                      <strong style={{ fontSize: "11px", display: "block", marginBottom: "4px" }}>
                        {msg.sender_full_name || msg.sender_username || "Unknown"}
                      </strong>
                    )}
                    {msg.content ? <p>{msg.content}</p> : null}
                    {Array.isArray(msg.media) && msg.media.length > 0 ? (
                      <div className="message-media-list">
                        {msg.media.map((item) =>
                          item.media_type === "video" ? (
                            <video key={item.media_id} src={item.media_url} controls />
                          ) : (
                            <img key={item.media_id} src={item.media_url} alt="Attachment" />
                          )
                        )}
                      </div>
                    ) : null}
                    <span className="message-time">
                      {formatTimeShort(msg.created_at)}
                    </span>
                    {Array.isArray(msg.reactions) && msg.reactions.length > 0 ? (
                      <div className="message-reactions-summary">
                        {msg.reactions.map((reaction) => (
                          <button
                            key={`${msg.message_id}-${reaction.emoji}`}
                            type="button"
                            className={`reaction-chip ${reaction.reacted_by_me ? "reaction-chip--mine" : ""}`}
                            onClick={() => handleReact(msg.message_id, reaction.emoji)}
                          >
                            {reaction.emoji} {reaction.count}
                          </button>
                        ))}
                      </div>
                    ) : null}
                    <div className="message-react-actions">
                      <button
                        type="button"
                        className="message-react-plus-btn"
                        onClick={() =>
                          setOpenReactionFor((prev) =>
                            prev === msg.message_id ? null : msg.message_id
                          )
                        }
                      >
                        +
                      </button>
                      {openReactionFor === msg.message_id ? (
                        <div className="message-react-picker">
                          {REACTION_EMOJIS.map((emoji) => (
                            <button
                              key={`${msg.message_id}-react-${emoji}`}
                              type="button"
                              className="message-react-btn"
                              onClick={() => handleReact(msg.message_id, emoji)}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                    {mine ? (
                      <button
                        type="button"
                        className="message-unsend-btn"
                        onClick={() => handleUnsend(msg.message_id)}
                      >
                        Unsend
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {attachments.length > 0 ? (
          <div className="composer-attachments">
            {attachments.map((file, idx) => (
              <div className="composer-attachment" key={`${file.name}-${idx}`}>
                {file.media_type === "video" ? (
                  <video src={file.preview} controls />
                ) : (
                  <img src={file.preview} alt={file.name} />
                )}
                <button
                  type="button"
                  onClick={() =>
                    setAttachments((prev) => prev.filter((_, fileIndex) => fileIndex !== idx))
                  }
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        ) : null}

        <div className="messages-composer">
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Write a message..."
            rows={2}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
          />
          <div className="composer-actions">
            <button type="button" onClick={() => setShowEmoji((v) => !v)}>
              Emoji
            </button>
            <button type="button" onClick={() => fileInputRef.current?.click()}>
              Photo/Video
            </button>
            <button type="button" className="send-btn" disabled={sending} onClick={sendMessage}>
              {sending ? "Sending..." : "Send"}
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            hidden
            multiple
            accept="image/*,video/*"
            onChange={handlePickFiles}
          />
          {showEmoji ? (
            <div className="emoji-panel">
              {EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setDraft((prev) => `${prev}${emoji}`)}
                >
                  {emoji}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
};

export default Messages;
