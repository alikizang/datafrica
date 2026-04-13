import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireAdmin } from "@/lib/auth-middleware";
import { adminDb } from "@/lib/firebase-admin";
import { logActivity } from "@/lib/activity-log";
import { sendEmail, newMessageEmail } from "@/lib/email";

// GET /api/messages - Get messages for the authenticated user (or all for admin)
export async function GET(request: NextRequest) {
  try {
    const { user, error } = await requireAuth(request);
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const mode = searchParams.get("mode"); // "admin" = get all conversations
    const conversationWith = searchParams.get("with"); // filter by other party
    const parsedLimit = parseInt(searchParams.get("limit") || "50", 10);
    const limit = Math.min(Number.isNaN(parsedLimit) || parsedLimit < 1 ? 50 : parsedLimit, 200);

    // Admin mode: list all conversations or messages with a specific user
    if (mode === "admin") {
      const adminCheck = await requireAdmin(request);
      if (adminCheck.error) return adminCheck.error;

      if (conversationWith) {
        // Get messages between admin and specific user
        const msgs = await adminDb
          .collection("messages")
          .where("participants", "array-contains", conversationWith)
          .orderBy("createdAt", "desc")
          .limit(limit)
          .get();

        const messages = msgs.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        return NextResponse.json({ messages: messages.reverse() });
      }

      // Get latest message per conversation (unique users who have messaged)
      const allMsgs = await adminDb
        .collection("messages")
        .orderBy("createdAt", "desc")
        .limit(500)
        .get();

      const conversationsMap = new Map<string, Record<string, unknown>>();
      for (const doc of allMsgs.docs) {
        const data = doc.data();
        // Find the non-admin participant
        const otherUserId = (data.participants as string[])?.find(
          (p: string) => p !== "admin" && p !== user!.uid
        ) || data.senderId;

        if (otherUserId && !conversationsMap.has(otherUserId)) {
          conversationsMap.set(otherUserId, {
            userId: otherUserId,
            senderName: data.senderName || data.senderId,
            senderEmail: data.senderEmail || "",
            lastMessage: data.body?.substring(0, 100) || "",
            lastMessageAt: data.createdAt,
            unread: !data.readByAdmin,
          });
        }
      }

      return NextResponse.json({
        conversations: Array.from(conversationsMap.values()),
      });
    }

    // Regular user: get own messages
    const msgs = await adminDb
      .collection("messages")
      .where("participants", "array-contains", user!.uid)
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();

    const messages = msgs.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    // Count unread
    const unread = messages.filter(
      (m) => (m as Record<string, unknown>).senderId !== user!.uid && !(m as Record<string, unknown>).readByUser
    ).length;

    return NextResponse.json({ messages: messages.reverse(), unread });
  } catch (error) {
    console.error("Error fetching messages:", error);
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
  }
}

// POST /api/messages - Send a message
export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireAuth(request);
    if (error) return error;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { to, subject, body: msgBody } = body as Record<string, unknown>;

    if (!msgBody || typeof msgBody !== "string" || !msgBody.trim()) {
      return NextResponse.json({ error: "Message body is required and must be a non-empty string" }, { status: 400 });
    }

    if (to !== undefined && (typeof to !== "string" || !to.trim())) {
      return NextResponse.json({ error: "to must be a non-empty string" }, { status: 400 });
    }

    if (subject !== undefined && typeof subject !== "string") {
      return NextResponse.json({ error: "subject must be a string" }, { status: 400 });
    }

    // Get sender info
    let senderName = user!.email || "User";
    let senderEmail = user!.email || "";
    try {
      const userDoc = await adminDb.collection("users").doc(user!.uid).get();
      const userData = userDoc.data();
      if (userData?.displayName) senderName = userData.displayName;
      if (userData?.email) senderEmail = userData.email;
    } catch { /* ok */ }

    // Determine if sender is admin
    let isAdmin = false;
    try {
      const userDoc = await adminDb.collection("users").doc(user!.uid).get();
      isAdmin = userDoc.data()?.role === "admin";
    } catch { /* ok */ }

    const recipientId = (to as string) || "admin";
    const participants = recipientId === "admin"
      ? [user!.uid, "admin"]
      : [user!.uid, recipientId];

    const messageDoc = {
      senderId: user!.uid,
      senderName,
      senderEmail,
      recipientId,
      participants,
      subject: (subject as string) || "",
      body: (msgBody as string).trim(),
      readByUser: isAdmin ? false : true,
      readByAdmin: isAdmin ? true : false,
      createdAt: new Date().toISOString(),
    };

    const ref = await adminDb.collection("messages").add(messageDoc);

    if (isAdmin) {
      logActivity({ action: "message.sent", userId: user!.uid, targetId: recipientId, details: (subject as string) || "Direct message" });
      // Notify user via email
      try {
        const recipientDoc = await adminDb.collection("users").doc(recipientId).get();
        const recipientData = recipientDoc.data();
        if (recipientData?.email) {
          const email = newMessageEmail(recipientData.displayName || "User", senderName);
          sendEmail({ to: recipientData.email, ...email });
        }
      } catch { /* non-blocking */ }
    } else {
      // User messaging admin - notify admin email
      const adminEmail = process.env.GMAIL_USER;
      if (adminEmail) {
        const email = newMessageEmail("Admin", senderName);
        sendEmail({ to: adminEmail, ...email });
      }
    }

    return NextResponse.json({ success: true, messageId: ref.id });
  } catch (error) {
    console.error("Error sending message:", error);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}

// PATCH /api/messages - Mark messages as read
export async function PATCH(request: NextRequest) {
  try {
    const { user, error } = await requireAuth(request);
    if (error) return error;

    let patchBody: unknown;
    try {
      patchBody = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { messageIds, markAs } = patchBody as Record<string, unknown>;

    if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
      return NextResponse.json({ error: "messageIds must be a non-empty array" }, { status: 400 });
    }

    if (messageIds.some((id: unknown) => typeof id !== "string" || !id.trim())) {
      return NextResponse.json({ error: "Each messageId must be a non-empty string" }, { status: 400 });
    }

    if (markAs !== undefined && typeof markAs !== "boolean") {
      return NextResponse.json({ error: "markAs must be a boolean" }, { status: 400 });
    }

    // Check if user is admin
    let isAdmin = false;
    try {
      const userDoc = await adminDb.collection("users").doc(user!.uid).get();
      isAdmin = userDoc.data()?.role === "admin";
    } catch { /* ok */ }

    const field = isAdmin ? "readByAdmin" : "readByUser";
    const capped = (messageIds as string[]).slice(0, 100);

    // Verify ownership: only allow marking messages the user participates in
    const batch = adminDb.batch();
    let skipped = 0;

    for (const msgId of capped) {
      const msgDoc = await adminDb.collection("messages").doc(msgId).get();
      if (!msgDoc.exists) {
        skipped++;
        continue;
      }
      const msgData = msgDoc.data()!;
      const participants = msgData.participants as string[] | undefined;
      if (!participants || (!participants.includes(user!.uid) && !(isAdmin && participants.includes("admin")))) {
        skipped++;
        continue;
      }
      batch.update(adminDb.collection("messages").doc(msgId), {
        [field]: markAs ?? true,
      });
    }

    await batch.commit();

    return NextResponse.json({ success: true, updated: capped.length - skipped, skipped });
  } catch (error) {
    console.error("Error marking messages:", error);
    return NextResponse.json({ error: "Failed to update messages" }, { status: 500 });
  }
}
