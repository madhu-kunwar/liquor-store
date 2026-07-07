"use client";

import { motion } from "framer-motion";
import { useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { PlusCircle, Boxes, PackageCheck, PackageX } from "lucide-react";
import { useProducts } from "@/lib/hooks/use-products";
import { ExportButton } from "@/components/shared/export-button";
import { DataTable, type ColumnDef, type TableParams } from "@/components/shared/data-table";
import { useStockMovements, useInventorySummary, useAdjustStock, useProductLedger } from "@/lib/hooks/use-inventory";
import { cn } from "@/lib/utils";

type Movement = {
  id: string;
  type: string;
  quantity: number;
  balanceAfter: number;
  reason?: string;
  createdAt: string;
  variant: {
    unit: string;
    size?: string;
    product: { name: string; sku: string; category: { name: string } };
  };
};

type LedgerRow = {
  id: string;
  product: string;
  brand: string;
  sku: string;
  category: string;
  unit: string;
  size?: string;
  totalIn: number;
  totalOut: number;
  currentStock: number;
  reorderPoint: number;
};

const TYPE_CFG: Record<string, { label: string; bg: string }> = {
  PURCHASE:   { label: "Purchase",   bg: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" },
  SALE:       { label: "Sale",       bg: "bg-primary/10 text-primary border-primary/20" },
  ADJUSTMENT: { label: "Adjustment", bg: "bg-blue-400/10 text-blue-400 border-blue-400/20" },
  WASTAGE:    { label: "Wastage",    bg: "bg-red-400/10 text-red-400 border-red-400/20" },
  RETURN:     { label: "Return",     bg: "bg-purple-400/10 text-purple-400 border-purple-400/20" },
  TRANSFER:   { label: "Transfer",   bg: "bg-yellow-400/10 text-yellow-400 border-yellow-400/20" },
};

function fmt(n: number) {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n);
}

export default function InventoryPage() {
  const [open, setOpen] = useState(false);
  const [tableParams, setTableParams] = useState<TableParams>({
    page: 1, limit: 20, search: "", sortBy: "", sortOrder: "asc",
  });

  const apiQuery = useMemo(() => ({
    page: tableParams.page,
    limit: tableParams.limit,
    ...(tableParams.search && { search: tableParams.search }),
    ...(tableParams.sortBy && { sortBy: tableParams.sortBy, sortOrder: tableParams.sortOrder }),
  }), [tableParams]);

  const { data: movRes, isLoading }     = useStockMovements(apiQuery);
  const { data: summaryData }           = useInventorySummary();
  const { data: ledgerData, isLoading: ledgerLoading } = useProductLedger();
  const { data: productsData }          = useProducts();
  const adjustStock                     = useAdjustStock();

  const allVariants = useMemo(() => {
    const products: any[] = (productsData as any)?.data ?? [];
    return products.flatMap((p: any) =>
      (p.variants ?? []).filter((v: any) => v.isActive).map((v: any) => ({
        id: v.id,
        label: `${p.name} — ${v.unit}${v.size ? ` ${v.size}` : ""}`,
        currentStock: v.currentStock,
      }))
    );
  }, [productsData]);

  const movRaw    = movRes as { data: Movement[]; meta: { total: number } } | undefined;
  const movements = movRaw?.data ?? [];
  const total     = movRaw?.meta?.total ?? 0;
  const ledger    = (ledgerData as LedgerRow[] | undefined) ?? [];

  const summary = summaryData as {
    totalVariants: number; totalStock: number; totalValue: number;
    lowStockCount: number; outOfStockCount: number;
  } | undefined;

  const [adjVariantId, setAdjVariantId] = useState("");
  const [adjType, setAdjType]           = useState<"add" | "remove">("add");
  const [adjQty, setAdjQty]             = useState(1);
  const [adjReason, setAdjReason]       = useState("");

  const handleAdjust = async () => {
    if (!adjVariantId || !adjReason.trim()) return;
    try {
      await adjustStock.mutateAsync({
        variantId: adjVariantId,
        quantity: adjType === "add" ? adjQty : -adjQty,
        reason: adjReason,
        type: "ADJUSTMENT" as any,
      });
      setOpen(false);
      setAdjVariantId(""); setAdjType("add"); setAdjQty(1); setAdjReason("");
    } catch {
      // onError toast is handled by the mutation's onError callback
    }
  };

  const handleParams = useCallback((p: TableParams) => setTableParams(p), []);

  const movColumns = useMemo<ColumnDef<Movement>[]>(() => [
    {
      key: "product",
      header: "Product",
      cell: m => (
        <div>
          <p className="text-sm font-medium">{m.variant.product.name}</p>
          <p className="text-[10px] font-mono text-muted-foreground">
            {m.variant.product.sku} · {m.variant.size ?? m.variant.unit}
          </p>
        </div>
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
      header: "Qty",
      align: "right",
      sortable: true,
      getValue: m => m.quantity,
      cell: m => (
        <span className={cn("text-sm font-medium tabular-nums", m.quantity > 0 ? "text-emerald-500" : "text-primary")}>
          {m.quantity > 0 ? "+" : ""}{m.quantity}
        </span>
      ),
    },
    {
      key: "balanceAfter",
      header: "Balance",
      align: "right",
      sortable: true,
      getValue: m => m.balanceAfter,
      cell: m => <span className="text-sm tabular-nums">{m.balanceAfter}</span>,
    },
    {
      key: "reason",
      header: "Reference",
      cell: m => <span className="text-xs font-mono text-muted-foreground">{m.reason ?? "—"}</span>,
    },
    {
      key: "createdAt",
      header: "Time",
      sortable: true,
      getValue: m => m.createdAt,
      cell: m => (
        <span className="text-xs text-muted-foreground">
          {new Date(m.createdAt).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
        </span>
      ),
    },
  ], []);

  const ledgerColumns = useMemo<ColumnDef<LedgerRow>[]>(() => [
    {
      key: "product",
      header: "Product",
      cell: r => (
        <div>
          <p className="text-sm font-medium">{r.product}</p>
          <p className="text-[10px] text-muted-foreground">{r.brand} · {r.size ?? r.unit}</p>
        </div>
      ),
    },
    {
      key: "sku",
      header: "SKU",
      getValue: r => r.sku,
      cell: r => <span className="text-xs font-mono text-muted-foreground">{r.sku}</span>,
    },
    {
      key: "category",
      header: "Category",
      getValue: r => r.category,
      cell: r => <span className="text-xs">{r.category}</span>,
    },
    {
      key: "totalIn",
      header: "Total In",
      align: "right",
      sortable: true,
      getValue: r => r.totalIn,
      cell: r => <span className="text-sm font-medium text-emerald-500 tabular-nums">{r.totalIn}</span>,
    },
    {
      key: "totalOut",
      header: "Total Out",
      align: "right",
      sortable: true,
      getValue: r => r.totalOut,
      cell: r => <span className="text-sm font-medium text-primary tabular-nums">{r.totalOut}</span>,
    },
    {
      key: "currentStock",
      header: "Current Stock",
      align: "right",
      sortable: true,
      getValue: r => r.currentStock,
      cell: r => {
        const isOut  = r.currentStock === 0;
        const isLow  = r.currentStock > 0 && r.currentStock <= r.reorderPoint;
        return (
          <div className="flex items-center justify-end gap-1.5">
            <span className={cn(
              "text-sm font-bold tabular-nums",
              isOut ? "text-destructive" : isLow ? "text-primary" : "text-emerald-500"
            )}>
              {r.currentStock}
            </span>
            {isOut  && <PackageX size={12} className="text-destructive" />}
            {isLow  && <PackageCheck size={12} className="text-primary" />}
          </div>
        );
      },
    },
  ], []);

  return (
    <div className="space-y-5">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Current Stock</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Live inventory — movements and product-level balances</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button size="sm" className="gap-1.5" />}>
            <PlusCircle size={14} /> Adjust Stock
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>Manual Stock Adjustment</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Product Variant</Label>
                <Select value={adjVariantId} onValueChange={v => v && setAdjVariantId(v)}>
                  <SelectTrigger className="text-sm"><SelectValue placeholder="Select product…">{adjVariantId ? allVariants.find(v => v.id === adjVariantId)?.label : undefined}</SelectValue></SelectTrigger>
                  <SelectContent className="min-w-[480px] max-h-72">
                    {allVariants.map(v => (
                      <SelectItem key={v.id} value={v.id} label={`${v.label} (${v.currentStock} in stock)`}>
                        {v.label}
                        <span className="ml-2 text-xs text-muted-foreground">({v.currentStock} in stock)</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Direction</Label>
                  <Select value={adjType} onValueChange={v => setAdjType(v as "add" | "remove")}>
                    <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="add">+ Add stock</SelectItem>
                      <SelectItem value="remove">- Remove stock</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Quantity</Label>
                  <Input type="number" min={1} value={adjQty} onChange={e => setAdjQty(Number(e.target.value))} className="text-sm" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Reason <span className="text-destructive">*</span></Label>
                <Textarea placeholder="Explain this adjustment…" className="text-sm resize-none h-20" value={adjReason} onChange={e => setAdjReason(e.target.value)} />
              </div>
              <div className="flex gap-2 pt-1">
                <Button variant="outline" className="flex-1 text-sm" onClick={() => setOpen(false)}>Cancel</Button>
                <Button className="flex-1 text-sm" onClick={handleAdjust} disabled={adjustStock.isPending || !adjVariantId || !adjReason.trim()}>
                  Apply Adjustment
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </motion.div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Stock Value",    value: summary ? `रू${fmt(summary.totalValue)}` : null, sub: "Cost × stock" },
          { label: "Total Units",    value: summary?.totalStock ?? null,                      sub: "Across all variants" },
          { label: "Low Stock",      value: summary?.lowStockCount ?? null,                   sub: "At or below reorder pt", alert: true },
          { label: "Out of Stock",   value: summary?.outOfStockCount ?? null,                 sub: "Zero inventory", danger: true },
        ].map((card, i) => (
          <motion.div key={card.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.06 }}>
            <Card className={cn("p-4", card.alert && "border-primary/20", card.danger && "border-destructive/20")}>
              {card.value === null
                ? <Skeleton className="h-8 w-20 mb-1" />
                : <p className="text-2xl font-bold">{card.value}</p>
              }
              <p className="text-xs font-medium mt-1">{card.label}</p>
              <p className="text-[11px] text-muted-foreground">{card.sub}</p>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Tabs: Movements | Product Ledger */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}>
        <Tabs defaultValue="ledger">
          <div className="flex items-center justify-between mb-3">
            <TabsList className="h-8">
              <TabsTrigger value="ledger" className="text-xs h-7 px-3">
                <Boxes size={12} className="mr-1.5" /> Product Ledger
              </TabsTrigger>
              <TabsTrigger value="movements" className="text-xs h-7 px-3">
                All Movements
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Product Ledger */}
          <TabsContent value="ledger" className="mt-0">
            <div className="flex justify-end mb-2">
              <ExportButton
                filename="current-stock"
                sheetName="Stock Ledger"
                data={ledger.map(r => ({
                  Product: r.product,
                  Brand: r.brand,
                  SKU: r.sku,
                  Category: r.category,
                  Variant: r.size ?? r.unit,
                  "Total In": r.totalIn,
                  "Total Out": r.totalOut,
                  "Current Stock": r.currentStock,
                  "Reorder Point": r.reorderPoint,
                }))}
              />
            </div>
            <div className="overflow-x-auto">
              <DataTable<LedgerRow>
                columns={ledgerColumns}
                data={ledger}
                rowKey={r => r.id}
                clientSide
                isLoading={ledgerLoading}
                initialPageSize={20}
                searchPlaceholder="Search product or SKU…"
                emptyMessage="No inventory data."
              />
            </div>
          </TabsContent>

          {/* All Movements */}
          <TabsContent value="movements" className="mt-0">
            <div className="flex justify-end mb-2">
              <ExportButton
                filename="stock-movements"
                sheetName="Movements"
                data={movements.map(m => ({
                  Product: m.variant.product.name,
                  SKU: m.variant.product.sku,
                  Variant: m.variant.size ?? m.variant.unit,
                  Type: m.type,
                  Quantity: m.quantity,
                  "Balance After": m.balanceAfter,
                  Reference: m.reason,
                  Time: new Date(m.createdAt).toLocaleString(),
                }))}
              />
            </div>
            <Card>
              <DataTable<Movement>
                columns={movColumns}
                data={movements}
                rowKey={m => m.id}
                total={total}
                isLoading={isLoading}
                onParamsChange={handleParams}
                initialPageSize={20}
                searchPlaceholder="Search movements…"
                emptyMessage="No stock movements found."
              />
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}
