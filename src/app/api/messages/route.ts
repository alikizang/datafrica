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
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 200);

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

    const body = await request.json();
    const { to, subject, body: msgBody } = body;

    if (!msgBody || !msgBody.trim()) {
      return NextResponse.json({ error: "Message body required" }, { status: 400 });
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

    const recipientId = to || "admin";
    const participants = recipientId === "admin"
      ? [user!.uid, "admin"]
      : [user!.uid, recipientId];

    const messageDoc = {
      senderId: user!.uid,
      senderName,
      senderEmail,
      recipientId,
      participants,
      subject: subject || "",
      body: msgBody.trim(),
      readByUser: isAdmin ? false : true,
      readByAdmin: isAdmin ? true : false,
      createdAt: new Date().toISOString(),
    };

    const ref = await adminDb.collection("messages").add(messageDoc);

    if (isAdmin) {
      logActivity({ action: "message.sent", userId: user!.uid, targetId: recipientId, details: subject || "Direct message" });
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

    const body = await request.json();
    const { messageIds, markAs } = body;

    if (!messageIds || !Array.isArray(messageIds)) {
      return NextResponse.json({ error: "messageIds array required" }, { status: 400 });
    }

    // Check if user is admin
    let isAdmin = false;
    try {
      const userDoc = await adminDb.collection("users").doc(user!.uid).get();
      isAdmin = userDoc.data()?.role === "admin";
    } catch { /* ok */ }

    const batch = adminDb.batch();
    const field = isAdmin ? "readByAdmin" : "readByUser";

    for (const msgId of messageIds.slice(0, 100)) {
      batch.update(adminDb.collection("messages").doc(msgId), {
        [field]: markAs !== false,
      });
    }

    await batch.commit();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error marking messages:", error);
    return NextResponse.json({ error: "Failed to update messages" }, { status: 500 });
  }
}
