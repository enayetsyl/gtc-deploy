"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api, setOnUnauthorized } from "@/lib/axios";

export type Role = "ADMIN" | "SECTOR_OWNER" | "GTC_POINT" | "EXTERNAL";
export type User = { id: string; name: string; email: string; role: Role };

type AuthState = {
  user: User | null;
  token: string | null;
};
type AuthCtx = {
  user: User | null;
  token: string | null;
  isAuthed: boolean;
  login: (data: { token: string; user: User }) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthCtx | null>(null);

const STORAGE_KEY = "gtc_auth";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [{ user, token }, setState] = useState<AuthState>({ user: null, token: null });

  // load from storage on first mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: AuthState = JSON.parse(raw);
        setState(parsed);
        if (parsed.token) {
          api.defaults.headers.common.Authorization = `Bearer ${parsed.token}`;
        }
      }
    } catch {}
  }, []);

  // global 401 handler
  useEffect(() => {
    setOnUnauthorized(() => logout);
  }, []);

  const login = (data: { token: string; user: User }) => {
    setState({ user: data.user, token: data.token });
    api.defaults.headers.common.Authorization = `Bearer ${data.token}`;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ user: data.user, token: data.token }));
  };

  const logout = () => {
    setState({ user: null, token: null });
    delete api.defaults.headers.common.Authorization;
    localStorage.removeItem(STORAGE_KEY);
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  };

  const value = useMemo<AuthCtx>(
    () => ({ user, token, isAuthed: Boolean(user && token), login, logout }),
    [user, token]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
