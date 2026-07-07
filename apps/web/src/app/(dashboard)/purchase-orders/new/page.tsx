"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { purchaseOrderSchema, type POFormValues } from "@/lib/validations/purchase-order";
import { useCreatePurchaseOrder } from "@/lib/hooks/use-purchase-orders";
import { useSuppliers } from "@/lib/hooks/use-suppliers";
import { useProducts } from "@/lib/hooks/use-products";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Plus, Trash2, Loader2, Truck } from "lucide-react";
import Link from "next/link";

export default function NewPurchaseOrderPage() {
  const router = useRouter();
  const { mutate: create, isPending } = useCreatePurchaseOrder();
  const { data: suppliersData } = useSuppliers();
  const { data: productsData } = useProducts();

  const suppliers: any[] = (suppliersData as any)?.data ?? [];
  const products: any[] = (productsData as any)?.data ?? [];

  const { register, handleSubmit, control, setValue, watch, formState: { errors } } = useForm<POFormValues>({
    resolver: zodResolver(purchaseOrderSchema),
    defaultValues: { items: [{ variantId: "", orderedQty: 1, unitCost: 0 }] },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  const items      = watch("items");
  const supplierId = watch("supplierId");
  const total = items.reduce((a, i) => a + (i.orderedQty || 0) * (i.unitCost || 0), 0);
  const selectedSupplier = suppliers.find((s: any) => s.id === supplierId);

  const onSubmit = (data: POFormValues) => {
    create(data, { onSuccess: () => router.push("/purchase-orders") });
  };

  // Flatten all variants from all products
  const allVariants = products.flatMap((p: any) =>
    (p.variants || []).map((v: any) => ({
      ...v,
      label: `${p.name} — ${v.unit}${v.size ? ` ${v.size}` : ""}`,
      defaultCost: v.costPrice,
    }))
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
        <Button render={<Link href="/purchase-orders" />} nativeButton={false} variant="ghost" size="icon" className="h-8 w-8">
          <ArrowLeft size={16} />
        </Button>
        <div>
          <h1 className="text-xl font-bold tracking-tight">New Purchase Order</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Create a PO to restock from a supplier</p>
        </div>
      </motion.div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Supplier & meta */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card>
            <CardHeader className="pb-4"><CardTitle className="text-sm font-semibold flex items-center gap-2"><Truck size={14} /> Order Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Supplier *</Label>
                  <Select value={supplierId || undefined} onValueChange={(v) => { if (typeof v === "string") setValue("supplierId", v); }}>
                    <SelectTrigger className="text-sm"><SelectValue placeholder="Select supplier">{selectedSupplier?.name}</SelectValue></SelectTrigger>
                    <SelectContent>
                      {suppliers.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {errors.supplierId && <p className="text-xs text-destructive">{errors.supplierId.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Expected Delivery Date</Label>
                  <Input type="date" {...register("expectedDate")} className="text-sm" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Notes</Label>
                <Textarea {...register("notes")} placeholder="Any special instructions..." className="text-sm resize-none h-16" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Line items */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}>
          <Card>
            <CardHeader className="pb-4 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold">Order Items</CardTitle>
              <Button type="button" variant="outline" size="sm" className="h-7 gap-1 text-xs"
                onClick={() => append({ variantId: "", orderedQty: 1, unitCost: 0 })}>
                <Plus size={12} /> Add Item
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {fields.map((field, i) => (
                <div key={field.id} className="grid grid-cols-1 sm:grid-cols-[1fr_80px_100px_32px] gap-2 items-end">
                  <div className="space-y-1.5">
                    {i === 0 && <Label className="text-xs">Product Variant</Label>}
                    <Select value={items[i]?.variantId || undefined} onValueChange={(v) => {
                      if (typeof v !== "string") return;
                      setValue(`items.${i}.variantId`, v);
                      const vari = allVariants.find(av => av.id === v);
                      if (vari) setValue(`items.${i}.unitCost`, Number(vari.defaultCost));
                    }}>
                      <SelectTrigger className="text-sm h-8"><SelectValue placeholder="Select product...">{items[i]?.variantId ? allVariants.find(av => av.id === items[i].variantId)?.label : undefined}</SelectValue></SelectTrigger>
                      <SelectContent className="min-w-[480px] max-h-72">
                        {allVariants.map((v: any) => <SelectItem key={v.id} value={v.id}>{v.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {errors.items?.[i]?.variantId && <p className="text-xs text-destructive">{errors.items[i]?.variantId?.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    {i === 0 && <Label className="text-xs">Qty</Label>}
                    <Input type="number" min={1} {...register(`items.${i}.orderedQty`)} className="text-sm h-8 text-center" />
                  </div>
                  <div className="space-y-1.5">
                    {i === 0 && <Label className="text-xs">Unit Cost (रू, excl. VAT)</Label>}
                    <Input type="number" step="0.01" {...register(`items.${i}.unitCost`)} className="text-sm h-8" />
                  </div>
                  <Button type="button" variant="ghost" size="icon" className={`h-8 w-8 text-muted-foreground hover:text-destructive ${i === 0 ? "mt-5" : ""}`}
                    onClick={() => fields.length > 1 && remove(i)} disabled={fields.length === 1}>
                    <Trash2 size={12} />
                  </Button>
                </div>
              ))}

              {/* VAT Breakdown */}
              <div className="flex justify-end pt-3 border-t border-border">
                <div className="text-right space-y-1 min-w-50">
                  <div className="flex justify-between gap-8 text-xs text-muted-foreground">
                    <span>Subtotal (excl. VAT)</span>
                    <span>रू{total.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between gap-8 text-xs text-muted-foreground">
                    <span>VAT (13%)</span>
                    <span>रू{(total * 0.13).toLocaleString("en-IN", { maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between gap-8 border-t border-border pt-1">
                    <span className="text-sm font-semibold">Total incl. VAT</span>
                    <span className="text-xl font-bold text-primary">रू{(total * 1.13).toLocaleString("en-IN", { maximumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <div className="flex gap-3 justify-end pb-8">
          <Button render={<Link href="/purchase-orders" />} nativeButton={false} variant="outline">Cancel</Button>
          <Button type="submit" disabled={isPending} className="gap-2">
            {isPending ? <><Loader2 size={14} className="animate-spin" /> Creating...</> : "Create Purchase Order"}
          </Button>
        </div>
      </form>
    </div>
  );
}
