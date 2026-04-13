import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

// GET /api/maintenance-status — Public endpoint, no auth required
export async function GET() {
  try {
    const doc = await adminDb.doc("settings/maintenance").get();

    if (!doc.exists) {
      return NextResponse.json(
        { enabled: false, message: "", scheduledEnd: "" },
        { headers: { "Cache-Control": "public, s-maxage=10, stale-while-revalidate=30" } }
      );
    }

    const data = doc.data() as {
      enabled?: boolean;
      message?: string;
      scheduledEnd?: string;
    };

    // Auto-expire: if scheduledEnd has passed, treat as disabled
    if (data.enabled && data.scheduledEnd) {
      if (new Date(data.scheduledEnd).getTime() < Date.now()) {
        return NextResponse.json(
          { enabled: false, message: "", scheduledEnd: "" },
          { headers: { "Cache-Control": "public, s-maxage=10, stale-while-revalidate=30" } }
        );
      }
    }

    return NextResponse.json(
      {
        enabled: !!data.enabled,
        message: data.message || "",
        scheduledEnd: data.scheduledEnd || "",
      },
      { headers: { "Cache-Control": "public, s-maxage=10, stale-while-revalidate=30" } }
    );
  } catch (error) {
    console.error("Failed to fetch maintenance status:", error);
    return NextResponse.json({ enabled: false, message: "", scheduledEnd: "" });
  }
}
