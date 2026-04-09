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
      <div className="text-center py-8 text-[#7a8ba3]">
        No preview data available
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-white/[0.06] overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-white/[0.06] bg-[#0d1a2d]">
              <TableHead className="w-12 text-center text-[#525f73]">#</TableHead>
              {displayColumns.map((col) => (
                <TableHead key={col} className="min-w-[120px] text-[#7a8ba3] font-semibold text-xs uppercase tracking-wider">
                  {col}
                </TableHead>
              ))}
              {columns.length > 8 && (
                <TableHead className="text-[#525f73] text-xs">
                  +{columns.length - 8} more
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {previewData.map((row, i) => (
              <TableRow
                key={i}
                className="border-white/[0.04] hover:bg-white/[0.02]"
                onCopy={(e) => e.preventDefault()}
              >
                <TableCell className="text-center text-[#525f73] text-xs">
                  {i + 1}
                </TableCell>
                {displayColumns.map((col) => (
                  <TableCell
                    key={col}
                    className="text-sm max-w-[200px] truncate text-[#c8d6e5]"
                    style={{ WebkitUserSelect: "none", userSelect: "none" }}
                  >
                    {String(row[col] ?? "")}
                  </TableCell>
                ))}
                {columns.length > 8 && (
                  <TableCell className="text-[#525f73]">...</TableCell>
                )}
              </TableRow>
            ))}
            {/* Blurred locked rows to show there's more data */}
            {!purchased && (
              <>
                {[1, 2, 3].map((i) => (
                  <TableRow key={`blur-${i}`} className="blur-row border-white/[0.04]">
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
        <div className="p-4 text-center border-t border-white/[0.06] bg-[#0d1a2d]/50">
          <div className="flex items-center justify-center gap-2 text-sm text-[#7a8ba3]">
            <Lock className="h-4 w-4 text-[#3d7eff]" />
            <span>
              Showing <strong className="text-white">{Math.min(maxRows, data.length)}</strong> of{" "}
              <strong className="text-white">{(totalRecords || data.length).toLocaleString()}</strong> records.
              Purchase to unlock full dataset.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
