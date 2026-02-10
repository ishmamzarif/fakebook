import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useUser } from "../context/UserContext";

const UpdateProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser, setCurrentUser } = useUser();
  const profileInputRef = useRef(null);
  const coverInputRef = useRef(null);

  const [formData, setFormData] = useState({
    full_name: "",
    phone_number: "",
    address: "",
    bio: "",
    curr_institution: "",
    is_private: false
  });

  const [profilePreview, setProfilePreview] = useState("");
  const [coverPreview, setCoverPreview] = useState("");
  const [profilePic, setProfilePic] = useState(null);
  const [coverPic, setCoverPic] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // Only allow owner to update
    if (currentUser && String(currentUser.user_id) !== String(id)) {
      navigate(`/users/${id}`);
      return;
    }

    fetch(`/api/v1/users/${id}`)
      .then(res => res.json())
      .then(data => {
        if (data.status === "success") {
          const u = data.data;
          setFormData({
            full_name: u.full_name || "",
            phone_number: u.phone_number || "",
            address: u.address || "",
            bio: u.bio || "",
            curr_institution: u.curr_institution || "",
            is_private: u.is_private || false
          });
          setProfilePreview(u.profile_picture || "");
          setCoverPreview(u.cover_picture || "");
        } else {
          setError("Failed to fetch user data");
        }
      })
      .catch(err => setError("Error loading profile"))
      .finally(() => setLoading(false));
  }, [id, currentUser, navigate]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  };

  const handleFileChange = (e) => {
    const { name, files } = e.target;
    const file = files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      if (name === "profile_picture") {
        setProfilePic(file);
        setProfilePreview(reader.result);
      } else if (name === "cover_picture") {
        setCoverPic(file);
        setCoverPreview(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUpdating(true);
    setError("");

    const submitData = new FormData();
    Object.keys(formData).forEach(key => {
      submitData.append(key, formData[key]);
    });
    if (profilePic) submitData.append("profile_picture", profilePic);
    if (coverPic) submitData.append("cover_picture", coverPic);

    try {
      const res = await fetch(`/api/v1/users/${id}`, {
        method: "PUT",
        body: submitData
      });
      const data = await res.json();
      if (data.status === "success") {
        // Update context if it's the current user
        if (currentUser && String(currentUser.user_id) === String(id)) {
          setCurrentUser({
            ...currentUser,
            full_name: data.data.full_name,
            profile_picture: data.data.profile_picture
          });
        }
        navigate(`/users/${id}`);
      } else {
        setError(data.message || "Update failed");
      }
    } catch (err) {
      setError("Server error occurred");
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return <div className="update-profile-page"><div className="app-loading">Loading...</div></div>;

  return (
    <div className="update-profile-page">
      <div className="update-profile-card">
        {error && <div className="error-msg">{error}</div>}
        <form onSubmit={handleSubmit} className="update-form">

          {/* Top Section: Interactive Images */}
          <div className="profile-cover-wrap update-images-section">
            <div
              className="profile-cover update-interactive-cover"
              style={coverPreview ? { backgroundImage: `url(${coverPreview})` } : {}}
              onClick={() => coverInputRef.current.click()}
            >
              <div className="update-image-overlay">Edit Cover</div>
              <input
                type="file"
                name="cover_picture"
                ref={coverInputRef}
                onChange={handleFileChange}
                accept="image/*"
                hidden
              />
            </div>
            <div
              className="profile-avatar-on-cover update-interactive-avatar"
              onClick={() => profileInputRef.current.click()}
            >
              {profilePreview ? (
                <img src={profilePreview} alt="Profile" className="profile-avatar" />
              ) : (
                <div className="profile-avatar-placeholder">—</div>
              )}
              <div className="update-avatar-overlay">Edit</div>
              <input
                type="file"
                name="profile_picture"
                ref={profileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                hidden
              />
            </div>
          </div>

          <div className="update-fields-container">
            <div className="form-group">
              <label>Full Name</label>
              <input type="text" name="full_name" value={formData.full_name} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Bio</label>
              <textarea name="bio" value={formData.bio} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Phone Number</label>
              <input type="text" name="phone_number" value={formData.phone_number} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Address</label>
              <input type="text" name="address" value={formData.address} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Current Institution</label>
              <input type="text" name="curr_institution" value={formData.curr_institution} onChange={handleChange} />
            </div>
            <div className="form-group toggle-group">
              <label className="toggle-label">Private Account</label>
              <label className="switch">
                <input
                  type="checkbox"
                  name="is_private"
                  checked={formData.is_private}
                  onChange={handleChange}
                />
                <span className="slider round"></span>
              </label>
            </div>

            <div className="update-actions">
              <button type="submit" disabled={updating} className="submit-btn">
                {updating ? "Updating..." : "Save Changes"}
              </button>
              <button type="button" onClick={() => navigate(`/users/${id}`)} className="cancel-btn">
                Cancel
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UpdateProfile;
