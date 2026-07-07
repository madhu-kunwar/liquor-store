"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { useDebounce } from "@/lib/hooks/use-debounce";
import {
  ChevronUp, ChevronDown, ChevronsUpDown,
  Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

// ─── Public types ─────────────────────────────────────────────────────────────

export interface ColumnDef<T extends object> {
  key: string;
  header: string;
  sortable?: boolean;
  align?: "left" | "center" | "right";
  cell: (row: T, index: number) => React.ReactNode;
  /** Used for client-side sort/search. Falls back to row[key] when omitted. */
  getValue?: (row: T) => string | number | boolean | null | undefined;
}

export interface TableParams {
  page: number;
  limit: number;
  search: string;
  sortBy: string;
  sortOrder: "asc" | "desc";
}

export interface DataTableProps<T extends object> {
  columns: ColumnDef<T>[];
  data: T[];
  rowKey: (row: T) => string;

  clientSide?: boolean;
  total?: number;
  isLoading?: boolean;

  onParamsChange?: (params: TableParams) => void;

  initialPage?: number;
  initialPageSize?: number;
  initialSortBy?: string;
  initialSortOrder?: "asc" | "desc";
  initialSearch?: string;

  searchPlaceholder?: string;
  toolbar?: React.ReactNode;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
  className?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

const ALIGN_CLASS: Record<string, string> = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
};

function buildPageNumbers(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages: (number | "…")[] = [1];
  if (current - 1 > 2) pages.push("…");

  const start = Math.max(2, current - 1);
  const end   = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);

  if (current + 1 < total - 1) pages.push("…");
  pages.push(total);

  return pages;
}

// ─── Main component ───────────────────────────────────────────────────────────

