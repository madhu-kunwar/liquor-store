"use client";

import { motion } from "framer-motion";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Loader2, Plus, Trash2, ClipboardList, User, Banknote, CreditCard, Smartphone } from "lucide-react";
import { useCreateDealerOrder } from "@/lib/hooks/use-dealer-orders";
import { useCustomers } from "@/lib/hooks/use-customers";
import { useProducts } from "@/lib/hooks/use-products";
import { cn } from "@/lib/utils";

type LineItem = { variantId: string; orderedQty: number; unitPrice: number };
const EMPTY: LineItem = { variantId: "", orderedQty: 1, unitPrice: 0 };

const PAYMENT_OPTS = [
  { value: "CASH",   label: "Cash",          icon: Banknote },
  { value: "CARD",   label: "Card",          icon: CreditCard },
  { value: "UPI",    label: "UPI",           icon: Smartphone },
  { value: "CREDIT", label: "Credit (Khata)",icon: User },
];

export default function NewDealerOrderPage() {
  const router = useRouter();
  const createOrder = useCreateDealerOrder();
  const { data: customersData } = useCustomers();
  const { data: productsData  } = useProducts();

  const customers = useMemo(() => (customersData as any)?.data ?? [], [customersData]);
  const products: any[]  = useMemo(() => (productsData as any)?.data ?? [], [productsData]);
  const allVariants = useMemo(() =>
    products.flatMap((p: any) =>
      (p.variants ?? []).filter((v: any) => v.isActive).map((v: any) => ({
        id: v.id,
        label: `${p.name} — ${v.unit}${v.size ? ` ${v.size}` : ""}`,
        sellingPrice: Number(v.sellingPrice),
        currentStock: v.currentStock,
        sku: p.sku,
      }))
    ), [products]);

  const [customerId,     setCustomerId    ] = useState("");
  const [paymentType,    setPaymentType   ] = useState("CASH");
  const [invoiceNumber,  setInvoiceNumber ] = useState("");
  const [notes,          setNotes         ] = useState("");
  const [items,          setItems         ] = useState<LineItem[]>([{ ...EMPTY }]);
  const [errors,         setErrors        ] = useState<Record<number, string>>({});

  const setItem = (i: number, patch: Partial<LineItem>) => {
    setItems(prev => prev.map((it, idx) => idx === i ? { ...it, ...patch } : it));
    setErrors(prev => { const n = { ...prev }; delete n[i]; return n; });
  };

  const subtotal = items.reduce((a, it) => a + it.orderedQty * it.unitPrice, 0);

  const validate = () => {
    const errs: Record<number, string> = {};
    items.forEach((it, i) => {
      if (!it.variantId) { errs[i] = "Select a product"; return; }
      const v = allVariants.find(a => a.id === it.variantId);
      if (v && it.orderedQty > v.currentStock) errs[i] = `Only ${v.currentStock} in stock`;
    });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!customerId) return;
    if (!validate()) return;
    const validItems = items.filter(it => it.variantId && it.orderedQty > 0);
    if (!validItems.length) return;
    const order = await createOrder.mutateAsync({ customerId, paymentType, invoiceNumber: invoiceNumber || undefined, notes: notes || undefined, items: validItems }) as any;
    router.push(`/dealer-orders/${order.id}`);
  };

  const selectedCustomer = customers.find((c: any) => c.id === customerId);

  return (
    <div className="space-y-5 max-w-3xl">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-xl font-bold tracking-tight flex items-center gap-2"><ClipboardList size={18} /> New Dealer Order</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Create an outgoing order for a retail customer</p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}>
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold flex items-center gap-2"><User size={13} /> Customer & Payment</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Customer *</Label>
              <Select value={customerId} onValueChange={v => v && setCustomerId(v)}>
                <SelectTrigger className="text-sm"><SelectValue placeholder="Select retailer / shop…">{customers.find((c: any) => c.id === customerId)?.name}</SelectValue></SelectTrigger>
                <SelectContent>
                  {customers.map((c: any) => (
                    <SelectItem key={c.id} value={c.id} label={c.name + (c.phone ? ` · ${c.phone}` : "")}>
                      <span>{c.name}</span>
                      {c.phone && <span className="ml-2 text-xs text-muted-foreground">{c.phone}</span>}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedCustomer?.creditBalance > 0 && (
                <p className="text-[10px] text-orange-500">Outstanding: रू{Number(selectedCustomer.creditBalance).toLocaleString("en-IN")}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Payment Method</Label>
              <Select value={paymentType} onValueChange={v => v && setPaymentType(v)}>
                <SelectTrigger className="text-sm"><SelectValue>{PAYMENT_OPTS.find(p => p.value === paymentType)?.label}</SelectValue></SelectTrigger>
                <SelectContent>
                  {PAYMENT_OPTS.map(p => {
                    const Icon = p.icon;
                    return <SelectItem key={p.value} value={p.value} label={p.label}><span className="flex items-center gap-2"><Icon size={13} />{p.label}</span></SelectItem>;
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Invoice Number</Label>
              <Input value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} placeholder="e.g. INV-2024-001" className="text-sm font-mono" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Notes</Label>
              <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional…" className="text-sm" />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Line items */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold">Order Items</CardTitle>
            <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={() => setItems(prev => [...prev, { ...EMPTY }])}>
              <Plus size={11} /> Add Item
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {items.map((item, i) => {
              const v = allVariants.find(a => a.id === item.variantId);
              return (
                <div key={i} className="rounded-lg border border-border p-3 space-y-3">
                  <div className="flex items-start gap-2">
                    <div className="flex-1 space-y-1.5">
                      <Label className="text-[10px] text-muted-foreground">Product Variant *</Label>
                      <Select value={item.variantId} onValueChange={val => {
                        if (!val) return;
                        const vari = allVariants.find(a => a.id === val);
                        setItem(i, { variantId: val, unitPrice: vari?.sellingPrice ?? 0 });
                      }}>
                        <SelectTrigger className="text-sm h-8"><SelectValue placeholder="Select product…">{v?.label}</SelectValue></SelectTrigger>
                        <SelectContent className="min-w-[480px] max-h-72">
                          {allVariants.map(a => (
                            <SelectItem key={a.id} value={a.id} label={`${a.label} (${a.currentStock} in stock)`} disabled={a.currentStock === 0}>
                              <span>{a.label}</span>
                              <span className={cn("ml-2 text-xs", a.currentStock === 0 ? "text-destructive" : "text-muted-foreground")}>({a.currentStock} in stock)</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 mt-5 text-muted-foreground hover:text-destructive" onClick={() => setItems(prev => prev.filter((_, idx) => idx !== i))} disabled={items.length === 1}>
                      <Trash2 size={12} />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] text-muted-foreground">Quantity *</Label>
                      <Input type="number" min={1} value={item.orderedQty} onChange={e => setItem(i, { orderedQty: Number(e.target.value) })} className="text-sm h-8" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] text-muted-foreground">Unit Price (रू) *</Label>
                      <Input type="number" step="0.01" min={0} value={item.unitPrice} onChange={e => setItem(i, { unitPrice: Number(e.target.value) })} className="text-sm h-8" />
                    </div>
                  </div>
                  {errors[i] && <p className="text-xs text-destructive">{errors[i]}</p>}
                  {v && <p className="text-[10px] text-muted-foreground">Line total: रू{(item.orderedQty * item.unitPrice).toLocaleString("en-IN")} · In stock: {v.currentStock}</p>}
                </div>
              );
            })}

            <Separator />
            <div className="flex justify-between items-center pt-1">
              <span className="text-sm text-muted-foreground">Order Total</span>
              <span className="text-xl font-bold">रू{subtotal.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</span>
            </div>

            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => router.back()}>Cancel</Button>
              <Button
                className="flex-1 gap-2"
                disabled={createOrder.isPending || !customerId || !items.some(it => it.variantId && it.orderedQty > 0)}
                onClick={handleSubmit}
              >
                {createOrder.isPending ? <><Loader2 size={14} className="animate-spin" /> Creating…</> : <><ClipboardList size={14} /> Create Order</>}
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
