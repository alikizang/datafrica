import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-middleware";
import { adminDb } from "@/lib/firebase-admin";
import { logActivity } from "@/lib/activity-log";

// POST /api/admin/messages - Send message to one or multiple users
export async function POST(request: NextRequest) {
  try {
    const { error, user: adminUser } = await requireAdmin(request);
    if (error) return error;

    const body = await request.json();
    const { userIds, subject, body: msgBody } = body;

    if (!msgBody || !msgBody.trim()) {
      return NextResponse.json({ error: "Message body required" }, { status: 400 });
    }

    let targets: string[] = [];

    if (userIds && Array.isArray(userIds) && userIds.length > 0) {
      targets = userIds;
    } else {
      // Send to all users
      const usersSnap = await adminDb.collection("users").get();
      targets = usersSnap.docs.map((doc) => doc.id);
    }

    let totalSent = 0;
    const batchSize = 500;

    for (let i = 0; i < targets.length; i += batchSize) {
      const batch = adminDb.batch();
      const chunk = targets.slice(i, i + batchSize);

      for (const userId of chunk) {
        const msgRef = adminDb.collection("messages").doc();
        batch.set(msgRef, {
          senderId: adminUser?.uid || "admin",
          senderName: "Datafrica Admin",
          senderEmail: adminUser?.email || "admin@datafrica.com",
          recipientId: userId,
          participants: [adminUser?.uid || "admin", userId],
          subject: subject || "",
          body: msgBody.trim(),
          readByUser: false,
          readByAdmin: true,
          createdAt: new Date().toISOString(),
        });
      }

      await batch.commit();
      totalSent += chunk.length;
    }

    logActivity({
      action: "message.sent",
      userId: adminUser?.uid,
      details: `Sent "${subject || "message"}" to ${totalSent} user(s)`,
    });

    return NextResponse.json({ success: true, totalSent });
  } catch (error) {
    console.error("Error sending admin messages:", error);
    return NextResponse.json({ error: "Failed to send messages" }, { status: 500 });
  }
}
