import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { adminDb } from "@/lib/firebase-admin";

// GET /api/user/purchases - Get current user's purchases
export async function GET(request: NextRequest) {
  try {
    const { user, error } = await requireAuth(request);
    if (error) return error;

    // Simple query without orderBy to avoid needing a composite index
    const purchasesSnap = await adminDb
      .collection("purchases")
      .where("userId", "==", user!.uid)
      .get();

    const purchases = purchasesSnap.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      .sort((a, b) => {
        const dateA = (a as Record<string, unknown>).createdAt as string || "";
        const dateB = (b as Record<string, unknown>).createdAt as string || "";
        return dateB.localeCompare(dateA);
      });

    // Enrich purchases with dataset allowDownload (handles old records without this field)
    const datasetIds = [...new Set(purchases.map((p) => (p as Record<string, unknown>).datasetId as string))];
    const datasetAllowDownload: Record<string, boolean> = {};
    // Firestore getAll supports up to 100 refs per call
    if (datasetIds.length > 0) {
      const refs = datasetIds.map((dId) => adminDb.collection("datasets").doc(dId));
      const datasetDocs = await adminDb.getAll(...refs);
      for (const doc of datasetDocs) {
        if (doc.exists) {
          datasetAllowDownload[doc.id] = doc.data()!.allowDownload !== false;
        }
      }
    }

    const enrichedPurchases = purchases.map((p) => {
      const rec = p as Record<string, unknown>;
      return {
        ...rec,
        allowDownload: datasetAllowDownload[rec.datasetId as string] ?? true,
      };
    });

    return NextResponse.json({ purchases: enrichedPurchases });
  } catch (error) {
    console.error("Error fetching purchases:", error);
    return NextResponse.json(
      { error: "Failed to fetch purchases" },
      { status: 500 }
    );
  }
}
