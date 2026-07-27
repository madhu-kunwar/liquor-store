"use client";

import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Bar, BarChart, XAxis, YAxis, CartesianGrid } from "recharts";
import { TrendingUp, Trophy, ClipboardCheck } from "lucide-react";
import { ExportButton } from "@/components/shared/export-button";
import { useInventoryValuation, useLowStockReport, useDeadStockReport, useSalesSummary, useSalesAudit, useTopSellers, useStockMovementsReport } from "@/lib/hooks/use-reports";

const chartConfig = {
  value:   { label: "Stock Value",  color: "#f59e0b" },
  revenue: { label: "Revenue",      color: "#10b981" },
  cogs:    { label: "COGS",         color: "#3b82f6" },
};

function fmt(n: number) {
  if (n >= 100000) return `रू${(n / 100000).toFixed(1)}L`;
  if (n >= 1000)   return `रू${(n / 1000).toFixed(0)}K`;
  return `रू${n.toFixed(0)}`;
}

function toISO(d: Date) {
  return d.toISOString().slice(0, 10);
}

function datePreset(preset: "this-week" | "last-week" | "this-month" | "last-30") {
  const today = new Date();
  if (preset === "this-week") {
    const day = (today.getDay() + 6) % 7; // Monday = 0
    const monday = new Date(today);
    monday.setDate(today.getDate() - day);
    return { dateFrom: toISO(monday), dateTo: toISO(today) };
  }
  if (preset === "last-week") {
    const day = (today.getDay() + 6) % 7;
    const thisMonday = new Date(today);
    thisMonday.setDate(today.getDate() - day);
    const lastMonday = new Date(thisMonday);
    lastMonday.setDate(thisMonday.getDate() - 7);
    const lastSunday = new Date(thisMonday);
    lastSunday.setDate(thisMonday.getDate() - 1);
    return { dateFrom: toISO(lastMonday), dateTo: toISO(lastSunday) };
  }
  if (preset === "this-month") {
    const first = new Date(today.getFullYear(), today.getMonth(), 1);
    return { dateFrom: toISO(first), dateTo: toISO(today) };
  }
  const thirtyAgo = new Date(today);
  thirtyAgo.setDate(today.getDate() - 30);
  return { dateFrom: toISO(thirtyAgo), dateTo: toISO(today) };
}

