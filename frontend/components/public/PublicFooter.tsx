import React from "react";
import Link from "next/link";
import { Shield, BookOpen, Layers, CheckCircle, ExternalLink, Mail, ArrowUpRight } from "lucide-react";

export function PublicFooter() {
  return (
    <footer className="bg-[var(--footer-bg)] border-t border-[var(--border-color)] text-[var(--paragraph-color)] mt-auto">
      {/* Upper Content Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-12">
          
          {/* Brand Column */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-[var(--radius-md)] bg-[#82c341] flex items-center justify-center text-[#000000] font-black text-lg shadow-[var(--shadow-sm)]">
                Ω
              </div>
              <span className="font-extrabold text-[var(--title-color)] text-xl tracking-tight">
                QPMS Apex
              </span>
            </div>
            <p className="text-xs leading-relaxed max-w-sm text-[var(--paragraph-color)]">
              The institutional-grade University Question Paper Management & Generation Platform.
              Empowering academic institutions with automated blueprint generation, multi-tier question moderation,
              and tamper-evident examination governance.
            </p>
            <div className="pt-2 flex items-center gap-3 text-xs text-[var(--paragraph-color)]">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-white border border-[var(--border-color)] font-semibold text-[var(--title-color)]">
                <span className="w-2 h-2 rounded-full bg-[#82c341] animate-pulse" />
                Cluster Operational
              </span>
              <span className="text-[var(--font-color)]">&bull;</span>
              <span>FastAPI &bull; Next.js &bull; Postgres</span>
            </div>
          </div>

          {/* Quick Links Column */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-[var(--title-color)] uppercase tracking-wider">
              Navigation
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/" className="hover:text-[var(--title-color)] transition">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-[var(--title-color)] transition">
                  About Platform
                </Link>
              </li>
              <li>
                <Link href="/#features" className="hover:text-[var(--title-color)] transition">
                  Features & Modules
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-[var(--title-color)] transition">
                  Contact & Inquiries
                </Link>
              </li>
            </ul>
          </div>

          {/* Assessment Engine Column */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-[var(--title-color)] uppercase tracking-wider">
              Academic Engine
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <span className="text-[var(--font-color)]">Taxonomy Question Bank</span>
              </li>
              <li>
                <span className="text-[var(--font-color)]">Automated Paper Generator</span>
              </li>
              <li>
                <span className="text-[var(--font-color)]">Syllabus & Units Tracker</span>
              </li>
              <li>
                <span className="text-[var(--font-color)]">Department Moderation Board</span>
              </li>
              <li>
                <span className="text-[var(--font-color)]">Print-Ready PDF Watermarking</span>
              </li>
            </ul>
          </div>

          {/* Institutional Gateways Column */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-[var(--title-color)] uppercase tracking-wider">
              Portals & Access
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/login" className="font-semibold text-[var(--title-color)] hover:text-[#2e4d15] flex items-center gap-1">
                  <span>University Sign In</span>
                  <ArrowUpRight className="w-3 h-3 text-[#82c341]" />
                </Link>
              </li>
              <li>
                <Link href="/signup" className="hover:text-[var(--title-color)] transition">
                  Public Student Registration
                </Link>
              </li>
              <li>
                <Link href="/forgot-password" className="hover:text-[var(--title-color)] transition">
                  Password Recovery
                </Link>
              </li>
              <li className="pt-2">
                <a
                  href="http://localhost:3002/login"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[var(--secondary-color)] text-white text-[11px] font-bold hover:bg-[#343e45] transition"
                >
                  <Shield className="w-3 h-3 text-[#82c341]" />
                  <span>Super Admin Portal :3002</span>
                  <ExternalLink className="w-2.5 h-2.5 text-white/70" />
                </a>
              </li>
            </ul>
          </div>

        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-[var(--border-color)] bg-[var(--footer-bg)]/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[var(--font-color)]">
          <p>
            &copy; {new Date().getFullYear()} QPMS Apex &bull; University Question Paper Management System. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <span className="hover:text-[var(--title-color)] cursor-pointer">
              Privacy Policy
            </span>
            <span className="hover:text-[var(--title-color)] cursor-pointer">
              Terms of Service
            </span>
            <span className="hover:text-[var(--title-color)] cursor-pointer">
              Security Compliance
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
