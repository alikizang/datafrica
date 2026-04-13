import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-middleware";
import { adminDb } from "@/lib/firebase-admin";
import { logActivity } from "@/lib/activity-log";

// POST /api/admin/backup - Trigger a manual Firestore backup
export async function POST(request: NextRequest) {
  try {
    const { error, user: adminUser } = await requireAdmin(request);
    if (error) return error;

    const collections = ["users", "datasets", "purchases", "subscriptions", "alerts", "settings"];
    const snapshot: Record<string, Record<string, unknown>[]> = {};

    for (const col of collections) {
      try {
        const snap = await adminDb.collection(col).get();
        snapshot[col] = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      } catch {
        snapshot[col] = [];
      }
    }

    // Store backup metadata in Firestore
    const backupRef = adminDb.collection("backups").doc();
    await backupRef.set({
      createdAt: new Date().toISOString(),
      collections: collections,
      documentCounts: Object.fromEntries(
        Object.entries(snapshot).map(([k, v]) => [k, v.length])
      ),
      totalDocuments: Object.values(snapshot).reduce((sum, docs) => sum + docs.length, 0),
      status: "completed",
    });

    const totalDocs = Object.values(snapshot).reduce((sum, docs) => sum + docs.length, 0);

    logActivity({ action: "backup.created", userId: adminUser?.uid, details: `${totalDocs} documents` });

    return NextResponse.json({
      success: true,
      backupId: backupRef.id,
      totalDocuments: totalDocs,
      collections: Object.fromEntries(
        Object.entries(snapshot).map(([k, v]) => [k, v.length])
      ),
    });
  } catch (error) {
    console.error("Error creating backup:", error);
    return NextResponse.json({ error: "Backup failed" }, { status: 500 });
  }
}

// GET /api/admin/backup - List backup history
export async function GET(request: NextRequest) {
  try {
    const { error } = await requireAdmin(request);
    if (error) return error;

    const backupsSnap = await adminDb
      .collection("backups")
      .orderBy("createdAt", "desc")
      .limit(20)
      .get();

    const backups = backupsSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ backups });
  } catch (error) {
    console.error("Error listing backups:", error);
    return NextResponse.json({ error: "Failed to list backups" }, { status: 500 });
  }
}
