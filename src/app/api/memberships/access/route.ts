import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { checkDatasetAccess } from "@/lib/access-check";

// GET /api/memberships/access?datasetId=xxx - Check if user has access to a dataset
export async function GET(request: NextRequest) {
  try {
    const { user, error } = await requireAuth(request);
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const datasetId = searchParams.get("datasetId");

    if (!datasetId) {
      return NextResponse.json(
        { error: "datasetId is required" },
        { status: 400 }
      );
    }

    const result = await checkDatasetAccess(user!.uid, datasetId);

    return NextResponse.json(result);
  } catch (err) {
    console.error("Error checking dataset access:", err);
    return NextResponse.json(
      { error: "Failed to check access" },
      { status: 500 }
    );
  }
}
