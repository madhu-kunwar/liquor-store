"use client";

import { motion } from "framer-motion";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, MoreHorizontal, Edit, Trash2 } from "lucide-react";
import { DataTable, type ColumnDef } from "@/components/shared/data-table";
import { useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory } from "@/lib/hooks/use-categories";

type Category = {
  id: string;
  name: string;
  slug: string;
  color?: string;
  _count: { products: number };
};

export default function CategoriesPage() {
  const { data, isLoading } = useCategories();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();

  const categories: Category[] = useMemo(() => (data as Category[] | undefined) ?? [], [data]);

  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName]   = useState("");
  const [color, setColor] = useState("#f59e0b");

  const [editTarget, setEditTarget] = useState<Category | null>(null);
  const [editName, setEditName]   = useState("");
  const [editColor, setEditColor] = useState("#f59e0b");

  const handleCreate = async () => {
    if (!name.trim()) return;
    await createCategory.mutateAsync({
      name: name.trim(),
      slug: name.trim().toLowerCase().replace(/\s+/g, "-"),
      color,
    });
    setName(""); setColor("#f59e0b"); setCreateOpen(false);
  };

  const openEdit = (c: Category) => {
    setEditTarget(c);
    setEditName(c.name);
    setEditColor(c.color ?? "#f59e0b");
  };

  const handleUpdate = async () => {
    if (!editTarget || !editName.trim()) return;
    await updateCategory.mutateAsync({ id: editTarget.id, data: { name: editName.trim(), color: editColor, slug: editName.trim().toLowerCase().replace(/\s+/g, "-") } });
    setEditTarget(null);
  };

  const columns = useMemo<ColumnDef<Category>[]>(() => [
    {
      key: "name",
      header: "Category",
      sortable: true,
      getValue: c => c.name,
      cell: c => (
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 rounded-full shrink-0" style={{ background: c.color ?? "#888" }} />
          <span className="text-sm font-medium">{c.name}</span>
        </div>
      ),
    },
    {
      key: "slug",
      header: "Slug",
      cell: c => <span className="text-xs font-mono text-muted-foreground">{c.slug}</span>,
    },
    {
      key: "products",
      header: "Products",
      align: "center",
      sortable: true,
      getValue: c => c._count?.products ?? 0,
      cell: c => <span className="text-sm">{c._count?.products ?? 0}</span>,
    },
    {
      key: "_actions",
      header: "",
      cell: c => (
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => e.stopPropagation()} />}>
            <MoreHorizontal size={13} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem className="text-xs gap-2 cursor-pointer" onClick={() => openEdit(c)}>
              <Edit size={12} /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-xs gap-2 cursor-pointer text-destructive focus:text-destructive"
              onClick={() => deleteCategory.mutate(c.id)}
            >
              <Trash2 size={12} /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ], [deleteCategory, updateCategory]);

  return (
    <div className="space-y-5">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Categories</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{categories.length} product categories</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger render={<Button size="sm" className="gap-1.5" />}>
            <Plus size={14} /> Add Category
          </DialogTrigger>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader><DialogTitle>Add Category</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Category Name *</Label>
                <Input placeholder="e.g. Tequila" className="text-sm" value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Color</Label>
                <div className="flex items-center gap-3">
                  <input type="color" value={color} onChange={e => setColor(e.target.value)} className="h-9 w-16 rounded border border-border cursor-pointer" />
                  <Input value={color} onChange={e => setColor(e.target.value)} className="text-sm font-mono" />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <Button variant="outline" className="flex-1" onClick={() => setCreateOpen(false)}>Cancel</Button>
                <Button className="flex-1" onClick={handleCreate} disabled={!name.trim() || createCategory.isPending}>
                  Create
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card>
          <DataTable<Category>
            columns={columns}
            data={categories}
            rowKey={c => c.id}
            clientSide
            isLoading={isLoading}
            initialPageSize={20}
            searchPlaceholder="Search categories…"
            emptyMessage="No categories yet."
          />
        </Card>
      </motion.div>

      {/* Edit dialog */}
      <Dialog open={!!editTarget} onOpenChange={o => !o && setEditTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Edit Category</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Category Name *</Label>
              <Input className="text-sm" value={editName} onChange={e => setEditName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Color</Label>
              <div className="flex items-center gap-3">
                <input type="color" value={editColor} onChange={e => setEditColor(e.target.value)} className="h-9 w-16 rounded border border-border cursor-pointer" />
                <Input value={editColor} onChange={e => setEditColor(e.target.value)} className="text-sm font-mono" />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setEditTarget(null)}>Cancel</Button>
              <Button className="flex-1" onClick={handleUpdate} disabled={!editName.trim() || updateCategory.isPending}>
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
