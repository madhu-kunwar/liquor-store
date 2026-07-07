"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { productSchema, type ProductFormValues } from "@/lib/validations/product";
import { useCreateProduct } from "@/lib/hooks/use-products";
import { useSuppliers } from "@/lib/hooks/use-suppliers";
import { useCategories } from "@/lib/hooks/use-categories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Plus, Trash2, Loader2, Package } from "lucide-react";
import Link from "next/link";

const UNITS = ["BOTTLE", "CASE", "PACK", "CAN", "KEG"] as const;

export default function NewProductPage() {
  const router = useRouter();
  const { mutate: create, isPending } = useCreateProduct();
  const { data: suppliersRes } = useSuppliers();
  const { data: categoriesData } = useCategories();
  const suppliers = (suppliersRes as { data: any[] } | undefined)?.data ?? [];
  const categories = (categoriesData as { id: string; name: string }[] | undefined) ?? [];

  const { register, handleSubmit, control, setValue, watch, formState: { errors } } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: { variants: [{ unit: "BOTTLE", costPrice: 0, sellingPrice: 0, reorderPoint: 10 }] },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "variants" });

  const onSubmit = (data: ProductFormValues) => {
    create(data, { onSuccess: () => router.push("/products") });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
        <Button render={<Link href="/products" />} nativeButton={false} variant="ghost" size="icon" className="h-8 w-8">
          <ArrowLeft size={16} />
        </Button>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Add Product</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Create a new product with variants</p>
        </div>
      </motion.div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Info */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card>
            <CardHeader className="pb-4"><CardTitle className="text-sm font-semibold flex items-center gap-2"><Package size={15} /> Basic Information</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Product Name *</Label>
                  <Input {...register("name")} placeholder="e.g. Johnnie Walker Black Label" className="text-sm" />
                  {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Brand *</Label>
                  <Input {...register("brand")} placeholder="e.g. Johnnie Walker" className="text-sm" />
                  {errors.brand && <p className="text-xs text-destructive">{errors.brand.message}</p>}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">SKU *</Label>
                  <Input {...register("sku")} placeholder="e.g. JW-BLK-750" className="text-sm font-mono" />
                  {errors.sku && <p className="text-xs text-destructive">{errors.sku.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Category *</Label>
                  <Select onValueChange={(v) => { if (typeof v === "string") setValue("categoryId", v); }}>
                    <SelectTrigger className="text-sm"><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>
                      {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {errors.categoryId && <p className="text-xs text-destructive">{errors.categoryId.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Supplier</Label>
                  <Select onValueChange={(v) => { if (typeof v === "string") setValue("supplierId", v); }}>
                    <SelectTrigger className="text-sm"><SelectValue placeholder="Select supplier" /></SelectTrigger>
                    <SelectContent>
                      {suppliers.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Description</Label>
                <Textarea {...register("description")} placeholder="Optional product description..." className="text-sm resize-none h-20" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Variants */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}>
          <Card>
            <CardHeader className="pb-4 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold">Variants (Case / Pack / Bottle)</CardTitle>
              <Button type="button" variant="outline" size="sm" className="h-7 gap-1 text-xs"
                onClick={() => append({ unit: "BOTTLE", costPrice: 0, sellingPrice: 0, reorderPoint: 10 })}>
                <Plus size={12} /> Add Variant
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {fields.map((field, i) => (
                <div key={field.id} className="relative rounded-lg border border-border p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-[10px]">Variant {i + 1}</Badge>
                    {fields.length > 1 && (
                      <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => remove(i)}>
                        <Trash2 size={12} />
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Unit Type *</Label>
                      <Select defaultValue={field.unit} onValueChange={(v) => setValue(`variants.${i}.unit`, v as any)}>
                        <SelectTrigger className="text-sm h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>{UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Size</Label>
                      <Input {...register(`variants.${i}.size`)} placeholder="750ml" className="text-sm h-8" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Barcode</Label>
                      <Input {...register(`variants.${i}.barcode`)} placeholder="Scan or enter" className="text-sm h-8 font-mono" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Reorder Point</Label>
                      <Input type="number" {...register(`variants.${i}.reorderPoint`)} defaultValue={10} className="text-sm h-8" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Cost Price (रू) *</Label>
                      <Input type="number" step="0.01" {...register(`variants.${i}.costPrice`)} placeholder="0.00" className="text-sm h-8" />
                      {errors.variants?.[i]?.costPrice && <p className="text-xs text-destructive">{errors.variants[i]?.costPrice?.message}</p>}
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Selling Price (रू) *</Label>
                      <Input type="number" step="0.01" {...register(`variants.${i}.sellingPrice`)} placeholder="0.00" className="text-sm h-8" />
                      {errors.variants?.[i]?.sellingPrice && <p className="text-xs text-destructive">{errors.variants[i]?.sellingPrice?.message}</p>}
                    </div>
                  </div>
                </div>
              ))}
              {errors.variants && !Array.isArray(errors.variants) && (
                <p className="text-xs text-destructive">{errors.variants.message}</p>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <div className="flex gap-3 justify-end pb-8">
          <Button render={<Link href="/products" />} nativeButton={false} variant="outline">Cancel</Button>
          <Button type="submit" disabled={isPending} className="gap-2">
            {isPending ? <><Loader2 size={14} className="animate-spin" /> Saving...</> : "Create Product"}
          </Button>
        </div>
      </form>
    </div>
  );
}
