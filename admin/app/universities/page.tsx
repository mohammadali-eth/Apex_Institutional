"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Building2,
  Plus,
  Search,
  Filter,
  Eye,
  ShieldAlert,
  ShieldCheck,
  CheckCircle,
  AlertTriangle,
  UserCheck,
  Globe,
  Mail,
  Phone,
} from "lucide-react";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/PageHeader";
import { Modal } from "@/components/ui/Modal";
import { UniversityStatusBadge, Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import { Organization } from "@/lib/types";

export default function UniversitiesPage() {
  const [universities, setUniversities] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [creationMode, setCreationMode] = useState<"with-admin" | "standard">("with-admin");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Status toggle confirmation modal state
  const [confirmStatusModal, setConfirmStatusModal] = useState<{
    isOpen: boolean;
    univ: Organization | null;
    action: "suspend" | "activate";
  }>({
    isOpen: false,
    univ: null,
    action: "suspend",
  });

  const { success, error } = useToast();

  // Form states for With-Admin Creation
  const [withAdminForm, setWithAdminForm] = useState({
    name: "",
    code: "",
    type: "STATE",
    state: "",
    country: "India",
    website: "",
    phone: "",
    email: "",
    admin_full_name: "",
    admin_email: "",
    admin_password: "",
    admin_phone: "",
  });

  // Form states for Standard Creation
  const [standardForm, setStandardForm] = useState({
    name: "",
    code: "",
    type: "STATE",
    address: "",
    website: "",
    email: "",
    phone: "",
  });

  const loadUniversities = async () => {
    setIsLoading(true);
    try {
      const params: Record<string, string> = {};
      if (search.trim()) params.search = search.trim();
      if (statusFilter !== "ALL") params.status = statusFilter;

      const data = await api.get<Organization[]>("/universities", params);
      setUniversities(Array.isArray(data) ? data : []);
    } catch (err: any) {
      error(err?.message || "Failed to load universities.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUniversities();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadUniversities();
  };

  const handleCreateWithAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.post("/universities/with-admin", withAdminForm);
      success(`University "${withAdminForm.name}" & Admin "${withAdminForm.admin_email}" created successfully.`);
      setIsModalOpen(false);
      setWithAdminForm({
        name: "",
        code: "",
        type: "STATE",
        state: "",
        country: "India",
        website: "",
        phone: "",
        email: "",
        admin_full_name: "",
        admin_email: "",
        admin_password: "",
        admin_phone: "",
      });
      loadUniversities();
    } catch (err: any) {
      error(err?.message || "Failed to create university with admin.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateStandard = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.post("/universities", {
        ...standardForm,
        type: "UNIVERSITY",
      });
      success(`University "${standardForm.name}" created successfully.`);
      setIsModalOpen(false);
      setStandardForm({
        name: "",
        code: "",
        type: "STATE",
        address: "",
        website: "",
        email: "",
        phone: "",
      });
      loadUniversities();
    } catch (err: any) {
      error(err?.message || "Failed to create university.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const executeStatusChange = async () => {
    const { univ, action } = confirmStatusModal;
    if (!univ) return;

    try {
      if (action === "suspend") {
        await api.post(`/universities/${univ.id}/suspend`, { reason: "Suspended via Super Admin portal." });
        success(`University "${univ.name}" has been suspended. All associated accounts locked out.`);
      } else {
        await api.post(`/universities/${univ.id}/activate`, { reason: "Reactivated via Super Admin portal." });
        success(`University "${univ.name}" has been reactivated. Access restored.`);
      }
      setConfirmStatusModal({ isOpen: false, univ: null, action: "suspend" });
      loadUniversities();
    } catch (err: any) {
      error(err?.message || `Failed to ${action} university.`);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="University Tenants"
        subtitle="Provision, configure, and manage university organizations and governance status"
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Universities" }]}
        actions={
          <button
            onClick={() => setIsModalOpen(true)}
            className="btn-primary text-xs font-bold shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add University</span>
          </button>
        }
      />

      {/* Filter and Search Bar */}
      <div className="card-theme p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="flex-1 flex items-center gap-2 max-w-md">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#838383]" />
            <input
              type="text"
              placeholder="Search by name, abbreviation or code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-theme w-full pl-9"
            />
          </div>
          <button type="submit" className="btn-secondary text-xs py-2 px-3">
            Search
          </button>
        </form>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--title-color)]">
            <Filter className="w-3.5 h-3.5 text-[#838383]" />
            <span>Status:</span>
          </div>
          <div className="flex bg-[var(--surface-muted)] p-1 rounded-[var(--radius-md)] border border-[var(--border-color)]">
            {(["ALL", "ACTIVE", "SUSPENDED"] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`text-xs px-3 py-1 rounded font-semibold transition ${
                  statusFilter === status
                    ? "bg-[var(--secondary-color)] text-white shadow-xs"
                    : "text-[var(--paragraph-color)] hover:text-[var(--title-color)]"
                }`}
              >
                {status.charAt(0) + status.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Universities Table */}
      <div className="card-theme overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[var(--surface-muted)] text-[var(--title-color)] uppercase tracking-wider font-bold border-b border-[var(--border-color)]">
              <tr>
                <th className="py-3 px-4">University</th>
                <th className="py-3 px-4">Code</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Institutions</th>
                <th className="py-3 px-4">Created</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[var(--muted-text-color)]">
                    <div className="w-6 h-6 border-2 border-[#82c341] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <span>Loading universities...</span>
                  </td>
                </tr>
              ) : universities.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[var(--muted-text-color)]">
                    No universities found matching your filter criteria.
                  </td>
                </tr>
              ) : (
                universities.map((univ) => (
                  <tr key={univ.id} className="hover:bg-[var(--surface-muted)]/50 transition">
                    <td className="py-3.5 px-4 font-semibold text-[var(--title-color)]">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[var(--secondary-color)] text-[#82c341] font-bold text-xs flex items-center justify-center shrink-0">
                          {univ.code.substring(0, 3)}
                        </div>
                        <div>
                          <Link
                            href={`/universities/${univ.id}`}
                            className="font-bold text-[var(--title-color)] hover:underline"
                          >
                            {univ.name}
                          </Link>
                          {univ.website && (
                            <p className="text-[11px] text-[var(--muted-text-color)] font-normal flex items-center gap-1 mt-0.5">
                              <Globe className="w-3 h-3 text-[#838383]" />
                              <span>{univ.website}</span>
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-[var(--title-color)]">
                      {univ.code}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 bg-[var(--surface-muted)] text-[var(--title-color)] rounded border border-[var(--border-color)] font-medium">
                        {univ.type}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <UniversityStatusBadge isActive={univ.is_active} />
                    </td>
                    <td className="py-3.5 px-4 text-[var(--paragraph-color)]">
                      {univ.institutions_count ?? 0} affiliated
                    </td>
                    <td className="py-3.5 px-4 text-[var(--muted-text-color)]">
                      {new Date(univ.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/universities/${univ.id}`}
                          className="btn-secondary text-[11px] py-1 px-2.5 flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Details</span>
                        </Link>

                        {univ.is_active ? (
                          <button
                            onClick={() =>
                              setConfirmStatusModal({
                                isOpen: true,
                                univ,
                                action: "suspend",
                              })
                            }
                            className="btn-danger text-[11px] py-1 px-2.5 flex items-center gap-1"
                          >
                            <ShieldAlert className="w-3.5 h-3.5" />
                            <span>Suspend</span>
                          </button>
                        ) : (
                          <button
                            onClick={() =>
                              setConfirmStatusModal({
                                isOpen: true,
                                univ,
                                action: "activate",
                              })
                            }
                            className="btn-primary text-[11px] py-1 px-2.5 flex items-center gap-1"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>Activate</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Creation Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Provision New University Tenant"
        subtitle="Create an academic organization with immediate tenant governance"
        maxWidth="3xl"
      >
        <div className="space-y-4">
          {/* Mode Switcher */}
          <div className="flex border-b border-[var(--border-color)] pb-3 gap-4">
            <button
              type="button"
              onClick={() => setCreationMode("with-admin")}
              className={`text-xs font-bold pb-1 transition border-b-2 flex items-center gap-1.5 ${
                creationMode === "with-admin"
                  ? "border-[#82c341] text-[var(--title-color)]"
                  : "border-transparent text-[var(--muted-text-color)] hover:text-[var(--title-color)]"
              }`}
            >
              <UserCheck className="w-4 h-4 text-[#82c341]" />
              <span>Quick Create with University Admin (Atomic)</span>
            </button>
            <button
              type="button"
              onClick={() => setCreationMode("standard")}
              className={`text-xs font-bold pb-1 transition border-b-2 flex items-center gap-1.5 ${
                creationMode === "standard"
                  ? "border-[#82c341] text-[var(--title-color)]"
                  : "border-transparent text-[var(--muted-text-color)] hover:text-[var(--title-color)]"
              }`}
            >
              <Building2 className="w-4 h-4 text-[#45525b]" />
              <span>Standard University Entity</span>
            </button>
          </div>

          {creationMode === "with-admin" ? (
            <form onSubmit={handleCreateWithAdmin} className="space-y-4">
              <div className="bg-[#eaf5de]/50 p-3 rounded-[var(--radius-md)] border border-[#82c341]/40 text-xs text-[#325816]">
                This atomic transaction will create the University, provision its UniversityTheme, and create an initial <strong>UNIVERSITY_ADMIN</strong> account in one safe operation.
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[var(--title-color)] mb-1">
                    University Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Apex State Technical University"
                    value={withAdminForm.name}
                    onChange={(e) => setWithAdminForm({ ...withAdminForm, name: e.target.value })}
                    className="input-theme w-full"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--title-color)] mb-1">
                    University Code / Acronym *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ASTU"
                    value={withAdminForm.code}
                    onChange={(e) =>
                      setWithAdminForm({ ...withAdminForm, code: e.target.value.toUpperCase() })
                    }
                    className="input-theme w-full font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--title-color)] mb-1">
                    University Type *
                  </label>
                  <select
                    value={withAdminForm.type}
                    onChange={(e) => setWithAdminForm({ ...withAdminForm, type: e.target.value })}
                    className="input-theme w-full"
                  >
                    <option value="STATE">State University</option>
                    <option value="CENTRAL">Central University</option>
                    <option value="DEEMED">Deemed University</option>
                    <option value="PRIVATE">Private University</option>
                    <option value="AUTONOMOUS">Autonomous Institute</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--title-color)] mb-1">State / Province</label>
                  <input
                    type="text"
                    placeholder="e.g. Maharashtra"
                    value={withAdminForm.state}
                    onChange={(e) => setWithAdminForm({ ...withAdminForm, state: e.target.value })}
                    className="input-theme w-full"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--title-color)] mb-1">Official Website</label>
                  <input
                    type="url"
                    placeholder="https://astu.ac.in"
                    value={withAdminForm.website}
                    onChange={(e) => setWithAdminForm({ ...withAdminForm, website: e.target.value })}
                    className="input-theme w-full"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--title-color)] mb-1">Official Contact Email</label>
                  <input
                    type="email"
                    placeholder="contact@astu.ac.in"
                    value={withAdminForm.email}
                    onChange={(e) => setWithAdminForm({ ...withAdminForm, email: e.target.value })}
                    className="input-theme w-full"
                  />
                </div>
              </div>

              {/* Admin Provisioning Section */}
              <div className="pt-3 border-t border-[var(--border-color)]">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--title-color)] mb-3 flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-[#82c341]" />
                  <span>Initial University Admin Account</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[var(--title-color)] mb-1">
                      Administrator Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Dr. Rajesh Sharma"
                      value={withAdminForm.admin_full_name}
                      onChange={(e) =>
                        setWithAdminForm({ ...withAdminForm, admin_full_name: e.target.value })
                      }
                      className="input-theme w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[var(--title-color)] mb-1">
                      Admin Email (Login ID) *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="admin@astu.ac.in"
                      value={withAdminForm.admin_email}
                      onChange={(e) =>
                        setWithAdminForm({ ...withAdminForm, admin_email: e.target.value })
                      }
                      className="input-theme w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[var(--title-color)] mb-1">
                      Initial Temporary Password (Optional)
                    </label>
                    <input
                      type="password"
                      placeholder="Leave blank for auto-generated password"
                      value={withAdminForm.admin_password}
                      onChange={(e) =>
                        setWithAdminForm({ ...withAdminForm, admin_password: e.target.value })
                      }
                      className="input-theme w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[var(--title-color)] mb-1">
                      Admin Mobile Number
                    </label>
                    <input
                      type="text"
                      placeholder="+91 98765 43210"
                      value={withAdminForm.admin_phone}
                      onChange={(e) =>
                        setWithAdminForm({ ...withAdminForm, admin_phone: e.target.value })
                      }
                      className="input-theme w-full"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary text-xs font-bold shadow"
                >
                  {isSubmitting ? "Provisioning..." : "Provision University & Admin"}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleCreateStandard} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[var(--title-color)] mb-1">
                    University Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Oxford Global University"
                    value={standardForm.name}
                    onChange={(e) => setStandardForm({ ...standardForm, name: e.target.value })}
                    className="input-theme w-full"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--title-color)] mb-1">
                    University Code *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. OGU"
                    value={standardForm.code}
                    onChange={(e) =>
                      setStandardForm({ ...standardForm, code: e.target.value.toUpperCase() })
                    }
                    className="input-theme w-full font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--title-color)] mb-1">
                    Type
                  </label>
                  <select
                    value={standardForm.type}
                    onChange={(e) => setStandardForm({ ...standardForm, type: e.target.value })}
                    className="input-theme w-full"
                  >
                    <option value="STATE">State University</option>
                    <option value="CENTRAL">Central University</option>
                    <option value="DEEMED">Deemed University</option>
                    <option value="PRIVATE">Private University</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--title-color)] mb-1">
                    Website
                  </label>
                  <input
                    type="url"
                    placeholder="https://ogu.edu"
                    value={standardForm.website}
                    onChange={(e) => setStandardForm({ ...standardForm, website: e.target.value })}
                    className="input-theme w-full"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--title-color)] mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    placeholder="info@ogu.edu"
                    value={standardForm.email}
                    onChange={(e) => setStandardForm({ ...standardForm, email: e.target.value })}
                    className="input-theme w-full"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--title-color)] mb-1">
                    Phone
                  </label>
                  <input
                    type="text"
                    placeholder="+91 11 2345 6789"
                    value={standardForm.phone}
                    onChange={(e) => setStandardForm({ ...standardForm, phone: e.target.value })}
                    className="input-theme w-full"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-[var(--title-color)] mb-1">
                    Campus Address
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Physical headquarters or campus address"
                    value={standardForm.address}
                    onChange={(e) => setStandardForm({ ...standardForm, address: e.target.value })}
                    className="input-theme w-full"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary text-xs font-bold shadow"
                >
                  {isSubmitting ? "Creating..." : "Create University Entity"}
                </button>
              </div>
            </form>
          )}
        </div>
      </Modal>

      {/* Status Confirmation Modal (Suspend / Activate) */}
      <Modal
        isOpen={confirmStatusModal.isOpen}
        onClose={() => setConfirmStatusModal({ isOpen: false, univ: null, action: "suspend" })}
        title={confirmStatusModal.action === "suspend" ? "Confirm University Suspension" : "Confirm University Activation"}
        maxWidth="md"
      >
        <div className="space-y-4 text-xs">
          {confirmStatusModal.action === "suspend" ? (
            <>
              <div className="p-3 bg-[#fee2e2] text-[#991b1b] rounded-[var(--radius-md)] border border-[#fecaca] flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Immediate Tenant Lockout Warning</p>
                  <p className="mt-1 leading-relaxed">
                    Suspending <strong>{confirmStatusModal.univ?.name}</strong> will immediately cut off login access and block all API requests for ALL administrators, faculty, HODs, coordinators, and students belonging to this university and its affiliated institutions.
                  </p>
                </div>
              </div>
              <p className="text-[var(--paragraph-color)]">
                Are you sure you want to suspend this university tenant?
              </p>
            </>
          ) : (
            <div className="p-3 bg-[#eaf5de] text-[#325816] rounded-[var(--radius-md)] border border-[#82c341] flex items-start gap-2.5">
              <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Restore Tenant Access</p>
                <p className="mt-1 leading-relaxed">
                  Activating <strong>{confirmStatusModal.univ?.name}</strong> will restore normal platform login and exam generation capabilities for all affiliated users.
                </p>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-3 border-t border-[var(--border-color)]">
            <button
              onClick={() => setConfirmStatusModal({ isOpen: false, univ: null, action: "suspend" })}
              className="btn-secondary text-xs"
            >
              Cancel
            </button>
            <button
              onClick={executeStatusChange}
              className={`text-xs font-bold ${
                confirmStatusModal.action === "suspend" ? "btn-danger" : "btn-primary"
              }`}
            >
              {confirmStatusModal.action === "suspend" ? "Yes, Suspend University" : "Yes, Activate University"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
