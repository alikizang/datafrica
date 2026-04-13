import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-middleware";
import { adminDb } from "@/lib/firebase-admin";
import { logActivity } from "@/lib/activity-log";
import { sendTemplateEmail } from "@/lib/email";

// POST /api/admin/broadcast - Send an alert to all users or specific users
export async function POST(request: NextRequest) {
  try {
    const { error, user: adminUser } = await requireAdmin(request);
    if (error) return error;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { title, message, type, userIds, sendEmail } = body as Record<string, unknown>;

    if (!title || typeof title !== "string" || !title.trim()) {
      return NextResponse.json({ error: "title is required and must be a non-empty string" }, { status: 400 });
    }

    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json({ error: "message is required and must be a non-empty string" }, { status: 400 });
    }

    const VALID_BROADCAST_TYPES = ["info", "warning", "error", "success"];
    if (type !== undefined && (typeof type !== "string" || !VALID_BROADCAST_TYPES.includes(type))) {
      return NextResponse.json({ error: `type must be one of: ${VALID_BROADCAST_TYPES.join(", ")}` }, { status: 400 });
    }

    if (userIds !== undefined && !Array.isArray(userIds)) {
      return NextResponse.json({ error: "userIds must be an array of strings" }, { status: 400 });
    }

    if (userIds && Array.isArray(userIds) && userIds.some((id: unknown) => typeof id !== "string" || !id.trim())) {
      return NextResponse.json({ error: "Each userId must be a non-empty string" }, { status: 400 });
    }

    let targetUsers: string[] = [];

    if (userIds && Array.isArray(userIds) && userIds.length > 0) {
      targetUsers = userIds as string[];
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
          type: (type as string) || "info",
          read: false,
          createdAt: new Date().toISOString(),
          createdBy: "admin-broadcast",
        });
      }

      await batch.commit();
      totalSent += chunk.length;
    }

    // Send emails if requested
    let emailsSent = 0;
    if (sendEmail) {
      for (let i = 0; i < targetUsers.length; i += 50) {
        const chunk = targetUsers.slice(i, i + 50);
        const emailPromises = chunk.map(async (userId) => {
          try {
            const userDoc = await adminDb.collection("users").doc(userId).get();
            if (userDoc.exists) {
              const userData = userDoc.data()!;
              if (userData.email) {
                const sent = await sendTemplateEmail("broadcast", userData.email, {
                  name: userData.displayName || userData.email,
                  title: title as string,
                  message: message as string,
                });
                if (sent) emailsSent++;
              }
            }
          } catch { /* skip failed emails */ }
        });
        await Promise.all(emailPromises);
        // Small delay between batches to respect Gmail rate limits
        if (i + 50 < targetUsers.length) {
          await new Promise((r) => setTimeout(r, 1000));
        }
      }
    }

    logActivity({ action: "broadcast.sent", userId: adminUser?.uid, details: `"${title as string}" to ${totalSent} users${sendEmail ? ` (${emailsSent} emails)` : ""}` });

    return NextResponse.json({ success: true, totalSent, emailsSent });
  } catch (error) {
    console.error("Error broadcasting:", error);
    return NextResponse.json({ error: "Broadcast failed" }, { status: 500 });
  }
}
