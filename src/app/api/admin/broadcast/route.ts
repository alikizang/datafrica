import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-middleware";
import { adminDb } from "@/lib/firebase-admin";

// POST /api/admin/broadcast - Send an alert to all users or specific users
export async function POST(request: NextRequest) {
  try {
    const { error } = await requireAdmin(request);
    if (error) return error;

    const body = await request.json();
    const { title, message, type, userIds } = body;

    if (!title || !message) {
      return NextResponse.json({ error: "title and message required" }, { status: 400 });
    }

    let targetUsers: string[] = [];

    if (userIds && Array.isArray(userIds) && userIds.length > 0) {
      targetUsers = userIds;
    } else {
      // Broadcast to all users
      const usersSnap = await adminDb.collection("users").get();
      targetUsers = usersSnap.docs.map((doc) => doc.id);
    }

    // Create alerts in batches of 500
    let totalSent = 0;
    const batchSize = 500;

    for (let i = 0; i < targetUsers.length; i += batchSize) {
      const batch = adminDb.batch();
      const chunk = targetUsers.slice(i, i + batchSize);

      for (const userId of chunk) {
        const alertRef = adminDb.collection("alerts").doc();
        batch.set(alertRef, {
          userId,
          title,
          message,
          type: type || "info",
          read: false,
          createdAt: new Date().toISOString(),
          createdBy: "admin-broadcast",
        });
      }

      await batch.commit();
      totalSent += chunk.length;
    }

    return NextResponse.json({ success: true, totalSent });
  } catch (error) {
    console.error("Error broadcasting:", error);
    return NextResponse.json({ error: "Broadcast failed" }, { status: 500 });
  }
}
