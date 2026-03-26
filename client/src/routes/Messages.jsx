import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useUser } from "../context/UserContext";
import "../styles/Messages.css";

const EMOJIS = ["😀", "😂", "😍", "😎", "👍", "🔥", "❤️", "🎉"];
const REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "😡"];

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const Messages = ({ targetUserId, compact = false, hideHeader = false, onClose }) => {
  const { id: routeUserId } = useParams();
  const id = targetUserId || routeUserId;
  const { currentUser } = useUser();
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const [otherUser, setOtherUser] = useState(null);
  const [messages, setMessages] = useState([]);
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
    if (!currentUser?.token || !id) return;

    try {
      const res = await fetch(`/api/v1/messages/${id}`, {
        headers: { Authorization: `Bearer ${currentUser.token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Could not load messages");
      }
      setOtherUser(data.data.other_user);
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
  }, [id, currentUser?.token]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      fetchThread();
    }, 5000);

    return () => clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, currentUser?.token]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handlePickFiles = async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    const converted = await Promise.all(
      files.slice(0, 4).map(async (file) => ({
        media_url: await readFileAsDataUrl(file),
        media_type: file.type.startsWith("video") ? "video" : "image",
        name: file.name,
      }))
    );

    setAttachments((prev) => [...prev, ...converted].slice(0, 4));
    event.target.value = "";
  };

  const sendMessage = async () => {
    const trimmed = draft.trim();
    if (!trimmed && attachments.length === 0) return;

    setSending(true);
    try {
      const res = await fetch("/api/v1/messages", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          receiver_id: Number(id),
          content: trimmed,
          media: attachments.map(({ media_url, media_type }) => ({
            media_url,
            media_type,
          })),
        }),
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
              {otherUser?.profile_picture ? (
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
                      {new Date(msg.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
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
                  <video src={file.media_url} controls />
                ) : (
                  <img src={file.media_url} alt={file.name} />
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
