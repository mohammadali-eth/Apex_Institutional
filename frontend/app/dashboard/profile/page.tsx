"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Organization } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  School,
  Globe,
  MapPin,
  Save,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Calendar,
  Layers,
} from "lucide-react";

export default function UniversityProfilePage() {
  const [profile, setProfile] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [address, setAddress] = useState("");
  const [logoUrl, setLogoUrl] = useState("");

  useEffect(() => {
    api
      .get<Organization>("/university-admin/profile")
      .then((data) => {
        setProfile(data);
        setName(data.name || "");
        setWebsite(data.website || "");
        setAddress(data.address || "");
        setLogoUrl(data.logo_url || "");
      })
      .catch((err) => {
        console.error("Failed to load profile:", err);
        setErrorMsg("Failed to load university profile details.");
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const updated = await api.patch<Organization>("/university-admin/profile", {
        name: name.trim(),
        website: website.trim(),
        address: address.trim(),
        logo_url: logoUrl.trim() || null,
      });
      setProfile(updated);
      setSuccessMsg("University profile updated successfully!");
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      console.error("Update error:", err);
      setErrorMsg(err?.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="h-28 bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] animate-pulse" />
        <div className="h-80 bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <PageHeader
        title="University Profile & Institutional Identity"
        subtitle="Manage official institutional credentials, contact records, physical campus address, and official web portals."
      />

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-[var(--radius-md)] text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-[var(--radius-md)] text-xs text-red-700 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* University Identity Overview Card */}
      <div className="bg-[#45525b] text-white p-6 rounded-[var(--radius-lg)] border border-[#3c474f] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-[var(--radius-md)] bg-[#82c341] text-black font-black text-xl flex items-center justify-center shrink-0">
            {profile?.code?.substring(0, 2) || "U"}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-[#82c341] uppercase tracking-wider">
                CODE: {profile?.code}
              </span>
              <span className="text-xs text-white/60">&bull;</span>
              <span className="text-xs text-white/80">{profile?.type}</span>
            </div>
            <h2 className="text-xl font-bold text-white mt-0.5">{profile?.name}</h2>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs text-white/80 border-t sm:border-t-0 pt-3 sm:pt-0 border-white/10">
          <div className="text-center px-3 py-1 bg-white/10 rounded">
            <span className="block text-[10px] text-[#82c341] font-bold uppercase">Departments</span>
            <span className="text-sm font-extrabold text-white">{profile?.departments_count || 0}</span>
          </div>
          <div className="text-center px-3 py-1 bg-white/10 rounded">
            <span className="block text-[10px] text-[#82c341] font-bold uppercase">Institutions</span>
            <span className="text-sm font-extrabold text-white">{profile?.institutions_count || 0}</span>
          </div>
        </div>
      </div>

      {/* Profile Form */}
      <form onSubmit={handleSave} className="bg-[var(--surface-color)] p-6 sm:p-8 rounded-[var(--radius-lg)] border border-[var(--border-color)] shadow-[var(--shadow-sm)] space-y-6">
        <h3 className="text-sm font-bold text-[var(--title-color)] border-b border-[var(--border-color)] pb-3 flex items-center gap-2">
          <School className="w-4 h-4 text-[#82c341]" />
          <span>Official Institutional Information</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1 sm:col-span-2">
            <label className="text-xs font-bold text-[var(--title-color)]">
              Official University Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-[var(--border-color)] rounded-[var(--radius-md)] bg-[var(--background-color)] text-[var(--title-color)] focus:outline-none focus:border-[#82c341]"
              placeholder="e.g. Apex Central University"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-[var(--title-color)]">
              University Code (System Identifier)
            </label>
            <input
              type="text"
              disabled
              value={profile?.code || ""}
              className="w-full px-3 py-2 text-xs border border-[var(--border-color)] rounded-[var(--radius-md)] bg-[#dcdcdc]/40 text-[var(--paragraph-color)] cursor-not-allowed font-mono"
            />
            <p className="text-[10px] text-[var(--font-color)]">
              Institutional code is fixed to protect foreign key relationships and academic integrity.
            </p>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-[var(--title-color)]">
              Official Website URL
            </label>
            <input
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-[var(--border-color)] rounded-[var(--radius-md)] bg-[var(--background-color)] text-[var(--title-color)] focus:outline-none focus:border-[#82c341]"
              placeholder="https://university.edu.in"
            />
          </div>

          <div className="space-y-1 sm:col-span-2">
            <label className="text-xs font-bold text-[var(--title-color)]">
              Campus Physical Address
            </label>
            <textarea
              rows={3}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-[var(--border-color)] rounded-[var(--radius-md)] bg-[var(--background-color)] text-[var(--title-color)] focus:outline-none focus:border-[#82c341]"
              placeholder="Enter complete campus address, city, state, postal code..."
            />
          </div>
        </div>

        <div className="flex items-center justify-end pt-4 border-t border-[var(--border-color)]">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-[#82c341] hover:bg-[#72b036] text-[#000000] text-xs font-black rounded-[var(--radius-md)] shadow-sm transition flex items-center gap-2 disabled:opacity-50 uppercase tracking-wider"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? "Saving Changes..." : "Save Profile"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
