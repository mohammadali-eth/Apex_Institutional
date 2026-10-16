import React, { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useDepartment } from "@/hooks/useDepartment";
import { useI18n, languages } from "@/hooks/useI18n";
import { permissionService } from "@/lib/permissions/permissionService";
import {
  GraduationCap,
  LayoutDashboard,
  Building2,
  FileText,
  HelpCircle,
  Layers,
  History,
  CheckSquare,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Globe,
  Building,
  Menu,
  X,
  ShieldCheck,
  UserCheck,
  CalendarDays,
} from "lucide-react";

interface AppShellProps {
  children: React.ReactNode;
  activeNav: string;
  onNavigate: (route: string) => void;
  onOpenSelectDepartment?: () => void;
}

export const AppShell: React.FC<AppShellProps> = ({
  children,
  activeNav,
  onNavigate,
  onOpenSelectDepartment,
}) => {
  const { currentUser, logout, switchUser } = useAuth();
  const { currentDepartment, availableDepartments, setDepartment } =
    useDepartment();
  const { locale, setLocale, isRtl, t } = useI18n();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const navItems = [
    {
      id: "dashboard",
      label: t("nav.dashboard"),
      icon: LayoutDashboard,
      allowed: () => !!currentUser,
    },
    {
      id: "academic",
      label: t("nav.academic"),
      icon: Building2,
      allowed: () =>
        permissionService.hasAnyPermission(currentUser, [
          "system.manage",
          "user.update",
          "user.create",
          "question_bank.manage",
        ]),
    },
    {
      id: "materials",
      label: t("nav.materials"),
      icon: FileText,
      allowed: () =>
        permissionService.hasAnyPermission(currentUser, [
          "question.create",
          "question.update",
          "question_bank.manage",
        ]),
    },
    {
      id: "questions",
      label: t("nav.questions"),
      icon: HelpCircle,
      allowed: () =>
        !!currentUser &&
        (currentUser.role === "guest" ||
          permissionService.hasPermission(currentUser, "question.view") ||
          permissionService.hasPermission(currentUser, "question_bank.view")),
    },
    {
      id: "generator",
      label: t("nav.generator"),
      icon: Layers,
      allowed: () =>
        permissionService.hasAnyPermission(currentUser, [
          "paper.create",
          "paper.update",
          "paper.submit",
        ]),
    },
    {
      id: "history",
      label: t("nav.history"),
      icon: History,
      allowed: () =>
        permissionService.hasAnyPermission(currentUser, [
          "paper.view",
          "report.view",
        ]),
    },
    {
      id: "approvals",
      label: t("nav.approvals"),
      icon: CheckSquare,
      allowed: () =>
        permissionService.hasAnyPermission(currentUser, [
          "paper.review",
          "paper.approve",
          "paper.finalize",
        ]),
    },
    {
      id: "reports",
      label: t("nav.reports"),
      icon: BarChart3,
      allowed: () =>
        permissionService.hasPermission(currentUser, "report.view"),
    },
    {
      id: "settings",
      label: t("nav.settings"),
      icon: Settings,
      allowed: () =>
        permissionService.hasAnyPermission(currentUser, [
          "system.manage",
          "user.update",
          "user.create",
        ]),
    },
    {
      id: "users",
      label: "Users",
      icon: UserCheck,
      allowed: () => permissionService.hasPermission(currentUser, "user.view"),
    },
    {
      id: "audit",
      label: "Audit",
      icon: ShieldCheck,
      allowed: () => permissionService.hasPermission(currentUser, "audit.view"),
    },
    {
      id: "examinations",
      label: "Examinations",
      icon: CalendarDays,
      allowed: () => permissionService.hasPermission(currentUser, "exam.view"),
    },
    {
      id: "quality",
      label: "Quality Control",
      icon: ShieldCheck,
      allowed: () =>
        currentUser?.role === "quality_controller" ||
        ["super_admin", "institution_admin", "university_admin"].includes(
          currentUser?.role || "",
        ),
    },
    {
      id: "roles",
      label: "Roles & Permissions",
      icon: ShieldCheck,
      allowed: () =>
        permissionService.hasPermission(currentUser, "system.manage"),
    },
    {
      id: "student",
      label: "Student Portal",
      icon: GraduationCap,
      allowed: () => currentUser?.role === "student",
    },
    {
      id: "public",
      label: "Public Portal",
      icon: Globe,
      allowed: () => currentUser?.role === "guest",
    },
    {
      id: "public-papers",
      label: "Published Papers",
      icon: FileText,
      allowed: () => currentUser?.role === "guest",
    },
    {
      id: "public-exams",
      label: "Public Exams",
      icon: CalendarDays,
      allowed: () => currentUser?.role === "guest",
    },
  ];

  const visibleRoleNav =
    currentUser?.role === "guest"
      ? navItems.filter((item) =>
          ["public", "public-papers", "public-exams"].includes(item.id),
        )
      : currentUser?.role === "student"
        ? navItems.filter((item) =>
            ["student", "public-papers"].includes(item.id),
          )
        : currentUser?.role === "system_auditor"
          ? navItems.filter((item) => ["dashboard", "audit"].includes(item.id))
          : navItems.filter((item) => item.allowed());
  const allowedNav = visibleRoleNav.filter(
    (item) =>
      item.allowed() ||
      (["public-papers"].includes(item.id) && currentUser?.role === "student"),
  );

  const hasMultipleDepartments =
    (currentUser?.assignedDepartments?.length || 0) > 1;

  return (
    <div className="min-h-screen bg-transparent flex flex-col relative">
      {/* Top Universal Examination Header */}
      <header className="bg-brand-secondary text-white sticky top-0 z-50 shadow-md">
        <div className="px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700"
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>

            <div
              className="flex items-center space-x-2.5 cursor-pointer"
              onClick={() => onNavigate("dashboard")}
            >
              <div className="w-8 h-8 rounded-lg bg-brand-primary flex items-center justify-center text-brand-secondary shadow">
                <GraduationCap className="h-5 w-5 font-bold" />
              </div>
              <div className="hidden sm:block">
                <span className="font-bold text-sm tracking-tight text-white block leading-tight">
                  APEX QPMS
                </span>
                <span className="text-[10px] text-slate-300 block">
                  {currentUser?.institutionName || "University Board"}
                </span>
              </div>
            </div>
          </div>

          {/* Center Department Context Badge (Requirements #6 & #7) */}
          <div className="hidden md:flex items-center space-x-2 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700">
            <Building className="h-3.5 w-3.5 text-brand-primary flex-shrink-0" />
            <span className="text-xs text-slate-300">Department Scope:</span>
            <strong className="text-xs text-white truncate max-w-[260px]">
              {currentDepartment?.name || "Central Administration"}
            </strong>

            {hasMultipleDepartments && (
              <select
                value={currentDepartment?.id || ""}
                onChange={(e) => setDepartment(e.target.value)}
                className="bg-brand-secondary text-white text-[11px] font-semibold rounded px-2 py-0.5 border border-slate-600 focus:outline-none focus:ring-1 focus:ring-brand-primary cursor-pointer ml-1"
                title="Switch Active Department"
              >
                {availableDepartments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.code} - {d.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Right Action Menu: Language + Profile */}
          <div className="flex items-center space-x-3">
            {/* Language Selector (Requirement #8: EN, GU, HI, AR, UR with RTL) */}
            <div className="flex items-center space-x-1.5 bg-slate-800/80 px-2 py-1 rounded-lg border border-slate-700">
              <Globe className="h-3.5 w-3.5 text-brand-primary" />
              <select
                value={locale}
                onChange={(e) => setLocale(e.target.value as any)}
                className="bg-transparent text-white text-xs font-medium focus:outline-none cursor-pointer"
                title="Select Interface Language"
              >
                {languages.map((lang) => (
                  <option
                    key={lang.code}
                    value={lang.code}
                    className="bg-brand-secondary text-white"
                  >
                    {lang.nativeName} ({lang.name})
                  </option>
                ))}
              </select>
            </div>

            {/* User Profile */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center space-x-2 p-1 rounded-lg hover:bg-slate-700 transition"
              >
                <div className="w-8 h-8 rounded-full bg-brand-primary text-brand-secondary font-bold text-xs flex items-center justify-center shadow">
                  {currentUser?.name?.slice(0, 2).toUpperCase() || "US"}
                </div>
                <div className="hidden lg:block text-left text-xs">
                  <div className="font-semibold text-white leading-tight flex items-center space-x-1">
                    <span>{currentUser?.name}</span>
                    {currentUser?.role === "department_admin" && (
                      <ShieldCheck className="h-3 w-3 text-emerald-400" />
                    )}
                  </div>
                  <div className="text-[10px] text-slate-300 capitalize">
                    {currentUser?.role?.replace("_", " ")}
                  </div>
                </div>
              </button>

              {/* User Dropdown */}
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-2xl border border-slate-200 py-2 text-slate-800 z-50 text-xs">
                  <div className="px-4 py-2 border-b border-slate-100">
                    <p className="font-bold text-brand-title">
                      {currentUser?.name}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {currentUser?.email}
                    </p>
                    <span className="inline-block mt-1 px-2 py-0.5 rounded bg-brand-primary-light text-slate-800 text-[10px] font-bold uppercase">
                      {currentUser?.role?.replace("_", " ")}
                    </span>
                  </div>

                  <div className="px-4 py-2 border-b border-slate-100 text-[11px] text-slate-600">
                    <div>
                      Institution:{" "}
                      <strong>{currentUser?.institutionName}</strong>
                    </div>
                    <div>
                      Department:{" "}
                      <strong>{currentDepartment?.name || "All"}</strong>
                    </div>
                  </div>

                  {hasMultipleDepartments && onOpenSelectDepartment && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowUserMenu(false);
                        onOpenSelectDepartment();
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center space-x-2 text-brand-title font-medium"
                    >
                      <Building2 className="h-4 w-4 text-brand-primary" />
                      <span>Change Active Department</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setShowUserMenu(false);
                      logout();
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-rose-50 text-rose-600 flex items-center space-x-2 font-semibold"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>{t("auth.signOut")}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Container: Sidebar + Content */}
      <div className="flex-1 flex min-h-0">
        {/* Sidebar (Desktop) */}
        <aside
          className={`hidden md:flex flex-col bg-brand-secondary text-white border-r border-slate-700 transition-all duration-300 sticky top-14 self-start h-[calc(100vh-3.5rem)] ${
            isCollapsed ? "w-16" : "w-60"
          }`}
        >
          {/* Navigation Items */}
          <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
            {allowedNav.map((item) => {
              const Icon = item.icon;
              const isActive = activeNav === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNavigate(item.id)}
                  title={isCollapsed ? item.label : undefined}
                  className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                    isActive
                      ? "bg-brand-primary text-brand-secondary font-bold shadow"
                      : "text-slate-300 hover:text-white hover:bg-slate-700/60"
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 flex-shrink-0 ${isActive ? "text-brand-secondary" : "text-slate-300"}`}
                  />
                  {!isCollapsed && (
                    <span className="truncate">{item.label}</span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Sidebar Collapse Toggle */}
          <div className="p-3 border-t border-slate-700/80 flex justify-end">
            <button
              type="button"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition"
              title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </button>
          </div>
        </aside>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-40 md:hidden">
            <div
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="fixed inset-y-0 left-0 w-64 bg-brand-secondary text-white shadow-2xl p-4 flex flex-col z-50">
              <div className="flex items-center justify-between pb-4 border-b border-slate-700">
                <span className="font-bold text-sm text-white">APEX QPMS</span>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 text-slate-400 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <nav className="flex-1 py-4 space-y-1 overflow-y-auto">
                {allowedNav.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeNav === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        onNavigate(item.id);
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                        isActive
                          ? "bg-brand-primary text-brand-secondary font-bold"
                          : "text-slate-300 hover:text-white hover:bg-slate-700"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>
        )}

        {/* Content Viewport */}
        <div className="flex-1 flex flex-col min-h-0">
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
            {children}
          </main>

          {/* Official Brand Footer (Requirement #3) */}
          <footer className="bg-brand-footer text-brand-paragraph text-xs py-4 px-6 border-t border-slate-200 mt-auto">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
              <div className="flex items-center space-x-2">
                <GraduationCap className="h-4 w-4 text-brand-primary" />
                <span className="font-semibold text-brand-title">
                  Apex Institute of Technology & Science
                </span>
                <span className="text-slate-400">•</span>
                <span>Autonomous Question Paper Examination SaaS</span>
              </div>
              <div className="text-[11px] text-brand-font">
                Confidential Examination Workflow • Strict Department Isolation
                Enforced
              </div>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
};
