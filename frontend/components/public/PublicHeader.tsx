"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  Menu,
  X,
  LayoutDashboard,
  LogOut,
  User as UserIcon,
  Shield,
  ArrowRight,
  BookOpen
} from "lucide-react";

export function PublicHeader() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { label: "Home", href: "/" },
    { label: "About Us", href: "/about" },
    { label: "Features", href: "/#features" },
    { label: "Contact Us", href: "/contact" },
  ];

  const isActive = (href: string) => {
    if (href === "/" && pathname === "/") return true;
    if (href !== "/" && !href.startsWith("/#") && pathname === href) return true;
    return false;
  };

  return (
    <header className="sticky top-0 z-50 bg-[var(--white-color)]/95 backdrop-blur-md border-b border-[var(--border-color)] transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-3 group focus:outline-none">
            <div className="w-10 h-10 rounded-[var(--radius-md)] bg-[#82c341] flex items-center justify-center text-[#000000] font-black text-xl shadow-[var(--shadow-sm)] group-hover:scale-105 transition-transform">
              Ω
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-[var(--title-color)] text-lg sm:text-xl tracking-tight leading-none">
                  QPMS Apex
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#eaf5de] text-[#3e681c] border border-[#82c341]/40">
                  v1.0
                </span>
              </div>
              <p className="text-[11px] text-[var(--paragraph-color)] mt-0.5 font-medium hidden sm:block">
                University Question Paper Management System
              </p>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2">
            {navLinks.map((link) => {
              const active = isActive(link.href);
              return (
                <Link
                  key={link.label}
                  href={link.href}
                  className={`px-3.5 py-2 rounded-[var(--radius-md)] text-sm font-semibold transition ${
                    active
                      ? "text-[#2e4d15] bg-[#eaf5de] border border-[#82c341]/40"
                      : "text-[var(--title-color)] hover:text-[#2e4d15] hover:bg-[var(--bg-title-color)]"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Right Action Buttons */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                {/* Role Badge */}
                <span className="text-xs px-2.5 py-1 rounded-[var(--radius-sm)] font-bold bg-[#eaf5de] text-[#3e681c] border border-[#82c341]/60">
                  {user.role_name.replace("_", " ")}
                </span>

                {/* Dashboard Button */}
                <Link
                  href="/dashboard"
                  className="btn-primary text-xs flex items-center gap-1.5 py-2 px-3.5 font-bold"
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  <span>My Dashboard</span>
                </Link>

                {/* Logout Button */}
                <button
                  onClick={logout}
                  className="p-2 text-[var(--paragraph-color)] hover:text-[#991b1b] hover:bg-[#fee2e2] rounded-[var(--radius-md)] transition border border-[var(--border-color)]"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="px-4 py-2 text-sm font-bold text-[var(--title-color)] hover:text-[#2e4d15] hover:bg-[var(--bg-title-color)] rounded-[var(--radius-md)] transition"
                >
                  Sign In
                </Link>
                <Link
                  href="/signup"
                  className="btn-primary text-xs flex items-center gap-1.5 py-2.5 px-4 font-bold"
                >
                  <span>Student Sign Up</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Hamburger */}
          <div className="flex md:hidden items-center gap-2">
            {user && (
              <Link
                href="/dashboard"
                className="btn-primary text-xs py-1.5 px-2.5 font-bold flex items-center gap-1"
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Dashboard</span>
              </Link>
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-[var(--radius-md)] text-[var(--title-color)] hover:bg-[var(--bg-title-color)] transition border border-[var(--border-color)]"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[var(--border-color)] bg-[var(--white-color)] px-4 pt-3 pb-5 space-y-3 shadow-[var(--shadow-md)]">
          <div className="space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3 py-2 rounded-[var(--radius-md)] text-sm font-semibold ${
                  isActive(link.href)
                    ? "text-[#2e4d15] bg-[#eaf5de] font-bold"
                    : "text-[var(--title-color)] hover:bg-[var(--bg-title-color)]"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="pt-3 border-t border-[var(--border-color)] space-y-2">
            {user ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs px-3 py-1.5 bg-[var(--surface-color)] rounded border border-[var(--border-color)]">
                  <span className="font-semibold text-[var(--title-color)] truncate max-w-[180px]">
                    {user.full_name}
                  </span>
                  <span className="font-bold text-[#3e681c] bg-[#eaf5de] px-2 py-0.5 rounded text-[10px]">
                    {user.role_name}
                  </span>
                </div>
                <Link
                  href="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="btn-primary w-full text-center text-sm py-2.5 font-bold flex items-center justify-center gap-2"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Go to My Dashboard</span>
                </Link>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    logout();
                  }}
                  className="w-full text-center text-xs py-2 font-semibold text-[#991b1b] hover:bg-[#fee2e2] rounded-[var(--radius-md)] border border-[#fca5a5] flex items-center justify-center gap-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full py-2.5 text-center text-sm font-bold text-[var(--title-color)] bg-[var(--bg-title-color)] border border-[var(--border-color)] rounded-[var(--radius-md)] hover:bg-[var(--bg-text-color)]/50 transition"
                >
                  Sign In
                </Link>
                <Link
                  href="/signup"
                  onClick={() => setMobileMenuOpen(false)}
                  className="btn-primary w-full text-center text-sm py-2.5 font-bold flex items-center justify-center gap-1"
                >
                  <span>Sign Up</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
