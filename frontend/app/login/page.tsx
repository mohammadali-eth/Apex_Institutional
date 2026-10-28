"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/components/ui/Toast";
import {
  Lock,
  Mail,
  ArrowRight,
  Eye,
  EyeOff,
  Shield,
  Building2,
  Sparkles,
  ExternalLink,
  GraduationCap,
  ArrowLeft
} from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [superAdminNotice, setSuperAdminNotice] = useState(false);

  const { login } = useAuth();
  const toast = useToast();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuperAdminNotice(false);

    if (!email.trim() || !password) {
      setErrorMessage("Please enter both your university email and account password.");
      return;
    }

    setLoading(true);
    try {
      const loggedUser = await login(email.trim(), password);

      // Super Admin Security Rule: Super Admins must authenticate on Port 3002
      if (loggedUser && loggedUser.role_name === "SUPER_ADMIN") {
        localStorage.removeItem("qpms_token");
        setSuperAdminNotice(true);
        toast.error("Super Admin accounts must use the dedicated Super Admin Portal on port 3002.");
        setTimeout(() => {
          window.location.href = "http://localhost:3002/login";
        }, 2200);
        return;
      }

      toast.success(`Welcome back, ${loggedUser.full_name}!`);
      router.push("/dashboard");
    } catch (err: any) {
      setErrorMessage(
        err.message || "Failed to sign in. Please verify your credentials or institutional account status."
      );
    } finally {
      setLoading(false);
    }
  };

  const quickFill = (userEmail: string, pass: string = "Admin@12345") => {
    setEmail(userEmail);
    setPassword(pass);
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-[var(--background-color)] flex flex-col justify-between py-8 px-4 sm:px-6 lg:px-8">
      
      {/* Top Bar Navigation */}
      <div className="max-w-md w-full mx-auto flex items-center justify-between text-xs">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 font-bold text-[var(--title-color)] hover:text-[#2e4d15] transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Home</span>
        </Link>
        <span className="text-[var(--font-color)]">User Portal &bull; Port 3000</span>
      </div>

      {/* Main Login Card Container */}
      <div className="max-w-md w-full mx-auto my-auto space-y-6">
        
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <Link href="/" className="inline-block">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-[var(--radius-lg)] bg-[#82c341] text-[#000000] font-black text-2xl shadow-[var(--shadow-md)]">
              Ω
            </div>
          </Link>
          <h1 className="text-2xl font-extrabold text-[var(--title-color)] tracking-tight">
            QPMS Apex
          </h1>
          <p className="text-xs text-[var(--paragraph-color)] max-w-xs mx-auto">
            University Assessment, Question Bank & Examination Paper Management
          </p>
        </div>

        {/* Super Admin Redirection Notice */}
        {superAdminNotice && (
          <div className="p-4 rounded-[var(--radius-md)] bg-[#eaf5de] border border-[#82c341] text-[#2e4d15] space-y-2 text-xs">
            <div className="flex items-center gap-2 font-bold">
              <Shield className="w-4 h-4 text-[#82c341]" />
              <span>Super Admin Account Detected</span>
            </div>
            <p>
              Super Admin operations are isolated to the dedicated Command Console on <b>Port 3002</b>.
              Redirecting you now...
            </p>
            <div className="pt-1">
              <a
                href="http://localhost:3002/login"
                className="font-bold underline text-[#355a18] flex items-center gap-1"
              >
                <span>Click here if not redirected automatically</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        )}

        {/* Login Panel */}
        <div className="bg-white border border-[var(--border-color)] rounded-[var(--radius-xl)] p-6 sm:p-8 shadow-[var(--shadow-md)] space-y-5">
          <div className="pb-3 border-b border-[var(--border-color)]">
            <h2 className="text-base font-bold text-[var(--title-color)]">Sign In</h2>
            <p className="text-xs text-[var(--paragraph-color)] mt-0.5">
              Access your institutional examination workspace
            </p>
          </div>

          {/* Error Message Alert */}
          {errorMessage && (
            <div className="p-3 rounded-[var(--radius-md)] bg-[#fee2e2] border border-[#fca5a5] text-[#991b1b] text-xs leading-relaxed">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Email Field */}
            <div>
              <label className="block text-xs font-semibold text-[var(--title-color)] mb-1.5">
                University Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[var(--muted-text-color)] absolute left-3.5 top-3.5 pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  placeholder="name@university.in or student@example.com"
                  required
                  className="w-full pl-10 pr-3 py-2.5 bg-white border border-[var(--border-color)] rounded-[var(--radius-md)] text-sm text-[var(--title-color)] placeholder:text-[var(--muted-text-color)] focus:outline-none focus:border-[#82c341] focus:ring-2 focus:ring-[#82c341]/20 transition"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-[var(--title-color)]">
                  Account Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs font-bold text-[#355a18] hover:text-[#2e4d15] hover:underline"
                >
                  Forgot Password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-[var(--muted-text-color)] absolute left-3.5 top-3.5 pointer-events-none" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  placeholder="••••••••••••"
                  required
                  className="w-full pl-10 pr-10 py-2.5 bg-white border border-[var(--border-color)] rounded-[var(--radius-md)] text-sm text-[var(--title-color)] placeholder:text-[var(--muted-text-color)] focus:outline-none focus:border-[#82c341] focus:ring-2 focus:ring-[#82c341]/20 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-[var(--muted-text-color)] hover:text-[var(--title-color)] p-0.5"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 text-sm font-bold flex items-center justify-center gap-2 shadow-[var(--shadow-sm)] disabled:opacity-50 mt-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Portal</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Access Demo Credentials */}
          <div className="pt-4 border-t border-[var(--border-color)]">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted-text-color)] mb-2.5 text-center">
              Quick Sign-in (Seed Accounts)
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => quickFill("john@universityadmin.in")}
                className="px-2.5 py-2 bg-[var(--surface-color)] hover:bg-[#eaf5de] border border-[var(--border-color)] hover:border-[#82c341] rounded-[var(--radius-md)] text-left transition"
              >
                <span className="font-bold text-[var(--title-color)] block text-[10px]">UNIV ADMIN</span>
                <span className="text-[10px] text-[var(--paragraph-color)] truncate block">john@universityadmin.in</span>
              </button>
              <button
                type="button"
                onClick={() => quickFill("hod@bca.university.in")}
                className="px-2.5 py-2 bg-[var(--surface-color)] hover:bg-[#eaf5de] border border-[var(--border-color)] hover:border-[#82c341] rounded-[var(--radius-md)] text-left transition"
              >
                <span className="font-bold text-[var(--title-color)] block text-[10px]">HOD (CSIT)</span>
                <span className="text-[10px] text-[var(--paragraph-color)] truncate block">hod@bca.university.in</span>
              </button>
              <button
                type="button"
                onClick={() => quickFill("teacher@university.in")}
                className="px-2.5 py-2 bg-[var(--surface-color)] hover:bg-[#eaf5de] border border-[var(--border-color)] hover:border-[#82c341] rounded-[var(--radius-md)] text-left transition"
              >
                <span className="font-bold text-[var(--title-color)] block text-[10px]">FACULTY</span>
                <span className="text-[10px] text-[var(--paragraph-color)] truncate block">teacher@university.in</span>
              </button>
              <button
                type="button"
                onClick={() => quickFill("controller@university.in")}
                className="px-2.5 py-2 bg-[var(--surface-color)] hover:bg-[#eaf5de] border border-[var(--border-color)] hover:border-[#82c341] rounded-[var(--radius-md)] text-left transition"
              >
                <span className="font-bold text-[var(--title-color)] block text-[10px]">CONTROLLER</span>
                <span className="text-[10px] text-[var(--paragraph-color)] truncate block">controller@university.in</span>
              </button>
              <button
                type="button"
                onClick={() => quickFill("student@gmail.com")}
                className="col-span-2 px-2.5 py-2 bg-[var(--surface-color)] hover:bg-[#eaf5de] border border-[var(--border-color)] hover:border-[#82c341] rounded-[var(--radius-md)] text-left transition flex items-center justify-between"
              >
                <div>
                  <span className="font-bold text-[var(--title-color)] block text-[10px]">STUDENT ACCOUNT</span>
                  <span className="text-[10px] text-[var(--paragraph-color)] truncate block">student@gmail.com</span>
                </div>
                <GraduationCap className="w-4 h-4 text-[#82c341]" />
              </button>
            </div>
          </div>

          {/* Registration Guidance */}
          <div className="pt-4 border-t border-[var(--border-color)] text-center space-y-2">
            <p className="text-xs text-[var(--paragraph-color)]">
              New student or general guest?{" "}
              <Link
                href="/signup"
                className="font-bold text-[#355a18] hover:text-[#2e4d15] hover:underline"
              >
                Create a Student Account
              </Link>
            </p>
            <p className="text-[11px] text-[var(--muted-text-color)] leading-relaxed">
              Faculty & examination staff accounts are provisioned via administrative invitation by their institution.
            </p>
          </div>
        </div>

        {/* Super Admin Portal Redirect Box */}
        <div className="bg-[var(--secondary-color)] rounded-[var(--radius-lg)] p-4 text-white flex items-center justify-between text-xs">
          <div className="flex items-center gap-2.5">
            <Shield className="w-4 h-4 text-[#82c341] shrink-0" />
            <div>
              <span className="font-bold block">Super Administrator?</span>
              <span className="text-[11px] text-white/70">Access the Global Platform Control Plane</span>
            </div>
          </div>
          <a
            href="http://localhost:3002/login"
            className="px-3 py-1.5 rounded bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-[11px] transition shrink-0 flex items-center gap-1"
          >
            <span>Port 3002</span>
            <ExternalLink className="w-3 h-3 text-[#82c341]" />
          </a>
        </div>

      </div>

      {/* Footer Notice */}
      <div className="text-center text-xs text-[var(--font-color)] max-w-md mx-auto">
        &copy; {new Date().getFullYear()} QPMS Apex &bull; Secure Academic Assessment Infrastructure
      </div>
    </div>
  );
}
