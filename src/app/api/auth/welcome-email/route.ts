import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { adminDb } from "@/lib/firebase-admin";
import { sendTemplateEmail } from "@/lib/email";

// POST /api/auth/welcome-email - Send welcome email after signup
export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireAuth(request);
    if (error) return error;

    const userDoc = await adminDb.collection("users").doc(user!.uid).get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userData = userDoc.data()!;
    const email = userData.email || user!.email;
    if (!email) {
      return NextResponse.json({ error: "No email" }, { status: 400 });
    }

    await sendTemplateEmail("welcome", email, {
      name: userData.displayName || email,
      email,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Welcome email error:", error);
    return NextResponse.json({ error: "Failed to send welcome email" }, { status: 500 });
  }
}
