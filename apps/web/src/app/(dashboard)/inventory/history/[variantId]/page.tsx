"use client";

import { motion } from "framer-motion";
import { useState, useMemo, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, TrendingUp, TrendingDown, Layers } from "lucide-react";
import { ExportButton } from "@/components/shared/export-button";
import { DataTable, type ColumnDef, type TableParams } from "@/components/shared/data-table";
import { useStockMovements } from "@/lib/hooks/use-inventory";
import { cn } from "@/lib/utils";

type Movement = {
  id: string;
  type: string;
  quantity: number;
  balanceAfter: number;
  reason?: string;
  referenceId?: string;
  invoiceNumber?: string;
  createdAt: string;
  createdBy?: { name: string };
  supplier?: { name: string };
};

const TYPE_CFG: Record<string, { label: string; bg: string; sign: string }> = {
  PURCHASE:   { label: "Stock In",   bg: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20", sign: "+" },
  SALE:       { label: "Sale",       bg: "bg-orange-500/10 text-orange-500 border-orange-500/20",   sign: "-" },
  ADJUSTMENT: { label: "Adjustment", bg: "bg-blue-400/10 text-blue-400 border-blue-400/20",         sign: "±" },
  WASTAGE:    { label: "Wastage",    bg: "bg-red-400/10 text-red-400 border-red-400/20",             sign: "-" },
  RETURN:     { label: "Return",     bg: "bg-purple-400/10 text-purple-400 border-purple-400/20",   sign: "+" },
  TRANSFER:   { label: "Transfer",   bg: "bg-yellow-400/10 text-yellow-500 border-yellow-400/20",   sign: "±" },
};

export default function VariantHistoryPage() {
  const { variantId } = useParams<{ variantId: string }>();
  const searchParams  = useSearchParams();
  const productName   = searchParams.get("name") ?? "Product";
  const sku           = searchParams.get("sku") ?? "";

  const [tableParams, setTableParams] = useState<TableParams>({
    page: 1, limit: 50, search: "", sortBy: "createdAt", sortOrder: "desc",
  });

  const apiQuery = useMemo(() => ({
    variantId,
    page:      tableParams.page,
    limit:     tableParams.limit,
    sortBy:    tableParams.sortBy || "createdAt",
    sortOrder: tableParams.sortOrder,
  }), [variantId, tableParams]);

  const { data: raw, isLoading } = useStockMovements(apiQuery);
  const movRaw    = raw as { data: Movement[]; meta: { total: number } } | undefined;
  const movements = movRaw?.data ?? [];
  const total     = movRaw?.meta?.total ?? 0;

  // Aggregate stats from loaded page
  const totalIn  = movements.filter(m => m.quantity > 0).reduce((a, m) => a + m.quantity, 0);
  const totalOut = movements.filter(m => m.quantity < 0).reduce((a, m) => a + Math.abs(m.quantity), 0);
  const latest   = movements[0];

  const handleParams = useCallback((p: TableParams) => setTableParams(p), []);

  const columns = useMemo<ColumnDef<Movement>[]>(() => [
    {
      key: "createdAt",
      header: "Date & Time",
      sortable: true,
      getValue: m => m.createdAt,
      cell: m => (
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {new Date(m.createdAt).toLocaleString("en-IN", {
            day: "2-digit", month: "short", year: "numeric",
            hour: "2-digit", minute: "2-digit",
          })}
        </span>
      ),
    },
    {
      key: "type",
      header: "Type",
      cell: m => {
        const cfg = TYPE_CFG[m.type] ?? { label: m.type, bg: "" };
        return <Badge variant="outline" className={`text-[10px] h-5 px-1.5 ${cfg.bg}`}>{cfg.label}</Badge>;
      },
    },
    {
      key: "quantity",
      header: "Change",
      align: "right",
      sortable: true,
      getValue: m => m.quantity,
      cell: m => {
        const cfg = TYPE_CFG[m.type];
        const isIn = m.quantity > 0;
        return (
          <span className={cn(
            "text-sm font-bold tabular-nums",
            isIn ? "text-emerald-500" : "text-orange-500"
          )}>
            {isIn ? "+" : ""}{m.quantity}
          </span>
        );
      },
    },
    {
      key: "balanceAfter",
      header: "Balance After",
      align: "right",
      sortable: true,
      getValue: m => m.balanceAfter,
      cell: m => (
        <span className="text-sm font-semibold tabular-nums text-blue-500">{m.balanceAfter}</span>
      ),
    },
    {
      key: "supplier",
      header: "Supplier",
      cell: m => (
        <span className="text-xs text-muted-foreground">{m.supplier?.name ?? "—"}</span>
      ),
    },
    {
      key: "invoiceNumber",
      header: "Invoice #",
      cell: m => (
        <span className="text-xs font-mono text-muted-foreground">
          {m.invoiceNumber ?? m.referenceId ?? "—"}
        </span>
      ),
    },
    {
      key: "reason",
      header: "Notes",
      cell: m => (
        <span className="text-xs text-muted-foreground truncate max-w-[160px] block">{m.reason ?? "—"}</span>
      ),
    },
    {
      key: "createdBy",
      header: "By",
      cell: m => <span className="text-xs text-muted-foreground">{m.createdBy?.name ?? "—"}</span>,
    },
  ], []);

  return (
    <div className="space-y-5">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
        <Button
          render={<Link href="/stock-register" />}
          nativeButton={false}
          variant="ghost"
          size="icon"
          className="h-8 w-8"
        >
          <ArrowLeft size={16} />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold tracking-tight">{productName}</h1>
          <p className="text-sm text-muted-foreground mt-0.5 font-mono">{sku} · Complete movement history</p>
        </div>
        <ExportButton
          filename={`history-${sku}`}
          sheetName="Movement History"
          data={movements.map(m => ({
            "Date & Time":   new Date(m.createdAt).toLocaleString(),
            Type:            TYPE_CFG[m.type]?.label ?? m.type,
            Change:          m.quantity,
            "Balance After": m.balanceAfter,
            Supplier:        m.supplier?.name ?? "",
            "Invoice #":     m.invoiceNumber ?? m.referenceId ?? "",
            Notes:           m.reason ?? "",
            By:              m.createdBy?.name ?? "",
          }))}
        />
      </motion.div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Entries",  value: total,   icon: <Layers size={14} />,      color: "" },
          { label: "Stock In (page)", value: totalIn,  icon: <TrendingUp size={14} />,  color: "text-emerald-500" },
          { label: "Stock Out (page)",value: totalOut, icon: <TrendingDown size={14} />, color: "text-orange-500" },
          { label: "Current Balance", value: latest?.balanceAfter ?? "—", icon: null, color: "text-blue-500 font-bold" },
        ].map((card, i) => (
          <motion.div key={card.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 + i * 0.05 }}>
            <Card className="p-4">
              <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                {card.icon}<span className="text-xs">{card.label}</span>
              </div>
              <p className={cn("text-2xl font-bold tabular-nums", card.color)}>{card.value}</p>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Full paginated table */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24 }}>
        <Card>
          <DataTable<Movement>
            columns={columns}
            data={movements}
            rowKey={m => m.id}
            total={total}
            isLoading={isLoading}
            onParamsChange={handleParams}
            initialPageSize={50}
            initialSortBy="createdAt"
            initialSortOrder="desc"
            searchPlaceholder="Filter by type, notes, invoice…"
            emptyMessage="No movements recorded for this variant."
          />
        </Card>
      </motion.div>
    </div>
  );
}
