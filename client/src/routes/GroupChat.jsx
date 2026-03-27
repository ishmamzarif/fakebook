import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useUser } from "../context/UserContext";
import "../styles/Messages.css";

const GroupChat = () => {
  const { conversationId } = useParams();
  const { currentUser } = useUser();
  const [info, setInfo] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  const fetchGroup = async () => {
    if (!currentUser?.token || !conversationId) return;
    try {
      const res = await fetch(`/api/v1/groups/${conversationId}/messages`, {
        headers: {
          Authorization: `Bearer ${currentUser.token}`,
        },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to load group");
      }
      setInfo({
        conversation: data.data.conversation,
        members: data.data.members,
      });
      setMessages(Array.isArray(data.data.messages) ? data.data.messages : []);
      setError("");
    } catch (err) {
      setError(err.message || "Failed to load group");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchGroup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, currentUser?.token]);

  useEffect(() => {
    const id = setInterval(fetchGroup, 5000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, currentUser?.token]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    const text = draft.trim();
    if (!text) return;
    setSending(true);
    try {
      const res = await fetch(`/api/v1/groups/${conversationId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentUser.token}`,
        },
        body: JSON.stringify({ content: text }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to send message");
      }
      setMessages((prev) => [...prev, data.data]);
      setDraft("");
      setError("");
    } catch (err) {
      setError(err.message || "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  if (!currentUser?.token) {
    return (
      <section className="messages-page">
        <div className="messages-card">Please log in to use messaging.</div>
      </section>
    );
  }

  if (loading) {
    return (
      <section className="messages-page">
        <div className="messages-card">Loading group chat...</div>
      </section>
    );
  }

  return (
    <section className="messages-page">
      <div className="messages-card">
        <header className="messages-header">
          <div className="messages-header-left">
            <div className="messages-avatar messages-avatar-placeholder">👥</div>
            <div>
              <div className="messages-name">
                {info?.conversation?.group_name || "Group chat"}
              </div>
              <div className="messages-handle">
                {info?.members?.length || 0} members
              </div>
            </div>
          </div>
        </header>

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
                    <strong style={{ fontSize: "11px" }}>
                      {msg.sender_full_name || msg.sender_username || "Unknown"}
                    </strong>
                    {msg.content ? <p>{msg.content}</p> : null}
                    <span className="message-time">
                      {new Date(msg.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

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
            <button
              type="button"
              className="send-btn"
              disabled={sending}
              onClick={sendMessage}
            >
              {sending ? "Sending..." : "Send"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default GroupChat;

