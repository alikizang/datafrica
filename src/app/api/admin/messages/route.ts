import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-middleware";
import { adminDb } from "@/lib/firebase-admin";
import { logActivity } from "@/lib/activity-log";

// POST /api/admin/messages - Send message to one or multiple users
export async function POST(request: NextRequest) {
  try {
    const { error, user: adminUser } = await requireAdmin(request);
    if (error) return error;

    let parsed: unknown;
    try {
      parsed = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { userIds, subject, body: msgBody } = parsed as Record<string, unknown>;

    if (!msgBody || typeof msgBody !== "string" || !msgBody.trim()) {
      return NextResponse.json({ error: "Message body is required and must be a non-empty string" }, { status: 400 });
    }

    if (subject !== undefined && typeof subject !== "string") {
      return NextResponse.json({ error: "subject must be a string" }, { status: 400 });
    }

    if (userIds !== undefined && !Array.isArray(userIds)) {
      return NextResponse.json({ error: "userIds must be an array of strings" }, { status: 400 });
    }

    if (userIds && Array.isArray(userIds) && userIds.some((id: unknown) => typeof id !== "string" || !id.trim())) {
      return NextResponse.json({ error: "Each userId must be a non-empty string" }, { status: 400 });
    }

    let targets: string[] = [];

    if (userIds && Array.isArray(userIds) && userIds.length > 0) {
      targets = userIds as string[];
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
