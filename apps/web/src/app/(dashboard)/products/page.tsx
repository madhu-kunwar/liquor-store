"use client";

import { motion } from "framer-motion";
import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Package, MoreHorizontal, Edit, Trash2, Eye, ExternalLink, Loader2, Tag, Truck, PackageX, PackageCheck, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { ExportButton } from "@/components/shared/export-button";
import { DataTable, type ColumnDef, type TableParams } from "@/components/shared/data-table";
import { useProducts, useProduct, useDeleteProduct, useUpdateVariant } from "@/lib/hooks/use-products";
import { cn } from "@/lib/utils";

type ProductVariant = {
  id: string; unit: string; size?: string; barcode?: string;
  costPrice: number | string; sellingPrice: number | string;
  currentStock: number; reorderPoint: number; isActive: boolean;
};
type Category = { id: string; name: string };
type Product = {
  id: string; name: string; brand: string; sku: string;
  isActive: boolean; createdAt: string;
  category: Category; variants: ProductVariant[];
};

const CATEGORY_COLORS: Record<string, string> = {
  Whiskey: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  Whisky:  "bg-amber-500/10 text-amber-500 border-amber-500/20",
  Vodka:   "bg-blue-500/10  text-blue-400  border-blue-500/20",
  Beer:    "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  Wine:    "bg-purple-500/10 text-purple-400 border-purple-500/20",
  Rum:     "bg-red-500/10   text-red-400   border-red-500/20",
  Gin:     "bg-green-500/10 text-green-400  border-green-500/20",
};

function totalStock(v: ProductVariant[]) { return v.reduce((s, x) => s + x.currentStock, 0); }
function stockValue(v: ProductVariant[]) { return v.reduce((s, x) => s + x.currentStock * Number(x.sellingPrice), 0); }

/* ── Inline variant editor inside the Sheet ── */
function VariantRow({ v, onSaved }: { v: ProductVariant; onSaved: () => void }) {
  const [editing, setEditing] = useState(false);
  const [cost, setCost]         = useState(Number(v.costPrice));
  const [sell, setSell]         = useState(Number(v.sellingPrice));
  const [reorder, setReorder]   = useState(v.reorderPoint);
  const [barcode, setBarcode]   = useState(v.barcode ?? "");
  const updateVariant           = useUpdateVariant();

  const save = async () => {
    await updateVariant.mutateAsync({ variantId: v.id, costPrice: cost, sellingPrice: sell, reorderPoint: reorder, barcode: barcode || undefined });
    setEditing(false);
    onSaved();
  };

  const isOut = v.currentStock === 0;
  const isLow = v.currentStock > 0 && v.currentStock <= v.reorderPoint;

  if (editing) {
    return (
      <TableRow className="bg-accent/20">
        <TableCell className="py-1.5 text-xs font-medium">{v.unit}{v.size ? ` ${v.size}` : ""}</TableCell>
        <TableCell className="py-1.5">
          <Input type="number" step="0.01" min={0} value={cost} onChange={e => setCost(Number(e.target.value))} className="h-7 text-xs w-24" />
        </TableCell>
        <TableCell className="py-1.5">
          <Input type="number" step="0.01" min={0} value={sell} onChange={e => setSell(Number(e.target.value))} className="h-7 text-xs w-24" />
        </TableCell>
        <TableCell className="py-1.5 text-center">
          <span className={cn("text-sm font-bold tabular-nums", isOut ? "text-destructive" : isLow ? "text-primary" : "text-emerald-500")}>{v.currentStock}</span>
        </TableCell>
        <TableCell className="py-1.5">
          <Input type="number" min={0} value={reorder} onChange={e => setReorder(Number(e.target.value))} className="h-7 text-xs w-16" />
        </TableCell>
        <TableCell className="py-1.5">
          <Input value={barcode} onChange={e => setBarcode(e.target.value)} placeholder="Barcode…" className="h-7 text-xs font-mono w-28" />
        </TableCell>
        <TableCell className="py-1.5">
          <div className="flex gap-1">
            <Button size="sm" className="h-6 text-[10px] px-2 gap-1" onClick={save} disabled={updateVariant.isPending}>
              {updateVariant.isPending ? <Loader2 size={10} className="animate-spin" /> : "Save"}
            </Button>
            <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2" onClick={() => setEditing(false)}>×</Button>
          </div>
        </TableCell>
      </TableRow>
    );
  }

  return (
    <TableRow className="hover:bg-accent/20">
      <TableCell className="py-2 text-xs font-medium">{v.unit}{v.size ? ` ${v.size}` : ""}</TableCell>
      <TableCell className="py-2 text-xs tabular-nums">रू{Number(v.costPrice).toLocaleString("en-IN")}</TableCell>
      <TableCell className="py-2 text-xs tabular-nums font-medium">रू{Number(v.sellingPrice).toLocaleString("en-IN")}</TableCell>
      <TableCell className="py-2 text-center">
        <span className={cn("text-sm font-bold tabular-nums flex items-center justify-center gap-1",
          isOut ? "text-destructive" : isLow ? "text-primary" : "text-emerald-500"
        )}>
          {v.currentStock}
          {isOut  && <PackageX size={11} />}
          {isLow  && <PackageCheck size={11} />}
        </span>
      </TableCell>
      <TableCell className="py-2 text-xs text-muted-foreground tabular-nums text-center">{v.reorderPoint}</TableCell>
      <TableCell className="py-2 text-[10px] font-mono text-muted-foreground">{v.barcode || "—"}</TableCell>
      <TableCell className="py-2">
        <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2 gap-1" onClick={() => setEditing(true)}>
          <Edit size={10} /> Edit
        </Button>
      </TableCell>
    </TableRow>
  );
}

