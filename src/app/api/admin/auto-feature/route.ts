import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-middleware";
import { adminDb } from "@/lib/firebase-admin";

// POST /api/admin/auto-feature - Compute feature scores and mark top N as featured
export async function POST(request: NextRequest) {
  try {
    const { error } = await requireAdmin(request);
    if (error) return error;

    const body = await request.json().catch(() => ({}));
    const topN = Math.min(Math.max(body.topN || 6, 1), 50);

    // Fetch all datasets
    const datasetsSnap = await adminDb.collection("datasets").get();
    if (datasetsSnap.empty) {
      return NextResponse.json({ success: true, featured: 0 });
    }

    // Count purchases per dataset
    const purchasesSnap = await adminDb
      .collection("purchases")
      .where("status", "==", "completed")
      .get();

    const purchaseCounts: Record<string, number> = {};
    purchasesSnap.docs.forEach((doc) => {
      const datasetId = doc.data().datasetId;
      purchaseCounts[datasetId] = (purchaseCounts[datasetId] || 0) + 1;
    });

    // Score each dataset
    const now = Date.now();
    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

    const scored = datasetsSnap.docs.map((doc) => {
      const data = doc.data();
      const purchaseCount = purchaseCounts[doc.id] || 0;
      const rating = data.rating || 0;

      // Recency bonus: max 5 points for datasets created/updated in last 30 days
      const updatedAt = data.updatedAt ? new Date(data.updatedAt).getTime() : 0;
      const age = now - updatedAt;
      const recencyBonus = age < THIRTY_DAYS_MS
        ? 5 * (1 - age / THIRTY_DAYS_MS)
        : 0;

      const score = (purchaseCount * 3) + (rating * 2) + recencyBonus;

      return {
        id: doc.id,
        score: Math.round(score * 100) / 100,
        manualFeatured: data.manualFeatured === true,
      };
    });

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    // Determine which datasets should be featured:
    // - Manual featured always stay featured
    // - Fill remaining slots with top-scored
    const manualIds = new Set(scored.filter((d) => d.manualFeatured).map((d) => d.id));
    const autoFeaturedIds = new Set<string>();

    for (const d of scored) {
      if (autoFeaturedIds.size + manualIds.size >= topN) break;
      if (!manualIds.has(d.id)) {
        autoFeaturedIds.add(d.id);
      }
    }

    const allFeaturedIds = new Set([...manualIds, ...autoFeaturedIds]);

    // Batch update all datasets
    const BATCH_LIMIT = 500;
    let batch = adminDb.batch();
    let batchCount = 0;

    for (const doc of datasetsSnap.docs) {
      const shouldBeFeatured = allFeaturedIds.has(doc.id);
      const scoreData = scored.find((s) => s.id === doc.id);

      batch.update(doc.ref, {
        featured: shouldBeFeatured,
        featuredScore: scoreData?.score || 0,
      });

      batchCount++;
      if (batchCount >= BATCH_LIMIT) {
        await batch.commit();
        batch = adminDb.batch();
        batchCount = 0;
      }
    }

    if (batchCount > 0) await batch.commit();

    return NextResponse.json({
      success: true,
      totalDatasets: datasetsSnap.size,
      featured: allFeaturedIds.size,
      manualFeatured: manualIds.size,
      autoFeatured: autoFeaturedIds.size,
      scores: scored.slice(0, 20),
    });
  } catch (err) {
    console.error("Auto-feature error:", err);
    return NextResponse.json(
      { error: "Failed to compute feature scores" },
      { status: 500 }
    );
  }
}
