import React, { createContext, useContext, useEffect, useState } from "react";
import { api } from "../lib/api.js";
import { connectSocket, disconnectSocket } from "../lib/socket.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [ready, setReady] = useState(false);

  // Restore session on page load.
  useEffect(() => {
    const saved = localStorage.getItem("rtc-auth");
    if (saved) {
      const parsed = JSON.parse(saved);
      setUser(parsed.user);
      setToken(parsed.token);
      connectSocket(parsed.token);
    }
    setReady(true);
  }, []);

  function persist(nextUser, nextToken) {
    setUser(nextUser);
    setToken(nextToken);
    localStorage.setItem("rtc-auth", JSON.stringify({ user: nextUser, token: nextToken }));
    connectSocket(nextToken);
  }

  async function login(email, password) {
    const data = await api.login(email, password);
    persist(data.user, data.token);
  }

  async function register(name, email, password) {
    const data = await api.register(name, email, password);
    persist(data.user, data.token);
  }

  function logout() {
    setUser(null);
    setToken(null);
    localStorage.removeItem("rtc-auth");
    disconnectSocket();
  }

  return (
    <AuthContext.Provider value={{ user, token, ready, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
