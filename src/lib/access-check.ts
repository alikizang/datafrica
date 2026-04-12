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
 * Check whether the user has an active free trial.
 */
export async function hasActiveTrial(userId: string): Promise<boolean> {
  const userDoc = await adminDb.collection("users").doc(userId).get();
  if (!userDoc.exists) return false;
  const data = userDoc.data();
  if (!data?.trialEndDate) return false;
  return new Date(data.trialEndDate) > new Date();
}

/**
 * Check whether a user can access a specific dataset.
 *
 * Priority:
 *   1. One-time purchase (completed) -> permanent full access
 *   2. Active subscription whose plan includes the dataset -> subscription access (plan conditions)
 *   3. Active free trial -> view-only access for standard datasets
 *   4. Neither -> no access (preview only)
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

  // 3. Check free trial (view-only, standard datasets only)
  const trialActive = await hasActiveTrial(userId);
  if (trialActive) {
    const datasetDoc = await adminDb.collection("datasets").doc(datasetId).get();
    const accessTier = datasetDoc.exists ? datasetDoc.data()?.accessTier : "standard";
    if (accessTier !== "premium") {
      const userDoc = await adminDb.collection("users").doc(userId).get();
      const trialEndDate = userDoc.data()?.trialEndDate;
      return {
        hasAccess: true,
        accessType: "trial",
        allowDownload: false,
        endDate: trialEndDate,
      };
    }
  }

  // 4. No access
  return {
    hasAccess: false,
    accessType: "none",
    allowDownload: false,
  };
}
