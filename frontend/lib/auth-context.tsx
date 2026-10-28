"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { User } from "./types";
import { api } from "./api";

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
  hasPermission: (perm: string) => boolean;
  hasRole: (roles: string[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const storedToken = localStorage.getItem("qpms_token");
    if (storedToken) {
      setToken(storedToken);
      api
        .get<User>("/auth/me")
        .then((userData) => {
          setUser(userData);
        })
        .catch(() => {
          localStorage.removeItem("qpms_token");
          setToken(null);
          setUser(null);
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const data = await api.post<{ access_token: string; user: User }>("/auth/login", {
        email,
        password,
      });
      localStorage.setItem("qpms_token", data.access_token);
      setToken(data.access_token);
      setUser(data.user);
      return data.user;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    api.post("/auth/logout").catch(() => {});
    localStorage.removeItem("qpms_token");
    setToken(null);
    setUser(null);
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  };

  const hasPermission = (perm: string): boolean => {
    if (!user) return false;
    if (user.role_name === "SUPER_ADMIN") return true;
    return user.permissions?.includes(perm) || false;
  };

  const hasRole = (roles: string[]): boolean => {
    if (!user) return false;
    if (user.role_name === "SUPER_ADMIN") return true;
    return roles.includes(user.role_name);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        logout,
        hasPermission,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
