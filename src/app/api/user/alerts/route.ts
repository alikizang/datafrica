import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { adminDb } from "@/lib/firebase-admin";

// GET /api/user/alerts - Fetch alerts for the authenticated user
export async function GET(request: NextRequest) {
  try {
    const { user, error } = await requireAuth(request);
    if (error) return error;

    const alertsSnap = await adminDb
      .collection("alerts")
      .where("userId", "==", user!.uid)
      .orderBy("createdAt", "desc")
      .limit(50)
      .get();

    const alerts = alertsSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    const unreadCount = alerts.filter(
      (a) => !(a as { read?: boolean }).read
    ).length;

    return NextResponse.json({ alerts, unreadCount });
  } catch (error) {
    console.error("Error fetching alerts:", error);
    return NextResponse.json(
      { error: "Failed to fetch alerts" },
      { status: 500 }
    );
  }
}

// PATCH /api/user/alerts - Mark alerts as read
export async function PATCH(request: NextRequest) {
  try {
    const { user, error } = await requireAuth(request);
    if (error) return error;

    const body = await request.json();
    const { alertId, markAllRead } = body;

    if (markAllRead) {
      const unreadSnap = await adminDb
        .collection("alerts")
        .where("userId", "==", user!.uid)
        .where("read", "==", false)
        .get();

      const batch = adminDb.batch();
      unreadSnap.docs.forEach((doc) => batch.update(doc.ref, { read: true }));
      if (unreadSnap.docs.length > 0) await batch.commit();

      return NextResponse.json({ success: true, updated: unreadSnap.docs.length });
    }

    if (alertId) {
      const alertRef = adminDb.collection("alerts").doc(alertId);
      const alertDoc = await alertRef.get();

      if (!alertDoc.exists || alertDoc.data()?.userId !== user!.uid) {
        return NextResponse.json({ error: "Alert not found" }, { status: 404 });
      }

      await alertRef.update({ read: true });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "alertId or markAllRead required" }, { status: 400 });
  } catch (error) {
    console.error("Error updating alerts:", error);
    return NextResponse.json(
      { error: "Failed to update alerts" },
      { status: 500 }
    );
  }
}
