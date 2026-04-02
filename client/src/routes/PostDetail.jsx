import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useUser } from "../context/UserContext";
import { formatTimeAgo, parseTimestamp } from "../utils/dateUtils";
import "../styles/PostDetail.css";


const PostDetail = () => {
  const { id } = useParams();
  const { currentUser } = useUser();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [commentText, setCommentText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchPost = async () => {
    try {
      const res = await fetch(`/api/v1/posts/${id}`, {
        headers: { Authorization: `Bearer ${currentUser?.token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Post not found");
      setPost(data.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async () => {
    try {
      const res = await fetch(`/api/v1/posts/${id}/comments`, {
        headers: { Authorization: `Bearer ${currentUser?.token}` },
      });
      const data = await res.json();
      if (res.ok) setComments(data.data || []);
    } catch {}
  };

  useEffect(() => {
    if (!currentUser?.token) return;
    fetchPost();
    fetchComments();
  }, [id, currentUser?.token]);

  const handleComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/v1/posts/${id}/comment`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${currentUser?.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content: commentText }),
      });
      if (res.ok) {
        setCommentText("");
        fetchComments();
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="post-detail-loading">
      <div className="post-detail-spinner" />
      <p>Loading post...</p>
    </div>
  );

  if (error) return (
    <div className="post-detail-error">
      <p>{error}</p>
      <button onClick={() => navigate(-1)} className="post-detail-back-btn">← Go Back</button>
    </div>
  );

  if (!post) return null;

  const tags = Array.isArray(post.tags) ? post.tags : [];
  const media = Array.isArray(post.media) ? post.media : [];

  return (
    <div className="post-detail-page">
      <button onClick={() => navigate(-1)} className="post-detail-back-btn">← Back</button>

      <article className="post-detail-card">
        {/* Header */}
        <div className="post-detail-header">
          <Link to={`/users/${post.user_id}`} className="post-detail-author-link">
            {post.profile_picture ? (
              <img src={post.profile_picture} alt="" className="post-detail-avatar" />
            ) : (
              <div className="post-detail-avatar-placeholder">
                {(post.full_name || post.username || "?")[0].toUpperCase()}
              </div>
            )}
          </Link>
          <div className="post-detail-author-info">
            <Link to={`/users/${post.user_id}`} className="post-detail-author-name">
              {post.full_name || post.username}
              {tags.length > 0 && (
                <span className="post-detail-tags">
                  {" "}is with <strong>{tags[0].full_name || tags[0].username}</strong>
                  {tags.length > 1 && ` and ${tags.length - 1} others`}
                </span>
              )}
            </Link>
            <span className="post-detail-time">{formatTimeAgo(parseTimestamp(post.created_at))}</span>
          </div>
        </div>

        {/* Caption */}
        {post.caption && <p className="post-detail-caption">{post.caption}</p>}

        {/* Media */}
        {media.length > 0 && (
          <div className="post-detail-media">
            {media.map((m, i) => (
              m.media_type === "video" ? (
                <video key={i} src={m.media_url} controls className="post-detail-media-item" />
              ) : (
                <img key={i} src={m.media_url} alt="" className="post-detail-media-item" />
              )
            ))}
          </div>
        )}

        {/* Stats */}
        <div className="post-detail-stats">
          <span>❤️ {post.likes_count || 0} likes</span>
          <span>💬 {post.comments_count || 0} comments</span>
        </div>
      </article>

      {/* Comments Section */}
      <div className="post-detail-comments">
        <h2 className="post-detail-comments-title">Comments</h2>

        {/* Comment Form */}
        {currentUser && (
          <form className="post-detail-comment-form" onSubmit={handleComment}>
            <input
              className="post-detail-comment-input"
              placeholder="Write a comment..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
            />
            <button type="submit" className="post-detail-comment-btn" disabled={submitting}>
              {submitting ? "..." : "Post"}
            </button>
          </form>
        )}

        {/* Comments List */}
        {comments.length === 0 ? (
          <p className="post-detail-no-comments">No comments yet. Be the first!</p>
        ) : (
          comments.map((c) => (
            <div key={c.comment_id} className="post-detail-comment">
              <Link to={`/users/${c.user_id}`} className="post-detail-comment-avatar-link">
                {c.profile_picture ? (
                  <img src={c.profile_picture} alt="" className="post-detail-comment-avatar" />
                ) : (
                  <div className="post-detail-comment-avatar-placeholder">
                    {(c.full_name || c.username || "?")[0].toUpperCase()}
                  </div>
                )}
              </Link>
              <div className="post-detail-comment-body">
                <span className="post-detail-comment-author">{c.full_name || c.username}</span>
                <p className="post-detail-comment-text">{c.content}</p>
                <span className="post-detail-comment-time">{formatTimeAgo(parseTimestamp(c.created_at))}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default PostDetail;
