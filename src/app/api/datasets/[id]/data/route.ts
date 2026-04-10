import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { adminDb, adminStorage } from "@/lib/firebase-admin";
import Papa from "papaparse";

// GET /api/datasets/[id]/data?page=1&limit=100&search=xxx
// Returns full dataset data as JSON for purchased users
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(500, Math.max(1, parseInt(searchParams.get("limit") || "100", 10)));
    const search = (searchParams.get("search") || "").trim().toLowerCase();

    const { user, error } = await requireAuth(request);
    if (error) return error;

    // Verify purchase
    const purchasesSnap = await adminDb
      .collection("purchases")
      .where("userId", "==", user!.uid)
      .where("datasetId", "==", id)
      .where("status", "==", "completed")
      .limit(1)
      .get();

    if (purchasesSnap.empty) {
      return NextResponse.json(
        { error: "You have not purchased this dataset" },
        { status: 403 }
      );
    }

    // Fetch dataset metadata
    const datasetDoc = await adminDb.collection("datasets").doc(id).get();
    if (!datasetDoc.exists) {
      return NextResponse.json({ error: "Dataset not found" }, { status: 404 });
    }

    const dataset = datasetDoc.data()!;

    // Load full data from Storage
    let allData: Record<string, unknown>[] = [];
    const storagePath = dataset.fileUrl || `datasets/${id}/data.csv`;

    try {
      const bucket = adminStorage.bucket();
      const file = bucket.file(storagePath);
      const [exists] = await file.exists();

      if (exists) {
        const [contents] = await file.download();
        const csvText = contents.toString("utf-8");
        const parsed = Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
        });
        allData = parsed.data as Record<string, unknown>[];
      }
    } catch {
      // Fall through to Firestore
    }

    // Fallback: Firestore subcollection
    if (allData.length === 0) {
      const dataSnap = await adminDb
        .collection("datasets")
        .doc(id)
        .collection("fullData")
        .orderBy("rowIndex")
        .get();

      if (!dataSnap.empty) {
        allData = dataSnap.docs.map((doc) => {
          const d = doc.data();
          delete d.rowIndex;
          return d;
        });
      } else {
        allData = dataset.previewData || [];
      }
    }

    // Apply search filter
    let filteredData = allData;
    if (search) {
      filteredData = allData.filter((row) =>
        Object.values(row).some((val) =>
          String(val ?? "").toLowerCase().includes(search)
        )
      );
    }

    const totalRecords = filteredData.length;
    const totalPages = Math.ceil(totalRecords / limit);
    const offset = (page - 1) * limit;
    const pageData = filteredData.slice(offset, offset + limit);

    return NextResponse.json({
      data: pageData,
      columns: dataset.columns || (allData.length > 0 ? Object.keys(allData[0]) : []),
      pagination: {
        page,
        limit,
        totalRecords,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error("Dataset data error:", error);
    return NextResponse.json(
      { error: "Failed to load dataset" },
      { status: 500 }
    );
  }
}
