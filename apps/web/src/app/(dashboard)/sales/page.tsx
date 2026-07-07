"use client";

import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { CreditCard, Banknote, Smartphone, Plus, Minus, Trash2, Loader2, ShoppingBag, AlertTriangle, ScanLine, User, Eye, EyeOff, History, ExternalLink } from "lucide-react";
import { ExportButton } from "@/components/shared/export-button";
import { BarcodeScanner } from "@/components/shared/barcode-scanner";
import { DataTable, type ColumnDef } from "@/components/shared/data-table";
import { useSales, useDailySummary, useVoidSale, useCreateSale } from "@/lib/hooks/use-sales";
import { useStockIn, useAdjustStock, useProductLedger, useStockMovements } from "@/lib/hooks/use-inventory";
import { useProducts } from "@/lib/hooks/use-products";
import { useCustomers } from "@/lib/hooks/use-customers";
import { useSuppliers } from "@/lib/hooks/use-suppliers";
import Link from "next/link";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

type LedgerRow = {
  id: string; product: string; brand: string; sku: string;
  category: string; unit: string; size?: string;
  totalIn: number; totalOut: number; currentStock: number; reorderPoint: number;
};

type HistMovement = {
  id: string; type: string; quantity: number; balanceAfter: number;
  reason?: string; referenceId?: string; createdAt: string;
};

type SaleItem = {
  id: string;
  variantId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  variant: { unit: string; size?: string; product: { name: string; sku: string } };
};

const TYPE_CFG: Record<string, { label: string; color: string }> = {
  PURCHASE:   { label: "Stock In",   color: "text-emerald-500" },
  SALE:       { label: "Sale",       color: "text-orange-500"  },
  ADJUSTMENT: { label: "Adjustment", color: "text-blue-400"    },
  WASTAGE:    { label: "Wastage",    color: "text-red-400"     },
  RETURN:     { label: "Return",     color: "text-purple-400"  },
};

type Sale = {
  id: string;
  saleNumber: string;
  totalAmount: number;
  discountAmount?: number;
  paymentType: string;
  isVoided: boolean;
  voidReason?: string;
  notes?: string;
  createdAt: string;
  items: SaleItem[];
  createdBy: { name: string };
  customer?: { name: string; phone?: string };
  supplier?: { name: string };
};

type SaleLineItem = {
  variantId: string;
  quantity: number;
  unitPrice: number;
};

const PAYMENT_CFG: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  CASH:   { icon: Banknote,   label: "Cash",   color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" },
  CARD:   { icon: CreditCard, label: "Card",   color: "text-blue-400 bg-blue-400/10 border-blue-400/20" },
  UPI:    { icon: Smartphone, label: "UPI",    color: "text-purple-400 bg-purple-400/10 border-purple-400/20" },
  CREDIT: { icon: User,       label: "Credit", color: "text-orange-500 bg-orange-500/10 border-orange-500/20" },
};

const EMPTY_ITEM: SaleLineItem = { variantId: "", quantity: 1, unitPrice: 0 };

