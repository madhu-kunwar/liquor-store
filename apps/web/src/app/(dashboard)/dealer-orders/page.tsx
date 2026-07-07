"use client";

import { motion } from "framer-motion";
import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Eye, CheckCircle2, XCircle, Truck, Clock, Send, PackageCheck, MoreHorizontal } from "lucide-react";
import { ExportButton } from "@/components/shared/export-button";
import { DataTable, type ColumnDef } from "@/components/shared/data-table";
import { useDealerOrders, useConfirmDealerOrder, useDispatchDealerOrder, useCancelDealerOrder } from "@/lib/hooks/use-dealer-orders";

type DealerOrder = {
  id: string; orderNumber: string; status: string; paymentType: string;
  totalAmount: number; paidAmount: number; paymentStatus: string;
  createdAt: string; dispatchDate?: string;
  customer: { id: string; name: string; phone?: string };
  items: { orderedQty: number }[];
};

const STATUS_CFG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  DRAFT:      { label: "Draft",      icon: Clock,        color: "bg-muted text-muted-foreground border-border" },
  CONFIRMED:  { label: "Confirmed",  icon: Send,         color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  DISPATCHED: { label: "Dispatched", icon: Truck,        color: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
  DELIVERED:  { label: "Delivered",  icon: PackageCheck, color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" },
  CANCELLED:  { label: "Cancelled",  icon: XCircle,      color: "bg-red-500/10 text-red-400 border-red-500/20" },
};

const PAY_STATUS_CFG: Record<string, { label: string; color: string }> = {
  UNPAID:  { label: "Unpaid",  color: "text-red-400 bg-red-500/10 border-red-500/20" },
  PARTIAL: { label: "Partial", color: "text-amber-500 bg-amber-500/10 border-amber-500/20" },
  PAID:    { label: "Paid",    color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" },
};

const TABS = [
  { value: "all",        label: "All"        },
  { value: "DRAFT",      label: "Draft"      },
  { value: "CONFIRMED",  label: "Confirmed"  },
  { value: "DISPATCHED", label: "Dispatched" },
  { value: "DELIVERED",  label: "Delivered"  },
];

export default function DealerOrdersPage() {
  const router = useRouter();
  const [activeTab,    setActiveTab   ] = useState("all");
  const [cancelTarget, setCancelTarget] = useState<DealerOrder | null>(null);

  const { data, isLoading } = useDealerOrders(activeTab !== "all" ? { status: activeTab } : {});
  const confirm  = useConfirmDealerOrder();
  const dispatch = useDispatchDealerOrder();
  const cancel   = useCancelDealerOrder();

  const orders: DealerOrder[] = useMemo(() => (data as DealerOrder[] | undefined) ?? [], [data]);

  const totalOutstanding = useMemo(() =>
    orders.filter(o => o.status !== "CANCELLED").reduce((a, o) => a + (Number(o.totalAmount) - Number(o.paidAmount)), 0),
  [orders]);
  const todayCount     = useMemo(() => { const t = new Date().toDateString(); return orders.filter(o => new Date(o.createdAt).toDateString() === t).length; }, [orders]);
  const pendingDispatch = useMemo(() => orders.filter(o => o.status === "CONFIRMED").length, [orders]);

  const columns = useMemo<ColumnDef<DealerOrder>[]>(() => [
    {
      key: "orderNumber", header: "Order #", sortable: true, getValue: o => o.orderNumber,
      cell: o => <span className="font-mono text-sm font-medium text-primary">{o.orderNumber}</span>,
    },
    {
      key: "customer", header: "Customer", sortable: true, getValue: o => o.customer?.name,
      cell: o => (
        <div>
          <p className="text-sm font-medium">{o.customer?.name ?? "—"}</p>
          {o.customer?.phone && <p className="text-[10px] text-muted-foreground">{o.customer.phone}</p>}
        </div>
      ),
    },
    {
      key: "items", header: "Units", align: "center", getValue: o => o.items?.reduce((a, i) => a + i.orderedQty, 0),
      cell: o => <span className="text-sm tabular-nums">{o.items?.reduce((a, i) => a + i.orderedQty, 0) ?? 0}</span>,
    },
    {
      key: "totalAmount", header: "Total", align: "right", sortable: true, getValue: o => Number(o.totalAmount),
      cell: o => <span className="text-sm font-semibold tabular-nums">रू{Number(o.totalAmount).toLocaleString("en-IN")}</span>,
    },
    {
      key: "balance", header: "Balance", align: "right", getValue: o => Number(o.totalAmount) - Number(o.paidAmount),
      cell: o => {
        const bal = Number(o.totalAmount) - Number(o.paidAmount);
        return <span className={`text-sm font-semibold tabular-nums ${bal > 0 ? "text-orange-500" : "text-muted-foreground"}`}>{bal > 0 ? `रू${bal.toLocaleString("en-IN")}` : "—"}</span>;
      },
    },
    {
      key: "status", header: "Status", sortable: true, getValue: o => o.status,
      cell: o => { const cfg = STATUS_CFG[o.status] ?? STATUS_CFG.DRAFT; const Icon = cfg.icon; return <Badge variant="outline" className={`text-[10px] h-5 px-1.5 gap-1 ${cfg.color}`}><Icon size={9} />{cfg.label}</Badge>; },
    },
    {
      key: "paymentStatus", header: "Payment", getValue: o => o.paymentStatus,
      cell: o => { const cfg = PAY_STATUS_CFG[o.paymentStatus] ?? PAY_STATUS_CFG.UNPAID; return <Badge variant="outline" className={`text-[10px] h-5 px-1.5 ${cfg.color}`}>{cfg.label}</Badge>; },
    },
    {
      key: "createdAt", header: "Date", sortable: true, getValue: o => o.createdAt,
      cell: o => <span className="text-xs text-muted-foreground whitespace-nowrap">{new Date(o.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" })}</span>,
    },
    {
      key: "_actions", header: "",
      cell: o => (
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => e.stopPropagation()} />}>
            <MoreHorizontal size={14} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="text-xs">
            <DropdownMenuItem render={<Link href={`/dealer-orders/${o.id}`} />} className="flex items-center gap-2"><Eye size={12} /> View Details</DropdownMenuItem>
            {o.status === "DRAFT" && (
              <DropdownMenuItem onClick={() => confirm.mutate(o.id)} className="flex items-center gap-2 text-blue-500">
                <CheckCircle2 size={12} /> Confirm
              </DropdownMenuItem>
            )}
            {o.status === "CONFIRMED" && (
              <DropdownMenuItem onClick={() => dispatch.mutate(o.id)} className="flex items-center gap-2 text-amber-500">
                <Truck size={12} /> Dispatch
              </DropdownMenuItem>
            )}
            {o.status !== "CANCELLED" && o.status !== "DELIVERED" && (
              <DropdownMenuItem onClick={() => setCancelTarget(o)} className="flex items-center gap-2 text-destructive">
                <XCircle size={12} /> Cancel
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ], [confirm, dispatch]);

  return (
    <div className="space-y-5">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Dealer Orders</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage outgoing orders to your retail customers</p>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton filename="dealer-orders" sheetName="Orders" data={orders.map(o => ({ "Order #": o.orderNumber, Customer: o.customer?.name, Units: o.items?.reduce((a, i) => a + i.orderedQty, 0), "Total (रू)": Number(o.totalAmount), "Paid (रू)": Number(o.paidAmount), Status: o.status, Payment: o.paymentStatus, Date: new Date(o.createdAt).toLocaleString() }))} />
          <Button size="sm" className="gap-1.5" render={<Link href="/dealer-orders/new" />} nativeButton={false}>
            <Plus size={14} /> New Order
          </Button>
        </div>
      </motion.div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Today's Orders",   value: isLoading ? null : todayCount,   color: "text-foreground" },
          { label: "Pending Dispatch", value: isLoading ? null : pendingDispatch, color: "text-blue-500" },
          { label: "Outstanding",      value: isLoading ? null : `रू${totalOutstanding.toLocaleString("en-IN")}`, color: "text-orange-500" },
          { label: "Active Orders",    value: isLoading ? null : orders.filter(o => !["CANCELLED", "DELIVERED"].includes(o.status)).length, color: "text-foreground" },
        ].map((c, i) => (
          <motion.div key={c.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 + i * 0.04 }}>
            <Card className="p-4">
              {c.value === null ? <Skeleton className="h-7 w-20 mb-1" /> : <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>}
              <p className="text-xs text-muted-foreground mt-1">{c.label}</p>
            </Card>
          </motion.div>
        ))}
      </div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-3">
          <TabsList className="h-8">
            {TABS.map(t => (
              <TabsTrigger key={t.value} value={t.value} className="text-xs h-7 px-3">
                {t.label}
                {t.value !== "all" && !isLoading && (
                  <span className="ml-1.5 text-[10px] opacity-60">
                    {orders.filter(o => o.status === t.value).length}
                  </span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <Card>
          <DataTable<DealerOrder>
            columns={columns} data={orders} rowKey={o => o.id} clientSide isLoading={isLoading}
            initialPageSize={20} initialSortBy="createdAt" initialSortOrder="desc"
            searchPlaceholder="Search by order number or customer…" emptyMessage="No dealer orders yet."
            onRowClick={o => router.push(`/dealer-orders/${o.id}`)}
          />
        </Card>
      </motion.div>

      <Dialog open={!!cancelTarget} onOpenChange={o => !o && setCancelTarget(null)}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader><DialogTitle className="flex items-center gap-2 text-sm text-destructive"><XCircle size={14} /> Cancel Order</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Cancel <span className="font-semibold text-foreground">{cancelTarget?.orderNumber}</span>?{cancelTarget?.status === "DISPATCHED" && " Stock will be reversed."}</p>
          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1 h-9" onClick={() => setCancelTarget(null)}>Keep</Button>
            <Button variant="destructive" className="flex-1 h-9" disabled={cancel.isPending} onClick={() => cancel.mutate(cancelTarget!.id, { onSuccess: () => setCancelTarget(null) })}>
              {cancel.isPending ? "Cancelling…" : "Cancel Order"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
