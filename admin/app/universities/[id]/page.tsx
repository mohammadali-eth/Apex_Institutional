"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Building2,
  Users,
  ShieldCheck,
  ShieldAlert,
  Plus,
  Mail,
  Phone,
  Globe,
  CheckCircle,
  AlertTriangle,
  ArrowLeft,
  Calendar,
  FileCheck2,
  FileQuestion,
  GraduationCap,
  Layers,
  Palette,
  KeyRound,
} from "lucide-react";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/PageHeader";
import { Modal } from "@/components/ui/Modal";
import { UniversityStatusBadge, RoleBadge, Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import { UniversityDetailResponse } from "@/lib/types";

export default function UniversityDetailPage() {
  const params = useParams();
  const router = useRouter();
  const univId = params.id as string;

  const [univ, setUniv] = useState<UniversityDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { success, error } = useToast();

  const [newAdminForm, setNewAdminForm] = useState({
    full_name: "",
    email: "",
    password: "",
    phone: "",
  });

  const loadDetails = async () => {
    setIsLoading(true);
    try {
      const data = await api.get<UniversityDetailResponse>(`/universities/${univId}/details`);
      setUniv(data);
    } catch (err: any) {
      error(err?.message || "Failed to load university details.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (univId) {
      loadDetails();
    }
  }, [univId]);

  const handleStatusToggle = async () => {
    if (!univ) return;
    setIsSubmitting(true);
    try {
      if (univ.is_active) {
        await api.post(`/universities/${univ.id}/suspend`, {
          reason: "Suspended via Super Admin university detail interface.",
        });
        success(`University "${univ.name}" has been suspended. All users locked out.`);
      } else {
        await api.post(`/universities/${univ.id}/activate`, {
          reason: "Reactivated via Super Admin university detail interface.",
        });
        success(`University "${univ.name}" has been reactivated.`);
      }
      setIsStatusModalOpen(false);
      loadDetails();
    } catch (err: any) {
      error(err?.message || "Failed to update university status.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProvisionAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!univ) return;
    setIsSubmitting(true);
    try {
      await api.post(`/universities/${univ.id}/admins`, newAdminForm);
      success(`Administrator "${newAdminForm.full_name}" provisioned successfully.`);
      setIsAdminModalOpen(false);
      setNewAdminForm({ full_name: "", email: "", password: "", phone: "" });
      loadDetails();
    } catch (err: any) {
      error(err?.message || "Failed to provision university admin.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-[#82c341] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!univ) {
    return (
      <div className="card-theme p-12 text-center">
        <h3 className="text-lg font-bold text-[var(--title-color)]">University Not Found</h3>
        <p className="text-xs text-[var(--muted-text-color)] mt-1">
          The requested university could not be retrieved.
        </p>
        <Link href="/universities" className="btn-secondary text-xs mt-4 inline-flex items-center gap-1.5">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Universities</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={univ.name}
        subtitle={`Tenant Governance & Academic Operations • Code: ${univ.code}`}
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Universities", href: "/universities" },
          { label: univ.code },
        ]}
        actions={
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsAdminModalOpen(true)}
              className="btn-primary text-xs font-bold shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Provision Admin</span>
            </button>

            {univ.is_active ? (
              <button
                onClick={() => setIsStatusModalOpen(true)}
                className="btn-danger text-xs font-bold shadow-sm"
              >
                <ShieldAlert className="w-4 h-4" />
                <span>Suspend Tenant</span>
              </button>
            ) : (
              <button
                onClick={() => setIsStatusModalOpen(true)}
                className="btn-primary text-xs font-bold shadow-sm"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Activate Tenant</span>
              </button>
            )}
          </div>
        }
      />

      {/* University Status Notice if Suspended */}
      {!univ.is_active && (
        <div className="p-4 bg-[#fee2e2] border-l-4 border-l-[#ef4444] rounded-[var(--radius-md)] flex items-start gap-3 text-xs text-[#991b1b]">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Tenant Currently Suspended:</span> All user accounts under {univ.name} are locked out immediately. Login attempts and API interactions will be rejected with HTTP 403 Forbidden.
          </div>
        </div>
      )}

      {/* Basic Metadata Banner */}
      <div className="card-theme p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[var(--border-color)]">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-[var(--secondary-color)] border-2 border-[#82c341] text-[#82c341] font-black text-xl flex items-center justify-center shadow-sm">
              {univ.code.substring(0, 3)}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-[var(--title-color)]">{univ.name}</h2>
                <UniversityStatusBadge isActive={univ.is_active} />
              </div>
              <div className="flex flex-wrap items-center gap-4 text-xs text-[var(--muted-text-color)] mt-1.5">
                <span className="font-mono bg-[var(--surface-muted)] px-2 py-0.5 rounded border border-[var(--border-color)] text-[var(--title-color)] font-bold">
                  {univ.code}
                </span>
                <span>Type: <strong className="text-[var(--title-color)]">{univ.type}</strong></span>
                {univ.state && <span>State: <strong className="text-[var(--title-color)]">{univ.state}</strong></span>}
                <span>Created: {new Date(univ.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 text-xs text-[var(--paragraph-color)]">
            {univ.website && (
              <a
                href={univ.website.startsWith("http") ? univ.website : `https://${univ.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 hover:text-[#82c341] transition"
              >
                <Globe className="w-4 h-4 text-[#838383]" />
                <span>{univ.website}</span>
              </a>
            )}
            {univ.email && (
              <span className="flex items-center gap-1.5">
                <Mail className="w-4 h-4 text-[#838383]" />
                <span>{univ.email}</span>
              </span>
            )}
          </div>
        </div>

        {/* Operational Statistics */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 pt-6">
          <div className="p-3 bg-[var(--surface-muted)] rounded-[var(--radius-md)] border border-[var(--border-color)]">
            <div className="flex items-center gap-2 text-xs text-[var(--muted-text-color)] mb-1">
              <Users className="w-3.5 h-3.5 text-[#82c341]" />
              <span>Admins</span>
            </div>
            <p className="text-xl font-black text-[var(--title-color)]">{univ.admins.length}</p>
          </div>

          <div className="p-3 bg-[var(--surface-muted)] rounded-[var(--radius-md)] border border-[var(--border-color)]">
            <div className="flex items-center gap-2 text-xs text-[var(--muted-text-color)] mb-1">
              <GraduationCap className="w-3.5 h-3.5 text-[#45525b]" />
              <span>Faculty</span>
            </div>
            <p className="text-xl font-black text-[var(--title-color)]">{univ.faculty_count}</p>
          </div>

          <div className="p-3 bg-[var(--surface-muted)] rounded-[var(--radius-md)] border border-[var(--border-color)]">
            <div className="flex items-center gap-2 text-xs text-[var(--muted-text-color)] mb-1">
              <Layers className="w-3.5 h-3.5 text-[#45525b]" />
              <span>Programs</span>
            </div>
            <p className="text-xl font-black text-[var(--title-color)]">{univ.program_count}</p>
          </div>

          <div className="p-3 bg-[var(--surface-muted)] rounded-[var(--radius-md)] border border-[var(--border-color)]">
            <div className="flex items-center gap-2 text-xs text-[var(--muted-text-color)] mb-1">
              <FileQuestion className="w-3.5 h-3.5 text-[#82c341]" />
              <span>Questions Bank</span>
            </div>
            <p className="text-xl font-black text-[var(--title-color)]">{univ.question_count}</p>
          </div>

          <div className="p-3 bg-[var(--surface-muted)] rounded-[var(--radius-md)] border border-[var(--border-color)]">
            <div className="flex items-center gap-2 text-xs text-[var(--muted-text-color)] mb-1">
              <FileCheck2 className="w-3.5 h-3.5 text-[#82c341]" />
              <span>Papers Generated</span>
            </div>
            <p className="text-xl font-black text-[var(--title-color)]">{univ.paper_count}</p>
          </div>
        </div>
      </div>

      {/* University Administrators Table */}
      <div className="card-theme overflow-hidden">
        <div className="p-4 px-6 border-b border-[var(--border-color)] flex items-center justify-between bg-[var(--surface-muted)]">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[var(--title-color)]" />
            <h3 className="text-sm font-bold text-[var(--title-color)]">
              Designated University Administrators ({univ.admins.length})
            </h3>
          </div>
          <button
            onClick={() => setIsAdminModalOpen(true)}
            className="btn-primary text-xs py-1 px-3"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Admin</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[var(--surface-muted)] text-[var(--title-color)] uppercase tracking-wider font-bold border-b border-[var(--border-color)]">
              <tr>
                <th className="py-3 px-4">Administrator</th>
                <th className="py-3 px-4">Login Email</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Account Status</th>
                <th className="py-3 px-4">Provisioned Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {univ.admins.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-[var(--muted-text-color)]">
                    No administrators provisioned yet for this university tenant.
                  </td>
                </tr>
              ) : (
                univ.admins.map((adm) => (
                  <tr key={adm.id} className="hover:bg-[var(--surface-muted)]/50 transition">
                    <td className="py-3.5 px-4 font-bold text-[var(--title-color)]">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-[#45525b]/10 text-[var(--title-color)] font-bold flex items-center justify-center">
                          {adm.full_name.charAt(0).toUpperCase()}
                        </div>
                        <span>{adm.full_name}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[var(--paragraph-color)]">
                      {adm.email}
                    </td>
                    <td className="py-3.5 px-4">
                      <RoleBadge role="UNIVERSITY_ADMIN" />
                    </td>
                    <td className="py-3.5 px-4">
                      {adm.is_active ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-[#eaf5de] text-[#325816] border border-[#82c341]">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-[#fee2e2] text-[#991b1b] border border-[#fecaca]">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-[var(--muted-text-color)]">
                      {new Date(adm.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Provision University Admin Modal */}
      <Modal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        title={`Provision University Admin for ${univ.name}`}
        subtitle="Grants tenant-level control over departments, programs, and staff on Port 3000"
        maxWidth="lg"
      >
        <form onSubmit={handleProvisionAdmin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[var(--title-color)] mb-1">
              Full Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Dr. Jane Smith"
              value={newAdminForm.full_name}
              onChange={(e) => setNewAdminForm({ ...newAdminForm, full_name: e.target.value })}
              className="input-theme w-full"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--title-color)] mb-1">
              Admin Login Email *
            </label>
            <input
              type="email"
              required
              placeholder={`admin@${univ.code.toLowerCase()}.edu`}
              value={newAdminForm.email}
              onChange={(e) => setNewAdminForm({ ...newAdminForm, email: e.target.value })}
              className="input-theme w-full"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--title-color)] mb-1">
              Temporary Password (Optional)
            </label>
            <input
              type="password"
              placeholder="Leave blank for auto-generated password"
              value={newAdminForm.password}
              onChange={(e) => setNewAdminForm({ ...newAdminForm, password: e.target.value })}
              className="input-theme w-full"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--title-color)] mb-1">
              Mobile Contact
            </label>
            <input
              type="text"
              placeholder="+91 98765 00000"
              value={newAdminForm.phone}
              onChange={(e) => setNewAdminForm({ ...newAdminForm, phone: e.target.value })}
              className="input-theme w-full"
            />
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-[var(--border-color)]">
            <button
              type="button"
              onClick={() => setIsAdminModalOpen(false)}
              className="btn-secondary text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary text-xs font-bold shadow"
            >
              {isSubmitting ? "Provisioning..." : "Provision Administrator"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Suspend / Activate Confirmation Modal */}
      <Modal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        title={univ.is_active ? "Suspend University Tenant" : "Reactivate University Tenant"}
        maxWidth="md"
      >
        <div className="space-y-4 text-xs">
          {univ.is_active ? (
            <div className="p-3 bg-[#fee2e2] text-[#991b1b] rounded-[var(--radius-md)] border border-[#fecaca] flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Immediate Lockout Warning</p>
                <p className="mt-1 leading-relaxed">
                  Suspending <strong>{univ.name}</strong> will immediately disable login access and cut off all API requests for ALL users belonging to this university across the system.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-[#eaf5de] text-[#325816] rounded-[var(--radius-md)] border border-[#82c341] flex items-start gap-2.5">
              <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Restore Tenant Operations</p>
                <p className="mt-1 leading-relaxed">
                  Activating <strong>{univ.name}</strong> will restore access for all staff, examiners, and students on Port 3000.
                </p>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-3 border-t border-[var(--border-color)]">
            <button
              type="button"
              onClick={() => setIsStatusModalOpen(false)}
              className="btn-secondary text-xs"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleStatusToggle}
              disabled={isSubmitting}
              className={`text-xs font-bold ${univ.is_active ? "btn-danger" : "btn-primary"}`}
            >
              {isSubmitting
                ? "Processing..."
                : univ.is_active
                ? "Confirm Suspension"
                : "Confirm Activation"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