export default function SalesPage() {
  const [showVoided, setShowVoided]     = useState(false);

  const { data: salesData, isLoading } = useSales(showVoided ? { includeVoided: "true" } : {});
  const { data: dailyData }            = useDailySummary();
  const { data: productsData }         = useProducts();
  const { data: customersData }        = useCustomers();
  const { data: suppliersData }        = useSuppliers();
  const voidSale                       = useVoidSale();
  const createSale                     = useCreateSale();
  const stockIn                        = useStockIn();
  const adjustStock                    = useAdjustStock();
  const { data: ledgerRaw }            = useProductLedger();
  const ledger: LedgerRow[]            = useMemo(() => (ledgerRaw as LedgerRow[] | undefined) ?? [], [ledgerRaw]);

  const [voidTarget, setVoidTarget]     = useState<Sale | null>(null);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  // Quick +/- action
  const [actionTarget, setActionTarget] = useState<LedgerRow | null>(null);
  const [actionType,   setActionType  ] = useState<"add" | "sale">("add");
  const [actionQty,    setActionQty   ] = useState(1);
  const [actionNotes,  setActionNotes ] = useState("");

  // History popup
  const [histVariant, setHistVariant] = useState<LedgerRow | null>(null);
  const histQuery = useMemo(() =>
    histVariant ? { variantId: histVariant.id, limit: 200, sortBy: "createdAt", sortOrder: "desc" } : undefined,
  [histVariant]);
  const { data: histRaw, isLoading: histLoad } = useStockMovements(histQuery ?? {}, !!histVariant);
  const history: HistMovement[] = useMemo(() => histVariant ? ((histRaw as any)?.data ?? []) : [], [histRaw, histVariant]);

  const fmtFull = (d: string) => new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

  const openAction = (row: LedgerRow, type: "add" | "sale") => {
    setSelectedSale(null);
    setActionTarget(row);
    setActionType(type);
    setActionQty(1);
    setActionNotes("");
  };

  const openHistory = (row: LedgerRow) => {
    setSelectedSale(null);
    setHistVariant(row);
  };

  const handleAction = async () => {
    if (!actionTarget) return;
    if (actionType === "add") {
      await stockIn.mutateAsync({ variantId: actionTarget.id, quantity: actionQty, notes: actionNotes || undefined });
    } else {
      await adjustStock.mutateAsync({ variantId: actionTarget.id, quantity: -actionQty, reason: actionNotes || "Quick sale", type: "SALE" as any });
    }
    setActionTarget(null);
  };
  const [voidReason, setVoidReason] = useState("");
  const [saleOpen, setSaleOpen]         = useState(false);
  const [items, setItems]                 = useState<SaleLineItem[]>([{ ...EMPTY_ITEM }]);
  const [paymentType, setPaymentType]     = useState("CASH");
  const [customerId, setCustomerId]       = useState("");
  const [supplierId, setSupplierId]       = useState("");
  const [discountAmount, setDiscountAmount] = useState(0);
  const [discountReason, setDiscountReason] = useState("");
  const [saleNotes, setSaleNotes]         = useState("");
  const [stockErrors, setStockErrors]     = useState<Record<number, string>>({});
  const [scanOpen, setScanOpen]           = useState(false);
  const [scanTargetIdx, setScanTargetIdx] = useState<number | null>(null);

  const sales: Sale[] = useMemo(() => (salesData as any)?.data ?? [], [salesData]);
  const daily     = dailyData as { count: number; totalRevenue: number } | undefined;
  const customers = useMemo(() => (customersData as any)?.data ?? [], [customersData]);
  const suppliers = useMemo(() => ((suppliersData as any)?.data ?? []).filter((s: any) => s.isActive), [suppliersData]);

  const products: any[] = (productsData as any)?.data ?? [];
  const allVariants = useMemo(() =>
    products.flatMap((p: any) =>
      (p.variants ?? []).filter((v: any) => v.isActive).map((v: any) => ({
        id: v.id,
        barcode: v.barcode,
        label: `${p.name} — ${v.unit}${v.size ? ` ${v.size}` : ""}`,
        sellingPrice: Number(v.sellingPrice),
        currentStock: v.currentStock,
      }))
    ), [products]);

  const handleBarcodeScan = async (barcode: string) => {
    try {
      const variant = await api.get(`/products/barcode/${encodeURIComponent(barcode)}`) as any;
      const matched = allVariants.find((v: any) => v.id === variant.id) ?? {
        id: variant.id, label: `${variant.product?.name} — ${variant.unit}${variant.size ? ` ${variant.size}` : ""}`,
        sellingPrice: Number(variant.sellingPrice), currentStock: variant.currentStock,
      };
      const idx = scanTargetIdx ?? items.findIndex(it => !it.variantId);
      const targetIdx = idx >= 0 ? idx : items.length;
      if (targetIdx === items.length) setItems(prev => [...prev, { ...EMPTY_ITEM }]);
      setItem(targetIdx, { variantId: matched.id, unitPrice: matched.sellingPrice });
      setScanTargetIdx(null);
    } catch {
      // toast shown by caller if barcode not found
    }
  };

  const handleVoid = () => {
    if (!voidTarget || !voidReason.trim()) return;
    voidSale.mutate(
      { id: voidTarget.id, reason: voidReason.trim() },
      { onSuccess: () => { setVoidTarget(null); setVoidReason(""); } }
    );
  };

  const setItem = (i: number, patch: Partial<SaleLineItem>) => {
    setItems(prev => prev.map((it, idx) => idx === i ? { ...it, ...patch } : it));
    if (patch.variantId !== undefined || patch.quantity !== undefined) {
      setStockErrors(prev => { const n = { ...prev }; delete n[i]; return n; });
    }
  };

  const validateAndSubmit = async () => {
    const errs: Record<number, string> = {};
    items.forEach((it, i) => {
      if (!it.variantId) return;
      const v = allVariants.find(a => a.id === it.variantId);
      if (v && it.quantity > v.currentStock) {
        errs[i] = `Only ${v.currentStock} in stock`;
      }
    });
    setStockErrors(errs);
    if (Object.keys(errs).length > 0) return;
    const validItems = items.filter(it => it.variantId && it.quantity > 0 && it.unitPrice > 0);
    if (!validItems.length) return;
    await createSale.mutateAsync({
      items: validItems, paymentType, customerId: customerId || undefined, supplierId: supplierId || undefined,
      discountAmount: discountAmount || undefined,
      discountReason: discountReason || undefined,
      notes: saleNotes || undefined,
    });
    setSaleOpen(false);
    setItems([{ ...EMPTY_ITEM }]);
    setPaymentType("CASH");
    setCustomerId("");
    setDiscountAmount(0);
    setDiscountReason("");
    setSaleNotes("");
    setStockErrors({});
  };

  const saleSubtotal = items.reduce((a, it) => a + it.quantity * it.unitPrice, 0);
  const saleTotal    = Math.max(0, saleSubtotal - discountAmount);

  const columns = useMemo<ColumnDef<Sale>[]>(() => [
    {
      key: "saleNumber",
      header: "Sale #",
      sortable: true,
      getValue: s => s.saleNumber,
      cell: s => <span className="font-mono text-sm font-medium">{s.saleNumber}</span>,
    },
    {
      key: "items",
      header: "Items",
      align: "center",
      getValue: s => s.items.length,
      cell: s => <span className="text-sm">{s.items.reduce((a, i) => a + i.quantity, 0)}</span>,
    },
    {
      key: "totalAmount",
      header: "Total",
      align: "right",
      sortable: true,
      getValue: s => Number(s.totalAmount),
      cell: s => <span className="text-sm font-semibold">रू{Number(s.totalAmount).toLocaleString("en-IN")}</span>,
    },
    {
      key: "paymentType",
      header: "Payment",
      sortable: true,
      getValue: s => s.paymentType,
      cell: s => {
        const cfg = PAYMENT_CFG[s.paymentType] ?? { icon: Banknote, label: s.paymentType, color: "" };
        const Icon = cfg.icon;
        return (
          <Badge variant="outline" className={`text-[10px] h-5 px-1.5 gap-1 ${cfg.color}`}>
            <Icon size={9} /> {cfg.label}
          </Badge>
        );
      },
    },
    {
      key: "createdBy",
      header: "Cashier",
      getValue: s => s.createdBy?.name,
      cell: s => <span className="text-xs text-muted-foreground">{s.createdBy?.name ?? "—"}</span>,
    },
    {
      key: "createdAt",
      header: "Time",
      sortable: true,
      getValue: s => s.createdAt,
      cell: s => (
        <span className="text-xs text-muted-foreground">
          {new Date(s.createdAt).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
        </span>
      ),
    },
    {
      key: "_actions",
      header: "",
      cell: s => (
        <Button
          variant="ghost"
          size="sm"
          className={`h-7 text-xs ${s.isVoided ? "text-muted-foreground cursor-default" : "text-muted-foreground hover:text-destructive"}`}
          disabled={s.isVoided}
          onClick={() => { if (!s.isVoided) setVoidTarget(s); }}
        >
          {s.isVoided ? "Voided" : "Void"}
        </Button>
      ),
    },
  ], []);

  const avgSale = sales.length ? Number(sales.reduce((a, s) => a + Number(s.totalAmount), 0)) / sales.length : 0;

  return (
    <div className="space-y-5">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Sales</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {daily ? `${daily.count} transaction${daily.count !== 1 ? "s" : ""} today` : "Sales history"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className={`gap-1.5 h-8 text-xs ${showVoided ? "border-primary text-primary" : ""}`}
            onClick={() => setShowVoided(v => !v)}
          >
            {showVoided ? <><EyeOff size={12} /> Hide Voided</> : <><Eye size={12} /> Show Voided</>}
          </Button>
          <ExportButton
            filename="sales"
            sheetName="Sales"
            data={sales.map(s => ({
              "Sale #": s.saleNumber,
              "Items Qty": s.items.reduce((a, i) => a + i.quantity, 0),
              "Total (रू)": Number(s.totalAmount),
              Payment: s.paymentType,
              Cashier: s.createdBy?.name,
              Time: new Date(s.createdAt).toLocaleString(),
            }))}
          />
          <Button size="sm" className="gap-1.5" onClick={() => setSaleOpen(true)}>
            <ShoppingBag size={14} /> New Sale
          </Button>
        </div>
      </motion.div>

      {/* Today summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Today's Transactions", value: daily?.count ?? null },
          { label: "Today's Revenue",      value: daily ? `रू${Number(daily.totalRevenue).toLocaleString("en-IN")}` : null },
          { label: "Average Sale (all)",   value: sales.length ? `रू${Math.round(avgSale).toLocaleString("en-IN")}` : null },
        ].map((card, i) => (
          <motion.div key={card.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 + i * 0.06 }}>
            <Card className="p-4">
              {card.value === null
                ? <Skeleton className="h-8 w-24 mb-1" />
                : <p className="text-2xl font-bold">{card.value}</p>
              }
              <p className="text-xs text-muted-foreground mt-1">{card.label}</p>
            </Card>
          </motion.div>
        ))}
      </div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
        <Card>
          <DataTable<Sale>
            columns={columns}
            data={sales}
            rowKey={s => s.id}
            clientSide
            isLoading={isLoading}
            initialPageSize={20}
            initialSortBy="createdAt"
            initialSortOrder="desc"
            searchPlaceholder="Search by sale number or cashier…"
            emptyMessage="No sales recorded yet."
            onRowClick={s => setSelectedSale(s)}
          />
        </Card>
      </motion.div>

      {/* New Sale Sheet */}
      <BarcodeScanner open={scanOpen} onClose={() => setScanOpen(false)} onScan={handleBarcodeScan} />

      <Sheet open={saleOpen} onOpenChange={o => { setSaleOpen(o); if (!o) { setItems([{ ...EMPTY_ITEM }]); setStockErrors({}); setCustomerId(""); setSupplierId(""); } }}>
        <SheetContent side="right" className="w-full sm:max-w-xl flex flex-col gap-0 p-0">
          <SheetHeader className="p-5 border-b border-border">
            <SheetTitle className="flex items-center gap-2"><ShoppingBag size={16} /> New Sale</SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* Customer (optional) */}
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5"><User size={11} /> Customer <span className="text-muted-foreground">(optional)</span></Label>
              <Select value={customerId} onValueChange={v => v && setCustomerId(v === "walk-in" ? "" : v)}>
                <SelectTrigger className="text-sm"><SelectValue placeholder="Walk-in / select customer">{customerId ? customers.find((c: any) => c.id === customerId)?.name : undefined}</SelectValue></SelectTrigger>
                <SelectContent>
                  <SelectItem value="walk-in" label="Walk-in customer">Walk-in customer</SelectItem>
                  {customers.map((c: any) => (
                    <SelectItem key={c.id} value={c.id} label={c.name + (c.phone ? ` · ${c.phone}` : "")}>
                      {c.name}{c.phone ? ` · ${c.phone}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Supplier (optional) */}
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5"><User size={11} /> Supplier <span className="text-muted-foreground">(optional — if selling to a supplier)</span></Label>
              <Select value={supplierId} onValueChange={v => setSupplierId(v === "none" ? "" : (v ?? ""))}>
                <SelectTrigger className="text-sm"><SelectValue placeholder="None / select supplier">{supplierId ? suppliers.find((s: any) => s.id === supplierId)?.name : undefined}</SelectValue></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" label="None">None</SelectItem>
                  {suppliers.map((s: any) => (
                    <SelectItem key={s.id} value={s.id} label={s.name + (s.contactPerson ? ` · ${s.contactPerson}` : "")}>
                      {s.name}{s.contactPerson ? ` · ${s.contactPerson}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Payment type */}
            <div className="space-y-1.5">
              <Label className="text-xs">Payment Method</Label>
              <Select value={paymentType} onValueChange={(v) => v && setPaymentType(v)}>
                <SelectTrigger className="text-sm"><SelectValue>{PAYMENT_CFG[paymentType]?.label ?? paymentType}</SelectValue></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH" label="Cash"><span className="flex items-center gap-2"><Banknote size={13} /> Cash</span></SelectItem>
                  <SelectItem value="CARD" label="Card"><span className="flex items-center gap-2"><CreditCard size={13} /> Card</span></SelectItem>
                  <SelectItem value="UPI" label="UPI"><span className="flex items-center gap-2"><Smartphone size={13} /> UPI</span></SelectItem>
                  <SelectItem value="CREDIT" label="Credit (Khata)"><span className="flex items-center gap-2"><User size={13} /> Credit (Khata)</span></SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Line items */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Items</Label>
                <div className="flex gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1 text-xs"
                    onClick={() => { setScanTargetIdx(null); setScanOpen(true); }}
                  >
                    <ScanLine size={11} /> Scan
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1 text-xs"
                    onClick={() => setItems(prev => [...prev, { ...EMPTY_ITEM }])}
                  >
                    <Plus size={11} /> Add Item
                  </Button>
                </div>
              </div>

              {items.map((item, i) => {
                const v = allVariants.find(a => a.id === item.variantId);
                return (
                  <div key={i} className="rounded-lg border border-border p-3 space-y-3">
                    <div className="flex items-start gap-2">
                      <div className="flex-1 space-y-1.5">
                        <Label className="text-[10px] text-muted-foreground">Product Variant</Label>
                        <Select
                          value={item.variantId}
                          onValueChange={(val) => {
                            if (!val) return;
                            const vari = allVariants.find(a => a.id === val);
                            setItem(i, { variantId: val, unitPrice: vari?.sellingPrice ?? 0 });
                          }}
                        >
                          <SelectTrigger className="text-sm h-8"><SelectValue placeholder="Select product...">{v?.label}</SelectValue></SelectTrigger>
                          <SelectContent className="min-w-[480px] max-h-72">
                            {allVariants.map(a => (
                              <SelectItem key={a.id} value={a.id} label={`${a.label} (${a.currentStock} left)`} disabled={a.currentStock === 0}>
                                <span>{a.label}</span>
                                <span className={cn("ml-2 text-xs", a.currentStock === 0 ? "text-destructive" : "text-muted-foreground")}>
                                  ({a.currentStock} left)
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 mt-5 text-muted-foreground hover:text-destructive"
                        onClick={() => setItems(prev => prev.filter((_, idx) => idx !== i))}
                        disabled={items.length === 1}
                      >
                        <Trash2 size={12} />
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-[10px] text-muted-foreground">Quantity</Label>
                        <Input
                          type="number"
                          min={1}
                          max={v?.currentStock ?? undefined}
                          value={item.quantity}
                          onChange={e => setItem(i, { quantity: Number(e.target.value) })}
                          className="text-sm h-8"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] text-muted-foreground">Unit Price (रू)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min={0}
                          value={item.unitPrice}
                          onChange={e => setItem(i, { unitPrice: Number(e.target.value) })}
                          className="text-sm h-8"
                        />
                      </div>
                    </div>

                    {stockErrors[i] && (
                      <div className="flex items-center gap-1.5 text-destructive text-xs">
                        <AlertTriangle size={11} /> {stockErrors[i]}
                      </div>
                    )}

                    {v && (
                      <p className="text-[10px] text-muted-foreground">
                        Line total: रू{(item.quantity * item.unitPrice).toLocaleString("en-IN")}
                        {" · "}In stock: {v.currentStock}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="p-5 border-t border-border space-y-3">
            {/* Discount row */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Discount (रू)</Label>
                <Input type="number" min={0} step="0.01" value={discountAmount || ""} onChange={e => setDiscountAmount(Number(e.target.value) || 0)} className="h-8 text-sm" placeholder="0" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Reason</Label>
                <Input value={discountReason} onChange={e => setDiscountReason(e.target.value)} className="h-8 text-sm" placeholder="Optional" />
              </div>
            </div>
            {/* Notes */}
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Notes</Label>
              <Input value={saleNotes} onChange={e => setSaleNotes(e.target.value)} className="h-8 text-sm" placeholder="Optional sale notes…" />
            </div>
            {/* Totals */}
            <div className="space-y-1 pt-1 border-t border-border">
              {discountAmount > 0 && (
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Subtotal</span>
                  <span>रू{saleSubtotal.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</span>
                </div>
              )}
              {discountAmount > 0 && (
                <div className="flex justify-between text-xs text-emerald-500">
                  <span>Discount</span>
                  <span>−रू{discountAmount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total</span>
                <span className="text-xl font-bold">रू{saleTotal.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</span>
              </div>
              {paymentType === "CREDIT" && (
                <p className="text-[10px] text-orange-500">⚠ Credit sale — will be added to customer's outstanding balance</p>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setSaleOpen(false)}>Cancel</Button>
              <Button
                className="flex-1 gap-2"
                disabled={createSale.isPending || !items.some(it => it.variantId && it.quantity > 0 && it.unitPrice > 0)}
                onClick={validateAndSubmit}
              >
                {createSale.isPending
                  ? <><Loader2 size={14} className="animate-spin" /> Processing...</>
                  : <><ShoppingBag size={14} /> Record Sale</>
                }
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Sale detail popup */}
      <Dialog open={!!selectedSale} onOpenChange={o => !o && setSelectedSale(null)}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm">
              <ShoppingBag size={14} />
              {selectedSale?.saleNumber}
              {selectedSale?.isVoided && <span className="ml-1 text-[10px] font-semibold text-destructive bg-destructive/10 border border-destructive/20 rounded px-1.5 py-0.5">VOIDED</span>}
            </DialogTitle>
            {selectedSale && (
              <p className="text-xs text-muted-foreground">
                {new Date(selectedSale.createdAt).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                {" · "}{selectedSale.createdBy?.name}
                {selectedSale.customer && ` · ${selectedSale.customer.name}`}
                {selectedSale.supplier && ` · Supplier: ${selectedSale.supplier.name}`}
              </p>
            )}
          </DialogHeader>

          {selectedSale && (
            <>
              {/* Payment badge */}
              <div className="flex items-center gap-2 py-1">
                {(() => { const cfg = PAYMENT_CFG[selectedSale.paymentType] ?? { icon: Banknote, label: selectedSale.paymentType, color: "" }; const Icon = cfg.icon; return <Badge variant="outline" className={`text-[10px] h-5 px-1.5 gap-1 ${cfg.color}`}><Icon size={9} /> {cfg.label}</Badge>; })()}
                {selectedSale.isVoided && selectedSale.voidReason && <span className="text-xs text-muted-foreground">Void reason: {selectedSale.voidReason}</span>}
              </div>

              {/* Items table */}
              <div className="flex-1 overflow-auto rounded-md border border-border [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: "none" }}>
                <table className="w-full text-xs border-collapse">
                  <thead className="sticky top-0 bg-card border-b border-border">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-semibold">Product</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold">Qty</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold">Unit Price</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold">Total</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedSale.items.map((item, i) => {
                      const lr = ledger.find(r => r.id === item.variantId);
                      return (
                      <tr key={item.id ?? i} className={cn("border-b border-border/40", i % 2 === 0 ? "bg-accent/10" : "")}>
                        <td className="px-3 py-2">
                          <p className="font-medium">{item.variant?.product?.name ?? "—"}</p>
                          <p className="text-[10px] font-mono text-muted-foreground">{item.variant?.product?.sku} · {item.variant?.size ?? item.variant?.unit}</p>
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums font-semibold">{item.quantity}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">रू{Number(item.unitPrice).toLocaleString("en-IN", { maximumFractionDigits: 2 })}</td>
                        <td className="px-3 py-2 text-right tabular-nums font-semibold">रू{Number(item.totalPrice ?? item.quantity * item.unitPrice).toLocaleString("en-IN", { maximumFractionDigits: 2 })}</td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1">
                            <Button size="icon" className="h-6 w-6 bg-emerald-600 hover:bg-emerald-700 text-white" title="Add stock" disabled={!lr} onClick={() => lr && openAction(lr, "add")}><Plus size={10} /></Button>
                            <Button size="icon" variant="outline" className="h-6 w-6 border-orange-400 text-orange-500 hover:bg-orange-500 hover:text-white" title="Record sale" disabled={!lr || lr.currentStock === 0} onClick={() => lr && openAction(lr, "sale")}><Minus size={10} /></Button>
                            <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground hover:text-blue-500" title="View history" disabled={!lr} onClick={() => lr && openHistory(lr)}><History size={10} /></Button>
                          </div>
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="space-y-1 pt-1 border-t border-border text-xs">
                {selectedSale.discountAmount && Number(selectedSale.discountAmount) > 0 ? (
                  <>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Subtotal</span>
                      <span>रू{(Number(selectedSale.totalAmount) + Number(selectedSale.discountAmount)).toLocaleString("en-IN", { maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-emerald-500">
                      <span>Discount</span>
                      <span>−रू{Number(selectedSale.discountAmount).toLocaleString("en-IN", { maximumFractionDigits: 2 })}</span>
                    </div>
                  </>
                ) : null}
                <div className="flex justify-between items-center pt-0.5">
                  <span className="font-semibold text-sm">Total</span>
                  <span className="text-lg font-bold">रू{Number(selectedSale.totalAmount).toLocaleString("en-IN", { maximumFractionDigits: 2 })}</span>
                </div>
                {selectedSale.notes && <p className="text-muted-foreground pt-1">Note: {selectedSale.notes}</p>}
              </div>

              <div className="flex gap-2 pt-1">
                {!selectedSale.isVoided && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs text-destructive hover:text-destructive hover:border-destructive/50"
                    onClick={() => { setVoidTarget(selectedSale); setSelectedSale(null); }}
                  >
                    Void Sale
                  </Button>
                )}
                <Button variant="ghost" size="sm" className="ml-auto h-8 text-xs" onClick={() => setSelectedSale(null)}>Close</Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

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
              <div className="rounded-md bg-muted px-3 py-2 text-xs space-y-0.5">
                <p className="font-semibold">{actionTarget.product}</p>
                <p className="text-muted-foreground font-mono">{actionTarget.sku} · {actionTarget.size ?? actionTarget.unit}</p>
                <p className="text-muted-foreground">Current stock: <span className="font-semibold text-foreground">{actionTarget.currentStock}</span></p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Quantity *</Label>
                <Input type="number" min={1} max={actionType === "sale" ? actionTarget.currentStock : undefined} value={actionQty} onChange={e => setActionQty(Math.max(1, Number(e.target.value)))} className="text-sm h-9 text-center font-semibold" autoFocus />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Notes</Label>
                <Input value={actionNotes} onChange={e => setActionNotes(e.target.value)} placeholder="Optional…" className="text-sm h-9" onKeyDown={e => e.key === "Enter" && handleAction()} />
              </div>
              {actionType === "sale" && actionQty > actionTarget.currentStock && (
                <p className="text-xs text-destructive font-medium">⚠ Only {actionTarget.currentStock} in stock</p>
              )}
              <div className="flex gap-2 pt-1">
                <Button variant="outline" className="flex-1 h-9" onClick={() => setActionTarget(null)}>Cancel</Button>
                <Button
                  className={cn("flex-1 h-9 gap-1.5", actionType === "sale" && "bg-orange-500 hover:bg-orange-600")}
                  disabled={stockIn.isPending || adjustStock.isPending || (actionType === "sale" && actionQty > actionTarget.currentStock)}
                  onClick={handleAction}
                >
                  {(stockIn.isPending || adjustStock.isPending)
                    ? <><Loader2 size={13} className="animate-spin" /> Saving…</>
                    : actionType === "add" ? <><Plus size={13} /> Add {actionQty}</> : <><Minus size={13} /> Sell {actionQty}</>
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
            {histVariant && <p className="text-xs text-muted-foreground">{histVariant.product} · {histVariant.sku} · {histVariant.size ?? histVariant.unit}</p>}
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
          <div className="flex-1 overflow-auto rounded-md border border-border [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: "none" }}>
            {histLoad ? (
              <div className="p-4 space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-10 bg-muted animate-pulse rounded" />)}</div>
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
                        <td className="px-3 py-2"><Badge variant="outline" className={cn("text-[9px] h-4 px-1.5", cfg.color, "border-current bg-current/10")}>{cfg.label}</Badge></td>
                        <td className={cn("px-3 py-2 text-right font-bold tabular-nums", m.quantity > 0 ? "text-emerald-500" : "text-orange-500")}>{m.quantity > 0 ? "+" : ""}{m.quantity}</td>
                        <td className="px-3 py-2 text-right font-semibold tabular-nums text-blue-500">{m.balanceAfter}</td>
                        <td className="px-3 py-2 text-muted-foreground truncate max-w-[120px]">{m.referenceId ? `#${m.referenceId} ` : ""}{m.reason ?? "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
          <div className="flex gap-2 pt-1">
            {histVariant && (
              <>
                <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs" onClick={() => { if (histVariant) openAction(histVariant, "add"); setHistVariant(null); }}><Plus size={11} /> Add Stock</Button>
                <Button size="sm" className="gap-1.5 h-8 text-xs bg-orange-500 hover:bg-orange-600" onClick={() => { if (histVariant) openAction(histVariant, "sale"); setHistVariant(null); }} disabled={histVariant.currentStock === 0}><Minus size={11} /> Record Sale</Button>
                <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs" render={<Link href={`/inventory/history/${histVariant.id}?name=${encodeURIComponent(histVariant.product)}&sku=${encodeURIComponent(histVariant.sku)}`} />} nativeButton={false} onClick={() => setHistVariant(null)}><ExternalLink size={11} /> View Full History</Button>
              </>
            )}
            <Button variant="ghost" size="sm" className="ml-auto h-8 text-xs" onClick={() => setHistVariant(null)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Void dialog */}
      <Dialog open={!!voidTarget} onOpenChange={o => { if (!o) { setVoidTarget(null); setVoidReason(""); } }}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>Void Sale</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Void <span className="font-semibold text-foreground">{voidTarget?.saleNumber}</span>? Stock will be reversed.
          </p>
          <div className="space-y-1.5">
            <Label className="text-xs">Reason *</Label>
            <Input
              placeholder="Enter reason for void…"
              className="text-sm"
              value={voidReason}
              onChange={e => setVoidReason(e.target.value)}
            />
          </div>
          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1" onClick={() => { setVoidTarget(null); setVoidReason(""); }}>Cancel</Button>
            <Button
              variant="destructive"
              className="flex-1"
              disabled={!voidReason.trim() || voidSale.isPending}
              onClick={handleVoid}
            >
              Void Sale
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
