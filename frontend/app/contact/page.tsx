"use client";

import React, { useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { PublicHeader } from "@/components/public/PublicHeader";
import { PublicFooter } from "@/components/public/PublicFooter";
import {
  Mail,
  User,
  MessageSquare,
  FileText,
  Send,
  CheckCircle2,
  AlertCircle,
  Building2,
  Clock,
  Shield,
  HelpCircle,
  ExternalLink
} from "lucide-react";

export default function ContactPage() {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    subject: "",
    message: "",
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [referenceId, setReferenceId] = useState<string | null>(null);

  const validate = () => {
    const errors: Record<string, string> = {};
    if (!formData.fullName.trim() || formData.fullName.trim().length < 2) {
      errors.fullName = "Full name must be at least 2 characters.";
    }
    if (!formData.email.trim() || !formData.email.includes("@") || !formData.email.includes(".")) {
      errors.email = "Please enter a valid email address.";
    }
    if (!formData.subject.trim() || formData.subject.trim().length < 3) {
      errors.subject = "Subject must be at least 3 characters.";
    }
    if (!formData.message.trim() || formData.message.trim().length < 10) {
      errors.message = "Message must be at least 10 characters.";
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitSuccess(null);
    setSubmitError(null);

    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const response = await api.post<{
        id: string;
        full_name: string;
        email: string;
        subject: string;
        message: string;
        created_at: string;
        is_resolved: boolean;
      }>("/contact", {
        full_name: formData.fullName.trim(),
        email: formData.email.trim(),
        subject: formData.subject.trim(),
        message: formData.message.trim(),
      });

      setReferenceId(response.id);
      setSubmitSuccess(
        "Thank you! Your examination inquiry has been registered in the system. Our support team will follow up at your provided email."
      );
      setFormData({
        fullName: "",
        email: "",
        subject: "",
        message: "",
      });
      setFieldErrors({});
    } catch (err: any) {
      if (err instanceof ApiError) {
        setSubmitError(err.message || "Failed to submit inquiry. Please review your input.");
      } else {
        setSubmitError(err?.message || "An unexpected network error occurred. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[var(--background-color)]">
      <PublicHeader />

      {/* Hero Header */}
      <section className="bg-white border-b border-[var(--border-color)] py-14 sm:py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#eaf5de] border border-[#82c341]/60 text-xs font-bold text-[#355a18]">
            <Mail className="w-3.5 h-3.5 text-[#82c341]" />
            <span>Platform Support & University Inquiries</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-[var(--title-color)] tracking-tight">
            Contact Examination Support
          </h1>

          <p className="text-sm sm:text-base text-[var(--paragraph-color)] max-w-xl mx-auto leading-relaxed">
            Have questions about institutional onboarding, departmental course mapping, or examination paper generation?
            Send an inquiry directly to our platform administration team.
          </p>
        </div>
      </section>

      {/* Main Content Grid */}
      <section className="py-12 sm:py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          
          {/* Left Column: Form */}
          <div className="lg:col-span-7 bg-white p-6 sm:p-8 rounded-[var(--radius-xl)] border border-[var(--border-color)] shadow-[var(--shadow-sm)]">
            <div className="mb-6 pb-4 border-b border-[var(--border-color)]">
              <h2 className="text-lg font-bold text-[var(--title-color)]">
                Submit an Inquiry
              </h2>
              <p className="text-xs text-[var(--paragraph-color)] mt-0.5">
                All submissions are validated, recorded in the audit database, and assigned an inquiry reference ID.
              </p>
            </div>

            {/* Success Banner */}
            {submitSuccess && (
              <div className="mb-6 p-4 rounded-[var(--radius-md)] bg-[#eaf5de] border border-[#82c341] text-[#2e4d15] space-y-2">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <CheckCircle2 className="w-5 h-5 text-[#82c341] shrink-0" />
                  <span>Inquiry Dispatched Successfully</span>
                </div>
                <p className="text-xs leading-relaxed">{submitSuccess}</p>
                {referenceId && (
                  <div className="pt-2 text-xs font-mono text-[#355a18]">
                    Inquiry Reference ID: <span className="font-bold underline">{referenceId}</span>
                  </div>
                )}
              </div>
            )}

            {/* Error Banner */}
            {submitError && (
              <div className="mb-6 p-4 rounded-[var(--radius-md)] bg-[#fee2e2] border border-[#f87171] text-[#991b1b] flex items-start gap-2.5 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{submitError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold text-[var(--title-color)] mb-1.5">
                  Your Full Name <span className="text-[#991b1b]">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-[var(--muted-text-color)] absolute left-3 top-3.5 pointer-events-none" />
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => {
                      setFormData({ ...formData, fullName: e.target.value });
                      if (fieldErrors.fullName) setFieldErrors({ ...fieldErrors, fullName: "" });
                    }}
                    placeholder="e.g. Prof. David Miller"
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
                  <Mail className="w-4 h-4 text-[var(--muted-text-color)] absolute left-3 top-3.5 pointer-events-none" />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => {
                      setFormData({ ...formData, email: e.target.value });
                      if (fieldErrors.email) setFieldErrors({ ...fieldErrors, email: "" });
                    }}
                    placeholder="e.g. david.miller@university.edu"
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

              {/* Subject */}
              <div>
                <label className="block text-xs font-semibold text-[var(--title-color)] mb-1.5">
                  Subject <span className="text-[#991b1b]">*</span>
                </label>
                <div className="relative">
                  <FileText className="w-4 h-4 text-[var(--muted-text-color)] absolute left-3 top-3.5 pointer-events-none" />
                  <input
                    type="text"
                    value={formData.subject}
                    onChange={(e) => {
                      setFormData({ ...formData, subject: e.target.value });
                      if (fieldErrors.subject) setFieldErrors({ ...fieldErrors, subject: "" });
                    }}
                    placeholder="e.g. University Onboarding & Department Hierarchy Setup"
                    className={`w-full pl-10 pr-3 py-2.5 bg-white border rounded-[var(--radius-md)] text-sm text-[var(--title-color)] placeholder:text-[var(--muted-text-color)] focus:outline-none transition ${
                      fieldErrors.subject
                        ? "border-[#ef4444] focus:ring-1 focus:ring-[#ef4444]"
                        : "border-[var(--border-color)] focus:border-[#82c341] focus:ring-2 focus:ring-[#82c341]/20"
                    }`}
                  />
                </div>
                {fieldErrors.subject && (
                  <p className="mt-1 text-xs text-[#ef4444]">{fieldErrors.subject}</p>
                )}
              </div>

              {/* Message */}
              <div>
                <label className="block text-xs font-semibold text-[var(--title-color)] mb-1.5">
                  Message Details <span className="text-[#991b1b]">*</span>
                </label>
                <textarea
                  rows={5}
                  value={formData.message}
                  onChange={(e) => {
                    setFormData({ ...formData, message: e.target.value });
                    if (fieldErrors.message) setFieldErrors({ ...fieldErrors, message: "" });
                  }}
                  placeholder="Describe your query, number of constituent colleges, or assistance required..."
                  className={`w-full p-3 bg-white border rounded-[var(--radius-md)] text-sm text-[var(--title-color)] placeholder:text-[var(--muted-text-color)] focus:outline-none transition ${
                    fieldErrors.message
                      ? "border-[#ef4444] focus:ring-1 focus:ring-[#ef4444]"
                      : "border-[var(--border-color)] focus:border-[#82c341] focus:ring-2 focus:ring-[#82c341]/20"
                  }`}
                />
                {fieldErrors.message && (
                  <p className="mt-1 text-xs text-[#ef4444]">{fieldErrors.message}</p>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary w-full py-3 text-sm font-bold flex items-center justify-center gap-2 shadow-[var(--shadow-sm)] disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    <span>Submitting Inquiry...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Send Inquiry</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Right Column: Support Context & Information */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Operational Context Card */}
            <div className="bg-white p-6 rounded-[var(--radius-xl)] border border-[var(--border-color)] shadow-[var(--shadow-sm)] space-y-4">
              <h3 className="text-base font-bold text-[var(--title-color)] flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#82c341]" />
                <span>Institutional Assistance</span>
              </h3>
              <p className="text-xs text-[var(--paragraph-color)] leading-relaxed">
                QPMS Apex serves higher education institutions. Our examination engineers assist with:
              </p>
              <ul className="space-y-2 text-xs text-[var(--paragraph-color)]">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#82c341]" />
                  <span>Configuring academic departments and course credits</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#82c341]" />
                  <span>Custom question paper blueprint design</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#82c341]" />
                  <span>Syllabus units and Bloom's taxonomy mapping</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#82c341]" />
                  <span>Dedicated institutional tenant provisioning</span>
                </li>
              </ul>
            </div>

            {/* Platform Information Card */}
            <div className="bg-white p-6 rounded-[var(--radius-xl)] border border-[var(--border-color)] shadow-[var(--shadow-sm)] space-y-4">
              <h3 className="text-base font-bold text-[var(--title-color)] flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#82c341]" />
                <span>Operating Information</span>
              </h3>
              <div className="space-y-2.5 text-xs text-[var(--paragraph-color)]">
                <div>
                  <span className="font-semibold text-[var(--title-color)] block">Support Desk Hours:</span>
                  <span>Monday – Friday, 08:00 – 18:00 IST (UTC+05:30)</span>
                </div>
                <div>
                  <span className="font-semibold text-[var(--title-color)] block">API Services:</span>
                  <span>Operational 24/7 on port :8000</span>
                </div>
                <div>
                  <span className="font-semibold text-[var(--title-color)] block">Examination Escalations:</span>
                  <span>Direct submission through the inquiry form is tracked immediately in the audit trail.</span>
                </div>
              </div>
            </div>

            {/* Portal Navigation Note */}
            <div className="bg-[var(--secondary-color)] p-6 rounded-[var(--radius-xl)] text-white space-y-3">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#82c341]" />
                <h4 className="font-bold text-sm">Already Have an Account?</h4>
              </div>
              <p className="text-xs text-white/80 leading-relaxed">
                If your university administrator has provisioned your institutional credentials,
                sign in to access your examination workspace.
              </p>
              <div className="pt-2 flex items-center gap-3">
                <Link
                  href="/login"
                  className="btn-primary py-2 px-4 text-xs font-bold"
                >
                  Sign In to Portal
                </Link>
                <Link
                  href="/signup"
                  className="text-xs font-semibold text-[#82c341] hover:underline"
                >
                  Create Student Account
                </Link>
              </div>
            </div>

          </div>

        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
