"use client";

import React, { useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  Settings,
  Lock,
  Save,
  CheckCircle2,
  AlertTriangle,
  Shield,
  Key,
} from "lucide-react";

export default function UniversitySettingsPage() {
  const { user } = useAuth();
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setMsg({ type: "error", text: "New passwords do not match." });
      return;
    }
    if (newPassword.length < 6) {
      setMsg({ type: "error", text: "Password must be at least 6 characters long." });
      return;
    }

    setSaving(true);
    setMsg(null);
    try {
      await api.post("/auth/change-password", {
        old_password: oldPassword,
        new_password: newPassword,
      });
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setMsg({ type: "success", text: "Password successfully updated!" });
    } catch (err: any) {
      setMsg({ type: "error", text: err?.message || "Failed to update password." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-12">
      <PageHeader
        title="Administrative Security & Account Settings"
        subtitle="Manage administrative credentials, security preferences, and institutional session controls."
      />

      {msg && (
        <div
          className={`p-4 rounded-[var(--radius-md)] text-xs flex items-center gap-2 ${
            msg.type === "success"
              ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
              : "bg-red-50 border border-red-200 text-red-700"
          }`}
        >
          {msg.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
          )}
          <span>{msg.text}</span>
        </div>
      )}

      {/* Account Info Card */}
      <div className="bg-[var(--surface-color)] p-6 rounded-[var(--radius-lg)] border border-[var(--border-color)] shadow-[var(--shadow-sm)] space-y-3">
        <h3 className="text-sm font-bold text-[var(--title-color)] flex items-center gap-2 border-b border-[var(--border-color)] pb-3">
          <Shield className="w-4 h-4 text-[#82c341]" />
          <span>
            {user?.role_name === "FACULTY" || user?.role_name === "TEACHER"
              ? "Faculty Profile & Academic Credentials"
              : user?.role_name === "HOD" || user?.role_name === "DEPARTMENT_ADMIN"
              ? "Department Chair Account"
              : "University Administrative Account"}
          </span>
        </h3>

        <div className="grid grid-cols-2 gap-4 text-xs pt-1">
          <div>
            <span className="text-[10px] text-[var(--paragraph-color)] uppercase font-bold block">
              {user?.role_name === "FACULTY" || user?.role_name === "TEACHER" ? "Faculty Member Name" : "Account Holder Name"}
            </span>
            <span className="font-bold text-[var(--title-color)] text-sm">{user?.full_name}</span>
          </div>
          <div>
            <span className="text-[10px] text-[var(--paragraph-color)] uppercase font-bold block">Official Email</span>
            <span className="font-mono text-[var(--title-color)]">{user?.email}</span>
          </div>
          <div>
            <span className="text-[10px] text-[var(--paragraph-color)] uppercase font-bold block">Administrative Role</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#82c341] text-black uppercase">
              {user?.role_name}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-[var(--paragraph-color)] uppercase font-bold block">Institution Context</span>
            <span className="font-bold text-[var(--title-color)]">{user?.organization_name || "Assigned University"}</span>
          </div>
        </div>
      </div>

      {/* Password Change Form */}
      <form
        onSubmit={handlePasswordChange}
        className="bg-[var(--surface-color)] p-6 rounded-[var(--radius-lg)] border border-[var(--border-color)] shadow-[var(--shadow-sm)] space-y-4"
      >
        <h3 className="text-sm font-bold text-[var(--title-color)] flex items-center gap-2 border-b border-[var(--border-color)] pb-3">
          <Key className="w-4 h-4 text-[var(--secondary-color)]" />
          <span>Update Security Password</span>
        </h3>

        <div className="space-y-3 text-xs">
          <div className="space-y-1">
            <label className="font-bold text-[var(--title-color)]">Current Password *</label>
            <input
              type="password"
              required
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              className="w-full px-3 py-2 border border-[var(--border-color)] rounded-[var(--radius-md)] bg-[var(--background-color)]"
            />
          </div>

          <div className="space-y-1">
            <label className="font-bold text-[var(--title-color)]">New Password *</label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 border border-[var(--border-color)] rounded-[var(--radius-md)] bg-[var(--background-color)]"
            />
          </div>

          <div className="space-y-1">
            <label className="font-bold text-[var(--title-color)]">Confirm New Password *</label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 border border-[var(--border-color)] rounded-[var(--radius-md)] bg-[var(--background-color)]"
            />
          </div>
        </div>

        <div className="flex items-center justify-end pt-3 border-t border-[var(--border-color)]">
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 bg-[#82c341] hover:bg-[#72b036] text-[#000000] text-xs font-black rounded-[var(--radius-md)] uppercase tracking-wider disabled:opacity-50 flex items-center gap-2"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? "Updating..." : "Update Password"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
