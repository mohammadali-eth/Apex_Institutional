"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  ShieldCheck,
  Search,
  Clock,
  User,
  Filter,
} from "lucide-react";

interface AuditItem {
  id: string;
  action: string;
  entity_type: string;
  entity_id?: string | null;
  ip_address?: string | null;
  user_email: string;
  user_name: string;
  created_at: string;
}

export default function UniversityAuditLogsPage() {
  const [logs, setLogs] = useState<AuditItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    api
      .get<AuditItem[]>("/university-admin/audit")
      .then((data) => setLogs(data || []))
      .catch((err) => console.error("Error loading audit stream:", err))
      .finally(() => setLoading(false));
  }, []);

  const filteredLogs = logs.filter((l) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      l.action.toLowerCase().includes(q) ||
      l.entity_type.toLowerCase().includes(q) ||
      l.user_email.toLowerCase().includes(q) ||
      l.user_name.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="University Security & Audit Logs"
        subtitle="Immutable audit trail of administrative activities, account provisioning, and examination lifecycle events for your institution."
      />

      {/* Search Filter */}
      <div className="flex items-center gap-3 bg-[var(--surface-color)] p-3 rounded-[var(--radius-lg)] border border-[var(--border-color)]">
        <Search className="w-4 h-4 text-[var(--font-color)] shrink-0" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by action name, actor email, or entity type..."
          className="bg-transparent text-xs w-full text-[var(--title-color)] placeholder:text-[var(--font-color)] focus:outline-none"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="text-xs text-[var(--paragraph-color)] hover:text-[var(--title-color)] px-2"
          >
            Clear
          </button>
        )}
      </div>

      {/* Audit Table */}
      <div className="bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] overflow-hidden shadow-[var(--shadow-sm)]">
        {loading ? (
          <div className="p-8 space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 bg-[var(--background-color)] rounded animate-pulse" />
            ))}
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <ShieldCheck className="w-8 h-8 text-[var(--font-color)] mx-auto opacity-40" />
            <p className="text-xs font-bold text-[var(--title-color)]">No Audit Records Found</p>
            <p className="text-[11px] text-[var(--paragraph-color)]">
              {search ? "No events match the search filter." : "Audit events will appear as administrative actions occur."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#45525b] text-white uppercase text-[10px] font-bold tracking-wider">
                <tr>
                  <th className="py-3 px-4">Action Event</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Entity Type</th>
                  <th className="py-3 px-4">IP Address</th>
                  <th className="py-3 px-4 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)] font-mono text-[11px]">
                {filteredLogs.map((l) => (
                  <tr key={l.id} className="hover:bg-[var(--background-color)]/50 transition">
                    <td className="py-3 px-4 font-bold text-[#82c341]">
                      {l.action}
                    </td>
                    <td className="py-3 px-4 text-[var(--title-color)] font-sans">
                      <div className="font-bold">{l.user_name}</div>
                      <div className="text-[10px] text-[var(--paragraph-color)] font-mono">{l.user_email}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#dcdcdc]/40 text-[var(--title-color)]">
                        {l.entity_type}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[var(--paragraph-color)]">
                      {l.ip_address || "127.0.0.1"}
                    </td>
                    <td className="py-3 px-4 text-right text-[var(--paragraph-color)]">
                      {new Date(l.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
