import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-middleware";
import { adminDb } from "@/lib/firebase-admin";
import { autoTranslateDatasetMetadata } from "@/lib/translate";

// POST /api/admin/upload - Save dataset metadata (file already uploaded to Storage by client)
export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireAdmin(request);
    if (error) return error;

    const body = await request.json();
    const {
      datasetId,
      storagePath,
      fileFormat,
      title,
      titles,
      description,
      descriptions,
      category,
      country,
      price,
      currency,
      previewRows,
      featured,
      allowDownload,
      accessTier,
      columns,
      previewData,
      recordCount,
      fileSize,
    } = body;

    if (!datasetId || !storagePath || !title || !category || !country || isNaN(price)) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // File size validation (max 50MB)
    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
    if (fileSize && fileSize > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File size exceeds maximum allowed (50MB)" },
        { status: 400 }
      );
    }

    // Auto-translate missing languages (non-blocking, best-effort)
    let finalTitles = titles || {};
    let finalDescs = descriptions || {};
    try {
      const translated = await autoTranslateDatasetMetadata(
        finalTitles,
        finalDescs
      );
      finalTitles = translated.titles;
      finalDescs = translated.descriptions;
    } catch (err) {
      console.error("Auto-translate failed (non-blocking):", err);
    }

    // Create dataset document in Firestore
    const datasetRef = adminDb.collection("datasets").doc(datasetId);

    await datasetRef.set({
      title,
      titles: finalTitles,
      description: description || "",
      descriptions: finalDescs,
      category,
      country,
      price,
      currency: currency || "XOF",
      recordCount: recordCount || 0,
      columns: columns || [],
      previewData: previewData || [],
      previewRows: previewRows || 10,
      allowDownload: allowDownload !== false,
      fileUrl: storagePath,
      fileFormat: fileFormat || "csv",
      fileSize: fileSize || 0,
      featured: featured || false,
      manualFeatured: featured || false,
      accessTier: accessTier || "standard",
      rating: 0,
      ratingCount: 0,
      uploadedBy: user!.uid,
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      datasetId,
      recordCount: recordCount || 0,
      columns: columns || [],
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to save dataset" },
      { status: 500 }
    );
  }
}
