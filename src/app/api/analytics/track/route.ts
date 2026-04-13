import { NextRequest, NextResponse } from "next/server";
import { verifyAuth, requireAdmin } from "@/lib/auth-middleware";
import { adminDb } from "@/lib/firebase-admin";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";

// POST /api/analytics/track - Record a page view / heartbeat
export async function POST(request: NextRequest) {
  try {
    // Rate limit: 60 requests per minute per IP
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const rl = checkRateLimit(`analytics:${ip}`, { maxRequests: 60, windowSeconds: 60 });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429, headers: rateLimitHeaders(rl) }
      );
    }

    const body = await request.json();
    const { page, sessionId, event } = body;

    if (!sessionId) {
      return NextResponse.json({ error: "sessionId required" }, { status: 400 });
    }

    const user = await verifyAuth(request);
    const now = new Date();

    if (event === "heartbeat") {
      // Update presence (active session)
      await adminDb.collection("active_sessions").doc(sessionId).set({
        userId: user?.uid || null,
        userEmail: user?.email || null,
        page: page || "/",
        lastSeen: now.toISOString(),
        startedAt: now.toISOString(),
      }, { merge: true });

      // Only update lastSeen on heartbeat, don't overwrite startedAt
      await adminDb.collection("active_sessions").doc(sessionId).update({
        lastSeen: now.toISOString(),
        page: page || "/",
      });

      return NextResponse.json({ ok: true });
    }

    // Record page view
    const dateKey = now.toISOString().split("T")[0]; // YYYY-MM-DD

    // Increment daily counter (using a date-keyed doc)
    const dailyRef = adminDb.collection("page_views").doc(dateKey);
    const dailyDoc = await dailyRef.get();

    if (dailyDoc.exists) {
      const data = dailyDoc.data()!;
      await dailyRef.update({
        views: (data.views || 0) + 1,
        uniqueSessions: Array.from(new Set([...(data.uniqueSessions || []), sessionId])),
        lastUpdated: now.toISOString(),
      });
    } else {
      await dailyRef.set({
        date: dateKey,
        views: 1,
        uniqueSessions: [sessionId],
        lastUpdated: now.toISOString(),
      });
    }

    // Update active session
    await adminDb.collection("active_sessions").doc(sessionId).set({
      userId: user?.uid || null,
      userEmail: user?.email || null,
      page: page || "/",
      lastSeen: now.toISOString(),
      startedAt: now.toISOString(),
    }, { merge: true });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Track error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

// GET /api/analytics/track - Get visitor analytics (admin only)
export async function GET(request: NextRequest) {
  try {
    const { error } = await requireAdmin(request);
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const days = Math.min(parseInt(searchParams.get("days") || "30", 10), 365);

    // 1. Active sessions (seen in last 5 minutes)
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const activeSnap = await adminDb
      .collection("active_sessions")
      .where("lastSeen", ">=", fiveMinAgo)
      .get();

    const activeSessions = activeSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // 2. Daily page views for the last N days
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startKey = startDate.toISOString().split("T")[0];

    const viewsSnap = await adminDb
      .collection("page_views")
      .where("date", ">=", startKey)
      .orderBy("date", "asc")
      .get();

    const dailyViews = viewsSnap.docs.map((doc) => {
      const data = doc.data();
      return {
        date: data.date,
        views: data.views || 0,
        uniqueVisitors: (data.uniqueSessions || []).length,
      };
    });

    // 3. Totals
    const totalViews = dailyViews.reduce((sum, d) => sum + d.views, 0);
    const totalUnique = dailyViews.reduce((sum, d) => sum + d.uniqueVisitors, 0);

    // Clean up old sessions (older than 1 hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const staleSnap = await adminDb
      .collection("active_sessions")
      .where("lastSeen", "<", oneHourAgo)
      .limit(100)
      .get();

    if (!staleSnap.empty) {
      const batch = adminDb.batch();
      staleSnap.docs.forEach((doc) => batch.delete(doc.ref));
      batch.commit().catch(() => {});
    }

    return NextResponse.json({
      realtime: {
        activeNow: activeSessions.length,
        sessions: activeSessions,
      },
      period: {
        days,
        totalViews,
        totalUnique,
        daily: dailyViews,
      },
    });
  } catch (error) {
    console.error("Analytics error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
