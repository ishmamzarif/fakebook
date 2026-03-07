import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const Feed = () => {
  const [feed, setFeed] = useState([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [feedError, setFeedError] = useState(null);

  useEffect(() => {
    fetch("/api/v1/feed")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load feed");
        return res.json();
      })
      .then((data) => {
        setFeed(data.data || []);
        setFeedError(null);
      })
      .catch((err) => setFeedError(err.message || "Error loading feed"))
      .finally(() => setFeedLoading(false));
  }, []);

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

            {post.content && <p className="post-content">{post.content}</p>}

            {post.media_url && (
              <div className="post-media">
                <img src={post.media_url} alt="Post media" />
              </div>
            )}

            <div className="post-stats">
              <span className="stat">👍 {post.likes_count || 0} Likes</span>
              <span className="stat">💬 {post.comments_count || 0} Comments</span>
            </div>

            <div className="post-interactions">
              <button className="interaction-btn">👍 Like</button>
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
