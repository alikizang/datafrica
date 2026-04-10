import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { adminDb } from "@/lib/firebase-admin";

// GET /api/user/purchases - Get current user's purchases
export async function GET(request: NextRequest) {
  try {
    const { user, error } = await requireAuth(request);
    if (error) return error;

    // Simple query without orderBy to avoid needing a composite index
    const purchasesSnap = await adminDb
      .collection("purchases")
      .where("userId", "==", user!.uid)
      .get();

    const purchases = purchasesSnap.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      .sort((a, b) => {
        const dateA = (a as Record<string, unknown>).createdAt as string || "";
        const dateB = (b as Record<string, unknown>).createdAt as string || "";
        return dateB.localeCompare(dateA);
      });

    return NextResponse.json({ purchases });
  } catch (error) {
    console.error("Error fetching purchases:", error);
    return NextResponse.json(
      { error: "Failed to fetch purchases" },
      { status: 500 }
    );
  }
}