export default function ReportsPage() {
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().slice(0, 10);
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10));

  const { data: valData,     isLoading: loadingVal    } = useInventoryValuation();
  const { data: lowData,     isLoading: loadingLow    } = useLowStockReport();
  const { data: deadData,    isLoading: loadingDead   } = useDeadStockReport();
  const { data: salesData,   isLoading: loadingSales  } = useSalesSummary(dateFrom, dateTo);
  const { data: sellersData,  isLoading: loadingSellers  } = useTopSellers(dateFrom, dateTo, 15);
  const { data: movSummData,  isLoading: loadingMovSumm  } = useStockMovementsReport(dateFrom, dateTo);
  const { data: auditData,    isLoading: loadingAudit  } = useSalesAudit(dateFrom, dateTo);

  // Always-available "this week" audit export, independent of the tab date filter above
  const thisWeek = useMemo(() => datePreset("this-week"), []);
  const { data: weeklyAuditData } = useSalesAudit(thisWeek.dateFrom, thisWeek.dateTo);

  const val     = valData     as { rows: any[]; totalValue: number } | undefined;
  const low     = lowData     as any[] | undefined;
  const dead    = deadData    as any[] | undefined;
  const sales   = salesData   as { totalSales: number; totalRevenue: number; totalCOGS: number; grossProfit: number; grossMargin: number } | undefined;
  const sellers  = sellersData as any[] | undefined;
  const movSumm  = movSummData as { type: string; _count: number; _sum: { quantity: number } }[] | undefined;
  const audit    = auditData  as any[] | undefined;
  const weeklyAudit = weeklyAuditData as any[] | undefined;

  const toAuditRow = (r: any) => ({
    "Sale #": r.saleNumber,
    Date: new Date(r.date).toLocaleString("en-IN"),
    Cashier: r.cashier,
    Customer: r.customer,
    Payment: r.paymentType,
    Product: r.product,
    SKU: r.sku,
    Category: r.category,
    Variant: r.variant,
    Qty: r.quantity,
    "Unit Price (रू)": r.unitPrice,
    "Line Discount (रू)": r.lineDiscount,
    "Line Total (रू)": r.lineTotal,
    "Cost (रू)": r.costAtSale,
    "Line Profit (रू)": r.lineProfit,
    Voided: r.isVoided ? "YES" : "",
    "Void Reason": r.voidReason,
  });

  const chartData = val?.rows
    ?.reduce((acc: any[], row: any) => {
      const cat = row.product?.category?.name ?? "Other";
      const existing = acc.find(d => d.cat === cat);
      if (existing) { existing.value += row.totalValue; }
      else acc.push({ cat, value: row.totalValue });
      return acc;
    }, [])
    .sort((a: any, b: any) => b.value - a.value)
    .slice(0, 6) ?? [];

  return (
    <div className="space-y-5">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Reports</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Analytics and business insights</p>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton
            filename={`sales-audit-week-${thisWeek.dateFrom}-to-${thisWeek.dateTo}`}
            sheetName="Weekly Sales Audit"
            label="This Week's Audit"
            data={(weeklyAudit ?? []).map(toAuditRow)}
          />
          <ExportButton
            filename="inventory-valuation"
            sheetName="Inventory"
            label="Export Report"
            data={(val?.rows ?? []).map((r: any) => ({
              Product: r.product?.name, Category: r.product?.category?.name,
              Variant: r.size ?? r.unit, Qty: r.currentStock,
              "Cost (रू)": Number(r.costPrice), "Value (रू)": r.totalValue,
              "Sell Price (रू)": Number(r.sellingPrice), "Potential Revenue (रू)": r.potentialRevenue,
            }))}
          />
        </div>
      </motion.div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Stock Value",    value: val ? fmt(val.totalValue) : null, sub: "Current inventory" },
          { label: "Revenue",        value: sales ? fmt(sales.totalRevenue) : null, sub: `${dateFrom} → ${dateTo}` },
          { label: "Gross Profit",   value: sales ? fmt(sales.grossProfit) : null, sub: "Revenue - COGS" },
          { label: "Gross Margin",   value: sales ? `${sales.grossMargin.toFixed(1)}%` : null, sub: "Selected period" },
        ].map((card, i) => (
          <motion.div key={card.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 + i * 0.06 }}>
            <Card className="p-4">
              {card.value === null
                ? <Skeleton className="h-7 w-24 mb-1" />
                : <p className="text-xl font-bold">{card.value}</p>
              }
              <p className="text-xs text-muted-foreground mt-1">{card.label}</p>
              <p className="text-[11px] text-muted-foreground/60">{card.sub}</p>
            </Card>
          </motion.div>
        ))}
      </div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <Tabs defaultValue="topsellers">
          <TabsList className="h-8 text-xs mb-4 flex-wrap gap-1">
            <TabsTrigger value="topsellers"  className="text-xs gap-1"><Trophy size={10} /> Top Sellers</TabsTrigger>
            <TabsTrigger value="inventory"   className="text-xs">Inventory Valuation</TabsTrigger>
            <TabsTrigger value="sales"       className="text-xs">Sales Summary</TabsTrigger>
            <TabsTrigger value="audit"       className="text-xs gap-1"><ClipboardCheck size={10} /> Sales Audit</TabsTrigger>
            <TabsTrigger value="movements"   className="text-xs">Stock Movements</TabsTrigger>
            <TabsTrigger value="lowstock"    className="text-xs">Low Stock</TabsTrigger>
            <TabsTrigger value="deadstock"   className="text-xs">Dead Stock</TabsTrigger>
          </TabsList>

          {/* Top Sellers */}
          <TabsContent value="topsellers">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader className="pb-2 flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-sm flex items-center gap-2"><Trophy size={13} className="text-primary" /> Top Selling Products</CardTitle>
                      <CardDescription className="text-xs">By units sold in selected period</CardDescription>
                    </div>
                    <ExportButton
                      filename="top-sellers"
                      sheetName="Top Sellers"
                      data={(sellers ?? []).map((r, i) => ({
                        Rank: i + 1, Product: r.product, SKU: r.sku,
                        Category: r.category, "Qty Sold": r.qtySold,
                        "Revenue (रू)": r.revenue,
                      }))}
                    />
                  </CardHeader>
                  <CardContent className="pt-0">
                    {loadingSellers ? <Skeleton className="h-48 w-full" /> : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="hover:bg-transparent">
                              <TableHead className="text-xs w-10">#</TableHead>
                              <TableHead className="text-xs">Product</TableHead>
                              <TableHead className="text-xs">Category</TableHead>
                              <TableHead className="text-xs text-right">Qty Sold</TableHead>
                              <TableHead className="text-xs text-right">Revenue</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {(sellers ?? []).map((r: any, i: number) => (
                              <TableRow key={r.variantId} className="border-border/50 hover:bg-accent/30">
                                <TableCell className="py-2 text-xs font-bold text-muted-foreground">{i + 1}</TableCell>
                                <TableCell className="py-2">
                                  <p className="text-xs font-medium">{r.product}</p>
                                  <p className="text-[10px] text-muted-foreground font-mono">{r.sku} · {r.size ?? r.unit}</p>
                                </TableCell>
                                <TableCell><Badge variant="outline" className="text-[9px] h-4 px-1">{r.category}</Badge></TableCell>
                                <TableCell className="text-right">
                                  <span className="text-sm font-bold text-primary tabular-nums">{r.qtySold}</span>
                                </TableCell>
                                <TableCell className="text-right text-xs font-semibold text-emerald-500 tabular-nums">
                                  रू{Number(r.revenue).toLocaleString("en-IN")}
                                </TableCell>
                              </TableRow>
                            ))}
                            {!sellers?.length && (
                              <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">No sales in this period</TableCell></TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Bar chart */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Units Sold</CardTitle>
                  <CardDescription className="text-xs">Top 8 products</CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  {loadingSellers ? <Skeleton className="h-[260px] w-full" /> : (
                    <ChartContainer config={{ qtySold: { label: "Qty Sold", color: "#f59e0b" } }} className="h-[260px] w-full">
                      <BarChart
                        data={(sellers ?? []).slice(0, 8).map((r: any) => ({ name: r.product.split(" ").slice(0, 2).join(" "), qtySold: r.qtySold }))}
                        layout="vertical"
                        margin={{ top: 0, right: 8, left: 0, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 9, fill: "#71717a" }} axisLine={false} tickLine={false} />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: "#71717a" }} axisLine={false} tickLine={false} width={80} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="qtySold" fill="#f59e0b" radius={[0, 3, 3, 0]} maxBarSize={16} />
                      </BarChart>
                    </ChartContainer>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Inventory Valuation */}
          <TabsContent value="inventory">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Inventory Valuation</CardTitle>
                    <CardDescription className="text-xs">Stock on hand × cost price</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {loadingVal ? <Skeleton className="h-48 w-full" /> : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="hover:bg-transparent">
                              <TableHead className="text-xs">Product / Variant</TableHead>
                              <TableHead className="text-xs text-right">Qty</TableHead>
                              <TableHead className="text-xs text-right">Cost</TableHead>
                              <TableHead className="text-xs text-right">Value</TableHead>
                              <TableHead className="text-xs text-right">Potential Rev.</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {val?.rows?.map((row: any, i: number) => (
                              <TableRow key={i} className="border-border/50 hover:bg-accent/30">
                                <TableCell className="py-2">
                                  <p className="text-xs font-medium">{row.product?.name}</p>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    <Badge variant="outline" className="text-[9px] h-4 px-1">{row.product?.category?.name}</Badge>
                                    <span className="text-[10px] text-muted-foreground">{row.size ?? row.unit}</span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-right text-xs tabular-nums">{row.currentStock}</TableCell>
                                <TableCell className="text-right text-xs tabular-nums">रू{Number(row.costPrice).toLocaleString()}</TableCell>
                                <TableCell className="text-right text-xs font-semibold tabular-nums">रू{row.totalValue.toLocaleString()}</TableCell>
                                <TableCell className="text-right text-xs text-emerald-500 tabular-nums">रू{row.potentialRevenue.toLocaleString()}</TableCell>
                              </TableRow>
                            ))}
                            <TableRow className="border-t-2 border-border">
                              <TableCell className="text-xs font-bold">Total</TableCell>
                              <TableCell /><TableCell />
                              <TableCell className="text-right text-xs font-bold">रू{val?.totalValue.toLocaleString()}</TableCell>
                              <TableCell className="text-right text-xs font-bold text-emerald-500">
                                रू{val?.rows?.reduce((a: number, r: any) => a + r.potentialRevenue, 0).toLocaleString()}
                              </TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Value by Category</CardTitle>
                  <CardDescription className="text-xs">Stock value distribution</CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  {loadingVal ? <Skeleton className="h-[240px] w-full" /> : (
                    <ChartContainer config={chartConfig} className="h-[240px] w-full">
                      <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 9, fill: "#71717a" }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}K`} />
                        <YAxis type="category" dataKey="cat" tick={{ fontSize: 9, fill: "#71717a" }} axisLine={false} tickLine={false} width={48} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="value" fill="#f59e0b" radius={[0, 3, 3, 0]} maxBarSize={16} />
                      </BarChart>
                    </ChartContainer>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Sales Summary */}
          <TabsContent value="sales">
            <div className="space-y-4">
              <Card className="p-4">
                <div className="flex flex-wrap items-end gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs">From</Label>
                    <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-8 text-sm w-36" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">To</Label>
                    <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-8 text-sm w-36" />
                  </div>
                </div>
              </Card>
              {loadingSales ? <Skeleton className="h-40 w-full" /> : sales ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: "Total Sales",   value: sales.totalSales },
                    { label: "Total Revenue", value: fmt(sales.totalRevenue) },
                    { label: "Total COGS",    value: fmt(sales.totalCOGS) },
                    { label: "Gross Profit",  value: fmt(sales.grossProfit), good: sales.grossProfit > 0 },
                  ].map(c => (
                    <Card key={c.label} className="p-4">
                      <p className={`text-xl font-bold ${c.good === false ? "text-red-400" : c.good ? "text-emerald-500" : ""}`}>{c.value}</p>
                      <p className="text-xs text-muted-foreground mt-1">{c.label}</p>
                    </Card>
                  ))}
                </div>
              ) : null}
            </div>
          </TabsContent>

          {/* Sales Audit */}
          <TabsContent value="audit">
            <div className="space-y-4">
              <Card className="p-4">
                <div className="flex flex-wrap items-end gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs">From</Label>
                    <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-8 text-sm w-36" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">To</Label>
                    <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-8 text-sm w-36" />
                  </div>
                  <div className="flex gap-1.5">
                    {([
                      ["this-week", "This Week"],
                      ["last-week", "Last Week"],
                      ["this-month", "This Month"],
                      ["last-30", "Last 30 Days"],
                    ] as const).map(([key, label]) => (
                      <Button
                        key={key}
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => { const p = datePreset(key); setDateFrom(p.dateFrom); setDateTo(p.dateTo); }}
                      >
                        {label}
                      </Button>
                    ))}
                  </div>
                  <div className="ml-auto">
                    <ExportButton
                      filename={`sales-audit-${dateFrom}-to-${dateTo}`}
                      sheetName="Sales Audit"
                      label="Export Audit"
                      data={(audit ?? []).map(toAuditRow)}
                    />
                  </div>
                </div>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2"><ClipboardCheck size={13} className="text-primary" /> Sales Audit Trail</CardTitle>
                  <CardDescription className="text-xs">Every line item sold in the selected period, including voided sales</CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  {loadingAudit ? <Skeleton className="h-64 w-full" /> : (
                    <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent">
                            <TableHead className="text-xs">Sale #</TableHead>
                            <TableHead className="text-xs">Date</TableHead>
                            <TableHead className="text-xs">Cashier</TableHead>
                            <TableHead className="text-xs">Customer</TableHead>
                            <TableHead className="text-xs">Product</TableHead>
                            <TableHead className="text-xs text-right">Qty</TableHead>
                            <TableHead className="text-xs text-right">Total</TableHead>
                            <TableHead className="text-xs text-right">Profit</TableHead>
                            <TableHead className="text-xs">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(audit ?? []).map((r: any, i: number) => (
                            <TableRow key={i} className={`border-border/50 hover:bg-accent/30 ${r.isVoided ? "opacity-50" : ""}`}>
                              <TableCell className="py-2 text-xs font-mono">{r.saleNumber}</TableCell>
                              <TableCell className="text-xs whitespace-nowrap">{new Date(r.date).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</TableCell>
                              <TableCell className="text-xs">{r.cashier}</TableCell>
                              <TableCell className="text-xs">{r.customer}</TableCell>
                              <TableCell className="text-xs">
                                <p className="font-medium">{r.product}</p>
                                <p className="text-[10px] text-muted-foreground font-mono">{r.sku} · {r.variant}</p>
                              </TableCell>
                              <TableCell className="text-right text-xs tabular-nums">{r.quantity}</TableCell>
                              <TableCell className="text-right text-xs font-semibold tabular-nums">रू{Number(r.lineTotal).toLocaleString("en-IN")}</TableCell>
                              <TableCell className="text-right text-xs tabular-nums text-emerald-500">रू{Number(r.lineProfit).toLocaleString("en-IN")}</TableCell>
                              <TableCell>
                                {r.isVoided
                                  ? <Badge variant="outline" className="text-[9px] h-4 px-1 text-red-400 border-red-400/40">VOIDED</Badge>
                                  : <Badge variant="outline" className="text-[9px] h-4 px-1 text-emerald-500 border-emerald-500/40">OK</Badge>}
                              </TableCell>
                            </TableRow>
                          ))}
                          {!audit?.length && (
                            <TableRow><TableCell colSpan={9} className="text-center text-sm text-muted-foreground py-8">No sales in this period</TableCell></TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Low Stock */}
          {/* Stock Movements Summary */}
          <TabsContent value="movements">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Movement Summary</CardTitle>
                  <CardDescription className="text-xs">Total movements by type in selected period</CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  {loadingMovSumm ? <Skeleton className="h-40 w-full" /> : (
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="text-xs">Type</TableHead>
                          <TableHead className="text-xs text-right">Transactions</TableHead>
                          <TableHead className="text-xs text-right">Total Units</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(movSumm ?? []).map((row: any) => {
                          const typeColors: Record<string, string> = {
                            PURCHASE: "text-emerald-500", SALE: "text-orange-500",
                            ADJUSTMENT: "text-blue-400", WASTAGE: "text-red-400",
                            RETURN: "text-purple-400", TRANSFER: "text-yellow-500",
                          };
                          return (
                            <TableRow key={row.type} className="border-border/50 hover:bg-accent/30">
                              <TableCell className="py-2">
                                <Badge variant="outline" className={`text-[10px] h-5 px-1.5 ${typeColors[row.type] ?? ""} border-current bg-current/10`}>
                                  {row.type}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right text-sm tabular-nums font-medium">{row._count}</TableCell>
                              <TableCell className={`text-right text-sm tabular-nums font-bold ${typeColors[row.type] ?? ""}`}>
                                {row._sum?.quantity > 0 ? "+" : ""}{row._sum?.quantity ?? 0}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                        {!movSumm?.length && (
                          <TableRow><TableCell colSpan={3} className="text-center text-sm text-muted-foreground py-6">No movements in this period</TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Movement Chart</CardTitle>
                  <CardDescription className="text-xs">Units by type</CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  {loadingMovSumm ? <Skeleton className="h-[200px] w-full" /> : (
                    <ChartContainer config={{ qty: { label: "Units", color: "#f59e0b" } }} className="h-[200px] w-full">
                      <BarChart
                        data={(movSumm ?? []).map((r: any) => ({ type: r.type, qty: Math.abs(r._sum?.quantity ?? 0) }))}
                        margin={{ top: 4, right: 8, left: -10, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                        <XAxis dataKey="type" tick={{ fontSize: 9, fill: "#71717a" }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 9, fill: "#71717a" }} axisLine={false} tickLine={false} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="qty" fill="#f59e0b" radius={[3, 3, 0, 0]} maxBarSize={40} />
                      </BarChart>
                    </ChartContainer>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="lowstock">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Low Stock Report</CardTitle>
                <CardDescription className="text-xs">Items at or below reorder point</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                {loadingLow ? <Skeleton className="h-40 w-full" /> : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="text-xs">Product</TableHead>
                          <TableHead className="text-xs">Category</TableHead>
                          <TableHead className="text-xs text-right">Stock</TableHead>
                          <TableHead className="text-xs text-right">Reorder Point</TableHead>
                          <TableHead className="text-xs">Supplier</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(low ?? []).map((v: any, i: number) => (
                          <TableRow key={i} className="border-border/50 hover:bg-accent/30">
                            <TableCell className="py-2">
                              <p className="text-xs font-medium">{v.product?.name}</p>
                              <p className="text-[10px] text-muted-foreground">{v.size ?? v.unit}</p>
                            </TableCell>
                            <TableCell><Badge variant="outline" className="text-[9px] h-4 px-1">{v.product?.category?.name}</Badge></TableCell>
                            <TableCell className="text-right">
                              <span className={`text-xs font-semibold ${v.currentStock === 0 ? "text-red-400" : "text-amber-500"}`}>{v.currentStock}</span>
                            </TableCell>
                            <TableCell className="text-right text-xs text-muted-foreground">{v.reorderPoint}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{v.product?.supplier?.name ?? "—"}</TableCell>
                          </TableRow>
                        ))}
                        {!low?.length && <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">All stock levels are healthy</TableCell></TableRow>}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Dead Stock */}
          <TabsContent value="deadstock">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Dead Stock Report</CardTitle>
                <CardDescription className="text-xs">No movement in the last 60 days</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                {loadingDead ? <Skeleton className="h-40 w-full" /> : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="text-xs">Product</TableHead>
                          <TableHead className="text-xs">Category</TableHead>
                          <TableHead className="text-xs text-right">Stock</TableHead>
                          <TableHead className="text-xs text-right">Value</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(dead ?? []).map((v: any, i: number) => (
                          <TableRow key={i} className="border-border/50 hover:bg-accent/30">
                            <TableCell className="py-2">
                              <p className="text-xs font-medium">{v.product?.name}</p>
                              <p className="text-[10px] text-muted-foreground">{v.size ?? v.unit}</p>
                            </TableCell>
                            <TableCell><Badge variant="outline" className="text-[9px] h-4 px-1">{v.product?.category?.name}</Badge></TableCell>
                            <TableCell className="text-right text-xs font-semibold text-amber-500">{v.currentStock}</TableCell>
                            <TableCell className="text-right text-xs">रू{(Number(v.costPrice) * v.currentStock).toLocaleString()}</TableCell>
                          </TableRow>
                        ))}
                        {!dead?.length && <TableRow><TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-8">No dead stock found</TableCell></TableRow>}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}
