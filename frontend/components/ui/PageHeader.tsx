import React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  breadcrumbs?: BreadcrumbItem[];
  title: string;
  description?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  action?: React.ReactNode;
  children?: React.ReactNode;
}

export function PageHeader({ breadcrumbs, title, description, subtitle, actions, action, children }: PageHeaderProps) {
  const desc = description || subtitle;
  const actionContent = actions || action || children;
  return (
    <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div>
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="flex items-center gap-1.5 text-xs text-[var(--muted-text-color)] mb-1.5 font-medium">
            {breadcrumbs.map((crumb, idx) => (
              <React.Fragment key={crumb.label}>
                {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-[#838383]/60" />}
                {crumb.href ? (
                  <Link href={crumb.href} className="hover:text-[var(--title-color)] transition-colors">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-[var(--title-color)]">{crumb.label}</span>
                )}
              </React.Fragment>
            ))}
          </nav>
        )}
        <h1 className="text-2xl font-bold tracking-tight text-[var(--title-color)]">{title}</h1>
        {desc && <p className="text-sm text-[var(--body-text-color)] mt-1">{desc}</p>}
      </div>
      {actionContent && <div className="flex items-center gap-3 shrink-0 flex-wrap">{actionContent}</div>}
    </div>
  );
}
