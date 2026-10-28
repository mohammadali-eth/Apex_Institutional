"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { User } from "./types";
import { api, ApiError } from "./api";

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isSuperAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const storedToken = localStorage.getItem("qpms_superadmin_token") || localStorage.getItem("qpms_token");
    if (storedToken) {
      setToken(storedToken);
      api
        .get<User>("/auth/me")
        .then((userData) => {
          if (userData.role_name !== "SUPER_ADMIN") {
            // Non-super-admin user attempting to access super admin portal
            setUser(userData);
            if (typeof window !== "undefined" && !window.location.pathname.includes("/access-denied")) {
              window.location.href = "/access-denied";
            }
          } else {
            setUser(userData);
          }
        })
        .catch(() => {
          localStorage.removeItem("qpms_superadmin_token");
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

      if (data.user.role_name !== "SUPER_ADMIN") {
        // Not a super admin! Store user for access-denied screen info and redirect
        setUser(data.user);
        localStorage.setItem("qpms_token", data.access_token);
        if (typeof window !== "undefined") {
          window.location.href = "/access-denied";
        }
        throw new ApiError("Access Denied: This portal is reserved exclusively for Platform Super Administrators.", 403, "FORBIDDEN");
      }

      localStorage.setItem("qpms_superadmin_token", data.access_token);
      localStorage.setItem("qpms_token", data.access_token);
      setToken(data.access_token);
      setUser(data.user);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    api.post("/auth/logout").catch(() => {});
    localStorage.removeItem("qpms_superadmin_token");
    localStorage.removeItem("qpms_token");
    setToken(null);
    setUser(null);
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  };

  const isSuperAdmin = user?.role_name === "SUPER_ADMIN";

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        logout,
        isSuperAdmin,
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
