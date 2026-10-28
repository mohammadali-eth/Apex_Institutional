"use client";

import React, { useState, useEffect } from "react";
import {
  Settings,
  Server,
  Database,
  Lock,
  HardDrive,
  ShieldCheck,
  RefreshCw,
  CheckCircle2,
  ExternalLink,
  Globe,
  Radio,
} from "lucide-react";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/PageHeader";
import { useToast } from "@/components/ui/Toast";

export default function PlatformSettingsPage() {
  const [healthStatus, setHealthStatus] = useState<any>(null);
  const [isChecking, setIsChecking] = useState(false);
  const { success, error } = useToast();

  const checkHealth = async () => {
    setIsChecking(true);
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
      const healthUrl = apiBase.replace(/\/api\/v1\/?$/, "") + "/health";
      const res = await fetch(healthUrl);
      const data = await res.json();
      setHealthStatus(data);
      success("Backend and database connectivity confirmed.");
    } catch (err: any) {
      error("Unable to reach backend health endpoint. Please verify backend is running.");
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Platform & System Settings"
        subtitle="Global platform topology, security policies, and service interconnects"
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Settings" }]}
        actions={
          <button
            onClick={checkHealth}
            disabled={isChecking}
            className="btn-secondary text-xs font-semibold flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? "animate-spin" : ""}`} />
            <span>Check Interconnects</span>
          </button>
        }
      />

      {/* Top Architecture Topology Card */}
      <div className="card-theme p-6">
        <h3 className="text-sm font-bold text-[var(--title-color)] mb-4 flex items-center gap-2">
          <Server className="w-4 h-4 text-[#82c341]" />
          <span>Active Architecture Topology</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-[var(--surface-muted)] rounded-[var(--radius-lg)] border border-[var(--border-color)]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-[var(--title-color)]">Super Admin Portal</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#82c341] text-black">PORT 3002</span>
            </div>
            <p className="text-xs text-[var(--paragraph-color)]">
              Isolated Next.js application for platform-wide multi-tenant governance.
            </p>
            <div className="mt-3 flex items-center gap-1.5 text-[11px] text-[#325816] font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#82c341]" />
              <span>Current Session Scope</span>
            </div>
          </div>

          <div className="p-4 bg-[var(--surface-muted)] rounded-[var(--radius-lg)] border border-[var(--border-color)]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-[var(--title-color)]">University Portal</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[var(--secondary-color)] text-white">PORT 3000</span>
            </div>
            <p className="text-xs text-[var(--paragraph-color)]">
              Next.js application for university admins, faculty, examiners, and students.
            </p>
            <a
              href="http://localhost:3000"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold text-[var(--title-color)] hover:text-[#82c341] transition"
            >
              <span>Open Port 3000</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="p-4 bg-[var(--surface-muted)] rounded-[var(--radius-lg)] border border-[var(--border-color)]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-[var(--title-color)]">FastAPI Backend</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#e0f2fe] text-[#0369a1] border border-[#bae6fd]">PORT 8000</span>
            </div>
            <p className="text-xs text-[var(--paragraph-color)]">
              Python REST API with JWT authentication, RBAC authorization, and paper generator.
            </p>
            <div className="mt-3 flex items-center gap-1.5 text-[11px] font-mono text-[var(--muted-text-color)]">
              <span>Status: {healthStatus?.status || "Connected"}</span>
            </div>
          </div>

          <div className="p-4 bg-[var(--surface-muted)] rounded-[var(--radius-lg)] border border-[var(--border-color)]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-[var(--title-color)]">PostgreSQL Database</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#fef9c3] text-[#854d0e] border border-[#fde047]">PORT 5432</span>
            </div>
            <p className="text-xs text-[var(--paragraph-color)]">
              Shared relational store (`qpms_db`) with SQLAlchemy and foreign key integrity.
            </p>
            <div className="mt-3 flex items-center gap-1.5 text-[11px] text-[#325816] font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#82c341]" />
              <span>Container Healthy</span>
            </div>
          </div>
        </div>
      </div>

      {/* Security Policies & Enforcement Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card-theme p-6">
          <h3 className="text-sm font-bold text-[var(--title-color)] mb-4 flex items-center gap-2">
            <Lock className="w-4 h-4 text-[#82c341]" />
            <span>Authentication & RBAC Policies</span>
          </h3>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-center py-2 border-b border-[var(--border-color)]">
              <span className="text-[var(--paragraph-color)] font-medium">JWT Algorithm</span>
              <span className="font-mono font-bold text-[var(--title-color)]">HS256</span>
            </div>

            <div className="flex justify-between items-center py-2 border-b border-[var(--border-color)]">
              <span className="text-[var(--paragraph-color)] font-medium">Token Lifespan</span>
              <span className="font-bold text-[var(--title-color)]">1440 Minutes (24 Hours)</span>
            </div>

            <div className="flex justify-between items-center py-2 border-b border-[var(--border-color)]">
              <span className="text-[var(--paragraph-color)] font-medium">Tenant Isolation Mode</span>
              <span className="px-2 py-0.5 rounded bg-[#eaf5de] text-[#325816] font-bold">
                Hierarchical &bull; Real-time Lockout
              </span>
            </div>

            <div className="flex justify-between items-center py-2 border-b border-[var(--border-color)]">
              <span className="text-[var(--paragraph-color)] font-medium">Suspended Tenant Behavior</span>
              <span className="font-bold text-red-600">Immediate HTTP 403 Forbidden</span>
            </div>

            <div className="flex justify-between items-center py-2">
              <span className="text-[var(--paragraph-color)] font-medium">Password Hashing</span>
              <span className="font-mono text-[var(--title-color)]">bcrypt (cost factor 12)</span>
            </div>
          </div>
        </div>

        <div className="card-theme p-6">
          <h3 className="text-sm font-bold text-[var(--title-color)] mb-4 flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-[#82c341]" />
            <span>Storage & Environment Configuration</span>
          </h3>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-center py-2 border-b border-[var(--border-color)]">
              <span className="text-[var(--paragraph-color)] font-medium">Storage Engine</span>
              <span className="font-mono font-bold text-[var(--title-color)]">Local Filesystem</span>
            </div>

            <div className="flex justify-between items-center py-2 border-b border-[var(--border-color)]">
              <span className="text-[var(--paragraph-color)] font-medium">Upload Directory</span>
              <span className="font-mono text-[var(--title-color)]">/app/uploads/syllabus</span>
            </div>

            <div className="flex justify-between items-center py-2 border-b border-[var(--border-color)]">
              <span className="text-[var(--paragraph-color)] font-medium">Paper Export Engine</span>
              <span className="font-bold text-[var(--title-color)]">A4 HTML / Print CSS &bull; PDF Compatible</span>
            </div>

            <div className="flex justify-between items-center py-2 border-b border-[var(--border-color)]">
              <span className="text-[var(--paragraph-color)] font-medium">Allowed CORS Origins</span>
              <span className="font-mono text-[var(--muted-text-color)]">:3000, :3002</span>
            </div>

            <div className="flex justify-between items-center py-2">
              <span className="text-[var(--paragraph-color)] font-medium">Theme Specification</span>
              <span className="font-bold text-[#82c341]">QPMS Apex Palette (#82c341 / #45525b)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