/* ── Detail Sheet ── */
function ProductDetailSheet({ productId, open, onClose }: { productId: string; open: boolean; onClose: () => void }) {
  const { data: raw, isLoading, refetch } = useProduct(productId);
  const p = raw as any;

  const totalStk  = p?.variants?.reduce((a: number, v: any) => a + v.currentStock, 0) ?? 0;
  const totalVal  = p?.variants?.reduce((a: number, v: any) => a + v.currentStock * Number(v.costPrice), 0) ?? 0;

  return (
    <Sheet open={open} onOpenChange={o => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-2xl flex flex-col gap-0 p-0 overflow-hidden">
        <SheetHeader className="p-5 border-b border-border shrink-0">
          {isLoading ? (
            <div className="space-y-2"><Skeleton className="h-6 w-48" /><Skeleton className="h-4 w-32" /></div>
          ) : (
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                  <Package size={18} />
                </div>
                <div>
                  <SheetTitle className="text-base font-bold">{p?.name}</SheetTitle>
                  <p className="text-xs text-muted-foreground">{p?.brand} · <span className="font-mono">{p?.sku}</span></p>
                </div>
              </div>
              <Button size="sm" variant="outline" className="gap-1.5 shrink-0" render={<Link href={`/products/${productId}`} />} nativeButton={false}>
                <ExternalLink size={12} /> Full Page
              </Button>
            </div>
          )}
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-5 space-y-4">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : (
            <div className="p-5 space-y-5">
              {/* Summary cards */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg border border-border p-3 text-center">
                  <p className="text-xl font-bold tabular-nums">{p?.variants?.length ?? 0}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Variants</p>
                </div>
                <div className="rounded-lg border border-border p-3 text-center">
                  <p className={cn("text-xl font-bold tabular-nums", totalStk === 0 ? "text-destructive" : "text-emerald-500")}>{totalStk}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Total Stock</p>
                </div>
                <div className="rounded-lg border border-border p-3 text-center">
                  <p className="text-lg font-bold">रू{totalVal.toLocaleString("en-IN")}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Stock Value</p>
                </div>
              </div>

              {/* Meta */}
              <div className="flex flex-wrap gap-2">
                {p?.category && (
                  <Badge variant="outline" className={`text-xs gap-1.5 ${CATEGORY_COLORS[p.category.name] ?? ""}`}>
                    <Tag size={10} /> {p.category.name}
                  </Badge>
                )}
                {p?.supplier && (
                  <Badge variant="outline" className="text-xs gap-1.5">
                    <Truck size={10} /> {p.supplier.name}
                  </Badge>
                )}
                {p?.description && (
                  <p className="text-xs text-muted-foreground w-full mt-1">{p.description}</p>
                )}
              </div>

              {/* Quick actions */}
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8 text-emerald-600 border-emerald-500/40" render={<Link href="/stock-in" />} nativeButton={false}>
                  <ArrowDownToLine size={12} /> Stock In
                </Button>
                <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8 text-orange-500 border-orange-400/40" render={<Link href="/sales" />} nativeButton={false}>
                  <ArrowUpFromLine size={12} /> Record Sale
                </Button>
                <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8 ml-auto" render={<Link href={`/products/${productId}?edit=1`} />} nativeButton={false}>
                  <Edit size={12} /> Edit Product
                </Button>
              </div>

              {/* Variants table */}
              <div>
                <p className="text-xs font-semibold mb-2">Variants <span className="font-normal text-muted-foreground">(click Edit to update prices & reorder point)</span></p>
                <div className="rounded-lg border border-border overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="text-xs h-8">Variant</TableHead>
                        <TableHead className="text-xs h-8">Cost</TableHead>
                        <TableHead className="text-xs h-8">Sell</TableHead>
                        <TableHead className="text-xs h-8 text-center">Stock</TableHead>
                        <TableHead className="text-xs h-8 text-center">Reorder</TableHead>
                        <TableHead className="text-xs h-8">Barcode</TableHead>
                        <TableHead className="text-xs h-8"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(p?.variants ?? []).map((v: any) => (
                        <VariantRow key={v.id} v={v} onSaved={() => refetch()} />
                      ))}
                      {!p?.variants?.length && (
                        <TableRow><TableCell colSpan={7} className="text-center text-xs text-muted-foreground py-6">No variants</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

/* ── Main Page ── */
export default function ProductsPage() {
  const [tableParams, setTableParams] = useState<TableParams>({
    page: 1, limit: 20, search: "", sortBy: "", sortOrder: "asc",
  });
  const [deleteTarget, setDeleteTarget]   = useState<Product | null>(null);
  const [detailProductId, setDetailProductId] = useState<string | null>(null);

  const apiQuery = useMemo(() => ({
    page: tableParams.page, limit: tableParams.limit,
    search: tableParams.search || undefined,
    sortBy: tableParams.sortBy || undefined, sortOrder: tableParams.sortOrder,
  }), [tableParams]);

  const { data: productsRes, isLoading } = useProducts(apiQuery);
  const deleteProduct = useDeleteProduct();

  const res      = productsRes as { data: Product[]; meta: { total: number } } | undefined;
  const products = res?.data ?? [];
  const total    = res?.meta?.total ?? 0;

  const handleParams = useCallback((p: TableParams) => setTableParams(p), []);

  const columns = useMemo<ColumnDef<Product>[]>(() => [
    {
      key: "name", header: "Product", sortable: true, getValue: r => r.name,
      cell: r => (
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary shrink-0">
            <Package size={14} />
          </div>
          <div>
            <p className="text-sm font-medium leading-none">{r.name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{r.brand}</p>
          </div>
        </div>
      ),
    },
    {
      key: "category", header: "Category", getValue: r => r.category?.name,
      cell: r => (
        <Badge variant="outline" className={`text-[10px] h-5 px-1.5 ${CATEGORY_COLORS[r.category?.name] ?? ""}`}>
          {r.category?.name ?? "—"}
        </Badge>
      ),
    },
    { key: "sku", header: "SKU", sortable: true, getValue: r => r.sku,
      cell: r => <span className="font-mono text-xs text-muted-foreground">{r.sku}</span> },
    { key: "variants", header: "Variants", align: "center",
      cell: r => <span className="text-sm">{r.variants.length}</span> },
    {
      key: "totalStock", header: "Stock", align: "right", getValue: r => totalStock(r.variants),
      cell: r => {
        const s = totalStock(r.variants);
        return <span className={s === 0 ? "text-red-400 font-medium text-sm" : "text-sm"}>{s === 0 ? "Out" : s}</span>;
      },
    },
    {
      key: "value", header: "Value", align: "right", getValue: r => stockValue(r.variants),
      cell: r => <span className="text-sm font-medium">रू{stockValue(r.variants).toLocaleString("en-IN")}</span>,
    },
    {
      key: "isActive", header: "Status", sortable: true, getValue: r => r.isActive,
      cell: r => (
        <Badge variant={r.isActive ? "default" : "secondary"} className="text-[10px] h-5 px-1.5">
          {r.isActive ? "active" : "inactive"}
        </Badge>
      ),
    },
    {
      key: "_actions", header: "",
      cell: r => (
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => e.stopPropagation()} />}>
            <MoreHorizontal size={13} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem className="gap-2 text-xs cursor-pointer" onClick={e => { e.stopPropagation(); setDetailProductId(r.id); }}>
              <Eye size={12} /> View Details
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2 text-xs cursor-pointer" render={<Link href={`/products/${r.id}?edit=1`} />}>
              <Edit size={12} /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2 text-xs text-destructive cursor-pointer focus:text-destructive" onClick={() => setDeleteTarget(r)}>
              <Trash2 size={12} /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ], []);

  return (
    <div className="space-y-5">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Products</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{total} product{total !== 1 ? "s" : ""} in catalog</p>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton
            filename="products" sheetName="Products"
            data={products.map(p => ({
              Name: p.name, Brand: p.brand, SKU: p.sku, Category: p.category?.name,
              Variants: p.variants.length, "Total Stock": totalStock(p.variants),
              "Stock Value (रू)": stockValue(p.variants), Status: p.isActive ? "active" : "inactive",
            }))}
          />
          <Button render={<Link href="/products/new" />} nativeButton={false} size="sm" className="gap-1.5">
            <Plus size={14} /> Add Product
          </Button>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card>
          <DataTable<Product>
            columns={columns}
            data={products}
            rowKey={r => r.id}
            total={total}
            isLoading={isLoading}
            onParamsChange={handleParams}
            initialPageSize={20}
            searchPlaceholder="Search products, SKUs…"
            emptyMessage="No products found."
            onRowClick={r => setDetailProductId(r.id)}
          />
        </Card>
      </motion.div>

      {/* Product detail Sheet */}
      {detailProductId && (
        <ProductDetailSheet
          productId={detailProductId}
          open={!!detailProductId}
          onClose={() => setDetailProductId(null)}
        />
      )}

      {/* Delete dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={o => !o && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader><DialogTitle>Delete Product</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Delete <span className="font-semibold text-foreground">{deleteTarget?.name}</span>? This cannot be undone.
          </p>
          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button
              variant="destructive" className="flex-1" disabled={deleteProduct.isPending}
              onClick={() => deleteProduct.mutate(deleteTarget!.id, { onSuccess: () => setDeleteTarget(null) })}
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
