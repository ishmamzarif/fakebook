import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { useUser } from "../context/UserContext";
import Cropper from "cropperjs";
import "cropperjs/dist/cropper.css";
import { formatTimeAgo, formatExpiry } from "../utils/dateUtils";
import "../styles/StoriesSection.css";

/* ─── StoryViewer ────────────────────────────────────────────────────── */

function StoryViewer({ stories, startIndex, currentUser, onClose, onViewed }) {
  const [index, setIndex] = useState(startIndex);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef(null);
  const videoRef = useRef(null);
  const DURATION = 5000;

  const [showOptions, setShowOptions] = useState(false);
  const [showViewersList, setShowViewersList] = useState(false);
  const [viewers, setViewers] = useState([]);
  const [loadingViewers, setLoadingViewers] = useState(false);

  const story = stories[index];

  const fetchViewers = useCallback(async () => {
    if (!story) return;
    setLoadingViewers(true);
    try {
      const res = await fetch(`/api/v1/stories/${story.story_id}/viewers`, {
        headers: { Authorization: `Bearer ${currentUser.token}` }
      });
      const data = await res.json();
      if (res.ok) setViewers(data.data || []);
    } catch (err) {
      console.error("Fetch viewers error:", err);
    } finally {
      setLoadingViewers(false);
    }
  }, [story, currentUser?.token]);

  useEffect(() => {
    if (showViewersList) fetchViewers();
  }, [showViewersList, fetchViewers]);

  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/v1/stories/${story.story_id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${currentUser.token}` }
      });
      if (!res.ok) throw new Error("Failed to delete story.");
      onClose();
    } catch (err) {
      alert(err.message);
    }
  };

  const advance = useCallback(() => {
    if (index < stories.length - 1) {
      setShowViewersList(false);
      setProgress(0);
      setIndex((i) => i + 1);
    } else {
      onClose();
    }
  }, [index, stories.length, onClose]);

  useEffect(() => {
    if (!story) return;
    onViewed(story.story_id);
    setProgress(0);
  }, [story, onViewed]);

  const lastStoryIdRef = useRef(null);
  const startTimeRef = useRef(Date.now());

  // Single effect for image progression calculation
  useEffect(() => {
    if (!story || story.media_type === "video") return;

    if (showViewersList) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    // Check if we are starting a brand new story or resuming
    const isNewStory = lastStoryIdRef.current !== story.story_id;
    lastStoryIdRef.current = story.story_id;

    if (isNewStory) {
      // Start fresh
      setProgress(0);
      startTimeRef.current = Date.now();
    } else {
      // Resume from wherever the state 'progress' currently is
      startTimeRef.current = Date.now() - (progress * DURATION);
    }

    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const pct = Math.min(elapsed / DURATION, 1);
      
      setProgress(pct);

      if (pct >= 1) {
        clearInterval(timerRef.current);
        advance();
      }
    }, 50);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story, advance, showViewersList]); // Note: progress is still NOT a dependency to avoid re-runs

  // Sync video pause/play with viewers list
  useEffect(() => {
    if (videoRef.current) {
      if (showViewersList) videoRef.current.pause();
      else videoRef.current.play().catch(() => { });
    }
  }, [showViewersList]);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape") {
        if (showViewersList) setShowViewersList(false);
        else onClose();
      }
      if (e.key === "ArrowRight") advance();
      if (e.key === "ArrowLeft" && index > 0) setIndex((i) => i - 1);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [advance, index, onClose, showViewersList]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  if (!story) return null;

  const activeUserStories = stories.filter(s => s.user_id === story.user_id);
  const activeStoryLocalIndex = activeUserStories.findIndex(s => s.story_id === story.story_id);

  const handleVideoEnded = () => advance();
  const handleVideoTimeUpdate = () => {
    if (videoRef.current && videoRef.current.duration && !showViewersList) {
      setProgress(videoRef.current.currentTime / videoRef.current.duration);
    }
  };

  const isOwn = Number(story.user_id) === Number(currentUser?.user_id || currentUser?.id);

  return (
    <div className="story-viewer-backdrop" onClick={onClose}>
      <div className="story-viewer" onClick={(e) => e.stopPropagation()}>
        <div className="story-viewer-progress">
          {activeUserStories.map((s, i) => (
            <div key={s.story_id} className="story-progress-bar">
              <div
                className="story-progress-fill"
                style={{
                  width: i < activeStoryLocalIndex ? "100%" : i === activeStoryLocalIndex ? `${progress * 100}%` : "0%",
                }}
              />
            </div>
          ))}
        </div>

        <div className="story-viewer-header">
          <Link to={`/users/${story.user_id}`} className="story-viewer-user" onClick={onClose} style={{ textDecoration: "none" }}>
            {story.profile_picture ? (
              <img src={story.profile_picture} alt="" className="story-viewer-avatar" />
            ) : (
              <div className="story-viewer-avatar-placeholder">
                {(story.full_name || story.username || "?")[0].toUpperCase()}
              </div>
            )}
            <div>
              <div className="story-viewer-name" style={{ display: 'flex', alignItems: 'center' }}>
                {story.full_name || story.username}
                {story.flagged && (
                  <span className="post-flagged-icon" data-tooltip="This content has been marked as inappropriate, engage at your own discretion" style={{ marginLeft: "8px", fontSize: "14px", padding: "0 6px" }}>
                    !
                  </span>
                )}
              </div>
              <div className="story-viewer-time">
                {formatTimeAgo(story.created_at)} • {formatExpiry(story.expires_at)}
              </div>
            </div>
          </Link>
          <div className="story-viewer-actions" style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            {isOwn && (
              <div style={{ position: "relative" }}>
                <button
                  className="story-viewer-options-btn"
                  onClick={() => setShowOptions(!showOptions)}
                  style={{ background: "transparent", border: "none", color: "#fff", fontSize: "20px", cursor: "pointer", lineHeight: 1 }}
                >
                  ⋮
                </button>
                {showOptions && (
                  <div
                    className="story-options-menu"
                    style={{ position: "absolute", right: "0", top: "120%", background: "#222", padding: "8px", borderRadius: "8px", zIndex: 100, border: "1px solid #444", boxShadow: "0 4px 12px rgba(0,0,0,0.5)" }}
                  >
                    <button
                      onClick={handleDelete}
                      style={{ background: "transparent", border: "none", color: "#ff4a4a", cursor: "pointer", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: "6px" }}
                    >
                      Delete story
                    </button>
                  </div>
                )}
              </div>
            )}
            <button className="story-viewer-close" onClick={onClose} style={{ marginLeft: "4px" }}>✕</button>
          </div>
        </div>

        <div className="story-viewer-media">
          {story.media_type === "video" ? (
            <video
              ref={videoRef}
              src={story.media_url}
              autoPlay
              playsInline
              onEnded={handleVideoEnded}
              onTimeUpdate={handleVideoTimeUpdate}
              className="story-viewer-video"
            />
          ) : (
            <img src={story.media_url} alt="Story" className="story-viewer-img" />
          )}
        </div>

        {isOwn && (
          <div
            className={`story-viewer-views ${showViewersList ? "active" : ""}`}
            onClick={() => setShowViewersList(!showViewersList)}
          >
            👁 {story.view_count || 0} view{story.view_count !== 1 ? "s" : ""}
          </div>
        )}

        {/* Viewers List Overlay */}
        {showViewersList && (
          <div className="story-viewers-list-overlay" onClick={() => setShowViewersList(false)}>
            <div className="story-viewers-list-content" onClick={e => e.stopPropagation()}>
              <div className="story-viewers-list-header">
                <h3>Viewers</h3>
                <button onClick={() => setShowViewersList(false)}>✕</button>
              </div>
              <div className="story-viewers-list-body">
                {loadingViewers ? (
                  <div className="story-viewers-loading">Loading...</div>
                ) : viewers.length === 0 ? (
                  <div className="story-viewers-empty">No views yet.</div>
                ) : (
                  viewers.map(viewer => (
                    <Link key={viewer.user_id} to={`/users/${viewer.user_id}`} className="story-viewer-item" onClick={onClose}>
                      {viewer.profile_picture ? (
                        <img src={viewer.profile_picture} alt="" className="story-viewer-item-avatar" />
                      ) : (
                        <div className="story-viewer-item-avatar-placeholder">
                          {(viewer.full_name || viewer.username || "?")[0].toUpperCase()}
                        </div>
                      )}
                      <div className="story-viewer-item-info">
                        <div className="story-viewer-item-name">{viewer.full_name || viewer.username}</div>
                        <div className="story-viewer-item-time">{formatTimeAgo(viewer.viewed_at)}</div>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        <button
          className="story-nav story-nav--prev"
          onClick={() => {
            if (index > 0) {
              setProgress(0);
              setIndex((i) => i - 1);
            }
          }}
          style={{ visibility: index === 0 ? "hidden" : "visible" }}
        >
          ‹
        </button>
        <button className="story-nav story-nav--next" onClick={advance}>
          ›
        </button>
      </div>
    </div>
  );
}


function CropModal({ file, previewUrl, isVideo, onConfirm, onCancel }) {
  const [uploading, setUploading] = useState(false);
  const imgRef = useRef(null);
  const cropperInstance = useRef(null);

  useEffect(() => {
    if (!isVideo && imgRef.current) {
      cropperInstance.current = new Cropper(imgRef.current, {
        viewMode: 1,
        dragMode: "crop",
        guides: true,
        autoCropArea: 1,
        responsive: true,
        background: false,
      });
    }
    return () => {
      if (cropperInstance.current) {
        cropperInstance.current.destroy();
        cropperInstance.current = null;
      }
    };
  }, [previewUrl, isVideo]);

  const handleConfirm = async () => {
    setUploading(true);
    try {
      let blob = file;
      if (!isVideo && cropperInstance.current) {
        const canvas = cropperInstance.current.getCroppedCanvas({
          imageSmoothingEnabled: true,
          imageSmoothingQuality: "high",
        });
        blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.95));
      }
      onConfirm(blob, isVideo);
    } catch (err) {
      console.error("Crop error:", err);
      onConfirm(file, isVideo);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="story-modal-backdrop" onClick={onCancel}>
      <div className="story-crop-modal" onClick={(e) => e.stopPropagation()}>
        <div className="story-crop-header">
          <h3>Preview Story</h3>
          <p className="story-crop-hint">
            {isVideo ? "Your video will be displayed in 9:16 format." : "Crop your image freely by dragging the edges."}
          </p>
        </div>

        <div className="story-crop-preview-wrapper" style={{ position: "relative", height: "500px", background: "#333", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {isVideo ? (
            <video src={previewUrl} controls className="story-viewer-video" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <div style={{ width: "100%", height: "100%" }}>
              <img
                src={previewUrl}
                ref={imgRef}
                alt="Source"
                style={{ display: "block", maxWidth: "100%", maxHeight: "100%" }}
              />
            </div>
          )}
        </div>

        <div className="story-crop-actions">
          <button className="story-crop-btn story-crop-btn--cancel" onClick={onCancel} disabled={uploading}>
            Cancel
          </button>
          <button className="story-crop-btn story-crop-btn--confirm" onClick={handleConfirm} disabled={uploading}>
            {uploading ? "Processing…" : isVideo ? "Upload Video" : "Crop & Upload"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── MainComponent ──────────────────────────────────────────────────── */

const StoriesSection = () => {
  const { currentUser } = useUser();
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Upload flow
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isVideo, setIsVideo] = useState(false);
  const [showCropModal, setShowCropModal] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploading, setUploading] = useState(false);

  // Viewer
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [viewerStoriesSnapshot, setViewerStoriesSnapshot] = useState([]);

  const fileInputRef = useRef(null);
  const authToken = currentUser?.token;

  const fetchStories = useCallback(async () => {
    if (!authToken) return;
    try {
      setLoading(true);
      const res = await fetch("/api/v1/stories", {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (res.ok) setStories(data.data || []);
    } catch (err) {
      console.error("Fetch stories error:", err);
    } finally {
      setLoading(false);
    }
  }, [authToken]);

  useEffect(() => { fetchStories(); }, [fetchStories]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    const vid = file.type.startsWith("video/");
    setIsVideo(vid);
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setShowCropModal(true);
    setUploadError("");
  };

  const handleCropConfirm = async (blob, vid) => {
    setShowCropModal(false);
    setUploading(true);
    setUploadError("");

    try {
      const formData = new FormData();
      formData.append("media", blob, vid ? "story.mp4" : "story.jpg");

      const res = await fetch("/api/v1/stories", {
        method: "POST",
        headers: { Authorization: `Bearer ${authToken}` },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Upload failed");

      await fetchStories();
    } catch (err) {
      setUploadError(err.message || "Upload failed");
    } finally {
      setUploading(false);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      setSelectedFile(null);
    }
  };

  const handleCropCancel = () => {
    setShowCropModal(false);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setSelectedFile(null);
  };

  const openViewer = (index) => {
    setViewerStoriesSnapshot(flatStories);
    setViewerIndex(index);
    setViewerOpen(true);
  };

  const handleViewed = useCallback(async (storyId) => {
    if (!authToken) return;
    try {
      await fetch(`/api/v1/stories/${storyId}/view`, {
        method: "POST",
        headers: { Authorization: `Bearer ${authToken}` },
      });
      setStories((prev) =>
        prev.map((s) => s.story_id === storyId ? { ...s, viewed_by_me: true } : s)
      );
    } catch (err) {
      console.error("View story error:", err);
    }
  }, [authToken]);

  const { storiesByUser, flatStories } = useMemo(() => {
    const grouped = [];
    const seenUsers = new Set();
    for (const s of stories) {
      if (!seenUsers.has(s.user_id)) {
        seenUsers.add(s.user_id);
        const userStories = stories.filter((x) => x.user_id === s.user_id);
        grouped.push({ user: s, stories: userStories });
      }
    }

    const currentId = Number(currentUser?.user_id || currentUser?.id);
    grouped.sort((a, b) => {
      const isA = Number(a.user.user_id) === currentId ? 1 : 0;
      const isB = Number(b.user.user_id) === currentId ? 1 : 0;
      return isB - isA;
    });

    return {
      storiesByUser: grouped,
      flatStories: grouped.flatMap((g) => g.stories)
    };
  }, [stories, currentUser]);

  return (
    <section className="stories-section">
      <div className="stories-scroll">
        <div
          className={`story-card create-story-card ${uploading ? "story-card--uploading" : ""}`}
          onClick={() => !uploading && fileInputRef.current?.click()}
        >
          <div
            className="story-image create-story-image"
            style={
              currentUser?.profile_picture
                ? { backgroundImage: `url(${currentUser.profile_picture})` }
                : { backgroundColor: "var(--color-bg-dark)" }
            }
          >
            <div className="story-overlay" />
            <div className="create-story-btn-wrapper">
              <div className="create-story-btn">
                {uploading ? (
                  <div className="story-spinner" />
                ) : (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
            </div>
            <div className="story-username">
              {uploading ? "Uploading…" : "Create Story"}
            </div>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          className="story-file-input"
          onChange={handleFileChange}
        />

        {uploadError && <div className="story-upload-error">{uploadError}</div>}

        {loading ? (
          <div className="story-card story-card--skeleton">
            <div className="story-image story-image--skeleton" />
          </div>
        ) : (
          storiesByUser.map((group, gIdx) => {
            const { user, stories: userStories } = group;
            const allViewed = userStories.every((s) => s.viewed_by_me);
            const flatIndex = flatStories.indexOf(userStories[0]);
            return (
              <div
                key={user.user_id}
                className={`story-card ${allViewed ? "" : "story-card--unseen"}`}
                onClick={() => openViewer(flatIndex)}
              >
                <div
                  className="story-image"
                  style={{ backgroundImage: `url(${userStories[0].media_url})` }}
                >
                  {userStories[0].media_type === "video" && (
                    <div className="story-video-badge">▶</div>
                  )}
                  <div className="story-overlay" />
                  <img
                    src={user.profile_picture || "https://via.placeholder.com/40"}
                    alt={user.username}
                    className={`story-avatar ${allViewed ? "story-avatar--seen" : ""}`}
                  />
                  <div className="story-username">{user.full_name || user.username}</div>
                  {userStories.length > 1 && (
                    <div className="story-count-badge">{userStories.length}</div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {showCropModal && previewUrl && (
        <CropModal
          file={selectedFile}
          previewUrl={previewUrl}
          isVideo={isVideo}
          onConfirm={handleCropConfirm}
          onCancel={handleCropCancel}
        />
      )}

      {viewerOpen && viewerStoriesSnapshot.length > 0 && (
        <StoryViewer
          stories={viewerStoriesSnapshot}
          startIndex={viewerIndex}
          currentUser={currentUser}
          onClose={() => {
            setViewerOpen(false);
            setViewerStoriesSnapshot([]);
          }}
          onViewed={handleViewed}
        />
      )}
    </section>
  );
};

export default StoriesSection;
