"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/use-language";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Database,
  Maximize2,
  Minimize2,
  X,
  AlertCircle,
  RefreshCw,
} from "lucide-react";

interface Pagination {
  page: number;
  limit: number;
  totalRecords: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

interface FullDatasetViewerProps {
  datasetId: string;
  datasetTitle?: string;
  /** Start in fullscreen overlay mode */
  initialFullscreen?: boolean;
  /** Called when the user exits fullscreen (useful when opened externally) */
  onClose?: () => void;
}

function LoadingScreen({ title }: { title?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-6">
      {/* Animated data loading indicator */}
      <div className="relative">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Database className="h-7 w-7 text-primary" />
        </div>
        {/* Orbiting dot */}
        <div className="absolute inset-0 animate-spin" style={{ animationDuration: "1.5s" }}>
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-primary" />
        </div>
      </div>

      <div className="text-center space-y-2">
        <p className="text-sm font-medium text-foreground">
          {title || "Loading dataset..."}
        </p>
        {/* Animated shimmer bar */}
        <div className="w-48 h-1.5 bg-muted rounded-full overflow-hidden mx-auto">
          <div
            className="h-full w-1/3 bg-primary/60 rounded-full animate-shimmer"
            style={{
              animation: "shimmer 1.5s ease-in-out infinite",
            }}
          />
        </div>
      </div>

      {/* Skeleton table rows */}
      <div className="w-full max-w-lg space-y-2 px-4">
        {[0.9, 0.7, 0.8, 0.6, 0.75].map((w, i) => (
          <div
            key={i}
            className="h-8 rounded-lg bg-muted/60 animate-pulse"
            style={{
              width: `${w * 100}%`,
              animationDelay: `${i * 150}ms`,
            }}
          />
        ))}
      </div>

      <style jsx>{`
        @keyframes shimmer {
          0% { transform: translateX(-150%); }
          100% { transform: translateX(450%); }
        }
      `}</style>
    </div>
  );
}

export function FullDatasetViewer({
  datasetId,
  datasetTitle,
  initialFullscreen = false,
  onClose,
}: FullDatasetViewerProps) {
  const { getIdToken } = useAuth();
  const { t } = useLanguage();
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [fullscreen, setFullscreen] = useState(initialFullscreen);

  const fetchData = useCallback(
    async (p: number, q: string) => {
      setLoading(true);
      setError(null);
      try {
        const token = await getIdToken();
        if (!token) {
          setError(t("common.error"));
          return;
        }

        const params = new URLSearchParams({
          page: String(p),
          limit: "100",
        });
        if (q) params.set("search", q);

        const res = await fetch(`/api/datasets/${datasetId}/data?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const json = await res.json();
          setData(json.data);
          setColumns(json.columns);
          setPagination(json.pagination);
        } else {
          const errBody = await res.json().catch(() => null);
          setError(
            errBody?.error || `${t("common.error")} (${res.status})`
          );
        }
      } catch {
        setError(t("common.error"));
      } finally {
        setLoading(false);
      }
    },
    [datasetId, getIdToken, t]
  );

  useEffect(() => {
    fetchData(page, search);
  }, [page, search, fetchData]);

  // Close fullscreen on Escape key
  useEffect(() => {
    if (!fullscreen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setFullscreen(false);
        if (initialFullscreen && onClose) onClose();
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [fullscreen, initialFullscreen, onClose]);

  // Lock body scroll when fullscreen
  useEffect(() => {
    if (fullscreen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [fullscreen]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
  };

  const clearSearch = () => {
    setSearchInput("");
    setSearch("");
    setPage(1);
  };

  const closeFullscreen = () => {
    setFullscreen(false);
    if (initialFullscreen && onClose) onClose();
  };

  // --- Error view ---
  const errorContent = error ? (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <div className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center">
        <AlertCircle className="h-7 w-7 text-destructive" />
      </div>
      <div className="text-center space-y-1">
        <p className="text-sm font-medium text-foreground">{error}</p>
        <p className="text-xs text-muted-foreground">
          {t("dataset.noDataAvailable")}
        </p>
      </div>
      <button
        onClick={() => fetchData(page, search)}
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
      >
        <RefreshCw className="h-4 w-4" />
        {t("common.retry") !== "common.retry" ? t("common.retry") : "Retry"}
      </button>
    </div>
  ) : null;

  // --- Loading view (initial load only) ---
  const isInitialLoad = loading && data.length === 0 && !error;

  // --- Table content ---
  const tableContent = (
    <div className="space-y-4">
      {/* Toolbar: Search + fullscreen toggle */}
      <div className="flex gap-2 items-center">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={t("dataset.searchDataset")}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-card border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            {t("dataset.search")}
          </button>
          {search && (
            <button
              type="button"
              onClick={clearSearch}
              className="px-4 py-2.5 rounded-xl border border-border text-foreground text-sm font-medium hover:bg-muted transition-colors"
            >
              {t("dataset.clearSearch")}
            </button>
          )}
        </form>
        {!initialFullscreen && (
          <button
            type="button"
            onClick={() => {
              setFullscreen((v) => {
                const next = !v;
                if (!next && initialFullscreen && onClose) onClose();
                return next;
              });
            }}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-border text-foreground text-sm font-medium hover:bg-muted transition-colors shrink-0"
            title={
              fullscreen ? t("dataset.exitFullView") : t("dataset.fullView")
            }
          >
            {fullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">
              {fullscreen ? t("dataset.exitFullView") : t("dataset.fullView")}
            </span>
          </button>
        )}
      </div>

      {/* Results info */}
      {pagination && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            <span>
              {search
                ? `${pagination.totalRecords.toLocaleString()} ${t("dataset.resultsFound")}`
                : `${pagination.totalRecords.toLocaleString()} ${t("dataset.totalRecords")}`}
            </span>
          </div>
          <span>
            {t("dataset.page")} {pagination.page} / {pagination.totalPages}
          </span>
        </div>
      )}

      {/* Inline loading overlay for page changes */}
      {loading && data.length > 0 && (
        <div className="flex items-center justify-center py-3 gap-2 text-sm text-muted-foreground">
          <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          <span>{t("common.loading") !== "common.loading" ? t("common.loading") : "Loading..."}</span>
        </div>
      )}

      {/* Data table */}
      {data.length > 0 ? (
        <div className="rounded-lg border border-border overflow-hidden">
          <div
            className={`overflow-x-auto ${fullscreen ? "overflow-y-auto max-h-[calc(100vh-220px)]" : ""}`}
          >
            <Table>
              <TableHeader>
                <TableRow className="border-border bg-muted">
                  <TableHead className="w-12 text-center text-dim sticky top-0 bg-muted z-10">
                    #
                  </TableHead>
                  {columns.map((col) => (
                    <TableHead
                      key={col}
                      className="min-w-[120px] text-muted-foreground font-semibold text-xs uppercase tracking-wider whitespace-nowrap sticky top-0 bg-muted z-10"
                    >
                      {col}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((row, i) => (
                  <TableRow key={i} className="border-border hover:bg-muted/50">
                    <TableCell className="text-center text-dim text-xs">
                      {((pagination?.page || 1) - 1) * (pagination?.limit || 100) + i + 1}
                    </TableCell>
                    {columns.map((col) => (
                      <TableCell
                        key={col}
                        className="text-sm max-w-[300px] truncate text-foreground"
                      >
                        {String(row[col] ?? "")}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : !loading && !error ? (
        <div className="text-center py-12 text-muted-foreground">
          {search ? t("dataset.noSearchResults") : t("dataset.noDataAvailable")}
        </div>
      ) : null}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={!pagination.hasPrev || loading}
            className="flex items-center gap-1 px-3 py-2 rounded-lg border border-border text-sm text-foreground hover:bg-muted transition-colors disabled:opacity-40 disabled:pointer-events-none"
          >
            <ChevronLeft className="h-4 w-4" />
            {t("dataset.previous")}
          </button>
          <div className="flex items-center gap-1">
            {Array.from(
              { length: Math.min(5, pagination.totalPages) },
              (_, idx) => {
                let pageNum: number;
                if (pagination.totalPages <= 5) {
                  pageNum = idx + 1;
                } else if (pagination.page <= 3) {
                  pageNum = idx + 1;
                } else if (pagination.page >= pagination.totalPages - 2) {
                  pageNum = pagination.totalPages - 4 + idx;
                } else {
                  pageNum = pagination.page - 2 + idx;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    disabled={loading}
                    className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                      pageNum === pagination.page
                        ? "bg-primary text-primary-foreground"
                        : "border border-border text-foreground hover:bg-muted"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              }
            )}
          </div>
          <button
            onClick={() =>
              setPage((p) => Math.min(pagination.totalPages, p + 1))
            }
            disabled={!pagination.hasNext || loading}
            className="flex items-center gap-1 px-3 py-2 rounded-lg border border-border text-sm text-foreground hover:bg-muted transition-colors disabled:opacity-40 disabled:pointer-events-none"
          >
            {t("dataset.next")}
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );

  // --- Determine what to render as inner content ---
  const innerContent = isInitialLoad ? (
    <LoadingScreen
      title={
        t("dataset.loadingData") !== "dataset.loadingData"
          ? t("dataset.loadingData")
          : "Loading dataset..."
      }
    />
  ) : error ? (
    errorContent
  ) : (
    tableContent
  );

  // Fullscreen modal overlay
  if (fullscreen) {
    return (
      <>
        {/* Inline placeholder to keep page layout */}
        {!initialFullscreen && (
          <div className="h-16 flex items-center justify-center text-muted-foreground text-sm">
            <Maximize2 className="h-4 w-4 mr-2" />
            {t("dataset.viewingFullscreen")}
          </div>
        )}
        {/* Fullscreen overlay */}
        <div className="fixed inset-0 z-50 bg-background flex flex-col animate-in fade-in duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-card shrink-0">
            <div className="flex items-center gap-3">
              <Database className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground truncate">
                {datasetTitle || t("dataset.fullDataset")}
              </h2>
            </div>
            <button
              onClick={closeFullscreen}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border text-foreground text-sm font-medium hover:bg-muted transition-colors"
            >
              <X className="h-4 w-4" />
              {t("dataset.exitFullView")}
            </button>
          </div>
          {/* Content */}
          <div className="flex-1 overflow-auto px-6 py-4">{innerContent}</div>
        </div>
      </>
    );
  }

  return innerContent;
}
