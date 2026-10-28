"use client";

import React, { useState, useEffect } from "react";
import {
  FileText,
  Search,
  Filter,
  Shield,
  Eye,
  Calendar,
  Globe,
  Clock,
  User,
} from "lucide-react";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";

interface AuditLogItem {
  id: string;
  user_id: string;
  user_email?: string;
  user_name?: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  ip_address?: string;
  metadata_json?: Record<string, any>;
  created_at: string;
}

export default function PlatformAuditPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

  const { error } = useToast();

  const loadAuditLogs = async () => {
    setIsLoading(true);
    try {
      const params: Record<string, any> = { limit: 100 };
      if (actionFilter !== "ALL") params.action = actionFilter;
      const data = await api.get<AuditLogItem[]>("/audit", params);
      setLogs(Array.isArray(data) ? data : []);
    } catch (err: any) {
      error(err?.message || "Failed to load audit logs.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAuditLogs();
  }, [actionFilter]);

  const filteredLogs = logs.filter((log) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      log.action.toLowerCase().includes(term) ||
      log.entity_type.toLowerCase().includes(term) ||
      (log.user_email && log.user_email.toLowerCase().includes(term)) ||
      (log.user_name && log.user_name.toLowerCase().includes(term)) ||
      (log.ip_address && log.ip_address.includes(term))
    );
  });

  const getActionBadge = (action: string) => {
    if (action.includes("SUSPEND")) return <Badge variant="danger">{action}</Badge>;
    if (action.includes("ACTIVATE") || action.includes("APPROVE")) return <Badge variant="success">{action}</Badge>;
    if (action.includes("CREATE") || action.includes("PROVISION")) return <Badge variant="primary">{action}</Badge>;
    if (action.includes("LOGIN")) return <Badge variant="info">{action}</Badge>;
    return <Badge variant="secondary">{action}</Badge>;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Platform Audit Trail"
        subtitle="Immutable event logs capturing tenant governance, security actions, and administrative operations"
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Audit Logs" }]}
      />

      {/* Filter and Search Bar */}
      <div className="card-theme p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#838383]" />
          <input
            type="text"
            placeholder="Search by action, user, entity, or IP..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-theme w-full pl-9"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--title-color)]">
            <Filter className="w-3.5 h-3.5 text-[#838383]" />
            <span>Action:</span>
          </div>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="input-theme text-xs py-1.5"
          >
            <option value="ALL">All Actions ({logs.length})</option>
            <option value="LOGIN">User Logins</option>
            <option value="SUSPEND_UNIVERSITY">Suspension Events</option>
            <option value="ACTIVATE_UNIVERSITY">Reactivation Events</option>
            <option value="CREATE_UNIVERSITY">University Creations</option>
            <option value="CREATE_USER">User Provisions</option>
            <option value="GENERATE_PAPER">Paper Generations</option>
          </select>
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="card-theme overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[var(--surface-muted)] text-[var(--title-color)] uppercase tracking-wider font-bold border-b border-[var(--border-color)]">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Actor (User)</th>
                <th className="py-3 px-4">Entity Type</th>
                <th className="py-3 px-4">IP Address</th>
                <th className="py-3 px-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[var(--muted-text-color)]">
                    <div className="w-6 h-6 border-2 border-[#82c341] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <span>Loading audit records...</span>
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[var(--muted-text-color)]">
                    No audit records found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-[var(--surface-muted)]/50 transition">
                    <td className="py-3.5 px-4 font-mono text-[var(--muted-text-color)] whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString([], {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </td>
                    <td className="py-3.5 px-4 font-bold">{getActionBadge(log.action)}</td>
                    <td className="py-3.5 px-4 font-semibold text-[var(--title-color)]">
                      <div>{log.user_name || "System"}</div>
                      <div className="font-mono text-[10px] text-[var(--muted-text-color)] font-normal">
                        {log.user_email || "system@internal"}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-mono bg-[var(--surface-muted)] px-2 py-0.5 rounded border border-[var(--border-color)] text-[var(--title-color)]">
                        {log.entity_type}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[var(--muted-text-color)]">
                      {log.ip_address || "127.0.0.1"}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="btn-secondary text-[11px] py-1 px-2.5 inline-flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Payload</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Metadata JSON Modal */}
      <Modal
        isOpen={Boolean(selectedLog)}
        onClose={() => setSelectedLog(null)}
        title="Audit Event Details"
        subtitle={`Action: ${selectedLog?.action} • Log ID: ${selectedLog?.id}`}
        maxWidth="lg"
      >
        {selectedLog && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 p-3 bg-[var(--surface-muted)] rounded border border-[var(--border-color)]">
              <div>
                <span className="text-[var(--muted-text-color)] block">Actor:</span>
                <span className="font-bold text-[var(--title-color)]">{selectedLog.user_email || "System"}</span>
              </div>
              <div>
                <span className="text-[var(--muted-text-color)] block">Timestamp:</span>
                <span className="font-mono text-[var(--title-color)]">{selectedLog.created_at}</span>
              </div>
              <div>
                <span className="text-[var(--muted-text-color)] block">Entity:</span>
                <span className="font-mono text-[var(--title-color)]">
                  {selectedLog.entity_type} ({selectedLog.entity_id || "N/A"})
                </span>
              </div>
              <div>
                <span className="text-[var(--muted-text-color)] block">IP Address:</span>
                <span className="font-mono text-[var(--title-color)]">{selectedLog.ip_address || "127.0.0.1"}</span>
              </div>
            </div>

            <div>
              <span className="font-bold text-[var(--title-color)] block mb-1">Audit Payload Metadata:</span>
              <pre className="p-3 bg-[#2c353b] text-[#82c341] rounded-[var(--radius-md)] font-mono text-[11px] overflow-x-auto max-h-64">
                {JSON.stringify(selectedLog.metadata_json || {}, null, 2)}
              </pre>
            </div>

            <div className="flex justify-end pt-3 border-t border-[var(--border-color)]">
              <button
                onClick={() => setSelectedLog(null)}
                className="btn-secondary text-xs"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
