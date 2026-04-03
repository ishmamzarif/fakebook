import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useUser } from "./UserContext";

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { currentUser } = useUser();
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshUnreadCount = useCallback(async () => {
    if (!currentUser?.token) return;
    try {
      const res = await fetch("/api/v1/notifications/unread-count", {
        headers: { Authorization: `Bearer ${currentUser.token}` }
      });
      const data = await res.json();
      if (data.status === "success") {
        setUnreadCount(data.unreadCount);
      }
    } catch (err) {
      console.error("Failed to refresh unread count:", err);
    }
  }, [currentUser?.token]);

  useEffect(() => {
    refreshUnreadCount();
    // Poll every 30 seconds for new notifications
    const interval = setInterval(refreshUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [refreshUnreadCount]);

  return (
    <NotificationContext.Provider value={{ unreadCount, setUnreadCount, refreshUnreadCount }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationProvider");
  return ctx;
}
