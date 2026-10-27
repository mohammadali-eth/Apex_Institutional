"use client";

import React, { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import {
  GraduationCap,
  ArrowRight,
  Eye,
  EyeOff,
  Lock,
  Mail,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";

const loginBg = "/assets/login-bg/image.png";

interface LoginPageProps {
  onSuccess: (status: {
    requiresDeptSelection: boolean;
    noDeptAssigned: boolean;
    portalRoute?: string;
  }) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onSuccess }) => {
  const { loginWithCredentials } = useAuth();
  const { showToast } = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setErrorMessage("Please enter your email address or username.");
      showToast("Identifier Required", "Please enter your email or username.", "warning");
      return;
    }

    if (!password) {
      setErrorMessage("Please enter your password.");
      showToast("Password Required", "Please enter your password.", "warning");
      return;
    }

    setIsLoading(true);
    setErrorMessage("");

    try {
      const res = await loginWithCredentials(trimmedEmail, password);
      if (res.success) {
        setIsLoading(false);
        showToast(
          "Signed In",
          "Authentication successful. Redirecting to your authorized workspace...",
          "success",
        );
        onSuccess({
          ...(res.status || { requiresDeptSelection: false, noDeptAssigned: false }),
          portalRoute: res.portalRoute,
        });
      } else {
        setIsLoading(false);
        const err = res.error || "Invalid credentials or unauthorized domain.";
        setErrorMessage(err);
        showToast("Authentication Failed", err, "error");
      }
    } catch (err: unknown) {
      setIsLoading(false);
      const msg = err instanceof Error ? err.message : "Unable to connect to authentication service.";
      setErrorMessage(msg);
      showToast("Connection Error", msg, "error");
    }
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

      {/* Center Hero & Floating Login Card */}
      <main className="relative z-10 w-full max-w-md my-auto flex flex-col items-center justify-center">
        <div className="w-full max-w-md">
          {/* Floating Card Container */}
          <div className="bg-white/95 backdrop-blur-xl py-8 px-6 sm:px-8 shadow-2xl rounded-3xl border border-white/80 ring-1 ring-slate-900/5 transition-all">
            {/* Form Title & Subtitle */}
            <div className="text-center mb-6">
              <div className="mx-auto w-12 h-12 rounded-2xl bg-brand-primary-light border border-brand-primary/20 flex items-center justify-center mb-3 shadow-sm">
                <GraduationCap className="h-6 w-6 text-brand-primary" />
              </div>
              <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">
                Institutional Sign In
              </h2>
              <p className="mt-1 text-xs text-slate-500 font-medium">
                Enter your institutional email or username to access your workspace
              </p>
            </div>

            {/* Error Alert Banner */}
            {errorMessage && (
              <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start space-x-2 animate-fadeIn">
                <AlertCircle className="h-4 w-4 text-rose-500 flex-shrink-0 mt-0.5" />
                <span className="font-medium leading-relaxed">{errorMessage}</span>
              </div>
            )}

            {/* Login Form */}
            <form className="space-y-4" onSubmit={handleSignIn}>
              {/* Email / Username Field */}
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 tracking-wider mb-1.5">
                  Email or Username
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errorMessage) setErrorMessage("");
                    }}
                    placeholder="e.g. ali@universityadmin.in or admin"
                    autoComplete="username"
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50/70 border border-slate-300 rounded-xl text-sm text-slate-900 font-medium focus:bg-white focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold uppercase text-slate-700 tracking-wider">
                    Password
                  </label>
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
                      if (errorMessage) setErrorMessage("");
                    }}
                    placeholder="Enter your account password"
                    autoComplete="current-password"
                    className="w-full pl-9 pr-10 py-2.5 bg-slate-50/70 border border-slate-300 rounded-xl text-sm text-slate-900 font-medium focus:bg-white focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none transition"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
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
                  href="#support"
                  onClick={(e) => {
                    e.preventDefault();
                    showToast(
                      "Directory Service",
                      "Institutional access is managed by your Super Administrator.",
                      "info",
                    );
                  }}
                  className="text-slate-500 hover:text-brand-primary font-medium transition"
                >
                  Need assistance?
                </a>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl text-sm font-bold text-white bg-brand-primary hover:bg-brand-primary-hover shadow-lg shadow-brand-primary/25 transition-all transform active:scale-[0.98] disabled:opacity-50"
              >
                <span>{isLoading ? "Authenticating..." : "Sign In"}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>

            {/* Security Badge */}
            <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-center space-x-2 text-[11px] text-slate-500 font-medium">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              <span>Enterprise Argon2id Password Hashing &amp; Scope Isolation</span>
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
