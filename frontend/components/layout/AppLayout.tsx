"use client";

import React, { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Sidebar } from "./Sidebar";
import { Navbar } from "./Navbar";

const PUBLIC_ROUTES = [
  "/",
  "/about",
  "/contact",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password"
];

function isPublic(path: string) {
  if (PUBLIC_ROUTES.includes(path)) return true;
  if (path.startsWith("/reset-password")) return true;
  return false;
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isPublicPage = isPublic(pathname);

  useEffect(() => {
    if (!isLoading && !user && !isPublicPage) {
      router.push("/login");
    }
  }, [user, isLoading, isPublicPage, router]);

  // If on a public route, render directly without the authenticated dashboard sidebar
  if (isPublicPage) {
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--background-color)] flex flex-col items-center justify-center text-[var(--title-color)]">
        <div className="w-10 h-10 border-4 border-[#82c341] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-semibold text-[var(--title-color)]">Loading QPMS Apex...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-[var(--background-color)] text-[var(--body-text-color)]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <Navbar />
        <main className="flex-1 p-5 md:p-8 overflow-y-auto">
          <div className="max-w-[var(--content-max-width)] mx-auto w-full">
            {children}
          </div>
        </main>
        <footer className="h-12 bg-[var(--footer-bg)] border-t border-[var(--border-color)] px-6 flex items-center justify-between text-xs text-[var(--muted-text-color)] no-print">
          <div>
            <span>&copy; {new Date().getFullYear()} QPMS Apex &bull; University Question Paper Management System</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="font-medium text-[var(--paragraph-color)]">Status: System Operational</span>
            <span className="w-2 h-2 rounded-full bg-[#82c341]" />
          </div>
        </footer>
      </div>
    </div>
  );
}
