import React from "react";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "danger" | "info" | "outline" | "primary" | "secondary";
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function Badge({ children, variant = "default", size = "md", className = "" }: BadgeProps) {
  const sizeStyles = {
    sm: "px-2 py-0.5 text-[10px]",
    md: "px-2.5 py-0.5 text-xs",
    lg: "px-3 py-1 text-sm",
  };

  const variantStyles = {
    default: "bg-[#f3f3f3] text-[#676767] border-[#dcdcdc]",
    primary: "bg-[#eaf5de] text-[#3e681c] border-[#82c341]",
    secondary: "bg-[#f6f6f7] text-[#45525b] border-[#dcdcdc]",
    success: "bg-[#eaf5de] text-[#325816] border-[#82c341]",
    warning: "bg-[#fef9c3] text-[#854d0e] border-[#fde047]",
    danger: "bg-[#fee2e2] text-[#991b1b] border-[#fecaca]",
    info: "bg-[#f6f6f7] text-[#45525b] border-[#dcdcdc]",
    outline: "bg-transparent text-[#45525b] border-[#dcdcdc]",
  };

  return (
    <span
      className={`inline-flex items-center rounded-[var(--radius-sm)] font-semibold border ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const mapping: Record<string, { label: string; variant: BadgeProps["variant"] }> = {
    APPROVED: { label: "Approved", variant: "success" },
    PUBLISHED: { label: "Published", variant: "success" },
    SUBMITTED: { label: "Submitted", variant: "warning" },
    UNDER_REVIEW: { label: "Under Review", variant: "warning" },
    DRAFT: { label: "Draft", variant: "default" },
    GENERATED: { label: "Generated", variant: "info" },
    REJECTED: { label: "Rejected", variant: "danger" },
    ARCHIVED: { label: "Archived", variant: "outline" },
  };

  const item = mapping[status] || { label: status, variant: "default" };
  return <Badge variant={item.variant}>{item.label}</Badge>;
}

export function DifficultyBadge({ difficulty }: { difficulty: string }) {
  const mapping: Record<string, { label: string; variant: BadgeProps["variant"] }> = {
    EASY: { label: "Easy", variant: "success" },
    MEDIUM: { label: "Medium", variant: "warning" },
    HARD: { label: "Hard", variant: "danger" },
  };

  const item = mapping[difficulty] || { label: difficulty, variant: "default" };
  return <Badge variant={item.variant}>{item.label}</Badge>;
}

export function TypeBadge({ type }: { type: string }) {
  const mapping: Record<string, { label: string; variant: BadgeProps["variant"] }> = {
    MCQ: { label: "MCQ", variant: "primary" },
    TRUE_FALSE: { label: "True/False", variant: "info" },
    FILL_BLANK: { label: "Fill-in-Blank", variant: "warning" },
    DESCRIPTIVE: { label: "Descriptive", variant: "default" },
  };

  const item = mapping[type] || { label: type, variant: "default" };
  return <Badge variant={item.variant}>{item.label}</Badge>;
}
