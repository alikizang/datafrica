import { NextRequest, NextResponse } from "next/server";

// In-memory cache for maintenance state (60s TTL)
let maintenanceCache: { enabled: boolean; message: string; scheduledEnd: string } | null = null;
let cacheExpiry = 0;

async function getMaintenanceState(): Promise<{ enabled: boolean; message: string; scheduledEnd: string }> {
  const now = Date.now();
  if (maintenanceCache && now < cacheExpiry) {
    return maintenanceCache;
  }

  try {
    // Dynamic import to avoid initialization issues
    const { adminDb } = await import("@/lib/firebase-admin");
    const doc = await adminDb.doc("settings/maintenance").get();
    const data = doc.exists
      ? (doc.data() as { enabled: boolean; message: string; scheduledEnd: string })
      : { enabled: false, message: "", scheduledEnd: "" };

    maintenanceCache = data;
    cacheExpiry = now + 60_000; // 60s TTL
    return data;
  } catch {
    // If Firestore fails, assume not in maintenance
    return { enabled: false, message: "", scheduledEnd: "" };
  }
}

// Paths that should bypass maintenance mode
const BYPASS_PATHS = [
  "/admin",
  "/api/admin",
  "/maintenance",
  "/login",
  "/api/auth",
  "/icon.png",
  "/logo.png",
  "/_next",
  "/favicon.ico",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip maintenance check for admin routes, static assets, and the maintenance page itself
  if (BYPASS_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const state = await getMaintenanceState();

  if (state.enabled) {
    // Check if scheduled end has passed
    if (state.scheduledEnd && new Date(state.scheduledEnd).getTime() < Date.now()) {
      // Maintenance period has ended, skip redirect
      return NextResponse.next();
    }

    // Redirect to maintenance page
    const url = request.nextUrl.clone();
    url.pathname = "/maintenance";
    url.searchParams.set("message", state.message || "");
    if (state.scheduledEnd) url.searchParams.set("until", state.scheduledEnd);
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all paths except static files
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
