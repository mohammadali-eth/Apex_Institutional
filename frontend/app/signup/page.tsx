"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/components/ui/Toast";
import {
  Lock,
  Mail,
  User,
  CheckCircle2,
  ArrowRight,
  Eye,
  EyeOff,
  ShieldAlert,
  ArrowLeft,
  GraduationCap
} from "lucide-react";

export default function SignUpPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const toast = useToast();
  const router = useRouter();

  // Password strength calculation
  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { score: 0, label: "Empty", color: "bg-gray-200" };
    let score = 0;
    if (pwd.length >= 8) score += 1;
    if (/[A-Z]/.test(pwd)) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;

    if (score <= 1) return { score: 1, label: "Weak", color: "bg-red-500" };
    if (score <= 3) return { score: 2, label: "Good", color: "bg-yellow-500" };
    return { score: 3, label: "Strong", color: "bg-[#82c341]" };
  };

  const strength = getPasswordStrength(password);

  const validate = () => {
    const errors: Record<string, string> = {};
    if (!fullName.trim() || fullName.trim().length < 2) {
      errors.fullName = "Full name must be at least 2 characters.";
    }
    if (!email.trim() || !email.includes("@") || !email.includes(".")) {
      errors.email = "Please enter a valid email address.";
    }
    if (password.length < 8) {
      errors.password = "Password must be at least 8 characters long.";
    } else if (!anyAlpha(password) || !anyDigit(password)) {
      errors.password = "Password must include both letters and numbers.";
    }
    if (password !== confirmPassword) {
      errors.confirmPassword = "Passwords do not match.";
    }
    if (!termsAccepted) {
      errors.termsAccepted = "You must agree to the Terms of Service and Privacy Policy.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const anyAlpha = (str: string) => /[a-zA-Z]/.test(str);
  const anyDigit = (str: string) => /[0-9]/.test(str);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const response = await api.post<{
        access_token: string;
        user: {
          id: string;
          email: string;
          full_name: string;
          role_name: string;
        };
      }>("/auth/signup", {
        full_name: fullName.trim(),
        email: email.trim().toLowerCase(),
        password,
        confirm_password: confirmPassword,
        terms_accepted: termsAccepted,
      });

      // Save token and notify
      localStorage.setItem("qpms_token", response.access_token);
      toast.success("Account created successfully! Welcome to QPMS Apex.");
      
      // Reload or navigate to dashboard
      window.location.href = "/dashboard";
    } catch (err: any) {
      if (err instanceof ApiError) {
        setErrorMessage(err.message || "Failed to create account. Please check your details.");
      } else {
        setErrorMessage(err?.message || "An unexpected registration error occurred.");
      }
    } finally {
      setIsSubmitting(false);
    }
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
        <span className="text-[var(--font-color)]">Student Portal &bull; Registration</span>
      </div>

      {/* Main Registration Card Container */}
      <div className="max-w-md w-full mx-auto my-auto space-y-6">
        
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <Link href="/" className="inline-block">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-[var(--radius-lg)] bg-[#82c341] text-[#000000] font-black text-2xl shadow-[var(--shadow-md)]">
              Ω
            </div>
          </Link>
          <h1 className="text-2xl font-extrabold text-[var(--title-color)] tracking-tight">
            Create Student Account
          </h1>
          <p className="text-xs text-[var(--paragraph-color)] max-w-xs mx-auto">
            Access authorized course syllabi, curriculum units, and published examination papers
          </p>
        </div>

        {/* Institutional Account Notice */}
        <div className="p-3.5 rounded-[var(--radius-md)] bg-[#eaf5de] border border-[#82c341]/60 text-[#2e4d15] text-xs flex items-start gap-2.5">
          <GraduationCap className="w-4 h-4 text-[#82c341] shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block">Public Candidate Registration</span>
            <span className="text-[11px] leading-relaxed">
              Public registration provisions the <b>STUDENT</b> role.
              Faculty and administrator accounts are provisioned via administrative invitation.
            </span>
          </div>
        </div>

        {/* Registration Form Panel */}
        <div className="bg-white border border-[var(--border-color)] rounded-[var(--radius-xl)] p-6 sm:p-8 shadow-[var(--shadow-md)] space-y-5">
          <div className="pb-3 border-b border-[var(--border-color)]">
            <h2 className="text-base font-bold text-[var(--title-color)]">
              Candidate Details
            </h2>
            <p className="text-xs text-[var(--paragraph-color)] mt-0.5">
              Enter your official name and academic email address
            </p>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3 rounded-[var(--radius-md)] bg-[#fee2e2] border border-[#fca5a5] text-[#991b1b] text-xs leading-relaxed">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Full Name */}
            <div>
              <label className="block text-xs font-semibold text-[var(--title-color)] mb-1.5">
                Full Name <span className="text-[#991b1b]">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-[var(--muted-text-color)] absolute left-3.5 top-3.5 pointer-events-none" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    if (fieldErrors.fullName) setFieldErrors({ ...fieldErrors, fullName: "" });
                  }}
                  placeholder="e.g. Alex Henderson"
                  required
                  className={`w-full pl-10 pr-3 py-2.5 bg-white border rounded-[var(--radius-md)] text-sm text-[var(--title-color)] placeholder:text-[var(--muted-text-color)] focus:outline-none transition ${
                    fieldErrors.fullName
                      ? "border-[#ef4444] focus:ring-1 focus:ring-[#ef4444]"
                      : "border-[var(--border-color)] focus:border-[#82c341] focus:ring-2 focus:ring-[#82c341]/20"
                  }`}
                />
              </div>
              {fieldErrors.fullName && (
                <p className="mt-1 text-xs text-[#ef4444]">{fieldErrors.fullName}</p>
              )}
            </div>

            {/* Email Address */}
            <div>
              <label className="block text-xs font-semibold text-[var(--title-color)] mb-1.5">
                Email Address <span className="text-[#991b1b]">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[var(--muted-text-color)] absolute left-3.5 top-3.5 pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (fieldErrors.email) setFieldErrors({ ...fieldErrors, email: "" });
                  }}
                  placeholder="e.g. alex.henderson@example.com"
                  required
                  className={`w-full pl-10 pr-3 py-2.5 bg-white border rounded-[var(--radius-md)] text-sm text-[var(--title-color)] placeholder:text-[var(--muted-text-color)] focus:outline-none transition ${
                    fieldErrors.email
                      ? "border-[#ef4444] focus:ring-1 focus:ring-[#ef4444]"
                      : "border-[var(--border-color)] focus:border-[#82c341] focus:ring-2 focus:ring-[#82c341]/20"
                  }`}
                />
              </div>
              {fieldErrors.email && (
                <p className="mt-1 text-xs text-[#ef4444]">{fieldErrors.email}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-[var(--title-color)] mb-1.5">
                Create Password <span className="text-[#991b1b]">*</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[var(--muted-text-color)] absolute left-3.5 top-3.5 pointer-events-none" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) setFieldErrors({ ...fieldErrors, password: "" });
                  }}
                  placeholder="Minimum 8 characters (letters + numbers)"
                  required
                  className={`w-full pl-10 pr-10 py-2.5 bg-white border rounded-[var(--radius-md)] text-sm text-[var(--title-color)] placeholder:text-[var(--muted-text-color)] focus:outline-none transition ${
                    fieldErrors.password
                      ? "border-[#ef4444] focus:ring-1 focus:ring-[#ef4444]"
                      : "border-[var(--border-color)] focus:border-[#82c341] focus:ring-2 focus:ring-[#82c341]/20"
                  }`}
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

              {/* Password Strength Indicator */}
              {password && (
                <div className="mt-2 space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-[var(--paragraph-color)]">
                    <span>Password Strength:</span>
                    <span className="font-bold">{strength.label}</span>
                  </div>
                  <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden flex gap-1">
                    <div className={`h-full rounded-full flex-1 ${strength.score >= 1 ? strength.color : "bg-transparent"}`} />
                    <div className={`h-full rounded-full flex-1 ${strength.score >= 2 ? strength.color : "bg-transparent"}`} />
                    <div className={`h-full rounded-full flex-1 ${strength.score >= 3 ? strength.color : "bg-transparent"}`} />
                  </div>
                </div>
              )}

              {fieldErrors.password && (
                <p className="mt-1 text-xs text-[#ef4444]">{fieldErrors.password}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-semibold text-[var(--title-color)] mb-1.5">
                Confirm Password <span className="text-[#991b1b]">*</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[var(--muted-text-color)] absolute left-3.5 top-3.5 pointer-events-none" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (fieldErrors.confirmPassword) setFieldErrors({ ...fieldErrors, confirmPassword: "" });
                  }}
                  placeholder="Re-type your password"
                  required
                  className={`w-full pl-10 pr-3 py-2.5 bg-white border rounded-[var(--radius-md)] text-sm text-[var(--title-color)] placeholder:text-[var(--muted-text-color)] focus:outline-none transition ${
                    fieldErrors.confirmPassword
                      ? "border-[#ef4444] focus:ring-1 focus:ring-[#ef4444]"
                      : "border-[var(--border-color)] focus:border-[#82c341] focus:ring-2 focus:ring-[#82c341]/20"
                  }`}
                />
              </div>
              {fieldErrors.confirmPassword && (
                <p className="mt-1 text-xs text-[#ef4444]">{fieldErrors.confirmPassword}</p>
              )}
            </div>

            {/* Terms and Privacy Checkbox */}
            <div className="pt-1">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => {
                    setTermsAccepted(e.target.checked);
                    if (fieldErrors.termsAccepted) setFieldErrors({ ...fieldErrors, termsAccepted: "" });
                  }}
                  className="mt-0.5 rounded border-[var(--border-color)] text-[#82c341] focus:ring-[#82c341]"
                />
                <span className="text-xs text-[var(--paragraph-color)] leading-snug">
                  I agree to the{" "}
                  <span className="font-semibold text-[var(--title-color)] underline">
                    Terms of Service
                  </span>{" "}
                  and{" "}
                  <span className="font-semibold text-[var(--title-color)] underline">
                    Privacy Policy
                  </span>
                  .
                </span>
              </label>
              {fieldErrors.termsAccepted && (
                <p className="mt-1 text-xs text-[#ef4444]">{fieldErrors.termsAccepted}</p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full py-3 text-sm font-bold flex items-center justify-center gap-2 shadow-[var(--shadow-sm)] disabled:opacity-50 mt-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <span>Complete Student Registration</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Sign In Link */}
          <div className="pt-4 border-t border-[var(--border-color)] text-center text-xs text-[var(--paragraph-color)]">
            Already have an institutional or student account?{" "}
            <Link
              href="/login"
              className="font-bold text-[#355a18] hover:text-[#2e4d15] hover:underline"
            >
              Sign In
            </Link>
          </div>
        </div>

      </div>

      {/* Footer */}
      <div className="text-center text-xs text-[var(--font-color)] max-w-md mx-auto">
        &copy; {new Date().getFullYear()} QPMS Apex &bull; Secure Academic Assessment Infrastructure
      </div>
    </div>
  );
}
