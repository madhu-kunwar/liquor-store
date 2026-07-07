"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { useParams } from "next/navigation";
import { useSupplier, useUpdateSupplier } from "@/lib/hooks/use-suppliers";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Edit, Mail, Phone, MapPin, Package, Truck, Clock, PowerOff, Power } from "lucide-react";
import Link from "next/link";

const STATUS_COLOR: Record<string, string> = {
  RECEIVED: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  SENT: "bg-blue-400/10 text-blue-400 border-blue-400/20",
  PARTIAL_RECEIVED: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  DRAFT: "bg-muted text-muted-foreground",
  CANCELLED: "bg-red-400/10 text-red-400 border-red-400/20",
};

export default function SupplierDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: supplier, isLoading } = useSupplier(id);
  const updateSupplier = useUpdateSupplier(id);

  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName]               = useState("");
  const [editContact, setEditContact]         = useState("");
  const [editEmail, setEditEmail]             = useState("");
  const [editPhone, setEditPhone]             = useState("");
  const [editAddress, setEditAddress]         = useState("");
  const [editGst, setEditGst]                 = useState("");
  const [editLeadDays, setEditLeadDays]       = useState("");
  const [editNotes, setEditNotes]             = useState("");

  const openEdit = () => {
    const s = supplier as any;
    setEditName(s?.name ?? "");
    setEditContact(s?.contactPerson ?? "");
    setEditEmail(s?.email ?? "");
    setEditPhone(s?.phone ?? "");
    setEditAddress(s?.address ?? "");
    setEditGst(s?.gstNumber ?? "");
    setEditLeadDays(String(s?.avgLeadDays ?? 3));
    setEditNotes(s?.notes ?? "");
    setEditOpen(true);
  };

  const handleUpdate = () => {
    updateSupplier.mutate(
      {
        name: editName.trim(),
        contactPerson: editContact.trim() || undefined,
        email: editEmail.trim() || undefined,
        phone: editPhone.trim() || undefined,
        address: editAddress.trim() || undefined,
        gstNumber: editGst.trim() || undefined,
        avgLeadDays: Number(editLeadDays) || 3,
        notes: editNotes.trim() || undefined,
      },
      { onSuccess: () => setEditOpen(false) }
    );
  };

  if (isLoading) return <SupplierSkeleton />;
  if (!supplier) return <div className="text-sm text-muted-foreground">Supplier not found.</div>;

  const s = supplier as any;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button render={<Link href="/suppliers" />} nativeButton={false} variant="ghost" size="icon" className="h-8 w-8"><ArrowLeft size={16} /></Button>
          <div>
            <h1 className="text-xl font-bold tracking-tight">{s.name}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{s.contactPerson || "No contact person"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className={`gap-1.5 ${s.isActive ? "text-destructive border-destructive/30 hover:bg-destructive hover:text-white" : "text-emerald-600 border-emerald-500/30 hover:bg-emerald-600 hover:text-white"}`}
            onClick={() => updateSupplier.mutate({ isActive: !s.isActive })}
            disabled={updateSupplier.isPending}
          >
            {s.isActive ? <><PowerOff size={13} /> Deactivate</> : <><Power size={13} /> Activate</>}
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={openEdit}>
            <Edit size={13} /> Edit
          </Button>
        </div>
      </motion.div>

      {/* Info cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Products", value: s._count?.products || 0, icon: <Package size={14} /> },
          { label: "Orders", value: s._count?.purchaseOrders || 0, icon: <Truck size={14} /> },
          { label: "Lead Time", value: `${s.avgLeadDays} days`, icon: <Clock size={14} /> },
          { label: "Status", value: s.isActive ? "Active" : "Inactive", icon: null },
        ].map((card, i) => (
          <motion.div key={card.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 + i * 0.05 }}>
            <Card className="p-4">
              <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                {card.icon}<span className="text-xs">{card.label}</span>
              </div>
              <p className="text-lg font-bold">{card.value}</p>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Contact info */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Contact Information</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {s.email && <div className="flex items-center gap-2 text-sm"><Mail size={13} className="text-muted-foreground" />{s.email}</div>}
            {s.phone && <div className="flex items-center gap-2 text-sm"><Phone size={13} className="text-muted-foreground" />{s.phone}</div>}
            {s.address && <div className="flex items-center gap-2 text-sm"><MapPin size={13} className="text-muted-foreground" />{s.address}</div>}
            {s.gstNumber && <div className="flex items-center gap-2 text-sm text-muted-foreground font-mono">PAN/VAT: {s.gstNumber}</div>}
            {s.notes && <div className="pt-2 border-t border-border"><p className="text-xs text-muted-foreground mb-1">Notes</p><p className="text-sm">{s.notes}</p></div>}
          </CardContent>
        </Card>
      </motion.div>

      {/* Recent POs */}
      {s.purchaseOrders?.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.33 }}>
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Recent Purchase Orders</CardTitle></CardHeader>
            <CardContent className="pt-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-xs">PO #</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                      <TableHead className="text-xs text-right">Amount</TableHead>
                      <TableHead className="text-xs">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {s.purchaseOrders.slice(0, 8).map((po: any) => (
                      <TableRow key={po.id} className="hover:bg-accent/30">
                        <TableCell className="font-mono text-sm">
                          <Link href={`/purchase-orders/${po.id}`} className="hover:text-primary transition-colors">{po.poNumber}</Link>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-[10px] h-5 px-1.5 ${STATUS_COLOR[po.status] || ""}`}>{po.status.replace("_", " ")}</Badge>
                        </TableCell>
                        <TableCell className="text-right text-sm">रू{Number(po.totalAmount).toLocaleString("en-IN")}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{new Date(po.createdAt).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-sm max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Supplier</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-1">
            <div className="space-y-1.5">
              <Label className="text-xs">Name *</Label>
              <Input className="text-sm" value={editName} onChange={e => setEditName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Contact Person</Label>
              <Input className="text-sm" value={editContact} onChange={e => setEditContact(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Email</Label>
              <Input className="text-sm" type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Phone</Label>
              <Input className="text-sm" value={editPhone} onChange={e => setEditPhone(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Address</Label>
              <Input className="text-sm" value={editAddress} onChange={e => setEditAddress(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">PAN/VAT No.</Label>
                <Input className="text-sm font-mono" value={editGst} onChange={e => setEditGst(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Lead Days</Label>
                <Input className="text-sm" type="number" min={1} value={editLeadDays} onChange={e => setEditLeadDays(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Notes</Label>
              <Textarea className="text-sm resize-none" rows={3} value={editNotes} onChange={e => setEditNotes(e.target.value)} />
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button className="flex-1" disabled={!editName.trim() || updateSupplier.isPending} onClick={handleUpdate}>
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SupplierSkeleton() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3"><Skeleton className="h-8 w-8" /><div className="space-y-1"><Skeleton className="h-6 w-48" /><Skeleton className="h-4 w-32" /></div></div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
      <Skeleton className="h-40" />
    </div>
  );
}
