import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { adminDb, adminStorage } from "@/lib/firebase-admin";
import { checkDatasetAccess } from "@/lib/access-check";
import { parseStorageFile } from "@/lib/file-parser";

const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

// --- Types ---

interface FilterCondition {
  column: string;
  operator: string;
  value?: string;
}

interface QueryObject {
  filters: FilterCondition[];
  logic: "and" | "or";
  sort: { column: string; direction: "asc" | "desc" } | null;
  search: string;
}

type ColumnTypes = Record<string, "string" | "number">;

const VALID_OPERATORS = new Set([
  "eq",
  "neq",
  "contains",
  "not_contains",
  "starts_with",
  "ends_with",
  "gt",
  "gte",
  "lt",
  "lte",
  "empty",
  "not_empty",
]);

// --- Helpers ---

function parseQuery(searchParams: URLSearchParams): QueryObject {
  const qParam = searchParams.get("q");
  if (qParam) {
    try {
      const decoded = JSON.parse(
        Buffer.from(qParam, "base64").toString("utf-8")
      );
      const filters: FilterCondition[] = [];
      if (Array.isArray(decoded.filters)) {
        for (const f of decoded.filters.slice(0, 20)) {
          if (
            typeof f.column === "string" &&
            f.column &&
            typeof f.operator === "string" &&
            VALID_OPERATORS.has(f.operator)
          ) {
            filters.push({
              column: f.column,
              operator: f.operator,
              value: typeof f.value === "string" ? f.value : "",
            });
          }
        }
      }
      return {
        filters,
        logic: decoded.logic === "or" ? "or" : "and",
        sort:
          decoded.sort &&
          typeof decoded.sort.column === "string" &&
          decoded.sort.column &&
          (decoded.sort.direction === "asc" || decoded.sort.direction === "desc")
            ? { column: decoded.sort.column, direction: decoded.sort.direction }
            : null,
        search:
          typeof decoded.search === "string"
            ? decoded.search.trim().toLowerCase()
            : "",
      };
    } catch {
      // Fall through to legacy
    }
  }
  // Legacy: plain search param
  return {
    filters: [],
    logic: "and",
    sort: null,
    search: (searchParams.get("search") || "").trim().toLowerCase(),
  };
}

function detectColumnTypes(
  data: Record<string, unknown>[],
  columns: string[]
): ColumnTypes {
  const types: ColumnTypes = {};
  const sampleSize = Math.min(data.length, 100);
  for (const col of columns) {
    let numericCount = 0;
    let nonEmptyCount = 0;
    for (let i = 0; i < sampleSize; i++) {
      const val = String(data[i][col] ?? "").trim();
      if (val === "") continue;
      nonEmptyCount++;
      if (!isNaN(parseFloat(val)) && isFinite(Number(val))) {
        numericCount++;
      }
    }
    types[col] =
      nonEmptyCount > 0 && numericCount / nonEmptyCount >= 0.8
        ? "number"
        : "string";
  }
  return types;
}

function evaluateCondition(
  row: Record<string, unknown>,
  filter: FilterCondition
): boolean {
  const raw = String(row[filter.column] ?? "");
  const val = raw.toLowerCase();
  const fval = (filter.value || "").toLowerCase();

  switch (filter.operator) {
    case "eq":
      return val === fval;
    case "neq":
      return val !== fval;
    case "contains":
      return val.includes(fval);
    case "not_contains":
      return !val.includes(fval);
    case "starts_with":
      return val.startsWith(fval);
    case "ends_with":
      return val.endsWith(fval);
    case "gt":
    case "gte":
    case "lt":
    case "lte": {
      const numA = parseFloat(raw);
      const numB = parseFloat(filter.value || "");
      if (isNaN(numA) || isNaN(numB)) return false;
      if (filter.operator === "gt") return numA > numB;
      if (filter.operator === "gte") return numA >= numB;
      if (filter.operator === "lt") return numA < numB;
      return numA <= numB;
    }
    case "empty":
      return raw.trim() === "";
    case "not_empty":
      return raw.trim() !== "";
    default:
      return true;
  }
}

function applyFilters(
  data: Record<string, unknown>[],
  filters: FilterCondition[],
  logic: "and" | "or",
  validColumns: Set<string>
): Record<string, unknown>[] {
  const activeFilters = filters.filter((f) => validColumns.has(f.column));
  if (activeFilters.length === 0) return data;

  return data.filter((row) => {
    if (logic === "and") {
      return activeFilters.every((f) => evaluateCondition(row, f));
    }
    return activeFilters.some((f) => evaluateCondition(row, f));
  });
}

