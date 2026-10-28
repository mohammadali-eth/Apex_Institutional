import React from "react";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "danger" | "info" | "outline" | "primary" | "secondary";
  className?: string;
}

export function Badge({ children, variant = "default", className = "" }: BadgeProps) {
  const variantStyles = {
    default: "bg-[#f3f3f3] text-[#676767] border-[#dcdcdc]",
    primary: "bg-[#eaf5de] text-[#3e681c] border-[#82c341]",
    secondary: "bg-[#f6f6f7] text-[#45525b] border-[#dcdcdc]",
    success: "bg-[#eaf5de] text-[#325816] border-[#82c341]",
    warning: "bg-[#fef9c3] text-[#854d0e] border-[#fde047]",
    danger: "bg-[#fee2e2] text-[#991b1b] border-[#fecaca]",
    info: "bg-[#e0f2fe] text-[#0369a1] border-[#bae6fd]",
    outline: "bg-transparent text-[#45525b] border-[#dcdcdc]",
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-[var(--radius-sm)] text-xs font-semibold border ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
}

export function UniversityStatusBadge({ isActive }: { isActive: boolean }) {
  if (isActive) {
    return <Badge variant="success">Active</Badge>;
  }
  return <Badge variant="danger">Suspended</Badge>;
}

export function RoleBadge({ role }: { role: string }) {
  switch (role) {
    case "SUPER_ADMIN":
      return <Badge variant="danger">Super Admin</Badge>;
    case "UNIVERSITY_ADMIN":
      return <Badge variant="primary">University Admin</Badge>;
    case "INSTITUTION_ADMIN":
      return <Badge variant="info">Institution Admin</Badge>;
    case "HOD":
      return <Badge variant="warning">HOD</Badge>;
    case "TEACHER":
      return <Badge variant="secondary">Teacher</Badge>;
    case "STUDENT":
      return <Badge variant="default">Student</Badge>;
    default:
      return <Badge variant="outline">{role}</Badge>;
  }
}
