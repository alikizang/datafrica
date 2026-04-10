import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";

const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export async function verifyAuth(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.split("Bearer ")[1];
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    return decodedToken;
  } catch {
    return null;
  }
}

export async function requireAuth(request: NextRequest) {
  const user = await verifyAuth(request);
  if (!user) {
    return {
      user: null,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  return { user, error: null };
}

export async function requireAdmin(request: NextRequest) {
  const { user, error } = await requireAuth(request);
  if (error) return { user: null, error };

  // Check admin email list first (fast fallback)
  if (user!.email && ADMIN_EMAILS.includes(user!.email.toLowerCase())) {
    return { user, error: null };
  }

  // Then check admin role in Firestore
  try {
    const { adminDb } = await import("@/lib/firebase-admin");
    const userDoc = await adminDb.collection("users").doc(user!.uid).get();
    const userData = userDoc.data();

    if (userData?.role === "admin") {
      return { user, error: null };
    }
  } catch (err) {
    console.error("Firestore admin check failed:", err);
  }

  return {
    user: null,
    error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
  };
}
