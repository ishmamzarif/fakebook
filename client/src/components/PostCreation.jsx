import React, { useState, useRef } from "react";
import { useUser } from "../context/UserContext";

const PostCreation = () => {
  const { currentUser } = useUser();
  const fileInputRef = useRef(null);

  // Main UI State
  const [postContent, setPostContent] = useState("");
  const [postLoading, setPostLoading] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalCaption, setModalCaption] = useState("");
  const [modalMedia, setModalMedia] = useState([]);
  const [modalPreviews, setModalPreviews] = useState([]);
  const [modalLoading, setModalLoading] = useState(false);

  // ---- MAIN POST SUBMIT (Caption Only - "c" type) ----
  const handleMainSubmit = async (e) => {
    e.preventDefault();

    if (!postContent.trim()) {
      alert("Please write something to post!");
      return;
    }

    setPostLoading(true);

    try {
      const res = await fetch("/api/v1/posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${currentUser?.token}`
        },
        body: JSON.stringify({
          caption: postContent
        })
      });

      if (!res.ok) throw new Error("Failed to create post");

      setPostContent("");
      // Ideally refresh feed here
    } catch (err) {
      alert("Error creating post");
    } finally {
      setPostLoading(false);
    }
  };

  // ---- MODAL OPEN/CLOSE ----
  const openModal = () => setIsModalOpen(true);

  const closeModal = () => {
    setIsModalOpen(false);
    setModalCaption("");
    setModalMedia([]);
    setModalPreviews([]);
  };

  // ---- MODAL FILE HANDLING ----
  const handleModalFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    // We can append to existing media
    setModalMedia((prev) => [...prev, ...files]);

    // Create previews
    files.forEach((file) => {
      const isVideo = file.type.startsWith("video/");
      const url = URL.createObjectURL(file);
      setModalPreviews((prev) => [...prev, { url, isVideo, name: file.name }]);
    });
  };

  const removeMedia = (index) => {
    setModalMedia((prev) => prev.filter((_, i) => i !== index));
    setModalPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  // ---- MODAL SUBMIT (Media Post - "p" type) ----
  const handleModalSubmit = async (e) => {
    e.preventDefault();

    if (!modalCaption.trim() && modalMedia.length === 0) {
      alert("Please add a caption or some photos/videos.");
      return;
    }

    setModalLoading(true);

    try {
      const formData = new FormData();
      formData.append("caption", modalCaption);

      modalMedia.forEach((file) => {
        formData.append("media", file);
      });

      const res = await fetch("/api/v1/posts", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${currentUser?.token}`
        },
        body: formData
      });

      if (!res.ok) throw new Error("Failed to create post");

      closeModal();
      // Ideally refresh feed here
    } catch (err) {
      alert("Error uploading post");
    } finally {
      setModalLoading(false);
    }
  };

  return (
    <>
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
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleMainSubmit(e);
                }
              }}
            />
          </div>

          <form onSubmit={handleMainSubmit} className="post-creation-form">
            <div className="post-actions">
              <button
                type="button"
                className="post-action-btn"
                onClick={openModal}
              >
                📷 Photo/Video
              </button>
              <button type="submit" className="post-submit-btn" disabled={postLoading}>
                {postLoading ? "Posting..." : "Post"}
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* --- MEDIA MODAL --- */}
      {isModalOpen && (
        <div className="post-modal-overlay" onClick={closeModal}>
          <div className="post-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="post-modal-header">
              <h3>Create Post</h3>
              <button className="post-modal-close" onClick={closeModal}>✕</button>
            </div>

            <div className="post-modal-body">
              <div className="post-modal-user">
                {currentUser?.profile_picture ? (
                  <img src={currentUser.profile_picture} alt="Profile" className="post-avatar" />
                ) : (
                  <div className="post-avatar-placeholder">—</div>
                )}
                <span>{currentUser?.username || "You"}</span>
              </div>

              <textarea
                className="post-modal-textarea"
                placeholder="What's on your mind?"
                value={modalCaption}
                onChange={(e) => setModalCaption(e.target.value)}
              />

              {modalPreviews.length > 0 && (
                <div className="post-modal-previews">
                  {modalPreviews.map((preview, index) => (
                    <div key={index} className="post-modal-preview-item">
                      {preview.isVideo ? (
                        <video src={preview.url} controls />
                      ) : (
                        <img src={preview.url} alt={`Preview ${index}`} />
                      )}
                      <button type="button" onClick={() => removeMedia(index)}>✕</button>
                    </div>
                  ))}
                </div>
              )}

              <div className="post-modal-add-media" onClick={() => fileInputRef.current.click()}>
                <div className="add-media-icon">📷</div>
                <span>Add Photos/Videos</span>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                multiple
                onChange={handleModalFileChange}
                hidden
              />
            </div>

            <div className="post-modal-footer">
              <button
                className="post-modal-submit-btn"
                onClick={handleModalSubmit}
                disabled={modalLoading || (!modalCaption.trim() && modalMedia.length === 0)}
              >
                {modalLoading ? "Posting..." : "Post"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PostCreation;
