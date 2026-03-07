import React, { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useUser } from "../context/UserContext";
import { isValidPhoneNumber } from "libphonenumber-js";
import { default as CountryList } from "country-list";

const Signup = () => {
    const countries = useMemo(() => CountryList.getNames(), []);
    const countryList = useMemo(() => CountryList.getData(), []);

    const [formData, setFormData] = useState({
        username: "",
        email: "",
        password: "",
        fullName: "",
        country: "Bangladesh",
        phoneNumber: "",
    });
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { setCurrentUser } = useUser();

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: value,
        });
        // Clear error for this field when user starts typing
        if (errors[name]) {
            setErrors({
                ...errors,
                [name]: ""
            });
        }
    };

    const validateForm = () => {
        const newErrors = {};

        if (!formData.fullName.trim()) {
            newErrors.fullName = "Full name is required";
        }

        if (!formData.username.trim()) {
            newErrors.username = "Username is required";
        } else if (formData.username.length < 3 || formData.username.length > 20) {
            newErrors.username = "Username must be 3-20 characters";
        } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
            newErrors.username = "Username can only contain letters, numbers, and underscore";
        }

        if (!formData.email.trim()) {
            newErrors.email = "Email is required";
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = "Invalid email format";
        }

        if (!formData.password.trim()) {
            newErrors.password = "Password is required";
        } else if (formData.password.length < 8) {
            newErrors.password = "Password must be at least 8 characters";
        }

        if (!formData.country) {
            newErrors.country = "Country is required";
        }

        if (!formData.phoneNumber.trim()) {
            newErrors.phoneNumber = "Phone number is required";
        } else {
            // Get country code from country name
            const countryData = countryList.find(c => c.name === formData.country);
            if (countryData) {
                if (!isValidPhoneNumber(formData.phoneNumber, countryData.code)) {
                    newErrors.phoneNumber = `Invalid phone number for ${formData.country}`;
                }
            }
        }

        return newErrors;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const newErrors = validateForm();
        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setErrors({});
        setLoading(true);

        try {
            const res = await fetch("/api/v1/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    username: formData.username,
                    email: formData.email,
                    password: formData.password,
                    full_name: formData.fullName,
                    phone_number: formData.phoneNumber,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                if (data.errors && Array.isArray(data.errors)) {
                    // Handle validation errors from backend
                    const backendErrors = {};
                    data.errors.forEach(err => {
                        const fieldName = err.path;
                        backendErrors[fieldName] = err.msg;
                    });
                    setErrors(backendErrors);
                } else {
                    setErrors({ general: data.message || "Username or email already exists" });
                }
                return;
            }

            if (data.status === "success" && data.data?.user_id) {
                setCurrentUser(data.data);
                navigate(`/users/${data.data.user_id}`);
            } else {
                navigate("/");
            }
        } catch (err) {
            setErrors({ general: "Network error. Please try again." });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
                    <img src="/white_logo192.png" alt="Logo" style={{ width: "32px", height: "32px" }} />
                    <h1 className="login-title" style={{ margin: 0 }}>Fakebook</h1>
                </div>
                <p className="login-subtitle">Create a new account</p>

                <form onSubmit={handleSubmit} className="login-form">
                    <input
                        type="text"
                        name="fullName"
                        placeholder="Full Name"
                        value={formData.fullName}
                        onChange={handleChange}
                        className="login-input"
                        required
                        disabled={loading}
                    />
                    {errors.fullName && <p className="login-error">{errors.fullName}</p>}

                    <input
                        type="text"
                        name="username"
                        placeholder="Username"
                        value={formData.username}
                        onChange={handleChange}
                        className="login-input"
                        required
                        disabled={loading}
                    />
                    {errors.username && <p className="login-error">{errors.username}</p>}

                    <input
                        type="email"
                        name="email"
                        placeholder="Email address"
                        value={formData.email}
                        onChange={handleChange}
                        className="login-input"
                        required
                        disabled={loading}
                    />
                    {errors.email && <p className="login-error">{errors.email}</p>}

                    <select
                        name="country"
                        value={formData.country}
                        onChange={handleChange}
                        className="login-input"
                        disabled={loading}
                        style={{ cursor: "pointer" }}
                    >
                        <option value="">Select Country</option>
                        {countries.map((country) => (
                            <option key={country} value={country}>
                                {country}
                            </option>
                        ))}
                    </select>
                    {errors.country && <p className="login-error">{errors.country}</p>}

                    <input
                        type="tel"
                        name="phoneNumber"
                        placeholder="Phone number"
                        value={formData.phoneNumber}
                        onChange={handleChange}
                        className="login-input"
                        required
                        disabled={loading}
                    />
                    {errors.phoneNumber && <p className="login-error">{errors.phoneNumber}</p>}

                    <input
                        type="password"
                        name="password"
                        placeholder="Password"
                        value={formData.password}
                        onChange={handleChange}
                        className="login-input"
                        required
                        disabled={loading}
                    />
                    {errors.password && <p className="login-error">{errors.password}</p>}

                    {errors.general && <p className="login-error">{errors.general}</p>}

                    <button type="submit" className="login-button" disabled={loading}>
                        {loading ? "Creating account..." : "Sign Up"}
                    </button>
                </form>

                <div className="login-footer">
                    <Link to="/" className="login-link">Already have an account? Log in</Link>
                </div>
            </div>
        </div>
    );
};

export default Signup;
