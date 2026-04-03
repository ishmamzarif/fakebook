import React, { useState, useRef } from "react";
import { useUser } from "../context/UserContext";

const PostCreation = ({ onPostCreated }) => {
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
  const [friends, setFriends] = useState([]);
  const [tagSearch, setTagSearch] = useState("");
  const [selectedTags, setSelectedTags] = useState([]);
  const [isTagging, setIsTagging] = useState(false);

  const fetchFriends = async () => {
    if (!currentUser?.token) return;
    try {
      const res = await fetch("/api/v1/friends", {
        headers: { Authorization: `Bearer ${currentUser.token}` },
      });
      const data = await res.json();
      if (res.ok) setFriends(Array.isArray(data.data) ? data.data : []);
    } catch (err) {
      console.error("Failed to fetch friends:", err);
    }
  };

  const toggleTag = (f) => {
    if (selectedTags.find((t) => t.user_id === f.user_id)) {
      setSelectedTags(selectedTags.filter((t) => t.user_id !== f.user_id));
    } else {
      setSelectedTags([...selectedTags, f]);
    }
  };

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
          caption: postContent,
          tagged_user_ids: selectedTags.map(t => t.user_id)
        })
      });

      if (!res.ok) throw new Error("Failed to create post");

      setPostContent("");
      setSelectedTags([]);
      if (onPostCreated) onPostCreated();
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
    setSelectedTags([]);
    setIsTagging(false);
    setTagSearch("");
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
      formData.append("tagged_user_ids", JSON.stringify(selectedTags.map(t => t.user_id)));

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
      if (onPostCreated) onPostCreated();
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

          {selectedTags.length > 0 && (
            <div style={{ padding: "0 16px 8px", fontSize: "0.85rem", color: "var(--color-text-dimmed)" }}>
               — with <strong>{selectedTags[0].full_name || selectedTags[0].username}</strong>
               {selectedTags.length > 1 && ` and ${selectedTags.length - 1} others`}
               <button onClick={() => setSelectedTags([])} style={{ background: "none", border: "none", color: "#f44336", marginLeft: "8px", cursor: "pointer" }}>✕</button>
            </div>
          )}

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
                {selectedTags.length > 0 && (
                  <span style={{ fontSize: "0.9rem", color: "var(--color-text-dimmed)", marginLeft: "4px" }}>
                    is with <strong>{selectedTags[0].full_name || selectedTags[0].username}</strong>
                    {selectedTags.length > 1 && ` and ${selectedTags.length - 1} others`}
                  </span>
                )}
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

              <div className="post-modal-add-media-row" style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
                <div className="post-modal-add-media" style={{ flex: 1, height: "40px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => fileInputRef.current.click()}>
                  <div className="add-media-icon" style={{ fontSize: "1.1rem", marginRight: "8px" }}>📷</div>
                  <span>Photo/Video</span>
                </div>
                <div className="post-modal-add-media" style={{ flex: 1, height: "40px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => { fetchFriends(); setIsTagging(!isTagging); }}>
                  <div className="add-media-icon" style={{ fontSize: "1.1rem", marginRight: "8px" }}>🏷️</div>
                  <span>Tag Friends</span>
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                multiple
                onChange={handleModalFileChange}
                hidden
              />

              {isTagging && (
                <div style={{ marginTop: "16px", borderTop: "1px solid #3a3b3c", paddingTop: "12px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                    <span style={{ fontSize: "0.9rem", fontWeight: "600" }}>Tag Friends</span>
                    <input 
                      style={{ background: "#242526", border: "1px solid #3a3b3c", color: "white", borderRadius: "12px", padding: "4px 12px", fontSize: "0.85rem", width: "150px" }}
                      placeholder="Search..."
                      value={tagSearch}
                      onChange={(e) => setTagSearch(e.target.value)}
                      onClick={(e) => { e.stopPropagation(); fetchFriends(); }}
                    />
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", maxHeight: "100px", overflowY: "auto", padding: "4px" }}>
                    {friends.length === 0 && <span style={{ fontSize: "0.8rem", color: "#8e8e8e" }}>Loading friends...</span>}
                    {friends
                      .filter(f => (f.full_name || f.username || f.nickname || "").toLowerCase().includes(tagSearch.toLowerCase()))
                      .map(f => (
                        <div 
                          key={f.user_id} 
                          onClick={() => toggleTag(f)}
                          style={{ 
                            padding: "4px 12px", 
                            borderRadius: "16px", 
                            fontSize: "0.8rem", 
                            cursor: "pointer",
                            background: selectedTags.find(t => t.user_id === f.user_id) ? "white" : "#3a3b3c",
                            color: selectedTags.find(t => t.user_id === f.user_id) ? "black" : "white",
                            transition: "0.2s"
                          }}
                        >
                          {f.full_name || f.username}
                        </div>
                      ))
                    }
                  </div>
                </div>
              )}
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
