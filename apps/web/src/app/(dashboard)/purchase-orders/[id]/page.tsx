"use client";

import { motion } from "framer-motion";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { usePurchaseOrder, useReceiveGoods, useCancelPO } from "@/lib/hooks/use-purchase-orders";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, CheckCircle2, XCircle, Truck, Loader2, PackageCheck } from "lucide-react";
import Link from "next/link";

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  DRAFT:            { label: "Draft",            color: "bg-muted text-muted-foreground" },
  SENT:             { label: "Sent",             color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  PARTIAL_RECEIVED: { label: "Partially Received", color: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
  RECEIVED:         { label: "Fully Received",   color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" },
  CANCELLED:        { label: "Cancelled",        color: "bg-red-500/10 text-red-400 border-red-500/20" },
};

export default function PODetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: po, isLoading } = usePurchaseOrder(id);
  const { mutate: receive, isPending: receiving } = useReceiveGoods(id);
  const { mutate: cancel, isPending: cancelling } = useCancelPO(id);
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [receiveQtys, setReceiveQtys] = useState<Record<string, number>>({});

  if (isLoading) return <POSkeleton />;
  if (!po) return <div className="text-sm text-muted-foreground">Purchase order not found.</div>;

  const p = po as any;
  const statusCfg = STATUS_CONFIG[p.status] || STATUS_CONFIG.DRAFT;
  const canReceive = ["SENT", "PARTIAL_RECEIVED"].includes(p.status);

  const handleReceive = () => {
    const items = p.items
      .filter((item: any) => (receiveQtys[item.id] || 0) > 0)
      .map((item: any) => ({ poItemId: item.id, receivedQty: receiveQtys[item.id] }));
    if (!items.length) return;
    receive(items, { onSuccess: () => setReceiveOpen(false) });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button render={<Link href="/purchase-orders" />} nativeButton={false} variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft size={16} />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold font-mono">{p.poNumber}</h1>
              <Badge variant="outline" className={`text-[10px] h-5 px-1.5 ${statusCfg.color}`}>{statusCfg.label}</Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">{p.supplier?.name} · Created {new Date(p.createdAt).toLocaleDateString()}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {canReceive && (
            <Dialog open={receiveOpen} onOpenChange={setReceiveOpen}>
              <DialogTrigger render={<Button size="sm" className="gap-1.5" />}>
                <PackageCheck size={14} /> Receive Goods
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader><DialogTitle>Receive Goods</DialogTitle></DialogHeader>
                <div className="space-y-3 pt-2">
                  {p.items.map((item: any) => {
                    const remaining = item.orderedQty - item.receivedQty;
                    return (
                      <div key={item.id} className="flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{item.variant?.product?.name} — {item.variant?.unit} {item.variant?.size}</p>
                          <p className="text-xs text-muted-foreground">Ordered: {item.orderedQty} · Received: {item.receivedQty} · Remaining: {remaining}</p>
                        </div>
                        <Input type="number" min={0} max={remaining} placeholder="0"
                          className="w-20 h-8 text-sm text-center"
                          onChange={e => setReceiveQtys(prev => ({ ...prev, [item.id]: parseInt(e.target.value) || 0 }))}
                          disabled={remaining === 0} />
                      </div>
                    );
                  })}
                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" className="flex-1" onClick={() => setReceiveOpen(false)}>Cancel</Button>
                    <Button className="flex-1 gap-2" onClick={handleReceive} disabled={receiving}>
                      {receiving ? <><Loader2 size={13} className="animate-spin" /> Receiving...</> : "Confirm Receipt"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
          {["DRAFT","SENT"].includes(p.status) && (
            <Button variant="outline" size="sm" className="gap-1.5 text-destructive hover:text-destructive"
              onClick={() => cancel(undefined, { onSuccess: () => router.push("/purchase-orders") })} disabled={cancelling}>
              <XCircle size={13} /> Cancel PO
            </Button>
          )}
        </div>
      </motion.div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Items", value: p.items?.length },
          { label: "Order Value", value: `रू${Number(p.totalAmount).toLocaleString("en-IN")}` },
          { label: "Expected Date", value: p.expectedDate ? new Date(p.expectedDate).toLocaleDateString() : "—" },
          { label: "Received Date", value: p.receivedDate ? new Date(p.receivedDate).toLocaleDateString() : "Pending" },
        ].map((c, i) => (
          <motion.div key={c.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 + i * 0.05 }}>
            <Card className="p-4">
              <p className="text-xs text-muted-foreground">{c.label}</p>
              <p className="text-lg font-bold mt-1">{c.value}</p>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Line items */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}>
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Order Items</CardTitle></CardHeader>
          <CardContent className="pt-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-xs">Product</TableHead>
                    <TableHead className="text-xs text-right">Unit Cost</TableHead>
                    <TableHead className="text-xs text-right">Ordered</TableHead>
                    <TableHead className="text-xs text-right">Received</TableHead>
                    <TableHead className="text-xs text-right">Remaining</TableHead>
                    <TableHead className="text-xs text-right">Subtotal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {p.items?.map((item: any) => (
                    <TableRow key={item.id} className="hover:bg-accent/30">
                      <TableCell className="py-3">
                        <p className="text-sm font-medium">{item.variant?.product?.name}</p>
                        <p className="text-xs text-muted-foreground">{item.variant?.unit} {item.variant?.size}</p>
                      </TableCell>
                      <TableCell className="text-right text-sm">रू{Number(item.unitCost).toLocaleString()}</TableCell>
                      <TableCell className="text-right text-sm">{item.orderedQty}</TableCell>
                      <TableCell className="text-right text-sm text-emerald-500">{item.receivedQty}</TableCell>
                      <TableCell className="text-right text-sm">{item.orderedQty - item.receivedQty}</TableCell>
                      <TableCell className="text-right text-sm font-medium">रू{(item.orderedQty * Number(item.unitCost)).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="border-t border-border/50">
                    <TableCell colSpan={5} className="text-xs text-right text-muted-foreground">Subtotal (excl. VAT)</TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">रू{Number(p.totalAmount).toLocaleString("en-IN")}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell colSpan={5} className="text-xs text-right text-muted-foreground">VAT (13%)</TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">रू{(Number(p.totalAmount) * 0.13).toLocaleString("en-IN", { maximumFractionDigits: 2 })}</TableCell>
                  </TableRow>
                  <TableRow className="border-t-2">
                    <TableCell colSpan={5} className="text-sm font-bold text-right">Total incl. VAT</TableCell>
                    <TableCell className="text-right font-bold text-primary">रू{(Number(p.totalAmount) * 1.13).toLocaleString("en-IN", { maximumFractionDigits: 2 })}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {p.notes && <Card className="p-4"><p className="text-xs text-muted-foreground mb-1">Notes</p><p className="text-sm">{p.notes}</p></Card>}
    </div>
  );
}

function POSkeleton() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3"><Skeleton className="h-8 w-8" /><div className="space-y-1"><Skeleton className="h-6 w-48" /><Skeleton className="h-4 w-40" /></div></div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
      <Skeleton className="h-64" />
    </div>
  );
}
