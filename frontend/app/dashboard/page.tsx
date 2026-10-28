"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { DashboardStats, StudentDashboardData, UniversityAdminDashboardStats, HODDashboardStats, FacultyDashboardStats, CoordinatorDashboardStats, ControllerDashboardStats } from "@/lib/types";
import { StudentDashboardView } from "@/components/student/StudentDashboardView";
import { UniversityAdminDashboardView } from "@/components/university-admin/UniversityAdminDashboardView";
import { HODDashboardView } from "@/components/hod/HODDashboardView";
import { FacultyDashboardView } from "@/components/faculty/FacultyDashboardView";
import { CoordinatorDashboardView } from "@/components/coordinator/CoordinatorDashboardView";
import { ControllerDashboardView } from "@/components/controller/ControllerDashboardView";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import {
  Building2,
  GraduationCap,
  BookOpen,
  HelpCircle,
  FileText,
  Clock,
  ArrowRight,
  Sparkles,
  CheckCircle,
  FileSpreadsheet,
  School,
  Users,
  ShieldAlert,
  Layers,
  CheckSquare,
  AlertCircle,
  Eye,
  Plus,
} from "lucide-react";

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [studentData, setStudentData] = useState<StudentDashboardData | null>(null);
  const [univStats, setUnivStats] = useState<UniversityAdminDashboardStats | null>(null);
  const [hodStats, setHodStats] = useState<HODDashboardStats | null>(null);
  const [facultyStats, setFacultyStats] = useState<FacultyDashboardStats | null>(null);
  const [coordinatorStats, setCoordinatorStats] = useState<CoordinatorDashboardStats | null>(null);
  const [controllerStats, setControllerStats] = useState<ControllerDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const role = user?.role_name || "FACULTY";

  useEffect(() => {
    if (role === "STUDENT") {
      api
        .get<StudentDashboardData>("/student/dashboard")
        .then((data) => setStudentData(data))
        .catch((err) => console.error("Error loading student dashboard:", err))
        .finally(() => setLoading(false));
    } else if (role === "EXAM_CONTROLLER") {
      api
        .get<ControllerDashboardStats>("/controller/dashboard")
        .then((data) => setControllerStats(data))
        .catch((err) => console.error("Error loading controller dashboard:", err))
        .finally(() => setLoading(false));
    } else if (role === "UNIVERSITY_ADMIN") {
      api
        .get<UniversityAdminDashboardStats>("/university-admin/dashboard")
        .then((data) => setUnivStats(data))
        .catch((err) => console.error("Error loading university admin dashboard:", err))
        .finally(() => setLoading(false));
    } else if (role === "HOD" || role === "DEPARTMENT_ADMIN") {
      api
        .get<HODDashboardStats>("/hod/dashboard")
        .then((data) => setHodStats(data))
        .catch((err) => console.error("Error loading HOD dashboard:", err))
        .finally(() => setLoading(false));
    } else if (role === "FACULTY" || role === "TEACHER") {
      api
        .get<FacultyDashboardStats>("/faculty/dashboard")
        .then((data) => setFacultyStats(data))
        .catch((err) => console.error("Error loading faculty dashboard:", err))
        .finally(() => setLoading(false));
    } else if (role === "COORDINATOR" || role === "EXAM_COORDINATOR") {
      api
        .get<CoordinatorDashboardStats>("/coordinator/dashboard")
        .then((data) => setCoordinatorStats(data))
        .catch((err) => console.error("Error loading coordinator dashboard:", err))
        .finally(() => setLoading(false));
    } else {
      api
        .get<DashboardStats>("/dashboard/stats")
        .then((data) => setStats(data))
        .catch((err) => console.error("Error loading dashboard stats:", err))
        .finally(() => setLoading(false));
    }
  }, [role]);

  if (role === "STUDENT") {
    if (loading) {
      return (
        <div className="space-y-6">
          <div className="h-44 bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-60 bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] animate-pulse" />
            ))}
          </div>
        </div>
      );
    }

    if (studentData) {
      return <StudentDashboardView data={studentData} userName={user?.full_name || "Student"} />;
    }
  }

  if (role === "EXAM_CONTROLLER") {
    if (loading) {
      return (
        <div className="space-y-6">
          <div className="h-44 bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] animate-pulse" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] animate-pulse" />
            ))}
          </div>
        </div>
      );
    }

    if (controllerStats) {
      return <ControllerDashboardView stats={controllerStats} />;
    }
  }

  if (role === "UNIVERSITY_ADMIN") {
    if (loading) {
      return (
        <div className="space-y-6">
          <div className="h-44 bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] animate-pulse" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] animate-pulse" />
            ))}
          </div>
        </div>
      );
    }

    if (univStats) {
      return <UniversityAdminDashboardView stats={univStats} />;
    }
  }

  if (role === "HOD" || role === "DEPARTMENT_ADMIN") {
    if (loading) {
      return (
        <div className="space-y-6">
          <div className="h-44 bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] animate-pulse" />
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-32 bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] animate-pulse" />
            ))}
          </div>
        </div>
      );
    }

    if (hodStats) {
      return <HODDashboardView stats={hodStats} />;
    }
  }

  if (role === "FACULTY" || role === "TEACHER") {
    if (loading) {
      return (
        <div className="space-y-6">
          <div className="h-44 bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] animate-pulse" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] animate-pulse" />
            ))}
          </div>
        </div>
      );
    }

    if (facultyStats) {
      return <FacultyDashboardView stats={facultyStats} />;
    }
  }

  if (role === "COORDINATOR" || role === "EXAM_COORDINATOR") {
    if (loading) {
      return (
        <div className="space-y-6">
          <div className="h-44 bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] animate-pulse" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] animate-pulse" />
            ))}
          </div>
        </div>
      );
    }

    if (coordinatorStats) {
      return <CoordinatorDashboardView stats={coordinatorStats} />;
    }
  }

  return (
    <div className="space-y-6">
      {/* Dynamic Role Greeting & Subtitle */}
      <PageHeader
        title={`Welcome, ${user?.full_name || "User"}`}
        subtitle={
          role === "SUPER_ADMIN"
            ? "Platform Overseer Console — multi-tenant isolation, cross-university management, and security governance."
            : role === "UNIVERSITY_ADMIN"
            ? `University Academic Executive — overseeing affiliated colleges, faculties, and examination boards${stats?.organization_name ? ` for ${stats.organization_name}` : ""}.`
            : role === "INSTITUTION_ADMIN"
            ? `College Principal / Dean Console — managing constituent academic departments, student cohorts, and course offerings${stats?.organization_name ? ` for ${stats.organization_name}` : ""}.`
            : role === "HOD"
            ? `Head of Department Console — moderating curriculum syllabi, reviewing question submissions, and approving exam papers${stats?.department_name ? ` in ${stats.department_name}` : ""}.`
            : role === "EXAM_CONTROLLER"
            ? "Examination Controller Console — supervising examination papers, approving final blueprints, and authorizing paper publication."
            : role === "COORDINATOR"
            ? "Course Coordinator Console — coordinating syllabus topics, reviewing department questions, and structuring exam papers."
            : (role === "FACULTY" || role === "TEACHER")
            ? `Faculty Assessment Console — authoring syllabus-mapped questions, tracking approvals, and generating exam blueprints${stats?.department_name ? ` (${stats.department_name})` : ""}.`
            : role === "STUDENT"
            ? "Student Academic Portal — access published semester question papers, curriculum units, and official revision blueprints."
            : "University Question Paper Management System workspace."
        }
        actions={
          <div className="flex items-center gap-2">
            {role !== "STUDENT" && (
              <>
                <Link href="/questions/create" className="btn-secondary text-xs flex items-center gap-1.5">
                  <Plus size={15} />
                  <span>Author Question</span>
                </Link>
                <Link href="/question-papers/generator" className="btn-primary text-xs flex items-center gap-1.5">
                  <Sparkles size={15} />
                  <span>Generate Paper</span>
                </Link>
              </>
            )}
            {role === "STUDENT" && (
              <Link href="/question-papers" className="btn-primary text-xs flex items-center gap-1.5">
                <FileText size={15} />
                <span>Browse Past Papers</span>
              </Link>
            )}
          </div>
        }
      />

      {/* Scope Banner if Organization/Department is attached */}
      {(stats?.organization_name || stats?.department_name) && (
        <div className="bg-[var(--surface-color)] px-4 py-2.5 rounded-[var(--radius-md)] border border-[var(--border-color)] flex items-center justify-between text-xs text-[var(--paragraph-color)]">
          <div className="flex items-center gap-3">
            <span className="font-bold text-[var(--title-color)] flex items-center gap-1.5">
              <School size={14} className="text-[var(--secondary-color)]" />
              {stats.organization_name || "Apex Central University"}
            </span>
            {stats.department_name && (
              <>
                <span className="text-[var(--font-color)]">&bull;</span>
                <span className="text-[var(--secondary-color)] font-medium">
                  {stats.department_name}
                </span>
              </>
            )}
          </div>
          <Badge variant="outline" className="text-[10px] font-mono uppercase tracking-wider">
            {role.replace("_", " ")}
          </Badge>
        </div>
      )}

      {/* METRIC CARDS GRID TAILORED PER ROLE */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-[var(--surface-color)] border border-[var(--border-color)] rounded-[var(--radius-lg)] animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* ROLE: SUPER_ADMIN CARDS */}
          {role === "SUPER_ADMIN" && (
            <>
              <div className="bg-[var(--surface-color)] p-5 rounded-[var(--radius-lg)] border border-[var(--border-color)] shadow-[var(--shadow-sm)] flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[var(--font-color)]">Universities</p>
                  <h3 className="text-2xl font-bold text-[var(--title-color)] mt-1">{stats?.total_universities || 0}</h3>
                  <span className="text-[11px] text-[var(--paragraph-color)]">{stats?.total_institutions || 0} affiliated colleges</span>
                </div>
                <div className="w-11 h-11 rounded-[var(--radius-md)] bg-[var(--background-color)] text-[var(--title-color)] flex items-center justify-center">
                  <School className="w-5 h-5 text-[var(--secondary-color)]" />
                </div>
              </div>

              <div className="bg-[var(--surface-color)] p-5 rounded-[var(--radius-lg)] border border-[var(--border-color)] shadow-[var(--shadow-sm)] flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[var(--font-color)]">Total Users</p>
                  <h3 className="text-2xl font-bold text-[var(--title-color)] mt-1">{stats?.total_users || 0}</h3>
                  <span className="text-[11px] text-[var(--paragraph-color)]">{stats?.total_faculty || 0} faculty &bull; {stats?.total_students || 0} students</span>
                </div>
                <div className="w-11 h-11 rounded-[var(--radius-md)] bg-[var(--background-color)] text-[var(--title-color)] flex items-center justify-center">
                  <Users className="w-5 h-5 text-[var(--secondary-color)]" />
                </div>
              </div>

              <div className="bg-[var(--surface-color)] p-5 rounded-[var(--radius-lg)] border border-[var(--border-color)] shadow-[var(--shadow-sm)] flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[var(--font-color)]">Question Bank</p>
                  <h3 className="text-2xl font-bold text-[var(--title-color)] mt-1">{stats?.total_questions || 0}</h3>
                  <span className="text-[11px] font-semibold text-[#325816]">{stats?.approved_questions || 0} Approved</span>
                </div>
                <div className="w-11 h-11 rounded-[var(--radius-md)] bg-[var(--background-color)] text-[var(--title-color)] flex items-center justify-center">
                  <HelpCircle className="w-5 h-5 text-[var(--secondary-color)]" />
                </div>
              </div>

              <div className="bg-[var(--surface-color)] p-5 rounded-[var(--radius-lg)] border border-[var(--border-color)] shadow-[var(--shadow-sm)] flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[var(--font-color)]">Exam Papers</p>
                  <h3 className="text-2xl font-bold text-[var(--title-color)] mt-1">{stats?.total_papers || 0}</h3>
                  <span className="text-[11px] text-[var(--paragraph-color)]">{stats?.published_papers || 0} published papers</span>
                </div>
                <div className="w-11 h-11 rounded-[var(--radius-md)] bg-[var(--background-color)] text-[var(--title-color)] flex items-center justify-center">
                  <FileText className="w-5 h-5 text-[var(--secondary-color)]" />
                </div>
              </div>
            </>
          )}

          {/* ROLE: UNIVERSITY_ADMIN CARDS */}
          {role === "UNIVERSITY_ADMIN" && (
            <>
              <div className="bg-[var(--surface-color)] p-5 rounded-[var(--radius-lg)] border border-[var(--border-color)] shadow-[var(--shadow-sm)] flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[var(--font-color)]">Affiliated Colleges</p>
                  <h3 className="text-2xl font-bold text-[var(--title-color)] mt-1">{stats?.total_institutions || 0}</h3>
                  <span className="text-[11px] text-[var(--paragraph-color)]">{stats?.total_departments || 0} total departments</span>
                </div>
                <div className="w-11 h-11 rounded-[var(--radius-md)] bg-[var(--background-color)] text-[var(--title-color)] flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-[var(--secondary-color)]" />
                </div>
              </div>

              <div className="bg-[var(--surface-color)] p-5 rounded-[var(--radius-lg)] border border-[var(--border-color)] shadow-[var(--shadow-sm)] flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[var(--font-color)]">Faculty & Staff</p>
                  <h3 className="text-2xl font-bold text-[var(--title-color)] mt-1">{stats?.total_faculty || 0}</h3>
                  <span className="text-[11px] text-[var(--paragraph-color)]">{stats?.total_students || 0} active students</span>
                </div>
                <div className="w-11 h-11 rounded-[var(--radius-md)] bg-[var(--background-color)] text-[var(--title-color)] flex items-center justify-center">
                  <Users className="w-5 h-5 text-[var(--secondary-color)]" />
                </div>
              </div>

              <div className="bg-[var(--surface-color)] p-5 rounded-[var(--radius-lg)] border border-[var(--border-color)] shadow-[var(--shadow-sm)] flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[var(--font-color)]">Curriculum Subjects</p>
                  <h3 className="text-2xl font-bold text-[var(--title-color)] mt-1">{stats?.total_subjects || 0}</h3>
                  <span className="text-[11px] text-[var(--paragraph-color)]">{stats?.total_programs || 0} degree programs</span>
                </div>
                <div className="w-11 h-11 rounded-[var(--radius-md)] bg-[var(--background-color)] text-[var(--title-color)] flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-[var(--secondary-color)]" />
                </div>
              </div>

              <div className="bg-[var(--surface-color)] p-5 rounded-[var(--radius-lg)] border border-[var(--border-color)] shadow-[var(--shadow-sm)] flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[var(--font-color)]">Papers Generated</p>
                  <h3 className="text-2xl font-bold text-[var(--title-color)] mt-1">{stats?.total_papers || 0}</h3>
                  <span className="text-[11px] font-semibold text-[#325816]">{stats?.published_papers || 0} Published</span>
                </div>
                <div className="w-11 h-11 rounded-[var(--radius-md)] bg-[var(--background-color)] text-[var(--title-color)] flex items-center justify-center">
                  <FileText className="w-5 h-5 text-[var(--secondary-color)]" />
                </div>
              </div>
            </>
          )}

          {/* ROLE: INSTITUTION_ADMIN CARDS */}
          {role === "INSTITUTION_ADMIN" && (
            <>
              <div className="bg-[var(--surface-color)] p-5 rounded-[var(--radius-lg)] border border-[var(--border-color)] shadow-[var(--shadow-sm)] flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[var(--font-color)]">Departments</p>
                  <h3 className="text-2xl font-bold text-[var(--title-color)] mt-1">{stats?.total_departments || 0}</h3>
                  <span className="text-[11px] text-[var(--paragraph-color)]">Academic branches</span>
                </div>
                <div className="w-11 h-11 rounded-[var(--radius-md)] bg-[var(--background-color)] text-[var(--title-color)] flex items-center justify-center">
                  <Layers className="w-5 h-5 text-[var(--secondary-color)]" />
                </div>
              </div>

              <div className="bg-[var(--surface-color)] p-5 rounded-[var(--radius-lg)] border border-[var(--border-color)] shadow-[var(--shadow-sm)] flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[var(--font-color)]">College Faculty</p>
                  <h3 className="text-2xl font-bold text-[var(--title-color)] mt-1">{stats?.total_faculty || 0}</h3>
                  <span className="text-[11px] text-[var(--paragraph-color)]">{stats?.total_students || 0} enrolled students</span>
                </div>
                <div className="w-11 h-11 rounded-[var(--radius-md)] bg-[var(--background-color)] text-[var(--title-color)] flex items-center justify-center">
                  <Users className="w-5 h-5 text-[var(--secondary-color)]" />
                </div>
              </div>

              <div className="bg-[var(--surface-color)] p-5 rounded-[var(--radius-lg)] border border-[var(--border-color)] shadow-[var(--shadow-sm)] flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[var(--font-color)]">Course Subjects</p>
                  <h3 className="text-2xl font-bold text-[var(--title-color)] mt-1">{stats?.total_subjects || 0}</h3>
                  <span className="text-[11px] text-[var(--paragraph-color)]">{stats?.total_questions || 0} total questions</span>
                </div>
                <div className="w-11 h-11 rounded-[var(--radius-md)] bg-[var(--background-color)] text-[var(--title-color)] flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-[var(--secondary-color)]" />
                </div>
              </div>

              <div className="bg-[var(--surface-color)] p-5 rounded-[var(--radius-lg)] border border-[var(--border-color)] shadow-[var(--shadow-sm)] flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[var(--font-color)]">College Papers</p>
                  <h3 className="text-2xl font-bold text-[var(--title-color)] mt-1">{stats?.total_papers || 0}</h3>
                  <span className="text-[11px] text-[#325816] font-semibold">{stats?.published_papers || 0} Published</span>
                </div>
                <div className="w-11 h-11 rounded-[var(--radius-md)] bg-[var(--background-color)] text-[var(--title-color)] flex items-center justify-center">
                  <FileText className="w-5 h-5 text-[var(--secondary-color)]" />
                </div>
              </div>
            </>
          )}

          {/* ROLE: HOD CARDS */}
          {role === "HOD" && (
            <>
              <div className="bg-[var(--surface-color)] p-5 rounded-[var(--radius-lg)] border border-[var(--border-color)] shadow-[var(--shadow-sm)] flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[var(--font-color)]">Dept Faculty</p>
                  <h3 className="text-2xl font-bold text-[var(--title-color)] mt-1">{stats?.total_faculty || 0}</h3>
                  <span className="text-[11px] text-[var(--paragraph-color)]">Assigned teachers</span>
                </div>
                <div className="w-11 h-11 rounded-[var(--radius-md)] bg-[var(--background-color)] text-[var(--title-color)] flex items-center justify-center">
                  <Users className="w-5 h-5 text-[var(--secondary-color)]" />
                </div>
              </div>

              <div className="bg-[var(--surface-color)] p-5 rounded-[var(--radius-lg)] border border-[var(--border-color)] shadow-[var(--shadow-sm)] flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[var(--font-color)]">Dept Subjects</p>
                  <h3 className="text-2xl font-bold text-[var(--title-color)] mt-1">{stats?.total_subjects || 0}</h3>
                  <span className="text-[11px] text-[var(--paragraph-color)]">{stats?.syllabus_units_count || 0} syllabus units</span>
                </div>
                <div className="w-11 h-11 rounded-[var(--radius-md)] bg-[var(--background-color)] text-[var(--title-color)] flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-[var(--secondary-color)]" />
                </div>
              </div>

              <div className="bg-[var(--surface-color)] p-5 rounded-[var(--radius-lg)] border border-[var(--border-color)] shadow-[var(--shadow-sm)] flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[var(--font-color)]">Pending Review</p>
                  <h3 className="text-2xl font-bold text-[var(--title-color)] mt-1">{stats?.pending_questions || 0}</h3>
                  <span className="text-[11px] font-semibold text-amber-700">Questions awaiting HOD</span>
                </div>
                <div className="w-11 h-11 rounded-[var(--radius-md)] bg-[var(--background-color)] text-[var(--title-color)] flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-amber-600" />
                </div>
              </div>

              <div className="bg-[var(--surface-color)] p-5 rounded-[var(--radius-lg)] border border-[var(--border-color)] shadow-[var(--shadow-sm)] flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[var(--font-color)]">Dept Papers</p>
                  <h3 className="text-2xl font-bold text-[var(--title-color)] mt-1">{stats?.total_papers || 0}</h3>
                  <span className="text-[11px] font-semibold text-[#325816]">{stats?.published_papers || 0} Published</span>
                </div>
                <div className="w-11 h-11 rounded-[var(--radius-md)] bg-[var(--background-color)] text-[var(--title-color)] flex items-center justify-center">
                  <FileText className="w-5 h-5 text-[var(--secondary-color)]" />
                </div>
              </div>
            </>
          )}

          {/* ROLE: EXAM_CONTROLLER CARDS */}
          {role === "EXAM_CONTROLLER" && (
            <>
              <div className="bg-[var(--surface-color)] p-5 rounded-[var(--radius-lg)] border border-[var(--border-color)] shadow-[var(--shadow-sm)] flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[var(--font-color)]">Question Bank</p>
                  <h3 className="text-2xl font-bold text-[var(--title-color)] mt-1">{stats?.total_questions || 0}</h3>
                  <span className="text-[11px] font-semibold text-[#325816]">{stats?.approved_questions || 0} Approved for papers</span>
                </div>
                <div className="w-11 h-11 rounded-[var(--radius-md)] bg-[var(--background-color)] text-[var(--title-color)] flex items-center justify-center">
                  <HelpCircle className="w-5 h-5 text-[var(--secondary-color)]" />
                </div>
              </div>

              <div className="bg-[var(--surface-color)] p-5 rounded-[var(--radius-lg)] border border-[var(--border-color)] shadow-[var(--shadow-sm)] flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[var(--font-color)]">Total Papers</p>
                  <h3 className="text-2xl font-bold text-[var(--title-color)] mt-1">{stats?.total_papers || 0}</h3>
                  <span className="text-[11px] text-[var(--paragraph-color)]">University blueprints</span>
                </div>
                <div className="w-11 h-11 rounded-[var(--radius-md)] bg-[var(--background-color)] text-[var(--title-color)] flex items-center justify-center">
                  <FileText className="w-5 h-5 text-[var(--secondary-color)]" />
                </div>
              </div>

              <div className="bg-[var(--surface-color)] p-5 rounded-[var(--radius-lg)] border border-[var(--border-color)] shadow-[var(--shadow-sm)] flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[var(--font-color)]">Pending Review</p>
                  <h3 className="text-2xl font-bold text-[var(--title-color)] mt-1">{stats?.pending_papers || 0}</h3>
                  <span className="text-[11px] font-semibold text-amber-700">Awaiting approval</span>
                </div>
                <div className="w-11 h-11 rounded-[var(--radius-md)] bg-[var(--background-color)] text-[var(--title-color)] flex items-center justify-center">
                  <Clock className="w-5 h-5 text-amber-600" />
                </div>
              </div>

              <div className="bg-[var(--surface-color)] p-5 rounded-[var(--radius-lg)] border border-[var(--border-color)] shadow-[var(--shadow-sm)] flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[var(--font-color)]">Published Papers</p>
                  <h3 className="text-2xl font-bold text-[var(--title-color)] mt-1">{stats?.published_papers || 0}</h3>
                  <span className="text-[11px] font-semibold text-[#325816]">Active for students</span>
                </div>
                <div className="w-11 h-11 rounded-[var(--radius-md)] bg-[var(--background-color)] text-[var(--title-color)] flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-[var(--primary-color)]" />
                </div>
              </div>
            </>
          )}

          {/* ROLE: FACULTY / TEACHER / COORDINATOR CARDS */}
          {(role === "FACULTY" || role === "TEACHER" || role === "COORDINATOR") && (
            <>
              <div className="bg-[var(--surface-color)] p-5 rounded-[var(--radius-lg)] border border-[var(--border-color)] shadow-[var(--shadow-sm)] flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[var(--font-color)]">Assigned Courses</p>
                  <h3 className="text-2xl font-bold text-[var(--title-color)] mt-1">{stats?.assigned_subjects || stats?.total_subjects || 0}</h3>
                  <span className="text-[11px] text-[var(--paragraph-color)]">{stats?.syllabus_units_count || 0} curriculum units</span>
                </div>
                <div className="w-11 h-11 rounded-[var(--radius-md)] bg-[var(--background-color)] text-[var(--title-color)] flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-[var(--secondary-color)]" />
                </div>
              </div>

              <div className="bg-[var(--surface-color)] p-5 rounded-[var(--radius-lg)] border border-[var(--border-color)] shadow-[var(--shadow-sm)] flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[var(--font-color)]">Authored Questions</p>
                  <h3 className="text-2xl font-bold text-[var(--title-color)] mt-1">{stats?.my_questions || stats?.total_questions || 0}</h3>
                  <span className="text-[11px] font-semibold text-[#325816]">{stats?.my_approved_questions || stats?.approved_questions || 0} Approved</span>
                </div>
                <div className="w-11 h-11 rounded-[var(--radius-md)] bg-[var(--background-color)] text-[var(--title-color)] flex items-center justify-center">
                  <HelpCircle className="w-5 h-5 text-[var(--secondary-color)]" />
                </div>
              </div>

              <div className="bg-[var(--surface-color)] p-5 rounded-[var(--radius-lg)] border border-[var(--border-color)] shadow-[var(--shadow-sm)] flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[var(--font-color)]">Draft / Under Review</p>
                  <h3 className="text-2xl font-bold text-[var(--title-color)] mt-1">{stats?.pending_questions || 0}</h3>
                  <span className="text-[11px] text-[var(--paragraph-color)]">In moderation queue</span>
                </div>
                <div className="w-11 h-11 rounded-[var(--radius-md)] bg-[var(--background-color)] text-[var(--title-color)] flex items-center justify-center">
                  <Clock className="w-5 h-5 text-amber-600" />
                </div>
              </div>

              <div className="bg-[var(--surface-color)] p-5 rounded-[var(--radius-lg)] border border-[var(--border-color)] shadow-[var(--shadow-sm)] flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[var(--font-color)]">Exam Blueprints</p>
                  <h3 className="text-2xl font-bold text-[var(--title-color)] mt-1">{stats?.total_papers || 0}</h3>
                  <span className="text-[11px] text-[var(--paragraph-color)]">{stats?.published_papers || 0} published</span>
                </div>
                <div className="w-11 h-11 rounded-[var(--radius-md)] bg-[var(--background-color)] text-[var(--title-color)] flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-[var(--secondary-color)]" />
                </div>
              </div>
            </>
          )}

          {/* ROLE: STUDENT CARDS */}
          {role === "STUDENT" && (
            <>
              <div className="bg-[var(--surface-color)] p-5 rounded-[var(--radius-lg)] border border-[var(--border-color)] shadow-[var(--shadow-sm)] flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[var(--font-color)]">Enrolled Subjects</p>
                  <h3 className="text-2xl font-bold text-[var(--title-color)] mt-1">{stats?.enrolled_subjects || stats?.total_subjects || 0}</h3>
                  <span className="text-[11px] text-[var(--paragraph-color)]">Current Semester</span>
                </div>
                <div className="w-11 h-11 rounded-[var(--radius-md)] bg-[var(--background-color)] text-[var(--title-color)] flex items-center justify-center">
                  <GraduationCap className="w-5 h-5 text-[var(--secondary-color)]" />
                </div>
              </div>

              <div className="bg-[var(--surface-color)] p-5 rounded-[var(--radius-lg)] border border-[var(--border-color)] shadow-[var(--shadow-sm)] flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[var(--font-color)]">Practice Papers</p>
                  <h3 className="text-2xl font-bold text-[var(--title-color)] mt-1">{stats?.published_papers || 0}</h3>
                  <span className="text-[11px] font-semibold text-[#325816]">Verified official papers</span>
                </div>
                <div className="w-11 h-11 rounded-[var(--radius-md)] bg-[var(--background-color)] text-[var(--title-color)] flex items-center justify-center">
                  <FileText className="w-5 h-5 text-[var(--secondary-color)]" />
                </div>
              </div>

              <div className="bg-[var(--surface-color)] p-5 rounded-[var(--radius-lg)] border border-[var(--border-color)] shadow-[var(--shadow-sm)] flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[var(--font-color)]">Syllabus Modules</p>
                  <h3 className="text-2xl font-bold text-[var(--title-color)] mt-1">{stats?.syllabus_units_count || 0}</h3>
                  <span className="text-[11px] text-[var(--paragraph-color)]">Active study units</span>
                </div>
                <div className="w-11 h-11 rounded-[var(--radius-md)] bg-[var(--background-color)] text-[var(--title-color)] flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-[var(--secondary-color)]" />
                </div>
              </div>

              <div className="bg-[var(--surface-color)] p-5 rounded-[var(--radius-lg)] border border-[var(--border-color)] shadow-[var(--shadow-sm)] flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[var(--font-color)]">Examination Status</p>
                  <h3 className="text-lg font-bold text-[#325816] mt-1">Ready</h3>
                  <span className="text-[11px] text-[var(--paragraph-color)]">Semester End 2026-27</span>
                </div>
                <div className="w-11 h-11 rounded-[var(--radius-md)] bg-[#eaf5de] text-[#325816] flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-[#82c341]" />
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* QUICK ACTION SHORTCUTS & ACTIVITY FEED */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Workflows */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between pb-1 border-b border-[var(--border-color)]">
            <h3 className="text-sm font-bold text-[var(--title-color)]">
              {role === "STUDENT" ? "Student Learning & Resources" : "Core Academic Workflows"}
            </h3>
            <span className="text-xs text-[var(--font-color)]">Quick Shortcuts</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {role !== "STUDENT" && (
              <Link
                href="/question-papers/generator"
                className="p-5 bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] hover:border-[var(--primary-color)] hover:shadow-[var(--shadow-md)] transition group"
              >
                <div className="w-10 h-10 rounded-[var(--radius-md)] bg-[#eaf5de] text-[#325816] flex items-center justify-center mb-3 group-hover:scale-105 transition">
                  <Sparkles className="w-5 h-5 text-[var(--primary-color)]" />
                </div>
                <h4 className="font-bold text-[var(--title-color)] text-sm group-hover:text-[#325816] transition flex items-center gap-1">
                  Automated Paper Generator <ArrowRight className="w-4 h-4 ml-1 opacity-0 group-hover:opacity-100 transition text-[var(--primary-color)]" />
                </h4>
                <p className="text-xs text-[var(--paragraph-color)] mt-1.5 leading-relaxed">
                  Configure marks matrix, question types, module coverage, and deterministic blueprint generation.
                </p>
              </Link>
            )}

            {role !== "STUDENT" && (
              <Link
                href="/questions/create"
                className="p-5 bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] hover:border-[var(--primary-color)] hover:shadow-[var(--shadow-md)] transition group"
              >
                <div className="w-10 h-10 rounded-[var(--radius-md)] bg-[#eaf5de] text-[#325816] flex items-center justify-center mb-3 group-hover:scale-105 transition">
                  <HelpCircle className="w-5 h-5 text-[var(--primary-color)]" />
                </div>
                <h4 className="font-bold text-[var(--title-color)] text-sm group-hover:text-[#325816] transition flex items-center gap-1">
                  Question Bank Authoring <ArrowRight className="w-4 h-4 ml-1 opacity-0 group-hover:opacity-100 transition text-[var(--primary-color)]" />
                </h4>
                <p className="text-xs text-[var(--paragraph-color)] mt-1.5 leading-relaxed">
                  Author MCQs, True/False, Fill in Blank, and Descriptive items (1–10 Marks) with Bloom&apos;s taxonomy.
                </p>
              </Link>
            )}

            <Link
              href="/syllabus"
              className="p-5 bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] hover:border-[var(--primary-color)] hover:shadow-[var(--shadow-md)] transition group"
            >
              <div className="w-10 h-10 rounded-[var(--radius-md)] bg-[var(--background-color)] text-[var(--title-color)] flex items-center justify-center mb-3 group-hover:scale-105 transition border border-[var(--border-color)]">
                <BookOpen className="w-5 h-5 text-[var(--secondary-color)]" />
              </div>
              <h4 className="font-bold text-[var(--title-color)] text-sm group-hover:text-[var(--secondary-color)] transition flex items-center gap-1">
                Syllabus & Modules <ArrowRight className="w-4 h-4 ml-1 opacity-0 group-hover:opacity-100 transition text-[var(--primary-color)]" />
              </h4>
              <p className="text-xs text-[var(--paragraph-color)] mt-1.5 leading-relaxed">
                {role === "STUDENT"
                  ? "View curriculum modules, topics, and downloadable course outlines."
                  : "Upload curriculum documents, manage units and subtopics, and verify curriculum coverage."}
              </p>
            </Link>

            <Link
              href="/question-papers"
              className="p-5 bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] hover:border-[var(--primary-color)] hover:shadow-[var(--shadow-md)] transition group"
            >
              <div className="w-10 h-10 rounded-[var(--radius-md)] bg-[var(--background-color)] text-[var(--title-color)] flex items-center justify-center mb-3 group-hover:scale-105 transition border border-[var(--border-color)]">
                <FileText className="w-5 h-5 text-[var(--secondary-color)]" />
              </div>
              <h4 className="font-bold text-[var(--title-color)] text-sm group-hover:text-[var(--secondary-color)] transition flex items-center gap-1">
                {role === "STUDENT" ? "Practice Question Papers" : "Question Papers Repository"}{" "}
                <ArrowRight className="w-4 h-4 ml-1 opacity-0 group-hover:opacity-100 transition text-[var(--primary-color)]" />
              </h4>
              <p className="text-xs text-[var(--paragraph-color)] mt-1.5 leading-relaxed">
                {role === "STUDENT"
                  ? "Access verified examination question papers for self-assessment and exam preparation."
                  : "Browse papers, drag & drop section builder, live validation engine, and sanitized ReportLab PDF export."}
              </p>
            </Link>

            {["SUPER_ADMIN", "UNIVERSITY_ADMIN"].includes(role) && (
              <Link
                href="/academic"
                className="p-5 bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] hover:border-[var(--primary-color)] hover:shadow-[var(--shadow-md)] transition group sm:col-span-2"
              >
                <div className="w-10 h-10 rounded-[var(--radius-md)] bg-[var(--background-color)] text-[var(--title-color)] flex items-center justify-center mb-3 group-hover:scale-105 transition border border-[var(--border-color)]">
                  <School className="w-5 h-5 text-[var(--secondary-color)]" />
                </div>
                <h4 className="font-bold text-[var(--title-color)] text-sm group-hover:text-[var(--secondary-color)] transition flex items-center gap-1">
                  Multi-University Hierarchy & Theme Customization{" "}
                  <ArrowRight className="w-4 h-4 ml-1 opacity-0 group-hover:opacity-100 transition text-[var(--primary-color)]" />
                </h4>
                <p className="text-xs text-[var(--paragraph-color)] mt-1.5 leading-relaxed">
                  Manage affiliated colleges, academic departments, degree programs, and customize institution branding colors and typography.
                </p>
              </Link>
            )}
          </div>
        </div>

        {/* Right Column: Recent Activity Feed */}
        <div className="bg-[var(--surface-color)] p-5 rounded-[var(--radius-lg)] border border-[var(--border-color)] shadow-[var(--shadow-sm)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)] mb-3">
              <h3 className="text-sm font-bold text-[var(--title-color)]">Recent Activity</h3>
              <span className="text-[10px] text-[var(--font-color)] font-semibold uppercase tracking-wider">
                {role === "STUDENT" ? "Published Feed" : "Security Trail"}
              </span>
            </div>

            <div className="space-y-3">
              {stats?.recent_activity && stats.recent_activity.length > 0 ? (
                stats.recent_activity.slice(0, 6).map((act) => (
                  <div key={act.id} className="flex items-start gap-3 text-xs border-b border-[var(--border-color)]/50 pb-2.5 last:border-0 last:pb-0">
                    <div className="w-2 h-2 rounded-full bg-[var(--primary-color)] mt-1.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-[var(--title-color)] truncate">{act.action.replace("_", " ")}</p>
                      <p className="text-[11px] text-[var(--paragraph-color)] truncate">{act.user_email} &bull; {act.entity_type}</p>
                    </div>
                    <span className="text-[10px] text-[var(--font-color)] shrink-0 font-medium">
                      {new Date(act.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-[var(--font-color)] text-center py-8">No recent activity recorded</p>
              )}
            </div>
          </div>

          {role !== "STUDENT" && (
            <div className="pt-4 mt-4 border-t border-[var(--border-color)]">
              <Link
                href="/admin/audit"
                className="text-xs font-semibold text-[var(--title-color)] hover:text-[#325816] flex items-center justify-center gap-1 transition"
              >
                <span>View Full Security Audit Log</span>
                <ArrowRight className="w-3.5 h-3.5 text-[var(--primary-color)]" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
