"use client";

import React, { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { AdminSidebar } from "./AdminSidebar";
import { AdminHeader } from "./AdminHeader";

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading) {
      if (!user && pathname !== "/login" && pathname !== "/access-denied") {
        router.push("/login");
      } else if (user && user.role_name !== "SUPER_ADMIN" && pathname !== "/access-denied") {
        router.push("/access-denied");
      }
    }
  }, [user, isLoading, pathname, router]);

  if (pathname === "/login" || pathname === "/access-denied") {
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--background-color)] flex flex-col items-center justify-center text-[var(--title-color)]">
        <div className="w-10 h-10 border-4 border-[#82c341] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-semibold text-[var(--title-color)]">Authenticating Super Admin Console...</p>
      </div>
    );
  }

  if (!user || user.role_name !== "SUPER_ADMIN") {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-[var(--background-color)] text-[var(--body-text-color)]">
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <AdminHeader />
        <main className="flex-1 p-5 md:p-8 overflow-y-auto">
          <div className="max-w-[var(--content-max-width)] mx-auto w-full">
            {children}
          </div>
        </main>
        <footer className="h-12 bg-[var(--footer-bg)] border-t border-[var(--border-color)] px-6 flex items-center justify-between text-xs text-[var(--muted-text-color)] no-print">
          <div>
            <span>&copy; {new Date().getFullYear()} QPMS Apex &bull; Super Admin Platform Console (Port 3002)</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="font-medium text-[var(--paragraph-color)]">Platform Control Plane Active</span>
            <span className="w-2 h-2 rounded-full bg-[#82c341]" />
          </div>
        </footer>
      </div>
    </div>
  );
}
