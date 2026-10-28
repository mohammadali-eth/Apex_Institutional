"use client";

import React, { useEffect, useState, useRef } from "react";
import { api } from "@/lib/api";
import { UniversityTheme } from "@/lib/types";
import { useTheme, DEFAULT_THEME } from "@/lib/theme-context";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  Palette,
  Upload,
  RotateCcw,
  Save,
  CheckCircle2,
  AlertTriangle,
  Image as ImageIcon,
  Sparkles,
  Eye,
  FileText,
  School,
} from "lucide-react";

export default function UniversityBrandingPage() {
  const { theme, refreshTheme, applyLivePreview, resetToDefaultTheme } = useTheme();

  // Local theme form state
  const [formData, setFormData] = useState<UniversityTheme>(DEFAULT_THEME);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api
      .get<UniversityTheme>("/university-admin/branding")
      .then((data) => {
        if (data) {
          setFormData(data);
        }
      })
      .catch((err) => {
        console.error("Failed to load branding:", err);
        setMsg({ type: "error", text: "Failed to load branding settings." });
      })
      .finally(() => setLoading(false));
  }, []);

  const handleColorChange = (field: keyof UniversityTheme, value: string) => {
    const updated = { ...formData, [field]: value };
    setFormData(updated);
    applyLivePreview({ [field]: value });
  };

  const handleSaveTheme = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      const saved = await api.put<UniversityTheme>("/university-admin/branding", {
        primary_color: formData.primary_color,
        secondary_color: formData.secondary_color,
        background_color: formData.background_color,
        font_color: formData.font_color,
        title_color: formData.title_color,
        paragraph_color: formData.paragraph_color,
        bg_text_color: formData.bg_text_color,
        bg_title_color: formData.bg_title_color,
      });
      setFormData(saved);
      await refreshTheme();
      setMsg({ type: "success", text: "University theme and branding colors saved successfully!" });
    } catch (err: any) {
      setMsg({ type: "error", text: err?.message || "Failed to save theme." });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm("Reset theme back to default QPMS Apex colors?")) return;
    setSaving(true);
    setMsg(null);
    try {
      const res = await api.post<UniversityTheme>("/university-admin/branding/reset", {});
      setFormData(res);
      await refreshTheme();
      setMsg({ type: "success", text: "Theme reset to default QPMS colors." });
    } catch (err: any) {
      setMsg({ type: "error", text: err?.message || "Failed to reset theme." });
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingLogo(true);
    setMsg(null);
    const body = new FormData();
    body.append("file", file);

    try {
      const res = await api.upload<{ logo_url: string }>("/university-admin/branding/logo", body);
      setFormData((prev) => ({ ...prev, logo_url: res.logo_url }));
      await refreshTheme();
      setMsg({ type: "success", text: "University logo updated successfully!" });
    } catch (err: any) {
      setMsg({ type: "error", text: err?.message || "Failed to upload logo." });
    } finally {
      setUploadingLogo(false);
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  };

  const handleFaviconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFavicon(true);
    setMsg(null);
    const body = new FormData();
    body.append("file", file);

    try {
      const res = await api.upload<{ favicon_url: string }>("/university-admin/branding/favicon", body);
      setFormData((prev) => ({ ...prev, favicon_url: res.favicon_url }));
      await refreshTheme();
      setMsg({ type: "success", text: "Favicon updated successfully!" });
    } catch (err: any) {
      setMsg({ type: "error", text: err?.message || "Failed to upload favicon." });
    } finally {
      setUploadingFavicon(false);
      if (faviconInputRef.current) faviconInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <PageHeader
        title="University Branding & Visual Customization"
        subtitle="Customize institutional brand colors, upload logos and browser favicons, and inspect real-time preview."
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              disabled={saving}
              className="px-3.5 py-2 bg-[var(--surface-color)] hover:bg-[#dcdcdc]/40 text-[var(--title-color)] text-xs font-bold rounded-[var(--radius-md)] border border-[var(--border-color)] transition flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[var(--secondary-color)]" />
              <span>Reset to Defaults</span>
            </button>
            <button
              onClick={handleSaveTheme}
              disabled={saving}
              className="px-4 py-2 bg-[#82c341] hover:bg-[#72b036] text-[#000000] text-xs font-black rounded-[var(--radius-md)] shadow-[var(--shadow-sm)] transition flex items-center gap-1.5 uppercase tracking-wider disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? "Saving..." : "Save Branding"}</span>
            </button>
          </div>
        }
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

      {/* Two Column Layout: Controls & Live Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Branding Controls Form */}
        <div className="lg:col-span-7 space-y-6">
          {/* Logo & Favicon Upload Card */}
          <div className="bg-[var(--surface-color)] p-6 rounded-[var(--radius-lg)] border border-[var(--border-color)] shadow-[var(--shadow-sm)] space-y-4">
            <h3 className="text-sm font-bold text-[var(--title-color)] flex items-center gap-2 border-b border-[var(--border-color)] pb-3">
              <ImageIcon className="w-4 h-4 text-[#82c341]" />
              <span>Institutional Media Assets</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Logo Upload */}
              <div className="p-4 bg-[var(--background-color)] rounded-[var(--radius-md)] border border-[var(--border-color)] space-y-3 text-center">
                <span className="text-xs font-bold text-[var(--title-color)] block">University Logo</span>
                <div className="h-20 bg-[var(--surface-color)] rounded border border-dashed border-[var(--border-color)] flex items-center justify-center overflow-hidden p-2">
                  {formData.logo_url ? (
                    <img src={formData.logo_url} alt="Logo" className="max-h-full object-contain" />
                  ) : (
                    <School className="w-8 h-8 text-[var(--font-color)] opacity-40" />
                  )}
                </div>
                <input
                  type="file"
                  ref={logoInputRef}
                  onChange={handleLogoUpload}
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  className="hidden"
                />
                <button
                  type="button"
                  disabled={uploadingLogo}
                  onClick={() => logoInputRef.current?.click()}
                  className="px-3 py-1.5 bg-[#45525b] hover:bg-[#3c474f] text-white text-[11px] font-bold rounded w-full flex items-center justify-center gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{uploadingLogo ? "Uploading..." : "Upload Logo"}</span>
                </button>
              </div>

              {/* Favicon Upload */}
              <div className="p-4 bg-[var(--background-color)] rounded-[var(--radius-md)] border border-[var(--border-color)] space-y-3 text-center">
                <span className="text-xs font-bold text-[var(--title-color)] block">Browser Favicon</span>
                <div className="h-20 bg-[var(--surface-color)] rounded border border-dashed border-[var(--border-color)] flex items-center justify-center overflow-hidden p-2">
                  {formData.favicon_url ? (
                    <img src={formData.favicon_url} alt="Favicon" className="w-8 h-8 object-contain" />
                  ) : (
                    <Sparkles className="w-8 h-8 text-[var(--font-color)] opacity-40" />
                  )}
                </div>
                <input
                  type="file"
                  ref={faviconInputRef}
                  onChange={handleFaviconUpload}
                  accept="image/x-icon,image/png,image/svg+xml"
                  className="hidden"
                />
                <button
                  type="button"
                  disabled={uploadingFavicon}
                  onClick={() => faviconInputRef.current?.click()}
                  className="px-3 py-1.5 bg-[#45525b] hover:bg-[#3c474f] text-white text-[11px] font-bold rounded w-full flex items-center justify-center gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{uploadingFavicon ? "Uploading..." : "Upload Favicon"}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Color Customization Palette */}
          <div className="bg-[var(--surface-color)] p-6 rounded-[var(--radius-lg)] border border-[var(--border-color)] shadow-[var(--shadow-sm)] space-y-4">
            <h3 className="text-sm font-bold text-[var(--title-color)] flex items-center gap-2 border-b border-[var(--border-color)] pb-3">
              <Palette className="w-4 h-4 text-[#82c341]" />
              <span>Theme Color Customization</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              {/* Primary Color */}
              <div className="p-3 bg-[var(--background-color)] rounded-[var(--radius-md)] border border-[var(--border-color)] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[var(--title-color)]">Primary Color</span>
                  <span className="font-mono text-[11px] text-[var(--paragraph-color)] uppercase">
                    {formData.primary_color}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={formData.primary_color}
                    onChange={(e) => handleColorChange("primary_color", e.target.value)}
                    className="w-10 h-8 p-0 border border-[var(--border-color)] rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={formData.primary_color}
                    onChange={(e) => handleColorChange("primary_color", e.target.value)}
                    className="flex-1 px-2.5 py-1.5 text-xs font-mono border border-[var(--border-color)] rounded bg-[var(--surface-color)]"
                  />
                </div>
              </div>

              {/* Secondary Color */}
              <div className="p-3 bg-[var(--background-color)] rounded-[var(--radius-md)] border border-[var(--border-color)] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[var(--title-color)]">Secondary Color</span>
                  <span className="font-mono text-[11px] text-[var(--paragraph-color)] uppercase">
                    {formData.secondary_color}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={formData.secondary_color}
                    onChange={(e) => handleColorChange("secondary_color", e.target.value)}
                    className="w-10 h-8 p-0 border border-[var(--border-color)] rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={formData.secondary_color}
                    onChange={(e) => handleColorChange("secondary_color", e.target.value)}
                    className="flex-1 px-2.5 py-1.5 text-xs font-mono border border-[var(--border-color)] rounded bg-[var(--surface-color)]"
                  />
                </div>
              </div>

              {/* Background Color */}
              <div className="p-3 bg-[var(--background-color)] rounded-[var(--radius-md)] border border-[var(--border-color)] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[var(--title-color)]">Canvas Background</span>
                  <span className="font-mono text-[11px] text-[var(--paragraph-color)] uppercase">
                    {formData.background_color}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={formData.background_color}
                    onChange={(e) => handleColorChange("background_color", e.target.value)}
                    className="w-10 h-8 p-0 border border-[var(--border-color)] rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={formData.background_color}
                    onChange={(e) => handleColorChange("background_color", e.target.value)}
                    className="flex-1 px-2.5 py-1.5 text-xs font-mono border border-[var(--border-color)] rounded bg-[var(--surface-color)]"
                  />
                </div>
              </div>

              {/* Title / Heading Color */}
              <div className="p-3 bg-[var(--background-color)] rounded-[var(--radius-md)] border border-[var(--border-color)] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[var(--title-color)]">Headings & Titles</span>
                  <span className="font-mono text-[11px] text-[var(--paragraph-color)] uppercase">
                    {formData.title_color}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={formData.title_color}
                    onChange={(e) => handleColorChange("title_color", e.target.value)}
                    className="w-10 h-8 p-0 border border-[var(--border-color)] rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={formData.title_color}
                    onChange={(e) => handleColorChange("title_color", e.target.value)}
                    className="flex-1 px-2.5 py-1.5 text-xs font-mono border border-[var(--border-color)] rounded bg-[var(--surface-color)]"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Live UI Component Preview */}
        <div className="lg:col-span-5 space-y-4">
          <div className="sticky top-20 bg-[var(--surface-color)] p-6 rounded-[var(--radius-lg)] border border-[var(--border-color)] shadow-[var(--shadow-md)] space-y-4">
            <h3 className="text-sm font-bold text-[var(--title-color)] flex items-center gap-2 border-b border-[var(--border-color)] pb-3">
              <Eye className="w-4 h-4 text-[#82c341]" />
              <span>Real-Time Component Preview</span>
            </h3>

            {/* Simulated UI Card */}
            <div
              className="p-5 rounded-[var(--radius-md)] space-y-4 border"
              style={{
                backgroundColor: formData.background_color,
                borderColor: formData.bg_text_color,
              }}
            >
              <div className="flex items-center justify-between">
                <div
                  className="px-2.5 py-1 rounded text-xs font-bold"
                  style={{
                    backgroundColor: formData.primary_color,
                    color: "#000000",
                  }}
                >
                  EXAM BLUEPRINT
                </div>
                <span
                  className="text-xs font-bold"
                  style={{ color: formData.paragraph_color }}
                >
                  3 Hours &bull; 70 Marks
                </span>
              </div>

              <div>
                <h4
                  className="text-base font-extrabold"
                  style={{ color: formData.title_color }}
                >
                  Database Systems Examination
                </h4>
                <p
                  className="text-xs mt-1"
                  style={{ color: formData.paragraph_color }}
                >
                  Apex University Academic Assessment with dynamic styling applied.
                </p>
              </div>

              {/* Sample Buttons */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  className="px-3.5 py-2 text-xs font-bold rounded shadow-sm"
                  style={{
                    backgroundColor: formData.primary_color,
                    color: "#000000",
                  }}
                >
                  Primary Action
                </button>
                <button
                  type="button"
                  className="px-3.5 py-2 text-xs font-bold rounded text-white"
                  style={{
                    backgroundColor: formData.secondary_color,
                  }}
                >
                  Secondary Action
                </button>
              </div>
            </div>

            <p className="text-[11px] text-[var(--paragraph-color)] leading-relaxed">
              When you save your branding, all faculty, HODs, students, and exam controllers in your university will immediately experience your customized colors and institutional identity.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
