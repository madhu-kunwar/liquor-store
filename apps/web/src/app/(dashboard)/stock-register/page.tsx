"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Minus, History, PackageX, PackageCheck, ScanLine, ExternalLink } from "lucide-react";
import { ExportButton } from "@/components/shared/export-button";
import { BarcodeScanner } from "@/components/shared/barcode-scanner";
import { useStockMovements, useProductLedger, useStockIn, useAdjustStock } from "@/lib/hooks/use-inventory";
import { useProducts } from "@/lib/hooks/use-products";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

type LedgerRow = {
  id: string; product: string; brand: string; sku: string;
  category: string; unit: string; size?: string;
  totalIn: number; totalOut: number; currentStock: number; reorderPoint: number;
};

type Movement = {
  id: string; type: string; quantity: number; balanceAfter: number;
  reason?: string; referenceId?: string; createdAt: string;
  createdBy?: { name: string };
  variant?: { id: string; unit: string; size?: string; product: { name: string; sku: string } };
};

const TYPE_CFG: Record<string, { label: string; color: string }> = {
  PURCHASE:   { label: "Stock In",   color: "text-emerald-500" },
  SALE:       { label: "Sale",       color: "text-orange-500"  },
  ADJUSTMENT: { label: "Adjustment", color: "text-blue-400"    },
  WASTAGE:    { label: "Wastage",    color: "text-red-400"     },
  RETURN:     { label: "Return",     color: "text-purple-400"  },
};

function today() { return new Date().toISOString().slice(0, 10); }

function ThG({ ch }: { ch: React.ReactNode }) {
  return <th className="px-2 py-2 text-[10px] font-semibold text-white text-left whitespace-nowrap">{ch}</th>;
}
function ThO({ ch }: { ch: React.ReactNode }) {
  return <th className="px-2 py-2 text-[10px] font-semibold text-white text-left whitespace-nowrap">{ch}</th>;
}
function ThB({ ch }: { ch: React.ReactNode }) {
  return <th className="px-2 py-2 text-[10px] font-semibold text-white text-left whitespace-nowrap">{ch}</th>;
}
function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={cn("px-2 py-1.5 text-xs border-b border-border/40 align-middle", className)}>{children}</td>;
}
function SkeletonRows() {
  return <>{Array.from({ length: 6 }).map((_, i) => (
    <tr key={i}>{Array.from({ length: 5 }).map((_, j) => (
      <td key={j} className="px-2 py-1.5 border-b border-border/40">
        <div className="h-3 bg-muted animate-pulse rounded" style={{ width: j === 2 ? "70%" : "50%" }} />
      </td>
    ))}</tr>
  ))}</>;
}

