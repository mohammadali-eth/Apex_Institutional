"use client";

import React from "react";
import Link from "next/link";
import { PublicHeader } from "@/components/public/PublicHeader";
import { PublicFooter } from "@/components/public/PublicFooter";
import {
  Shield,
  BookOpen,
  Award,
  CheckCircle2,
  Building2,
  Users,
  Lock,
  ArrowRight,
  FileCheck,
  Scale,
  Sparkles,
  Layers
} from "lucide-react";

export default function AboutPage() {
  const problemsSolved = [
    {
      title: "Vulnerability to Examination Paper Leaks",
      desc: "Traditional manual paper setting often passes unencrypted documents between examiners. QPMS Apex stores questions in secure databases, generating papers dynamically only when authorized.",
    },
    {
      title: "Uneven Curriculum Coverage & Blueprint Drift",
      desc: "Examiners often over-index on personal favorite units while omitting core syllabus sections. Our algorithmic generator enforces strict unit quotas and balanced marks.",
    },
    {
      title: "Subjective Difficulty & Skewed Grading",
      desc: "Without systematic taxonomy tagging, papers frequently swing between overly simplistic or unfairly grueling. QPMS Apex balances questions across EASY, MEDIUM, and HARD tiers.",
    },
    {
      title: "Tedious Manual Typesetting & Inconsistent Formatting",
      desc: "Hours wasted reformatting Word documents and correcting margins are replaced by automated, standardized, print-ready PDF generation with university watermarks.",
    },
  ];

  const universityBenefits = [
    "Centralized governance across multi-campus universities and affiliated colleges.",
    "Granular Six-Role RBAC guaranteeing strict tenant and departmental data isolation.",
    "Comprehensive immutable audit logging tracking every question edit, approval, and paper export.",
    "Custom university branding, exam templates, and dynamic theme preservation.",
  ];

  const facultyBenefits = [
    "Structured question bank authoring supporting MCQs, True/False, Fill-in-Blank, and Descriptive items.",
    "Transparent peer review workflow with clear feedback comments and status progression.",
    "Algorithmic paper generation that reduces manual paper assembly time from days to seconds.",
    "Reuse and update question archives across academic years without starting from scratch.",
  ];

  const studentBenefits = [
    "Full transparency into authorized course syllabi and detailed curriculum units.",
    "Access to officially published past semester examination papers for verified revision.",
    "Fair, curriculum-aligned examination questions that accurately reflect taught coursework.",
    "Confidence in the institutional integrity and tamper-evidence of university assessments.",
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[var(--background-color)]">
      <PublicHeader />

      {/* Hero Header */}
      <section className="bg-white border-b border-[var(--border-color)] py-16 sm:py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#eaf5de] border border-[#82c341]/60 text-xs font-bold text-[#355a18]">
            <Award className="w-3.5 h-3.5 text-[#82c341]" />
            <span>Academic Rigor & Examination Integrity</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold text-[var(--title-color)] tracking-tight">
            About QPMS Apex
          </h1>

          <p className="text-base sm:text-lg text-[var(--paragraph-color)] max-w-2xl mx-auto leading-relaxed">
            The comprehensive Question Paper Management & Generation System designed specifically
            for modern universities, autonomous colleges, and academic examination boards.
          </p>
        </div>
      </section>

      {/* Mission & Problem Statement */}
      <section className="py-16 sm:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        
        {/* Mission Card */}
        <div className="bg-white p-8 sm:p-12 rounded-[var(--radius-xl)] border border-[var(--border-color)] shadow-[var(--shadow-sm)] grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-8 space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-[#3e681c] bg-[#eaf5de] px-3 py-1 rounded-full border border-[#82c341]/50">
              Our Core Mission
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[var(--title-color)]">
              Transforming Examination Setting into a Scientifically Balanced, Tamper-Evident Science
            </h2>
            <p className="text-sm sm:text-base text-[var(--paragraph-color)] leading-relaxed">
              Assessment is the cornerstone of academic evaluation. QPMS Apex was engineered to eliminate
              the vulnerabilities, manual inefficiencies, and syllabus biases inherent in legacy manual question-paper creation.
              By uniting curriculum taxonomy, peer moderation, algorithmic paper generation, and role-based access control,
              we empower universities to conduct assessments that are fair, transparent, and academically sound.
            </p>
          </div>
          <div className="lg:col-span-4 flex flex-col items-center justify-center p-6 bg-[var(--surface-color)] rounded-[var(--radius-lg)] border border-[var(--border-color)] text-center space-y-2">
            <div className="w-14 h-14 rounded-full bg-[#82c341]/20 flex items-center justify-center text-[#2e4d15]">
              <Scale className="w-7 h-7 text-[#82c341]" />
            </div>
            <h3 className="font-bold text-sm text-[var(--title-color)]">Zero Blueprint Drift</h3>
            <p className="text-xs text-[var(--paragraph-color)]">
              Algorithmic verification ensures 100% adherence to examination guidelines and syllabus mark distributions.
            </p>
          </div>
        </div>

        {/* Problems Solved */}
        <div className="space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[var(--title-color)]">
              The Challenges We Resolve
            </h2>
            <p className="text-xs sm:text-sm text-[var(--paragraph-color)]">
              Legacy examination setting processes introduce structural vulnerabilities that threaten university credibility.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {problemsSolved.map((item, idx) => (
              <div
                key={idx}
                className="bg-white p-6 rounded-[var(--radius-lg)] border border-[var(--border-color)] shadow-[var(--shadow-sm)] space-y-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#fee2e2] text-[#991b1b] flex items-center justify-center font-bold text-xs shrink-0">
                    !
                  </div>
                  <h3 className="text-base font-bold text-[var(--title-color)]">{item.title}</h3>
                </div>
                <p className="text-xs text-[var(--paragraph-color)] leading-relaxed pl-11">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Stakeholder Benefits Grid */}
        <div className="space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[var(--title-color)]">
              Value for Every Academic Stakeholder
            </h2>
            <p className="text-xs sm:text-sm text-[var(--paragraph-color)]">
              Tailored capabilities designed for leadership, teaching faculty, and student success.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Universities */}
            <div className="bg-white p-6 sm:p-7 rounded-[var(--radius-lg)] border border-[var(--border-color)] space-y-4 shadow-[var(--shadow-sm)]">
              <div className="w-10 h-10 rounded-[var(--radius-md)] bg-[#eaf5de] text-[#3e681c] flex items-center justify-center">
                <Building2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-[var(--title-color)]">
                Universities & Colleges
              </h3>
              <ul className="space-y-2.5">
                {universityBenefits.map((b, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-[var(--paragraph-color)] leading-relaxed">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#82c341] shrink-0 mt-0.5" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Faculty */}
            <div className="bg-white p-6 sm:p-7 rounded-[var(--radius-lg)] border border-[var(--border-color)] space-y-4 shadow-[var(--shadow-sm)]">
              <div className="w-10 h-10 rounded-[var(--radius-md)] bg-[#eaf5de] text-[#3e681c] flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-[var(--title-color)]">
                Faculty & Exam Controllers
              </h3>
              <ul className="space-y-2.5">
                {facultyBenefits.map((b, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-[var(--paragraph-color)] leading-relaxed">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#82c341] shrink-0 mt-0.5" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Students */}
            <div className="bg-white p-6 sm:p-7 rounded-[var(--radius-lg)] border border-[var(--border-color)] space-y-4 shadow-[var(--shadow-sm)]">
              <div className="w-10 h-10 rounded-[var(--radius-md)] bg-[#eaf5de] text-[#3e681c] flex items-center justify-center">
                <BookOpen className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-[var(--title-color)]">
                Students & Candidates
              </h3>
              <ul className="space-y-2.5">
                {studentBenefits.map((b, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-[var(--paragraph-color)] leading-relaxed">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#82c341] shrink-0 mt-0.5" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>

          </div>
        </div>

        {/* Security & Governance Box */}
        <div className="bg-[var(--secondary-color)] rounded-[var(--radius-xl)] p-8 sm:p-10 text-white space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#82c341] text-black font-black flex items-center justify-center">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-bold tracking-tight">Security & Governance Architecture</h3>
              <p className="text-xs text-white/70">Institutional confidentiality embedded at every architectural tier</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
            <div className="bg-white/5 p-4 rounded-lg border border-white/10">
              <span className="block text-xs font-bold text-[#82c341] mb-1">Cryptographic Hashing</span>
              <p className="text-[11px] text-white/70 leading-relaxed">
                Passwords hashed with salted bcrypt; sessions authenticated via stateless JWT tokens with short expiry.
              </p>
            </div>
            <div className="bg-white/5 p-4 rounded-lg border border-white/10">
              <span className="block text-xs font-bold text-[#82c341] mb-1">Tenant Isolation</span>
              <p className="text-[11px] text-white/70 leading-relaxed">
                University and department records are strictly bounded; suspension gates immediately revoke access.
              </p>
            </div>
            <div className="bg-white/5 p-4 rounded-lg border border-white/10">
              <span className="block text-xs font-bold text-[#82c341] mb-1">Immutable Audit Trail</span>
              <p className="text-[11px] text-white/70 leading-relaxed">
                Every login, question creation, review decision, and paper generation is recorded with user identity and timestamp.
              </p>
            </div>
            <div className="bg-white/5 p-4 rounded-lg border border-white/10">
              <span className="block text-xs font-bold text-[#82c341] mb-1">Single-Use Tokens</span>
              <p className="text-[11px] text-white/70 leading-relaxed">
                Initial credential setup and password recovery rely on secure, one-time, time-expiring tokens.
              </p>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-white/10 text-xs">
            <span className="text-white/80">
              Interested in deploying QPMS Apex across your university or affiliated institutions?
            </span>
            <Link
              href="/contact"
              className="btn-primary py-2 px-4 text-xs font-bold flex items-center gap-1.5 shrink-0"
            >
              <span>Contact Examination Team</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

      </section>

      <PublicFooter />
    </div>
  );
}
