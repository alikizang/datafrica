import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-middleware";
import { adminDb } from "@/lib/firebase-admin";

// GET /api/admin/memberships - List all membership plans
export async function GET(request: NextRequest) {
  try {
    const { error } = await requireAdmin(request);
    if (error) return error;

    const snap = await adminDb
      .collection("membershipPlans")
      .orderBy("displayOrder", "asc")
      .get();

    const plans = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    return NextResponse.json({ plans, total: plans.length });
  } catch (err) {
    console.error("Error fetching membership plans:", err);
    return NextResponse.json(
      { error: "Failed to fetch membership plans" },
      { status: 500 }
    );
  }
}

// POST /api/admin/memberships - Create a new membership plan
export async function POST(request: NextRequest) {
  try {
    const { error } = await requireAdmin(request);
    if (error) return error;

    const body = await request.json();

    const {
      name,
      names,
      description,
      descriptions,
      pricing,
      datasetIds,
      conditions,
      features,
      featuresByLang,
      displayOrder,
      highlighted,
    } = body;

    if (!name || !pricing?.monthly?.price || !pricing?.yearly?.price) {
      return NextResponse.json(
        { error: "name, pricing.monthly.price, and pricing.yearly.price are required" },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    const planData = {
      name,
      names: names || {},
      description: description || "",
      descriptions: descriptions || {},
      pricing: {
        monthly: {
          price: Number(pricing.monthly.price),
          currency: pricing.monthly.currency || "XOF",
        },
        yearly: {
          price: Number(pricing.yearly.price),
          currency: pricing.yearly.currency || "XOF",
        },
      },
      datasetIds: datasetIds || [],
      conditions: {
        allowDownload: conditions?.allowDownload ?? true,
        maxDownloadsPerMonth: conditions?.maxDownloadsPerMonth ?? null,
      },
      features: features || [],
      featuresByLang: featuresByLang || {},
      displayOrder: displayOrder ?? 0,
      highlighted: highlighted ?? false,
      status: "active",
      subscriberCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await adminDb.collection("membershipPlans").add(planData);

    return NextResponse.json({ id: docRef.id, ...planData }, { status: 201 });
  } catch (err) {
    console.error("Error creating membership plan:", err);
    return NextResponse.json(
      { error: "Failed to create membership plan" },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/memberships - Update an existing plan
export async function PATCH(request: NextRequest) {
  try {
    const { error } = await requireAdmin(request);
    if (error) return error;

    const body = await request.json();
    const { planId, ...updates } = body;

    if (!planId) {
      return NextResponse.json({ error: "planId required" }, { status: 400 });
    }

    const docRef = adminDb.collection("membershipPlans").doc(planId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    const allowed: Record<string, unknown> = {};
    const safeFields = [
      "name",
      "names",
      "description",
      "descriptions",
      "pricing",
      "datasetIds",
      "conditions",
      "features",
      "featuresByLang",
      "displayOrder",
      "highlighted",
      "status",
    ];

    for (const key of safeFields) {
      if (updates[key] !== undefined) {
        allowed[key] = updates[key];
      }
    }

    if (Object.keys(allowed).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    allowed.updatedAt = new Date().toISOString();

    await docRef.update(allowed);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Error updating membership plan:", err);
    return NextResponse.json(
      { error: "Failed to update membership plan" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/memberships?id=xxx - Archive a plan (soft delete)
export async function DELETE(request: NextRequest) {
  try {
    const { error } = await requireAdmin(request);
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const planId = searchParams.get("id");

    if (!planId) {
      return NextResponse.json({ error: "id parameter required" }, { status: 400 });
    }

    const docRef = adminDb.collection("membershipPlans").doc(planId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    // Check if there are active subscribers
    const activeSubs = await adminDb
      .collection("subscriptions")
      .where("planId", "==", planId)
      .where("status", "==", "active")
      .limit(1)
      .get();

    if (!activeSubs.empty) {
      // Soft-delete: archive the plan instead of deleting
      await docRef.update({
        status: "archived",
        updatedAt: new Date().toISOString(),
      });
      return NextResponse.json({
        success: true,
        archived: true,
        message: "Plan archived because it has active subscribers",
      });
    }

    // No active subscribers: hard delete
    await docRef.delete();

    return NextResponse.json({ success: true, deleted: true });
  } catch (err) {
    console.error("Error deleting membership plan:", err);
    return NextResponse.json(
      { error: "Failed to delete membership plan" },
      { status: 500 }
    );
  }
}