export default function StockRegisterPage() {
  const today_ = today();
  const ninetyDaysAgo = (() => { const d = new Date(); d.setDate(d.getDate() - 90); return d.toISOString().slice(0, 10); })();

  // Date range for movement tables
  const [dateFrom, setDateFrom] = useState(ninetyDaysAgo);
  const [dateTo, setDateTo]     = useState(today_);

  // Action dialogs
  const [actionVariant, setActionVariant] = useState<LedgerRow | null>(null);
  const [actionType, setActionType]       = useState<"add" | "sale">("add");
  const [actionQty, setActionQty]         = useState(1);
  const [actionPrice, setActionPrice]     = useState(0);
  const [actionDate, setActionDate]       = useState(today_);
  const [actionNotes, setActionNotes]     = useState("");

  // History dialog
  const [histVariant, setHistVariant] = useState<LedgerRow | null>(null);
  const [histShowActions, setHistShowActions] = useState(true);

  // Barcode
  const [scanOpen, setScanOpen] = useState(false);

  const stockIn    = useStockIn();
  const adjustStock = useAdjustStock();
  const { data: productsData } = useProducts();

  const products: any[] = (productsData as any)?.data ?? [];
  const allVariants = useMemo(() => products.flatMap((p: any) =>
    (p.variants ?? []).filter((v: any) => v.isActive).map((v: any) => ({
      id: v.id, label: `${p.name} — ${v.unit}${v.size ? ` ${v.size}` : ""}`,
      costPrice: Number(v.costPrice), sellingPrice: Number(v.sellingPrice), currentStock: v.currentStock,
    }))), [products]);

  // Data
  const inQuery  = useMemo(() => ({ type: "PURCHASE", dateFrom, dateTo, limit: 200, sortBy: "createdAt", sortOrder: "desc" }), [dateFrom, dateTo]);
  const outQuery = useMemo(() => ({ type: "SALE",     dateFrom, dateTo, limit: 200, sortBy: "createdAt", sortOrder: "desc" }), [dateFrom, dateTo]);
  const histQuery = useMemo(() => histVariant ? { variantId: histVariant.id, limit: 200, sortBy: "createdAt", sortOrder: "desc" } : undefined, [histVariant]);

  const { data: inRaw,    isLoading: inLoad  } = useStockMovements(inQuery);
  const { data: outRaw,   isLoading: outLoad } = useStockMovements(outQuery);
  const { data: ledgerRaw, isLoading: ledgerLoad } = useProductLedger();
  const { data: histRaw,  isLoading: histLoad } = useStockMovements(histQuery ?? {}, !!histVariant);

  const stockInMovs:  Movement[] = useMemo(() => (inRaw  as any)?.data ?? [], [inRaw]);
  const stockOutMovs: Movement[] = useMemo(() => (outRaw as any)?.data ?? [], [outRaw]);
  const ledger:    LedgerRow[] = useMemo(() => (ledgerRaw as LedgerRow[] | undefined) ?? [], [ledgerRaw]);
  const history:   Movement[]  = useMemo(() => histVariant ? ((histRaw as any)?.data ?? []) : [], [histRaw, histVariant]);

  const groupedStockIn = useMemo(() => {
    const map = new Map<string, { variantId: string; product: string; sku: string; latestDate: string; totalQty: number }>();
    for (const m of stockInMovs) {
      const vid = m.variant?.id ?? m.id;
      const ex = map.get(vid);
      if (ex) {
        ex.totalQty += m.quantity;
        if (m.createdAt > ex.latestDate) ex.latestDate = m.createdAt;
      } else {
        map.set(vid, { variantId: vid, product: m.variant?.product?.name ?? "—", sku: m.variant?.product?.sku ?? "—", latestDate: m.createdAt, totalQty: m.quantity });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.latestDate.localeCompare(a.latestDate));
  }, [stockInMovs]);

  const fmt = (d: string) => new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "2-digit" });
  const fmtFull = (d: string) => new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

  const openAction = (row: LedgerRow, type: "add" | "sale") => {
    setActionVariant(row);
    setActionType(type);
    setActionQty(1);
    setActionDate(today_);
    setActionNotes("");
    setActionPrice(0);
  };

  const handleAction = async () => {
    if (!actionVariant) return;
    if (actionType === "add") {
      await stockIn.mutateAsync({ variantId: actionVariant.id, quantity: actionQty, notes: actionNotes || undefined, date: actionDate });
    } else {
      await adjustStock.mutateAsync({
        variantId: actionVariant.id, quantity: -actionQty,
        reason: actionNotes || `Quick sale – ${actionDate}`, type: "SALE" as any, date: actionDate,
      });
    }
    setActionVariant(null);
  };

  const handleBarcodeScan = async (barcode: string) => {
    try {
      const v = await api.get(`/products/barcode/${encodeURIComponent(barcode)}`) as any;
      const matched = allVariants.find(a => a.id === v.id);
      if (matched && actionVariant === null) {
        // Nothing open yet — open add dialog
        const ledgerRow = ledger.find(r => r.id === v.id);
        if (ledgerRow) openAction(ledgerRow, "add");
      }
    } catch {}
  };

  const isPending = stockIn.isPending || adjustStock.isPending;

  return (
    <div className="space-y-4">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Stock Register</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Stock-In · Stock-Out · Balance — click any balance row to see history</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Date range filter */}
          <div className="flex items-center gap-1.5">
            <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-8 text-xs w-32" />
            <span className="text-xs text-muted-foreground">→</span>
            <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-8 text-xs w-32" />
          </div>
          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => setScanOpen(true)}>
            <ScanLine size={12} /> Scan
          </Button>
          <ExportButton
            filename="stock-register"
            sheetName="Balance"
            data={ledger.map((r, i) => ({
              "#": i + 1, Product: r.product, Brand: r.brand, SKU: r.sku,
              Category: r.category, Variant: r.size ?? r.unit,
              "Total In": r.totalIn, "Total Out": r.totalOut, "Current Stock": r.currentStock,
              Status: r.currentStock === 0 ? "Out of Stock" : r.currentStock <= r.reorderPoint ? "Low Stock" : "",
            }))}
          />
        </div>
      </motion.div>

      {/* Three-panel layout */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_1fr_1.4fr] gap-4">

        {/* STOCK IN */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }} className="rounded-lg border border-border overflow-hidden flex flex-col">
          <div className="bg-emerald-600 px-3 py-2 flex items-center justify-between">
            <h2 className="text-sm font-bold text-white">Stock-In</h2>
            <span className="text-[10px] text-emerald-100">{dateFrom} → {dateTo}</span>
          </div>
          <div className="overflow-auto flex-1 [&::-webkit-scrollbar]:hidden" style={{ maxHeight: "68vh", scrollbarWidth: "none" }}>
            <table className="w-full border-collapse">
              <thead className="sticky top-0 bg-emerald-500/90">
                <tr><ThG ch="Sr" /><ThG ch="Date" /><ThG ch="Product" /><ThG ch="SKU" /><ThG ch="Qty" /><ThG ch="+" /></tr>
              </thead>
              <tbody>
                {inLoad && <SkeletonRows />}
                {!inLoad && groupedStockIn.length === 0 && (
                  <tr><td colSpan={6} className="px-3 py-8 text-center text-xs text-muted-foreground">No receipts in this period</td></tr>
                )}
                {groupedStockIn.map((g, i) => {
                  const ledgerRow = ledger.find(r => r.id === g.variantId);
                  return (
                  <tr
                    key={g.variantId}
                    onClick={() => { if (ledgerRow) { setHistShowActions(false); setHistVariant(ledgerRow); } }}
                    className={cn("hover:bg-emerald-500/5 cursor-pointer transition-colors", i % 2 === 0 ? "bg-emerald-500/[0.03]" : "")}
                  >
                    <Td className="text-muted-foreground">{i + 1}</Td>
                    <Td className="whitespace-nowrap text-muted-foreground">{fmt(g.latestDate)}</Td>
                    <Td><span className="font-medium">{g.product}</span></Td>
                    <Td className="font-mono text-muted-foreground text-[10px]">{g.sku}</Td>
                    <Td className="text-right font-semibold text-emerald-600 tabular-nums">+{g.totalQty}</Td>
                    <td className="px-2 py-1.5 text-xs border-b border-border/40 align-middle" onClick={e => e.stopPropagation()}>
                      <Button
                        size="icon"
                        className="h-6 w-6 bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={() => ledgerRow && openAction(ledgerRow, "add")}
                        disabled={!ledgerRow}
                        title="Add stock"
                      >
                        <Plus size={11} />
                      </Button>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-3 py-2 border-t border-border bg-emerald-500/5 flex justify-between">
            <span className="text-[10px] text-muted-foreground">{groupedStockIn.length} products</span>
            <span className="text-xs font-semibold text-emerald-600">Total: +{groupedStockIn.reduce((a, g) => a + g.totalQty, 0)}</span>
          </div>
        </motion.div>

        {/* STOCK OUT */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-lg border border-border overflow-hidden flex flex-col">
          <div className="bg-orange-500 px-3 py-2 flex items-center justify-between">
            <h2 className="text-sm font-bold text-white">Stock-Out</h2>
            <span className="text-[10px] text-orange-100">{dateFrom} → {dateTo}</span>
          </div>
          <div className="overflow-auto flex-1 [&::-webkit-scrollbar]:hidden" style={{ maxHeight: "68vh", scrollbarWidth: "none" }}>
            <table className="w-full border-collapse">
              <thead className="sticky top-0 bg-orange-400/90">
                <tr><ThO ch="Sr" /><ThO ch="Date" /><ThO ch="Product" /><ThO ch="SKU" /><ThO ch="Qty" /><ThO ch="-" /></tr>
              </thead>
              <tbody>
                {outLoad && <SkeletonRows />}
                {!outLoad && stockOutMovs.length === 0 && (
                  <tr><td colSpan={6} className="px-3 py-8 text-center text-xs text-muted-foreground">No sales in this period</td></tr>
                )}
                {stockOutMovs.map((m, i) => {
                  const ledgerRow = ledger.find(r => r.id === m.variant?.id);
                  return (
                  <tr key={m.id} className={cn("hover:bg-orange-500/5 transition-colors", i % 2 === 0 ? "bg-orange-500/[0.03]" : "")}>
                    <Td className="text-muted-foreground">{i + 1}</Td>
                    <Td className="whitespace-nowrap text-muted-foreground">{fmt(m.createdAt)}</Td>
                    <Td><span className="font-medium">{m.variant?.product?.name}</span></Td>
                    <Td className="font-mono text-muted-foreground text-[10px]">{m.variant?.product?.sku}</Td>
                    <Td className="text-right font-semibold text-orange-600 tabular-nums">{Math.abs(m.quantity)}</Td>
                    <td className="px-2 py-1.5 text-xs border-b border-border/40 align-middle">
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-6 w-6 border-orange-400 text-orange-500 hover:bg-orange-500 hover:text-white"
                        onClick={() => ledgerRow && openAction(ledgerRow, "sale")}
                        disabled={!ledgerRow || ledgerRow.currentStock === 0}
                        title="Record sale"
                      >
                        <Minus size={11} />
                      </Button>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-3 py-2 border-t border-border bg-orange-500/5 flex justify-between">
            <span className="text-[10px] text-muted-foreground">{stockOutMovs.length} entries</span>
            <span className="text-xs font-semibold text-orange-600">Total: -{stockOutMovs.reduce((a, m) => a + Math.abs(m.quantity), 0)}</span>
          </div>
        </motion.div>

        {/* BALANCE IN STOCK */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }} className="rounded-lg border border-border overflow-hidden flex flex-col">
          <div className="bg-blue-600 px-3 py-2 flex items-center justify-between">
            <h2 className="text-sm font-bold text-white">Balance-In-Stock</h2>
            <span className="text-[10px] text-blue-100">All time · click row for history</span>
          </div>
          <div className="overflow-auto flex-1 [&::-webkit-scrollbar]:hidden" style={{ maxHeight: "68vh", scrollbarWidth: "none" }}>
            <table className="w-full border-collapse">
              <thead className="sticky top-0 bg-blue-500/90">
                <tr>
                  <ThB ch="Sr" /><ThB ch="Product" /><ThB ch="SKU" />
                  <ThB ch="In" /><ThB ch="Out" /><ThB ch="Stock" />
                  <ThB ch="Alert" /><ThB ch="Actions" />
                </tr>
              </thead>
              <tbody>
                {ledgerLoad && <SkeletonRows />}
                {!ledgerLoad && ledger.length === 0 && (
                  <tr><td colSpan={8} className="px-3 py-8 text-center text-xs text-muted-foreground">No inventory data</td></tr>
                )}
                {ledger.map((r, i) => {
                  const isOut = r.currentStock === 0;
                  const isLow = r.currentStock > 0 && r.currentStock <= r.reorderPoint;
                  return (
                    <tr
                      key={r.id}
                      onClick={() => { setHistShowActions(true); setHistVariant(r); }}
                      className={cn("hover:bg-blue-500/10 cursor-pointer transition-colors", i % 2 === 0 ? "bg-blue-500/[0.03]" : "")}
                    >
                      <Td className="text-muted-foreground">{i + 1}</Td>
                      <Td>
                        <p className="font-medium text-xs truncate max-w-[100px]">{r.product}</p>
                        <p className="text-[9px] text-muted-foreground">{r.size ?? r.unit}</p>
                      </Td>
                      <Td className="font-mono text-[10px] text-muted-foreground">{r.sku}</Td>
                      <Td className="text-right font-semibold text-emerald-600 tabular-nums">{r.totalIn}</Td>
                      <Td className="text-right font-semibold text-orange-600 tabular-nums">{r.totalOut}</Td>
                      <Td className={cn("text-right font-bold tabular-nums",
                        isOut ? "text-destructive" : isLow ? "text-primary" : "text-blue-600"
                      )}>
                        <span className="flex items-center justify-end gap-1">
                          {r.currentStock}
                          {isOut && <PackageX size={10} />}
                          {isLow && <PackageCheck size={10} />}
                        </span>
                      </Td>
                      <Td>
                        {isOut && <span className="text-[9px] font-semibold text-destructive bg-destructive/10 border border-destructive/20 rounded px-1 py-0.5 whitespace-nowrap">Out</span>}
                        {isLow && <span className="text-[9px] font-semibold text-primary bg-primary/10 border border-primary/20 rounded px-1 py-0.5 whitespace-nowrap">Low</span>}
                      </Td>
                      <td className="px-2 py-1.5 text-xs border-b border-border/40 align-middle" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <Button
                            size="icon"
                            className="h-6 w-6 bg-emerald-600 hover:bg-emerald-700 text-white"
                            onClick={() => openAction(r, "add")}
                            title="Add stock"
                          >
                            <Plus size={11} />
                          </Button>
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-6 w-6 border-orange-400 text-orange-500 hover:bg-orange-500 hover:text-white"
                            onClick={() => openAction(r, "sale")}
                            title="Record sale"
                            disabled={r.currentStock === 0}
                          >
                            <Minus size={11} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-3 py-2 border-t border-border bg-blue-500/5 flex justify-between">
            <span className="text-[10px] text-muted-foreground">{ledger.filter(r => r.currentStock === 0).length} out of stock</span>
            <span className="text-xs font-semibold text-blue-600">
              Total: {ledger.reduce((a, r) => a + r.currentStock, 0)} units
            </span>
          </div>
        </motion.div>
      </div>

      {/* ── ADD / SALE DIALOG ── */}
      <Dialog open={!!actionVariant} onOpenChange={o => !o && setActionVariant(null)}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle className={cn("flex items-center gap-2 text-sm", actionType === "add" ? "text-emerald-600" : "text-orange-500")}>
              {actionType === "add" ? <Plus size={14} /> : <Minus size={14} />}
              {actionType === "add" ? "Add Stock" : "Record Sale"}
            </DialogTitle>
          </DialogHeader>
          {actionVariant && (
            <div className="space-y-3 pt-1">
              <div className="rounded-md bg-muted px-3 py-2 text-xs">
                <p className="font-semibold">{actionVariant.product}</p>
                <p className="text-muted-foreground">{actionVariant.sku} · {actionVariant.size ?? actionVariant.unit}</p>
                <p className="text-muted-foreground mt-0.5">Current stock: <span className="font-semibold text-foreground">{actionVariant.currentStock}</span></p>
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
                    max={actionType === "sale" ? actionVariant.currentStock : undefined}
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

              {actionType === "sale" && actionQty > actionVariant.currentStock && (
                <p className="text-xs text-destructive font-medium">⚠ Only {actionVariant.currentStock} in stock</p>
              )}

              <div className="flex gap-2 pt-1">
                <Button variant="outline" className="flex-1 h-8 text-sm" onClick={() => setActionVariant(null)}>Cancel</Button>
                <Button
                  className={cn("flex-1 h-8 text-sm gap-1.5", actionType === "sale" && "bg-orange-500 hover:bg-orange-600")}
                  disabled={isPending || (actionType === "sale" && actionQty > actionVariant.currentStock)}
                  onClick={handleAction}
                >
                  {isPending
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

      {/* ── HISTORY DIALOG ── */}
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

          {/* Summary bar */}
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
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-10 bg-muted animate-pulse rounded" />
                ))}
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
                          <Badge variant="outline" className={cn("text-[9px] h-4 px-1.5", cfg.color, `border-current bg-current/10`)}>
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
            {histShowActions && <>
              <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs" onClick={() => { if (histVariant) openAction(histVariant, "add"); setHistVariant(null); }}>
                <Plus size={11} /> Add Stock
              </Button>
              <Button size="sm" className="gap-1.5 h-8 text-xs bg-orange-500 hover:bg-orange-600" onClick={() => { if (histVariant) openAction(histVariant, "sale"); setHistVariant(null); }} disabled={histVariant?.currentStock === 0}>
                <Minus size={11} /> Record Sale
              </Button>
            </>}
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

      <BarcodeScanner open={scanOpen} onClose={() => setScanOpen(false)} onScan={handleBarcodeScan} />
    </div>
  );
}
