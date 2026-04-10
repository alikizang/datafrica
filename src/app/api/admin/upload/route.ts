import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-middleware";
import { adminDb, adminStorage } from "@/lib/firebase-admin";
import Papa from "papaparse";

// POST /api/admin/upload - Upload a new dataset
export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireAdmin(request);
    if (error) return error;

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const descriptionsRaw = formData.get("descriptions") as string;
    const titlesRaw = formData.get("titles") as string;
    const descriptions: Record<string, string> = {};
    const titles: Record<string, string> = {};
    try {
      const parsed = JSON.parse(descriptionsRaw || "{}");
      // Only keep non-empty entries
      for (const [k, v] of Object.entries(parsed)) {
        if (typeof v === "string" && v.trim()) {
          descriptions[k] = v.trim();
        }
      }
    } catch {
      // Ignore parse errors, use empty descriptions
    }
    try {
      const parsedTitles = JSON.parse(titlesRaw || "{}");
      for (const [k, v] of Object.entries(parsedTitles)) {
        if (typeof v === "string" && v.trim()) {
          titles[k] = v.trim();
        }
      }
    } catch {
      // Ignore parse errors
    }
    const category = formData.get("category") as string;
    const country = formData.get("country") as string;
    const price = parseFloat(formData.get("price") as string);
    const currency = (formData.get("currency") as string) || "XOF";
    const previewRows = parseInt(formData.get("previewRows") as string) || 10;
    const featured = formData.get("featured") === "true";
    const allowDownload = formData.get("allowDownload") !== "false";

    if (!file || !title || !category || !country || isNaN(price)) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Parse CSV file
    const csvText = await file.text();
    const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });

    if (parsed.errors.length > 0) {
      return NextResponse.json(
        { error: "CSV parsing errors", details: parsed.errors },
        { status: 400 }
      );
    }

    const allData = parsed.data as Record<string, string>[];
    const columns = parsed.meta.fields || [];
    const previewData = allData.slice(0, previewRows);

    // Create dataset document in Firestore (metadata + preview only)
    const datasetRef = adminDb.collection("datasets").doc();

    // Store the full CSV in Firebase Storage (much cheaper than Firestore subcollections)
    const bucket = adminStorage.bucket();
    const storagePath = `datasets/${datasetRef.id}/data.csv`;
    const storageFile = bucket.file(storagePath);
    await storageFile.save(Buffer.from(csvText, "utf-8"), {
      contentType: "text/csv",
      metadata: {
        cacheControl: "private, max-age=31536000",
        metadata: {
          uploadedBy: user!.uid,
          datasetTitle: title,
        },
      },
    });

    await datasetRef.set({
      title,
      titles,
      description: description || "",
      descriptions,
      category,
      country,
      price,
      currency,
      recordCount: allData.length,
      columns,
      previewData,
      previewRows,
      allowDownload,
      fileUrl: storagePath,
      featured,
      rating: 0,
      ratingCount: 0,
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      datasetId: datasetRef.id,
      recordCount: allData.length,
      columns,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload dataset" },
      { status: 500 }
    );
  }
}
