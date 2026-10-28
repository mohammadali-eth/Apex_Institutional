"use client";

import React, { useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import {
  Mail,
  ArrowRight,
  ArrowLeft,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ShieldAlert
} from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    message: string;
    emailSent: boolean;
    deliveryStatus: string;
    devToken?: string | null;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setFeedback(null);

    if (!email.trim() || !email.includes("@")) {
      setErrorMessage("Please enter a valid university or registered email address.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await api.post<{
        message: string;
        email_sent: boolean;
        delivery_status: string;
        dev_token?: string | null;
      }>("/auth/forgot-password", {
        email: email.trim().toLowerCase(),
      });

      setFeedback({
        message: response.message,
        emailSent: response.email_sent,
        deliveryStatus: response.delivery_status,
        devToken: response.dev_token,
      });
    } catch (err: any) {
      if (err instanceof ApiError) {
        setErrorMessage(err.message || "Failed to process request. Please try again.");
      } else {
        setErrorMessage(err?.message || "An unexpected network error occurred.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background-color)] flex flex-col justify-between py-8 px-4 sm:px-6 lg:px-8">
      
      {/* Top Navigation */}
      <div className="max-w-md w-full mx-auto flex items-center justify-between text-xs">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 font-bold text-[var(--title-color)] hover:text-[#2e4d15] transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Sign In</span>
        </Link>
        <span className="text-[var(--font-color)]">Password Recovery</span>
      </div>

      {/* Main Card */}
      <div className="max-w-md w-full mx-auto my-auto space-y-6">
        
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <Link href="/" className="inline-block">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-[var(--radius-lg)] bg-[#82c341] text-[#000000] font-black text-2xl shadow-[var(--shadow-md)]">
              Ω
            </div>
          </Link>
          <h1 className="text-2xl font-extrabold text-[var(--title-color)] tracking-tight">
            Account Recovery
          </h1>
          <p className="text-xs text-[var(--paragraph-color)] max-w-xs mx-auto">
            Initiate a secure password recovery session for your registered account
          </p>
        </div>

        {/* Form Panel */}
        <div className="bg-white border border-[var(--border-color)] rounded-[var(--radius-xl)] p-6 sm:p-8 shadow-[var(--shadow-md)] space-y-5">
          <div className="pb-3 border-b border-[var(--border-color)]">
            <h2 className="text-base font-bold text-[var(--title-color)]">
              Forgot Password?
            </h2>
            <p className="text-xs text-[var(--paragraph-color)] mt-0.5">
              Enter your account email to receive recovery instructions.
            </p>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3 rounded-[var(--radius-md)] bg-[#fee2e2] border border-[#fca5a5] text-[#991b1b] text-xs leading-relaxed">
              {errorMessage}
            </div>
          )}

          {/* Feedback & Non-fabrication delivery report */}
          {feedback && (
            <div className="space-y-4">
              <div className="p-4 rounded-[var(--radius-md)] bg-[#eaf5de] border border-[#82c341] text-[#2e4d15] space-y-2 text-xs leading-relaxed">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <CheckCircle2 className="w-4 h-4 text-[#82c341] shrink-0" />
                  <span>Request Processed</span>
                </div>
                <p>{feedback.message}</p>
              </div>

              {/* Real Delivery Status Blocker Notice */}
              {!feedback.emailSent && (
                <div className="p-3.5 rounded-[var(--radius-md)] bg-[var(--surface-color)] border border-[var(--border-color)] text-xs text-[var(--paragraph-color)] space-y-2">
                  <div className="flex items-center gap-2 font-bold text-[var(--title-color)]">
                    <ShieldAlert className="w-4 h-4 text-[#45525b]" />
                    <span>Delivery Infrastructure Status</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    {feedback.deliveryStatus}
                  </p>
                  
                  {/* Development mode token assistant */}
                  {feedback.devToken && (
                    <div className="pt-2 border-t border-[var(--border-color)]">
                      <p className="text-[11px] font-semibold text-[var(--title-color)] mb-2">
                        Development Mode Reset Link:
                      </p>
                      <Link
                        href={`/reset-password?token=${feedback.devToken}`}
                        className="btn-primary w-full py-2 px-3 text-xs font-bold flex items-center justify-center gap-1.5"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                        <span>Proceed to Reset Password</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {!feedback && (
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div>
                <label className="block text-xs font-semibold text-[var(--title-color)] mb-1.5">
                  Registered Email Address <span className="text-[#991b1b]">*</span>
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
                    placeholder="e.g. yourname@university.in"
                    required
                    className="w-full pl-10 pr-3 py-2.5 bg-white border border-[var(--border-color)] rounded-[var(--radius-md)] text-sm text-[var(--title-color)] placeholder:text-[var(--muted-text-color)] focus:outline-none focus:border-[#82c341] focus:ring-2 focus:ring-[#82c341]/20 transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary w-full py-3 text-sm font-bold flex items-center justify-center gap-2 shadow-[var(--shadow-sm)] disabled:opacity-50 mt-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    <span>Initiating Recovery...</span>
                  </>
                ) : (
                  <>
                    <span>Send Reset Instructions</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Back to Sign In */}
          <div className="pt-4 border-t border-[var(--border-color)] text-center text-xs text-[var(--paragraph-color)]">
            Remembered your credentials?{" "}
            <Link
              href="/login"
              className="font-bold text-[#355a18] hover:text-[#2e4d15] hover:underline"
            >
              Sign In to Portal
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
