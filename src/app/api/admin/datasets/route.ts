import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-middleware";
import { adminDb, adminStorage } from "@/lib/firebase-admin";
import { logActivity } from "@/lib/activity-log";

// GET /api/admin/datasets - List all datasets
export async function GET(request: NextRequest) {
  try {
    const { error } = await requireAdmin(request);
    if (error) return error;

    const datasetsSnap = await adminDb
      .collection("datasets")
      .orderBy("createdAt", "desc")
      .get();

    const datasets = datasetsSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Get purchase counts per dataset
    const purchaseCounts: Record<string, number> = {};
    const revenueByDataset: Record<string, number> = {};
    try {
      const purchasesSnap = await adminDb
        .collection("purchases")
        .where("status", "==", "completed")
        .get();
      for (const pDoc of purchasesSnap.docs) {
        const data = pDoc.data();
        const dsId = data.datasetId;
        if (dsId) {
          purchaseCounts[dsId] = (purchaseCounts[dsId] || 0) + 1;
          revenueByDataset[dsId] = (revenueByDataset[dsId] || 0) + (data.amount || 0);
        }
      }
    } catch {
      // No purchases
    }

    const enriched = datasets.map((ds) => ({
      ...ds,
      salesCount: purchaseCounts[ds.id] || 0,
      revenue: revenueByDataset[ds.id] || 0,
    }));

    return NextResponse.json({ datasets: enriched, total: enriched.length });
  } catch (error) {
    console.error("Error fetching datasets:", error);
    return NextResponse.json(
      { error: "Failed to fetch datasets" },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/datasets - Update dataset metadata
export async function PATCH(request: NextRequest) {
  try {
    const { error, user: adminUser } = await requireAdmin(request);
    if (error) return error;

    const body = await request.json();
    const { datasetId, ...updates } = body;

    if (!datasetId) {
      return NextResponse.json({ error: "datasetId required" }, { status: 400 });
    }

    // Only allow safe fields to be updated
    const allowed: Record<string, unknown> = {};
    const safeFields = [
      "title", "description", "descriptions", "category", "country",
      "price", "currency", "featured", "allowDownload", "manualFeatured",
      "accessTier",
    ];
    for (const key of safeFields) {
      if (updates[key] !== undefined) {
        allowed[key] = updates[key];
      }
    }

    if (Object.keys(allowed).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    allowed.updatedAt = new Date().toISOString();

    await adminDb.collection("datasets").doc(datasetId).update(allowed);

    const action = allowed.featured !== undefined
      ? (allowed.featured ? "dataset.featured" as const : "dataset.unfeatured" as const)
      : "dataset.updated" as const;
    logActivity({ action, userId: adminUser?.uid, targetId: datasetId, details: Object.keys(allowed).join(", ") });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating dataset:", error);
    return NextResponse.json(
      { error: "Failed to update dataset" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/datasets - Delete a dataset
export async function DELETE(request: NextRequest) {
  try {
    const { error, user: adminUser } = await requireAdmin(request);
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const datasetId = searchParams.get("id");

    if (!datasetId) {
      return NextResponse.json({ error: "id parameter required" }, { status: 400 });
    }

    // Get dataset to find file URL
    const docRef = adminDb.collection("datasets").doc(datasetId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json({ error: "Dataset not found" }, { status: 404 });
    }

    const data = docSnap.data();

    // Delete Storage file if exists
    if (data?.fileUrl) {
      try {
        const bucket = adminStorage.bucket();
        // Extract path from fileUrl (gs://bucket/path or https://storage...)
        let filePath = data.fileUrl;
        if (filePath.includes("/datasets/")) {
          filePath = filePath.substring(filePath.indexOf("datasets/"));
        }
        await bucket.file(filePath).delete();
      } catch {
        // File may already be deleted
      }
    }

    // Delete the Firestore document
    await docRef.delete();

    logActivity({ action: "dataset.deleted", userId: adminUser?.uid, targetId: datasetId!, details: (data?.title as string) || datasetId! });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting dataset:", error);
    return NextResponse.json(
      { error: "Failed to delete dataset" },
      { status: 500 }
    );
  }
}
