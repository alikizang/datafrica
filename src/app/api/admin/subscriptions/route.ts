import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-middleware";
import { adminDb } from "@/lib/firebase-admin";

// GET /api/admin/subscriptions - List all subscriptions (with optional filters)
export async function GET(request: NextRequest) {
  try {
    const { error } = await requireAdmin(request);
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status"); // active | expired | cancelled
    const planId = searchParams.get("planId");

    let query: FirebaseFirestore.Query = adminDb
      .collection("subscriptions")
      .orderBy("createdAt", "desc");

    if (status) {
      query = query.where("status", "==", status);
    }
    if (planId) {
      query = query.where("planId", "==", planId);
    }

    const snap = await query.limit(500).get();

    const subscriptions = snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Enrich with user display names
    const userIds = [...new Set(subscriptions.map((s) => (s as Record<string, unknown>).userId as string))];
    const userNames: Record<string, string> = {};

    if (userIds.length > 0) {
      const refs = userIds.map((uid) => adminDb.collection("users").doc(uid));
      const userDocs = await adminDb.getAll(...refs);
      for (const doc of userDocs) {
        if (doc.exists) {
          const data = doc.data()!;
          userNames[doc.id] = data.displayName || data.email || doc.id;
        }
      }
    }

    const enriched = subscriptions.map((sub) => ({
      ...sub,
      userName: userNames[(sub as Record<string, unknown>).userId as string] || "Unknown",
    }));

    return NextResponse.json({ subscriptions: enriched, total: enriched.length });
  } catch (err) {
    console.error("Error fetching subscriptions:", err);
    return NextResponse.json(
      { error: "Failed to fetch subscriptions" },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/subscriptions - Admin update a subscription (cancel, extend, etc.)
export async function PATCH(request: NextRequest) {
  try {
    const { error } = await requireAdmin(request);
    if (error) return error;

    const body = await request.json();
    const { subscriptionId, action, ...extra } = body;

    if (!subscriptionId || !action) {
      return NextResponse.json(
        { error: "subscriptionId and action are required" },
        { status: 400 }
      );
    }

    const docRef = adminDb.collection("subscriptions").doc(subscriptionId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json(
        { error: "Subscription not found" },
        { status: 404 }
      );
    }

    const sub = docSnap.data()!;
    const now = new Date().toISOString();

    switch (action) {
      case "cancel": {
        await docRef.update({
          status: "cancelled",
          cancelledAt: now,
          updatedAt: now,
        });

        // Decrement subscriber count on the plan
        const planRef = adminDb.collection("membershipPlans").doc(sub.planId);
        const planSnap = await planRef.get();
        if (planSnap.exists) {
          const count = planSnap.data()!.subscriberCount || 0;
          await planRef.update({
            subscriberCount: Math.max(0, count - 1),
            updatedAt: now,
          });
        }

        return NextResponse.json({ success: true, action: "cancelled" });
      }

      case "extend": {
        const days = Number(extra.days);
        if (!days || days < 1) {
          return NextResponse.json(
            { error: "days must be a positive number" },
            { status: 400 }
          );
        }

        const currentEnd = new Date(sub.endDate);
        const base = currentEnd > new Date() ? currentEnd : new Date();
        base.setDate(base.getDate() + days);

        await docRef.update({
          endDate: base.toISOString(),
          status: "active",
          updatedAt: now,
        });

        return NextResponse.json({
          success: true,
          action: "extended",
          newEndDate: base.toISOString(),
        });
      }

      case "expire": {
        await docRef.update({
          status: "expired",
          updatedAt: now,
        });

        return NextResponse.json({ success: true, action: "expired" });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (err) {
    console.error("Error updating subscription:", err);
    return NextResponse.json(
      { error: "Failed to update subscription" },
      { status: 500 }
    );
  }
}
