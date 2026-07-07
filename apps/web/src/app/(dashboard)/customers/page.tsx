"use client";

import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { UserPlus, Users, MoreHorizontal, Eye, Trash2, ClipboardList, AlertTriangle, Phone, Mail, MapPin } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { DataTable, type ColumnDef } from "@/components/shared/data-table";
import { useCustomers, useCreateCustomer, useDeleteCustomer } from "@/lib/hooks/use-customers";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

type Customer = {
  id: string; name: string; phone?: string; email?: string; address?: string;
  isActive: boolean; createdAt: string; creditBalance: number; creditLimit: number;
  _count: { sales: number; dealerOrders: number };
};

export default function CustomersPage() {
  const { data, isLoading }  = useCustomers();
  const deleteCustomer       = useDeleteCustomer();
  const createCustomer       = useCreateCustomer();
  const router               = useRouter();

  const [addOpen,    setAddOpen   ] = useState(false);
  const [newName,    setNewName   ] = useState("");
  const [newPhone,   setNewPhone  ] = useState("");
  const [newEmail,   setNewEmail  ] = useState("");
  const [newAddress, setNewAddress] = useState("");

  const customers: Customer[] = useMemo(() => (data as any)?.data ?? [], [data]);

  const totalOutstanding = useMemo(() =>
    customers.reduce((a, c) => a + Number(c.creditBalance ?? 0), 0), [customers]);

  const withBalance = useMemo(() => customers.filter(c => Number(c.creditBalance) > 0).length, [customers]);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    await createCustomer.mutateAsync({ name: newName.trim(), phone: newPhone || undefined, email: newEmail || undefined, address: newAddress || undefined });
    setAddOpen(false); setNewName(""); setNewPhone(""); setNewEmail(""); setNewAddress("");
  };

  const columns = useMemo<ColumnDef<Customer>[]>(() => [
    {
      key: "name", header: "Customer", sortable: true, getValue: c => c.name,
      cell: c => (
        <div>
          <p className="text-sm font-medium">{c.name}</p>
          {c.email && <p className="text-[10px] text-muted-foreground">{c.email}</p>}
        </div>
      ),
    },
    {
      key: "phone", header: "Phone", getValue: c => c.phone ?? "",
      cell: c => <span className="text-sm font-mono text-muted-foreground">{c.phone ?? "—"}</span>,
    },
    {
      key: "dealerOrders", header: "Orders", align: "center", sortable: true, getValue: c => c._count?.dealerOrders ?? 0,
      cell: c => (
        <button
          className="hover:text-primary transition-colors"
          onClick={e => { e.stopPropagation(); router.push(`/dealer-orders?customerId=${c.id}`); }}
        >
          <Badge variant="outline" className="text-[10px] h-5 px-2 gap-1 cursor-pointer hover:border-primary/50">
            <ClipboardList size={9} />{c._count?.dealerOrders ?? 0}
          </Badge>
        </button>
      ),
    },
    {
      key: "sales", header: "Sales", align: "center", getValue: c => c._count?.sales ?? 0,
      cell: c => <Badge variant="outline" className="text-[10px] h-5 px-2">{c._count?.sales ?? 0}</Badge>,
    },
    {
      key: "creditBalance", header: "Outstanding", align: "right", sortable: true, getValue: c => Number(c.creditBalance ?? 0),
      cell: c => {
        const bal = Number(c.creditBalance ?? 0);
        if (bal <= 0) return <span className="text-xs text-muted-foreground">—</span>;
        return (
          <span className="flex items-center justify-end gap-1 text-sm font-semibold text-orange-500 tabular-nums">
            <AlertTriangle size={10} />रू{bal.toLocaleString("en-IN")}
          </span>
        );
      },
    },
    {
      key: "createdAt", header: "Since", getValue: c => c.createdAt,
      cell: c => <span className="text-xs text-muted-foreground whitespace-nowrap">{new Date(c.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span>,
    },
    {
      key: "_actions", header: "",
      cell: c => (
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => e.stopPropagation()} />}>
            <MoreHorizontal size={13} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem className="text-xs gap-2 cursor-pointer" onClick={() => router.push(`/customers/${c.id}`)}>
              <Eye size={12} /> View / Edit
            </DropdownMenuItem>
            <DropdownMenuItem className="text-xs gap-2 cursor-pointer" onClick={() => router.push(`/dealer-orders?customerId=${c.id}`)}>
              <ClipboardList size={12} /> View Orders
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-xs gap-2 cursor-pointer text-destructive focus:text-destructive"
              onClick={() => { if (window.confirm(`Deactivate ${c.name}?`)) deleteCustomer.mutate(c.id); }}
            >
              <Trash2 size={12} /> Deactivate
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ], [router, deleteCustomer]);

  return (
    <div className="space-y-5">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Customers</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Retail shops and dealers you supply to</p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => setAddOpen(true)}>
          <UserPlus size={14} /> Add Customer
        </Button>
      </motion.div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { label: "Total Customers",    value: isLoading ? null : customers.length,    color: "text-foreground" },
          { label: "With Outstanding",   value: isLoading ? null : withBalance,          color: "text-orange-500" },
          { label: "Total Outstanding",  value: isLoading ? null : totalOutstanding > 0 ? `रू${totalOutstanding.toLocaleString("en-IN")}` : "—", color: "text-orange-500" },
        ].map((c, i) => (
          <motion.div key={c.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 + i * 0.04 }}>
            <Card className="p-4">
              {c.value === null ? <Skeleton className="h-7 w-20 mb-1" /> : <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>}
              <p className="text-xs text-muted-foreground mt-1">{c.label}</p>
            </Card>
          </motion.div>
        ))}
      </div>

      {customers.length === 0 && !isLoading ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
          <Card className="p-12 text-center">
            <Users size={40} className="mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium">No customers yet</p>
            <p className="text-xs text-muted-foreground mt-1 mb-4">Add your first customer to start creating dealer orders</p>
            <Button size="sm" className="gap-1.5" onClick={() => setAddOpen(true)}><UserPlus size={14} /> Add Customer</Button>
          </Card>
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card>
            <DataTable<Customer>
              columns={columns} data={customers} rowKey={c => c.id} clientSide isLoading={isLoading}
              initialPageSize={25} searchPlaceholder="Search name, phone, email…" emptyMessage="No customers found."
              onRowClick={c => router.push(`/customers/${c.id}`)}
            />
          </Card>
        </motion.div>
      )}

      {/* Quick Add Customer dialog */}
      <Dialog open={addOpen} onOpenChange={o => !o && setAddOpen(false)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm"><UserPlus size={14} /> Add Customer</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            <div className="space-y-1.5">
              <Label className="text-xs">Name *</Label>
              <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Shop / retailer name" className="text-sm h-9" autoFocus onKeyDown={e => e.key === "Enter" && handleAdd()} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1"><Phone size={10} /> Phone</Label>
              <Input value={newPhone} onChange={e => setNewPhone(e.target.value)} placeholder="98XXXXXXXX" className="text-sm h-9 font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1"><Mail size={10} /> Email</Label>
              <Input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="shop@example.com" className="text-sm h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1"><MapPin size={10} /> Address</Label>
              <Input value={newAddress} onChange={e => setNewAddress(e.target.value)} placeholder="Shop address" className="text-sm h-9" />
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1 h-9" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button className="flex-1 h-9 gap-1.5" disabled={createCustomer.isPending || !newName.trim()} onClick={handleAdd}>
                {createCustomer.isPending ? "Adding…" : <><UserPlus size={13} /> Add Customer</>}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
