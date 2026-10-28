"use client";

import React from "react";
import { useAuth } from "@/lib/auth-context";
import { Building, LogOut, Shield } from "lucide-react";

export function Navbar() {
  const { user, logout } = useAuth();

  return (
    <header className="h-16 bg-[var(--white-color)] border-b border-[var(--border-color)] px-6 flex items-center justify-between z-10 sticky top-0 no-print">
      {/* Affiliation / Institution Context */}
      <div className="flex items-center gap-3 pl-12 md:pl-0">
        <div className="flex items-center gap-2 text-xs text-[var(--title-color)] bg-[var(--surface-muted)] px-3 py-1.5 rounded-[var(--radius-md)] border border-[var(--border-color)] font-medium">
          <Building className="w-3.5 h-3.5 text-[#82c341]" />
          <span className="font-semibold text-[var(--title-color)]">{user?.organization_name || "Apex Central University"}</span>
          {user?.department_name && (
            <>
              <span className="text-[var(--border-color)] font-bold">|</span>
              <span className="text-[var(--paragraph-color)] truncate max-w-[200px] sm:max-w-none">{user.department_name}</span>
            </>
          )}
        </div>
      </div>

      {/* Right Controls: Role & User Info */}
      <div className="flex items-center gap-4">
        {/* Role Tag */}
        <div className="hidden sm:flex items-center gap-2">
          <span className="text-xs text-[var(--muted-text-color)] font-medium">Role:</span>
          <span className="text-xs px-2.5 py-0.5 rounded-[var(--radius-sm)] font-bold bg-[#eaf5de] text-[#3e681c] border border-[#82c341]/60 tracking-wider">
            {user?.role_name?.replace("_", " ")}
          </span>
        </div>

        {/* Separator */}
        <div className="h-5 w-px bg-[var(--border-color)] hidden sm:block" />

        {/* User Profile */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[var(--secondary-color)] text-[var(--white-color)] flex items-center justify-center font-bold text-xs shadow-sm">
            {user?.full_name ? user.full_name.charAt(0).toUpperCase() : "U"}
          </div>
          <div className="hidden md:block text-left">
            <p className="text-xs font-bold text-[var(--title-color)] leading-none">{user?.full_name}</p>
            <p className="text-[11px] text-[var(--muted-text-color)] mt-0.5 truncate max-w-[140px]">{user?.email}</p>
          </div>
          <button
            onClick={logout}
            className="p-1.5 text-[var(--muted-text-color)] hover:text-[#991b1b] hover:bg-[#fee2e2] rounded-[var(--radius-sm)] transition"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
