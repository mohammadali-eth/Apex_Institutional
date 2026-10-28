"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  LayoutDashboard,
  GraduationCap,
  BookOpen,
  HelpCircle,
  FileText,
  Users,
  ShieldCheck,
  Building2,
  Library,
  Layers,
  Sparkles,
  CheckCircle,
  LogOut,
  ChevronDown,
  Menu,
  X,
  Award,
  CheckSquare,
  Palette,
  Settings,
  UserCog,
  UserCheck,
  School,
  CalendarDays,
  Clock,
  FileSpreadsheet,
  AlertTriangle,
  Bell,
  BarChart3,
  RotateCcw,
  Lock,
  Send,
} from "lucide-react";

export function Sidebar() {
  const pathname = usePathname();
  const { user, hasPermission, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isSuperAdmin = user?.role_name === "SUPER_ADMIN";
  const isStudent = user?.role_name === "STUDENT";

  const studentNavigationGroups = [
    {
      title: "Classroom",
      items: [
        {
          label: "Classroom Hub",
          href: "/dashboard",
          icon: LayoutDashboard,
          visible: true,
        },
        {
          label: "My Classes",
          href: "/dashboard/classes",
          icon: GraduationCap,
          visible: true,
        },
        {
          label: "Course Syllabus",
          href: "/dashboard/syllabus",
          icon: BookOpen,
          visible: true,
        },
      ],
    },
    {
      title: "Examinations",
      items: [
        {
          label: "Online Tests",
          href: "/dashboard/tests",
          icon: CheckSquare,
          visible: true,
        },
        {
          label: "Test Results",
          href: "/dashboard/tests/results",
          icon: Award,
          visible: true,
        },
      ],
    },
    {
      title: "Study Resources",
      items: [
        {
          label: "Question Papers",
          href: "/question-papers",
          icon: FileText,
          visible: true,
        },
      ],
    },
  ];

  const staffNavigationGroups = [
    {
      title: "Core",
      items: [
        {
          label: "Dashboard",
          href: "/dashboard",
          icon: LayoutDashboard,
          visible: true,
        },
      ],
    },
    {
      title: "Academic Management",
      items: [
        {
          label: "Institutions & Depts",
          href: "/academic",
          icon: Building2,
          visible: hasPermission("academic.read"),
        },
        {
          label: "Syllabus & Units",
          href: "/syllabus",
          icon: BookOpen,
          visible: hasPermission("syllabus.read"),
        },
      ],
    },
    {
      title: "Question Bank",
      items: [
        {
          label: "All Questions",
          href: "/questions",
          icon: HelpCircle,
          visible: hasPermission("question.read"),
        },
        {
          label: "Create Question",
          href: "/questions/create",
          icon: Layers,
          visible: hasPermission("question.create") && !isStudent,
        },
      ],
    },
    {
      title: "Question Papers",
      items: [
        {
          label: "All Papers",
          href: "/question-papers",
          icon: FileText,
          visible: hasPermission("paper.read"),
        },
        {
          label: "Paper Generator",
          href: "/question-papers/generator",
          icon: Sparkles,
          visible: hasPermission("paper.generate") && !isStudent,
        },
      ],
    },
    {
      title: "Administration",
      items: [
        {
          label: "User Management",
          href: "/admin/users",
          icon: Users,
          visible: hasPermission("user.read"),
        },
        {
          label: "Audit Logs",
          href: "/admin/audit",
          icon: ShieldCheck,
          visible: hasPermission("audit.read"),
        },
      ],
    },
  ];

  const isUniversityAdmin = user?.role_name === "UNIVERSITY_ADMIN";
  const isExamController = user?.role_name === "EXAM_CONTROLLER";
  const isHOD = user?.role_name === "HOD" || user?.role_name === "DEPARTMENT_ADMIN";
  const isFaculty = user?.role_name === "FACULTY" || user?.role_name === "TEACHER";
  const isCoordinator = user?.role_name === "COORDINATOR" || user?.role_name === "EXAM_COORDINATOR";

  const controllerNavigationGroups = [
    {
      title: "Controller Hub",
      items: [
        {
          label: "Dashboard",
          href: "/dashboard",
          icon: LayoutDashboard,
          visible: true,
        },
        {
          label: "Examinations",
          href: "/dashboard/controller/examinations",
          icon: CalendarDays,
          visible: true,
        },
        {
          label: "Exam Schedule",
          href: "/dashboard/controller/schedule",
          icon: Clock,
          visible: true,
        },
      ],
    },
    {
      title: "Paper Governance",
      items: [
        {
          label: "Paper Approvals",
          href: "/dashboard/controller/approvals",
          icon: CheckCircle,
          visible: true,
        },
        {
          label: "Revision Queue",
          href: "/dashboard/controller/revisions",
          icon: RotateCcw,
          visible: true,
        },
        {
          label: "Finalized Papers",
          href: "/dashboard/controller/finalized",
          icon: Lock,
          visible: true,
        },
        {
          label: "Secure Release",
          href: "/dashboard/controller/releases",
          icon: Send,
          visible: true,
        },
      ],
    },
    {
      title: "Supervision & Audit",
      items: [
        {
          label: "Coordinators",
          href: "/dashboard/controller/coordinators",
          icon: Users,
          visible: true,
        },
        {
          label: "Exam Reports",
          href: "/dashboard/controller/reports",
          icon: BarChart3,
          visible: true,
        },
        {
          label: "Security & Audit",
          href: "/dashboard/controller/audit",
          icon: ShieldCheck,
          visible: true,
        },
      ],
    },
  ];

  const coordinatorNavigationGroups = [
    {
      title: "Coordination Hub",
      items: [
        {
          label: "Dashboard",
          href: "/dashboard",
          icon: LayoutDashboard,
          visible: true,
        },
        {
          label: "Assigned Exams",
          href: "/dashboard/coordinator/examinations",
          icon: CalendarDays,
          visible: true,
        },
        {
          label: "Exam Schedule",
          href: "/dashboard/coordinator/schedule",
          icon: Clock,
          visible: true,
        },
      ],
    },
    {
      title: "Preparation & Ops",
      items: [
        {
          label: "Paper Tracking",
          href: "/dashboard/coordinator/papers",
          icon: FileSpreadsheet,
          visible: true,
        },
        {
          label: "Faculty Roster",
          href: "/dashboard/coordinator/faculty",
          icon: Users,
          visible: true,
        },
        {
          label: "Readiness Checklist",
          href: "/dashboard/coordinator/checklist",
          icon: CheckSquare,
          visible: true,
        },
        {
          label: "Issues & Escalations",
          href: "/dashboard/coordinator/issues",
          icon: AlertTriangle,
          visible: true,
        },
      ],
    },
    {
      title: "Communications & Reports",
      items: [
        {
          label: "Notifications",
          href: "/dashboard/coordinator/notifications",
          icon: Bell,
          visible: true,
        },
        {
          label: "Reports",
          href: "/dashboard/coordinator/reports",
          icon: BarChart3,
          visible: true,
        },
        {
          label: "Settings",
          href: "/dashboard/settings",
          icon: Settings,
          visible: true,
        },
      ],
    },
  ];

  const facultyNavigationGroups = [
    {
      title: "Academic Hub",
      items: [
        {
          label: "Faculty Dashboard",
          href: "/dashboard",
          icon: LayoutDashboard,
          visible: true,
        },
        {
          label: "My Subjects",
          href: "/dashboard/faculty/subjects",
          icon: BookOpen,
          visible: true,
        },
        {
          label: "Exam Schedule",
          href: "/dashboard/faculty/schedule",
          icon: Award,
          visible: true,
        },
      ],
    },
    {
      title: "Question Authoring",
      items: [
        {
          label: "My Questions",
          href: "/dashboard/faculty/questions",
          icon: HelpCircle,
          visible: true,
        },
        {
          label: "Question Bank",
          href: "/dashboard/faculty/question-bank",
          icon: Layers,
          visible: true,
        },
      ],
    },
    {
      title: "Exam Papers",
      items: [
        {
          label: "My Exam Papers",
          href: "/dashboard/faculty/papers",
          icon: FileText,
          visible: true,
        },
        {
          label: "Paper Generator",
          href: "/dashboard/faculty/paper-generator",
          icon: Sparkles,
          visible: true,
        },
      ],
    },
    {
      title: "Insights & Account",
      items: [
        {
          label: "Review Feedback",
          href: "/dashboard/faculty/feedback",
          icon: CheckSquare,
          visible: true,
        },
        {
          label: "Academic Reports",
          href: "/dashboard/faculty/reports",
          icon: Award,
          visible: true,
        },
        {
          label: "Settings",
          href: "/dashboard/settings",
          icon: Settings,
          visible: true,
        },
      ],
    },
  ];

  const hodNavigationGroups = [
    {
      title: "Overview",
      items: [
        {
          label: "Department Dashboard",
          href: "/dashboard",
          icon: LayoutDashboard,
          visible: true,
        },
      ],
    },
    {
      title: "Faculty & Curriculum",
      items: [
        {
          label: "Faculty Management",
          href: "/dashboard/hod/faculty",
          icon: Users,
          visible: true,
        },
        {
          label: "Degree Programs",
          href: "/dashboard/hod/programs",
          icon: GraduationCap,
          visible: true,
        },
        {
          label: "Courses & Subjects",
          href: "/dashboard/hod/subjects",
          icon: BookOpen,
          visible: true,
        },
        {
          label: "Syllabus & Units",
          href: "/dashboard/hod/syllabus",
          icon: Layers,
          visible: true,
        },
      ],
    },
    {
      title: "Question Bank & Papers",
      items: [
        {
          label: "Department Questions",
          href: "/dashboard/hod/questions",
          icon: HelpCircle,
          visible: true,
        },
        {
          label: "Review Questions",
          href: "/dashboard/hod/review-questions",
          icon: CheckSquare,
          visible: true,
        },
        {
          label: "Question Papers",
          href: "/dashboard/hod/papers",
          icon: FileText,
          visible: true,
        },
        {
          label: "Approve Papers",
          href: "/dashboard/hod/approve-papers",
          icon: CheckCircle,
          visible: true,
        },
      ],
    },
    {
      title: "Operations & Insights",
      items: [
        {
          label: "Department Exams",
          href: "/dashboard/hod/exams",
          icon: Sparkles,
          visible: true,
        },
        {
          label: "Academic Reports",
          href: "/dashboard/hod/reports",
          icon: Award,
          visible: true,
        },
        {
          label: "Department Users",
          href: "/dashboard/hod/users",
          icon: UserCheck,
          visible: true,
        },
        {
          label: "Audit Logs",
          href: "/dashboard/hod/audit",
          icon: ShieldCheck,
          visible: true,
        },
        {
          label: "Settings",
          href: "/dashboard/settings",
          icon: Settings,
          visible: true,
        },
      ],
    },
  ];

  const universityAdminNavigationGroups = [
    {
      title: "Executive",
      items: [
        {
          label: "Executive Dashboard",
          href: "/dashboard",
          icon: LayoutDashboard,
          visible: true,
        },
        {
          label: "University Profile",
          href: "/dashboard/profile",
          icon: School,
          visible: true,
        },
      ],
    },
    {
      title: "Academic Units",
      items: [
        {
          label: "Institutes & Depts",
          href: "/dashboard/departments",
          icon: Building2,
          visible: true,
        },
        {
          label: "Academic Programs",
          href: "/dashboard/programs",
          icon: GraduationCap,
          visible: true,
        },
        {
          label: "Courses & Subjects",
          href: "/dashboard/courses",
          icon: BookOpen,
          visible: true,
        },
        {
          label: "Syllabus & Units",
          href: "/syllabus",
          icon: Layers,
          visible: true,
        },
      ],
    },
    {
      title: "Faculty & Staff",
      items: [
        {
          label: "HOD Management",
          href: "/dashboard/hods",
          icon: UserCheck,
          visible: true,
        },
        {
          label: "Teacher / Faculty",
          href: "/dashboard/teachers",
          icon: Users,
          visible: true,
        },
        {
          label: "Exam Controllers",
          href: "/dashboard/exam-controllers",
          icon: UserCog,
          visible: true,
        },
        {
          label: "All Users",
          href: "/admin/users",
          icon: Users,
          visible: true,
        },
      ],
    },
    {
      title: "Question Bank & Papers",
      items: [
        {
          label: "Question Bank",
          href: "/questions",
          icon: HelpCircle,
          visible: true,
        },
        {
          label: "Question Papers",
          href: "/question-papers",
          icon: FileText,
          visible: true,
        },
        {
          label: "Paper Generator",
          href: "/question-papers/generator",
          icon: Sparkles,
          visible: true,
        },
      ],
    },
    {
      title: "Branding & Governance",
      items: [
        {
          label: "University Branding",
          href: "/dashboard/branding",
          icon: Palette,
          visible: true,
        },
        {
          label: "Audit Logs",
          href: "/dashboard/audit",
          icon: ShieldCheck,
          visible: true,
        },
        {
          label: "Settings",
          href: "/dashboard/settings",
          icon: Settings,
          visible: true,
        },
      ],
    },
  ];

  const navigationGroups = isStudent
    ? studentNavigationGroups
    : isExamController
    ? controllerNavigationGroups
    : isUniversityAdmin
    ? universityAdminNavigationGroups
    : isHOD
    ? hodNavigationGroups
    : isFaculty
    ? facultyNavigationGroups
    : isCoordinator
    ? coordinatorNavigationGroups
    : staffNavigationGroups;

  const sidebarContent = (
    <div className="flex flex-col h-full select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-5 border-b border-white/10 bg-[#3c474f]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-[var(--radius-md)] bg-[#82c341] flex items-center justify-center text-[#000000] font-black text-lg shadow-[var(--shadow-sm)]">
            Ω
          </div>
          <div>
            <h1 className="font-bold text-white text-sm tracking-tight leading-none">QPMS Apex</h1>
            <p className="text-[10px] text-[#dce1e4] mt-0.5 font-medium tracking-wide">University Exam Platform</p>
          </div>
        </div>
        <button
          onClick={() => setMobileOpen(false)}
          className="md:hidden p-1 text-[#dce1e4] hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation Groups */}
      <div className="flex-1 py-4 px-3 space-y-6 overflow-y-auto">
        {navigationGroups.map((group) => {
          const visibleItems = group.items.filter((item) => item.visible);
          if (visibleItems.length === 0) return null;

          return (
            <div key={group.title}>
              <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-[#dce1e4]/70 mb-2">
                {group.title}
              </p>
              <div className="space-y-1">
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    pathname === item.href ||
                    (item.href !== "/dashboard" && pathname.startsWith(item.href));

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2 rounded-[var(--radius-md)] text-xs font-semibold transition-all relative ${
                        isActive
                          ? "bg-[#82c341] text-[#000000] shadow-[var(--shadow-sm)] font-bold"
                          : "text-[#dce1e4] hover:text-white hover:bg-white/10"
                      }`}
                    >
                      <Icon
                        className={`w-4 h-4 shrink-0 ${
                          isActive ? "text-[#000000]" : "text-[#dce1e4]"
                        }`}
                      />
                      <span>{item.label}</span>
                      {isActive && (
                        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#000000]/60" />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* User Footer */}
      <div className="p-3 border-t border-white/10 bg-[#3c474f]">
        <div className="flex items-center justify-between px-2 py-1.5">
          <div className="truncate mr-2">
            <p className="text-xs font-semibold text-white truncate">{user?.full_name || "Account"}</p>
            <p className="text-[10px] text-[#82c341] font-semibold truncate tracking-wider">
              {user?.role_name?.replace("_", " ")}
            </p>
          </div>
          <button
            onClick={logout}
            title="Sign Out"
            className="p-1.5 text-[#dce1e4] hover:text-[#fee2e2] hover:bg-white/10 rounded-[var(--radius-sm)] transition shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Menu Trigger button */}
      <div className="md:hidden fixed top-3 left-4 z-40 no-print">
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 rounded-[var(--radius-md)] bg-[#45525b] text-white shadow-md focus:outline-none"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Drawer */}
      <aside
        className={`md:hidden fixed inset-y-0 left-0 z-50 w-64 bg-[#45525b] shadow-2xl transition-transform duration-200 no-print ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Desktop Persistent Sidebar */}
      <aside className="hidden md:flex w-64 bg-[#45525b] border-r border-[#3c474f] text-[#ffffff] flex-col shrink-0 min-h-screen no-print sticky top-0 h-screen">
        {sidebarContent}
      </aside>
    </>
  );
}
