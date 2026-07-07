"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { useParams } from "next/navigation";
import { useProduct, useUpdateProduct, useUpdateVariant } from "@/lib/hooks/use-products";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Edit, Package, Tag, Truck, TrendingUp, Loader2 } from "lucide-react";
import Link from "next/link";

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const { data: product, isLoading } = useProduct(id);
  const updateProduct = useUpdateProduct(id);
  const updateVariant = useUpdateVariant();

  const [editOpen, setEditOpen] = useState(() => searchParams.get("edit") === "1");
  const [editName, setEditName]               = useState("");
  const [editBrand, setEditBrand]             = useState("");
  const [editDescription, setEditDescription] = useState("");

  // Variant edit
  const [variantTarget, setVariantTarget] = useState<any | null>(null);
  const [vCost, setVCost]           = useState(0);
  const [vSell, setVSell]           = useState(0);
  const [vReorder, setVReorder]     = useState(0);
  const [vBarcode, setVBarcode]     = useState("");
  const [vTaxRate, setVTaxRate]     = useState(13);
  const [vExcise, setVExcise]       = useState(0);

  const openVariantEdit = (v: any) => {
    setVariantTarget(v);
    setVCost(Number(v.costPrice));
    setVSell(Number(v.sellingPrice));
    setVReorder(v.reorderPoint);
    setVBarcode(v.barcode ?? "");
    setVTaxRate(Number(v.taxRate ?? 13));
    setVExcise(Number(v.exciseDuty ?? 0));
  };

  const handleVariantSave = async () => {
    if (!variantTarget) return;
    await updateVariant.mutateAsync({
      variantId:   variantTarget.id,
      costPrice:   vCost,
      sellingPrice: vSell,
      reorderPoint: vReorder,
      barcode:     vBarcode || undefined,
      taxRate:     vTaxRate,
      exciseDuty:  vExcise,
    });
    setVariantTarget(null);
  };

  const openEdit = () => {
    const p = product as any;
    setEditName(p?.name ?? "");
    setEditBrand(p?.brand ?? "");
    setEditDescription(p?.description ?? "");
    setEditOpen(true);
  };

  const handleUpdate = () => {
    updateProduct.mutate(
      { name: editName.trim(), brand: editBrand.trim(), description: editDescription.trim() || undefined },
      { onSuccess: () => setEditOpen(false) }
    );
  };

  if (isLoading) return <ProductDetailSkeleton />;
  if (!product) return <div className="text-sm text-muted-foreground">Product not found.</div>;

  const totalStock = (product as any).variants?.reduce((a: number, v: any) => a + v.currentStock, 0) ?? 0;
  const totalValue = (product as any).variants?.reduce((a: number, v: any) => a + v.currentStock * Number(v.costPrice), 0) ?? 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button render={<Link href="/products" />} nativeButton={false} variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft size={16} />
          </Button>
          <div>
            <h1 className="text-xl font-bold tracking-tight">{(product as any).name}</h1>
            <p className="text-sm text-muted-foreground">{(product as any).brand} · <span className="font-mono">{(product as any).sku}</span></p>
          </div>
        </div>
        <Button size="sm" variant="outline" className="gap-1.5" onClick={openEdit}>
          <Edit size={13} /> Edit
        </Button>
      </motion.div>

      {/* Overview cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Stock", value: totalStock, icon: <Package size={14} /> },
          { label: "Stock Value", value: `रू${totalValue.toLocaleString("en-IN")}`, icon: <TrendingUp size={14} /> },
          { label: "Category", value: (product as any).category?.name, icon: <Tag size={14} /> },
          { label: "Supplier", value: (product as any).supplier?.name || "—", icon: <Truck size={14} /> },
        ].map((card, i) => (
          <motion.div key={card.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 + i * 0.05 }}>
            <Card className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">{card.icon}<span className="text-xs">{card.label}</span></div>
              <p className="text-lg font-bold">{card.value}</p>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Variants */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}>
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Variants <span className="text-xs font-normal text-muted-foreground">(click Edit to update price/reorder)</span></CardTitle></CardHeader>
          <CardContent className="pt-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-xs">Unit</TableHead>
                    <TableHead className="text-xs">Size</TableHead>
                    <TableHead className="text-xs">Barcode</TableHead>
                    <TableHead className="text-xs text-right">Cost (रू)</TableHead>
                    <TableHead className="text-xs text-right">Sell (रू)</TableHead>
                    <TableHead className="text-xs text-right">Stock</TableHead>
                    <TableHead className="text-xs text-right">Reorder</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(product as any).variants?.map((v: any) => (
                    <TableRow key={v.id} className="hover:bg-accent/30">
                      <TableCell className="text-sm font-medium">{v.unit}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{v.size || "—"}</TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">{v.barcode || "—"}</TableCell>
                      <TableCell className="text-right text-sm">रू{Number(v.costPrice).toLocaleString()}</TableCell>
                      <TableCell className="text-right text-sm">रू{Number(v.sellingPrice).toLocaleString()}</TableCell>
                      <TableCell className="text-right text-sm font-semibold">
                        <span className={v.currentStock <= v.reorderPoint ? "text-primary" : ""}>{v.currentStock}</span>
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">{v.reorderPoint}</TableCell>
                      <TableCell>
                        {v.currentStock === 0 ? (
                          <Badge variant="outline" className="text-[10px] text-red-400 border-red-400/30">Out of stock</Badge>
                        ) : v.currentStock <= v.reorderPoint ? (
                          <Badge variant="outline" className="text-[10px] text-primary border-primary/30">Low stock</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-emerald-500 border-emerald-500/30">In stock</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground" onClick={() => openVariantEdit(v)}>
                          <Edit size={11} /> Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {(product as any).description && (
        <Card className="p-4">
          <p className="text-xs text-muted-foreground mb-1">Description</p>
          <p className="text-sm">{(product as any).description}</p>
        </Card>
      )}

      {/* Variant edit dialog */}
      <Dialog open={!!variantTarget} onOpenChange={o => !o && setVariantTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">Edit Variant</DialogTitle>
            {variantTarget && <p className="text-xs text-muted-foreground">{variantTarget.unit}{variantTarget.size ? ` · ${variantTarget.size}` : ""}</p>}
          </DialogHeader>
          <div className="space-y-3 pt-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Cost Price (रू)</Label>
                <Input type="number" step="0.01" min={0} value={vCost} onChange={e => setVCost(Number(e.target.value))} className="text-sm h-8" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Selling Price (रू)</Label>
                <Input type="number" step="0.01" min={0} value={vSell} onChange={e => setVSell(Number(e.target.value))} className="text-sm h-8" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Reorder Point</Label>
              <Input type="number" min={0} value={vReorder} onChange={e => setVReorder(Number(e.target.value))} className="text-sm h-8" />
              <p className="text-[10px] text-muted-foreground">Alert triggers when stock falls to this level</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Barcode</Label>
              <Input value={vBarcode} onChange={e => setVBarcode(e.target.value)} placeholder="Scan or enter…" className="text-sm h-8 font-mono" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">VAT Rate (%)</Label>
                <Input type="number" step="0.01" min={0} max={100} value={vTaxRate} onChange={e => setVTaxRate(Number(e.target.value))} className="text-sm h-8" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Excise Duty (रू)</Label>
                <Input type="number" step="0.01" min={0} value={vExcise} onChange={e => setVExcise(Number(e.target.value))} className="text-sm h-8" />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1 h-8" onClick={() => setVariantTarget(null)}>Cancel</Button>
              <Button className="flex-1 h-8 gap-1.5" onClick={handleVariantSave} disabled={updateVariant.isPending}>
                {updateVariant.isPending ? <><Loader2 size={12} className="animate-spin" /> Saving…</> : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Product edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Edit Product</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-1">
            <div className="space-y-1.5">
              <Label className="text-xs">Name *</Label>
              <Input className="text-sm" value={editName} onChange={e => setEditName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Brand</Label>
              <Input className="text-sm" value={editBrand} onChange={e => setEditBrand(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Description</Label>
              <Textarea className="text-sm resize-none" rows={3} value={editDescription} onChange={e => setEditDescription(e.target.value)} />
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button className="flex-1" disabled={!editName.trim() || updateProduct.isPending} onClick={handleUpdate}>
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ProductDetailSkeleton() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3"><Skeleton className="h-8 w-8 rounded-md" /><div className="space-y-1"><Skeleton className="h-6 w-48" /><Skeleton className="h-4 w-32" /></div></div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}</div>
      <Skeleton className="h-48 rounded-lg" />
    </div>
  );
}
