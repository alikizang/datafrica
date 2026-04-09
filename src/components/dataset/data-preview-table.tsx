"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface DataPreviewTableProps {
  data: Record<string, string | number>[];
  columns: string[];
  maxRows?: number;
}

export function DataPreviewTable({
  data,
  columns,
  maxRows = 10,
}: DataPreviewTableProps) {
  const previewData = data.slice(0, maxRows);
  const displayColumns = columns.slice(0, 8); // Limit columns for readability

  if (!data.length || !columns.length) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No preview data available
      </div>
    );
  }

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12 text-center">#</TableHead>
            {displayColumns.map((col) => (
              <TableHead key={col} className="min-w-[120px]">
                {col}
              </TableHead>
            ))}
            {columns.length > 8 && (
              <TableHead className="text-muted-foreground">
                +{columns.length - 8} more
              </TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {previewData.map((row, i) => (
            <TableRow key={i}>
              <TableCell className="text-center text-muted-foreground text-xs">
                {i + 1}
              </TableCell>
              {displayColumns.map((col) => (
                <TableCell key={col} className="text-sm max-w-[200px] truncate">
                  {String(row[col] ?? "")}
                </TableCell>
              ))}
              {columns.length > 8 && <TableCell className="text-muted-foreground">...</TableCell>}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {data.length > maxRows && (
        <div className="p-3 text-center text-sm text-muted-foreground border-t bg-muted/50">
          Showing {maxRows} of {data.length} rows. Purchase to unlock full dataset.
        </div>
      )}
    </div>
  );
}
