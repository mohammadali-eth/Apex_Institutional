"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import { PageHeader } from "@/components/ui/PageHeader";
import { Modal } from "@/components/ui/Modal";
import { ShieldCheck, Filter } from "lucide-react";

interface AuditItem {
  id: string;
  user_id?: string;
  user_email?: string;
  user_name?: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  ip_address?: string;
  metadata_json?: string;
  created_at: string;
}

export default function AuditLogsPage() {
  const toast = useToast();
  const [logs, setLogs] = useState<AuditItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState("");
  const [activeMeta, setActiveMeta] = useState<string | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { limit: 50 };
      if (filterAction) params.action = filterAction;
      const data = await api.get<AuditItem[]>("/audit", params);
      setLogs(data);
    } catch (err: any) {
      toast.error(err.message || "Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [filterAction]);

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Administration" },
          { label: "Audit & Governance" },
        ]}
        title="System Audit & Governance Log"
        description="Immutable system audit trail tracking authentication, question approvals, syllabus revisions, and exam generation."
      />

      <div className="bg-white p-3 rounded-[8px] border border-[#dcdcdc] shadow-sm flex items-center gap-3">
        <Filter className="w-4 h-4 text-[#838383]" />
        <span className="text-xs font-bold text-[#44535b]">Filter Event Action:</span>
        <select
          value={filterAction}
          onChange={(e) => setFilterAction(e.target.value)}
          className="px-3 py-1.5 border border-[#dcdcdc] rounded-[6px] text-xs bg-[#f6f6f7] text-[#44535b] font-medium focus:outline-none focus:border-[#82c341]"
        >
          <option value="">All Audit Actions</option>
          <option value="LOGIN">LOGIN</option>
          <option value="LOGOUT">LOGOUT</option>
          <option value="QUESTION_CREATED">QUESTION_CREATED</option>
          <option value="QUESTION_APPROVE">QUESTION_APPROVE</option>
          <option value="QUESTION_REJECT">QUESTION_REJECT</option>
          <option value="PAPER_GENERATED">PAPER_GENERATED</option>
          <option value="PAPER_APPROVE">PAPER_APPROVE</option>
          <option value="PAPER_PUBLISH">PAPER_PUBLISH</option>
          <option value="SYLLABUS_UPLOADED">SYLLABUS_UPLOADED</option>
        </select>
      </div>

      <div className="bg-white rounded-[8px] border border-[#dcdcdc] overflow-hidden shadow-sm">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#f6f6f7] border-b border-[#dcdcdc] text-[#44535b] font-bold uppercase tracking-wider">
            <tr>
              <th className="px-5 py-3">Timestamp</th>
              <th className="px-5 py-3">User</th>
              <th className="px-5 py-3">Action</th>
              <th className="px-5 py-3">Target Entity</th>
              <th className="px-5 py-3 text-right">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#dcdcdc]/70">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-[#838383]">
                  <div className="w-6 h-6 border-2 border-[#82c341] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  Loading audit records...
                </td>
              </tr>
            ) : logs.length > 0 ? (
              logs.map((log) => (
                <tr key={log.id} className="hover:bg-[#f6f6f7]/70 transition">
                  <td className="px-5 py-3 text-[#676767] whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="px-5 py-3">
                    <p className="font-bold text-[#44535b]">{log.user_name || "System"}</p>
                    <p className="text-[11px] text-[#838383]">{log.user_email || "system@local"}</p>
                  </td>
                  <td className="px-5 py-3">
                    <span className="px-2 py-0.5 rounded-[4px] text-[10px] font-bold bg-[#f6f6f7] text-[#44535b] border border-[#dcdcdc]">
                      {log.action}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-[#676767]">
                    <span className="font-bold text-[#44535b]">{log.entity_type}</span>
                    {log.entity_id && (
                      <span className="text-[10px] text-[#838383] block font-mono">
                        {log.entity_id.substring(0, 8)}...
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right">
                    {log.metadata_json && (
                      <button
                        onClick={() => setActiveMeta(log.metadata_json || null)}
                        className="btn-secondary py-1 px-2.5 text-[11px]"
                      >
                        View JSON
                      </button>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-[#838383]">No audit records found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* METADATA MODAL */}
      <Modal
        isOpen={!!activeMeta}
        onClose={() => setActiveMeta(null)}
        title="Audit Log Payload Details"
        subtitle="Raw snapshot captured at action execution"
        maxWidth="md"
      >
        <pre className="p-4 bg-[#45525b] text-[#82c341] rounded-[6px] text-xs font-mono overflow-x-auto whitespace-pre-wrap border border-[#374249]">
          {activeMeta ? JSON.stringify(JSON.parse(activeMeta), null, 2) : ""}
        </pre>
      </Modal>
    </div>
  );
}