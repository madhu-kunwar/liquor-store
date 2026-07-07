"use client";

import { motion } from "framer-motion";
import { useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CheckCircle2, XCircle, Truck, PackageCheck, Clock, Send,
  Banknote, User, ArrowLeft, Loader2, CreditCard, Smartphone,
  Pencil, Printer, Plus, Trash2, AlertTriangle,
} from "lucide-react";
import {
  useDealerOrder, useConfirmDealerOrder, useDispatchDealerOrder,
  useDeliverDealerOrder, useRecordDealerPayment, useCancelDealerOrder,
  useUpdateDealerOrder,
} from "@/lib/hooks/use-dealer-orders";
import { useProducts } from "@/lib/hooks/use-products";
import { cn } from "@/lib/utils";

const STATUS_STEPS = ["DRAFT", "CONFIRMED", "DISPATCHED", "DELIVERED"] as const;

const STATUS_CFG: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  DRAFT:      { label: "Draft",      icon: Clock,        color: "text-muted-foreground", bg: "bg-muted/50" },
  CONFIRMED:  { label: "Confirmed",  icon: Send,         color: "text-blue-400",         bg: "bg-blue-500/10" },
  DISPATCHED: { label: "Dispatched", icon: Truck,        color: "text-amber-500",        bg: "bg-amber-500/10" },
  DELIVERED:  { label: "Delivered",  icon: PackageCheck, color: "text-emerald-500",      bg: "bg-emerald-500/10" },
  CANCELLED:  { label: "Cancelled",  icon: XCircle,      color: "text-red-400",          bg: "bg-red-500/10" },
};

const PAY_CFG: Record<string, { label: string; icon: React.ElementType }> = {
  CASH:   { label: "Cash",           icon: Banknote   },
  CARD:   { label: "Card",           icon: CreditCard },
  UPI:    { label: "UPI",            icon: Smartphone },
  CREDIT: { label: "Credit (Khata)", icon: User       },
};

const PAY_STATUS_COLOR: Record<string, string> = {
  UNPAID:  "text-red-400 bg-red-500/10 border-red-500/20",
  PARTIAL: "text-amber-500 bg-amber-500/10 border-amber-500/20",
  PAID:    "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
};

type LineItem = { variantId: string; orderedQty: number; unitPrice: number };
const EMPTY: LineItem = { variantId: "", orderedQty: 1, unitPrice: 0 };

