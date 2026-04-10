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
import { Search, ChevronLeft, ChevronRight, Database, Loader2 } from "lucide-react";

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
}

export function FullDatasetViewer({ datasetId }: FullDatasetViewerProps) {
  const { getIdToken } = useAuth();
  const { t } = useLanguage();
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);

  const fetchData = useCallback(
    async (p: number, q: string) => {
      setLoading(true);
      try {
        const token = await getIdToken();
        if (!token) return;

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
        }
      } catch {
        // Fail silently
      } finally {
        setLoading(false);
      }
    },
    [datasetId, getIdToken]
  );

  useEffect(() => {
    fetchData(page, search);
  }, [page, search, fetchData]);

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

  if (loading && data.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <form onSubmit={handleSearch} className="flex gap-2">
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

      {/* Data table */}
      {data.length > 0 ? (
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border bg-muted">
                  <TableHead className="w-12 text-center text-dim">#</TableHead>
                  {columns.map((col) => (
                    <TableHead
                      key={col}
                      className="min-w-[120px] text-muted-foreground font-semibold text-xs uppercase tracking-wider whitespace-nowrap"
                    >
                      {col}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((row, i) => (
                  <TableRow
                    key={i}
                    className="border-border hover:bg-muted/50"
                  >
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
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          {search ? t("dataset.noSearchResults") : t("dataset.noDataAvailable")}
        </div>
      )}

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
            {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, idx) => {
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
            })}
          </div>
          <button
            onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
            disabled={!pagination.hasNext || loading}
            className="flex items-center gap-1 px-3 py-2 rounded-lg border border-border text-sm text-foreground hover:bg-muted transition-colors disabled:opacity-40 disabled:pointer-events-none"
          >
            {t("dataset.next")}
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {loading && data.length > 0 && (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      )}
    </div>
  );
}
