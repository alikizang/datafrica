import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

// GET /api/memberships - List active membership plans (public, no auth required)
export async function GET() {
  try {
    const snap = await adminDb
      .collection("membershipPlans")
      .where("status", "==", "active")
      .orderBy("displayOrder", "asc")
      .get();

    const plans = snap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        names: data.names || {},
        description: data.description,
        descriptions: data.descriptions || {},
        pricing: data.pricing,
        datasetIds: data.datasetIds || [],
        datasetCount: (data.datasetIds || []).length,
        conditions: data.conditions,
        features: data.features || [],
        featuresByLang: data.featuresByLang || {},
        displayOrder: data.displayOrder,
        highlighted: data.highlighted || false,
        subscriberCount: data.subscriberCount || 0,
      };
    });

    return NextResponse.json({ plans });
  } catch (err) {
    console.error("Error fetching public plans:", err);
    return NextResponse.json(
      { error: "Failed to fetch plans" },
      { status: 500 }
    );
  }
}
