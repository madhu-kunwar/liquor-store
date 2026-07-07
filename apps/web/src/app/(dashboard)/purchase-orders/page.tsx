"use client";

import { motion } from "framer-motion";
import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, Eye, CheckCircle2, XCircle, Truck, Clock, MoreHorizontal, Send } from "lucide-react";
import { ExportButton } from "@/components/shared/export-button";
import { DataTable, type ColumnDef } from "@/components/shared/data-table";
import { usePurchaseOrders, useCancelPurchaseOrder, useMarkAsSent } from "@/lib/hooks/use-purchase-orders";

type PO = {
  id: string;
  poNumber: string;
  status: string;
  totalAmount: number;
  expectedDate?: string;
  createdAt: string;
  supplier: { name: string };
  items: unknown[];
};

const STATUS_CFG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  DRAFT:            { label: "Draft",    icon: Clock,        color: "bg-muted text-muted-foreground border-border" },
  SENT:             { label: "Sent",     icon: Truck,        color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  PARTIAL_RECEIVED: { label: "Partial",  icon: CheckCircle2, color: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
  RECEIVED:         { label: "Received", icon: CheckCircle2, color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" },
  CANCELLED:        { label: "Cancelled",icon: XCircle,      color: "bg-red-500/10 text-red-400 border-red-500/20" },
};

const TABS = [
  { value: "all",             label: "All" },
  { value: "DRAFT",           label: "Draft" },
  { value: "SENT",            label: "Sent" },
  { value: "PARTIAL_RECEIVED",label: "Partial" },
  { value: "RECEIVED",        label: "Received" },
];

export default function PurchaseOrdersPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("all");
  const [cancelTarget, setCancelTarget] = useState<PO | null>(null);

  const { data, isLoading } = usePurchaseOrders(activeTab === "all" ? undefined : activeTab);
  const cancelPO  = useCancelPurchaseOrder();
  const markSent  = useMarkAsSent();

  const orders: PO[] = useMemo(() => {
    const raw = data as PO[] | undefined;
    return raw ?? [];
  }, [data]);

  const columns = useMemo<ColumnDef<PO>[]>(() => [
    {
      key: "poNumber",
      header: "PO Number",
      sortable: true,
      getValue: p => p.poNumber,
      cell: p => (
        <Link href={`/purchase-orders/${p.id}`} className="font-mono text-sm font-medium hover:text-primary transition-colors">
          {p.poNumber}
        </Link>
      ),
    },
    {
      key: "supplier",
      header: "Supplier",
      sortable: true,
      getValue: p => p.supplier?.name,
      cell: p => <span className="text-sm">{p.supplier?.name ?? "—"}</span>,
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      getValue: p => p.status,
      cell: p => {
        const cfg = STATUS_CFG[p.status] ?? { label: p.status, icon: Clock, color: "" };
        const Icon = cfg.icon;
        return (
          <Badge variant="outline" className={`text-[10px] h-5 px-1.5 gap-1 ${cfg.color}`}>
            <Icon size={9} /> {cfg.label}
          </Badge>
        );
      },
    },
    {
      key: "items",
      header: "Items",
      align: "center",
      sortable: true,
      getValue: p => (p.items as unknown[]).length,
      cell: p => <span className="text-sm">{(p.items as unknown[]).length}</span>,
    },
    {
      key: "totalAmount",
      header: "Total",
      align: "right",
      sortable: true,
      getValue: p => Number(p.totalAmount),
      cell: p => <span className="text-sm font-medium">रू{Number(p.totalAmount).toLocaleString("en-IN")}</span>,
    },
    {
      key: "expectedDate",
      header: "Expected",
      sortable: true,
      getValue: p => p.expectedDate ?? "",
      cell: p => (
        <span className="text-xs text-muted-foreground">
          {p.expectedDate ? new Date(p.expectedDate).toLocaleDateString("en-IN") : "—"}
        </span>
      ),
    },
    {
      key: "createdAt",
      header: "Created",
      sortable: true,
      getValue: p => p.createdAt,
      cell: p => <span className="text-xs text-muted-foreground">{new Date(p.createdAt).toLocaleDateString("en-IN")}</span>,
    },
    {
      key: "_actions",
      header: "",
      cell: p => (
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => e.stopPropagation()} />}>
            <MoreHorizontal size={13} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem className="text-xs gap-2 cursor-pointer" render={<Link href={`/purchase-orders/${p.id}`} />}>
              <Eye size={12} /> View Details
            </DropdownMenuItem>
            {p.status === "DRAFT" && (
              <DropdownMenuItem
                className="text-xs gap-2 cursor-pointer text-blue-500 focus:text-blue-500"
                onClick={() => markSent.mutate(p.id)}
              >
                <Send size={12} /> Mark as Sent
              </DropdownMenuItem>
            )}
            {(p.status === "SENT" || p.status === "PARTIAL_RECEIVED") && (
              <DropdownMenuItem
                className="text-xs gap-2 cursor-pointer text-emerald-500 focus:text-emerald-500"
                onClick={() => router.push(`/purchase-orders/${p.id}`)}
              >
                <CheckCircle2 size={12} /> Receive Goods
              </DropdownMenuItem>
            )}
            {["DRAFT", "SENT"].includes(p.status) && (
              <DropdownMenuItem
                className="text-xs gap-2 cursor-pointer text-destructive focus:text-destructive"
                onClick={() => setCancelTarget(p)}
              >
                <XCircle size={12} /> Cancel
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ], [router, cancelPO]);

  const pending = orders.filter(o => ["DRAFT", "SENT", "PARTIAL_RECEIVED"].includes(o.status));
  const totalVal = orders.reduce((a, o) => a + Number(o.totalAmount), 0);

  return (
    <div className="space-y-5">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Purchase Orders</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{pending.length} active orders</p>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton
            filename="purchase-orders"
            sheetName="Purchase Orders"
            data={orders.map(o => ({
              "PO Number": o.poNumber, Supplier: o.supplier?.name, Status: o.status,
              Items: (o.items as unknown[]).length, "Total (रू)": Number(o.totalAmount),
              Expected: o.expectedDate, Created: new Date(o.createdAt).toLocaleDateString(),
            }))}
          />
          <Button render={<Link href="/purchase-orders/new" />} nativeButton={false} size="sm" className="gap-1.5">
            <Plus size={14} /> New Order
          </Button>
        </div>
      </motion.div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Orders",  value: orders.length },
          { label: "Pending",       value: pending.length },
          { label: "Total Value",   value: `रू${(totalVal / 1000).toFixed(0)}K` },
          { label: "Received",      value: orders.filter(o => o.status === "RECEIVED").length },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 + i * 0.05 }}>
            <Card className="p-4">
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </Card>
          </motion.div>
        ))}
      </div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
        <Card>
          <div className="px-4 pt-3 pb-0 border-b border-border">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="h-8 bg-transparent gap-1 p-0">
                {TABS.map(t => (
                  <TabsTrigger key={t.value} value={t.value} className="h-8 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-xs px-3">
                    {t.label}
                    <Badge variant="secondary" className="ml-1.5 h-4 px-1 text-[9px]">
                      {t.value === "all" ? orders.length : orders.filter(o => o.status === t.value).length}
                    </Badge>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
          <DataTable<PO>
            columns={columns}
            data={orders}
            rowKey={p => p.id}
            clientSide
            isLoading={isLoading}
            initialPageSize={20}
            searchPlaceholder="Search PO number or supplier…"
            emptyMessage="No purchase orders found."
          />
        </Card>
      </motion.div>

      {/* Cancel confirm */}
      <Dialog open={!!cancelTarget} onOpenChange={o => !o && setCancelTarget(null)}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>Cancel Purchase Order</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Cancel <span className="font-semibold text-foreground">{cancelTarget?.poNumber}</span>? This cannot be undone.
          </p>
          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1" onClick={() => setCancelTarget(null)}>Back</Button>
            <Button
              variant="destructive"
              className="flex-1"
              disabled={cancelPO.isPending}
              onClick={() => cancelPO.mutate(cancelTarget!.id, { onSuccess: () => setCancelTarget(null) })}
            >
              Cancel PO
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
