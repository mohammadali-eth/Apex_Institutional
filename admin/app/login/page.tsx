"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  Lock,
  Mail,
  ArrowRight,
  ExternalLink,
  AlertCircle,
  Eye,
  EyeOff,
  Server,
  Building2,
  KeyRound,
  FileCheck2,
  Radio,
  Check,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export default function SuperAdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [autoFilled, setAutoFilled] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await login(email, password);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err?.message || "Invalid Super Admin credentials.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const fillSuperAdminSeed = () => {
    setEmail("apex@superadmin.com");
    setPassword("Admin@12345");
    setError(null);
    setAutoFilled(true);
    setTimeout(() => setAutoFilled(false), 2500);
  };

  return (
    <div className="min-h-screen bg-[var(--background-color)] flex items-stretch">
      {/* ========================================================
          LEFT COLUMN: Executive Platform Command Showcase (lg+)
          ======================================================== */}
      <div className="hidden lg:flex lg:w-5/12 xl:w-1/2 bg-[var(--secondary-color)] text-white flex-col justify-between p-12 relative overflow-hidden border-r border-[#38434a]">
        {/* Subtle Background Pattern & Glow */}
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle at 25px 25px, #82c341 2%, transparent 0%), radial-gradient(circle at 75px 75px, #ffffff 1.5%, transparent 0%)`,
            backgroundSize: "100px 100px",
          }}
        />
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#82c341]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-[#82c341]/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Branding */}
        <div className="relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-[#82c341] text-black font-black text-2xl flex items-center justify-center shadow-lg shadow-[#82c341]/20">
              Ω
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg tracking-wider text-white">
                  QPMS APEX
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#82c341] text-black uppercase tracking-wider">
                  Super Admin
                </span>
              </div>
              <p className="text-xs text-[#dce1e4] font-medium tracking-wide">
                Root Governance Plane • Port 3002
              </p>
            </div>
          </div>
        </div>

        {/* Center Pillars Showcase */}
        <div className="relative z-10 my-10 space-y-6 max-w-lg">
          <div>
            <h2 className="text-2xl xl:text-3xl font-black text-white tracking-tight leading-snug">
              Multi-University Assessment Governance & Control
            </h2>
            <p className="text-xs xl:text-sm text-[#dce1e4] mt-2 leading-relaxed">
              Centralized platform administration for university tenant provisioning, immediate suspension isolation, and institutional exam paper generation oversight.
            </p>
          </div>

          <div className="space-y-3.5 pt-2">
            <div className="flex items-start gap-3 p-3.5 rounded-lg bg-white/5 border border-white/10 backdrop-blur-xs">
              <div className="p-2 rounded-md bg-[#82c341]/20 text-[#82c341] shrink-0 mt-0.5">
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Tenant Isolation & Suspension
                </h4>
                <p className="text-xs text-[#dce1e4]/80 mt-0.5 leading-relaxed">
                  Real-time hierarchical tenant gating. Suspending a university immediately blocks API and authentication access across all its colleges and users.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3.5 rounded-lg bg-white/5 border border-white/10 backdrop-blur-xs">
              <div className="p-2 rounded-md bg-[#82c341]/20 text-[#82c341] shrink-0 mt-0.5">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Autonomous University Onboarding
                </h4>
                <p className="text-xs text-[#dce1e4]/80 mt-0.5 leading-relaxed">
                  Transactional provisioning of universities, dedicated University Themes, and designated University Administrators in a single atomic flow.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3.5 rounded-lg bg-white/5 border border-white/10 backdrop-blur-xs">
              <div className="p-2 rounded-md bg-[#82c341]/20 text-[#82c341] shrink-0 mt-0.5">
                <FileCheck2 className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Platform Audit & Question Intelligence
                </h4>
                <p className="text-xs text-[#dce1e4]/80 mt-0.5 leading-relaxed">
                  Global immutable audit trails tracking logins, question lifecycle changes, and automated examination paper distributions.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Telemetry Status Pill */}
        <div className="relative z-10 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-[#dce1e4]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#82c341] animate-pulse" />
            <span className="font-mono font-medium">Control Plane Status: ONLINE</span>
          </div>
          <span className="text-[11px] text-[#dce1e4]/60 font-mono">FastAPI :8000 &bull; Postgres :5432</span>
        </div>
      </div>

      {/* ========================================================
          RIGHT COLUMN: Authentication Card Panel
          ======================================================== */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 sm:p-12 overflow-y-auto">
        <div className="w-full max-w-md my-auto">
          {/* Mobile Top Header (hidden on lg+) */}
          <div className="lg:hidden text-center mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[var(--secondary-color)] border-2 border-[#82c341] text-[#82c341] font-black text-2xl shadow-md mb-2.5">
              Ω
            </div>
            <h1 className="text-xl font-black text-[var(--title-color)]">QPMS APEX</h1>
            <div className="inline-flex items-center gap-1.5 mt-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#82c341] text-black">
              <span>SUPER ADMIN &bull; PORT 3002</span>
            </div>
            <p className="text-xs text-[var(--paragraph-color)] mt-1.5">
              Platform governance and multi-tenant administration console
            </p>
          </div>

          {/* Main Card */}
          <div className="bg-[var(--surface-color)] border border-[var(--border-color)] rounded-[var(--radius-lg)] p-8 sm:p-10 shadow-[var(--shadow-md)]">
            {/* Header inside card */}
            <div className="mb-6 pb-4 border-b border-[var(--border-color)]">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold tracking-wider text-[#82c341] uppercase">
                  Root Authentication
                </span>
                <span className="text-[11px] font-mono text-[var(--muted-text-color)] bg-[var(--surface-muted)] px-2 py-0.5 rounded border border-[var(--border-color)]">
                  Port 3002
                </span>
              </div>
              <h2 className="text-xl font-bold text-[var(--title-color)] tracking-tight">
                Super Admin Console
              </h2>
              <p className="text-xs text-[var(--muted-text-color)] mt-1">
                Enter your system credentials to access multi-university governance
              </p>
            </div>

            {/* Error Alert */}
            {error && (
              <div className="mb-5 p-3.5 rounded-[var(--radius-md)] bg-[#fee2e2] border border-[#fecaca] flex items-start gap-3 animate-in fade-in duration-200">
                <AlertCircle className="w-5 h-5 text-[#991b1b] shrink-0 mt-0.5" />
                <div className="text-xs text-[#991b1b] font-medium leading-relaxed">{error}</div>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[var(--title-color)] uppercase tracking-wider mb-1.5">
                  Super Admin Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#838383]">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="apex@superadmin.com"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-[var(--border-color)] rounded-[var(--radius-md)] text-[var(--title-color)] placeholder:text-[var(--muted-text-color)] text-sm focus:outline-none focus:border-[#82c341] focus:ring-2 focus:ring-[#82c341]/20 transition"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-[var(--title-color)] uppercase tracking-wider">
                    Master Password
                  </label>
                  <span className="text-[10px] text-[var(--muted-text-color)] font-medium">
                    256-bit encrypted
                  </span>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#838383]">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-10 pr-10 py-2.5 bg-white border border-[var(--border-color)] rounded-[var(--radius-md)] text-[var(--title-color)] placeholder:text-[var(--muted-text-color)] text-sm focus:outline-none focus:border-[#82c341] focus:ring-2 focus:ring-[#82c341]/20 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#838383] hover:text-[var(--title-color)] transition"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 bg-[#82c341] hover:brightness-95 text-black font-bold rounded-[var(--radius-md)] shadow-sm flex items-center justify-center gap-2 transition disabled:opacity-60 disabled:cursor-not-allowed mt-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to Super Admin Console</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Quick Access Seed Auto-fill Box */}
            <div className="mt-6 pt-5 border-t border-[var(--border-color)]">
              <div className="p-3 bg-[var(--surface-muted)] rounded-[var(--radius-md)] border border-[var(--border-color)]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-[var(--title-color)] flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-[#82c341]" />
                    <span>Default Super Admin Credentials</span>
                  </span>
                  <span className="text-[10px] text-[var(--muted-text-color)] font-mono">Dev / Seed</span>
                </div>
                <div className="flex items-center justify-between text-xs text-[var(--paragraph-color)] font-mono bg-white px-2.5 py-1.5 rounded border border-[var(--border-color)] mb-2.5">
                  <span className="truncate">apex@superadmin.com</span>
                  <span className="text-[var(--muted-text-color)] shrink-0 ml-2">&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;</span>
                </div>
                <button
                  type="button"
                  onClick={fillSuperAdminSeed}
                  className="w-full text-xs text-center py-1.5 px-3 bg-white hover:bg-[#82c341]/10 text-[var(--title-color)] font-semibold rounded-[var(--radius-sm)] border border-[var(--border-color)] hover:border-[#82c341] transition flex items-center justify-center gap-1.5"
                >
                  {autoFilled ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-[#82c341]" />
                      <span className="text-[#325816]">Credentials Inserted</span>
                    </>
                  ) : (
                    <span>Auto-Fill Super Admin Credentials</span>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* University Portal Redirection Box */}
          <div className="mt-5 p-4 rounded-[var(--radius-lg)] bg-[var(--surface-color)] border border-[var(--border-color)] shadow-xs flex items-center justify-between gap-3">
            <div className="text-left">
              <p className="text-xs font-bold text-[var(--title-color)]">
                University Staff or Student?
              </p>
              <p className="text-[11px] text-[var(--muted-text-color)]">
                University Admins, Faculty, HODs, and Students log in on Port 3000
              </p>
            </div>
            <a
              href="http://localhost:3000/login"
              className="btn-secondary text-xs py-1.5 px-3 shrink-0 flex items-center gap-1.5 hover:border-[#82c341]"
            >
              <span>Port 3000</span>
              <ExternalLink className="w-3.5 h-3.5 text-[#82c341]" />
            </a>
          </div>

          {/* Security & Audit Notice */}
          <p className="mt-5 text-center text-[11px] text-[var(--muted-text-color)] leading-relaxed">
            Restricted access. All authentication operations and IP sessions are recorded in the immutable platform audit trail.
          </p>
        </div>
      </div>
    </div>
  );
}
