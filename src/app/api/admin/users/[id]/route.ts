import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-middleware";
import { adminDb, adminAuth } from "@/lib/firebase-admin";
import { logActivity } from "@/lib/activity-log";

// POST /api/admin/users/[id] - Perform actions on a specific user
// Actions: send-alert, password-reset
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, user: adminUser } = await requireAdmin(request);
    if (error) return error;

    const { id: userId } = await params;
    const body = await request.json();
    const { action } = body;

    if (!userId || !action) {
      return NextResponse.json(
        { error: "userId and action required" },
        { status: 400 }
      );
    }

    switch (action) {
      case "send-alert": {
        const { title, message, type } = body;
        if (!title || !message) {
          return NextResponse.json(
            { error: "title and message required" },
            { status: 400 }
          );
        }

        const alertRef = adminDb.collection("alerts").doc();
        await alertRef.set({
          userId,
          title,
          message,
          type: type || "info",
          read: false,
          createdAt: new Date().toISOString(),
          createdBy: adminUser?.uid || "admin",
        });

        logActivity({ action: "user.alert_sent", userId: adminUser?.uid, targetId: userId, details: title });

        return NextResponse.json({ success: true, alertId: alertRef.id });
      }

      case "password-reset": {
        const userRecord = await adminAuth.getUser(userId);
        if (!userRecord.email) {
          return NextResponse.json(
            { error: "User has no email address" },
            { status: 400 }
          );
        }

        const resetLink = await adminAuth.generatePasswordResetLink(
          userRecord.email
        );

        logActivity({ action: "user.password_reset", userId: adminUser?.uid, targetId: userId, details: userRecord.email });

        return NextResponse.json({ success: true, resetLink });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Error performing user action:", error);
    return NextResponse.json(
      { error: "Failed to perform action" },
      { status: 500 }
    );
  }
}
