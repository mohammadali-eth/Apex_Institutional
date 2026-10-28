"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ShieldAlert,
  Building2,
  Users,
  FileText,
  Settings,
  LogOut,
  ExternalLink,
  LayoutDashboard,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export function AdminSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const navigation = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
      active: pathname === "/" || pathname === "/dashboard",
    },
    {
      name: "Universities",
      href: "/universities",
      icon: Building2,
      active: pathname.startsWith("/universities"),
    },
    {
      name: "Platform Users",
      href: "/users",
      icon: Users,
      active: pathname.startsWith("/users"),
    },
    {
      name: "Platform Audit",
      href: "/audit",
      icon: FileText,
      active: pathname.startsWith("/audit"),
    },
    {
      name: "System Settings",
      href: "/settings",
      icon: Settings,
      active: pathname.startsWith("/settings"),
    },
  ];

  return (
    <aside className="w-64 bg-[var(--secondary-color)] text-white flex flex-col shrink-0 min-h-screen select-none border-r border-[#39444c] no-print">
      {/* Brand Header */}
      <div className="h-16 flex items-center gap-3 px-6 border-b border-[#39444c] bg-[#39444c]/30">
        <div className="w-9 h-9 rounded-lg bg-[#82c341] flex items-center justify-center text-black font-black text-xl shadow-sm">
          Ω
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-sm tracking-wide text-white flex items-center gap-1.5">
            QPMS APEX
            <span className="text-[10px] bg-[#82c341] text-black font-bold px-1.5 py-0.2 rounded">SUPER</span>
          </span>
          <span className="text-[11px] text-[#dce1e4] font-medium">Control Plane (Port 3002)</span>
        </div>
      </div>

      {/* Nav List */}
      <div className="flex-1 py-5 px-3 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-bold tracking-wider text-[#dce1e4]/70 uppercase">
          Platform Administration
        </div>

        {navigation.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-[var(--radius-md)] text-sm font-medium transition-colors ${
                item.active
                  ? "bg-[#82c341] text-black font-semibold shadow-sm"
                  : "text-[#dce1e4] hover:bg-white/10 hover:text-white"
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${item.active ? "text-black" : "text-[#dce1e4]"}`} />
              <span>{item.name}</span>
            </Link>
          );
        })}

        <div className="pt-6 px-3 pb-2 text-[10px] font-bold tracking-wider text-[#dce1e4]/70 uppercase">
          External Portals
        </div>

        <a
          href="http://localhost:3000"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between px-3.5 py-2.5 rounded-[var(--radius-md)] text-sm font-medium text-[#dce1e4] hover:bg-white/10 hover:text-white transition-colors border border-white/10"
        >
          <div className="flex items-center gap-2.5">
            <ExternalLink className="w-4 h-4 text-[#82c341]" />
            <span>University Portal</span>
          </div>
          <span className="text-[10px] bg-white/15 px-1.5 py-0.5 rounded text-white/80 font-mono">:3000</span>
        </a>
      </div>

      {/* User Info & Logout Footer */}
      <div className="p-4 border-t border-[#39444c] bg-[#39444c]/20">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-[#82c341]/20 border border-[#82c341] text-[#82c341] flex items-center justify-center font-bold text-xs">
            {user?.full_name ? user.full_name.charAt(0).toUpperCase() : "SA"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate">{user?.full_name || "Super Admin"}</p>
            <div className="flex items-center gap-1 text-[11px] text-[#82c341]">
              <ShieldCheck className="w-3 h-3" />
              <span className="font-mono">SUPER_ADMIN</span>
            </div>
          </div>
        </div>

        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-white/90 hover:text-white bg-white/10 hover:bg-red-600/80 rounded-[var(--radius-md)] transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
