import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { adminDb, adminStorage } from "@/lib/firebase-admin";
import { checkDatasetAccess } from "@/lib/access-check";
import { parseStorageFile } from "@/lib/file-parser";
import * as XLSX from "xlsx";
import Papa from "papaparse";

const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

async function isUserAdmin(uid: string, email?: string): Promise<boolean> {
  if (email && ADMIN_EMAILS.includes(email.toLowerCase())) return true;
  const userDoc = await adminDb.collection("users").doc(uid).get();
  return userDoc.exists && userDoc.data()?.role === "admin";
}

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

    // Check access (purchase OR subscription OR admin)
    const adminUser = await isUserAdmin(user!.uid, user!.email ?? undefined);

    if (!adminUser) {
      const access = await checkDatasetAccess(user!.uid, id);
      if (!access.hasAccess) {
        return NextResponse.json(
          { error: "You do not have access to this dataset" },
          { status: 403 }
        );
      }
      if (!access.allowDownload) {
        return NextResponse.json(
          { error: "Download is not available for your access level" },
          { status: 403 }
        );
      }
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

    // Load data from Firebase Storage (supports CSV, JSON, XLSX, TXT)
    let fullData: Record<string, unknown>[] = [];

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
      const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || undefined;
      const bucket = adminStorage.bucket(bucketName);
      fullData = await parseStorageFile(bucket, storagePath, dataset.fileFormat);
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

// HEAD /api/datasets/[id]/download - Check if user has access
export async function HEAD(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { user, error } = await requireAuth(request);
    if (error) return new NextResponse(null, { status: 401 });

    const adminUser = await isUserAdmin(user!.uid, user!.email ?? undefined);
    if (adminUser) return new NextResponse(null, { status: 200 });

    const access = await checkDatasetAccess(user!.uid, id);

    if (!access.hasAccess) {
      return new NextResponse(null, { status: 403 });
    }

    return new NextResponse(null, { status: 200 });
  } catch {
    return new NextResponse(null, { status: 500 });
  }
}
