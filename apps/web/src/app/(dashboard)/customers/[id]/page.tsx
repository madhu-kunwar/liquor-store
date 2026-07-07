"use client";

import { motion } from "framer-motion";
import { useParams } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Phone, Mail, MapPin, ShoppingBag, Pencil, Loader2, BadgeDollarSign } from "lucide-react";
import { useCustomer, useUpdateCustomer } from "@/lib/hooks/use-customers";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading } = useCustomer(id);
  const update = useUpdateCustomer();
  const qc = useQueryClient();

  const [editOpen, setEditOpen]     = useState(false);
  const [settleOpen, setSettleOpen] = useState(false);
  const [settleAmount, setSettleAmount] = useState("");
  const [settling, setSettling]     = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "", address: "" });

  const handleSettle = async () => {
    const amount = Number(settleAmount);
    if (!amount || amount <= 0) return;
    setSettling(true);
    try {
      await api.post("/sales/settle-credit", { customerId: id, amount });
      toast.success(`रू${amount.toLocaleString("en-IN")} settled`);
      qc.invalidateQueries({ queryKey: ["customers"] });
      setSettleOpen(false);
      setSettleAmount("");
    } catch {
      toast.error("Failed to settle credit");
    } finally {
      setSettling(false);
    }
  };

  const customer = data as any;

  const openEdit = () => {
    if (!customer) return;
    setForm({ name: customer.name, phone: customer.phone ?? "", email: customer.email ?? "", address: customer.address ?? "" });
    setEditOpen(true);
  };

  const handleSave = async () => {
    await update.mutateAsync({ id, name: form.name, phone: form.phone || undefined, email: form.email || undefined, address: form.address || undefined });
    setEditOpen(false);
  };

  if (isLoading) {
    return (
      <div className="space-y-5 max-w-2xl mx-auto">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!customer) return null;

  const totalSpend = (customer.sales ?? []).reduce((a: number, s: any) => a + Number(s.totalAmount), 0);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
        <Button render={<Link href="/customers" />} nativeButton={false} variant="ghost" size="icon" className="h-8 w-8">
          <ArrowLeft size={16} />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold tracking-tight">{customer.name}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Customer since {new Date(customer.createdAt).toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</p>
        </div>
        <div className="flex items-center gap-2">
          {Number(customer.creditBalance) > 0 && (
            <Button size="sm" className="gap-1.5 bg-orange-500 hover:bg-orange-600" onClick={() => setSettleOpen(true)}>
              <BadgeDollarSign size={13} /> Settle Credit
            </Button>
          )}
          <Button variant="outline" size="sm" className="gap-1.5" onClick={openEdit}>
            <Pencil size={13} /> Edit
          </Button>
        </div>
      </motion.div>

      {/* Info card */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
        <Card>
          <CardContent className="pt-5 space-y-3">
            {customer.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone size={14} className="text-muted-foreground" />
                <span>{customer.phone}</span>
              </div>
            )}
            {customer.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail size={14} className="text-muted-foreground" />
                <span>{customer.email}</span>
              </div>
            )}
            {customer.address && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin size={14} className="text-muted-foreground" />
                <span>{customer.address}</span>
              </div>
            )}
            <div className="pt-2 flex gap-6 border-t border-border flex-wrap">
              <div>
                <p className="text-2xl font-bold">{customer.sales?.length ?? 0}</p>
                <p className="text-xs text-muted-foreground">Total Purchases</p>
              </div>
              <div>
                <p className="text-2xl font-bold">रू{totalSpend.toLocaleString("en-IN")}</p>
                <p className="text-xs text-muted-foreground">Total Spent</p>
              </div>
              {Number(customer.creditBalance) > 0 && (
                <div>
                  <p className="text-2xl font-bold text-orange-500">रू{Number(customer.creditBalance).toLocaleString("en-IN")}</p>
                  <p className="text-xs text-muted-foreground">Outstanding (Khata)</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Purchase history */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <ShoppingBag size={14} /> Recent Purchases
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(!customer.sales || customer.sales.length === 0) && (
              <p className="text-sm text-muted-foreground text-center py-6">No purchases yet</p>
            )}
            {(customer.sales ?? []).map((sale: any, i: number) => (
              <motion.div
                key={sale.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 + i * 0.04 }}
                className="rounded-lg border border-border p-3 space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium font-mono">{sale.saleNumber}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {new Date(sale.createdAt).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      {" · "}{sale.paymentType}
                    </p>
                  </div>
                  <span className="text-base font-bold shrink-0">रू{Number(sale.totalAmount).toLocaleString("en-IN")}</span>
                </div>
                {/* Line items */}
                {(sale.items ?? []).length > 0 && (
                  <div className="space-y-1 pt-1 border-t border-border/50">
                    {(sale.items ?? []).map((item: any, j: number) => (
                      <div key={j} className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">
                          {item.variant?.product?.name ?? "Unknown"}
                          {item.variant?.size ? ` (${item.variant.size})` : ""}
                          {" ×"}{item.quantity}
                        </span>
                        <span className="tabular-nums">रू{Number(item.totalPrice).toLocaleString("en-IN")}</span>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            ))}
          </CardContent>
        </Card>
      </motion.div>

      {/* Settle credit dialog */}
      <Dialog open={settleOpen} onOpenChange={setSettleOpen}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><BadgeDollarSign size={15} /> Settle Credit</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-1">
            <div className="rounded-md bg-muted px-3 py-2 text-xs">
              Outstanding balance: <span className="font-bold text-orange-500">रू{Number(customer?.creditBalance ?? 0).toLocaleString("en-IN")}</span>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Amount Received (रू)</Label>
              <Input type="number" min={0} step="0.01" value={settleAmount} onChange={e => setSettleAmount(e.target.value)} placeholder="0.00" className="text-sm" />
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setSettleOpen(false)}>Cancel</Button>
              <Button className="flex-1 gap-1.5 bg-orange-500 hover:bg-orange-600" disabled={!settleAmount || settling} onClick={handleSettle}>
                {settling ? <><Loader2 size={13} className="animate-spin" /> Settling…</> : "Mark as Settled"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Edit Customer</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-1">
            <div className="space-y-1.5">
              <Label className="text-xs">Full Name *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Phone</Label>
              <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="text-sm" type="tel" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Email</Label>
              <Input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="text-sm" type="email" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Address</Label>
              <Textarea value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} className="text-sm resize-none h-16" />
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button className="flex-1 gap-1.5" disabled={!form.name.trim() || update.isPending} onClick={handleSave}>
                {update.isPending ? <><Loader2 size={13} className="animate-spin" /> Saving…</> : "Save Changes"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
