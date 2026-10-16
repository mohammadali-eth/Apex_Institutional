"use client";

import React, { useState, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { useI18n } from "@/hooks/useI18n";
import { userService } from "@/lib/services/userService";
import {
  GraduationCap,
  ArrowRight,
  Eye,
  EyeOff,
  Sparkles,
  KeyRound,
  Lock,
  Mail,
  UserCheck,
} from "lucide-react";

const loginBg = "/assets/login-bg/image.png";

interface LoginPageProps {
  onSuccess: (status: {
    requiresDeptSelection: boolean;
    noDeptAssigned: boolean;
    portalRoute?: string;
  }) => void;
}

interface RolePreset {
  id: string;
  label: string;
  roleName: string;
  userName: string;
  userId: string;
  password: string;
  aliases: string[];
  icon: string;
  color: string;
  description: string;
}

const ROLE_PRESETS: RolePreset[] = [
  {
    id: "admin",
    label: "Admin",
    roleName: "Super / University Admin",
    userName: "Avery Morgan",
    userId: "u-super",
    password: "admin123",
    aliases: [
      "admin",
      "admin123",
      "admin@123",
      "superadmin",
      "superadmin123",
      "apexadmin",
    ],
    icon: "👑",
    color: "from-amber-500 to-amber-600",
    description:
      "System administration, user creation & institutional settings",
  },
  {
    id: "hod",
    label: "HOD",
    roleName: "Department Admin / HOD",
    userName: "Prof. Sunita Sharma",
    userId: "u-sunita",
    password: "hod123",
    aliases: ["hod", "hod123", "hod@123", "deptadmin", "deptadmin123"],
    icon: "🏛️",
    color: "from-sky-500 to-sky-600",
    description: "Department syllabus, course management & faculty overview",
  },
  {
    id: "faculty",
    label: "Faculty",
    roleName: "Faculty / Question Setter",
    userName: "Dr. Rahul Patel",
    userId: "u-rahul",
    password: "faculty123",
    aliases: [
      "faculty",
      "faculty123",
      "faculty@123",
      "setter",
      "setter123",
      "teacher",
    ],
    icon: "✍️",
    color: "from-emerald-500 to-emerald-600",
    description: "Create & contribute questions, generate draft papers",
  },
  {
    id: "manager",
    label: "QB Manager",
    roleName: "Question Bank Manager",
    userName: "Prof. Amit Shah",
    userId: "u-amit",
    password: "manager123",
    aliases: ["manager", "manager123", "manager@123", "qbmanager"],
    icon: "📚",
    color: "from-indigo-500 to-indigo-600",
    description: "Question review, taxonomy tagging & bank approvals",
  },
  {
    id: "reviewer",
    label: "Reviewer",
    roleName: "Paper Reviewer",
    userName: "Nikhil Rao",
    userId: "u-reviewer",
    password: "reviewer123",
    aliases: ["reviewer", "reviewer123", "reviewer@123", "evaluator"],
    icon: "🛡️",
    color: "from-purple-500 to-purple-600",
    description: "Audit & verify examination paper blueprints",
  },
  {
    id: "exam",
    label: "Exam Cell",
    roleName: "Exam Coordinator",
    userName: "Prof. Rajesh Joshi",
    userId: "u-rajesh",
    password: "exam123",
    aliases: ["exam", "exam123", "exam@123", "controller", "coordinator"],
    icon: "📝",
    color: "from-teal-500 to-teal-600",
    description: "Finalize, encrypt & bundle semester question papers",
  },
  {
    id: "student",
    label: "Student",
    roleName: "Student / Viewer",
    userName: "Dr. Neha Sharma",
    userId: "u-neha",
    password: "student123",
    aliases: ["student", "student123", "student@123", "viewer", "viewer123"],
    icon: "🎓",
    color: "from-slate-500 to-slate-600",
    description: "Read-only examination syllabus & past papers",
  },
];

export const LoginPage: React.FC<LoginPageProps> = ({ onSuccess }) => {
  const { login, loginWithCredentials } = useAuth();
  const { t } = useI18n();
  const { showToast } = useToast();

  const [email, setEmail] = useState("portal@maktabah.edu");
  const [selectedRolePreset, setSelectedRolePreset] = useState<RolePreset>(
    ROLE_PRESETS[2],
  ); // Default to Faculty
  const [password, setPassword] = useState("faculty123");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  // Detect matching role based on current password input in real-time
  const detectedRole = useMemo(() => {
    const trimmed = password.trim().toLowerCase();
    if (!trimmed) return selectedRolePreset;

    const matched = ROLE_PRESETS.find((preset) =>
      preset.aliases.some((alias) => alias.toLowerCase() === trimmed),
    );
    return matched || selectedRolePreset;
  }, [password, selectedRolePreset]);

  // Handle clicking a role pill
  const handleSelectRolePreset = (preset: RolePreset) => {
    setSelectedRolePreset(preset);
    setPassword(preset.password);
    setPasswordError("");
    if (preset.id === "admin") {
      setEmail("admin");
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setEmailError("Please enter your institutional email address.");
      showToast("Login failed", "Email is required to continue.", "warning");
      return;
    }

    const isAdministrativeUsername = trimmedEmail.toLowerCase() === "admin";
    if (!isAdministrativeUsername && (!trimmedEmail.includes("@") || !trimmedEmail.includes("."))) {
      setEmailError(
        "Please enter a valid email address (e.g. portal@maktabah.edu) or administrative username.",
      );
      showToast("Invalid identifier", "Enter a valid email address or 'admin'", "warning");
      return;
    }

    if (!password.trim()) {
      setPasswordError("Please enter your role password.");
      showToast("Login failed", "Password is required to continue.", "warning");
      return;
    }

    setIsLoading(true);
    setEmailError("");
    setPasswordError("");

    // 1. Attempt backend session authentication first via loginWithCredentials
    try {
      const backendRes = await loginWithCredentials(trimmedEmail, password);
      if (backendRes.success) {
        setIsLoading(false);
        showToast(
          "Signed In",
          `Welcome back! (${detectedRole.roleName})`,
          "success",
        );
        onSuccess({
          ...(backendRes.status || { requiresDeptSelection: false, noDeptAssigned: false }),
          portalRoute: backendRes.portalRoute,
        });
        return;
      } else if (
        backendRes.error &&
        !backendRes.error.includes("Failed to fetch") &&
        !backendRes.error.includes("NetworkError")
      ) {
        // Explicit backend authentication rejection
        setIsLoading(false);
        setPasswordError(backendRes.error);
        showToast("Authentication Failed", backendRes.error, "error");
        return;
      }
    } catch {
      // Backend not running; fall back to local demo state below
    }

    // 2. Demo fallback for local development when backend is offline
    const allUsers = userService.getUsers();
    let targetUserId = detectedRole.userId;

    const matchedByEmail = allUsers.find(
      (u) => u.email.toLowerCase() === trimmedEmail.toLowerCase(),
    );

    const isSpecificRolePassword = ROLE_PRESETS.some((preset) =>
      preset.aliases.some(
        (alias) => alias.toLowerCase() === password.trim().toLowerCase(),
      ),
    );

    if (matchedByEmail && !isSpecificRolePassword) {
      targetUserId = matchedByEmail.id;
    }

    const targetUser =
      allUsers.find((u) => u.id === targetUserId) || allUsers[0];

    window.setTimeout(() => {
      setIsLoading(false);
      if (!targetUser) {
        showToast("Login Error", "User account not found.", "error");
        return;
      }

      const res = login(targetUser.id);
      showToast(
        "Signed In",
        `Welcome back, ${targetUser.name}! (${detectedRole.roleName})`,
        "success",
      );
      onSuccess(res);
    }, 250);
  };

  return (
    <div className="relative min-h-screen flex flex-col justify-between items-center overflow-x-hidden bg-gradient-to-b from-[#f5f8f3] via-[#eef3eb] to-[#e1e9dc] select-none py-6 px-4 sm:px-6">
      {/* 1. Architectural Blueprint Gridlines Background */}
      <div
        className="fixed inset-0 pointer-events-none z-0 opacity-70"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(69, 84, 92, 0.08) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(69, 84, 92, 0.08) 1px, transparent 1px)
          `,
          backgroundSize: "44px 44px",
          maskImage: "radial-gradient(ellipse 90% 85% at 50% 50%, #000 65%, transparent 100%)",
          WebkitMaskImage: "radial-gradient(ellipse 90% 85% at 50% 50%, #000 65%, transparent 100%)",
        }}
        aria-hidden="true"
      />

      {/* 2. Micro Drafting Gridlines for Academic Precision */}
      <div
        className="fixed inset-0 pointer-events-none z-0 opacity-30"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(128, 195, 67, 0.08) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(128, 195, 67, 0.08) 1px, transparent 1px)
          `,
          backgroundSize: "11px 11px",
        }}
        aria-hidden="true"
      />

      {/* 3. Soft Ambient Center Glow behind the card */}
      <div
        className="fixed inset-0 pointer-events-none z-0 bg-[radial-gradient(ellipse_70%_55%_at_50%_46%,rgba(255,255,255,0.85),transparent_75%)]"
        aria-hidden="true"
      />

      {/* 4. Top Accent Brand Light */}
      <div
        className="fixed inset-0 pointer-events-none z-0 bg-[radial-gradient(ellipse_80%_45%_at_50%_0%,rgba(130,195,65,0.18),transparent_70%)]"
        aria-hidden="true"
      />

      {/* 5. Campus Architectural Gate Illustration */}
      <div
        className="fixed inset-x-0 bottom-0 pointer-events-none select-none z-0 flex justify-center items-end"
        aria-hidden="true"
      >
        <div className="relative w-full max-w-[2400px] flex justify-center items-end">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={loginBg}
            alt="Maktabah Jafariyah Gateway"
            className="w-full h-auto max-h-[58vh] sm:max-h-[66vh] md:max-h-[72vh] object-cover sm:object-contain object-bottom drop-shadow-[0_-6px_28px_rgba(0,0,0,0.06)] opacity-95 transition-all duration-700"
            loading="eager"
          />
          {/* Seamless sky blend transition so the illustration merges softly into the grid */}
          <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-[#f5f8f3] via-[#f5f8f3]/50 to-transparent pointer-events-none" />
          {/* Subtle ground baseline blend */}
          <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[#e1e9dc]/80 to-transparent pointer-events-none" />
        </div>
      </div>

      {/* Center Hero & Login Card */}
      <main className="relative z-10 w-full max-w-md my-auto flex flex-col items-center justify-center">
        <div className="w-full max-w-md">
          {/* Card Container */}
          <div className="bg-white/95 backdrop-blur-xl py-7 px-6 sm:px-8 shadow-2xl rounded-3xl border border-white/80 ring-1 ring-slate-900/5 transition-all">
            {/* Form Title & Subtitle */}
            <div className="text-center mb-6">
              <div className="mx-auto w-12 h-12 rounded-2xl bg-brand-primary-light border border-brand-primary/20 flex items-center justify-center mb-3 shadow-sm">
                <GraduationCap className="h-6 w-6 text-brand-primary" />
              </div>
              <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">
                Institutional Sign In
              </h2>
              <p className="mt-1 text-xs text-slate-500 font-medium">
                One institutional email. Enter role password to sign in.
              </p>
            </div>

            {/* Quick Role Selection Pills */}
            <div className="mb-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center space-x-1">
                  <UserCheck className="h-3.5 w-3.5 text-brand-primary" />
                  <span>Choose Persona Role</span>
                </span>
                <span className="text-[10px] font-semibold text-brand-primary bg-brand-primary-light px-2 py-0.5 rounded-full">
                  Click to fill password
                </span>
              </div>

              <div className="grid grid-cols-4 sm:grid-cols-4 gap-1.5">
                {ROLE_PRESETS.slice(0, 4).map((preset) => {
                  const isActive = detectedRole.id === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleSelectRolePreset(preset)}
                      className={`py-2 px-1 text-center rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center space-y-0.5 border ${
                        isActive
                          ? "bg-brand-primary text-white border-brand-primary shadow-sm scale-[1.02]"
                          : "bg-slate-50/90 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300"
                      }`}
                    >
                      <span className="text-sm">{preset.icon}</span>
                      <span className="text-[11px] truncate w-full">
                        {preset.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-3 gap-1.5 mt-1.5">
                {ROLE_PRESETS.slice(4).map((preset) => {
                  const isActive = detectedRole.id === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleSelectRolePreset(preset)}
                      className={`py-1.5 px-1 text-center rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1 border ${
                        isActive
                          ? "bg-brand-primary text-white border-brand-primary shadow-sm scale-[1.02]"
                          : "bg-slate-50/90 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300"
                      }`}
                    >
                      <span className="text-xs">{preset.icon}</span>
                      <span className="text-[10px] truncate">
                        {preset.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Login Form */}
            <form className="space-y-4" onSubmit={handleSignIn}>
              {/* Institutional Email Field */}
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 tracking-wider mb-1">
                  Institutional Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="h-4 w-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (emailError) setEmailError("");
                    }}
                    placeholder="portal@maktabah.edu"
                    className={`w-full pl-9 pr-3.5 py-2.5 bg-slate-50/60 border rounded-xl text-sm text-slate-900 font-medium focus:bg-white focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition ${
                      emailError
                        ? "border-rose-300 bg-rose-50"
                        : "border-slate-300"
                    }`}
                  />
                </div>
                {emailError && (
                  <p className="mt-1.5 text-xs text-rose-600 font-medium">
                    {emailError}
                  </p>
                )}
              </div>

              {/* Password Field */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold uppercase text-slate-700 tracking-wider">
                    Role Password
                  </label>
                  <span className="text-[11px] text-slate-400 font-mono">
                    Hint: {detectedRole.password}
                  </span>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (passwordError) setPasswordError("");
                    }}
                    placeholder="Enter role password"
                    className={`w-full pl-9 pr-10 py-2.5 bg-slate-50/60 border rounded-xl text-sm text-slate-900 font-medium focus:bg-white focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition ${
                      passwordError
                        ? "border-rose-300 bg-rose-50"
                        : "border-slate-300"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none transition"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {passwordError && (
                  <p className="mt-1.5 text-xs text-rose-600 font-medium">
                    {passwordError}
                  </p>
                )}
              </div>

              {/* Dynamic Role Detected Badge */}
              <div className="p-2.5 rounded-xl bg-emerald-50/80 border border-emerald-200/80 flex items-center justify-between text-xs text-emerald-900 animate-fadeIn">
                <div className="flex items-center space-x-2 truncate">
                  <span className="text-base">{detectedRole.icon}</span>
                  <div className="truncate">
                    <span className="font-bold text-slate-800">
                      {detectedRole.userName}
                    </span>
                    <span className="block text-[10px] text-emerald-700 font-medium truncate">
                      {detectedRole.roleName}
                    </span>
                  </div>
                </div>
                <span className="ml-2 px-2 py-0.5 rounded-md bg-emerald-100 text-[10px] font-mono font-bold text-emerald-800 flex-shrink-0">
                  {detectedRole.password}
                </span>
              </div>

              {/* Remember Me Toggle */}
              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center space-x-2 text-slate-600 cursor-pointer select-none font-medium">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-slate-300 text-brand-primary accent-brand-primary focus:ring-brand-primary w-4 h-4"
                  />
                  <span>Remember this terminal</span>
                </label>
                <a
                  href="#directory"
                  onClick={(e) => {
                    e.preventDefault();
                    showToast(
                      "Directory Service",
                      "Institution passwords can be reset via IT administration.",
                      "info",
                    );
                  }}
                  className="text-slate-500 hover:text-brand-primary font-medium transition"
                >
                  Forgot password?
                </a>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl text-sm font-bold text-white bg-brand-primary hover:bg-brand-primary-hover shadow-lg shadow-brand-primary/25 transition-all transform active:scale-[0.98] disabled:opacity-50"
              >
                <span>
                  {isLoading
                    ? "Authenticating..."
                    : `Sign In as ${detectedRole.label}`}
                </span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>

            {/* Quick Password Guide Footer */}
            <div className="mt-5 pt-4 border-t border-slate-100 text-center">
              <div className="flex items-center justify-center space-x-1.5 text-[11px] font-semibold text-slate-500 mb-1.5">
                <KeyRound className="h-3 w-3 text-brand-primary" />
                <span>One Email • Passwords by Role:</span>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-1 text-[10px]">
                <span className="font-mono bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200">
                  admin123
                </span>
                <span className="text-slate-300">•</span>
                <span className="font-mono bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200">
                  hod123
                </span>
                <span className="text-slate-300">•</span>
                <span className="font-mono bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200">
                  faculty123
                </span>
                <span className="text-slate-300">•</span>
                <span className="font-mono bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200">
                  manager123
                </span>
                <span className="text-slate-300">•</span>
                <span className="font-mono bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200">
                  reviewer123
                </span>
                <span className="text-slate-300">•</span>
                <span className="font-mono bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200">
                  student123
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer Branding */}
      <footer className="relative z-10 w-full py-3 px-6 text-center text-[11px] font-medium text-slate-600/90 drop-shadow-sm">
        <span>Maktabah Jafariyah Knowledge &amp; Research Academy</span>
        <span className="mx-1.5 text-slate-400">•</span>
        <span>Question Paper Management &amp; Generation System</span>
      </footer>
    </div>
  );
};
