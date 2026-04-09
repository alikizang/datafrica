import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-middleware";
import { adminDb } from "@/lib/firebase-admin";
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

    // Create dataset document
    const datasetRef = adminDb.collection("datasets").doc();
    await datasetRef.set({
      title,
      description: description || "",
      category,
      country,
      price,
      currency,
      recordCount: allData.length,
      columns,
      previewData,
      previewRows,
      allowDownload,
      fileUrl: "",
      featured,
      rating: 0,
      ratingCount: 0,
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    });

    // Store full data in a subcollection (batched writes)
    const batchSize = 500;
    for (let i = 0; i < allData.length; i += batchSize) {
      const batch = adminDb.batch();
      const chunk = allData.slice(i, i + batchSize);

      chunk.forEach((row, index) => {
        const docRef = datasetRef.collection("fullData").doc();
        batch.set(docRef, { ...row, rowIndex: i + index });
      });

      await batch.commit();
    }

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
