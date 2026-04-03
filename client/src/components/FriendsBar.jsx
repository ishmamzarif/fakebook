import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useUser } from "../context/UserContext";
import "../styles/FriendsBar.css";

const FriendsBar = ({ isOpen, setIsOpen }) => {
    const { currentUser } = useUser();
    const [friends, setFriends] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!currentUser?.token) return;

        const fetchFriends = async () => {
            // Only set loading on first fetch
            if (friends.length === 0) setLoading(true);
            try {
                const res = await fetch("/api/v1/friends", {
                    headers: { Authorization: `Bearer ${currentUser.token}` },
                });
                const data = await res.json();
                if (res.ok) {
                    setFriends(Array.isArray(data.data) ? data.data : []);
                }
            } catch (err) {
                console.error("Failed to fetch friends:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchFriends();
        const interval = setInterval(fetchFriends, 30000); // 30 seconds

        return () => clearInterval(interval);
    }, [currentUser]);

    if (!currentUser) return null;

    const filteredFriends = friends.filter(f => 
        (f.full_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (f.username || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (f.nickname || "").toLowerCase().includes(searchTerm.toLowerCase())
    );

    const isUserOnline = (lastSeen) => {
        if (!lastSeen) return false;
        const lastSeenDate = new Date(lastSeen);
        const now = new Date();
        // 5 minutes in milliseconds
        return (now - lastSeenDate) < (5 * 60 * 1000);
    };

    return (
        <aside className={`friends-bar ${isOpen ? "open" : "collapsed"}`}>
            <div className="friends-bar-header" onClick={() => !isOpen && setIsOpen(true)}>
                <div className="friends-bar-title-group">
                    <span className="friends-bar-dot"></span>
                    <span className="friends-bar-title">Friends</span>
                    {friends.length > 0 && <span className="friends-bar-count">{friends.length}</span>}
                </div>
            </div>

            <div className="friends-bar-body">
                <div className="friends-bar-search">
                    <div className="friends-bar-search-inner">
                        <svg className="friends-bar-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="11" cy="11" r="8"></circle>
                            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                        </svg>
                        <input 
                            type="text" 
                            placeholder="Search friends..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="friends-bar-content">
                    {loading ? (
                        <div className="friends-bar-status">
                            <div className="friends-loader"></div>
                        </div>
                    ) : filteredFriends.length === 0 ? (
                        <div className="friends-bar-status">
                            {searchTerm ? "No friends found" : "No friends yet"}
                        </div>
                    ) : (
                        <div className="friends-bar-list">
                            {filteredFriends.map(friend => {
                                const online = isUserOnline(friend.last_seen);
                                return (
                                    <Link 
                                        to={`/users/${friend.user_id}`} 
                                        key={friend.user_id} 
                                        className="friends-bar-item"
                                    >
                                        <div className="friends-bar-avatar-container">
                                            {friend.profile_picture ? (
                                                <img src={friend.profile_picture} alt="" className="friends-bar-avatar" />
                                            ) : (
                                                <div className="friends-bar-avatar-placeholder">
                                                    {(friend.full_name || friend.username || "?")[0].toUpperCase()}
                                                </div>
                                            )}
                                            <div className={`status-indicator ${online ? "online" : ""}`}></div>
                                        </div>
                                        <div className="friends-bar-info">
                                            <div className="friends-bar-name">{friend.full_name || friend.username}</div>
                                            <div className="friends-bar-handle">@{friend.username}</div>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </aside>
    );
};

export default FriendsBar;

