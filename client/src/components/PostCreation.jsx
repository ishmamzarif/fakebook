import React, { useState, useRef } from "react";
import { useUser } from "../context/UserContext";

const PostCreation = () => {
  const { currentUser } = useUser();
  const fileInputRef = useRef(null);

  const [postContent, setPostContent] = useState("");
  const [postImage, setPostImage] = useState(null);
  const [postImagePreview, setPostImagePreview] = useState("");
  const [postLoading, setPostLoading] = useState(false);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setPostImage(file);
      setPostImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handlePostSubmit = async (e) => {
    e.preventDefault();

    if (!postContent.trim() && !postImage) {
      alert("Write something or add a photo");
      return;
    }

    setPostLoading(true);

    try {
      // TODO: Implement post creation API endpoint
      // For now, just clear the form
      alert("Posting feature coming soon! API endpoint needed.");
      setPostContent("");
      setPostImage(null);
      setPostImagePreview("");
    } catch (err) {
      alert("Error creating post");
    } finally {
      setPostLoading(false);
    }
  };

  return (
    <section className="post-creation-section">
      <div className="post-creation-card">
        <div className="post-creation-header">
          {currentUser?.profile_picture ? (
            <img src={currentUser.profile_picture} alt="Your profile" className="post-avatar" />
          ) : (
            <div className="post-avatar-placeholder">—</div>
          )}
          <input
            type="text"
            placeholder="What's on your mind?"
            className="post-input"
            value={postContent}
            onChange={(e) => setPostContent(e.target.value)}
          />
        </div>

        <form onSubmit={handlePostSubmit} className="post-creation-form">
          {postImagePreview && (
            <div className="post-preview">
              <img src={postImagePreview} alt="Preview" className="post-preview-image" />
              <button
                type="button"
                className="post-preview-remove"
                onClick={() => {
                  setPostImage(null);
                  setPostImagePreview("");
                }}
              >
                ✕
              </button>
            </div>
          )}

          <div className="post-actions">
            <button
              type="button"
              className="post-action-btn"
              onClick={() => fileInputRef.current.click()}
            >
              📷 Photo/Video
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              onChange={handleFileChange}
              hidden
            />
            <button type="submit" className="post-submit-btn" disabled={postLoading}>
              {postLoading ? "Posting..." : "Post"}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
};

export default PostCreation;
