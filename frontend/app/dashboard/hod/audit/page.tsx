"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  ShieldCheck,
  Search,
  Filter,
  Clock,
  User,
  Activity,
  Calendar,
} from "lucide-react";

interface AuditLogItem {
  id: string;
  action: string;
  entity_type: string;
  entity_id?: string | null;
  user_id?: string | null;
  user_email: string;
  user_name: string;
  metadata?: any;
  ip_address?: string | null;
  created_at: string;
}

export default function HODAuditPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterAction, setFilterAction] = useState("ALL");

  useEffect(() => {
    setLoading(true);
    api
      .get<AuditLogItem[]>("/hod/audit")
      .then((data) => setLogs(data || []))
      .catch((err) => console.error("Error loading department audit logs:", err))
      .finally(() => setLoading(false));
  }, []);

  const filteredLogs = logs.filter((l) => {
    const matchesSearch =
      l.action.toLowerCase().includes(search.toLowerCase()) ||
      l.user_name.toLowerCase().includes(search.toLowerCase()) ||
      l.user_email.toLowerCase().includes(search.toLowerCase()) ||
      l.entity_type.toLowerCase().includes(search.toLowerCase());

    if (filterAction === "ALL") return matchesSearch;
    return matchesSearch && l.action.includes(filterAction);
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Department Audit Trail & Governance"
        subtitle="Complete chronological timeline of curricular revisions, moderation decisions, reviewer assignments, and user provisioning."
      />

      {/* Filter and Search Bar */}
      <div className="bg-[var(--surface-color)] p-4 rounded-[var(--radius-lg)] border border-[var(--border-color)] flex flex-col sm:flex-row gap-3 items-center justify-between shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--font-color)]" />
          <input
            type="text"
            placeholder="Search by action, user, or entity..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--background-color)] focus:outline-none focus:border-[#82c341]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="w-full sm:w-48 px-3 py-2 text-xs rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--background-color)] focus:outline-none focus:border-[#82c341]"
          >
            <option value="ALL">All Event Types</option>
            <option value="QUESTION">Question Bank Actions</option>
            <option value="PAPER">Question Paper Actions</option>
            <option value="SYLLABUS">Syllabus Updates</option>
            <option value="FACULTY">Faculty & Users</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#45525b] text-white border-b border-[#3c474f]">
                <th className="py-3 px-4 font-bold uppercase tracking-wider text-[11px]">Timestamp</th>
                <th className="py-3 px-4 font-bold uppercase tracking-wider text-[11px]">Actor</th>
                <th className="py-3 px-4 font-bold uppercase tracking-wider text-[11px]">Action Executed</th>
                <th className="py-3 px-4 font-bold uppercase tracking-wider text-[11px]">Entity Type</th>
                <th className="py-3 px-4 font-bold uppercase tracking-wider text-[11px]">Metadata / Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-[var(--font-color)]">
                    Loading audit trail events...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-[var(--font-color)]">
                    No departmental audit records found matching the query.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-[var(--background-color)]/60 transition">
                    <td className="py-3 px-4 font-mono text-[11px] text-[var(--font-color)] whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString([], {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-[var(--title-color)]">{log.user_name || "System"}</div>
                      <div className="text-[10px] text-[var(--font-color)] font-mono">{log.user_email}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono font-bold text-[11px] text-[#45525b] bg-[#45525b]/10 px-2 py-0.5 rounded">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-[var(--paragraph-color)]">
                      {log.entity_type}
                    </td>
                    <td className="py-3 px-4 text-[var(--font-color)] font-mono text-[10px] max-w-xs truncate">
                      {log.metadata ? JSON.stringify(log.metadata) : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
