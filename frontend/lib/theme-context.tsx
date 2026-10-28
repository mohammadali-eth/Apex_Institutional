"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { UniversityTheme } from "./types";
import { api } from "./api";
import { useAuth } from "./auth-context";

export const DEFAULT_THEME: UniversityTheme = {
  id: "default-theme",
  university_id: "default",
  primary_color: "#82c341",
  secondary_color: "#45525b",
  background_color: "#f3f3f3",
  font_color: "#838383",
  title_color: "#44535b",
  paragraph_color: "#676767",
  bg_text_color: "#dcdcdc",
  bg_title_color: "#f6f6f7",
  sidebar_style: "default",
  is_dark_mode_supported: false,
};

interface ThemeContextType {
  theme: UniversityTheme;
  isLoadingTheme: boolean;
  refreshTheme: (universityId?: string) => Promise<void>;
  applyLivePreview: (partialTheme: Partial<UniversityTheme>) => void;
  resetToDefaultTheme: (universityId?: string) => Promise<void>;
  saveTheme: (universityId: string, updatedTheme: Partial<UniversityTheme>) => Promise<UniversityTheme>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function applyCssVariablesToRoot(theme: UniversityTheme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  
  if (theme.primary_color) root.style.setProperty("--primary-color", theme.primary_color);
  if (theme.secondary_color) root.style.setProperty("--secondary-color", theme.secondary_color);
  if (theme.background_color) root.style.setProperty("--background-color", theme.background_color);
  if (theme.font_color) root.style.setProperty("--font-color", theme.font_color);
  if (theme.title_color) root.style.setProperty("--title-color", theme.title_color);
  if (theme.paragraph_color) root.style.setProperty("--paragraph-color", theme.paragraph_color);
  if (theme.bg_text_color) root.style.setProperty("--bg-text-color", theme.bg_text_color);
  if (theme.bg_title_color) root.style.setProperty("--bg-title-color", theme.bg_title_color);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [theme, setTheme] = useState<UniversityTheme>(DEFAULT_THEME);
  const [isLoadingTheme, setIsLoadingTheme] = useState<boolean>(true);

  const refreshTheme = useCallback(async (universityId?: string) => {
    try {
      const endpoint = universityId ? `/themes/current?university_id=${universityId}` : "/themes/current";
      const fetched = await api.get<UniversityTheme>(endpoint);
      if (fetched && fetched.primary_color) {
        setTheme(fetched);
        applyCssVariablesToRoot(fetched);
      }
    } catch {
      applyCssVariablesToRoot(DEFAULT_THEME);
    } finally {
      setIsLoadingTheme(false);
    }
  }, []);

  useEffect(() => {
    if (user?.organization_id) {
      refreshTheme(user.organization_id);
    } else {
      refreshTheme();
    }
  }, [user, refreshTheme]);

  const applyLivePreview = (partialTheme: Partial<UniversityTheme>) => {
    const merged = { ...theme, ...partialTheme };
    setTheme(merged);
    applyCssVariablesToRoot(merged);
  };

  const resetToDefaultTheme = async (universityId?: string) => {
    if (universityId && universityId !== "default") {
      try {
        const resetResult = await api.post<UniversityTheme>(`/themes/${universityId}/reset`, {});
        setTheme(resetResult);
        applyCssVariablesToRoot(resetResult);
        return;
      } catch (e) {
        console.error("Failed to reset university theme on backend", e);
      }
    }
    setTheme(DEFAULT_THEME);
    applyCssVariablesToRoot(DEFAULT_THEME);
  };

  const saveTheme = async (universityId: string, updatedTheme: Partial<UniversityTheme>): Promise<UniversityTheme> => {
    const saved = await api.put<UniversityTheme>(`/themes/${universityId}`, updatedTheme);
    setTheme(saved);
    applyCssVariablesToRoot(saved);
    return saved;
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        isLoadingTheme,
        refreshTheme,
        applyLivePreview,
        resetToDefaultTheme,
        saveTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useUniversityTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useUniversityTheme must be used within a ThemeProvider");
  }
  return ctx;
}

export const useTheme = useUniversityTheme;
