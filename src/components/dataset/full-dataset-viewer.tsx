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
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/use-language";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Database,
  Maximize2,
  Minimize2,
  X,
  AlertCircle,
  RefreshCw,
  Filter,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Plus,
  Download,
  Columns3,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

// --- Types ---

interface Pagination {
  page: number;
  limit: number;
  totalRecords: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

interface FilterCondition {
  id: string;
  column: string;
  operator: string;
  value: string;
}

type ColumnTypes = Record<string, "string" | "number">;

interface SortState {
  column: string;
  direction: "asc" | "desc";
}

interface FullDatasetViewerProps {
  datasetId: string;
  datasetTitle?: string;
  initialFullscreen?: boolean;
  onClose?: () => void;
}

// --- Constants ---

const ALL_OPERATORS = [
  "eq", "neq", "contains", "not_contains", "starts_with", "ends_with",
  "gt", "gte", "lt", "lte", "empty", "not_empty",
];
const STRING_OPERATORS = [
  "eq", "neq", "contains", "not_contains", "starts_with", "ends_with",
  "empty", "not_empty",
];
const NO_VALUE_OPERATORS = new Set(["empty", "not_empty"]);

function genId() {
  return Math.random().toString(36).slice(2, 9);
}

// --- Sub-components ---

function LoadingScreen({ title }: { title?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-6">
      <div className="relative">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Database className="h-7 w-7 text-primary" />
        </div>
        <div className="absolute inset-0 animate-spin" style={{ animationDuration: "1.5s" }}>
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-primary" />
        </div>
      </div>
      <div className="text-center space-y-2">
        <p className="text-sm font-medium text-foreground">{title || "Loading dataset..."}</p>
        <div className="w-48 h-1.5 bg-muted rounded-full overflow-hidden mx-auto">
          <div className="h-full w-1/3 bg-primary/60 rounded-full" style={{ animation: "shimmer 1.5s ease-in-out infinite" }} />
        </div>
      </div>
      <div className="w-full max-w-lg space-y-2 px-4">
        {[0.9, 0.7, 0.8, 0.6, 0.75].map((w, i) => (
          <div key={i} className="h-8 rounded-lg bg-muted/60 animate-pulse" style={{ width: `${w * 100}%`, animationDelay: `${i * 150}ms` }} />
        ))}
      </div>
      <style jsx>{`@keyframes shimmer { 0% { transform: translateX(-150%); } 100% { transform: translateX(450%); } }`}</style>
    </div>
  );
}

function FilterRow({
  condition,
  columns,
  columnTypes,
  onChange,
  onRemove,
  t,
}: {
  condition: FilterCondition;
  columns: string[];
  columnTypes: ColumnTypes;
  onChange: (updated: FilterCondition) => void;
  onRemove: () => void;
  t: (key: string) => string;
}) {
  const colType = condition.column ? (columnTypes[condition.column] || "string") : "string";
  const operators = colType === "number" ? ALL_OPERATORS : STRING_OPERATORS;

  return (
    <div className="grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_auto_1fr_auto] gap-2 items-center">
      {/* Column */}
      <select
        value={condition.column}
        onChange={(e) => onChange({ ...condition, column: e.target.value, operator: "contains", value: "" })}
        className="h-9 px-3 rounded-lg border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 col-span-1 sm:col-span-1 w-full"
      >
        <option value="">{t("dataset.filter.column")}</option>
        {columns.map((col) => (
          <option key={col} value={col}>{col}</option>
        ))}
      </select>

      {/* Operator */}
      <select
        value={condition.operator}
        onChange={(e) => onChange({ ...condition, operator: e.target.value })}
        className="h-9 px-3 rounded-lg border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 w-full"
      >
        {operators.map((op) => (
          <option key={op} value={op}>{t(`dataset.operator.${op}`)}</option>
        ))}
      </select>

      {/* Value */}
      {!NO_VALUE_OPERATORS.has(condition.operator) ? (
        <input
          type={colType === "number" && ["gt", "gte", "lt", "lte"].includes(condition.operator) ? "number" : "text"}
          value={condition.value}
          onChange={(e) => onChange({ ...condition, value: e.target.value })}
          placeholder={t("dataset.filter.value")}
          className="h-9 px-3 rounded-lg border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 w-full"
        />
      ) : (
        <div className="hidden sm:block" />
      )}

      {/* Remove */}
      <button
        type="button"
        onClick={onRemove}
        className="h-9 w-9 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-destructive hover:border-destructive/50 transition-colors shrink-0 justify-self-end"
        title={t("dataset.filter.remove")}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

// --- Main component ---

export function FullDatasetViewer({
  datasetId,
  datasetTitle,
  initialFullscreen = false,
  onClose,
}: FullDatasetViewerProps) {
  const { getIdToken } = useAuth();
  const { t } = useLanguage();

  // Data state
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [columnTypes, setColumnTypes] = useState<ColumnTypes>({});
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [allowExport, setAllowExport] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Query state
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<FilterCondition[]>([]);
  const [appliedFilters, setAppliedFilters] = useState<FilterCondition[]>([]);
  const [filterLogic, setFilterLogic] = useState<"and" | "or">("and");
  const [appliedLogic, setAppliedLogic] = useState<"and" | "or">("and");
  const [sort, setSort] = useState<SortState | null>(null);
  const [page, setPage] = useState(1);

  // UI state
  const [visibleColumns, setVisibleColumns] = useState<Set<string> | null>(null);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [fullscreen, setFullscreen] = useState(initialFullscreen);
  const [exportLoading, setExportLoading] = useState(false);

  // Build query object from current state
  const buildQuery = useCallback(
    (overrideSearch?: string, overrideSort?: SortState | null) => {
      const activeFilters = appliedFilters
        .filter((f) => f.column && f.operator)
        .map(({ column, operator, value }) => ({ column, operator, value }));
      const s = overrideSearch !== undefined ? overrideSearch : search;
      const srt = overrideSort !== undefined ? overrideSort : sort;

      const obj: Record<string, unknown> = {};
      if (activeFilters.length > 0) {
        obj.filters = activeFilters;
        obj.logic = appliedLogic;
      }
      if (srt) obj.sort = srt;
      if (s) obj.search = s;

      if (Object.keys(obj).length === 0) return "";
      return btoa(JSON.stringify(obj));
    },
    [appliedFilters, appliedLogic, search, sort]
  );

  const fetchData = useCallback(
    async (p: number, q: string) => {
      setLoading(true);
      setError(null);
      try {
        const token = await getIdToken();
        if (!token) { setError(t("common.error")); return; }

        const params = new URLSearchParams({ page: String(p), limit: "100" });
        if (q) params.set("q", q);

        const res = await fetch(`/api/datasets/${datasetId}/data?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const json = await res.json();
          setData(json.data);
          setColumns(json.columns);
          setPagination(json.pagination);
          setAllowExport(json.allowExport ?? false);
          if (json.columnTypes) setColumnTypes(json.columnTypes);
          // Initialize visible columns on first load
          if (json.columns && visibleColumns === null) {
            setVisibleColumns(new Set(json.columns));
          }
        } else {
          const errBody = await res.json().catch(() => null);
          setError(errBody?.error || `${t("common.error")} (${res.status})`);
        }
      } catch {
        setError(t("common.error"));
      } finally {
        setLoading(false);
      }
    },
    [datasetId, getIdToken, t, visibleColumns]
  );

  // Fetch on page/query changes
  useEffect(() => {
    const q = buildQuery();
    fetchData(page, q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, appliedFilters, appliedLogic, search, sort]);

  // Keyboard escape for fullscreen
  useEffect(() => {
    if (!fullscreen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setFullscreen(false); if (initialFullscreen && onClose) onClose(); }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [fullscreen, initialFullscreen, onClose]);

  // Lock scroll in fullscreen
  useEffect(() => {
    if (fullscreen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [fullscreen]);

  // --- Actions ---

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

  const handleApplyFilters = () => {
    setAppliedFilters([...filters]);
    setAppliedLogic(filterLogic);
    setPage(1);
  };

  const handleClearFilters = () => {
    setFilters([]);
    setAppliedFilters([]);
    setFilterLogic("and");
    setAppliedLogic("and");
    setPage(1);
  };

  const addFilterRow = () => {
    if (filters.length >= 20) return;
    setFilters((prev) => [...prev, { id: genId(), column: "", operator: "contains", value: "" }]);
  };

  const updateFilter = (id: string, updated: FilterCondition) => {
    setFilters((prev) => prev.map((f) => (f.id === id ? updated : f)));
  };

  const removeFilter = (id: string) => {
    setFilters((prev) => prev.filter((f) => f.id !== id));
  };

  const removeAppliedFilter = (id: string) => {
    const next = appliedFilters.filter((f) => f.id !== id);
    setAppliedFilters(next);
    setFilters(next);
    setPage(1);
  };

  const handleSort = (column: string) => {
    setSort((prev) => {
      if (prev?.column === column) {
        if (prev.direction === "asc") return { column, direction: "desc" };
        return null; // desc -> clear
      }
      return { column, direction: "asc" };
    });
    setPage(1);
  };

  const handleExport = async (format: "csv" | "excel" | "json") => {
    setExportLoading(true);
    try {
      const token = await getIdToken();
      if (!token) { toast.error(t("common.error")); return; }

      const q = buildQuery();
      const params = new URLSearchParams({ page: "1", limit: "999999", export: "true" });
      if (q) params.set("q", q);

      const res = await fetch(`/api/datasets/${datasetId}/data?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        toast.error(err?.error || t("common.error"));
        return;
      }

      const json = await res.json();
      const exportData = json.data as Record<string, unknown>[];
      const title = datasetTitle || "dataset";

      if (format === "json") {
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
        downloadBlob(blob, `${title}.json`);
      } else if (format === "csv") {
        const Papa = (await import("papaparse")).default;
        const csv = Papa.unparse(exportData);
        const blob = new Blob([csv], { type: "text/csv" });
        downloadBlob(blob, `${title}.csv`);
      } else {
        const XLSX = await import("xlsx");
        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Data");
        const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
        const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
        downloadBlob(blob, `${title}.xlsx`);
      }

      toast.success(t("dataset.export.success") !== "dataset.export.success" ? t("dataset.export.success") : "Export complete");
    } catch {
      toast.error(t("common.error"));
    } finally {
      setExportLoading(false);
    }
  };

  const closeFullscreen = () => {
    setFullscreen(false);
    if (initialFullscreen && onClose) onClose();
  };

  // --- Derived ---

  const displayColumns = columns.filter((c) => visibleColumns === null || visibleColumns.has(c));
  const activeFilterCount = appliedFilters.filter((f) => f.column).length;

  function operatorLabel(op: string): string {
    const key = `dataset.operator.${op}`;
    const val = t(key);
    return val !== key ? val : op;
  }

  // --- Render helpers ---

  const isInitialLoad = loading && data.length === 0 && !error;

  const errorContent = error ? (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <div className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center">
        <AlertCircle className="h-7 w-7 text-destructive" />
      </div>
      <div className="text-center space-y-1">
        <p className="text-sm font-medium text-foreground">{error}</p>
        <p className="text-xs text-muted-foreground">{t("dataset.noDataAvailable")}</p>
      </div>
      <button
        onClick={() => { const q = buildQuery(); fetchData(page, q); }}
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
      >
        <RefreshCw className="h-4 w-4" />
        {t("common.retry") !== "common.retry" ? t("common.retry") : "Retry"}
      </button>
    </div>
  ) : null;

  const tableContent = (
    <div className="space-y-3">
      {/* TOOLBAR ROW 1: Search + Export + Fullscreen */}
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
          <button type="submit" className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
            {t("dataset.search")}
          </button>
          {search && (
            <button type="button" onClick={clearSearch} className="px-4 py-2.5 rounded-xl border border-border text-foreground text-sm font-medium hover:bg-muted transition-colors">
              {t("dataset.clearSearch")}
            </button>
          )}
        </form>

        {/* Export */}
        {allowExport && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-border text-foreground text-sm font-medium hover:bg-muted transition-colors shrink-0 disabled:opacity-50"
                disabled={exportLoading}
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">{t("dataset.export.label") !== "dataset.export.label" ? t("dataset.export.label") : "Export"}</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-popover border-border">
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                {t("dataset.export.filtered") !== "dataset.export.filtered" ? t("dataset.export.filtered") : "Export filtered results"}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleExport("csv")} className="text-popover-foreground focus:bg-accent">
                CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("excel")} className="text-popover-foreground focus:bg-accent">
                Excel (.xlsx)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("json")} className="text-popover-foreground focus:bg-accent">
                JSON
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Fullscreen */}
        {!initialFullscreen && (
          <button
            type="button"
            onClick={() => setFullscreen((v) => { const next = !v; if (!next && initialFullscreen && onClose) onClose(); return next; })}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-border text-foreground text-sm font-medium hover:bg-muted transition-colors shrink-0"
            title={fullscreen ? t("dataset.exitFullView") : t("dataset.fullView")}
          >
            {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        )}
      </div>

      {/* TOOLBAR ROW 2: Filters + Sort indicator + Columns */}
      <div className="flex gap-2 items-center flex-wrap">
        {/* Filter toggle */}
        <button
          type="button"
          onClick={() => {
            setShowFilterPanel((v) => !v);
            if (!showFilterPanel && filters.length === 0) addFilterRow();
          }}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
            showFilterPanel
              ? "bg-primary text-primary-foreground"
              : "border border-border text-foreground hover:bg-muted"
          }`}
        >
          <Filter className="h-4 w-4" />
          {t("dataset.filter.title") !== "dataset.filter.title" ? t("dataset.filter.title") : "Filters"}
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
              {activeFilterCount}
            </Badge>
          )}
        </button>

        {/* Sort indicator */}
        {sort && (
          <div className="flex items-center gap-1 px-3 py-2 rounded-xl bg-muted text-sm text-foreground border border-border">
            {sort.direction === "asc" ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />}
            <span className="font-medium">{sort.column}</span>
            <button
              type="button"
              onClick={() => { setSort(null); setPage(1); }}
              className="ml-1 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Column visibility */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border text-foreground text-sm font-medium hover:bg-muted transition-colors">
              <Columns3 className="h-4 w-4" />
              <span className="hidden sm:inline">{t("dataset.columns.label") !== "dataset.columns.label" ? t("dataset.columns.label") : "Columns"}</span>
              {visibleColumns && visibleColumns.size < columns.length && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                  {visibleColumns.size}/{columns.length}
                </Badge>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="bg-popover border-border max-h-72 overflow-y-auto w-56">
            <DropdownMenuItem
              onClick={() => setVisibleColumns(new Set(columns))}
              className="text-popover-foreground focus:bg-accent text-xs"
            >
              {t("dataset.columns.selectAll") !== "dataset.columns.selectAll" ? t("dataset.columns.selectAll") : "Select all"}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setVisibleColumns(new Set())}
              className="text-popover-foreground focus:bg-accent text-xs"
            >
              {t("dataset.columns.deselectAll") !== "dataset.columns.deselectAll" ? t("dataset.columns.deselectAll") : "Deselect all"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {columns.map((col) => (
              <DropdownMenuCheckboxItem
                key={col}
                checked={visibleColumns === null || visibleColumns.has(col)}
                onCheckedChange={(checked) => {
                  setVisibleColumns((prev) => {
                    const next = new Set(prev ?? columns);
                    if (checked) next.add(col);
                    else next.delete(col);
                    return next;
                  });
                }}
                className="text-popover-foreground focus:bg-accent"
              >
                {col}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* QUERY BUILDER PANEL */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          showFilterPanel ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="rounded-xl border border-border bg-card/50 p-4 space-y-3">
          {/* Filter rows */}
          {filters.map((f, idx) => (
            <div key={f.id}>
              {idx > 0 && (
                <div className="flex items-center gap-2 my-2">
                  <div className="flex-1 h-px bg-border" />
                  <div className="flex rounded-lg overflow-hidden border border-border">
                    <button
                      type="button"
                      onClick={() => setFilterLogic("and")}
                      className={`px-3 py-1 text-xs font-semibold transition-colors ${
                        filterLogic === "and"
                          ? "bg-primary text-primary-foreground"
                          : "bg-card text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      AND
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterLogic("or")}
                      className={`px-3 py-1 text-xs font-semibold transition-colors ${
                        filterLogic === "or"
                          ? "bg-primary text-primary-foreground"
                          : "bg-card text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      OR
                    </button>
                  </div>
                  <div className="flex-1 h-px bg-border" />
                </div>
              )}
              <FilterRow
                condition={f}
                columns={columns}
                columnTypes={columnTypes}
                onChange={(updated) => updateFilter(f.id, updated)}
                onRemove={() => removeFilter(f.id)}
                t={t}
              />
            </div>
          ))}

          {/* Action buttons */}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={addFilterRow}
              disabled={filters.length >= 20}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-primary hover:bg-primary/10 transition-colors disabled:opacity-40"
            >
              <Plus className="h-4 w-4" />
              {t("dataset.filter.addCondition") !== "dataset.filter.addCondition" ? t("dataset.filter.addCondition") : "Add condition"}
            </button>
            <div className="flex-1" />
            <button
              type="button"
              onClick={handleClearFilters}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {t("dataset.filter.clearAll") !== "dataset.filter.clearAll" ? t("dataset.filter.clearAll") : "Clear all"}
            </button>
            <button
              type="button"
              onClick={handleApplyFilters}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Filter className="h-3.5 w-3.5" />
              {t("dataset.filter.apply") !== "dataset.filter.apply" ? t("dataset.filter.apply") : "Apply"}
            </button>
          </div>
        </div>
      </div>

      {/* ACTIVE FILTERS BAR */}
      {activeFilterCount > 0 && !showFilterPanel && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground">
            {appliedLogic === "and"
              ? (t("dataset.filter.matchAll") !== "dataset.filter.matchAll" ? t("dataset.filter.matchAll") : "Match ALL")
              : (t("dataset.filter.matchAny") !== "dataset.filter.matchAny" ? t("dataset.filter.matchAny") : "Match ANY")}
            :
          </span>
          {appliedFilters
            .filter((f) => f.column)
            .map((f) => (
              <Badge key={f.id} variant="secondary" className="flex items-center gap-1 py-1 px-2 text-xs">
                <span className="font-semibold">{f.column}</span>
                <span className="text-muted-foreground">{operatorLabel(f.operator)}</span>
                {!NO_VALUE_OPERATORS.has(f.operator) && (
                  <span>&quot;{f.value}&quot;</span>
                )}
                <button
                  type="button"
                  onClick={() => removeAppliedFilter(f.id)}
                  className="ml-0.5 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          <button
            type="button"
            onClick={handleClearFilters}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors underline"
          >
            {t("dataset.filter.clearAll") !== "dataset.filter.clearAll" ? t("dataset.filter.clearAll") : "Clear all"}
          </button>
        </div>
      )}

      {/* Results info */}
      {pagination && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            <span>
              {search || activeFilterCount > 0
                ? `${pagination.totalRecords.toLocaleString()} ${t("dataset.resultsFound")}`
                : `${pagination.totalRecords.toLocaleString()} ${t("dataset.totalRecords")}`}
            </span>
          </div>
          <span>
            {t("dataset.page")} {pagination.page} / {pagination.totalPages || 1}
          </span>
        </div>
      )}

      {/* Inline loading for page changes */}
      {loading && data.length > 0 && (
        <div className="flex items-center justify-center py-3 gap-2 text-sm text-muted-foreground">
          <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          <span>{t("common.loading") !== "common.loading" ? t("common.loading") : "Loading..."}</span>
        </div>
      )}

      {/* DATA TABLE */}
      {data.length > 0 ? (
        <div className="rounded-lg border border-border overflow-hidden">
          <div className={`overflow-x-auto ${fullscreen ? "overflow-y-auto max-h-[calc(100vh-340px)] sm:max-h-[calc(100vh-300px)]" : ""}`}>
            <Table>
              <TableHeader>
                <TableRow className="border-border bg-muted">
                  <TableHead className="w-12 text-center text-dim sticky top-0 bg-muted z-10">#</TableHead>
                  {displayColumns.map((col) => (
                    <TableHead
                      key={col}
                      className="min-w-[120px] text-muted-foreground font-semibold text-xs uppercase tracking-wider whitespace-nowrap sticky top-0 bg-muted z-10 cursor-pointer select-none hover:text-foreground transition-colors"
                      onClick={() => handleSort(col)}
                    >
                      <div className="flex items-center gap-1">
                        {col}
                        {sort?.column === col ? (
                          sort.direction === "asc" ? (
                            <ArrowUp className="h-3.5 w-3.5 text-primary" />
                          ) : (
                            <ArrowDown className="h-3.5 w-3.5 text-primary" />
                          )
                        ) : (
                          <ArrowUpDown className="h-3.5 w-3.5 opacity-0 group-hover:opacity-30" />
                        )}
                        {columnTypes[col] === "number" && (
                          <span className="text-[10px] text-muted-foreground/50 font-normal">#</span>
                        )}
                      </div>
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
                    {displayColumns.map((col) => (
                      <TableCell key={col} className="text-sm max-w-[300px] truncate text-foreground">
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
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <Database className="h-8 w-8 text-muted-foreground/50" />
          <p className="text-muted-foreground text-sm">
            {search || activeFilterCount > 0
              ? (t("dataset.noSearchResults") || "No results match your query.")
              : t("dataset.noDataAvailable")}
          </p>
          {(search || activeFilterCount > 0) && (
            <button
              type="button"
              onClick={() => { clearSearch(); handleClearFilters(); }}
              className="text-sm text-primary hover:underline"
            >
              {t("dataset.filter.clearAll") !== "dataset.filter.clearAll" ? t("dataset.filter.clearAll") : "Clear all filters"}
            </button>
          )}
        </div>
      ) : null}

      {/* PAGINATION */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-1.5 sm:gap-2 flex-wrap">
          {/* First page */}
          <button
            onClick={() => setPage(1)}
            disabled={page === 1 || loading}
            className="flex items-center gap-1 px-2 sm:px-3 py-2 rounded-lg border border-border text-sm text-foreground hover:bg-muted transition-colors disabled:opacity-40 disabled:pointer-events-none"
            title={t("dataset.firstPage") !== "dataset.firstPage" ? t("dataset.firstPage") : "First page"}
          >
            <ChevronsLeft className="h-4 w-4" />
          </button>
          {/* Previous */}
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={!pagination.hasPrev || loading}
            className="flex items-center gap-1 px-2 sm:px-3 py-2 rounded-lg border border-border text-sm text-foreground hover:bg-muted transition-colors disabled:opacity-40 disabled:pointer-events-none"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline">{t("dataset.previous")}</span>
          </button>
          {/* Page numbers */}
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, idx) => {
              let pageNum: number;
              if (pagination.totalPages <= 5) pageNum = idx + 1;
              else if (pagination.page <= 3) pageNum = idx + 1;
              else if (pagination.page >= pagination.totalPages - 2) pageNum = pagination.totalPages - 4 + idx;
              else pageNum = pagination.page - 2 + idx;
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
          {/* Page X of Y */}
          <span className="text-xs text-muted-foreground px-1 hidden sm:inline">
            {pagination.page} / {pagination.totalPages}
          </span>
          {/* Next */}
          <button
            onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
            disabled={!pagination.hasNext || loading}
            className="flex items-center gap-1 px-2 sm:px-3 py-2 rounded-lg border border-border text-sm text-foreground hover:bg-muted transition-colors disabled:opacity-40 disabled:pointer-events-none"
          >
            <span className="hidden sm:inline">{t("dataset.next")}</span>
            <ChevronRight className="h-4 w-4" />
          </button>
          {/* Last page */}
          <button
            onClick={() => setPage(pagination.totalPages)}
            disabled={page === pagination.totalPages || loading}
            className="flex items-center gap-1 px-2 sm:px-3 py-2 rounded-lg border border-border text-sm text-foreground hover:bg-muted transition-colors disabled:opacity-40 disabled:pointer-events-none"
            title={t("dataset.lastPage") !== "dataset.lastPage" ? t("dataset.lastPage") : "Last page"}
          >
            <ChevronsRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );

  // Determine inner content
  const innerContent = isInitialLoad ? (
    <LoadingScreen title={t("dataset.loadingData") !== "dataset.loadingData" ? t("dataset.loadingData") : "Loading dataset..."} />
  ) : error ? (
    errorContent
  ) : (
    tableContent
  );

  // Fullscreen overlay
  if (fullscreen) {
    return (
      <>
        {!initialFullscreen && (
          <div className="h-16 flex items-center justify-center text-muted-foreground text-sm">
            <Maximize2 className="h-4 w-4 mr-2" />
            {t("dataset.viewingFullscreen")}
          </div>
        )}
        <div className="fixed inset-0 z-50 bg-background flex flex-col animate-in fade-in duration-200">
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
          <div className="flex-1 overflow-auto px-6 py-4">{innerContent}</div>
        </div>
      </>
    );
  }

  return innerContent;
}

// --- Utility ---

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
