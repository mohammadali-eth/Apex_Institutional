"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Building2,
  Users,
  FileQuestion,
  FileCheck2,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  PlusCircle,
  Activity,
  Server,
  Database,
  ExternalLink,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/PageHeader";
import { UniversityStatusBadge } from "@/components/ui/Badge";
import { Organization } from "@/lib/types";

interface DashboardData {
  total_universities?: number;
  total_institutions?: number;
  total_departments?: number;
  total_programs?: number;
  total_users?: number;
  total_questions?: number;
  total_papers?: number;
  system_status?: string;
  recent_activity?: Array<{
    id: string;
    action: string;
    entity_type: string;
    user_email: string;
    created_at: string;
  }>;
}

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState<DashboardData | null>(null);
  const [universities, setUniversities] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [statsData, univData] = await Promise.all([
          api.get<DashboardData>("/dashboard/stats"),
          api.get<Organization[]>("/universities"),
        ]);
        setStats(statsData);
        setUniversities(Array.isArray(univData) ? univData : []);
      } catch (err) {
        console.error("Failed to load dashboard data", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const activeCount = universities.filter((u) => u.is_active).length;
  const suspendedCount = universities.filter((u) => !u.is_active).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-[#82c341] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Platform Governance & Control Plane"
        subtitle="Multi-Tenant Overseer • Super Admin Management Console (Port 3002)"
        actions={
          <div className="flex items-center gap-3">
            <Link href="/universities" className="btn-primary text-xs font-bold shadow-sm">
              <PlusCircle className="w-4 h-4" />
              <span>Manage Universities</span>
            </Link>
            <a
              href="http://localhost:3000"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary text-xs font-semibold"
            >
              <span>User Portal</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        }
      />

      {/* Top Notification / Banner */}
      <div className="card-theme p-4 bg-gradient-to-r from-[#45525b]/10 to-[#82c341]/10 border-l-4 border-l-[#82c341] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[#82c341] text-black">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-[var(--title-color)]">
              Multi-University Tenant Isolation Active
            </h4>
            <p className="text-xs text-[var(--paragraph-color)]">
              Universities suspended in this control plane are immediately locked out across all authentication and API endpoints.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-center">
          <span className="text-xs font-mono font-bold px-2.5 py-1 bg-white rounded border border-[var(--border-color)] text-[var(--title-color)]">
            Active: {activeCount} | Suspended: {suspendedCount}
          </span>
        </div>
      </div>

      {/* Primary KPI Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Universities */}
        <div className="card-theme p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[var(--font-color)] uppercase tracking-wider">Universities</span>
            <div className="p-2 rounded-lg bg-[#eaf5de] text-[#325816]">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-[var(--title-color)]">
              {stats?.total_universities ?? universities.length}
            </span>
            <span className="text-xs font-semibold text-[#325816] bg-[#eaf5de] px-1.5 py-0.5 rounded">
              {activeCount} active
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-[var(--paragraph-color)] pt-3 border-t border-[var(--border-color)]">
            <span>Suspended tenants:</span>
            <span className={`font-bold ${suspendedCount > 0 ? "text-red-600" : "text-[var(--title-color)]"}`}>
              {suspendedCount}
            </span>
          </div>
        </div>

        {/* Total Institutions */}
        <div className="card-theme p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[var(--font-color)] uppercase tracking-wider">Affiliated Institutions</span>
            <div className="p-2 rounded-lg bg-[#f6f6f7] text-[#45525b]">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-[var(--title-color)]">
              {stats?.total_institutions ?? 0}
            </span>
            <span className="text-xs text-[var(--muted-text-color)]">Colleges & Campus units</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-[var(--paragraph-color)] pt-3 border-t border-[var(--border-color)]">
            <span>Academic Departments:</span>
            <span className="font-bold text-[var(--title-color)]">{stats?.total_departments ?? 0}</span>
          </div>
        </div>

        {/* Total Users */}
        <div className="card-theme p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[var(--font-color)] uppercase tracking-wider">Platform Accounts</span>
            <div className="p-2 rounded-lg bg-[#e0f2fe] text-[#0369a1]">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-[var(--title-color)]">
              {stats?.total_users ?? 0}
            </span>
            <span className="text-xs text-[var(--muted-text-color)]">Users cross-tenant</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-[var(--paragraph-color)] pt-3 border-t border-[var(--border-color)]">
            <span>System RBAC:</span>
            <span className="font-bold text-[var(--title-color)]">6 Strict Roles</span>
          </div>
        </div>

        {/* Question Papers Generated */}
        <div className="card-theme p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[var(--font-color)] uppercase tracking-wider">Papers & Questions</span>
            <div className="p-2 rounded-lg bg-[#fef9c3] text-[#854d0e]">
              <FileCheck2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-[var(--title-color)]">
              {stats?.total_papers ?? 0}
            </span>
            <span className="text-xs text-[var(--muted-text-color)]">Papers generated</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-[var(--paragraph-color)] pt-3 border-t border-[var(--border-color)]">
            <span>Question Bank Size:</span>
            <span className="font-bold text-[var(--title-color)]">{stats?.total_questions ?? 0}</span>
          </div>
        </div>
      </div>

      {/* System Infrastructure Health Status */}
      <div className="card-theme p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#82c341]" />
            <h3 className="text-sm font-bold text-[var(--title-color)]">Infrastructure & Topology Status</h3>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#eaf5de] text-[#325816] border border-[#82c341]">
            Operational
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 bg-[var(--surface-muted)] rounded-[var(--radius-md)] border border-[var(--border-color)]">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-[var(--title-color)]">Backend API</span>
              <CheckCircle2 className="w-4 h-4 text-[#82c341]" />
            </div>
            <p className="text-[11px] font-mono text-[var(--muted-text-color)]">Port 8000 &bull; FastAPI</p>
          </div>

          <div className="p-3 bg-[var(--surface-muted)] rounded-[var(--radius-md)] border border-[var(--border-color)]">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-[var(--title-color)]">PostgreSQL DB</span>
              <CheckCircle2 className="w-4 h-4 text-[#82c341]" />
            </div>
            <p className="text-[11px] font-mono text-[var(--muted-text-color)]">Port 5432 &bull; qpms_db</p>
          </div>

          <div className="p-3 bg-[var(--surface-muted)] rounded-[var(--radius-md)] border border-[var(--border-color)]">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-[var(--title-color)]">University Portal</span>
              <CheckCircle2 className="w-4 h-4 text-[#82c341]" />
            </div>
            <p className="text-[11px] font-mono text-[var(--muted-text-color)]">Port 3000 &bull; Next.js</p>
          </div>

          <div className="p-3 bg-[var(--surface-muted)] rounded-[var(--radius-md)] border border-[var(--border-color)]">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-[var(--title-color)]">Super Admin Portal</span>
              <CheckCircle2 className="w-4 h-4 text-[#82c341]" />
            </div>
            <p className="text-[11px] font-mono text-[var(--muted-text-color)]">Port 3002 &bull; Control Plane</p>
          </div>
        </div>
      </div>

      {/* Main Two-Column Section: Universities List & Recent Audit */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Registered Universities */}
        <div className="lg:col-span-2 card-theme overflow-hidden">
          <div className="p-4 px-6 border-b border-[var(--border-color)] flex items-center justify-between bg-[var(--surface-muted)]">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[var(--title-color)]" />
              <h3 className="text-sm font-bold text-[var(--title-color)]">Tenant Universities</h3>
            </div>
            <Link
              href="/universities"
              className="text-xs font-bold text-[var(--title-color)] hover:text-[#82c341] transition flex items-center gap-1"
            >
              <span>View All ({universities.length})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-[var(--border-color)]">
            {universities.length === 0 ? (
              <div className="p-8 text-center text-sm text-[var(--muted-text-color)]">
                No universities registered yet.
              </div>
            ) : (
              universities.slice(0, 5).map((univ) => (
                <div
                  key={univ.id}
                  className="p-4 px-6 flex items-center justify-between hover:bg-[var(--surface-muted)]/50 transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-[var(--secondary-color)] text-[#82c341] font-bold text-xs flex items-center justify-center shrink-0">
                      {univ.code.substring(0, 3)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/universities/${univ.id}`}
                          className="text-sm font-bold text-[var(--title-color)] hover:underline"
                        >
                          {univ.name}
                        </Link>
                        <UniversityStatusBadge isActive={univ.is_active} />
                      </div>
                      <p className="text-xs text-[var(--muted-text-color)]">
                        Code: <span className="font-mono font-medium">{univ.code}</span> &bull; Type: {univ.type}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Link
                      href={`/universities/${univ.id}`}
                      className="btn-secondary text-xs py-1.5 px-3"
                    >
                      Manage
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Audit Activities */}
        <div className="card-theme overflow-hidden">
          <div className="p-4 px-5 border-b border-[var(--border-color)] flex items-center justify-between bg-[var(--surface-muted)]">
            <h3 className="text-sm font-bold text-[var(--title-color)]">Platform Audit Log</h3>
            <Link
              href="/audit"
              className="text-xs font-semibold text-[var(--muted-text-color)] hover:text-[var(--title-color)] transition"
            >
              Full Log
            </Link>
          </div>

          <div className="p-4 divide-y divide-[var(--border-color)]">
            {!stats?.recent_activity || stats.recent_activity.length === 0 ? (
              <p className="text-xs text-[var(--muted-text-color)] text-center py-4">No recent activity logged.</p>
            ) : (
              stats.recent_activity.slice(0, 6).map((log) => (
                <div key={log.id} className="py-2.5 first:pt-0 last:pb-0">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[var(--title-color)]">{log.action}</span>
                    <span className="text-[10px] text-[var(--muted-text-color)]">
                      {new Date(log.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-[var(--paragraph-color)] mt-0.5">
                    <span>{log.entity_type}</span>
                    <span className="font-mono text-[10px] text-[var(--muted-text-color)] truncate max-w-[120px]">
                      {log.user_email}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
