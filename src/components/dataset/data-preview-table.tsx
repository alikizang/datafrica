"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Lock } from "lucide-react";

interface DataPreviewTableProps {
  data: Record<string, string | number>[];
  columns: string[];
  maxRows?: number;
  totalRecords?: number;
  purchased?: boolean;
}

export function DataPreviewTable({
  data,
  columns,
  maxRows = 10,
  totalRecords,
  purchased = false,
}: DataPreviewTableProps) {
  const previewData = data.slice(0, maxRows);
  const displayColumns = columns.slice(0, 8);

  if (!data.length || !columns.length) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No preview data available
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-border bg-muted">
              <TableHead className="w-12 text-center text-dim">#</TableHead>
              {displayColumns.map((col) => (
                <TableHead key={col} className="min-w-[120px] text-muted-foreground font-semibold text-xs uppercase tracking-wider">
                  {col}
                </TableHead>
              ))}
              {columns.length > 8 && (
                <TableHead className="text-dim text-xs">
                  +{columns.length - 8} more
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {previewData.map((row, i) => (
              <TableRow
                key={i}
                className="border-border hover:bg-muted/50"
                onCopy={(e) => e.preventDefault()}
              >
                <TableCell className="text-center text-dim text-xs">
                  {i + 1}
                </TableCell>
                {displayColumns.map((col) => (
                  <TableCell
                    key={col}
                    className="text-sm max-w-[200px] truncate text-foreground"
                    style={{ WebkitUserSelect: "none", userSelect: "none" }}
                  >
                    {String(row[col] ?? "")}
                  </TableCell>
                ))}
                {columns.length > 8 && (
                  <TableCell className="text-dim">...</TableCell>
                )}
              </TableRow>
            ))}
            {/* Blurred locked rows to show there's more data */}
            {!purchased && (
              <>
                {[1, 2, 3].map((i) => (
                  <TableRow key={`blur-${i}`} className="blur-row border-border">
                    <TableCell className="text-center text-xs">{previewData.length + i}</TableCell>
                    {displayColumns.map((col) => (
                      <TableCell key={col} className="text-sm">
                        Lorem ipsum dolor sit amet consectetur
                      </TableCell>
                    ))}
                    {columns.length > 8 && <TableCell>...</TableCell>}
                  </TableRow>
                ))}
              </>
            )}
          </TableBody>
        </Table>
      </div>
      {!purchased && (
        <div className="p-4 text-center border-t border-border bg-muted/50">
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Lock className="h-4 w-4 text-primary" />
            <span>
              Showing <strong className="text-foreground">{Math.min(maxRows, data.length)}</strong> of{" "}
              <strong className="text-foreground">{(totalRecords || data.length).toLocaleString()}</strong> records.
              Purchase to unlock full dataset.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
