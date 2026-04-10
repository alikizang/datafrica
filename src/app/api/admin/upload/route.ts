import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-middleware";
import { adminDb } from "@/lib/firebase-admin";

// POST /api/admin/upload - Save dataset metadata (file already uploaded to Storage by client)
export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireAdmin(request);
    if (error) return error;

    const body = await request.json();
    const {
      datasetId,
      storagePath,
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

    // Create dataset document in Firestore
    const datasetRef = adminDb.collection("datasets").doc(datasetId);

    await datasetRef.set({
      title,
      titles: titles || {},
      description: description || "",
      descriptions: descriptions || {},
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
      fileSize: fileSize || 0,
      featured: featured || false,
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
