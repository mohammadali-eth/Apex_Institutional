"use client";

import React from "react";
import Link from "next/link";
import { ShieldAlert, ExternalLink, LogOut, ArrowLeft } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export default function AccessDeniedPage() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-[var(--background-color)] flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full card-theme p-8 text-center shadow-lg border border-[var(--border-color)]">
        <div className="mx-auto w-16 h-16 rounded-full bg-[#fee2e2] border-2 border-[#ef4444] flex items-center justify-center text-[#b91c1c] mb-5 shadow-sm">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <h1 className="text-2xl font-black text-[var(--title-color)]">
          Super Admin Access Required
        </h1>

        <div className="inline-block mt-2 px-3 py-1 bg-[#fee2e2] text-[#991b1b] rounded-full text-xs font-bold border border-[#fecaca]">
          PORT 3002 &bull; ISOLATED CONTROL PLANE
        </div>

        <p className="mt-4 text-sm text-[var(--paragraph-color)] leading-relaxed">
          The port 3002 administrative application is strictly restricted to{" "}
          <strong className="text-[var(--title-color)]">Platform Super Administrators</strong>.
        </p>

        {user && (
          <div className="mt-4 p-3 bg-[var(--surface-muted)] rounded-[var(--radius-md)] border border-[var(--border-color)] text-xs text-left">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[var(--muted-text-color)] font-medium">Logged in as:</span>
              <span className="font-bold text-[var(--title-color)] truncate max-w-[200px]">{user.email}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[var(--muted-text-color)] font-medium">Current Role:</span>
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#f6f6f7] text-[#45525b] border border-[#dcdcdc]">
                {user.role_name}
              </span>
            </div>
          </div>
        )}

        <div className="mt-6 space-y-3">
          <a
            href="http://localhost:3000"
            className="btn-primary w-full py-2.5 text-sm font-bold shadow flex items-center justify-center gap-2"
          >
            <span>Open University Portal (Port 3000)</span>
            <ExternalLink className="w-4 h-4" />
          </a>

          <button
            onClick={logout}
            className="btn-secondary w-full py-2 text-xs font-semibold flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4 text-[#838383]" />
            <span>Sign In with Super Admin Credentials</span>
          </button>
        </div>

        <p className="mt-6 text-[11px] text-[var(--muted-text-color)]">
          Need Super Admin access? Contact your university IT infrastructure team.
        </p>
      </div>
    </div>
  );
}
