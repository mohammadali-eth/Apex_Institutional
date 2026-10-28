"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useUniversityTheme, DEFAULT_THEME } from "@/lib/theme-context";
import { useToast } from "@/components/ui/Toast";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Organization, Department, Program, Semester, Subject, UniversityTheme } from "@/lib/types";
import {
  Building2,
  GraduationCap,
  BookOpen,
  Plus,
  Layers,
  Filter,
  Palette,
  RotateCcw,
  Save,
  CheckCircle2,
  School,
  Sparkles,
  ExternalLink,
} from "lucide-react";

export default function AcademicStructurePage() {
  const { hasPermission, user } = useAuth();
  const { theme: currentTheme, applyLivePreview, resetToDefaultTheme, saveTheme } = useUniversityTheme();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<"universities" | "institutions" | "departments" | "programs" | "subjects" | "theme_editor">("universities");

  const [universities, setUniversities] = useState<Organization[]>([]);
  const [institutions, setInstitutions] = useState<Organization[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter state
  const [selectedProgramId, setSelectedProgramId] = useState<string>("");

  // Modals state
  const [univModalOpen, setUnivModalOpen] = useState(false);
  const [instModalOpen, setInstModalOpen] = useState(false);
  const [deptModalOpen, setDeptModalOpen] = useState(false);
  const [subjectModalOpen, setSubjectModalOpen] = useState(false);

  // New University Form
  const [newUniv, setNewUniv] = useState({
    name: "",
    code: "",
    address: "",
    website: "",
    logo_url: "",
  });

  // New Institution Form
  const [newInst, setNewInst] = useState({
    name: "",
    code: "",
    parent_id: "",
    type: "COLLEGE",
    address: "",
    website: "",
    logo_url: "",
  });

  // New Department Form
  const [newDept, setNewDept] = useState({
    name: "",
    code: "",
    organization_id: "",
    description: "",
  });

  // New Subject Form
  const [newSubject, setNewSubject] = useState({
    code: "",
    name: "",
    credits: 4,
    description: "",
    semester_id: "",
  });

  // Theme Editor State
  const [selectedThemeUnivId, setSelectedThemeUnivId] = useState<string>("");
  const [editedTheme, setEditedTheme] = useState<UniversityTheme>(DEFAULT_THEME);
  const [themeSaving, setThemeSaving] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [univsData, instsData, deptsData, progsData, semsData, subjsData] = await Promise.all([
        api.get<Organization[]>("/universities").catch(() => []),
        api.get<Organization[]>("/institutions").catch(() => []),
        api.get<Department[]>("/departments").catch(() => []),
        api.get<Program[]>("/academic/programs").catch(() => []),
        api.get<Semester[]>("/academic/semesters").catch(() => []),
        api.get<Subject[]>("/academic/subjects").catch(() => []),
      ]);

      setUniversities(univsData);
      setInstitutions(instsData);
      setDepartments(deptsData);
      setPrograms(progsData);
      setSemesters(semsData);
      setSubjects(subjsData);

      if (univsData.length > 0 && !selectedThemeUnivId) {
        setSelectedThemeUnivId(univsData[0].id);
        if (univsData[0].theme) {
          setEditedTheme(univsData[0].theme);
        }
      }

      if (semsData.length > 0 && !newSubject.semester_id) {
        setNewSubject((prev) => ({ ...prev, semester_id: semsData[0].id }));
      }
      if (univsData.length > 0 && !newInst.parent_id) {
        setNewInst((prev) => ({ ...prev, parent_id: univsData[0].id }));
      }
      if (univsData.length > 0 && !newDept.organization_id) {
        setNewDept((prev) => ({ ...prev, organization_id: univsData[0].id }));
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load academic data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUniversityChangeForTheme = async (univId: string) => {
    setSelectedThemeUnivId(univId);
    try {
      const fetched = await api.get<UniversityTheme>(`/themes/${univId}`);
      if (fetched) {
        setEditedTheme(fetched);
      }
    } catch {
      setEditedTheme(DEFAULT_THEME);
    }
  };

  const handleCreateUniversity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUniv.code || !newUniv.name) {
      toast.error("Please enter university name and code");
      return;
    }
    try {
      await api.post("/universities", newUniv);
      toast.success(`University ${newUniv.name} registered successfully!`);
      setUnivModalOpen(false);
      setNewUniv({ name: "", code: "", address: "", website: "", logo_url: "" });
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to create university");
    }
  };

  const handleCreateInstitution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInst.code || !newInst.name || !newInst.parent_id) {
      toast.error("Please select parent university, code, and name");
      return;
    }
    try {
      await api.post("/institutions", newInst);
      toast.success(`Institution ${newInst.name} registered successfully!`);
      setInstModalOpen(false);
      setNewInst({ name: "", code: "", parent_id: universities[0]?.id || "", type: "COLLEGE", address: "", website: "", logo_url: "" });
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to create institution");
    }
  };

  const handleCreateDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDept.code || !newDept.name || !newDept.organization_id) {
      toast.error("Please fill in department code, name, and organization");
      return;
    }
    try {
      await api.post("/departments", newDept);
      toast.success(`Department ${newDept.name} created successfully!`);
      setDeptModalOpen(false);
      setNewDept({ name: "", code: "", organization_id: universities[0]?.id || "", description: "" });
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to create department");
    }
  };

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubject.code || !newSubject.name || !newSubject.semester_id) {
      toast.error("Please fill in subject code, name, and semester");
      return;
    }
    try {
      await api.post("/academic/subjects", newSubject);
      toast.success(`Subject ${newSubject.code} created successfully!`);
      setSubjectModalOpen(false);
      setNewSubject({ code: "", name: "", credits: 4, description: "", semester_id: semesters[0]?.id || "" });
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to create subject");
    }
  };

  const handleThemeColorChange = (key: keyof UniversityTheme, value: string) => {
    const updated = { ...editedTheme, [key]: value };
    setEditedTheme(updated);
  };

  const handleApplyLivePreview = () => {
    applyLivePreview(editedTheme);
    toast.success("Live preview applied to application layout!");
  };

  const handleResetTheme = async () => {
    if (!selectedThemeUnivId) return;
    try {
      await resetToDefaultTheme(selectedThemeUnivId);
      setEditedTheme(DEFAULT_THEME);
      toast.success("Theme reset to standard system defaults!");
    } catch (err: any) {
      toast.error(err.message || "Failed to reset theme");
    }
  };

  const handleSaveTheme = async () => {
    if (!selectedThemeUnivId) {
      toast.error("Please select a university");
      return;
    }
    setThemeSaving(true);
    try {
      const saved = await saveTheme(selectedThemeUnivId, editedTheme);
      setEditedTheme(saved);
      toast.success("University theme saved and activated permanently!");
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to save theme");
    } finally {
      setThemeSaving(false);
    }
  };

  const filteredSubjects = subjects.filter((s) => {
    if (selectedProgramId && s.program_name) {
      const prog = programs.find((p) => p.id === selectedProgramId);
      if (prog && s.program_name !== prog.name) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Academic Hierarchy & Theme Management"
        description="Manage universities, affiliated institutions, departments, programs, subjects, and customized university branding"
        actions={
          <div className="flex gap-2">
            {activeTab === "universities" && hasPermission("university.create") && (
              <button onClick={() => setUnivModalOpen(true)} className="btn-primary flex items-center gap-1.5 text-xs">
                <Plus size={16} /> Add University
              </button>
            )}
            {activeTab === "institutions" && hasPermission("institution.create") && (
              <button onClick={() => setInstModalOpen(true)} className="btn-primary flex items-center gap-1.5 text-xs">
                <Plus size={16} /> Add Institution / College
              </button>
            )}
            {activeTab === "departments" && hasPermission("department.create") && (
              <button onClick={() => setDeptModalOpen(true)} className="btn-primary flex items-center gap-1.5 text-xs">
                <Plus size={16} /> Add Department
              </button>
            )}
            {activeTab === "subjects" && hasPermission("subject.create") && (
              <button onClick={() => setSubjectModalOpen(true)} className="btn-primary flex items-center gap-1.5 text-xs">
                <Plus size={16} /> Add Subject
              </button>
            )}
          </div>
        }
      />

      {/* TABS NAVIGATION */}
      <div className="flex border-b border-[var(--border-color)] gap-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab("universities")}
          className={`px-4 py-2.5 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
            activeTab === "universities"
              ? "border-[var(--primary-color)] text-[var(--title-color)]"
              : "border-transparent text-[var(--font-color)] hover:text-[var(--title-color)]"
          }`}
        >
          <School size={15} /> Universities ({universities.length})
        </button>

        <button
          onClick={() => setActiveTab("institutions")}
          className={`px-4 py-2.5 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
            activeTab === "institutions"
              ? "border-[var(--primary-color)] text-[var(--title-color)]"
              : "border-transparent text-[var(--font-color)] hover:text-[var(--title-color)]"
          }`}
        >
          <Building2 size={15} /> Affiliated Colleges & Institutions ({institutions.length})
        </button>

        <button
          onClick={() => setActiveTab("departments")}
          className={`px-4 py-2.5 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
            activeTab === "departments"
              ? "border-[var(--primary-color)] text-[var(--title-color)]"
              : "border-transparent text-[var(--font-color)] hover:text-[var(--title-color)]"
          }`}
        >
          <Layers size={15} /> Departments ({departments.length})
        </button>

        <button
          onClick={() => setActiveTab("programs")}
          className={`px-4 py-2.5 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
            activeTab === "programs"
              ? "border-[var(--primary-color)] text-[var(--title-color)]"
              : "border-transparent text-[var(--font-color)] hover:text-[var(--title-color)]"
          }`}
        >
          <GraduationCap size={15} /> Programs ({programs.length})
        </button>

        <button
          onClick={() => setActiveTab("subjects")}
          className={`px-4 py-2.5 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
            activeTab === "subjects"
              ? "border-[var(--primary-color)] text-[var(--title-color)]"
              : "border-transparent text-[var(--font-color)] hover:text-[var(--title-color)]"
          }`}
        >
          <BookOpen size={15} /> Subjects ({subjects.length})
        </button>

        <button
          onClick={() => setActiveTab("theme_editor")}
          className={`px-4 py-2.5 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
            activeTab === "theme_editor"
              ? "border-[var(--primary-color)] text-[var(--title-color)]"
              : "border-transparent text-[var(--font-color)] hover:text-[var(--title-color)]"
          }`}
        >
          <Palette size={15} /> University Theme Editor
        </button>
      </div>

      {/* 1. UNIVERSITIES TAB */}
      {activeTab === "universities" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center text-xs text-[var(--paragraph-color)]">
            <span>Managing {universities.length} registered universities with multi-tenant isolation.</span>
          </div>

          {loading ? (
            <div className="p-8 text-center text-xs text-[var(--font-color)]">Loading universities...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {universities.map((u) => (
                <div key={u.id} className="bg-[var(--surface-color)] p-5 rounded-[var(--radius-lg)] border border-[var(--border-color)] shadow-[var(--shadow-sm)] flex flex-col justify-between space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        {u.logo_url ? (
                          <img src={u.logo_url} alt={u.name} className="w-8 h-8 rounded object-cover border border-[var(--border-color)]" />
                        ) : (
                          <div className="w-8 h-8 rounded bg-[var(--background-color)] flex items-center justify-center text-[var(--secondary-color)]">
                            <School size={16} />
                          </div>
                        )}
                        <div>
                          <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider">
                            UNIVERSITY
                          </Badge>
                        </div>
                      </div>
                      <Badge variant={u.is_active ? "success" : "secondary"}>
                        {u.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>

                    <h4 className="font-bold text-[var(--title-color)] text-base">{u.name}</h4>
                    <p className="text-xs text-[var(--paragraph-color)] font-mono">{u.code}</p>
                    <p className="text-xs text-[var(--font-color)] line-clamp-2">{u.address || "Main University Campus"}</p>
                  </div>

                  <div className="pt-3 border-t border-[var(--border-color)] flex items-center justify-between text-xs text-[var(--paragraph-color)]">
                    <div className="flex gap-3">
                      <span><b>{u.institutions_count || 0}</b> Colleges</span>
                      <span><b>{u.departments_count || 0}</b> Depts</span>
                    </div>
                    {u.website && (
                      <a href={u.website} target="_blank" rel="noreferrer" className="text-[var(--secondary-color)] hover:text-[var(--primary-color)] flex items-center gap-1 font-medium">
                        Visit <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 2. INSTITUTIONS TAB */}
      {activeTab === "institutions" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center text-xs text-[var(--paragraph-color)]">
            <span>Managing {institutions.length} affiliated colleges, research centres, and constituent schools.</span>
          </div>

          {loading ? (
            <div className="p-8 text-center text-xs text-[var(--font-color)]">Loading institutions...</div>
          ) : institutions.length === 0 ? (
            <div className="p-8 text-center bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] text-xs text-[var(--font-color)]">
              No affiliated institutions found. Click "Add Institution / College" to register one.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {institutions.map((inst) => (
                <div key={inst.id} className="bg-[var(--surface-color)] p-5 rounded-[var(--radius-lg)] border border-[var(--border-color)] shadow-[var(--shadow-sm)] flex flex-col justify-between space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <Badge variant="outline" className="text-[10px] font-bold uppercase">
                        {inst.type}
                      </Badge>
                      <Badge variant={inst.is_active ? "success" : "secondary"}>
                        {inst.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>

                    <h4 className="font-bold text-[var(--title-color)] text-base">{inst.name}</h4>
                    <p className="text-xs text-[var(--paragraph-color)] font-mono">{inst.code}</p>
                    {inst.parent_name && (
                      <p className="text-xs text-[var(--secondary-color)] font-medium">Affiliated to: {inst.parent_name}</p>
                    )}
                    <p className="text-xs text-[var(--font-color)]">{inst.address || "Campus Address"}</p>
                  </div>

                  <div className="pt-3 border-t border-[var(--border-color)] flex items-center justify-between text-xs text-[var(--paragraph-color)]">
                    <span><b>{inst.departments_count || 0}</b> Departments</span>
                    {inst.website && (
                      <a href={inst.website} target="_blank" rel="noreferrer" className="text-[var(--secondary-color)] hover:text-[var(--primary-color)] flex items-center gap-1 font-medium">
                        Portal <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 3. DEPARTMENTS TAB */}
      {activeTab === "departments" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {departments.map((dept) => (
              <div key={dept.id} className="bg-[var(--surface-color)] p-5 rounded-[var(--radius-lg)] border border-[var(--border-color)] shadow-[var(--shadow-sm)] space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs font-mono text-[var(--font-color)] font-semibold">{dept.code}</span>
                    <h4 className="font-bold text-[var(--title-color)] text-base mt-1">{dept.name}</h4>
                    {dept.organization_name && (
                      <p className="text-xs text-[var(--secondary-color)] font-medium mt-0.5">{dept.organization_name}</p>
                    )}
                  </div>
                  <Badge variant={dept.is_active ? "success" : "secondary"}>
                    {dept.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <p className="text-xs text-[var(--paragraph-color)] line-clamp-2">{dept.description || "Academic department"}</p>
                <div className="pt-3 border-t border-[var(--border-color)] text-xs text-[var(--paragraph-color)]">
                  <span><b>Programs:</b> {dept.programs_count ?? 0}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. PROGRAMS TAB */}
      {activeTab === "programs" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {programs.map((prog) => (
              <div key={prog.id} className="bg-[var(--surface-color)] p-5 rounded-[var(--radius-lg)] border border-[var(--border-color)] shadow-[var(--shadow-sm)] space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <Badge variant="outline" className="text-[10px] font-bold uppercase">{prog.degree_level}</Badge>
                    <h4 className="font-bold text-[var(--title-color)] text-base mt-1.5">{prog.name} ({prog.code})</h4>
                    <p className="text-xs text-[var(--paragraph-color)] mt-0.5">{prog.department_name}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-[var(--paragraph-color)] pt-3 border-t border-[var(--border-color)]">
                  <span><b>Total Semesters:</b> {prog.total_semesters}</span>
                  <Badge variant={prog.is_active ? "success" : "secondary"}>{prog.is_active ? "Active" : "Archived"}</Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. SUBJECTS TAB */}
      {activeTab === "subjects" && (
        <div className="space-y-4">
          <div className="bg-[var(--surface-color)] p-4 rounded-[var(--radius-md)] border border-[var(--border-color)] flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-[var(--font-color)]" />
              <span className="text-xs font-bold text-[var(--title-color)]">Filter by Program:</span>
              <select
                value={selectedProgramId}
                onChange={(e) => setSelectedProgramId(e.target.value)}
                className="input-theme text-xs py-1.5 bg-white"
              >
                <option value="">All Programs ({subjects.length} subjects)</option>
                {programs.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
                ))}
              </select>
            </div>
            <span className="text-xs text-[var(--font-color)]">
              Showing <b>{filteredSubjects.length}</b> subjects
            </span>
          </div>

          <div className="bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] shadow-[var(--shadow-sm)] overflow-hidden">
            <table className="table-theme w-full text-left text-xs">
              <thead>
                <tr>
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Subject Name</th>
                  <th className="py-3 px-4">Program & Semester</th>
                  <th className="py-3 px-4 text-center">Credits</th>
                  <th className="py-3 px-4 text-center">Units</th>
                  <th className="py-3 px-4 text-center">Questions</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubjects.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-[var(--font-color)]">
                      No subjects match selected filter.
                    </td>
                  </tr>
                ) : (
                  filteredSubjects.map((s) => (
                    <tr key={s.id} className="hover:bg-[var(--background-color)]/60">
                      <td className="py-3 px-4 font-mono font-bold text-[var(--secondary-color)]">{s.code}</td>
                      <td className="py-3 px-4 font-semibold text-[var(--title-color)]">{s.name}</td>
                      <td className="py-3 px-4 text-[var(--paragraph-color)]">
                        {s.program_name} • {s.semester_name}
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-[var(--title-color)]">{s.credits}</td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-0.5 rounded-full bg-[var(--background-color)] font-semibold text-[var(--title-color)]">
                          {s.units_count ?? 0}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-0.5 rounded-full bg-[#eaf5de] font-semibold text-[#325816]">
                          {s.questions_count ?? 0}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge variant={s.is_active ? "success" : "secondary"}>
                          {s.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. UNIVERSITY THEME EDITOR TAB */}
      {activeTab === "theme_editor" && (
        <div className="space-y-6">
          <div className="bg-[var(--surface-color)] p-5 rounded-[var(--radius-lg)] border border-[var(--border-color)] space-y-4">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
              <div>
                <h3 className="text-base font-bold text-[var(--title-color)] flex items-center gap-2">
                  <Palette size={18} className="text-[var(--primary-color)]" />
                  University Branding & Dynamic Theme Editor
                </h3>
                <p className="text-xs text-[var(--paragraph-color)] mt-1">
                  Configure custom institution brand colors, typography shades, and logos. Changes persist to PostgreSQL and dynamically propagate to authenticated users.
                </p>
              </div>

              {/* University Selector */}
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-[var(--title-color)] whitespace-nowrap">Target University:</label>
                <select
                  value={selectedThemeUnivId}
                  onChange={(e) => handleUniversityChangeForTheme(e.target.value)}
                  className="input-theme text-xs py-1.5 bg-white font-medium min-w-[200px]"
                >
                  {universities.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* COLOR CONTROLS GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-3 border-t border-[var(--border-color)]">
              {/* Primary Color */}
              <div className="p-3 bg-[var(--background-color)] rounded-[var(--radius-md)] border border-[var(--border-color)] space-y-1.5">
                <label className="text-xs font-bold text-[var(--title-color)] flex justify-between items-center">
                  <span>Primary Brand Color</span>
                  <span className="font-mono text-[10px] text-[var(--font-color)]">--primary-color</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={editedTheme.primary_color}
                    onChange={(e) => handleThemeColorChange("primary_color", e.target.value)}
                    className="w-9 h-9 rounded cursor-pointer border border-gray-300 p-0.5"
                  />
                  <input
                    type="text"
                    value={editedTheme.primary_color}
                    onChange={(e) => handleThemeColorChange("primary_color", e.target.value)}
                    className="input-theme text-xs font-mono uppercase flex-1"
                  />
                </div>
                <p className="text-[10px] text-[var(--paragraph-color)]">Key accents, active tabs, primary actions</p>
              </div>

              {/* Secondary Color */}
              <div className="p-3 bg-[var(--background-color)] rounded-[var(--radius-md)] border border-[var(--border-color)] space-y-1.5">
                <label className="text-xs font-bold text-[var(--title-color)] flex justify-between items-center">
                  <span>Secondary Color</span>
                  <span className="font-mono text-[10px] text-[var(--font-color)]">--secondary-color</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={editedTheme.secondary_color}
                    onChange={(e) => handleThemeColorChange("secondary_color", e.target.value)}
                    className="w-9 h-9 rounded cursor-pointer border border-gray-300 p-0.5"
                  />
                  <input
                    type="text"
                    value={editedTheme.secondary_color}
                    onChange={(e) => handleThemeColorChange("secondary_color", e.target.value)}
                    className="input-theme text-xs font-mono uppercase flex-1"
                  />
                </div>
                <p className="text-[10px] text-[var(--paragraph-color)]">Sidebar headers, secondary buttons, badges</p>
              </div>

              {/* Application Background */}
              <div className="p-3 bg-[var(--background-color)] rounded-[var(--radius-md)] border border-[var(--border-color)] space-y-1.5">
                <label className="text-xs font-bold text-[var(--title-color)] flex justify-between items-center">
                  <span>App Background</span>
                  <span className="font-mono text-[10px] text-[var(--font-color)]">--background-color</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={editedTheme.background_color}
                    onChange={(e) => handleThemeColorChange("background_color", e.target.value)}
                    className="w-9 h-9 rounded cursor-pointer border border-gray-300 p-0.5"
                  />
                  <input
                    type="text"
                    value={editedTheme.background_color}
                    onChange={(e) => handleThemeColorChange("background_color", e.target.value)}
                    className="input-theme text-xs font-mono uppercase flex-1"
                  />
                </div>
                <p className="text-[10px] text-[var(--paragraph-color)]">Base page background behind card surfaces</p>
              </div>

              {/* Title / Heading Color */}
              <div className="p-3 bg-[var(--background-color)] rounded-[var(--radius-md)] border border-[var(--border-color)] space-y-1.5">
                <label className="text-xs font-bold text-[var(--title-color)] flex justify-between items-center">
                  <span>Title & Heading Color</span>
                  <span className="font-mono text-[10px] text-[var(--font-color)]">--title-color</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={editedTheme.title_color}
                    onChange={(e) => handleThemeColorChange("title_color", e.target.value)}
                    className="w-9 h-9 rounded cursor-pointer border border-gray-300 p-0.5"
                  />
                  <input
                    type="text"
                    value={editedTheme.title_color}
                    onChange={(e) => handleThemeColorChange("title_color", e.target.value)}
                    className="input-theme text-xs font-mono uppercase flex-1"
                  />
                </div>
                <p className="text-[10px] text-[var(--paragraph-color)]">High-contrast headings, modal titles, table headers</p>
              </div>

              {/* Paragraph Color */}
              <div className="p-3 bg-[var(--background-color)] rounded-[var(--radius-md)] border border-[var(--border-color)] space-y-1.5">
                <label className="text-xs font-bold text-[var(--title-color)] flex justify-between items-center">
                  <span>Paragraph Color</span>
                  <span className="font-mono text-[10px] text-[var(--font-color)]">--paragraph-color</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={editedTheme.paragraph_color}
                    onChange={(e) => handleThemeColorChange("paragraph_color", e.target.value)}
                    className="w-9 h-9 rounded cursor-pointer border border-gray-300 p-0.5"
                  />
                  <input
                    type="text"
                    value={editedTheme.paragraph_color}
                    onChange={(e) => handleThemeColorChange("paragraph_color", e.target.value)}
                    className="input-theme text-xs font-mono uppercase flex-1"
                  />
                </div>
                <p className="text-[10px] text-[var(--paragraph-color)]">Body explanations, subtitles, instructions</p>
              </div>

              {/* Font / Muted Color */}
              <div className="p-3 bg-[var(--background-color)] rounded-[var(--radius-md)] border border-[var(--border-color)] space-y-1.5">
                <label className="text-xs font-bold text-[var(--title-color)] flex justify-between items-center">
                  <span>Muted Font Color</span>
                  <span className="font-mono text-[10px] text-[var(--font-color)]">--font-color</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={editedTheme.font_color}
                    onChange={(e) => handleThemeColorChange("font_color", e.target.value)}
                    className="w-9 h-9 rounded cursor-pointer border border-gray-300 p-0.5"
                  />
                  <input
                    type="text"
                    value={editedTheme.font_color}
                    onChange={(e) => handleThemeColorChange("font_color", e.target.value)}
                    className="input-theme text-xs font-mono uppercase flex-1"
                  />
                </div>
                <p className="text-[10px] text-[var(--paragraph-color)]">Labels, timestamps, placeholder text</p>
              </div>

              {/* Border / Accent Text Color */}
              <div className="p-3 bg-[var(--background-color)] rounded-[var(--radius-md)] border border-[var(--border-color)] space-y-1.5">
                <label className="text-xs font-bold text-[var(--title-color)] flex justify-between items-center">
                  <span>Border & Muted BG</span>
                  <span className="font-mono text-[10px] text-[var(--font-color)]">--bg-text-color</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={editedTheme.bg_text_color}
                    onChange={(e) => handleThemeColorChange("bg_text_color", e.target.value)}
                    className="w-9 h-9 rounded cursor-pointer border border-gray-300 p-0.5"
                  />
                  <input
                    type="text"
                    value={editedTheme.bg_text_color}
                    onChange={(e) => handleThemeColorChange("bg_text_color", e.target.value)}
                    className="input-theme text-xs font-mono uppercase flex-1"
                  />
                </div>
                <p className="text-[10px] text-[var(--paragraph-color)]">Card divider lines, input borders</p>
              </div>

              {/* Background Title Surface */}
              <div className="p-3 bg-[var(--background-color)] rounded-[var(--radius-md)] border border-[var(--border-color)] space-y-1.5">
                <label className="text-xs font-bold text-[var(--title-color)] flex justify-between items-center">
                  <span>Surface Background</span>
                  <span className="font-mono text-[10px] text-[var(--font-color)]">--bg-title-color</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={editedTheme.bg_title_color}
                    onChange={(e) => handleThemeColorChange("bg_title_color", e.target.value)}
                    className="w-9 h-9 rounded cursor-pointer border border-gray-300 p-0.5"
                  />
                  <input
                    type="text"
                    value={editedTheme.bg_title_color}
                    onChange={(e) => handleThemeColorChange("bg_title_color", e.target.value)}
                    className="input-theme text-xs font-mono uppercase flex-1"
                  />
                </div>
                <p className="text-[10px] text-[var(--paragraph-color)]">Elevated card surfaces and header backgrounds</p>
              </div>
            </div>

            {/* BANNER AND LOGO INPUTS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-[var(--border-color)]">
              <div>
                <label className="block text-xs font-bold text-[var(--title-color)] mb-1">Custom Portal Banner Text</label>
                <input
                  type="text"
                  placeholder="e.g. Apex Central University Examination Portal"
                  value={editedTheme.login_banner_text || ""}
                  onChange={(e) => handleThemeColorChange("login_banner_text", e.target.value)}
                  className="input-theme w-full text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[var(--title-color)] mb-1">University Logo URL</label>
                <input
                  type="text"
                  placeholder="https://.../logo.png"
                  value={editedTheme.logo_url || ""}
                  onChange={(e) => handleThemeColorChange("logo_url", e.target.value)}
                  className="input-theme w-full text-xs font-mono"
                />
              </div>
            </div>

            {/* LIVE PREVIEW CARD */}
            <div className="pt-4 border-t border-[var(--border-color)] space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--font-color)] flex items-center gap-1.5">
                  <Sparkles size={14} className="text-[var(--primary-color)]" />
                  Live Theme Interactive Preview
                </h4>
                <span className="text-[10px] text-[var(--font-color)] font-mono">Isolated CSS variable demo</span>
              </div>

              <div
                className="p-6 rounded-[var(--radius-lg)] border shadow-sm transition-all space-y-4"
                style={{
                  backgroundColor: editedTheme.background_color,
                  borderColor: editedTheme.bg_text_color,
                }}
              >
                <div
                  className="p-4 rounded-[var(--radius-md)] border space-y-3"
                  style={{
                    backgroundColor: "#ffffff",
                    borderColor: editedTheme.bg_text_color,
                  }}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <h4
                        className="text-base font-bold"
                        style={{ color: editedTheme.title_color }}
                      >
                        {editedTheme.login_banner_text || "University Question Paper Management System"}
                      </h4>
                      <p
                        className="text-xs mt-0.5"
                        style={{ color: editedTheme.paragraph_color }}
                      >
                        Sample assessment module preview with live theme configuration
                      </p>
                    </div>
                    <span
                      className="px-2.5 py-1 rounded text-xs font-bold"
                      style={{
                        backgroundColor: editedTheme.primary_color,
                        color: "#000000",
                      }}
                    >
                      Active Theme
                    </span>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      className="px-4 py-2 rounded text-xs font-bold shadow-sm"
                      style={{
                        backgroundColor: editedTheme.primary_color,
                        color: "#000000",
                      }}
                    >
                      Primary Button
                    </button>
                    <button
                      type="button"
                      className="px-4 py-2 rounded text-xs font-semibold text-white shadow-sm"
                      style={{
                        backgroundColor: editedTheme.secondary_color,
                      }}
                    >
                      Secondary Button
                    </button>
                    <button
                      type="button"
                      className="px-4 py-2 rounded text-xs font-medium border"
                      style={{
                        borderColor: editedTheme.bg_text_color,
                        color: editedTheme.title_color,
                        backgroundColor: editedTheme.bg_title_color,
                      }}
                    >
                      Outline Surface
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* ACTION BUTTONS */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[var(--border-color)]">
              <button
                type="button"
                onClick={handleResetTheme}
                className="btn-secondary text-xs flex items-center gap-1.5"
              >
                <RotateCcw size={14} /> Reset System Defaults (#82c341)
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleApplyLivePreview}
                  className="btn-secondary text-xs flex items-center gap-1.5"
                >
                  <Sparkles size={14} /> Preview on Entire App
                </button>

                <button
                  type="button"
                  onClick={handleSaveTheme}
                  disabled={themeSaving}
                  className="btn-primary text-xs flex items-center gap-1.5"
                >
                  <Save size={14} /> {themeSaving ? "Saving..." : "Save University Theme"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREATE UNIVERSITY MODAL */}
      <Modal
        isOpen={univModalOpen}
        onClose={() => setUnivModalOpen(false)}
        title="Add New University"
        subtitle="Register a new parent university with tenant isolation"
        maxWidth="md"
      >
        <form onSubmit={handleCreateUniversity} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[var(--title-color)] mb-1">University Code *</label>
              <input
                type="text"
                placeholder="e.g. APEX_UNIV"
                value={newUniv.code}
                onChange={(e) => setNewUniv({ ...newUniv, code: e.target.value.toUpperCase() })}
                required
                className="input-theme w-full"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--title-color)] mb-1">University Name *</label>
              <input
                type="text"
                placeholder="e.g. Apex Central University"
                value={newUniv.name}
                onChange={(e) => setNewUniv({ ...newUniv, name: e.target.value })}
                required
                className="input-theme w-full"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--title-color)] mb-1">Campus Address</label>
            <input
              type="text"
              placeholder="e.g. University Hills, Knowledge Corridor"
              value={newUniv.address}
              onChange={(e) => setNewUniv({ ...newUniv, address: e.target.value })}
              className="input-theme w-full"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[var(--title-color)] mb-1">Website URL</label>
              <input
                type="url"
                placeholder="https://university.edu"
                value={newUniv.website}
                onChange={(e) => setNewUniv({ ...newUniv, website: e.target.value })}
                className="input-theme w-full"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--title-color)] mb-1">Logo URL</label>
              <input
                type="url"
                placeholder="https://.../logo.png"
                value={newUniv.logo_url}
                onChange={(e) => setNewUniv({ ...newUniv, logo_url: e.target.value })}
                className="input-theme w-full"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border-color)]">
            <button type="button" onClick={() => setUnivModalOpen(false)} className="btn-secondary text-xs">Cancel</button>
            <button type="submit" className="btn-primary text-xs">Create University</button>
          </div>
        </form>
      </Modal>

      {/* CREATE INSTITUTION MODAL */}
      <Modal
        isOpen={instModalOpen}
        onClose={() => setInstModalOpen(false)}
        title="Add New Institution / College"
        subtitle="Register an affiliated college or institute under a university"
        maxWidth="md"
      >
        <form onSubmit={handleCreateInstitution} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[var(--title-color)] mb-1">Parent University *</label>
            <select
              value={newInst.parent_id}
              onChange={(e) => setNewInst({ ...newInst, parent_id: e.target.value })}
              required
              className="input-theme w-full bg-white"
            >
              {universities.map((u) => (
                <option key={u.id} value={u.id}>{u.name} ({u.code})</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[var(--title-color)] mb-1">Institution Code *</label>
              <input
                type="text"
                placeholder="e.g. ACET_COLLEGE"
                value={newInst.code}
                onChange={(e) => setNewInst({ ...newInst, code: e.target.value.toUpperCase() })}
                required
                className="input-theme w-full"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--title-color)] mb-1">Institution Type</label>
              <select
                value={newInst.type}
                onChange={(e) => setNewInst({ ...newInst, type: e.target.value })}
                className="input-theme w-full bg-white"
              >
                <option value="COLLEGE">Constituent College</option>
                <option value="INSTITUTE">Research Institute</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--title-color)] mb-1">Institution Name *</label>
            <input
              type="text"
              placeholder="e.g. Apex College of Engineering & Technology"
              value={newInst.name}
              onChange={(e) => setNewInst({ ...newInst, name: e.target.value })}
              required
              className="input-theme w-full"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--title-color)] mb-1">Address</label>
            <input
              type="text"
              placeholder="e.g. South Gateway Campus"
              value={newInst.address}
              onChange={(e) => setNewInst({ ...newInst, address: e.target.value })}
              className="input-theme w-full"
            />
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border-color)]">
            <button type="button" onClick={() => setInstModalOpen(false)} className="btn-secondary text-xs">Cancel</button>
            <button type="submit" className="btn-primary text-xs">Create Institution</button>
          </div>
        </form>
      </Modal>

      {/* CREATE DEPARTMENT MODAL */}
      <Modal
        isOpen={deptModalOpen}
        onClose={() => setDeptModalOpen(false)}
        title="Add New Department"
        subtitle="Register an academic department within an institution"
        maxWidth="md"
      >
        <form onSubmit={handleCreateDepartment} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[var(--title-color)] mb-1">Organization / Campus *</label>
            <select
              value={newDept.organization_id}
              onChange={(e) => setNewDept({ ...newDept, organization_id: e.target.value })}
              required
              className="input-theme w-full bg-white"
            >
              <optgroup label="Universities">
                {universities.map((u) => (
                  <option key={u.id} value={u.id}>{u.name} (University Main)</option>
                ))}
              </optgroup>
              {institutions.length > 0 && (
                <optgroup label="Affiliated Colleges">
                  {institutions.map((i) => (
                    <option key={i.id} value={i.id}>{i.name} ({i.code})</option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[var(--title-color)] mb-1">Department Code *</label>
              <input
                type="text"
                placeholder="e.g. CSIT"
                value={newDept.code}
                onChange={(e) => setNewDept({ ...newDept, code: e.target.value.toUpperCase() })}
                required
                className="input-theme w-full"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--title-color)] mb-1">Department Name *</label>
              <input
                type="text"
                placeholder="e.g. Computer Science & IT"
                value={newDept.name}
                onChange={(e) => setNewDept({ ...newDept, name: e.target.value })}
                required
                className="input-theme w-full"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--title-color)] mb-1">Description</label>
            <textarea
              rows={2}
              placeholder="Department domain and overview..."
              value={newDept.description}
              onChange={(e) => setNewDept({ ...newDept, description: e.target.value })}
              className="input-theme w-full text-xs"
            />
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border-color)]">
            <button type="button" onClick={() => setDeptModalOpen(false)} className="btn-secondary text-xs">Cancel</button>
            <button type="submit" className="btn-primary text-xs">Create Department</button>
          </div>
        </form>
      </Modal>

      {/* CREATE SUBJECT MODAL */}
      <Modal
        isOpen={subjectModalOpen}
        onClose={() => setSubjectModalOpen(false)}
        title="Add New Subject"
        subtitle="Associate a course subject to a semester curriculum"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateSubject} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[var(--title-color)] mb-1">Subject Code *</label>
              <input
                type="text"
                placeholder="e.g. BCA403"
                value={newSubject.code}
                onChange={(e) => setNewSubject({ ...newSubject, code: e.target.value })}
                required
                className="input-theme w-full"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--title-color)] mb-1">Credits</label>
              <input
                type="number"
                min={1}
                max={10}
                value={newSubject.credits}
                onChange={(e) => setNewSubject({ ...newSubject, credits: parseInt(e.target.value) || 4 })}
                className="input-theme w-full"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--title-color)] mb-1">Subject Title *</label>
            <input
              type="text"
              placeholder="e.g. Web Technologies & Frameworks"
              value={newSubject.name}
              onChange={(e) => setNewSubject({ ...newSubject, name: e.target.value })}
              required
              className="input-theme w-full"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--title-color)] mb-1">Assign to Semester *</label>
            <select
              value={newSubject.semester_id}
              onChange={(e) => setNewSubject({ ...newSubject, semester_id: e.target.value })}
              required
              className="input-theme w-full bg-white"
            >
              {semesters.map((sem) => (
                <option key={sem.id} value={sem.id}>
                  {sem.program_name} - {sem.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--title-color)] mb-1">Description / Course Overview</label>
            <textarea
              rows={3}
              placeholder="Brief course objectives..."
              value={newSubject.description}
              onChange={(e) => setNewSubject({ ...newSubject, description: e.target.value })}
              className="input-theme w-full"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border-color)]">
            <button
              type="button"
              onClick={() => setSubjectModalOpen(false)}
              className="btn-secondary text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary text-xs"
            >
              Save Subject
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