export default function DealerOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();

  const { data: orderData, isLoading } = useDealerOrder(id);
  const order = orderData as any;

  const { data: productsData } = useProducts();
  const products: any[] = useMemo(() => (productsData as any)?.data ?? [], [productsData]);
  const allVariants = useMemo(() =>
    products.flatMap((p: any) =>
      (p.variants ?? []).filter((v: any) => v.isActive).map((v: any) => ({
        id: v.id, label: `${p.name} — ${v.unit}${v.size ? ` ${v.size}` : ""}`,
        sellingPrice: Number(v.sellingPrice), currentStock: v.currentStock,
      }))
    ), [products]);

  const confirm  = useConfirmDealerOrder();
  const dispatch = useDispatchDealerOrder();
  const deliver  = useDeliverDealerOrder();
  const payment  = useRecordDealerPayment(id);
  const cancel   = useCancelDealerOrder();
  const update   = useUpdateDealerOrder(id);

  // Payment dialog
  const [payOpen,   setPayOpen  ] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [payNotes,  setPayNotes ] = useState("");

  // Cancel dialog
  const [cancelOpen, setCancelOpen] = useState(false);

  // Edit sheet (DRAFT only)
  const [editOpen,  setEditOpen ] = useState(false);
  const [editItems, setEditItems] = useState<LineItem[]>([]);
  const [editErrors, setEditErrors] = useState<Record<number, string>>({});

  // Invoice print dialog
  const [invoiceOpen, setInvoiceOpen] = useState(false);

  const openEdit = () => {
    setEditItems(order.items.map((i: any) => ({ variantId: i.variantId, orderedQty: i.orderedQty, unitPrice: Number(i.unitPrice) })));
    setEditErrors({});
    setEditOpen(true);
  };

  const setEditItem = (i: number, patch: Partial<LineItem>) => {
    setEditItems(prev => prev.map((it, idx) => idx === i ? { ...it, ...patch } : it));
    setEditErrors(prev => { const n = { ...prev }; delete n[i]; return n; });
  };

  const submitEdit = async () => {
    const errs: Record<number, string> = {};
    editItems.forEach((it, i) => {
      if (!it.variantId) errs[i] = "Select a product";
    });
    setEditErrors(errs);
    if (Object.keys(errs).length > 0) return;
    await update.mutateAsync({ items: editItems.filter(it => it.variantId) });
    setEditOpen(false);
  };

  const handlePayment = async () => {
    const amount = parseFloat(payAmount);
    if (!amount || amount <= 0) return;
    await payment.mutateAsync({ amount, notes: payNotes || undefined });
    setPayOpen(false); setPayAmount(""); setPayNotes("");
  };

  if (isLoading) return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center gap-3"><Skeleton className="h-8 w-8 rounded" /><Skeleton className="h-7 w-48" /></div>
      <Skeleton className="h-12 w-full" />
      <div className="grid grid-cols-2 gap-4"><Skeleton className="h-36" /><Skeleton className="h-36" /></div>
      <Skeleton className="h-52 w-full" />
    </div>
  );

  if (!order) return <p className="text-sm text-muted-foreground p-4">Order not found.</p>;

  const status   = STATUS_CFG[order.status] ?? STATUS_CFG.DRAFT;
  const StatusIcon = status.icon;
  const payMethod  = PAY_CFG[order.paymentType] ?? PAY_CFG.CASH;
  const PayIcon    = payMethod.icon;
  const balance    = Number(order.totalAmount) - Number(order.paidAmount);
  const isPending  = confirm.isPending || dispatch.isPending || deliver.isPending || cancel.isPending;
  const stepIdx    = STATUS_STEPS.indexOf(order.status as any);

  return (
    <div className="space-y-5 max-w-3xl pb-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => router.back()}><ArrowLeft size={16} /></Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold font-mono">{order.orderNumber}</h1>
            <Badge variant="outline" className={`text-[10px] h-5 px-1.5 gap-1 border ${status.color} ${status.bg}`}>
              <StatusIcon size={9} />{status.label}
            </Badge>
            <Badge variant="outline" className={`text-[10px] h-5 px-1.5 ${PAY_STATUS_COLOR[order.paymentStatus]}`}>
              {order.paymentStatus}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {new Date(order.createdAt).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
            {" · "}{order.createdBy?.name}
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs shrink-0" onClick={() => setInvoiceOpen(true)}>
          <Printer size={12} /> Invoice
        </Button>
      </motion.div>

      {/* Status progress bar */}
      {order.status !== "CANCELLED" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 }}>
          <div className="flex items-center gap-0">
            {STATUS_STEPS.map((step, i) => {
              const done    = stepIdx >= i;
              const current = stepIdx === i;
              const cfg     = STATUS_CFG[step];
              const Icon    = cfg.icon;
              return (
                <div key={step} className="flex items-center flex-1 last:flex-none">
                  <div className={cn(
                    "flex flex-col items-center gap-1 px-2 py-2 rounded-lg transition-colors min-w-0",
                    current ? `${cfg.bg} ${cfg.color}` : done ? "text-emerald-500" : "text-muted-foreground/40"
                  )}>
                    <div className={cn("rounded-full p-1.5", done ? (current ? cfg.bg : "bg-emerald-500/10") : "bg-muted/50")}>
                      {done && !current ? <CheckCircle2 size={14} className="text-emerald-500" /> : <Icon size={14} />}
                    </div>
                    <span className="text-[10px] font-medium whitespace-nowrap hidden sm:block">{cfg.label}</span>
                  </div>
                  {i < STATUS_STEPS.length - 1 && (
                    <div className={cn("flex-1 h-0.5 mx-1", stepIdx > i ? "bg-emerald-500/40" : "bg-muted/50")} />
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Customer card */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
          <Card className="h-full">
            <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground uppercase tracking-wide">Customer</CardTitle></CardHeader>
            <CardContent className="space-y-1.5">
              <p className="font-semibold text-sm">{order.customer?.name}</p>
              {order.customer?.phone  && <p className="text-sm text-muted-foreground">{order.customer.phone}</p>}
              {order.customer?.email  && <p className="text-xs text-muted-foreground">{order.customer.email}</p>}
              {order.customer?.address && <p className="text-xs text-muted-foreground">{order.customer.address}</p>}
              {Number(order.customer?.creditBalance) > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-orange-500 font-medium pt-1">
                  <AlertTriangle size={11} />
                  Total outstanding: रू{Number(order.customer.creditBalance).toLocaleString("en-IN")}
                </div>
              )}
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5 mt-2 w-full" render={<Link href={`/customers/${order.customer?.id}`} />} nativeButton={false}>
                <User size={11} /> View Customer
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Payment card */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="h-full">
            <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground uppercase tracking-wide">Payment</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <PayIcon size={13} className="text-muted-foreground" />
                <span>{payMethod.label}</span>
              </div>
              {order.invoiceNumber && <p className="text-xs font-mono text-muted-foreground">Invoice: {order.invoiceNumber}</p>}
              <Separator />
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Order Total</span><span className="font-semibold tabular-nums">रू{Number(order.totalAmount).toLocaleString("en-IN")}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Paid</span><span className="text-emerald-600 tabular-nums">रू{Number(order.paidAmount).toLocaleString("en-IN")}</span></div>
                {balance > 0 && (
                  <div className="flex justify-between font-semibold border-t border-border/50 pt-1">
                    <span className="text-orange-500">Balance Due</span>
                    <span className="text-orange-500 tabular-nums">रू{balance.toLocaleString("en-IN")}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Items */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.13 }}>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold">Order Items</CardTitle>
            {order.status === "DRAFT" && (
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={openEdit}>
                <Pencil size={11} /> Edit Items
              </Button>
            )}
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: "none" }}>
              <table className="w-full text-sm border-collapse">
                <thead className="border-b border-border bg-muted/30">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold">Product</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold">Ordered</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold">Dispatched</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold">Unit Price</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items?.map((item: any, i: number) => (
                    <tr key={item.id} className={cn("border-b border-border/40", i % 2 === 0 ? "bg-muted/10" : "")}>
                      <td className="px-4 py-2.5">
                        <p className="font-medium text-sm">{item.variant?.product?.name}</p>
                        <p className="text-[10px] font-mono text-muted-foreground">{item.variant?.product?.sku} · {item.variant?.size ?? item.variant?.unit}</p>
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums font-semibold">{item.orderedQty}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">{item.dispatchedQty > 0 ? item.dispatchedQty : "—"}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">रू{Number(item.unitPrice).toLocaleString("en-IN")}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums font-semibold">रू{Number(item.totalPrice).toLocaleString("en-IN")}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t border-border bg-muted/20">
                  <tr>
                    <td colSpan={4} className="px-4 py-2.5 text-right text-sm font-semibold">Order Total</td>
                    <td className="px-4 py-2.5 text-right text-sm font-bold tabular-nums">रू{Number(order.totalAmount).toLocaleString("en-IN")}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {order.notes && (
        <Card><CardContent className="pt-4 text-sm text-muted-foreground">📝 {order.notes}</CardContent></Card>
      )}

      {/* Action bar */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }} className="flex gap-2 flex-wrap">
        {order.status === "DRAFT" && (
          <Button className="gap-1.5 bg-blue-600 hover:bg-blue-700" disabled={isPending} onClick={() => confirm.mutate(id)}>
            {confirm.isPending ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} Confirm Order
          </Button>
        )}
        {order.status === "CONFIRMED" && (
          <Button className="gap-1.5 bg-amber-500 hover:bg-amber-600" disabled={isPending} onClick={() => dispatch.mutate(id)}>
            {dispatch.isPending ? <Loader2 size={14} className="animate-spin" /> : <Truck size={14} />} Dispatch & Deduct Stock
          </Button>
        )}
        {order.status === "DISPATCHED" && (
          <Button className="gap-1.5 bg-emerald-600 hover:bg-emerald-700" disabled={isPending} onClick={() => deliver.mutate(id)}>
            {deliver.isPending ? <Loader2 size={14} className="animate-spin" /> : <PackageCheck size={14} />} Mark Delivered
          </Button>
        )}
        {(order.status === "DISPATCHED" || order.status === "DELIVERED") && balance > 0 && (
          <Button variant="outline" className="gap-1.5 border-emerald-500 text-emerald-600 hover:bg-emerald-500 hover:text-white" onClick={() => setPayOpen(true)}>
            <Banknote size={14} /> Record Payment · रू{balance.toLocaleString("en-IN")} due
          </Button>
        )}
        {order.status !== "CANCELLED" && order.status !== "DELIVERED" && (
          <Button variant="outline" className="gap-1.5 text-destructive hover:text-destructive hover:border-destructive/50 ml-auto" onClick={() => setCancelOpen(true)}>
            <XCircle size={14} /> Cancel
          </Button>
        )}
      </motion.div>

      {/* ── EDIT DRAFT SHEET ── */}
      <Sheet open={editOpen} onOpenChange={o => !o && setEditOpen(false)}>
        <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col gap-0 p-0">
          <SheetHeader className="p-5 border-b border-border">
            <SheetTitle className="flex items-center gap-2 text-sm"><Pencil size={14} /> Edit Order Items</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto p-5 space-y-3">
            {editItems.map((item, i) => {
              const v = allVariants.find(a => a.id === item.variantId);
              return (
                <div key={i} className="rounded-lg border border-border p-3 space-y-3">
                  <div className="flex items-start gap-2">
                    <div className="flex-1 space-y-1.5">
                      <Label className="text-[10px] text-muted-foreground">Product Variant *</Label>
                      <Select value={item.variantId} onValueChange={val => { const vari = allVariants.find(a => a.id === val); setEditItem(i, { variantId: val ?? "", unitPrice: vari?.sellingPrice ?? item.unitPrice }); }}>
                        <SelectTrigger className="text-sm h-8"><SelectValue placeholder="Select product…" /></SelectTrigger>
                        <SelectContent className="min-w-[480px] max-h-72">
                          {allVariants.map(a => (
                            <SelectItem key={a.id} value={a.id} label={`${a.label} (${a.currentStock} in stock)`} disabled={a.currentStock === 0}>
                              {a.label} <span className="ml-1 text-xs text-muted-foreground">({a.currentStock} in stock)</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 mt-5 text-muted-foreground hover:text-destructive" onClick={() => setEditItems(prev => prev.filter((_, idx) => idx !== i))} disabled={editItems.length === 1}>
                      <Trash2 size={12} />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] text-muted-foreground">Quantity</Label>
                      <Input type="number" min={1} value={item.orderedQty} onChange={e => setEditItem(i, { orderedQty: Number(e.target.value) })} className="text-sm h-8" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] text-muted-foreground">Unit Price (रू)</Label>
                      <Input type="number" step="0.01" min={0} value={item.unitPrice} onChange={e => setEditItem(i, { unitPrice: Number(e.target.value) })} className="text-sm h-8" />
                    </div>
                  </div>
                  {editErrors[i] && <p className="text-xs text-destructive">{editErrors[i]}</p>}
                  {v && <p className="text-[10px] text-muted-foreground">Line total: रू{(item.orderedQty * item.unitPrice).toLocaleString("en-IN")} · In stock: {v.currentStock}</p>}
                </div>
              );
            })}
            <Button variant="outline" size="sm" className="w-full gap-1 text-xs h-8" onClick={() => setEditItems(prev => [...prev, { ...EMPTY }])}>
              <Plus size={11} /> Add Item
            </Button>
          </div>
          <div className="p-5 border-t border-border space-y-3">
            <div className="flex justify-between text-sm font-semibold">
              <span>New Total</span>
              <span>रू{editItems.reduce((a, i) => a + i.orderedQty * i.unitPrice, 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button className="flex-1 gap-2" disabled={update.isPending} onClick={submitEdit}>
                {update.isPending ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : "Save Changes"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* ── RECORD PAYMENT DIALOG ── */}
      <Dialog open={payOpen} onOpenChange={o => !o && setPayOpen(false)}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm text-emerald-600"><Banknote size={14} /> Record Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            <div className="rounded-md bg-muted px-3 py-2 text-xs">
              <p className="font-semibold">{order.customer?.name}</p>
              <p className="text-muted-foreground mt-0.5">Balance due: <span className="font-semibold text-orange-500">रू{balance.toLocaleString("en-IN")}</span></p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Amount (रू) *</Label>
              <Input type="number" step="0.01" min={0.01} max={balance} value={payAmount} onChange={e => setPayAmount(e.target.value)} className="text-sm h-9 font-semibold" autoFocus placeholder={`Max रू${balance.toLocaleString("en-IN")}`} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Notes</Label>
              <Input value={payNotes} onChange={e => setPayNotes(e.target.value)} placeholder="Optional…" className="text-sm h-9" onKeyDown={e => e.key === "Enter" && handlePayment()} />
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1 h-9" onClick={() => setPayOpen(false)}>Cancel</Button>
              <Button className="flex-1 h-9 gap-1.5 bg-emerald-600 hover:bg-emerald-700" disabled={payment.isPending || !payAmount || parseFloat(payAmount) <= 0} onClick={handlePayment}>
                {payment.isPending ? <><Loader2 size={13} className="animate-spin" /> Saving…</> : <><Banknote size={13} /> Save Payment</>}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── CANCEL DIALOG ── */}
      <Dialog open={cancelOpen} onOpenChange={o => !o && setCancelOpen(false)}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader><DialogTitle className="flex items-center gap-2 text-sm text-destructive"><XCircle size={14} /> Cancel Order</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Cancel <span className="font-semibold text-foreground">{order.orderNumber}</span>?{order.status === "DISPATCHED" && " Stock will be reversed."}</p>
          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1 h-9" onClick={() => setCancelOpen(false)}>Keep</Button>
            <Button variant="destructive" className="flex-1 h-9" disabled={cancel.isPending}
              onClick={() => cancel.mutate(id, { onSuccess: () => { setCancelOpen(false); router.push("/dealer-orders"); } })}>
              {cancel.isPending ? "Cancelling…" : "Cancel Order"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── INVOICE DIALOG ── */}
      <Dialog open={invoiceOpen} onOpenChange={o => !o && setInvoiceOpen(false)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2"><Printer size={14} /> Invoice</span>
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5" onClick={() => window.print()}>
                <Printer size={11} /> Print
              </Button>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1" id="invoice-content">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-bold text-base">{order.orderNumber}</p>
                <p className="text-xs text-muted-foreground">{new Date(order.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}</p>
              </div>
              <Badge variant="outline" className={`text-[10px] px-2 py-0.5 ${STATUS_CFG[order.status]?.color} ${STATUS_CFG[order.status]?.bg}`}>
                {STATUS_CFG[order.status]?.label}
              </Badge>
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide mb-1">Bill To</p>
                <p className="font-semibold">{order.customer?.name}</p>
                {order.customer?.phone   && <p className="text-muted-foreground text-xs">{order.customer.phone}</p>}
                {order.customer?.address && <p className="text-muted-foreground text-xs">{order.customer.address}</p>}
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide mb-1">Payment</p>
                <p className="text-sm">{payMethod.label}</p>
                {order.invoiceNumber && <p className="text-xs font-mono text-muted-foreground">{order.invoiceNumber}</p>}
              </div>
            </div>
            <table className="w-full text-xs border-collapse border border-border rounded-md overflow-hidden">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">Product</th>
                  <th className="px-3 py-2 text-right font-semibold">Qty</th>
                  <th className="px-3 py-2 text-right font-semibold">Rate</th>
                  <th className="px-3 py-2 text-right font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody>
                {order.items?.map((item: any, i: number) => (
                  <tr key={item.id} className="border-t border-border">
                    <td className="px-3 py-2">{item.variant?.product?.name} <span className="text-muted-foreground">({item.variant?.size ?? item.variant?.unit})</span></td>
                    <td className="px-3 py-2 text-right tabular-nums">{item.orderedQty}</td>
                    <td className="px-3 py-2 text-right tabular-nums">रू{Number(item.unitPrice).toLocaleString("en-IN")}</td>
                    <td className="px-3 py-2 text-right tabular-nums font-semibold">रू{Number(item.totalPrice).toLocaleString("en-IN")}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-muted/30 border-t border-border font-semibold">
                <tr>
                  <td colSpan={3} className="px-3 py-2 text-right">Total</td>
                  <td className="px-3 py-2 text-right tabular-nums">रू{Number(order.totalAmount).toLocaleString("en-IN")}</td>
                </tr>
                {Number(order.paidAmount) > 0 && (
                  <tr className="text-emerald-600">
                    <td colSpan={3} className="px-3 py-1.5 text-right text-xs">Paid</td>
                    <td className="px-3 py-1.5 text-right tabular-nums text-xs">रू{Number(order.paidAmount).toLocaleString("en-IN")}</td>
                  </tr>
                )}
                {balance > 0 && (
                  <tr className="text-orange-500">
                    <td colSpan={3} className="px-3 py-1.5 text-right text-xs">Balance Due</td>
                    <td className="px-3 py-1.5 text-right tabular-nums text-xs font-bold">रू{balance.toLocaleString("en-IN")}</td>
                  </tr>
                )}
              </tfoot>
            </table>
            {order.notes && <p className="text-xs text-muted-foreground border-t border-border pt-2">Note: {order.notes}</p>}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
