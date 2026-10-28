import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow static files, api routes, and public paths
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/uploads") ||
    pathname === "/login" ||
    pathname === "/access-denied"
  ) {
    return NextResponse.next();
  }

  // Token in cookie check if present (otherwise client-side auth guard in AdminLayout handles localStorage)
  const token = request.cookies.get("qpms_superadmin_token")?.value || request.cookies.get("qpms_token")?.value;

  // Let Next.js continue; Client-side AdminLayout handles role verification & redirection
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
