import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useUser } from "../context/UserContext";
import { formatTimeAgo, parseTimestamp, formatDateTimeExact } from "../utils/dateUtils";

const PostMediaCarousel = ({ media }) => {
  const [index, setIndex] = useState(0);

  if (!Array.isArray(media) || media.length === 0) return null;

  return (
    <div className="post-media-carousel">
      {media.length > 1 && (
        <>
          {index > 0 && (
            <button
              className="carousel-arrow carousel-arrow-left"
              onClick={(e) => { e.stopPropagation(); setIndex(i => i - 1); }}
            >
              ‹
            </button>
          )}
          {index < media.length - 1 && (
            <button
              className="carousel-arrow carousel-arrow-right"
              onClick={(e) => { e.stopPropagation(); setIndex(i => i + 1); }}
            >
              ›
            </button>
          )}
        </>
      )}
      <div className="carousel-slide">
        {media[index].media_type === "video" ? (
          <video src={media[index].media_url} controls className="carousel-media-item" />
        ) : (
          <img src={media[index].media_url} alt="Post media" className="carousel-media-item" />
        )}
      </div>
      {media.length > 1 && (
        <div className="carousel-dots-container">
          {media.map((_, i) => (
            <div key={i} className={`carousel-dot ${i === index ? 'active' : ''}`} />
          ))}
        </div>
      )}
    </div>
  );
};

