"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { PublicHeader } from "@/components/public/PublicHeader";
import { PublicFooter } from "@/components/public/PublicFooter";
import {
  Shield,
  BookOpen,
  Layers,
  Sparkles,
  FileText,
  CheckCircle2,
  ArrowRight,
  School,
  Building2,
  CheckSquare,
  Lock,
  Download,
  Users,
  Award,
  GraduationCap,
  Send,
  HelpCircle,
  Clock,
  Printer
} from "lucide-react";

export default function HomePage() {
  const { user } = useAuth();

  const features = [
    {
      icon: School,
      title: "University & Institute Management",
      desc: "Centralized multi-institution platform supporting independent campuses, affiliated colleges, and hierarchical administration.",
    },
    {
      icon: Building2,
      title: "Academic Hierarchy Structure",
      desc: "Comprehensive academic modeling from academic departments and degree programs (UG, PG) to semesters and credit-bearing courses.",
    },
    {
      icon: BookOpen,
      title: "Syllabus & Units Curriculum",
      desc: "Attach detailed syllabus documents, map specific curriculum units and lecture topics, and track versioned academic revisions.",
    },
    {
      icon: Layers,
      title: "Multi-Type Question Bank",
      desc: "Author MCQs with dynamic answer options, True/False, Fill-in-the-Blank, and Descriptive questions with Bloom's taxonomy difficulty tags.",
    },
    {
      icon: CheckSquare,
      title: "Question Review & Moderation",
      desc: "Departmental peer review workflow enabling Heads of Department and Reviewers to approve, reject, or request revisions on submitted items.",
    },
    {
      icon: Sparkles,
      title: "Automated Paper Generation",
      desc: "Algorithmic generation engine creating examination papers balanced across units, difficulty levels, and required total marks.",
    },
    {
      icon: Clock,
      title: "Examination Lifecycle Management",
      desc: "Rigorous paper states from Draft to Generated, Under Review, Approved, and final Published status with complete change audits.",
    },
    {
      icon: Printer,
      title: "Print-Ready PDF Export",
      desc: "Generate professional university examination question papers with institution headers, instructions, sections, and watermarks.",
    },
    {
      icon: Lock,
      title: "Granular Role-Based Access",
      desc: "Strict role isolation ensuring students, teachers, HODs, exam controllers, and university admins access only permitted operations.",
    },
  ];

  const steps = [
    {
      num: "01",
      title: "Institution Onboarding",
      desc: "Universities and constituent colleges are provisioned with custom branding, codes, and initial administrator credentials.",
    },
    {
      num: "02",
      title: "Academic Hierarchy Setup",
      desc: "Departments, degree programs, semesters, and subjects are configured to reflect the university's academic structure.",
    },
    {
      num: "03",
      title: "Syllabus & Question Bank",
      desc: "Faculty map curriculum units and author syllabus-aligned questions across multiple formats with marks and difficulty levels.",
    },
    {
      num: "04",
      title: "Review & Quality Approval",
      desc: "Heads of Department and designated reviewers moderate questions, validating clarity, learning outcomes, and answer keys.",
    },
    {
      num: "05",
      title: "Paper Blueprint Generation",
      desc: "Examination authorities configure section rules and generate balanced examination papers matching exact mark distributions.",
    },
    {
      num: "06",
      title: "Publication & Student Access",
      desc: "Final approved papers are published, allowing authorized students to download watermarked revision papers.",
    },
  ];

  const roles = [
    {
      title: "University Administrators",
      role: "UNIVERSITY_ADMIN",
      desc: "Oversee constituent colleges, manage academic departments, and provision departmental Heads of Department.",
      badge: "Institutional Oversight",
    },
    {
      title: "Heads of Department (HOD)",
      role: "HOD",
      desc: "Assign faculty to subjects, review and moderate question submissions, and oversee departmental examination prep.",
      badge: "Curriculum Moderation",
    },
    {
      title: "Faculty & Teachers",
      role: "FACULTY",
      desc: "Author questions mapped to syllabus units, manage question banks, and draft examination papers.",
      badge: "Question Authoring",
    },
    {
      title: "Examination Controllers",
      role: "EXAM_CONTROLLER",
      desc: "Supervise final examination blueprints, authorize official paper generation, and approve publication schedules.",
      badge: "Assessment Authority",
    },
    {
      title: "Students & General Users",
      role: "STUDENT",
      desc: "Access approved course syllabi, explore curriculum units, and view officially published past examination papers.",
      badge: "Academic Study",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[var(--background-color)]">
      <PublicHeader />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-white via-white to-[var(--background-color)] border-b border-[var(--border-color)] py-16 sm:py-24 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#eaf5de] border border-[#82c341]/60 text-xs font-bold text-[#355a18]">
                <Shield className="w-3.5 h-3.5 text-[#82c341]" />
                <span>Next-Gen Examination Governance & Automated Generation</span>
              </div>

              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-[var(--title-color)] tracking-tight leading-[1.15]">
                University Question Paper Management & Generation System
              </h1>

              <p className="text-base sm:text-lg text-[var(--paragraph-color)] leading-relaxed max-w-2xl mx-auto lg:mx-0">
                A unified platform for higher education institutions. Securely manage multi-level academic hierarchies,
                curate syllabus-mapped question banks, and generate standardized, balanced examination papers with tamper-evident audit trails.
              </p>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                {user ? (
                  <Link
                    href="/dashboard"
                    className="btn-primary w-full sm:w-auto text-base py-3 px-8 font-bold flex items-center justify-center gap-2 shadow-[var(--shadow-md)]"
                  >
                    <span>Enter My Dashboard</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                ) : (
                  <>
                    <Link
                      href="/signup"
                      className="btn-primary w-full sm:w-auto text-base py-3 px-8 font-bold flex items-center justify-center gap-2 shadow-[var(--shadow-md)]"
                    >
                      <span>Get Started as Student</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                    <Link
                      href="/login"
                      className="w-full sm:w-auto px-7 py-3 text-sm font-bold text-[var(--title-color)] bg-white border border-[var(--border-color)] rounded-[var(--radius-md)] hover:bg-[var(--bg-title-color)] transition text-center shadow-[var(--shadow-sm)]"
                    >
                      Faculty & Staff Sign In
                    </Link>
                  </>
                )}
                <a
                  href="#features"
                  className="text-xs font-bold text-[var(--paragraph-color)] hover:text-[var(--title-color)] underline underline-offset-4 py-2"
                >
                  Explore Platform Capabilities
                </a>
              </div>

              {/* Key Trust Pillars */}
              <div className="pt-6 border-t border-[var(--border-color)]/60 grid grid-cols-2 sm:grid-cols-3 gap-4 text-left">
                <div className="flex items-center gap-2 text-xs font-semibold text-[var(--title-color)]">
                  <CheckCircle2 className="w-4 h-4 text-[#82c341] shrink-0" />
                  <span>Bloom's Taxonomy Tagging</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold text-[var(--title-color)]">
                  <CheckCircle2 className="w-4 h-4 text-[#82c341] shrink-0" />
                  <span>Blueprint Balance Engine</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold text-[var(--title-color)]">
                  <CheckCircle2 className="w-4 h-4 text-[#82c341] shrink-0" />
                  <span>Multi-Tenant RBAC</span>
                </div>
              </div>
            </div>

            {/* Right Visual Console Card */}
            <div className="lg:col-span-5">
              <div className="bg-[var(--secondary-color)] rounded-[var(--radius-xl)] p-6 sm:p-8 text-white shadow-2xl border border-white/10 relative overflow-hidden">
                {/* Background Glow */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#82c341]/10 rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10 space-y-6">
                  <div className="flex items-center justify-between pb-4 border-b border-white/10">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded bg-[#82c341] text-black font-black text-sm flex items-center justify-center">
                        Ω
                      </div>
                      <span className="font-bold text-sm tracking-wide">Live Assessment Engine</span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#82c341]/20 text-[#82c341] border border-[#82c341]/40 font-mono font-bold">
                      ACTIVE
                    </span>
                  </div>

                  {/* Simulated Question Card */}
                  <div className="bg-white/5 rounded-lg p-4 border border-white/10 space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-white/60">
                      <span>Course: BCA401 &bull; Unit 3 (DBMS)</span>
                      <span className="text-[#82c341] font-semibold">Marks: 5 &bull; MEDIUM</span>
                    </div>
                    <p className="text-xs text-white/90 font-medium leading-relaxed">
                      "Explain the distinction between Two-Phase Locking (2PL) and Strict 2PL. How does Strict 2PL prevent cascading aborts?"
                    </p>
                    <div className="pt-2 flex items-center gap-2 text-[10px] text-white/50">
                      <span className="px-1.5 py-0.5 bg-white/10 rounded">Status: APPROVED</span>
                      <span className="px-1.5 py-0.5 bg-white/10 rounded">Moderator: Verified</span>
                    </div>
                  </div>

                  {/* Blueprint Metrics Breakdown */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-white/70">
                      <span>Unit Distribution Balance</span>
                      <span className="text-[#82c341] font-mono font-bold">100% Validated</span>
                    </div>
                    <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                      <div className="bg-[#82c341] h-full rounded-full" style={{ width: "100%" }} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2 text-center text-xs">
                    <div className="bg-white/5 rounded p-2.5 border border-white/10">
                      <span className="block text-lg font-bold text-[#82c341]">70</span>
                      <span className="text-[10px] text-white/60">Total Paper Marks</span>
                    </div>
                    <div className="bg-white/5 rounded p-2.5 border border-white/10">
                      <span className="block text-lg font-bold text-[#82c341]">180m</span>
                      <span className="text-[10px] text-white/60">Standard Duration</span>
                    </div>
                  </div>

                  {/* Redirection Note */}
                  <div className="pt-2 text-center">
                    <Link
                      href="/question-papers"
                      className="inline-flex items-center gap-1.5 text-xs text-[#82c341] hover:underline font-semibold"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Browse Published Past Papers</span>
                    </Link>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Platform Features Section */}
      <section id="features" className="py-20 bg-white border-b border-[var(--border-color)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-[#3e681c] bg-[#eaf5de] px-3 py-1 rounded-full border border-[#82c341]/60">
              Complete Assessment Suite
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-[var(--title-color)] tracking-tight">
              Engineered for Institutional Examination Rigor
            </h2>
            <p className="text-sm sm:text-base text-[var(--paragraph-color)] leading-relaxed">
              Every stage of the assessment lifecycle is coordinated through structured digital workflows,
              eliminating syllabus imbalances, subjective difficulty grading, and confidential leaks.
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((item, idx) => {
              const Icon = item.icon;
              return (
                <div
                  key={idx}
                  className="bg-[var(--surface-color)] p-6 sm:p-7 rounded-[var(--radius-lg)] border border-[var(--border-color)] hover:border-[#82c341]/60 hover:shadow-[var(--shadow-md)] transition duration-200 group"
                >
                  <div className="w-12 h-12 rounded-[var(--radius-md)] bg-[#eaf5de] text-[#3e681c] flex items-center justify-center mb-5 group-hover:bg-[#82c341] group-hover:text-black transition-colors">
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-[var(--title-color)] mb-2 group-hover:text-[#2e4d15] transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-xs leading-relaxed text-[var(--paragraph-color)]">
                    {item.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-[var(--background-color)] border-b border-[var(--border-color)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-[#3e681c] bg-[#eaf5de] px-3 py-1 rounded-full border border-[#82c341]/60">
              Structured Examination Lifecycle
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-[var(--title-color)] tracking-tight">
              From Curriculum Ingestion to Published Papers
            </h2>
            <p className="text-sm sm:text-base text-[var(--paragraph-color)] leading-relaxed">
              QPMS Apex standardizes the examination workflow into a 6-step verifiable pipeline.
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {steps.map((st, i) => (
              <div
                key={i}
                className="bg-white p-6 rounded-[var(--radius-lg)] border border-[var(--border-color)] space-y-3 shadow-[var(--shadow-sm)]"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-2xl font-black text-[#82c341]">{st.num}</span>
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-[var(--bg-title-color)] text-[var(--muted-text-color)]">
                    Phase {i + 1}
                  </span>
                </div>
                <h3 className="text-base font-bold text-[var(--title-color)]">{st.title}</h3>
                <p className="text-xs text-[var(--paragraph-color)] leading-relaxed">{st.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Role Overview Section */}
      <section className="py-20 bg-white border-b border-[var(--border-color)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-[#3e681c] bg-[#eaf5de] px-3 py-1 rounded-full border border-[#82c341]/60">
              Role-Based Collaboration
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-[var(--title-color)] tracking-tight">
              Authorized Portals for Every Academic Stakeholder
            </h2>
            <p className="text-sm sm:text-base text-[var(--paragraph-color)] leading-relaxed">
              Every authorized participant receives a dedicated, tailored console adhering to strict organizational scope.
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {roles.map((r, i) => (
              <div
                key={i}
                className="bg-[var(--surface-color)] p-6 rounded-[var(--radius-lg)] border border-[var(--border-color)] flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-[#3e681c] bg-[#eaf5de] px-2.5 py-0.5 rounded border border-[#82c341]/50">
                      {r.badge}
                    </span>
                    <span className="text-[10px] font-mono text-[var(--muted-text-color)]">
                      {r.role}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-[var(--title-color)]">{r.title}</h3>
                  <p className="text-xs text-[var(--paragraph-color)] leading-relaxed">{r.desc}</p>
                </div>
              </div>
            ))}

            {/* Note on Platform Super Admin */}
            <div className="bg-[var(--secondary-color)] p-6 rounded-[var(--radius-lg)] text-white flex flex-col justify-between border border-white/10">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-[#82c341] bg-white/10 px-2.5 py-0.5 rounded border border-white/20">
                    Platform Control Plane
                  </span>
                  <span className="text-[10px] font-mono text-white/60">PORT 3002</span>
                </div>
                <h3 className="text-base font-bold text-white">Platform Super Admin</h3>
                <p className="text-xs text-white/80 leading-relaxed">
                  Operates through the dedicated security application on Port 3002 for cross-university provisioning, suspension, and immutable logging.
                </p>
              </div>
              <div className="pt-4">
                <a
                  href="http://localhost:3002/login"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-[#82c341] font-bold hover:underline"
                >
                  <span>Open Super Admin Portal</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="py-20 bg-gradient-to-r from-[var(--secondary-color)] to-[#323d44] text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#82c341] text-black font-black text-2xl shadow-lg mb-2">
            Ω
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
            Ready to Standardize Your University's Assessments?
          </h2>
          <p className="text-sm sm:text-base text-white/80 max-w-2xl mx-auto leading-relaxed">
            Eliminate exam blueprint drift and empower academic leadership with verified question moderation,
            tamper-evident PDF generation, and automated syllabus balancing.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/signup"
              className="btn-primary w-full sm:w-auto text-sm py-3.5 px-8 font-bold flex items-center justify-center gap-2"
            >
              <span>Register for Student Access</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/contact"
              className="w-full sm:w-auto px-8 py-3.5 text-sm font-bold text-white bg-white/10 hover:bg-white/20 border border-white/20 rounded-[var(--radius-md)] transition text-center"
            >
              Submit University Inquiry
            </Link>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
