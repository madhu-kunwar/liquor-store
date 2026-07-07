"use client";

import { motion } from "framer-motion";
import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DataTable, type ColumnDef, type TableParams } from "@/components/shared/data-table";
import { ExportButton } from "@/components/shared/export-button";
import { BarcodeScanner } from "@/components/shared/barcode-scanner";
import { Loader2, PackagePlus, ArrowDownToLine, ScanLine, Plus, Minus, History, ExternalLink } from "lucide-react";
import { useStockIn, useStockMovements, useAdjustStock, useProductLedger } from "@/lib/hooks/use-inventory";
import { useSuppliers } from "@/lib/hooks/use-suppliers";
import { useProducts } from "@/lib/hooks/use-products";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

type LedgerRow = {
  id: string; product: string; brand: string; sku: string;
  category: string; unit: string; size?: string;
  totalIn: number; totalOut: number; currentStock: number; reorderPoint: number;
};

type Movement = {
  id: string;
  variantId: string;
  type: string;
  quantity: number;
  balanceAfter: number;
  referenceId?: string;
  reason?: string;
  createdAt: string;
  variant: { unit: string; size?: string; product: { name: string; sku: string } };
  createdBy: { name: string };
};

type GroupedMovement = {
  variantId: string;
  product: string;
  sku: string;
  unit: string;
  size?: string;
  latestDate: string;
  totalQty: number;
  latestBalance: number;
};

const TYPE_CFG: Record<string, { label: string; color: string }> = {
  PURCHASE:   { label: "Stock In",   color: "text-emerald-500" },
  SALE:       { label: "Sale",       color: "text-orange-500"  },
  ADJUSTMENT: { label: "Adjustment", color: "text-blue-400"    },
  WASTAGE:    { label: "Wastage",    color: "text-red-400"     },
  RETURN:     { label: "Return",     color: "text-purple-400"  },
};

type FormValues = {
  variantId: string;
  supplierId: string;
  quantity: number;
  purchasePrice: number;
  invoiceNumber: string;
  notes: string;
};

