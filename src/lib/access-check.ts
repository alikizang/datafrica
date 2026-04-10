import { adminDb } from "@/lib/firebase-admin";
import type { AccessResult, Subscription, MembershipPlan } from "@/types";

/**
 * Get the user's active subscription (if any).
 * Lazily expires subscriptions whose endDate has passed.
 */
export async function getUserActiveSubscription(
  userId: string
): Promise<Subscription | null> {
  const snap = await adminDb
    .collection("subscriptions")
    .where("userId", "==", userId)
    .where("status", "==", "active")
    .limit(1)
    .get();

  if (snap.empty) return null;

  const doc = snap.docs[0];
  const sub = { id: doc.id, ...doc.data() } as Subscription;

  // Lazy expiration: if endDate has passed, mark as expired
  if (new Date(sub.endDate) < new Date()) {
    await doc.ref.update({ status: "expired", updatedAt: new Date().toISOString() });
    return null;
  }

  return sub;
}

/**
 * Check whether a user can access a specific dataset.
 *
 * Priority:
 *   1. One-time purchase (completed) -> permanent full access
 *   2. Active subscription whose plan includes the dataset -> subscription access (plan conditions)
 *   3. Neither -> no access (preview only)
 */
export async function checkDatasetAccess(
  userId: string,
  datasetId: string
): Promise<AccessResult> {
  // 1. Check one-time purchase
  const purchaseSnap = await adminDb
    .collection("purchases")
    .where("userId", "==", userId)
    .where("datasetId", "==", datasetId)
    .where("status", "==", "completed")
    .limit(1)
    .get();

  if (!purchaseSnap.empty) {
    // Purchased datasets: use the dataset's own allowDownload flag
    const datasetDoc = await adminDb.collection("datasets").doc(datasetId).get();
    const allowDownload = datasetDoc.exists
      ? datasetDoc.data()!.allowDownload !== false
      : true;

    return {
      hasAccess: true,
      accessType: "purchase",
      allowDownload,
    };
  }

  // 2. Check active subscription
  const subscription = await getUserActiveSubscription(userId);

  if (subscription) {
    const planDoc = await adminDb
      .collection("membershipPlans")
      .doc(subscription.planId)
      .get();

    if (planDoc.exists) {
      const plan = { id: planDoc.id, ...planDoc.data() } as MembershipPlan;

      if (plan.datasetIds.includes(datasetId)) {
        return {
          hasAccess: true,
          accessType: "subscription",
          allowDownload: plan.conditions.allowDownload,
          planName: plan.name,
          endDate: subscription.endDate,
        };
      }
    }
  }

  // 3. No access
  return {
    hasAccess: false,
    accessType: "none",
    allowDownload: false,
  };
}
