import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-middleware";
import { adminDb, adminAuth } from "@/lib/firebase-admin";

// GET /api/admin/analytics - Enhanced analytics
export async function GET(request: NextRequest) {
  try {
    const { error } = await requireAdmin(request);
    if (error) return error;

    // --- Purchases data ---
    let purchases: FirebaseFirestore.DocumentData[] = [];
    let totalRevenue = 0;
    let totalSales = 0;
    try {
      const purchasesSnap = await adminDb
        .collection("purchases")
        .where("status", "==", "completed")
        .get();
      purchases = purchasesSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      totalRevenue = purchases.reduce((sum, p) => sum + (p.amount || 0), 0);
      totalSales = purchases.length;
    } catch {
      // No purchases collection
    }

    // --- Users count ---
    let totalUsers = 0;
    try {
      const usersSnap = await adminDb.collection("users").count().get();
      totalUsers = usersSnap.data().count;
    } catch {
      // fallback
    }
    if (totalUsers === 0) {
      try {
        const listResult = await adminAuth.listUsers(1000);
        totalUsers = listResult.users.length;
      } catch {
        // keep 0
      }
    }

    // --- Datasets ---
    let totalDatasets = 0;
    let datasets: FirebaseFirestore.DocumentData[] = [];
    try {
      const datasetsSnap = await adminDb.collection("datasets").get();
      totalDatasets = datasetsSnap.size;
      datasets = datasetsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    } catch {
      // Collection may not exist
    }

    // --- Recent sales (last 30) ---
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
        // No purchases
      }
    }

    // --- Top datasets by revenue ---
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

    // --- Monthly revenue (last 12 months) ---
    const now = new Date();
    const monthlyRevenue: Array<{ month: string; revenue: number; sales: number }> = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthlyRevenue.push({ month: key, revenue: 0, sales: 0 });
    }
    for (const p of purchases) {
      const pDate = p.createdAt ? new Date(p.createdAt) : null;
      if (!pDate) continue;
      const key = `${pDate.getFullYear()}-${String(pDate.getMonth() + 1).padStart(2, "0")}`;
      const entry = monthlyRevenue.find((m) => m.month === key);
      if (entry) {
        entry.revenue += p.amount || 0;
        entry.sales++;
      }
    }

    // --- User growth (last 12 months) ---
    const monthlyUsers: Array<{ month: string; count: number }> = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthlyUsers.push({ month: key, count: 0 });
    }
    // Try to get user creation dates from Firestore
    try {
      const usersSnap = await adminDb.collection("users").get();
      for (const doc of usersSnap.docs) {
        const data = doc.data();
        const created = data.createdAt ? new Date(data.createdAt) : null;
        if (!created) continue;
        const key = `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(2, "0")}`;
        const entry = monthlyUsers.find((m) => m.month === key);
        if (entry) entry.count++;
      }
    } catch {
      // Fallback: try Firebase Auth
      try {
        let pageToken: string | undefined;
        do {
          const listResult = await adminAuth.listUsers(1000, pageToken);
          for (const u of listResult.users) {
            const created = u.metadata.creationTime ? new Date(u.metadata.creationTime) : null;
            if (!created) continue;
            const key = `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(2, "0")}`;
            const entry = monthlyUsers.find((m) => m.month === key);
            if (entry) entry.count++;
          }
          pageToken = listResult.pageToken;
        } while (pageToken);
      } catch {
        // keep zeros
      }
    }

    // --- Category breakdown ---
    const categoryBreakdown: Record<string, { count: number; revenue: number; sales: number }> = {};
    for (const ds of datasets) {
      const cat = (ds.category as string) || "Other";
      if (!categoryBreakdown[cat]) {
        categoryBreakdown[cat] = { count: 0, revenue: 0, sales: 0 };
      }
      categoryBreakdown[cat].count++;
    }
    for (const p of purchases) {
      // Try to match dataset to get category
      const ds = datasets.find((d) => d.id === p.datasetId);
      const cat = ds ? ((ds.category as string) || "Other") : "Other";
      if (!categoryBreakdown[cat]) {
        categoryBreakdown[cat] = { count: 0, revenue: 0, sales: 0 };
      }
      categoryBreakdown[cat].revenue += p.amount || 0;
      categoryBreakdown[cat].sales++;
    }
    const categories = Object.entries(categoryBreakdown)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue);

    // --- Payment method breakdown ---
    const paymentMethods: Record<string, { count: number; revenue: number }> = {};
    for (const p of purchases) {
      const method = (p.paymentMethod as string) || "unknown";
      if (!paymentMethods[method]) {
        paymentMethods[method] = { count: 0, revenue: 0 };
      }
      paymentMethods[method].count++;
      paymentMethods[method].revenue += p.amount || 0;
    }

    // --- Country breakdown ---
    const countryBreakdown: Record<string, number> = {};
    for (const ds of datasets) {
      const country = (ds.country as string) || "Unknown";
      countryBreakdown[country] = (countryBreakdown[country] || 0) + 1;
    }
    const countries = Object.entries(countryBreakdown)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    return NextResponse.json({
      totalRevenue,
      totalSales,
      totalUsers,
      totalDatasets,
      recentSales,
      topDatasets,
      monthlyRevenue,
      monthlyUsers,
      categories,
      paymentMethods,
      countries,
    });
  } catch (error) {
    console.error("Analytics error:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