export default function StockInPage() {
  const [tableParams, setTableParams] = useState<TableParams>({
    page: 1, limit: 20, search: "", sortBy: "", sortOrder: "asc",
  });

  const { data: suppliersData } = useSuppliers();
  const { data: productsData }  = useProducts();
  const stockIn                 = useStockIn();
  const adjustStock             = useAdjustStock();

  // Quick +/- action per row
  const [actionTarget, setActionTarget] = useState<LedgerRow | null>(null);
  const [actionType,   setActionType  ] = useState<"add" | "sale">("add");
  const [actionQty,    setActionQty   ] = useState(1);
  const [actionPrice,  setActionPrice ] = useState(0);
  const [actionDate,   setActionDate  ] = useState(() => new Date().toISOString().slice(0, 10));
  const [actionNotes,  setActionNotes ] = useState("");

  // History popup
  const [histVariant, setHistVariant] = useState<LedgerRow | null>(null);

  const today_ = new Date().toISOString().slice(0, 10);

  const openAction = (row: LedgerRow, type: "add" | "sale") => {
    setActionTarget(row);
    setActionType(type);
    setActionQty(1);
    setActionPrice(0);
    setActionDate(today_);
    setActionNotes("");
  };

  const handleAction = async () => {
    if (!actionTarget) return;
    if (actionType === "add") {
      await stockIn.mutateAsync({ variantId: actionTarget.id, quantity: actionQty, notes: actionNotes || undefined, date: actionDate });
    } else {
      await adjustStock.mutateAsync({ variantId: actionTarget.id, quantity: -actionQty, reason: actionNotes || `Quick sale – ${actionDate}`, type: "SALE" as any, date: actionDate });
    }
    setActionTarget(null);
  };

  const apiQuery = useMemo(() => ({
    type: "PURCHASE",
    limit: 500,
    sortBy: "createdAt",
    sortOrder: "desc" as const,
    ...(tableParams.search && { search: tableParams.search }),
  }), [tableParams.search]);

  const { data: movRes, isLoading } = useStockMovements(apiQuery);
  const { data: ledgerRaw }         = useProductLedger();
  const ledger: LedgerRow[]         = useMemo(() => (ledgerRaw as LedgerRow[] | undefined) ?? [], [ledgerRaw]);

  const movements: Movement[] = useMemo(() => (movRes as any)?.data ?? [], [movRes]);

  const groupedMovements = useMemo<GroupedMovement[]>(() => {
    const map = new Map<string, GroupedMovement>();
    for (const m of movements) {
      const vid = m.variantId;
      const ex = map.get(vid);
      if (ex) {
        ex.totalQty += m.quantity;
        if (m.createdAt > ex.latestDate) { ex.latestDate = m.createdAt; ex.latestBalance = m.balanceAfter; }
      } else {
        map.set(vid, { variantId: vid, product: m.variant.product.name, sku: m.variant.product.sku, unit: m.variant.unit, size: m.variant.size, latestDate: m.createdAt, totalQty: m.quantity, latestBalance: m.balanceAfter });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.latestDate.localeCompare(a.latestDate));
  }, [movements]);

  const histQuery = useMemo(() =>
    histVariant ? { variantId: histVariant.id, limit: 200, sortBy: "createdAt", sortOrder: "desc" } : undefined,
  [histVariant]);
  const { data: histRaw, isLoading: histLoad } = useStockMovements(histQuery ?? {}, !!histVariant);
  const history: Movement[] = useMemo(() => histVariant ? ((histRaw as any)?.data ?? []) : [], [histRaw, histVariant]);

  const fmtFull = (d: string) => new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

  const suppliers: any[] = (suppliersData as any)?.data ?? [];
  const products: any[]  = (productsData as any)?.data ?? [];

  const allVariants = useMemo(() =>
    products.flatMap((p: any) =>
      (p.variants ?? []).filter((v: any) => v.isActive).map((v: any) => ({
        id: v.id,
        label: `${p.name} — ${v.unit}${v.size ? ` ${v.size}` : ""}`,
        costPrice: Number(v.costPrice),
        currentStock: v.currentStock,
      }))
    ), [products]);

  const [scanOpen, setScanOpen] = useState(false);

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<FormValues>({
    defaultValues: { variantId: "", supplierId: "", quantity: 1, purchasePrice: 0, invoiceNumber: "", notes: "" },
  });

  const selectedVariantId  = watch("variantId");
  const selectedSupplierId = watch("supplierId");
  const selectedVariant    = allVariants.find(v => v.id === selectedVariantId);
  const selectedSupplier   = suppliers.find((s: any) => s.id === selectedSupplierId);

  const handleBarcodeScan = async (barcode: string) => {
    try {
      const variant = await api.get(`/products/barcode/${encodeURIComponent(barcode)}`) as any;
      const matched = allVariants.find(v => v.id === variant.id);
      if (matched) { setValue("variantId", matched.id); setValue("purchasePrice", matched.costPrice); }
    } catch {}
  };

  const onSubmit = async (data: FormValues) => {
    await stockIn.mutateAsync({
      variantId: data.variantId, quantity: Number(data.quantity),
      supplierId: data.supplierId || undefined, invoiceNumber: data.invoiceNumber || undefined,
      purchasePrice: data.purchasePrice ? Number(data.purchasePrice) : undefined,
      notes: data.notes || undefined,
    });
    reset();
  };

  const handleParams = useCallback((p: TableParams) => setTableParams(p), []);

  const columns = useMemo<ColumnDef<GroupedMovement>[]>(() => [
    {
      key: "_actions",
      header: "",
      cell: g => {
        const lr = ledger.find(r => r.id === g.variantId);
        return (
          <div className="flex items-center gap-1">
            <Button size="icon" className="h-6 w-6 bg-emerald-600 hover:bg-emerald-700 text-white shrink-0" title="Add more stock" disabled={!lr} onClick={e => { e.stopPropagation(); if (lr) openAction(lr, "add"); }}>
              <Plus size={11} />
            </Button>
            <Button size="icon" variant="outline" className="h-6 w-6 border-orange-400 text-orange-500 hover:bg-orange-500 hover:text-white shrink-0" title="Record sale" disabled={!lr || lr.currentStock === 0} onClick={e => { e.stopPropagation(); if (lr) openAction(lr, "sale"); }}>
              <Minus size={11} />
            </Button>
          </div>
        );
      },
    },
    {
      key: "product",
      header: "Product",
      getValue: g => g.product,
      cell: g => (
        <div>
          <p className="text-sm font-medium">{g.product}</p>
          <p className="text-[10px] font-mono text-muted-foreground">{g.sku} · {g.size ?? g.unit}</p>
        </div>
      ),
    },
    {
      key: "latestDate",
      header: "Last Received",
      sortable: true,
      getValue: g => g.latestDate,
      cell: g => <span className="text-xs text-muted-foreground whitespace-nowrap">{new Date(g.latestDate).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>,
    },
    {
      key: "totalQty",
      header: "Total In",
      align: "right",
      sortable: true,
      getValue: g => g.totalQty,
      cell: g => <span className="text-sm font-semibold text-emerald-500 tabular-nums">+{g.totalQty}</span>,
    },
    {
      key: "latestBalance",
      header: "Balance",
      align: "right",
      sortable: true,
      getValue: g => g.latestBalance,
      cell: g => <span className="text-sm tabular-nums font-medium">{g.latestBalance}</span>,
    },
  ], []);

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Stock In</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Record direct stock receipts without a purchase order</p>
        </div>
      </motion.div>

      {/* Form */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
        <Card>
          <CardHeader className="pb-4 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <PackagePlus size={14} /> Receive Stock
            </CardTitle>
            <Button type="button" variant="outline" size="sm" className="h-7 gap-1.5 text-xs" onClick={() => setScanOpen(true)}>
              <ScanLine size={12} /> Scan Barcode
            </Button>
          </CardHeader>

          <BarcodeScanner open={scanOpen} onClose={() => setScanOpen(false)} onScan={handleBarcodeScan} />
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-1.5 lg:col-span-1">
                  <Label className="text-xs">Product Variant *</Label>
                  <Select value={selectedVariantId || undefined} onValueChange={(v) => {
                    if (!v) return;
                    setValue("variantId", v as string);
                    const vari = allVariants.find(a => a.id === v);
                    if (vari) setValue("purchasePrice", vari.costPrice);
                  }}>
                    <SelectTrigger className="text-sm"><SelectValue placeholder="Select product...">{selectedVariant?.label}</SelectValue></SelectTrigger>
                    <SelectContent className="min-w-[480px] max-h-72">
                      {allVariants.map(v => (
                        <SelectItem key={v.id} value={v.id} label={`${v.label} (${v.currentStock} in stock)`}>
                          <span>{v.label}</span>
                          <span className="ml-2 text-muted-foreground text-xs">({v.currentStock} in stock)</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedVariant && <p className="text-[10px] text-muted-foreground">Current stock: {selectedVariant.currentStock} units</p>}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Supplier</Label>
                  <Select value={selectedSupplierId || undefined} onValueChange={(v) => v && setValue("supplierId", v as string)}>
                    <SelectTrigger className="text-sm"><SelectValue placeholder="Select supplier (optional)">{selectedSupplier?.name}</SelectValue></SelectTrigger>
                    <SelectContent>
                      {suppliers.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Invoice Number</Label>
                  <Input {...register("invoiceNumber")} placeholder="e.g. INV-2024-001" className="text-sm font-mono" />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Quantity *</Label>
                  <Input type="number" min={1} {...register("quantity", { required: true, min: 1, valueAsNumber: true })} className="text-sm" />
                  {errors.quantity && <p className="text-xs text-destructive">Quantity must be at least 1</p>}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Purchase Price (रू)</Label>
                  <Input type="number" step="0.01" min={0} {...register("purchasePrice", { valueAsNumber: true })} className="text-sm" />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Notes</Label>
                  <Input {...register("notes")} placeholder="Optional note..." className="text-sm" />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button type="submit" disabled={stockIn.isPending || !selectedVariantId} className="gap-2">
                  {stockIn.isPending
                    ? <><Loader2 size={14} className="animate-spin" /> Adding...</>
                    : <><ArrowDownToLine size={14} /> Add to Stock</>
                  }
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>

      {/* Grouped receipts table */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold">Stock Receipts by Product <span className="text-muted-foreground font-normal">(click row for history)</span></h2>
          <ExportButton
            filename="stock-in"
            sheetName="Stock In"
            data={movements.map(m => ({
              Date: new Date(m.createdAt).toLocaleString(),
              Product: m.variant.product.name,
              SKU: m.variant.product.sku,
              Variant: m.variant.size ?? m.variant.unit,
              "Qty Added": m.quantity,
              "Balance After": m.balanceAfter,
              "Invoice #": m.referenceId ?? "",
              Notes: m.reason ?? "",
              User: m.createdBy?.name ?? "",
            }))}
          />
        </div>
        <Card>
          <DataTable
            columns={columns}
            data={groupedMovements}
            rowKey={g => g.variantId}
            clientSide
            isLoading={isLoading}
            initialPageSize={20}
            initialSortBy="latestDate"
            initialSortOrder="desc"
            searchPlaceholder="Search product or SKU…"
            emptyMessage="No stock receipts yet"
            onRowClick={g => {
              const ledgerRow = ledger.find(r => r.id === g.variantId);
              if (ledgerRow) setHistVariant(ledgerRow);
            }}
          />
        </Card>
      </motion.div>

      {/* Quick +/- dialog */}
      <Dialog open={!!actionTarget} onOpenChange={o => !o && setActionTarget(null)}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle className={cn("flex items-center gap-2 text-sm", actionType === "add" ? "text-emerald-600" : "text-orange-500")}>
              {actionType === "add" ? <Plus size={14} /> : <Minus size={14} />}
              {actionType === "add" ? "Add Stock" : "Record Sale"}
            </DialogTitle>
          </DialogHeader>
          {actionTarget && (
            <div className="space-y-3 pt-1">
              <div className="rounded-md bg-muted px-3 py-2 text-xs">
                <p className="font-semibold">{actionTarget.product}</p>
                <p className="text-muted-foreground">{actionTarget.sku} · {actionTarget.size ?? actionTarget.unit}</p>
                <p className="text-muted-foreground mt-0.5">Current stock: <span className="font-semibold text-foreground">{actionTarget.currentStock}</span></p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Date</Label>
                  <Input type="date" value={actionDate} onChange={e => setActionDate(e.target.value)} className="text-sm h-8" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Quantity *</Label>
                  <Input
                    type="number" min={1}
                    max={actionType === "sale" ? actionTarget.currentStock : undefined}
                    value={actionQty}
                    onChange={e => setActionQty(Math.max(1, Number(e.target.value)))}
                    className="text-sm h-8 text-center font-semibold"
                  />
                </div>
              </div>

              {actionType === "sale" && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Unit Price (रू)</Label>
                  <Input type="number" step="0.01" min={0} value={actionPrice} onChange={e => setActionPrice(Number(e.target.value))} className="text-sm h-8" />
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-xs">Notes</Label>
                <Input value={actionNotes} onChange={e => setActionNotes(e.target.value)} placeholder="Optional…" className="text-sm h-8" />
              </div>

              {actionType === "sale" && actionQty > actionTarget.currentStock && (
                <p className="text-xs text-destructive font-medium">⚠ Only {actionTarget.currentStock} in stock</p>
              )}

              <div className="flex gap-2 pt-1">
                <Button variant="outline" className="flex-1 h-8 text-sm" onClick={() => setActionTarget(null)}>Cancel</Button>
                <Button
                  className={cn("flex-1 h-8 text-sm gap-1.5", actionType === "sale" && "bg-orange-500 hover:bg-orange-600")}
                  disabled={stockIn.isPending || adjustStock.isPending || (actionType === "sale" && actionQty > actionTarget.currentStock)}
                  onClick={handleAction}
                >
                  {(stockIn.isPending || adjustStock.isPending)
                    ? <><Loader2 size={12} className="animate-spin" /> Saving…</>
                    : actionType === "add" ? <><Plus size={12} /> Add {actionQty}</>
                    : <><Minus size={12} /> Sell {actionQty}</>
                  }
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* History popup */}
      <Dialog open={!!histVariant} onOpenChange={o => !o && setHistVariant(null)}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm">
              <History size={14} /> Movement History
            </DialogTitle>
            {histVariant && (
              <p className="text-xs text-muted-foreground">
                {histVariant.product} · {histVariant.sku} · {histVariant.size ?? histVariant.unit}
              </p>
            )}
          </DialogHeader>

          {histVariant && (
            <div className="grid grid-cols-3 gap-2 py-1">
              {[
                { label: "Total In",  value: histVariant.totalIn,      color: "text-emerald-500" },
                { label: "Total Out", value: histVariant.totalOut,     color: "text-orange-500"  },
                { label: "In Stock",  value: histVariant.currentStock, color: histVariant.currentStock === 0 ? "text-destructive" : "text-blue-500" },
              ].map(c => (
                <div key={c.label} className="rounded-md bg-muted px-3 py-2 text-center">
                  <p className={cn("text-lg font-bold tabular-nums", c.color)}>{c.value}</p>
                  <p className="text-[10px] text-muted-foreground">{c.label}</p>
                </div>
              ))}
            </div>
          )}

          <div className="flex-1 overflow-auto rounded-md border border-border">
            {histLoad ? (
              <div className="p-4 space-y-2">
                {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-10 bg-muted animate-pulse rounded" />)}
              </div>
            ) : history.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">No movements recorded</p>
            ) : (
              <table className="w-full text-xs border-collapse">
                <thead className="sticky top-0 bg-card border-b border-border">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold">Date & Time</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold">Type</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold">Change</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold">Balance</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((m, i) => {
                    const cfg = TYPE_CFG[m.type] ?? { label: m.type, color: "text-muted-foreground" };
                    return (
                      <tr key={m.id} className={cn("border-b border-border/40 hover:bg-accent/30", i % 2 === 0 ? "bg-accent/10" : "")}>
                        <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{fmtFull(m.createdAt)}</td>
                        <td className="px-3 py-2">
                          <Badge variant="outline" className={cn("text-[9px] h-4 px-1.5", cfg.color, "border-current bg-current/10")}>
                            {cfg.label}
                          </Badge>
                        </td>
                        <td className={cn("px-3 py-2 text-right font-bold tabular-nums", m.quantity > 0 ? "text-emerald-500" : "text-orange-500")}>
                          {m.quantity > 0 ? "+" : ""}{m.quantity}
                        </td>
                        <td className="px-3 py-2 text-right font-semibold tabular-nums text-blue-500">{m.balanceAfter}</td>
                        <td className="px-3 py-2 text-muted-foreground truncate max-w-[120px]">
                          {m.referenceId ? `#${m.referenceId} ` : ""}{m.reason ?? "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          <div className="flex gap-2 pt-1 flex-wrap">
            <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs" onClick={() => { if (histVariant) openAction(histVariant, "add"); setHistVariant(null); }}>
              <Plus size={11} /> Add Stock
            </Button>
            <Button size="sm" className="gap-1.5 h-8 text-xs bg-orange-500 hover:bg-orange-600" disabled={histVariant?.currentStock === 0} onClick={() => { if (histVariant) openAction(histVariant, "sale"); setHistVariant(null); }}>
              <Minus size={11} /> Record Sale
            </Button>
            {histVariant && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 h-8 text-xs"
                render={<Link href={`/inventory/history/${histVariant.id}?name=${encodeURIComponent(histVariant.product)}&sku=${encodeURIComponent(histVariant.sku)}`} />}
                nativeButton={false}
                onClick={() => setHistVariant(null)}
              >
                <ExternalLink size={11} /> View Full History
              </Button>
            )}
            <Button variant="ghost" size="sm" className="ml-auto h-8 text-xs" onClick={() => setHistVariant(null)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
