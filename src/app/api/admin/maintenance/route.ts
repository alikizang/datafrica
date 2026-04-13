import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-middleware";
import { adminDb } from "@/lib/firebase-admin";
import { logActivity } from "@/lib/activity-log";

const SETTINGS_DOC = "settings/maintenance";

// GET /api/admin/maintenance - Get maintenance state
export async function GET(request: NextRequest) {
  try {
    const { error } = await requireAdmin(request);
    if (error) return error;

    const doc = await adminDb.doc(SETTINGS_DOC).get();
    const data = doc.exists ? doc.data() : { enabled: false, message: "", scheduledEnd: "" };

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching maintenance state:", error);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

// POST /api/admin/maintenance - Toggle maintenance mode
export async function POST(request: NextRequest) {
  try {
    const { error, user: adminUser } = await requireAdmin(request);
    if (error) return error;

    const body = await request.json();
    const { enabled, message, scheduledEnd } = body;

    await adminDb.doc(SETTINGS_DOC).set(
      {
        enabled: !!enabled,
        message: message || "We are currently performing scheduled maintenance. Please check back soon.",
        scheduledEnd: scheduledEnd || "",
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    logActivity({ action: "maintenance.toggled", userId: adminUser?.uid, details: enabled ? "Enabled" : "Disabled" });

    return NextResponse.json({ success: true, enabled: !!enabled });
  } catch (error) {
    console.error("Error updating maintenance state:", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}