const Feed = ({ reloadTrigger = 0, userId = null, emptyMessage = "No posts yet. Start following friends!" }) => {
  const { currentUser } = useUser();
  const [feed, setFeed] = useState([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [feedError, setFeedError] = useState(null);
  const navigate = useNavigate();

  const [optionsOpenPostId, setOptionsOpenPostId] = useState(null);
  const [openCommentsPostId, setOpenCommentsPostId] = useState(null);
  const [commentsByPostId, setCommentsByPostId] = useState({});
  const [commentText, setCommentText] = useState("");
  const [commentMedia, setCommentMedia] = useState([]); // [{ media_url, media_type }]
  const [commentMediaUploading, setCommentMediaUploading] = useState(false);
  const [commentLoading, setCommentLoading] = useState(false);
  const [commentError, setCommentError] = useState("");
  const commentFileInputRef = useRef(null);
  const [commentUsersById, setCommentUsersById] = useState({});

  const [overlayPostId, setOverlayPostId] = useState(null);
  const [commentsListLoading, setCommentsListLoading] = useState(false);
  const [commentsListError, setCommentsListError] = useState("");

  const [reactionsOverlayPostId, setReactionsOverlayPostId] = useState(null);
  const [reactionsByPostId, setReactionsByPostId] = useState({});
  const [reactionsLoading, setReactionsLoading] = useState(false);
  const [reactionsError, setReactionsError] = useState("");

  const authHeaders = useMemo(
    () => ({
      Authorization: `Bearer ${currentUser?.token || ""}`,
      "Content-Type": "application/json",
    }),
    [currentUser?.token]
  );

  const parseCommentContent = (content) => {
    if (typeof content !== "string") return { text: "", media: [] };
    const lines = content
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    const media = [];
    const textParts = [];

    for (const line of lines) {
      // Media is stored inside comments.content (single string column).
      // Supported formats (backward-compatible):
      // - MEDIA_DATA_URL:<base64-or-url>;MEDIA_TYPE:<image|video>
      // - MEDIA_URL:<url>;MEDIA_TYPE:<image|video>
      const markerA = "MEDIA_DATA_URL:";
      const markerB = "MEDIA_URL:";
      const hasType = line.includes(";MEDIA_TYPE:");

      if ((line.startsWith(markerA) || line.startsWith(markerB)) && hasType) {
        const prefix = line.startsWith(markerA) ? markerA : markerB;
        const afterUrl = line.slice(prefix.length);
        const [mediaUrl, mediaTypePart] = afterUrl.split(";MEDIA_TYPE:");
        const mediaType = (mediaTypePart || "").trim();
        if (mediaUrl) media.push({ media_url: mediaUrl, media_type: mediaType || "image" });
      } else {
        textParts.push(line);
      }
    }

    return { text: textParts.join("\n"), media };
  };


  const loadFeed = useCallback(async () => {
    try {
      const url = userId ? `/api/v1/posts/user/${userId}` : "/api/v1/feed";
      const res = await fetch(url, {
        headers: authHeaders,
      });
      if (!res.ok) throw new Error("Failed to load feed");
      const data = await res.json();
      setFeed(data.data || []);
      setFeedError(null);
    } catch (err) {
      setFeedError(err.message || "Error loading feed");
    }
  }, [authHeaders, userId]);

  const fetchPostDetails = useCallback(async (postId) => {
    try {
      const res = await fetch(`/api/v1/posts/${postId}`, {
        headers: authHeaders,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to load post details");

      setFeed((prev) =>
        prev.map((p) => (p.post_id === postId ? data.data : p))
      );
    } catch (err) {
      console.error("Error fetching post details:", err);
    }
  }, [authHeaders]);

  useEffect(() => {
    setFeedLoading(true);
    loadFeed().finally(() => setFeedLoading(false));
  }, [reloadTrigger, loadFeed]);

  const fetchReactions = useCallback(async (postId) => {
    if (!currentUser?.token) return;
    if (reactionsByPostId[postId]) return;

    setReactionsLoading(true);
    setReactionsError("");
    try {
      const res = await fetch(`/api/v1/posts/${postId}/reactions`, {
        headers: authHeaders,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to load reactions");
      setReactionsByPostId(prev => ({ ...prev, [postId]: data.data }));
    } catch (err) {
      setReactionsError(err.message);
    } finally {
      setReactionsLoading(false);
    }
  }, [authHeaders, currentUser?.token, reactionsByPostId]);

  const handleReact = async (postId, emoji = "👍") => {
    const postIndex = feed.findIndex((p) => p.post_id === postId);
    if (postIndex === -1) return;

    const post = feed[postIndex];
    const oldReaction = post.user_reaction;
    const isTogglingOff = oldReaction === emoji;

    // Calculate optimistic state
    const nextReaction = isTogglingOff ? null : emoji;
    let nextLikesCount = post.likes_count || 0;

    if (!oldReaction && nextReaction) {
      nextLikesCount++;
    } else if (oldReaction && !nextReaction) {
      nextLikesCount--;
    }
    // if isChangingEmoji, nextLikesCount stays same

    const updatedPost = {
      ...post,
      user_reaction: nextReaction,
      likes_count: nextLikesCount,
    };

    // Optimistically update
    setFeed((prev) => prev.map((p) => (p.post_id === postId ? updatedPost : p)));

    try {
      const res = await fetch(`/api/v1/posts/${postId}/react`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${currentUser.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ emoji }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to react");

      // We don't need to refresh the whole feed anymore since we are optimistic.
      // But we can update the specific post with final server state if needed.
      if (overlayPostId === postId) {
        fetchPostDetails(postId);
      }
    } catch (err) {
      console.error("Failed to react:", err);
      // Revert on error
      setFeed((prev) => prev.map((p) => (p.post_id === postId ? post : p)));
    }
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm("Are you sure you want to delete this post?")) return;

    try {
      const res = await fetch(`/api/v1/posts/${postId}`, {
        method: "DELETE",
        headers: authHeaders,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to delete post");

      setFeed(prev => prev.filter(p => p.post_id !== postId));
      setOptionsOpenPostId(null);
    } catch (err) {
      alert("Failed to delete post: " + err.message);
    }
  };

  useEffect(() => {
    // Reset composer when switching posts/panels.
    setCommentText("");
    setCommentMedia([]);
    setCommentError("");
    setCommentMediaUploading(false);
    setCommentLoading(false);
  }, [openCommentsPostId]);

  const handlePickCommentMedia = async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    // Limit to keep content manageable.
    const limited = files.slice(0, 4);
    try {
      if (!currentUser?.token) {
        setCommentError("Please log in to add media to comments.");
        return;
      }

      setCommentMediaUploading(true);
      setCommentError("");

      const formData = new FormData();
      for (const file of limited) {
        formData.append("media", file);
      }

      const res = await fetch("/api/v1/comments/media/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${currentUser.token}`,
        },
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to upload comment media");
      }

      setCommentMedia((prev) => [...prev, ...(Array.isArray(data.data) ? data.data : [])].slice(0, 4));
      setCommentError("");
    } catch (err) {
      setCommentError(err?.message || "Could not read media file");
    } finally {
      setCommentMediaUploading(false);
      event.target.value = "";
    }
  };

  const submitComment = async () => {
    if (!currentUser?.token) {
      setCommentError("Please log in to comment.");
      return;
    }
    if (!openCommentsPostId) return;

    const trimmed = commentText.trim();

    if (!trimmed && commentMedia.length === 0) {
      setCommentError("Write a comment or add media.");
      return;
    }

    setCommentLoading(true);
    setCommentError("");

    try {
      const contentParts = [];
      if (trimmed) contentParts.push(trimmed);

      for (const m of commentMedia) {
        // Stored in comments.content (comments table only has `content`).
        contentParts.push(
          `MEDIA_URL:${m.media_url};MEDIA_TYPE:${m.media_type || "image"}`
        );
      }

      const content = contentParts.join("\n");

      const res = await fetch(`/api/v1/posts/${openCommentsPostId}/comment`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          postId: openCommentsPostId,
          content,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to add comment");
      }

      setCommentsByPostId((prev) => {
        const existing = prev[openCommentsPostId] || [];
        return {
          ...prev,
          [openCommentsPostId]: [...existing, data.data],
        };
      });

      // Optimistically update the displayed comment count.
      setFeed((prev) =>
        prev.map((p) =>
          p.post_id === openCommentsPostId
            ? { ...p, comments_count: (p.comments_count || 0) + 1 }
            : p
        )
      );

      setCommentText("");
      setCommentMedia([]);
    } catch (err) {
      setCommentError(err.message || "Failed to add comment");
    } finally {
      setCommentLoading(false);
    }
  };

  const activePostComments = useMemo(() => {
    if (!openCommentsPostId) return [];
    return commentsByPostId[openCommentsPostId] || [];
  }, [openCommentsPostId, commentsByPostId]);

  const commentsAreLoadedForActivePost = useMemo(() => {
    if (!openCommentsPostId) return true;
    return Array.isArray(commentsByPostId[openCommentsPostId]);
  }, [openCommentsPostId, commentsByPostId]);
  const showLoadingForActivePost = openCommentsPostId && !commentsAreLoadedForActivePost;

  const overlayPost = overlayPostId ? feed.find((p) => p.post_id === overlayPostId) : null;

  useEffect(() => {
    if (!overlayPostId) return;

    const onKeyDown = (e) => {
      if (e.key === "Escape") setOverlayPostId(null);
    };

    // Prevent background scroll while overlay is open.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [overlayPostId]);

  useEffect(() => {
    if (!openCommentsPostId) return;
    // If overlay is open, comments are managed by the overlay's openCommentsPostId.
    // If overlay is closed, and openCommentsPostId is set, it means we're opening comments
    // directly on the feed item.
    // We need to ensure that if overlayPostId is set, openCommentsPostId matches it.
    // If overlayPostId is null, then openCommentsPostId can be any post.
    if (overlayPostId !== null && openCommentsPostId !== overlayPostId) {
      setOpenCommentsPostId(overlayPostId);
      return;
    }

    const fetchPostComments = async () => {
      if (!currentUser?.token) return;

      const cached = commentsByPostId[openCommentsPostId];
      // If we already have comments loaded for this post, don't refetch.
      if (Array.isArray(cached)) return;

      setCommentsListLoading(true);
      setCommentsListError("");

      try {
        const res = await fetch(`/api/v1/posts/${openCommentsPostId}/comments`, {
          headers: {
            Authorization: `Bearer ${currentUser.token}`,
          },
        });
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.message || "Could not load comments");
        }

        setCommentsByPostId((prev) => ({
          ...prev,
          [openCommentsPostId]: Array.isArray(data.data) ? data.data : [],
        }));
      } catch (err) {
        setCommentsListError(err.message || "Could not load comments");
      } finally {
        setCommentsListLoading(false);
      }
    };

    fetchPostComments();
  }, [openCommentsPostId, currentUser?.token, commentsByPostId, overlayPostId]);


  useEffect(() => {
    if (!currentUser?.user_id) return;
    setCommentUsersById((prev) => {
      if (prev[currentUser.user_id]) return prev;
      return { ...prev, [currentUser.user_id]: currentUser };
    });
  }, [currentUser]);

  useEffect(() => {
    if (!openCommentsPostId || activePostComments.length === 0) return;

    const ids = Array.from(
      new Set(
        activePostComments
          .map((c) => Number(c.user_id))
          .filter((id) => Number.isFinite(id))
      )
    );

    const missingIds = ids.filter((id) => !commentUsersById[id]);
    if (missingIds.length === 0) return;

    let cancelled = false;
    Promise.all(
      missingIds.map(async (userId) => {
        try {
          const res = await fetch(`/api/v1/users/${userId}`);
          const data = await res.json();
          if (!res.ok) return null;
          return { userId, user: data.data };
        } catch (_) {
          return null;
        }
      })
    ).then((results) => {
      if (cancelled) return;
      setCommentUsersById((prev) => {
        const next = { ...prev };
        results
          .filter(Boolean)
          .forEach((r) => {
            next[r.userId] = r.user;
          });
        return next;
      });
    });

    return () => {
      cancelled = true;
    };
  }, [openCommentsPostId, activePostComments, commentUsersById]);

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
        <div className="feed-empty">{emptyMessage}</div>
      </section>
    );
  }

  return (
    <section className="feed-section">
      <div className="posts-list">
        {feed.map((post) => (
          <article
            key={post.post_id}
            className="post-card"
            onClick={() => setOverlayPostId(post.post_id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter") setOverlayPostId(post.post_id);
            }}
            aria-label={`Open post by ${post.full_name || "Unknown"}`}
          >
            <div className="post-header">
              <div className="post-author">
                <Link to={`/users/${post.user_id}`} className="post-author-link">
                  {post.profile_picture ? (
                    <img src={post.profile_picture} alt="" className="post-author-avatar" />
                  ) : (
                    <div className="post-author-avatar-placeholder">—</div>
                  )}
                </Link>
                <div className="post-author-info">
                  <div style={{ display: "flex", alignItems: "baseline", gap: "4px", flexWrap: "wrap" }}>
                    <Link to={`/users/${post.user_id}`} style={{ textDecoration: "none" }}>
                      <span className="post-author-name" style={{ fontWeight: "600", color: "var(--color-text-primary)" }}>
                        {post.full_name || "Unknown"}
                      </span>
                    </Link>
                    {post.tags && post.tags.length > 0 && (
                      <span style={{ fontSize: "0.9rem", color: "var(--color-text-dimmed)", marginLeft: "2px" }}>
                        is with{" "}
                        <Link 
                          to={`/users/${post.tags[0].user_id}`} 
                          className="post-tag-link"
                          onClick={(e) => e.stopPropagation()}
                          style={{ fontWeight: "600", color: "var(--color-text-primary)", textDecoration: "none", fontStyle: "italic" }}
                        >
                          {post.tags[0].full_name || post.tags[0].username}
                        </Link>
                        {post.tags.length > 1 && ` and ${post.tags.length - 1} others`}
                      </span>
                    )}
                  </div>
                  <Link to={`/users/${post.user_id}`} style={{ textDecoration: "none" }}>
                    <span className="post-author-handle">@{post.username}</span>
                  </Link>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginLeft: "auto" }}>
                <span className="post-time" style={{ color: "lightgrey", cursor: "help", fontSize: "10px" }}>
                  {post.flagged && (
                    <span className="post-flagged-icon" data-tooltip="This content has been marked as inappropriate, engage at your own discretion" style={{ marginRight: "6px" }}>
                      !
                    </span>
                  )}

                  {(() => {
                    const cTime = parseTimestamp(post.created_at)?.getTime();
                    const uTime = parseTimestamp(post.updated_at)?.getTime();
                    const isEdited = cTime && uTime && (uTime - cTime > 1000);

                    if (isEdited) {
                      return (
                        <span title={formatDateTimeExact(post.updated_at)}>
                          {formatTimeAgo(post.updated_at)} (updated)
                        </span>
                      );
                    } else {
                      return (
                        <span title={formatDateTimeExact(post.created_at)}>
                          {formatTimeAgo(post.created_at)}
                        </span>
                      );
                    }
                  })()}
                </span>

                {currentUser && (Number(post.user_id) === Number(currentUser.user_id) || Number(post.user_id) === Number(currentUser.id)) && (
                  <div style={{ position: "relative" }}>
                    <button
                      className="post-options-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOptionsOpenPostId(prev => prev === post.post_id ? null : post.post_id);
                      }}
                      style={{ background: "transparent", border: "none", color: "var(--color-text-dimmed)", fontSize: "20px", cursor: "pointer", padding: "0 8px" }}
                    >
                      ⋯
                    </button>
                    {optionsOpenPostId === post.post_id && (
                      <div
                        className="post-options-menu"
                        style={{ position: "absolute", right: 0, top: "100%", background: "var(--color-bg-darkest)", border: "1px solid var(--color-border-dark)", borderRadius: "8px", zIndex: 10, padding: "8px 0", minWidth: "120px", boxShadow: "0 4px 12px rgba(0,0,0,0.5)" }}
                      >
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate(`/posts/${post.post_id}/edit`); }}
                          style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 16px", background: "transparent", border: "none", color: "var(--color-text-primary)", cursor: "pointer" }}
                        >
                          Edit Post
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeletePost(post.post_id); }}
                          style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 16px", background: "transparent", border: "none", color: "#ff4a4a", cursor: "pointer" }}
                        >
                          Delete Post
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {post.caption && <p className="post-content">{post.caption}</p>}

            <PostMediaCarousel media={post.media} />

            <div className="post-stats">
              <span
                className="stat stat-clickable"
                onClick={(e) => {
                  e.stopPropagation();
                  setReactionsOverlayPostId(post.post_id);
                  fetchReactions(post.post_id);
                }}
              >
                {post.likes_count || 0} Likes
              </span>
              <span className="stat">💬 {post.comments_count || 0} Comments</span>
            </div>

            <div className="post-interactions">
              <div className="interaction-like-wrapper">
                <button
                  className={`interaction-btn ${post.user_reaction ? "interaction-btn--active" : ""}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleReact(post.post_id, post.user_reaction || "👍");
                  }}
                >
                  {post.user_reaction || "👍"} {post.user_reaction ? "" : "Like"}
                </button>
                <div className="reaction-picker">
                  {["👍", "❤️", "😂", "🥰", "😮", "😢", "😡"].map(emoji => (
                    <button
                      key={emoji}
                      className={`reaction-emoji ${post.user_reaction === emoji ? "reaction-emoji--active" : ""}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleReact(post.post_id, emoji);
                      }}
                      title={`React with ${emoji}`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
              <button
                type="button"
                className="interaction-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenCommentsPostId((prev) =>
                    prev === post.post_id ? null : post.post_id
                  );
                }}
              >
                💬 Comment
              </button>

            </div>

            <div
              className={`post-comments-panel ${openCommentsPostId === post.post_id && overlayPostId === null
                ? "post-comments-panel--open"
                : ""
                }`}
            >
              <div className="post-comments-inner">
                <div className="post-comments-header">
                  <div className="post-comments-title">Comments</div>
                  <div className="post-comments-count">
                    {post.comments_count || 0} total
                  </div>
                </div>

                {openCommentsPostId === post.post_id ? (
                  <>
                    <div className="post-comments-list">
                      {showLoadingForActivePost || commentsListLoading ? (
                        <div className="post-comments-empty">Loading comments...</div>
                      ) : activePostComments.length === 0 ? (
                        <div className="post-comments-empty">No comments yet.</div>
                      ) : (
                        <>
                          {activePostComments.slice(-2).map((c) => {
                            const parsed = parseCommentContent(c.content);
                            return (
                              <div key={c.comment_id} className="post-comment-item">
                                {(() => {
                                  const author = commentUsersById[Number(c.user_id)];
                                  return (
                                    <div className="post-comment-author">
                                      {author?.profile_picture ? (
                                        <img
                                          src={author.profile_picture}
                                          alt=""
                                          className="post-comment-avatar"
                                        />
                                      ) : (
                                        <div className="post-comment-avatar-placeholder">—</div>
                                      )}
                                      <div className="post-comment-author-info">
                                        <div className="post-comment-author-name">
                                          {author?.full_name || author?.username || `User ${c.user_id}`}
                                          {c.flagged && (
                                            <span className="post-flagged-icon" data-tooltip="This content has been marked as inappropriate, engage at your own discretion" style={{ marginLeft: "6px" }}>
                                              !
                                            </span>
                                          )}
                                        </div>
                                        <div className="post-comment-author-handle">
                                          @{author?.username || "user"}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })()}
                                <div className="post-comment-body">
                                  {parsed.text ? (
                                    <p className="post-comment-text">{parsed.text}</p>
                                  ) : null}

                                  {parsed.media.length > 0 ? (
                                    <div className="post-comment-media">
                                      {parsed.media.map((m, idx) => (
                                        <div key={`${c.comment_id}-m-${idx}`} className="post-comment-media-item">
                                          {m.media_type === "video" ? (
                                            <video src={m.media_url} controls />
                                          ) : (
                                            <img src={m.media_url} alt="Comment media" />
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  ) : null}
                                </div>
                                <div className="post-comment-meta">
                                  <span className="post-comment-time-ago">
                                    {formatTimeAgo(c.created_at)}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                          {post.comments_count > 2 && (
                            <button
                              type="button"
                              className="see-all-comments-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOverlayPostId(post.post_id);
                              }}
                            >
                              See all {post.comments_count} comments
                            </button>
                          )}
                        </>
                      )}
                    </div>

                    {commentError ? (
                      <div className="post-comments-error">{commentError}</div>
                    ) : null}
                    {commentsListError ? (
                      <div className="post-comments-error">{commentsListError}</div>
                    ) : null}

                    <div className="post-comment-composer">
                      <textarea
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        placeholder="Write a comment..."
                        className="post-comment-textarea"
                        rows={2}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            submitComment();
                          }
                        }}
                        disabled={commentLoading}
                      />

                      {commentMedia.length > 0 ? (
                        <div className="post-comment-media-preview">
                          {commentMedia.map((m, idx) => (
                            <div key={`${m.media_url}-${idx}`} className="post-comment-media-preview-item">
                              {m.media_type === "video" ? (
                                <video src={m.media_url} controls />
                              ) : (
                                <img src={m.media_url} alt="Selected comment media" />
                              )}
                              <button
                                type="button"
                                className="post-comment-media-remove"
                                onClick={() => {
                                  setCommentMedia((prev) =>
                                    prev.filter((_, i) => i !== idx)
                                  );
                                }}
                                disabled={commentLoading || commentMediaUploading}
                                aria-label="Remove media"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : null}

                      <div className="post-comment-composer-actions">
                        <button
                          type="button"
                          className="post-comment-submit-btn"
                          onClick={submitComment}
                          disabled={commentLoading || commentMediaUploading}
                        >
                          {commentLoading ? "Posting..." : commentMediaUploading ? "Uploading..." : "Comment"}
                        </button>

                        <input
                          type="file"
                          accept="image/*,video/*"
                          multiple
                          ref={commentFileInputRef}
                          onChange={handlePickCommentMedia}
                          className="post-comment-file-input"
                        />

                        <button
                          type="button"
                          className="post-comment-media-add-btn"
                          onClick={() => commentFileInputRef.current?.click()}
                          disabled={commentLoading || commentMediaUploading}
                          aria-label="Add media"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          </article>
        ))}
      </div>

      {overlayPost ? (
        <div
          className="post-overlay-backdrop"
          onClick={() => setOverlayPostId(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="post-overlay"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="post-overlay-topbar">
              <div className="post-author">
                <Link
                  to={`/users/${overlayPost.user_id}`}
                  className="post-author-link"
                  onClick={(e) => e.stopPropagation()}
                >
                  {overlayPost.profile_picture ? (
                    <img src={overlayPost.profile_picture} alt="" className="post-author-avatar" />
                  ) : (
                    <div className="post-author-avatar-placeholder">—</div>
                  )}
                  <div className="post-author-info">
                    <div style={{ display: "flex", alignItems: "baseline", gap: "4px", flexWrap: "wrap" }}>
                      <span className="post-author-name" style={{ fontWeight: "600", color: "var(--color-text-primary)" }}>{overlayPost.full_name || "Unknown"}</span>
                      {overlayPost.tags && overlayPost.tags.length > 0 && (
                        <span style={{ fontSize: "0.9rem", color: "var(--color-text-dimmed)", marginLeft: "2px" }}>
                          is with{" "}
                          <span style={{ fontWeight: "600", color: "var(--color-text-primary)", fontStyle: "italic" }}>
                            {overlayPost.tags[0].full_name || overlayPost.tags[0].username}
                          </span>
                          {overlayPost.tags.length > 1 && ` and ${overlayPost.tags.length - 1} others`}
                        </span>
                      )}
                    </div>
                    <span className="post-author-handle">@{overlayPost.username}</span>
                  </div>
                </Link>
              </div>
              <button
                type="button"
                className="post-overlay-close-btn"
                onClick={() => setOverlayPostId(null)}
                aria-label="Close post overlay"
              >
                ×
              </button>
            </div>

            {overlayPost.caption ? (
              <p className="post-content">{overlayPost.caption}</p>
            ) : null}

            <PostMediaCarousel media={overlayPost.media} />

            <div className="post-overlay-actions">
              <div className="post-stats">
                <span className="stat">👍 {overlayPost.likes_count || 0} Likes</span>
                <span className="stat">
                  💬 {overlayPost.comments_count || 0} Comments
                </span>
              </div>

              <div className="post-interactions">
                <div className="interaction-like-wrapper">
                  <button
                    className={`interaction-btn ${overlayPost.user_reaction ? "interaction-btn--active" : ""}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleReact(overlayPost.post_id, overlayPost.user_reaction || "👍");
                    }}
                  >
                    {overlayPost.user_reaction || "👍"} {overlayPost.user_reaction ? "Reacted" : "Like"}
                  </button>
                  <div className="reaction-picker">
                    {["👍", "❤️", "😂", "🥰", "😮", "😢", "😡"].map((emoji) => (
                      <button
                        key={emoji}
                        className={`reaction-emoji ${overlayPost.user_reaction === emoji ? "reaction-emoji--active" : ""}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReact(overlayPost.post_id, emoji);
                        }}
                        title={`React with ${emoji}`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>

                </div>

                <button
                  type="button"
                  className="interaction-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenCommentsPostId((prev) =>
                      prev === overlayPost.post_id ? null : overlayPost.post_id
                    );
                  }}
                >
                  💬 Comment
                </button>


              </div>

              <div
                className={`post-comments-panel ${openCommentsPostId === overlayPost.post_id ? "post-comments-panel--open" : ""
                  }`}
              >
                <div className="post-comments-inner">
                  <div className="post-comments-header">
                    <div className="post-comments-title">Comments</div>
                    <div className="post-comments-count">
                      {overlayPost.comments_count || 0} total
                    </div>
                  </div>

                  {openCommentsPostId === overlayPost.post_id ? (
                    <>
                      <div className="post-comments-list">
                        {showLoadingForActivePost || commentsListLoading ? (
                          <div className="post-comments-empty">Loading comments...</div>
                        ) : activePostComments.length === 0 ? (
                          <div className="post-comments-empty">No comments yet.</div>
                        ) : (
                          activePostComments.map((c) => {
                            const parsed = parseCommentContent(c.content);
                            return (
                              <div key={c.comment_id} className="post-comment-item">
                                {(() => {
                                  const author = commentUsersById[Number(c.user_id)];
                                  return (
                                    <div className="post-comment-author">
                                      {author?.profile_picture ? (
                                        <img
                                          src={author.profile_picture}
                                          alt=""
                                          className="post-comment-avatar"
                                        />
                                      ) : (
                                        <div className="post-comment-avatar-placeholder">—</div>
                                      )}
                                      <div className="post-comment-author-info">
                                        <div className="post-comment-author-name">
                                          {author?.full_name ||
                                            author?.username ||
                                            `User ${c.user_id}`}
                                        </div>
                                        <div className="post-comment-author-handle">
                                          @{author?.username || "user"}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })()}
                                <div className="post-comment-body">
                                  {parsed.text ? (
                                    <p className="post-comment-text">{parsed.text}</p>
                                  ) : null}

                                  {parsed.media.length > 0 ? (
                                    <div className="post-comment-media">
                                      {parsed.media.map((m, idx) => (
                                        <div
                                          key={`${c.comment_id}-m-${idx}`}
                                          className="post-comment-media-item"
                                        >
                                          {m.media_type === "video" ? (
                                            <video src={m.media_url} controls />
                                          ) : (
                                            <img src={m.media_url} alt="Comment media" />
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  ) : null}
                                </div>
                                <div className="post-comment-meta">
                                  <span className="post-comment-time-ago">
                                    {formatTimeAgo(c.created_at)}
                                  </span>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>

                      {commentError ? (
                        <div className="post-comments-error">{commentError}</div>
                      ) : null}
                      {commentsListError ? (
                        <div className="post-comments-error">{commentsListError}</div>
                      ) : null}

                      <div className="post-comment-composer">
                        <textarea
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                          placeholder="Write a comment..."
                          className="post-comment-textarea"
                          rows={2}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              submitComment();
                            }
                          }}
                          disabled={commentLoading || commentMediaUploading}
                        />

                        {commentMedia.length > 0 ? (
                          <div className="post-comment-media-preview">
                            {commentMedia.map((m, idx) => (
                              <div
                                key={`${m.media_url}-${idx}`}
                                className="post-comment-media-preview-item"
                              >
                                {m.media_type === "video" ? (
                                  <video src={m.media_url} controls />
                                ) : (
                                  <img src={m.media_url} alt="Selected comment media" />
                                )}
                                <button
                                  type="button"
                                  className="post-comment-media-remove"
                                  onClick={() =>
                                    setCommentMedia((prev) =>
                                      prev.filter((_, i) => i !== idx)
                                    )
                                  }
                                  disabled={commentLoading || commentMediaUploading}
                                  aria-label="Remove media"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : null}

                        <div className="post-comment-composer-actions">
                          <button
                            type="button"
                            className="post-comment-submit-btn"
                            onClick={submitComment}
                            disabled={commentLoading || commentMediaUploading}
                          >
                            {commentLoading
                              ? "Posting..."
                              : commentMediaUploading
                                ? "Uploading..."
                                : "Comment"}
                          </button>

                          <input
                            type="file"
                            accept="image/*,video/*"
                            multiple
                            ref={commentFileInputRef}
                            onChange={handlePickCommentMedia}
                            className="post-comment-file-input"
                          />

                          <button
                            type="button"
                            className="post-comment-media-add-btn"
                            onClick={() => commentFileInputRef.current?.click()}
                            disabled={commentLoading || commentMediaUploading}
                            aria-label="Add media"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      {reactionsOverlayPostId && (
        <div
          className="reactions-overlay-backdrop"
          onClick={() => setReactionsOverlayPostId(null)}
        >
          <div className="reactions-overlay" onClick={e => e.stopPropagation()}>
            <div className="reactions-overlay-header">
              <h3>Reactions</h3>
              <button className="close-btn" onClick={() => setReactionsOverlayPostId(null)}>×</button>
            </div>
            <div className="reactions-overlay-body">
              {reactionsLoading && <div className="overlay-loading">Loading...</div>}
              {reactionsError && <div className="overlay-error">{reactionsError}</div>}
              {!reactionsLoading && !reactionsError && (reactionsByPostId[reactionsOverlayPostId] || []).map(r => (
                <div key={r.user_id} className="reaction-user-item">
                  <Link to={`/users/${r.user_id}`} className="reaction-user-link">
                    {r.profile_picture ? (
                      <img src={r.profile_picture} alt="" className="reaction-user-avatar" />
                    ) : (
                      <div className="reaction-user-avatar-placeholder">—</div>
                    )}
                    <span className="reaction-user-name">{r.full_name || r.username}</span>
                  </Link>
                  <span className="reaction-emoji-badge">{r.emoji}</span>
                </div>
              ))}
              {!reactionsLoading && !reactionsError && (!reactionsByPostId[reactionsOverlayPostId] || reactionsByPostId[reactionsOverlayPostId].length === 0) && (
                <div className="overlay-empty">No reactions yet.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default Feed;
