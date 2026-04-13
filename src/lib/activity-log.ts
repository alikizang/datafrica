import { adminDb } from "@/lib/firebase-admin";

export type ActivityAction =
  | "user.signup"
  | "user.login"
  | "user.role_changed"
  | "user.disabled"
  | "user.enabled"
  | "user.banned"
  | "user.suspended"
  | "user.deleted"
  | "user.alert_sent"
  | "user.password_reset"
  | "dataset.purchased"
  | "dataset.downloaded"
  | "dataset.uploaded"
  | "dataset.updated"
  | "dataset.deleted"
  | "dataset.featured"
  | "dataset.unfeatured"
  | "subscription.created"
  | "subscription.renewed"
  | "admin.action"
  | "maintenance.toggled"
  | "backup.created"
  | "broadcast.sent"
  | "cleanup.run"
  | "payment.completed"
  | "payment.failed"
  | "payment_settings.updated"
  | "membership.created"
  | "membership.updated"
  | "membership.deleted"
  | "message.sent";

interface LogEntry {
  action: ActivityAction;
  userId?: string;
  userEmail?: string;
  targetId?: string;
  targetType?: string;
  details?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Log an activity event to the activityLogs collection.
 * Non-blocking — errors are silently caught.
 */
export async function logActivity(entry: LogEntry): Promise<void> {
  try {
    await adminDb.collection("activityLogs").add({
      ...entry,
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Failed to log activity:", err);
  }
}

/**
 * Get recent activity logs.
 */
export async function getRecentActivity(limit = 50) {
  const snap = await adminDb
    .collection("activityLogs")
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();

  return snap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
}

/**
 * Cleanup old activity logs (older than retentionDays).
 */
export async function cleanupOldLogs(retentionDays = 90): Promise<number> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - retentionDays);

  const oldSnap = await adminDb
    .collection("activityLogs")
    .where("createdAt", "<", cutoff.toISOString())
    .limit(500)
    .get();

  if (oldSnap.empty) return 0;

  const batch = adminDb.batch();
  oldSnap.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();

  return oldSnap.docs.length;
}
