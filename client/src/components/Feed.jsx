import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { useUser } from "../context/UserContext";

const Feed = ({ reloadTrigger = 0 }) => {
  const { currentUser } = useUser();
  const [feed, setFeed] = useState([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [feedError, setFeedError] = useState(null);

  const loadFeed = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/feed");
      if (!res.ok) throw new Error("Failed to load feed");
      const data = await res.json();
      setFeed(data.data || []);
      setFeedError(null);
    } catch (err) {
      setFeedError(err.message || "Error loading feed");
    }
  }, []);

  useEffect(() => {
    setFeedLoading(true);
    loadFeed().finally(() => setFeedLoading(false));
  }, [reloadTrigger, loadFeed]);

  const handleReact = async (postId, emoji = "👍") => {
    try {
      const res = await fetch(`/api/v1/posts/${postId}/react`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentUser?.token}`
        },
        body: JSON.stringify({ emoji }),
      });
      if (res.ok) {
        loadFeed(); // Reload feed to see updated counts
      }
    } catch (err) {
      console.error("Failed to react:", err);
    }
  };

  if (feedLoading) {
    return (
      <section className="feed-section">
        <div className="feed-loading">Loading feed...</div>
      </section>
    );
  }

  if (feedError) {
    return (
      <section className="feed-section">
        <div className="feed-error">Error: {feedError}</div>
      </section>
    );
  }

  if (feed.length === 0) {
    return (
      <section className="feed-section">
        <div className="feed-empty">No posts yet. Start following friends!</div>
      </section>
    );
  }

  return (
    <section className="feed-section">
      <div className="posts-list">
        {feed.map((post) => (
          <article key={post.post_id} className="post-card">
            <div className="post-header">
              <div className="post-author">
                <Link to={`/users/${post.user_id}`} className="post-author-link">
                  <span className="post-author-name">{post.full_name || "Unknown"}</span>
                  <span className="post-author-handle">@{post.username}</span>
                </Link>
              </div>
              <span className="post-time">{new Date(post.created_at).toLocaleDateString()}</span>
            </div>

            {post.caption && <p className="post-content">{post.caption}</p>}

            {Array.isArray(post.media) && post.media.length > 0 ? (
              <div className="post-media">
                {post.media.map((item) =>
                  item.media_type === "video" ? (
                    <video key={item.media_id} src={item.media_url} controls />
                  ) : (
                    <img key={item.media_id} src={item.media_url} alt="Post media" />
                  )
                )}
              </div>
            ) : null}

            <div className="post-stats">
              <span className="stat">👍 {post.likes_count || 0} Likes</span>
              <span className="stat">💬 {post.comments_count || 0} Comments</span>
            </div>

            <div className="post-interactions">
              <div className="interaction-like-wrapper">
                <button 
                  className="interaction-btn"
                  onClick={() => handleReact(post.post_id, "👍")}
                >
                  👍 Like
                </button>
                <div className="reaction-picker">
                  {["👍", "❤️", "😂", "🥰", "😮", "😢", "😡"].map(emoji => (
                    <button
                      key={emoji}
                      className="reaction-emoji"
                      onClick={() => handleReact(post.post_id, emoji)}
                      title={`React with ${emoji}`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
              <button className="interaction-btn">💬 Comment</button>
              <button className="interaction-btn">↗️ Share</button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};

export default Feed;
