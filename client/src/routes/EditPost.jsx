import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useUser } from "../context/UserContext";
import "../styles/PostCreation.css"; // Reuse PostCreation styles, plus we'll add inline overrides if needed

const EditPost = () => {
  const { id } = useParams();
  const { currentUser } = useUser();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [caption, setCaption] = useState("");
  const [existingMedia, setExistingMedia] = useState([]);
  const [deletedMediaIds, setDeletedMediaIds] = useState([]);

  const [newMediaFiles, setNewMediaFiles] = useState([]);
  const [newMediaPreviews, setNewMediaPreviews] = useState([]);

  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!currentUser?.token) return;

    fetch(`/api/v1/posts/${id}`, {
      headers: { Authorization: `Bearer ${currentUser.token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.status === "success") {
          if (data.data.user_id !== currentUser.id && data.data.user_id !== currentUser.user_id) {
            setError("You do not have permission to edit this post.");
          } else {
            setCaption(data.data.caption || "");
            setExistingMedia(data.data.media || []);
          }
        } else {
          setError(data.message || "Failed to load post");
        }
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [id, currentUser]);

  useEffect(() => {
    // Generate previews for new files
    const previews = newMediaFiles.map(file => ({
      url: URL.createObjectURL(file),
      type: file.type
    }));
    setNewMediaPreviews(previews);

    return () => {
      previews.forEach(p => URL.revokeObjectURL(p.url));
    };
  }, [newMediaFiles]);

  const handleFileChange = (e) => {
    if (e.target.files) {
      setNewMediaFiles(prev => [...prev, ...Array.from(e.target.files)]);
    }
  };

  const removeExistingMedia = (mediaId) => {
    setExistingMedia(prev => prev.filter(m => m.media_id !== mediaId));
    setDeletedMediaIds(prev => [...prev, mediaId]);
  };

  const removeNewMedia = (indexToRemove) => {
    setNewMediaFiles(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError("");

    if (!caption.trim() && existingMedia.length === 0 && newMediaFiles.length === 0) {
      setError("Post cannot be empty.");
      setSubmitting(false);
      return;
    }

    const formData = new FormData();
    formData.append("caption", caption);
    formData.append("deletedMediaIds", JSON.stringify(deletedMediaIds));

    newMediaFiles.forEach(file => {
      formData.append("media", file);
    });

    try {
      const res = await fetch(`/api/v1/posts/${id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${currentUser.token}`
        },
        body: formData
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to update post");
      }

      navigate(-1); // go back to feed/profile
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div style={{ padding: "20px" }}>Loading post...</div>;
  if (error) return <div style={{ padding: "20px", color: "red" }}>{error} <br /> <button onClick={() => navigate(-1)}>Back</button></div>;

  return (
    <div style={{ maxWidth: "600px", margin: "20px auto", width: "100%" }}>
      <div className="post-modal-content" style={{ maxWidth: '100%', maxHeight: 'none' }}>
        <div className="post-modal-header">
          <h3>Edit Post</h3>
          <button className="post-modal-close" onClick={() => navigate(-1)}>✕</button>
        </div>

        <div className="post-modal-body" style={{ maxHeight: '80vh' }}>
          <div className="post-modal-user">
            {currentUser.profile_picture ? (
              <img src={currentUser.profile_picture} alt="" className="post-avatar" />
            ) : (
              <div className="post-avatar-placeholder">{(currentUser.full_name || currentUser.username || "?")[0].toUpperCase()}</div>
            )}
            <span>{currentUser.full_name || currentUser.username}</span>
          </div>

          <textarea
            className="post-modal-textarea"
            placeholder="What's on your mind?"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
          />

          <div className="post-modal-previews">
            {/* Existing Media */}
            {existingMedia.map(media => (
              <div key={media.media_id} className="post-modal-preview-item">
                {media.media_type === "video" ? (
                  <video src={media.media_url} controls />
                ) : (
                  <img src={media.media_url} alt="" />
                )}
                <button title="Remove" onClick={() => removeExistingMedia(media.media_id)}>✕</button>
              </div>
            ))}

            {/* New Media */}
            {newMediaPreviews.map((preview, idx) => (
              <div key={idx} className="post-modal-preview-item">
                {preview.type.startsWith("video/") ? (
                  <video src={preview.url} controls />
                ) : (
                  <img src={preview.url} alt="" />
                )}
                <button title="Remove" onClick={() => removeNewMedia(idx)}>✕</button>
              </div>
            ))}
          </div>

          <div className="post-modal-add-media" onClick={() => fileInputRef.current?.click()}>
            <span className="add-media-icon">🖼️</span>
            <span>Add Photos/Videos</span>
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: "none" }}
              accept="image/*,video/*"
              multiple
              onChange={handleFileChange}
            />
          </div>
        </div>

        <div className="post-modal-footer">
          <button
            className="post-modal-submit-btn"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditPost;
