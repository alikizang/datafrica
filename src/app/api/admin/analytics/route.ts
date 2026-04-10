import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-middleware";
import { adminDb, adminAuth } from "@/lib/firebase-admin";

// GET /api/admin/analytics - Get sales analytics
export async function GET(request: NextRequest) {
  try {
    const { error } = await requireAdmin(request);
    if (error) return error;

    // Total revenue
    let purchases: FirebaseFirestore.DocumentData[] = [];
    let totalRevenue = 0;
    let totalSales = 0;
    try {
      const purchasesSnap = await adminDb
        .collection("purchases")
        .where("status", "==", "completed")
        .get();

      purchases = purchasesSnap.docs.map((doc) => doc.data());
      totalRevenue = purchases.reduce((sum, p) => sum + (p.amount || 0), 0);
      totalSales = purchases.length;
    } catch {
      // No purchases collection or query error - continue with 0s
    }

    // Users count - try Firestore first, fallback to Firebase Auth
    let totalUsers = 0;
    try {
      const usersSnap = await adminDb.collection("users").count().get();
      totalUsers = usersSnap.data().count;
    } catch {
      // Fallback: count via Firebase Auth (paginated, but accurate)
      try {
        let pageToken: string | undefined;
        do {
          const listResult = await adminAuth.listUsers(1000, pageToken);
          totalUsers += listResult.users.length;
          pageToken = listResult.pageToken;
        } while (pageToken);
      } catch {
        totalUsers = 0;
      }
    }

    // If Firestore count returned 0, try Firebase Auth as verification
    if (totalUsers === 0) {
      try {
        const listResult = await adminAuth.listUsers(1000);
        totalUsers = listResult.users.length;
      } catch {
        // Keep 0
      }
    }

    // Datasets count
    let totalDatasets = 0;
    try {
      const datasetsSnap = await adminDb.collection("datasets").count().get();
      totalDatasets = datasetsSnap.data().count;
    } catch {
      // Collection may not exist yet
    }

    // Recent sales (last 30) - try ordered query, fallback to unordered
    let recentSales: Array<Record<string, unknown>> = [];
    try {
      const recentSalesSnap = await adminDb
        .collection("purchases")
        .where("status", "==", "completed")
        .orderBy("createdAt", "desc")
        .limit(30)
        .get();

      recentSales = recentSalesSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch {
      // Composite index may not exist yet - fallback to unordered
      try {
        const fallbackSnap = await adminDb
          .collection("purchases")
          .where("status", "==", "completed")
          .limit(30)
          .get();

        recentSales = fallbackSnap.docs
          .map((doc) => ({ id: doc.id, ...doc.data() } as Record<string, unknown>))
          .sort((a, b) => {
            const dateA = typeof a.createdAt === "string" ? a.createdAt : "";
            const dateB = typeof b.createdAt === "string" ? b.createdAt : "";
            return dateB.localeCompare(dateA);
          });
      } catch {
        // No purchases at all
      }
    }

    // Sales by category
    const salesByDataset: Record<string, { title: string; count: number; revenue: number }> = {};
    for (const purchase of purchases) {
      const key = purchase.datasetId;
      if (!salesByDataset[key]) {
        salesByDataset[key] = {
          title: purchase.datasetTitle || "Unknown",
          count: 0,
          revenue: 0,
        };
      }
      salesByDataset[key].count++;
      salesByDataset[key].revenue += purchase.amount || 0;
    }

    const topDatasets = Object.entries(salesByDataset)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    return NextResponse.json({
      totalRevenue,
      totalSales,
      totalUsers,
      totalDatasets,
      recentSales,
      topDatasets,
    });
  } catch (error) {
    console.error("Analytics error:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
