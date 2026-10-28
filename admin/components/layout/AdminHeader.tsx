"use client";

import React from "react";
import { Shield, Radio, Server } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export function AdminHeader() {
  const { user } = useAuth();

  return (
    <header className="h-16 bg-[var(--surface-color)] border-b border-[var(--border-color)] px-6 flex items-center justify-between shadow-[var(--shadow-sm)] sticky top-0 z-30 no-print">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-xs font-semibold px-2.5 py-1 bg-[#45525b]/10 text-[var(--title-color)] rounded border border-[var(--border-color)]">
          <Server className="w-3.5 h-3.5 text-[#82c341]" />
          <span>Platform Management Console</span>
        </div>
        <span className="hidden sm:inline-block text-xs text-[var(--muted-text-color)] font-medium">
          Root Tenant &bull; Super Admin Scope
        </span>
      </div>

      <div className="flex items-center gap-4">
        {/* Environment Indicator */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-[#eaf5de] border border-[#82c341] rounded-full text-xs font-semibold text-[#325816]">
          <span className="w-2 h-2 rounded-full bg-[#82c341] animate-pulse" />
          <span>PORT 3002 &bull; ISOLATED ADMIN</span>
        </div>

        {/* User Card */}
        <div className="flex items-center gap-2.5 pl-3 border-l border-[var(--border-color)]">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold text-[var(--title-color)] leading-tight">{user?.full_name || "Super Admin"}</p>
            <p className="text-[10px] text-[var(--muted-text-color)] font-mono">{user?.email || "apex@superadmin.com"}</p>
          </div>
          <div className="w-8 h-8 rounded-full bg-[#82c341] text-black font-bold text-xs flex items-center justify-center shadow-sm">
            {user?.full_name ? user.full_name.charAt(0).toUpperCase() : "A"}
          </div>
        </div>
      </div>
    </header>
  );
}
