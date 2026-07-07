"use client";

import { motion } from "framer-motion";
import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, MoreHorizontal, Phone, Mail, Eye, Edit, Package, Truck } from "lucide-react";
import { ExportButton } from "@/components/shared/export-button";
import { DataTable, type ColumnDef, type TableParams } from "@/components/shared/data-table";
import { useSuppliers } from "@/lib/hooks/use-suppliers";

// ─── Types ────────────────────────────────────────────────────────────────────

type Supplier = {
  id: string;
  name: string;
  contactPerson: string | null;
  email: string | null;
  phone: string | null;
  avgLeadDays: number;
  isActive: boolean;
  createdAt: string;
  _count: { products: number; purchaseOrders: number };
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SuppliersPage() {
  const [tableParams, setTableParams] = useState<TableParams>({
    page: 1, limit: 20, search: "", sortBy: "", sortOrder: "asc",
  });

  const apiQuery = useMemo(() => ({
    page: tableParams.page,
    limit: tableParams.limit,
    search: tableParams.search || undefined,
    sortBy: tableParams.sortBy || undefined,
    sortOrder: tableParams.sortOrder,
  }), [tableParams]);

  const { data: suppliersRes, isLoading } = useSuppliers(apiQuery);

  const res       = suppliersRes as { data: Supplier[]; meta: { total: number } } | undefined;
  const suppliers = res?.data ?? [];
  const total     = res?.meta?.total ?? 0;
  const activeCount           = suppliers.filter(s => s.isActive).length;

  const handleParams = useCallback((p: TableParams) => setTableParams(p), []);

  const columns = useMemo<ColumnDef<Supplier>[]>(() => [
    {
      key: "name",
      header: "Supplier",
      sortable: true,
      getValue: r => r.name,
      cell: r => (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
              {r.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-medium leading-none">{r.name}</p>
            {r.contactPerson && (
              <p className="text-xs text-muted-foreground mt-0.5">{r.contactPerson}</p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "contact",
      header: "Contact",
      cell: r => (
        <div className="space-y-0.5">
          {r.phone && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Phone size={11} />{r.phone}
            </div>
          )}
          {r.email && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Mail size={11} />{r.email}
            </div>
          )}
          {!r.phone && !r.email && (
            <span className="text-xs text-muted-foreground/50">—</span>
          )}
        </div>
      ),
    },
    {
      key: "products",
      header: "Products",
      align: "center",
      sortable: true,
      getValue: r => r._count.products,
      cell: r => <span className="text-sm">{r._count.products}</span>,
    },
    {
      key: "purchaseOrders",
      header: "Orders",
      align: "center",
      sortable: true,
      getValue: r => r._count.purchaseOrders,
      cell: r => <span className="text-sm">{r._count.purchaseOrders}</span>,
    },
    {
      key: "avgLeadDays",
      header: "Lead Time",
      align: "center",
      sortable: true,
      getValue: r => r.avgLeadDays,
      cell: r => <span className="text-sm">{r.avgLeadDays} days</span>,
    },
    {
      key: "isActive",
      header: "Status",
      sortable: true,
      getValue: r => String(r.isActive),
      cell: r => (
        <Badge
          variant={r.isActive ? "default" : "secondary"}
          className="text-[10px] h-5 px-1.5"
        >
          {r.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      key: "_actions",
      header: "",
      cell: r => (
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => e.stopPropagation()} />}>
            <MoreHorizontal size={13} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem className="text-xs gap-2 cursor-pointer" render={<Link href={`/suppliers/${r.id}`} />}>
              <Eye size={12} /> View
            </DropdownMenuItem>
            <DropdownMenuItem className="text-xs gap-2 cursor-pointer" render={<Link href={`/suppliers/${r.id}`} />}>
              <Edit size={12} /> Edit
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ], []);

  return (
    <div className="space-y-5">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"
      >
        <div>
          <h1 className="text-xl font-bold tracking-tight">Suppliers</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {total} supplier{total !== 1 ? "s" : ""} · {activeCount} active
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton
            filename="suppliers"
            sheetName="Suppliers"
            data={suppliers.map(s => ({
              Name: s.name,
              "Contact Person": s.contactPerson,
              Phone: s.phone,
              Email: s.email,
              Products: s._count.products,
              Orders: s._count.purchaseOrders,
              "Lead Days": s.avgLeadDays,
              Status: s.isActive ? "Active" : "Inactive",
            }))}
          />
          <Button render={<Link href="/suppliers/new" />} nativeButton={false} size="sm" className="gap-1.5">
            <Plus size={14} /> Add Supplier
          </Button>
        </div>
      </motion.div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Total Suppliers", value: total,        icon: <Package size={16} /> },
          { label: "Active",          value: activeCount,  icon: <Package size={16} /> },
          { label: "Avg Lead Time",
            value: suppliers.length
              ? `${(suppliers.reduce((a, s) => a + s.avgLeadDays, 0) / suppliers.length).toFixed(1)} days`
              : "—",
            icon: <Truck size={16} /> },
        ].map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 + i * 0.06 }}
          >
            <Card className="p-4 flex items-center gap-4">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">{card.icon}</div>
              <div>
                <p className="text-2xl font-bold">{card.value}</p>
                <p className="text-xs text-muted-foreground">{card.label}</p>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <Card>
          <DataTable<Supplier>
            columns={columns}
            data={suppliers}
            rowKey={r => r.id}
            total={total}
            isLoading={isLoading}
            onParamsChange={handleParams}
            initialPageSize={20}
            searchPlaceholder="Search suppliers, contact, email…"
            emptyMessage="No suppliers found. Try adjusting your search."
          />
        </Card>
      </motion.div>
    </div>
  );
}
