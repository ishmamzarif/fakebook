import React, { createContext, useContext, useState, useEffect } from "react";

const STORAGE_KEY = "fakebook_user";

const UserContext = createContext(null);

export function UserProvider({ children }) {
  const [currentUser, setCurrentUserState] = useState(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setCurrentUserState(JSON.parse(stored));
    } catch (_) {}
  }, []);

  const setCurrentUser = (user) => {
    setCurrentUserState(user);
    if (user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  return (
    <UserContext.Provider value={{ currentUser, setCurrentUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used within UserProvider");
  return ctx;
}
