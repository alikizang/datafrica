import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-middleware";
import { adminDb, adminAuth } from "@/lib/firebase-admin";

// GET /api/admin/analytics - Get sales analytics
export async function GET(request: NextRequest) {
  try {
    const { error } = await requireAdmin(request);
    if (error) return error;

    // Total revenue
    const purchasesSnap = await adminDb
      .collection("purchases")
      .where("status", "==", "completed")
      .get();

    const purchases = purchasesSnap.docs.map((doc) => doc.data());
    const totalRevenue = purchases.reduce((sum, p) => sum + (p.amount || 0), 0);
    const totalSales = purchases.length;

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
    const datasetsSnap = await adminDb.collection("datasets").count().get();
    const totalDatasets = datasetsSnap.data().count;

    // Recent sales (last 30)
    const recentSalesSnap = await adminDb
      .collection("purchases")
      .where("status", "==", "completed")
      .orderBy("createdAt", "desc")
      .limit(30)
      .get();

    const recentSales = recentSalesSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

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
