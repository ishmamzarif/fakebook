import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useUser } from "../context/UserContext";
import "../styles/Friends.css";

const FriendRequests = () => {
    const { currentUser } = useUser();
    const navigate = useNavigate();
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const fetchRequests = async () => {
        if (!currentUser?.token) return;
        setLoading(true);
        try {
            const res = await fetch("/api/v1/friends/requests", {
                headers: { Authorization: `Bearer ${currentUser.token}` },
            });
            const data = await res.json();
            if (res.ok) {
                setRequests(Array.isArray(data.data) ? data.data : []);
            } else {
                throw new Error(data.message || "Failed to load requests");
            }
        } catch (err) {
            console.error("Failed to fetch requests:", err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const markAsSeen = async () => {
        if (!currentUser?.token) return;
        try {
            await fetch("/api/v1/notifications/seen", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${currentUser.token}`,
                },
                body: JSON.stringify({ type: "friend_request" }),
            });
        } catch (err) {
            console.error("Failed to mark notifications as seen:", err);
        }
    };

    useEffect(() => {
        fetchRequests();
        markAsSeen();
    }, [currentUser]);

    const handleAction = async (action, senderId) => {
        try {
            const res = await fetch(`/api/v1/friends/${action}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${currentUser.token}`,
                },
                body: JSON.stringify({ senderId }),
            });
            if (res.ok) {
                // Refresh list
                fetchRequests();
            }
        } catch (err) {
            console.error(`Failed to ${action} friend request:`, err);
        }
    };

    return (
        <section className="friends-page">
            <div className="friends-card">
                <header className="friends-header" style={{ flexDirection: 'column', gap: '15px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'baseline' }}>
                        <h1>Friend Requests</h1>
                        <span className="friends-count">
                            {requests.length} {requests.length === 1 ? "request" : "requests"}
                        </span>
                    </div>
                    <div className="friends-tabs" style={{ display: 'flex', gap: '20px', fontSize: '14px', borderBottom: '1px solid #222', width: '100%', paddingBottom: '10px' }}>
                        <Link to="/friends" style={{ color: '#666', textDecoration: 'none' }}>All Friends</Link>
                        <span style={{ color: '#fff', borderBottom: '2px solid #4ade80', paddingBottom: '9px', marginBottom: '-11px' }}>Pending Requests</span>
                    </div>
                </header>

                {loading ? (
                    <div className="friends-state">Loading your pending requests...</div>
                ) : error ? (
                    <div className="friends-state friends-state--error">{error}</div>
                ) : requests.length === 0 ? (
                    <div className="friends-state">You don&apos;t have any pending requests.</div>
                ) : (
                    <ul className="friends-list">
                        {requests.map((req) => (
                            <li key={req.user_id} className="friends-item" style={{ cursor: 'default' }}>
                                {req.profile_picture ? (
                                    <img src={req.profile_picture} alt="" className="friends-avatar" />
                                ) : (
                                    <div className="friends-avatar friends-avatar--placeholder">—</div>
                                )}
                                <div className="friends-text" style={{ flex: 1 }}>
                                    <Link to={`/users/${req.user_id}`} className="friends-name">
                                        {req.full_name || req.username}
                                    </Link>
                                    <span className="friends-handle">@{req.username}</span>
                                </div>
                                <div className="friends-actions" style={{ display: 'flex', gap: '8px' }}>
                                    <button 
                                        onClick={() => handleAction('accept', req.user_id)} 
                                        style={{ background: '#4ade80', color: '#000', border: 'none', borderRadius: '5px', padding: '6px 15px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                                    >
                                        Accept
                                    </button>
                                    <button 
                                        onClick={() => handleAction('reject', req.user_id)} 
                                        style={{ background: '#222', color: '#fff', border: 'none', borderRadius: '5px', padding: '6px 15px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                                    >
                                        Reject
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </section>
    );
};

export default FriendRequests;