export function DataTable<T extends object>({
  columns,
  data,
  rowKey,
  clientSide = false,
  total,
  isLoading = false,
  onParamsChange,
  initialPage       = 1,
  initialPageSize   = 20,
  initialSortBy     = "",
  initialSortOrder  = "asc",
  initialSearch     = "",
  searchPlaceholder = "Search…",
  toolbar,
  emptyMessage      = "No results found.",
  onRowClick,
  className,
}: DataTableProps<T>) {
  // ── State ──────────────────────────────────────────────────────────────────
  const [page,      setPage]      = React.useState(initialPage);
  const [pageSize,  setPageSize]  = React.useState(initialPageSize);
  const [rawSearch, setRawSearch] = React.useState(initialSearch);
  const search = useDebounce(rawSearch, 300);
  const [sortBy,    setSortBy]    = React.useState(initialSortBy);
  const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">(initialSortOrder);

  // ── Reset page on search change ───────────────────────────────────────────
  React.useEffect(() => { setPage(1); }, [search]);

  // ── Notify parent ──────────────────────────────────────────────────────────
  const callbackRef = React.useRef(onParamsChange);
  React.useEffect(() => { callbackRef.current = onParamsChange; });

  const isMount = React.useRef(true);
  React.useEffect(() => {
    if (isMount.current) { isMount.current = false; return; }
    callbackRef.current?.({ page, limit: pageSize, search, sortBy, sortOrder });
  }, [page, pageSize, search, sortBy, sortOrder]);

  // ── Client-side processing ─────────────────────────────────────────────────
  const processedData = React.useMemo<T[]>(() => {
    if (!clientSide) return data;

    let rows = [...data];

    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(row =>
        columns.some(col => {
          const val = col.getValue
            ? col.getValue(row)
            : (row as Record<string, unknown>)[col.key];
          return String(val ?? "").toLowerCase().includes(q);
        })
      );
    }

    if (sortBy) {
      const col = columns.find(c => c.key === sortBy);
      rows.sort((a, b) => {
        const av = col?.getValue ? col.getValue(a) : (a as Record<string, unknown>)[sortBy];
        const bv = col?.getValue ? col.getValue(b) : (b as Record<string, unknown>)[sortBy];
        if (av == null && bv == null) return 0;
        if (av == null) return sortOrder === "asc" ? -1 : 1;
        if (bv == null) return sortOrder === "asc" ?  1 : -1;
        if (typeof av === "number" && typeof bv === "number") {
          return sortOrder === "asc" ? av - bv : bv - av;
        }
        const cmp = String(av).localeCompare(String(bv));
        return sortOrder === "asc" ? cmp : -cmp;
      });
    }

    return rows;
  }, [clientSide, data, search, sortBy, sortOrder, columns]);

  const effectiveTotal = clientSide ? processedData.length : (total ?? 0);
  const totalPages     = Math.max(1, Math.ceil(effectiveTotal / pageSize));
  const displayData    = clientSide
    ? processedData.slice((page - 1) * pageSize, page * pageSize)
    : data;

  // ── Handlers ───────────────────────────────────────────────────────────────
  function handleSort(key: string) {
    if (sortBy === key) {
      setSortOrder(o => (o === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(key);
      setSortOrder("asc");
    }
    setPage(1);
  }

  function handlePageSizeChange(val: string | null) {
    if (!val) return;
    setPageSize(Number(val));
    setPage(1);
  }

  const pageNumbers = buildPageNumbers(page, totalPages);
  const skeletonRows = Math.min(pageSize, 8);

  const rangeStart = effectiveTotal === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd   = Math.min(page * pageSize, effectiveTotal);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className={cn("flex flex-col", className)}>

      {/* ── Toolbar ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 p-4 border-b border-border">
        <div className="relative flex-1 min-w-40 max-w-sm">
          <Search
            size={13}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
          />
          <Input
            placeholder={searchPlaceholder}
            className="pl-8 h-8 text-sm"
            value={rawSearch}
            onChange={e => setRawSearch(e.target.value)}
          />
        </div>

        {toolbar}
      </div>

      {/* ── Table ───────────────────────────────────────────────────────────── */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {columns.map(col => (
                <TableHead
                  key={col.key}
                  className={cn(
                    "text-xs select-none",
                    col.align && ALIGN_CLASS[col.align],
                    col.sortable && "cursor-pointer hover:text-foreground transition-colors"
                  )}
                  onClick={col.sortable ? () => handleSort(col.key) : undefined}
                >
                  <span className="inline-flex items-center gap-0.5">
                    {col.header}
                    {col.sortable && (
                      sortBy === col.key ? (
                        sortOrder === "asc"
                          ? <ChevronUp   size={12} className="text-primary shrink-0" />
                          : <ChevronDown size={12} className="text-primary shrink-0" />
                      ) : (
                        <ChevronsUpDown size={12} className="text-muted-foreground/40 shrink-0" />
                      )
                    )}
                  </span>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>

          <TableBody>
            {isLoading ? (
              Array.from({ length: skeletonRows }).map((_, i) => (
                <TableRow key={i} className="hover:bg-transparent">
                  {columns.map(col => (
                    <TableCell key={col.key} className="py-3">
                      <Skeleton className="h-4 rounded" style={{ width: `${60 + ((i * 17 + col.key.length * 7) % 30)}%` }} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : displayData.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={columns.length}
                  className="h-32 text-center text-sm text-muted-foreground"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              displayData.map((row, i) => (
                <motion.tr
                  key={rowKey(row)}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.025 }}
                  className={cn(
                    "border-b border-border/50 hover:bg-accent/40 transition-colors",
                    onRowClick && "cursor-pointer"
                  )}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
                  {columns.map(col => (
                    <TableCell
                      key={col.key}
                      className={cn("py-3", col.align && ALIGN_CLASS[col.align])}
                    >
                      {col.cell(row, i)}
                    </TableCell>
                  ))}
                </motion.tr>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── Pagination footer ───────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-border">

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="hidden sm:inline">Rows per page</span>
          <Select value={String(pageSize)} onValueChange={handlePageSizeChange}>
            <SelectTrigger className="h-7 w-16 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map(n => (
                <SelectItem key={n} value={String(n)} className="text-xs">{n}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="tabular-nums">
            {effectiveTotal === 0 ? "0 records" : `${rangeStart}–${rangeEnd} of ${effectiveTotal}`}
          </span>
        </div>

        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost" size="icon" className="h-7 w-7"
            disabled={page <= 1}
            onClick={() => setPage(1)}
            aria-label="First page"
          >
            <ChevronsLeft size={13} />
          </Button>
          <Button
            variant="ghost" size="icon" className="h-7 w-7"
            disabled={page <= 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}
            aria-label="Previous page"
          >
            <ChevronLeft size={13} />
          </Button>

          {pageNumbers.map((p, idx) =>
            p === "…" ? (
              <span key={`ellipsis-${idx}`} className="w-7 text-center text-xs text-muted-foreground select-none">
                …
              </span>
            ) : (
              <Button
                key={p}
                variant={page === p ? "default" : "ghost"}
                size="icon"
                className="h-7 w-7 text-xs"
                onClick={() => setPage(p as number)}
                aria-label={`Page ${p}`}
                aria-current={page === p ? "page" : undefined}
              >
                {p}
              </Button>
            )
          )}

          <Button
            variant="ghost" size="icon" className="h-7 w-7"
            disabled={page >= totalPages}
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            aria-label="Next page"
          >
            <ChevronRight size={13} />
          </Button>
          <Button
            variant="ghost" size="icon" className="h-7 w-7"
            disabled={page >= totalPages}
            onClick={() => setPage(totalPages)}
            aria-label="Last page"
          >
            <ChevronsRight size={13} />
          </Button>
        </div>
      </div>
    </div>
  );
}
