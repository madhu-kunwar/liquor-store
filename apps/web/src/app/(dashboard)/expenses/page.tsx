"use client";

import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Plus, Trash2, Wallet } from "lucide-react";
import { ExportButton } from "@/components/shared/export-button";
import { DataTable, type ColumnDef } from "@/components/shared/data-table";
import { useExpenses, useExpenseSummary, useCreateExpense, useDeleteExpense } from "@/lib/hooks/use-expenses";

const CATEGORIES = [
  "Rent", "Electricity", "Water", "Internet", "Salary", "Transport",
  "Marketing", "Maintenance", "Packaging", "Bank Charges", "Tax", "Other",
];

const CATEGORY_COLORS: Record<string, string> = {
  Rent:         "bg-blue-500/10 text-blue-400 border-blue-500/20",
  Electricity:  "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  Salary:       "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  Transport:    "bg-purple-500/10 text-purple-400 border-purple-500/20",
  Tax:          "bg-red-500/10 text-red-400 border-red-500/20",
};

type Expense = {
  id: string; category: string; amount: number;
  description?: string; date: string;
  createdBy: { name: string };
};

function today() { return new Date().toISOString().slice(0, 10); }

export default function ExpensesPage() {
  const thirtyDaysAgo = useMemo(() => { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().slice(0, 10); }, []);
  const [dateFrom, setDateFrom] = useState(thirtyDaysAgo);
  const [dateTo,   setDateTo  ] = useState(today());
  const [open, setOpen]        = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null);

  const [form, setForm] = useState({ category: "Rent", amount: "", description: "", date: today() });

  const query = useMemo(() => ({ dateFrom, dateTo }), [dateFrom, dateTo]);
  const { data: expRes, isLoading } = useExpenses(query);
  const { data: summaryRaw }        = useExpenseSummary(dateFrom, dateTo);
  const createExpense = useCreateExpense();
  const deleteExpense = useDeleteExpense();

  const expenses: Expense[] = useMemo(() => (expRes as any)?.data ?? [], [expRes]);
  const summary = summaryRaw as { total: number; byCategory: Record<string, number>; count: number } | undefined;

  const handleCreate = async () => {
    if (!form.amount || !form.category) return;
    await createExpense.mutateAsync({
      category: form.category, amount: Number(form.amount),
      description: form.description || undefined, date: form.date,
    });
    setOpen(false);
    setForm({ category: "Rent", amount: "", description: "", date: today() });
  };

  const columns = useMemo<ColumnDef<Expense>[]>(() => [
    {
      key: "date", header: "Date", sortable: true, getValue: e => e.date,
      cell: e => <span className="text-xs text-muted-foreground">{new Date(e.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span>,
    },
    {
      key: "category", header: "Category", getValue: e => e.category,
      cell: e => <Badge variant="outline" className={`text-[10px] h-5 px-1.5 ${CATEGORY_COLORS[e.category] ?? ""}`}>{e.category}</Badge>,
    },
    {
      key: "amount", header: "Amount", align: "right", sortable: true, getValue: e => Number(e.amount),
      cell: e => <span className="text-sm font-semibold text-orange-500">रू{Number(e.amount).toLocaleString("en-IN")}</span>,
    },
    {
      key: "description", header: "Description",
      cell: e => <span className="text-xs text-muted-foreground">{e.description || "—"}</span>,
    },
    {
      key: "createdBy", header: "By",
      cell: e => <span className="text-xs text-muted-foreground">{e.createdBy?.name}</span>,
    },
    {
      key: "_actions", header: "",
      cell: e => (
        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => setDeleteTarget(e)}>
          <Trash2 size={12} />
        </Button>
      ),
    },
  ], []);

  return (
    <div className="space-y-5">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Expenses</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Track operational costs for net profit calculation</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-8 text-xs w-32" />
          <span className="text-xs text-muted-foreground">→</span>
          <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-8 text-xs w-32" />
          <ExportButton filename="expenses" sheetName="Expenses" data={expenses.map(e => ({
            Date: new Date(e.date).toLocaleDateString(), Category: e.category,
            "Amount (रू)": Number(e.amount), Description: e.description ?? "", By: e.createdBy?.name,
          }))} />
          <Button size="sm" className="gap-1.5 h-8" onClick={() => setOpen(true)}>
            <Plus size={13} /> Add Expense
          </Button>
        </div>
      </motion.div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}>
          <Card className="p-4 col-span-2">
            <p className="text-2xl font-bold text-orange-500">रू{(summary?.total ?? 0).toLocaleString("en-IN")}</p>
            <p className="text-xs text-muted-foreground mt-1">Total Expenses</p>
            <p className="text-[11px] text-muted-foreground">{summary?.count ?? 0} entries in period</p>
          </Card>
        </motion.div>
        {Object.entries(summary?.byCategory ?? {}).slice(0, 2).map(([cat, amt], i) => (
          <motion.div key={cat} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.05 }}>
            <Card className="p-4">
              <p className="text-xl font-bold">रू{Number(amt).toLocaleString("en-IN")}</p>
              <p className="text-xs font-medium mt-1">{cat}</p>
            </Card>
          </motion.div>
        ))}
      </div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card>
          <DataTable<Expense>
            columns={columns} data={expenses} rowKey={e => e.id}
            clientSide isLoading={isLoading} initialPageSize={20}
            initialSortBy="date" initialSortOrder="desc"
            searchPlaceholder="Search category or description…"
            emptyMessage="No expenses in this period."
          />
        </Card>
      </motion.div>

      {/* Add dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Wallet size={15} /> Record Expense</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Category *</Label>
                <Select value={form.category} onValueChange={v => v && setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger className="text-sm h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Date</Label>
                <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="text-sm h-9" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Amount (रू) *</Label>
              <Input type="number" min={0} step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" className="text-sm h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Description</Label>
              <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional notes…" className="text-sm h-9" />
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1 h-9" onClick={() => setOpen(false)}>Cancel</Button>
              <Button className="flex-1 h-9 gap-1.5" disabled={!form.amount || createExpense.isPending} onClick={handleCreate}>
                {createExpense.isPending ? <><Loader2 size={13} className="animate-spin" /> Saving…</> : "Save Expense"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteTarget} onOpenChange={o => !o && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader><DialogTitle>Delete Expense</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Delete <span className="font-semibold text-foreground">{deleteTarget?.category}</span> — रू{Number(deleteTarget?.amount ?? 0).toLocaleString("en-IN")}?
          </p>
          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" className="flex-1" disabled={deleteExpense.isPending}
              onClick={() => deleteExpense.mutate(deleteTarget!.id, { onSuccess: () => setDeleteTarget(null) })}>
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
