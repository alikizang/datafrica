import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-middleware";
import { adminDb } from "@/lib/firebase-admin";
import { logActivity } from "@/lib/activity-log";

// POST /api/admin/cleanup-payments - Delete expired pending payments
export async function POST(request: NextRequest) {
  try {
    const { error, user: adminUser } = await requireAdmin(request);
    if (error) return error;

    const now = new Date().toISOString();

    const expiredSnap = await adminDb
      .collection("pending_payments")
      .where("expiresAt", "<", now)
      .limit(500)
      .get();

    if (expiredSnap.empty) {
      return NextResponse.json({ success: true, deleted: 0 });
    }

    const batch = adminDb.batch();
    expiredSnap.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();

    logActivity({ action: "cleanup.run", userId: adminUser?.uid, details: `Deleted ${expiredSnap.size} stale payments` });

    return NextResponse.json({
      success: true,
      deleted: expiredSnap.size,
    });
  } catch (err) {
    console.error("Cleanup payments error:", err);
    return NextResponse.json(
      { error: "Failed to cleanup payments" },
      { status: 500 }
    );
  }
}
