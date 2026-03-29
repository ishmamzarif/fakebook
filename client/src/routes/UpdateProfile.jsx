import React, { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useUser } from "../context/UserContext";
import { isValidPhoneNumber } from "libphonenumber-js";
import { default as CountryList } from "country-list";

const UpdateProfile = () => {
  const countries = useMemo(() => CountryList.getNames(), []);
  const countryList = useMemo(() => CountryList.getData(), []);

  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser, setCurrentUser } = useUser();
  const profileInputRef = useRef(null);
  const coverInputRef = useRef(null);

  const [formData, setFormData] = useState({
    full_name: "",
    country: "",
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
  const [errors, setErrors] = useState({});

  useEffect(() => {
    // Only logged in users can update their profile
    if (!currentUser) {
      navigate("/");
      return;
    }

    // Only allow owner to update
    if (String(currentUser.user_id) !== String(id)) {
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
            country: u.country || "",
            phone_number: u.phone_number || "",
            address: u.address || "",
            bio: u.bio || "",
            curr_institution: u.curr_institution || "",
            is_private: u.is_private || false
          });
          setProfilePreview(u.profile_picture || "");
          setCoverPreview(u.cover_picture || "");
        } else {
          setErrors({ general: "Failed to fetch user data" });
        }
      })
      .catch(err => setErrors({ general: "Error loading profile" }))
      .finally(() => setLoading(false));
  }, [id, currentUser, navigate]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
    // Clear error for this field
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: ""
      });
    }
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

  const validateForm = () => {
    const newErrors = {};

    if (!formData.full_name || !formData.full_name.trim()) {
      newErrors.full_name = "Full name is required";
    }

    // Phone number only validated if provided
    if (formData.phone_number) {
      let valid = false;
      try {
        if (isValidPhoneNumber(formData.phone_number)) {
          valid = true;
        } else if (formData.country) {
          const countryData = countryList.find(c => c.name === formData.country);
          if (countryData && isValidPhoneNumber(formData.phone_number, countryData.code)) {
            valid = true;
          }
        }
      } catch (e) {
        valid = false;
      }

      if (!valid) {
        if (!formData.country && !formData.phone_number.startsWith('+')) {
          newErrors.country = "Please select a country to validate local phone numbers";
        } else {
          newErrors.phone_number = "Invalid phone number format";
        }
      }
    }

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("Update profile submitted", formData);

    const newErrors = validateForm();
    if (Object.keys(newErrors).length > 0) {
      console.log("Validation errors:", newErrors);
      setErrors(newErrors);
      return;
    }

    setUpdating(true);
    setErrors({});

    if (!currentUser?.token) {
      setErrors({ general: "Authentication required. Please log in again." });
      setUpdating(false);
      return;
    }

    const submitData = new FormData();
    Object.keys(formData).forEach(key => {
      // Don't send country to the backend since it's only for validation
      if (key !== "country") {
        submitData.append(key, formData[key]);
      }
    });

    if (profilePic) submitData.append("profile_picture", profilePic);
    if (coverPic) submitData.append("cover_picture", coverPic);

    try {
      const res = await fetch(`/api/v1/users/${id}`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${currentUser.token}`
        },
        body: submitData
      });

      const data = await res.json();

      if (!res.ok) {
        console.error("Update failed with status:", res.status, data);
        if (data.errors && Array.isArray(data.errors)) {
          // Handle validation errors from backend
          const backendErrors = {};
          data.errors.forEach(err => {
            const fieldName = err.path;
            backendErrors[fieldName] = err.msg;
          });
          setErrors(backendErrors);
        } else {
          setErrors({ general: data.message || "Update failed" });
        }
        return;
      }

      console.log("Update success response:", data);

      if (data.status === "success") {
        // Sync all fields updated from server (bio, address, institution etc)
        if (currentUser && String(currentUser.user_id) === String(id)) {
          console.log("Syncing context with new data");
          setCurrentUser({
            ...currentUser,
            ...data.data,
            token: currentUser.token // preserve existing token
          });
        }

        // Slight delay to ensure context update propagates if needed, though usually sync
        console.log("Navigating to user profile:", id);
        navigate(`/users/${id}`);
      } else {
        setErrors({ general: "Update failed" });
      }
    } catch (err) {
      console.error("Network or server error:", err);
      setErrors({ general: "Server error occurred" });
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return <div className="update-profile-page"><div className="app-loading">Loading...</div></div>;

  return (
    <div className="update-profile-page">
      <div className="update-profile-card">
        {errors.general && <div className="error-msg">{errors.general}</div>}

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
              <input 
                type="text" 
                name="full_name" 
                value={formData.full_name} 
                onChange={handleChange} 
                maxLength="100"
              />
            </div>

            <div className="form-group">
              <label>Bio</label>
              <textarea name="bio" value={formData.bio} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Country</label>
              <select
                name="country"
                value={formData.country}
                onChange={handleChange}
                style={{
                  padding: "10px 12px",
                  fontSize: "13px",
                  background: "#0a0a0a",
                  color: "#fff",
                  border: "1px solid #333",
                  outline: "none",
                  cursor: "pointer"
                }}
              >
                <option value="">Select Country</option>
                {countries.map((country) => (
                  <option key={country} value={country}>
                    {country}
                  </option>
                ))}
              </select>
              {errors.country && <p className="form-error">{errors.country}</p>}
            </div>
            <div className="form-group">
              <label>Phone Number</label>
              <input
                type="tel"
                name="phone_number"
                placeholder="Enter phone number"
                value={formData.phone_number}
                onChange={handleChange}
                style={{
                  padding: "10px 12px",
                  fontSize: "13px",
                  background: "#0a0a0a",
                  color: "#fff",
                  border: "1px solid #333",
                  outline: "none"
                }}
              />
              {errors.phone_number && <p className="form-error">{errors.phone_number}</p>}
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
