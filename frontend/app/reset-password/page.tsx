"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import {
  Lock,
  KeyRound,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff
} from "lucide-react";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const queryToken = searchParams.get("token");
    if (queryToken) {
      setToken(queryToken);
    }
  }, [searchParams]);

  const validate = () => {
    const errors: Record<string, string> = {};
    if (!token.trim()) {
      errors.token = "A valid password reset token is required.";
    }
    if (newPassword.length < 8) {
      errors.newPassword = "Password must be at least 8 characters long.";
    } else if (!/[a-zA-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      errors.newPassword = "Password must include both letters and numbers.";
    }
    if (newPassword !== confirmPassword) {
      errors.confirmPassword = "Passwords do not match.";
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await api.post<boolean>("/auth/reset-password", {
        token: token.trim(),
        new_password: newPassword,
      });

      setSuccess(true);
    } catch (err: any) {
      if (err instanceof ApiError) {
        setErrorMessage(
          err.message || "Failed to reset password. The token may be invalid, expired, or already used."
        );
      } else {
        setErrorMessage(err?.message || "An unexpected error occurred. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white border border-[var(--border-color)] rounded-[var(--radius-xl)] p-6 sm:p-8 shadow-[var(--shadow-md)] space-y-5">
      <div className="pb-3 border-b border-[var(--border-color)]">
        <h2 className="text-base font-bold text-[var(--title-color)]">
          Establish New Password
        </h2>
        <p className="text-xs text-[var(--paragraph-color)] mt-0.5">
          Enter your recovery token and define a new secure password
        </p>
      </div>

      {/* Success State */}
      {success && (
        <div className="space-y-4">
          <div className="p-4 rounded-[var(--radius-md)] bg-[#eaf5de] border border-[#82c341] text-[#2e4d15] space-y-2 text-xs">
            <div className="flex items-center gap-2 font-bold text-sm">
              <CheckCircle2 className="w-5 h-5 text-[#82c341] shrink-0" />
              <span>Password Reset Successful</span>
            </div>
            <p className="leading-relaxed">
              Your account password has been updated and the reset token has been invalidated.
              You can now sign in using your new credentials.
            </p>
          </div>

          <Link
            href="/login"
            className="btn-primary w-full py-3 text-sm font-bold flex items-center justify-center gap-2"
          >
            <span>Proceed to Sign In</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}

      {/* Form State */}
      {!success && (
        <>
          {errorMessage && (
            <div className="p-3 rounded-[var(--radius-md)] bg-[#fee2e2] border border-[#fca5a5] text-[#991b1b] text-xs leading-relaxed">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Token Field */}
            <div>
              <label className="block text-xs font-semibold text-[var(--title-color)] mb-1.5">
                Reset Token <span className="text-[#991b1b]">*</span>
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-[var(--muted-text-color)] absolute left-3.5 top-3.5 pointer-events-none" />
                <input
                  type="text"
                  value={token}
                  onChange={(e) => {
                    setToken(e.target.value);
                    if (fieldErrors.token) setFieldErrors({ ...fieldErrors, token: "" });
                  }}
                  placeholder="Paste your reset token here"
                  required
                  className={`w-full pl-10 pr-3 py-2.5 bg-white border rounded-[var(--radius-md)] text-sm text-[var(--title-color)] placeholder:text-[var(--muted-text-color)] focus:outline-none transition ${
                    fieldErrors.token
                      ? "border-[#ef4444] focus:ring-1 focus:ring-[#ef4444]"
                      : "border-[var(--border-color)] focus:border-[#82c341] focus:ring-2 focus:ring-[#82c341]/20"
                  }`}
                />
              </div>
              {fieldErrors.token && (
                <p className="mt-1 text-xs text-[#ef4444]">{fieldErrors.token}</p>
              )}
            </div>

            {/* New Password */}
            <div>
              <label className="block text-xs font-semibold text-[var(--title-color)] mb-1.5">
                New Password <span className="text-[#991b1b]">*</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[var(--muted-text-color)] absolute left-3.5 top-3.5 pointer-events-none" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    if (fieldErrors.newPassword) setFieldErrors({ ...fieldErrors, newPassword: "" });
                  }}
                  placeholder="Minimum 8 characters (letters + numbers)"
                  required
                  className={`w-full pl-10 pr-10 py-2.5 bg-white border rounded-[var(--radius-md)] text-sm text-[var(--title-color)] placeholder:text-[var(--muted-text-color)] focus:outline-none transition ${
                    fieldErrors.newPassword
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
              {fieldErrors.newPassword && (
                <p className="mt-1 text-xs text-[#ef4444]">{fieldErrors.newPassword}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-semibold text-[var(--title-color)] mb-1.5">
                Confirm New Password <span className="text-[#991b1b]">*</span>
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
                  placeholder="Re-type your new password"
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

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full py-3 text-sm font-bold flex items-center justify-center gap-2 shadow-[var(--shadow-sm)] disabled:opacity-50 mt-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  <span>Updating Password...</span>
                </>
              ) : (
                <>
                  <span>Save New Password</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="pt-4 border-t border-[var(--border-color)] text-center text-xs text-[var(--paragraph-color)]">
            Remembered your credentials?{" "}
            <Link
              href="/login"
              className="font-bold text-[#355a18] hover:text-[#2e4d15] hover:underline"
            >
              Sign In to Portal
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-[var(--background-color)] flex flex-col justify-between py-8 px-4 sm:px-6 lg:px-8">
      {/* Top Bar Navigation */}
      <div className="max-w-md w-full mx-auto flex items-center justify-between text-xs">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 font-bold text-[var(--title-color)] hover:text-[#2e4d15] transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Sign In</span>
        </Link>
        <span className="text-[var(--font-color)]">Credential Reset</span>
      </div>

      <div className="max-w-md w-full mx-auto my-auto space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <Link href="/" className="inline-block">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-[var(--radius-lg)] bg-[#82c341] text-[#000000] font-black text-2xl shadow-[var(--shadow-md)]">
              Ω
            </div>
          </Link>
          <h1 className="text-2xl font-extrabold text-[var(--title-color)] tracking-tight">
            Reset Password
          </h1>
          <p className="text-xs text-[var(--paragraph-color)] max-w-xs mx-auto">
            Establish new password credentials for your QPMS Apex account
          </p>
        </div>

        <Suspense
          fallback={
            <div className="bg-white p-8 rounded-[var(--radius-xl)] border border-[var(--border-color)] text-center text-xs text-[var(--muted-text-color)]">
              Loading recovery session...
            </div>
          }
        >
          <ResetPasswordForm />
        </Suspense>
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-[var(--font-color)] max-w-md mx-auto">
        &copy; {new Date().getFullYear()} QPMS Apex &bull; Secure Academic Assessment Infrastructure
      </div>
    </div>
  );
}
