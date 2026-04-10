import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { adminDb, adminStorage } from "@/lib/firebase-admin";
import * as XLSX from "xlsx";
import Papa from "papaparse";

// GET /api/datasets/[id]/download?format=csv|excel|json&token=xxx
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") || "csv";
    const downloadToken = searchParams.get("token");

    // Verify auth
    const { user, error } = await requireAuth(request);
    if (error) return error;

    // Verify purchase exists
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

    // Verify download token if provided
    if (downloadToken) {
      const tokenSnap = await adminDb
        .collection("downloadTokens")
        .where("token", "==", downloadToken)
        .where("datasetId", "==", id)
        .where("userId", "==", user!.uid)
        .where("used", "==", false)
        .limit(1)
        .get();

      if (tokenSnap.empty) {
        return NextResponse.json(
          { error: "Invalid or expired download token" },
          { status: 403 }
        );
      }

      const tokenDoc = tokenSnap.docs[0];
      const tokenData = tokenDoc.data();

      if (new Date(tokenData.expiresAt) < new Date()) {
        return NextResponse.json(
          { error: "Download token expired" },
          { status: 403 }
        );
      }

      // Mark token as used
      await tokenDoc.ref.update({ used: true });
    }

    // Fetch dataset metadata
    const datasetDoc = await adminDb.collection("datasets").doc(id).get();
    if (!datasetDoc.exists) {
      return NextResponse.json({ error: "Dataset not found" }, { status: 404 });
    }

    const dataset = datasetDoc.data()!;

    // Try to read from Firebase Storage first (new approach - cheap)
    let fullData: Record<string, unknown>[] = [];

    // Resolve storage path - handle different formats:
    // - "uploads/{uid}/{id}/data.csv" (app upload)
    // - "gs://bucket/path/file.csv" (gs:// URL)
    // - "https://storage.googleapis.com/..." or "https://firebasestorage.googleapis.com/..." (HTTP URL)
    // - "datasets/{id}/data.csv" (legacy fallback)
    const rawPath = dataset.fileUrl || dataset.storagePath || "";
    let storagePath = "";

    if (rawPath.startsWith("gs://")) {
      storagePath = rawPath.replace(/^gs:\/\/[^/]+\//, "");
    } else if (rawPath.startsWith("http")) {
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
        fullData = parsed.data as Record<string, unknown>[];
      }
    } catch (storageErr) {
      console.warn("Storage read failed, falling back to Firestore:", storageErr);
    }

    // Fallback: read from Firestore subcollection (legacy datasets)
    if (fullData.length === 0) {
      const dataSnap = await adminDb
        .collection("datasets")
        .doc(id)
        .collection("fullData")
        .orderBy("rowIndex")
        .get();

      if (!dataSnap.empty) {
        fullData = dataSnap.docs.map((doc) => {
          const d = doc.data();
          delete d.rowIndex;
          return d;
        });
      } else {
        // Last fallback: preview data
        fullData = dataset.previewData || [];
      }
    }

    // Record download
    await adminDb.collection("downloads").add({
      userId: user!.uid,
      datasetId: id,
      format,
      createdAt: new Date().toISOString(),
    });

    // Generate file based on format
    if (format === "json") {
      return new NextResponse(JSON.stringify(fullData, null, 2), {
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="${dataset.title}.json"`,
        },
      });
    }

    if (format === "excel") {
      const worksheet = XLSX.utils.json_to_sheet(fullData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
      const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

      return new NextResponse(buffer, {
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${dataset.title}.xlsx"`,
        },
      });
    }

    // Default: CSV
    const csv = Papa.unparse(fullData);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${dataset.title}.csv"`,
      },
    });
  } catch (error) {
    console.error("Download error:", error);
    return NextResponse.json(
      { error: "Failed to generate download" },
      { status: 500 }
    );
  }
}

// HEAD /api/datasets/[id]/download - Check if user has purchased
export async function HEAD(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { user, error } = await requireAuth(request);
    if (error) return new NextResponse(null, { status: 401 });

    const purchasesSnap = await adminDb
      .collection("purchases")
      .where("userId", "==", user!.uid)
      .where("datasetId", "==", id)
      .where("status", "==", "completed")
      .limit(1)
      .get();

    if (purchasesSnap.empty) {
      return new NextResponse(null, { status: 403 });
    }

    return new NextResponse(null, { status: 200 });
  } catch {
    return new NextResponse(null, { status: 500 });
  }
}
