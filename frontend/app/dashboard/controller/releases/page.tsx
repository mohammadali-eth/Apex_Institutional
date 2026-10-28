"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { ControllerPaperReleaseItem, ControllerFinalizedPaperItem, ControllerExamItem } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import {
  Send,
  Lock,
  ShieldCheck,
  Clock,
  AlertTriangle,
  RefreshCw,
  Search,
  CheckCircle2,
  XCircle,
  X,
  Key,
  Users,
  CalendarDays,
} from "lucide-react";

export default function ControllerReleasesPage() {
  const [releases, setReleases] = useState<ControllerPaperReleaseItem[]>([]);
  const [finalizedPapers, setFinalizedPapers] = useState<ControllerFinalizedPaperItem[]>([]);
  const [examinations, setExaminations] = useState<ControllerExamItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Configure Modal
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [configSubmitting, setConfigSubmitting] = useState(false);
  const [configForm, setConfigForm] = useState({
    paper_id: "",
    examination_id: "",
    scheduled_release_at: "",
    recipient_roles: ["EXAM_COORDINATOR"],
    release_notes: "",
  });

  // Action Modals
  const [selectedRelease, setSelectedRelease] = useState<ControllerPaperReleaseItem | null>(null);
  const [actionType, setActionType] = useState<"AUTHORIZE" | "REVOKE" | null>(null);
  const [actionSubmitting, setActionSubmitting] = useState(false);

  const fetchReleases = () => {
    setLoading(true);
    api
      .get<ControllerPaperReleaseItem[]>("/controller/releases")
      .then((data) => setReleases(data || []))
      .catch((err) => console.error("Error loading releases:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchReleases();
    api
      .get<ControllerFinalizedPaperItem[]>("/controller/finalized-papers")
      .then((data) => {
        setFinalizedPapers(data || []);
        if (data && data.length > 0) {
          setConfigForm((prev) => ({ ...prev, paper_id: data[0].id }));
        }
      })
      .catch(() => {});
    api
      .get<ControllerExamItem[]>("/controller/examinations")
      .then((data) => setExaminations(data || []))
      .catch(() => {});
  }, []);

  const handleConfigureRelease = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!configForm.paper_id) return;
    setConfigSubmitting(true);
    try {
      await api.post("/controller/releases/configure", {
        paper_id: configForm.paper_id,
        examination_id: configForm.examination_id || undefined,
        scheduled_release_at: configForm.scheduled_release_at
          ? new Date(configForm.scheduled_release_at).toISOString()
          : undefined,
        recipient_roles: configForm.recipient_roles,
        release_notes: configForm.release_notes || undefined,
      });
      setConfigModalOpen(false);
      fetchReleases();
    } catch (err: any) {
      alert(err.message || "Failed to configure paper release.");
    } finally {
      setConfigSubmitting(false);
    }
  };

  const handleExecuteAction = async () => {
    if (!selectedRelease || !actionType) return;
    setActionSubmitting(true);
    try {
      if (actionType === "AUTHORIZE") {
        await api.post(`/controller/releases/${selectedRelease.id}/authorize`, { confirmation: true });
      } else {
        await api.post(`/controller/releases/${selectedRelease.id}/revoke`, {});
      }
      setSelectedRelease(null);
      setActionType(null);
      fetchReleases();
    } catch (err: any) {
      alert(err.message || `Failed to ${actionType.toLowerCase()} release.`);
    } finally {
      setActionSubmitting(false);
    }
  };

  const toggleRole = (role: string) => {
    setConfigForm((prev) => {
      const exists = prev.recipient_roles.includes(role);
      if (exists) {
        return { ...prev, recipient_roles: prev.recipient_roles.filter((r) => r !== role) };
      } else {
        return { ...prev, recipient_roles: [...prev.recipient_roles, role] };
      }
    });
  };

  const filteredReleases = releases.filter((r) => {
    if (search.trim()) {
      const q = search.toLowerCase();
      const match =
        r.paper_title.toLowerCase().includes(q) ||
        r.subject_code.toLowerCase().includes(q) ||
        r.subject_name.toLowerCase().includes(q) ||
        (r.examination_name && r.examination_name.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Secure Paper Release Windows"
        description="Controlled paper dispatch protocol. Enforces release schedules, role-based authorization tokens, and emergency access revocation."
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchReleases()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--surface-color)] text-[var(--font-color)] hover:text-[var(--title-color)] transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
            <button
              onClick={() => setConfigModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-[var(--radius-md)] bg-[#82c341] text-[#000000] hover:bg-[#72ad38] transition font-bold shadow-[var(--shadow-sm)]"
            >
              <Send className="w-4 h-4" />
              <span>Configure Release</span>
            </button>
          </div>
        }
      />

      {/* Security Info Banner */}
      <div className="p-4 bg-[var(--surface-color)] border border-[var(--border-color)] rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)] flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-[var(--radius-md)] bg-[#82c341]/15 text-[#45525b] flex items-center justify-center">
            <ShieldCheck className="w-4 h-4 text-[#45525b]" />
          </div>
          <div>
            <h4 className="font-bold text-[var(--title-color)]">Two-Person / Role Governance Policy</h4>
            <p className="text-[11px] text-[var(--font-color)] mt-0.5">
              Only finalized papers with valid SHA-256 integrity signatures can be queued for release. Download tokens are cryptographically generated at authorization.
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
            placeholder="Search releases by paper or examination..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--background-color)] text-[var(--title-color)] focus:outline-none focus:border-[#82c341]"
          />
        </div>
        <div className="text-xs text-[var(--font-color)]">
          Total release policies: <span className="font-bold text-[var(--title-color)]">{filteredReleases.length}</span>
        </div>
      </div>

      {/* Releases List */}
      {loading ? (
        <div className="p-8 text-center bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)]">
          <div className="w-8 h-8 border-2 border-[#82c341] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-[var(--font-color)]">Loading release schedules...</p>
        </div>
      ) : filteredReleases.length === 0 ? (
        <div className="p-12 text-center bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)]">
          <Send className="w-10 h-10 text-[var(--font-color)] mx-auto mb-3 opacity-40" />
          <h3 className="text-sm font-bold text-[var(--title-color)] mb-1">No Release Schedules Configured</h3>
          <p className="text-xs text-[var(--font-color)] max-w-sm mx-auto mb-4">
            Select a finalized question paper to configure its scheduled release time and authorized supervisor roles.
          </p>
          <button
            onClick={() => setConfigModalOpen(true)}
            className="px-3 py-1.5 text-xs font-semibold rounded-[var(--radius-md)] bg-[#82c341] text-[#000000]"
          >
            Configure Release
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredReleases.map((rel) => (
            <div
              key={rel.id}
              className={`p-4 bg-[var(--surface-color)] rounded-[var(--radius-lg)] border transition shadow-[var(--shadow-sm)] space-y-3 ${
                rel.release_status === "RELEASED"
                  ? "border-emerald-500/40 bg-emerald-50/5"
                  : rel.release_status === "REVOKED"
                  ? "border-red-500/40 bg-red-50/5"
                  : "border-[var(--border-color)] hover:border-[#82c341]"
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        rel.release_status === "RELEASED"
                          ? "success"
                          : rel.release_status === "REVOKED"
                          ? "danger"
                          : "warning"
                      }
                      size="sm"
                    >
                      {rel.release_status}
                    </Badge>
                    <span className="font-bold text-sm text-[var(--title-color)]">{rel.paper_title}</span>
                  </div>
                  <div className="text-xs text-[var(--font-color)] flex items-center gap-2 flex-wrap">
                    <span>{rel.subject_code} - {rel.subject_name}</span>
                    <span>&bull;</span>
                    <span>{rel.examination_name || "Institutional Examination"}</span>
                    <span>&bull;</span>
                    <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                      <Lock className="w-3 h-3" />
                      <span>Locked</span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  {rel.release_status !== "RELEASED" && rel.release_status !== "REVOKED" && (
                    <button
                      onClick={() => {
                        setSelectedRelease(rel);
                        setActionType("AUTHORIZE");
                      }}
                      className="px-3 py-1.5 font-bold rounded-[var(--radius-md)] bg-[#82c341] text-[#000000] hover:bg-[#72ad38] transition flex items-center gap-1.5 shadow-[var(--shadow-sm)]"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Authorize & Release Now</span>
                    </button>
                  )}

                  {rel.release_status === "RELEASED" && (
                    <button
                      onClick={() => {
                        setSelectedRelease(rel);
                        setActionType("REVOKE");
                      }}
                      className="px-3 py-1.5 font-semibold rounded-[var(--radius-md)] bg-red-500/10 text-red-600 hover:bg-red-500/20 transition flex items-center gap-1.5"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Revoke Access</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Release Metadata */}
              <div className="pt-2 border-t border-[var(--border-color)] grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                <div>
                  <span className="text-[var(--font-color)] block">Scheduled Window:</span>
                  <span className="font-semibold text-[var(--title-color)] flex items-center gap-1 mt-0.5">
                    <Clock className="w-3.5 h-3.5 text-[#82c341]" />
                    <span>
                      {rel.scheduled_release_at
                        ? new Date(rel.scheduled_release_at).toLocaleString()
                        : "Immediate Upon Authorization"}
                    </span>
                  </span>
                </div>

                <div>
                  <span className="text-[var(--font-color)] block">Authorized Recipients:</span>
                  <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                    {rel.recipient_roles.map((r, i) => (
                      <Badge key={i} variant="outline" size="sm">
                        {r}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="text-[var(--font-color)] block">Release Execution:</span>
                  <span className="font-semibold text-[var(--title-color)] mt-0.5 block">
                    {rel.released_at
                      ? `Released by ${rel.released_by_name || "Controller"} on ${new Date(rel.released_at).toLocaleDateString()}`
                      : "Awaiting Trigger"}
                  </span>
                </div>
              </div>

              {/* Download token hash if released */}
              {rel.download_token_hash && (
                <div className="p-2 bg-[var(--background-color)] rounded border border-[var(--border-color)] text-[11px] flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[var(--font-color)]">
                    <Key className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Token Fingerprint:</span>
                    <span className="font-mono text-emerald-700 dark:text-emerald-400 truncate max-w-sm">
                      {rel.download_token_hash}
                    </span>
                  </div>
                  <span className="text-[10px] text-emerald-600 font-bold uppercase">Valid & Verified</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* CONFIGURE RELEASE MODAL */}
      {configModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] w-full max-w-md p-6 shadow-[var(--shadow-lg)] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]">
              <div>
                <h3 className="text-base font-bold text-[var(--title-color)]">Configure Paper Release Window</h3>
                <p className="text-xs text-[var(--font-color)]">Schedule confidential paper release for an examination.</p>
              </div>
              <button onClick={() => setConfigModalOpen(false)} className="text-[var(--font-color)]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfigureRelease} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-[var(--title-color)] mb-1">Select Finalized Paper *</label>
                <select
                  required
                  value={configForm.paper_id}
                  onChange={(e) => setConfigForm({ ...configForm, paper_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--background-color)] text-[var(--title-color)] focus:outline-none focus:border-[#82c341]"
                >
                  {finalizedPapers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title} ({p.subject_code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-[var(--title-color)] mb-1">Associated Examination (Optional)</label>
                <select
                  value={configForm.examination_id}
                  onChange={(e) => setConfigForm({ ...configForm, examination_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--background-color)] text-[var(--title-color)] focus:outline-none focus:border-[#82c341]"
                >
                  <option value="">Select Examination...</option>
                  {examinations.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.code} - {e.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-[var(--title-color)] mb-1">Scheduled Release Time</label>
                <input
                  type="datetime-local"
                  value={configForm.scheduled_release_at}
                  onChange={(e) => setConfigForm({ ...configForm, scheduled_release_at: e.target.value })}
                  className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--background-color)] text-[var(--title-color)] focus:outline-none focus:border-[#82c341]"
                />
                <span className="text-[10px] text-[var(--font-color)] mt-0.5 block">
                  Leave blank to require manual immediate controller authorization.
                </span>
              </div>

              <div>
                <label className="block font-medium text-[var(--title-color)] mb-1">Authorized Recipient Roles</label>
                <div className="flex gap-2">
                  {["EXAM_COORDINATOR", "FACULTY", "STUDENT"].map((role) => (
                    <button
                      type="button"
                      key={role}
                      onClick={() => toggleRole(role)}
                      className={`px-2.5 py-1 rounded text-xs font-semibold border transition ${
                        configForm.recipient_roles.includes(role)
                          ? "bg-[#82c341] text-[#000000] border-[#82c341]"
                          : "border-[var(--border-color)] text-[var(--font-color)]"
                      }`}
                    >
                      {role}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-medium text-[var(--title-color)] mb-1">Release Security Notes</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Authorized for printing 45 minutes prior to commencement."
                  value={configForm.release_notes}
                  onChange={(e) => setConfigForm({ ...configForm, release_notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--background-color)] text-[var(--title-color)] focus:outline-none focus:border-[#82c341]"
                />
              </div>

              <div className="pt-3 border-t border-[var(--border-color)] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setConfigModalOpen(false)}
                  className="px-3 py-1.5 rounded-[var(--radius-md)] border border-[var(--border-color)] text-[var(--font-color)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={configSubmitting}
                  className="px-4 py-1.5 rounded-[var(--radius-md)] bg-[#82c341] text-[#000000] font-bold hover:bg-[#72ad38] disabled:opacity-50"
                >
                  {configSubmitting ? "Saving..." : "Save Configuration"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM AUTHORIZATION / REVOCATION MODAL */}
      {selectedRelease && actionType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] w-full max-w-md p-6 shadow-[var(--shadow-lg)] space-y-4">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  actionType === "AUTHORIZE" ? "bg-emerald-500/15 text-emerald-600" : "bg-red-500/15 text-red-600"
                }`}
              >
                {actionType === "AUTHORIZE" ? <CheckCircle2 className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
              </div>
              <div>
                <h3 className="text-base font-bold text-[var(--title-color)]">
                  {actionType === "AUTHORIZE" ? "Authorize Paper Release" : "Revoke Paper Release"}
                </h3>
                <p className="text-xs text-[var(--font-color)]">{selectedRelease.paper_title}</p>
              </div>
            </div>

            <p className="text-xs text-[var(--font-color)] leading-relaxed">
              {actionType === "AUTHORIZE"
                ? "This will execute immediate paper release. Authorized coordinators will gain download credentials and an audit entry will be recorded."
                : "This will immediately revoke access to the question paper for all coordinators and faculties. Use this if an exam is postponed or a security breach is suspected."}
            </p>

            <div className="pt-3 border-t border-[var(--border-color)] flex items-center justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  setSelectedRelease(null);
                  setActionType(null);
                }}
                className="px-3 py-1.5 rounded-[var(--radius-md)] border border-[var(--border-color)] text-[var(--font-color)]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionSubmitting}
                onClick={handleExecuteAction}
                className={`px-4 py-1.5 rounded-[var(--radius-md)] font-bold text-white transition disabled:opacity-50 ${
                  actionType === "AUTHORIZE" ? "bg-[#82c341] text-[#000000] hover:bg-[#72ad38]" : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {actionSubmitting
                  ? "Executing..."
                  : actionType === "AUTHORIZE"
                  ? "Confirm & Release"
                  : "Revoke Access"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
