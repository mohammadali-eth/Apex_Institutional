"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { ControllerAuditLogItem } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import {
  ShieldCheck,
  Search,
  Filter,
  RefreshCw,
  Clock,
  User,
  Eye,
  Lock,
  CalendarDays,
  FileCheck,
  Send,
  X,
} from "lucide-react";

export default function ControllerAuditPage() {
  const [logs, setLogs] = useState<ControllerAuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedLog, setSelectedLog] = useState<ControllerAuditLogItem | null>(null);

  const fetchLogs = () => {
    setLoading(true);
    api
      .get<ControllerAuditLogItem[]>("/controller/audit-logs?limit=100")
      .then((data) => setLogs(data || []))
      .catch((err) => console.error("Error loading audit logs:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter((l) => {
    if (search.trim()) {
      const q = search.toLowerCase();
      const match =
        l.action.toLowerCase().includes(q) ||
        (l.entity_name && l.entity_name.toLowerCase().includes(q)) ||
        (l.user_name && l.user_name.toLowerCase().includes(q)) ||
        (l.user_email && l.user_email.toLowerCase().includes(q)) ||
        (l.details && l.details.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Security & Governance Audit Trail"
        description="Immutable system-wide event trail. Inspect question paper approvals, tamper-evident finalization events, release dispatches, and coordinator authorizations."
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchLogs()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--surface-color)] text-[var(--font-color)] hover:text-[var(--title-color)] transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh Log</span>
            </button>
          </div>
        }
      />

      {/* Security Status Box */}
      <div className="p-4 bg-[var(--surface-color)] border border-[var(--border-color)] rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)] flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-[var(--radius-md)] bg-[#82c341]/15 text-[#45525b] flex items-center justify-center">
            <ShieldCheck className="w-4 h-4 text-[#45525b]" />
          </div>
          <div>
            <h4 className="font-bold text-[var(--title-color)]">Tamper-Proof Audit Logging Active</h4>
            <p className="text-[11px] text-[var(--font-color)] mt-0.5">
              All governance actions are timestamped in UTC with user actor identification and cryptographic snapshot hashes.
            </p>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="p-4 bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] shadow-[var(--shadow-sm)] flex items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--font-color)]" />
          <input
            type="text"
            placeholder="Search audit trail by action, user, or entity..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--background-color)] text-[var(--title-color)] focus:outline-none focus:border-[#82c341]"
          />
        </div>
        <div className="text-xs text-[var(--font-color)]">
          Total records: <span className="font-bold text-[var(--title-color)]">{filteredLogs.length}</span>
        </div>
      </div>

      {/* Audit Log Table */}
      {loading ? (
        <div className="p-8 text-center bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)]">
          <div className="w-8 h-8 border-2 border-[#82c341] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-[var(--font-color)]">Loading security audit records...</p>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="p-12 text-center bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)]">
          <ShieldCheck className="w-10 h-10 text-[var(--font-color)] mx-auto mb-3 opacity-40" />
          <h3 className="text-sm font-bold text-[var(--title-color)] mb-1">No Audit Records Found</h3>
          <p className="text-xs text-[var(--font-color)]">No actions match your search query.</p>
        </div>
      ) : (
        <div className="bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] overflow-hidden shadow-[var(--shadow-sm)]">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[var(--border-color)] bg-[var(--background-color)] text-[var(--font-color)] font-semibold">
                  <th className="p-3.5">Action</th>
                  <th className="p-3.5">Target Entity</th>
                  <th className="p-3.5">Actor User</th>
                  <th className="p-3.5">Timestamp</th>
                  <th className="p-3.5 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-[var(--background-color)]/50 transition">
                    <td className="p-3.5">
                      <Badge
                        variant={
                          log.action.includes("APPROVED") || log.action.includes("FINALIZED")
                            ? "success"
                            : log.action.includes("REJECTED") || log.action.includes("REVOKED")
                            ? "danger"
                            : log.action.includes("RELEASE")
                            ? "default"
                            : "outline"
                        }
                        size="sm"
                      >
                        {log.action}
                      </Badge>
                    </td>
                    <td className="p-3.5">
                      <span className="font-semibold text-[var(--title-color)]">
                        {log.entity_name || "System"}
                      </span>
                      {log.entity_id && (
                        <span className="block text-[10px] font-mono text-[var(--font-color)]">
                          ID: {log.entity_id.slice(0, 12)}...
                        </span>
                      )}
                    </td>
                    <td className="p-3.5">
                      <div className="font-medium text-[var(--title-color)]">
                        {log.user_name || "System Automated"}
                      </div>
                      <div className="text-[11px] text-[var(--font-color)]">{log.user_email || ""}</div>
                    </td>
                    <td className="p-3.5 text-[var(--font-color)] whitespace-nowrap">
                      {log.created_at ? new Date(log.created_at).toLocaleString() : "Recently"}
                    </td>
                    <td className="p-3.5 text-right">
                      {log.details ? (
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="px-2.5 py-1 text-xs font-semibold rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--surface-color)] text-[var(--title-color)] hover:border-[#82c341] transition"
                        >
                          View JSON
                        </button>
                      ) : (
                        <span className="text-[var(--font-color)] italic">&mdash;</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* METADATA INSPECTION MODAL */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] w-full max-w-lg p-6 shadow-[var(--shadow-lg)] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]">
              <div>
                <h3 className="text-base font-bold text-[var(--title-color)]">Audit Event Metadata</h3>
                <p className="text-xs text-[var(--font-color)]">Action: {selectedLog.action}</p>
              </div>
              <button onClick={() => setSelectedLog(null)} className="text-[var(--font-color)]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-[var(--background-color)] rounded border border-[var(--border-color)] space-y-1">
                <div>
                  <span className="text-[var(--font-color)]">Actor: </span>
                  <span className="font-semibold text-[var(--title-color)]">{selectedLog.user_name} ({selectedLog.user_email})</span>
                </div>
                <div>
                  <span className="text-[var(--font-color)]">Timestamp: </span>
                  <span className="font-semibold text-[var(--title-color)]">{selectedLog.created_at}</span>
                </div>
              </div>

              <div>
                <label className="block font-medium text-[var(--title-color)] mb-1">Payload / Details:</label>
                <pre className="p-3 bg-[var(--background-color)] rounded border border-[var(--border-color)] font-mono text-[11px] text-[var(--title-color)] overflow-x-auto max-h-60">
                  {(() => {
                    try {
                      return JSON.stringify(JSON.parse(selectedLog.details || "{}"), null, 2);
                    } catch {
                      return selectedLog.details;
                    }
                  })()}
                </pre>
              </div>
            </div>

            <div className="pt-3 border-t border-[var(--border-color)] flex items-center justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-1.5 rounded-[var(--radius-md)] bg-[#45525b] text-white hover:bg-[#343e45] text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
