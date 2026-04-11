import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { adminDb, adminStorage } from "@/lib/firebase-admin";
import { checkDatasetAccess } from "@/lib/access-check";
import Papa from "papaparse";

const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

// GET /api/datasets/[id]/data?page=1&limit=100&search=xxx
// Returns full dataset data as JSON for users with access (purchase or subscription)
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

    // Check access (purchase OR subscription OR admin)
    let isAdmin = false;
    if (user!.email && ADMIN_EMAILS.includes(user!.email.toLowerCase())) {
      isAdmin = true;
    } else {
      const userDoc = await adminDb.collection("users").doc(user!.uid).get();
      if (userDoc.exists && userDoc.data()?.role === "admin") {
        isAdmin = true;
      }
    }

    if (!isAdmin) {
      const access = await checkDatasetAccess(user!.uid, id);
      if (!access.hasAccess) {
        return NextResponse.json(
          { error: "You do not have access to this dataset" },
          { status: 403 }
        );
      }
    }

    // Fetch dataset metadata
    const datasetDoc = await adminDb.collection("datasets").doc(id).get();
    if (!datasetDoc.exists) {
      return NextResponse.json({ error: "Dataset not found" }, { status: 404 });
    }

    const dataset = datasetDoc.data()!;

    // Load full data from Storage
    let allData: Record<string, unknown>[] = [];

    // Resolve storage path - handle different formats:
    // - "uploads/{uid}/{id}/data.csv" (app upload)
    // - "gs://bucket/path/file.csv" (gs:// URL)
    // - "https://storage.googleapis.com/..." or "https://firebasestorage.googleapis.com/..." (HTTP URL)
    // - "datasets/{id}/data.csv" (legacy fallback)
    const rawPath = dataset.fileUrl || dataset.storagePath || "";
    let storagePath = "";

    if (rawPath.startsWith("gs://")) {
      // Strip gs://bucket-name/ prefix
      const withoutGs = rawPath.replace(/^gs:\/\/[^/]+\//, "");
      storagePath = withoutGs;
    } else if (rawPath.startsWith("http")) {
      // Extract path from download URL - the path is encoded after /o/
      const match = rawPath.match(/\/o\/(.+?)(\?|$)/);
      if (match) {
        storagePath = decodeURIComponent(match[1]);
      }
    } else if (rawPath) {
      storagePath = rawPath;
    }

    if (!storagePath) {
      storagePath = `datasets/${id}/data.csv`;
    }

    console.log(`[data] Dataset ${id} - fileUrl: "${rawPath}", resolved storagePath: "${storagePath}"`);

    try {
      const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || undefined;
      const bucket = adminStorage.bucket(bucketName);
      const file = bucket.file(storagePath);
      const [exists] = await file.exists();
      console.log(`[data] File exists at "${storagePath}": ${exists}`);

      if (exists) {
        const [contents] = await file.download();
        const csvText = contents.toString("utf-8");
        const parsed = Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
        });
        allData = parsed.data as Record<string, unknown>[];
        console.log(`[data] Parsed ${allData.length} rows from Storage`);
      }
    } catch (storageError) {
      console.error(`[data] Storage error for "${storagePath}":`, storageError);
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
