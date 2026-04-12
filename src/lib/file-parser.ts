import Papa from "papaparse";
import * as XLSX from "xlsx";
import type { Bucket } from "@google-cloud/storage";

/**
 * Parse a file from Firebase Storage into an array of row objects.
 * Supports CSV, JSON, XLSX, and TXT formats.
 * Falls back to CSV parsing if fileFormat is not specified.
 */
export async function parseStorageFile(
  bucket: Bucket,
  storagePath: string,
  fileFormat?: string
): Promise<Record<string, unknown>[]> {
  const file = bucket.file(storagePath);
  const [exists] = await file.exists();

  if (!exists) return [];

  const [metadata] = await file.getMetadata();
  const fileSize = Number(metadata.size || 0);

  if (fileSize > 100 * 1024 * 1024) {
    console.warn(`[file-parser] File too large (${fileSize} bytes), skipping`);
    return [];
  }

  const [contents] = await file.download();
  const format = fileFormat || detectFormatFromPath(storagePath);

  return parseBuffer(contents, format);
}

/**
 * Parse a Buffer into row objects based on the file format.
 */
export function parseBuffer(
  contents: Buffer,
  format: string
): Record<string, unknown>[] {
  if (format === "json") {
    return parseJsonBuffer(contents);
  }

  if (format === "xlsx") {
    return parseXlsxBuffer(contents);
  }

  // Default: CSV or TXT — use PapaParse
  return parseCsvBuffer(contents);
}

function parseCsvBuffer(contents: Buffer): Record<string, unknown>[] {
  const text = contents.toString("utf-8");
  const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
  return parsed.data as Record<string, unknown>[];
}

function parseJsonBuffer(contents: Buffer): Record<string, unknown>[] {
  const text = contents.toString("utf-8");
  let parsed = JSON.parse(text);

  if (!Array.isArray(parsed)) {
    // Handle wrapper objects like { data: [...] } or { results: [...] }
    const arrayKey = Object.keys(parsed).find((k) => Array.isArray(parsed[k]));
    if (arrayKey) {
      parsed = parsed[arrayKey];
    } else {
      console.warn("[file-parser] JSON is not an array and has no array property");
      return [];
    }
  }

  return parsed as Record<string, unknown>[];
}

function parseXlsxBuffer(contents: Buffer): Record<string, unknown>[] {
  const workbook = XLSX.read(contents, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];
  const sheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
}

function detectFormatFromPath(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase();
  if (ext === "json") return "json";
  if (ext === "xlsx" || ext === "xls") return "xlsx";
  if (ext === "txt") return "txt";
  return "csv";
}
