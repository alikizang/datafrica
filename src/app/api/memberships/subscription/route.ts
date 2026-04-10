import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { getUserActiveSubscription } from "@/lib/access-check";
import { adminDb } from "@/lib/firebase-admin";

// GET /api/memberships/subscription - Get current user's active subscription
export async function GET(request: NextRequest) {
  try {
    const { user, error } = await requireAuth(request);
    if (error) return error;

    const subscription = await getUserActiveSubscription(user!.uid);

    if (!subscription) {
      return NextResponse.json({ subscription: null });
    }

    // Enrich with plan details
    const planDoc = await adminDb
      .collection("membershipPlans")
      .doc(subscription.planId)
      .get();

    const plan = planDoc.exists
      ? {
          id: planDoc.id,
          name: planDoc.data()!.name,
          names: planDoc.data()!.names || {},
          conditions: planDoc.data()!.conditions,
          datasetIds: planDoc.data()!.datasetIds || [],
          datasetCount: (planDoc.data()!.datasetIds || []).length,
        }
      : null;

    return NextResponse.json({ subscription, plan });
  } catch (err) {
    console.error("Error fetching user subscription:", err);
    return NextResponse.json(
      { error: "Failed to fetch subscription" },
      { status: 500 }
    );
  }
}