function applySorting(
  data: Record<string, unknown>[],
  sort: { column: string; direction: "asc" | "desc" },
  columnTypes: ColumnTypes
): Record<string, unknown>[] {
  const sorted = [...data];
  const isNumeric = columnTypes[sort.column] === "number";
  const dir = sort.direction === "asc" ? 1 : -1;

  sorted.sort((a, b) => {
    const aVal = String(a[sort.column] ?? "");
    const bVal = String(b[sort.column] ?? "");

    if (isNumeric) {
      const aNum = parseFloat(aVal);
      const bNum = parseFloat(bVal);
      const aValid = !isNaN(aNum);
      const bValid = !isNaN(bNum);
      if (aValid && bValid) return (aNum - bNum) * dir;
      if (aValid) return -1 * dir;
      if (bValid) return 1 * dir;
      return 0;
    }
    return aVal.localeCompare(bVal) * dir;
  });

  return sorted;
}

// --- Main handler ---

// GET /api/datasets/[id]/data?page=1&limit=100&q=<base64 query>
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const page = Math.max(
      1,
      parseInt(searchParams.get("page") || "1", 10)
    );
    const limit = Math.min(
      500,
      Math.max(1, parseInt(searchParams.get("limit") || "100", 10))
    );
    const isExport = searchParams.get("export") === "true";

    const query = parseQuery(searchParams);

    const { user, error } = await requireAuth(request);
    if (error) return error;

    // Check access (purchase OR subscription OR admin)
    let isAdmin = false;
    let allowExport = false;

    if (user!.email && ADMIN_EMAILS.includes(user!.email.toLowerCase())) {
      isAdmin = true;
      allowExport = true;
    } else {
      const userDoc = await adminDb.collection("users").doc(user!.uid).get();
      if (userDoc.exists && userDoc.data()?.role === "admin") {
        isAdmin = true;
        allowExport = true;
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
      allowExport = access.allowDownload;
    }

    // Export mode requires download permission
    if (isExport && !allowExport) {
      return NextResponse.json(
        { error: "Download is not available for your access level" },
        { status: 403 }
      );
    }

    // Fetch dataset metadata
    const datasetDoc = await adminDb.collection("datasets").doc(id).get();
    if (!datasetDoc.exists) {
      return NextResponse.json(
        { error: "Dataset not found" },
        { status: 404 }
      );
    }

    const dataset = datasetDoc.data()!;

    // Load full data from Storage
    let allData: Record<string, unknown>[] = [];

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

    console.log(
      `[data] Dataset ${id} - fileUrl: "${rawPath}", resolved storagePath: "${storagePath}", format: "${dataset.fileFormat || "csv"}"`
    );

    try {
      const bucketName =
        process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || undefined;
      const bucket = adminStorage.bucket(bucketName);
      allData = await parseStorageFile(bucket, storagePath, dataset.fileFormat);
      if (allData.length > 0) {
        console.log(`[data] Parsed ${allData.length} rows from Storage`);
      }
    } catch (storageError) {
      console.error(
        `[data] Storage error for "${storagePath}":`,
        storageError
      );
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

    // Detect column types
    const columns: string[] =
      dataset.columns ||
      (allData.length > 0 ? Object.keys(allData[0]) : []);
    const columnTypes = detectColumnTypes(allData, columns);
    const validColumns = new Set(columns);

    // 1. Global search pre-filter
    let filteredData = allData;
    if (query.search) {
      const s = query.search;
      filteredData = filteredData.filter((row) =>
        Object.values(row).some((val) =>
          String(val ?? "")
            .toLowerCase()
            .includes(s)
        )
      );
    }

    // 2. Apply structured filters
    filteredData = applyFilters(
      filteredData,
      query.filters,
      query.logic,
      validColumns
    );

    // 3. Apply sorting
    if (query.sort && validColumns.has(query.sort.column)) {
      filteredData = applySorting(filteredData, query.sort, columnTypes);
    }

    // Export mode: return all data without pagination
    if (isExport) {
      return NextResponse.json({
        data: filteredData,
        columns,
        columnTypes,
        pagination: {
          page: 1,
          limit: filteredData.length,
          totalRecords: filteredData.length,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
        allowExport,
      });
    }

    // Paginate
    const totalRecords = filteredData.length;
    const totalPages = Math.ceil(totalRecords / limit);
    const offset = (page - 1) * limit;
    const pageData = filteredData.slice(offset, offset + limit);

    return NextResponse.json({
      data: pageData,
      columns,
      columnTypes,
      pagination: {
        page,
        limit,
        totalRecords,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
      allowExport,
    });
  } catch (error) {
    console.error("Dataset data error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to load dataset";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
