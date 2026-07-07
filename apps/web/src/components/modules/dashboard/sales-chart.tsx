"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Pie, PieChart, Cell } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { useInventoryValuation } from "@/lib/hooks/use-reports";

const PALETTE = ["#f59e0b", "#3b82f6", "#10b981", "#8b5cf6", "#f43f5e", "#06b6d4", "#ec4899", "#84cc16"];

type ValuationRow = { totalValue: number; product: { category: { name: string } } };

export function SalesByCategoryChart() {
  const { data: raw, isLoading } = useInventoryValuation();

  const { chartData, chartConfig } = useMemo(() => {
    const valuation = raw as { rows: ValuationRow[]; totalValue: number } | undefined;
    const rows = valuation?.rows ?? [];

    const byCategory: Record<string, number> = {};
    rows.forEach(r => {
      const cat = r.product?.category?.name ?? "Other";
      byCategory[cat] = (byCategory[cat] ?? 0) + r.totalValue;
    });

    const total = Object.values(byCategory).reduce((a, v) => a + v, 0);
    const sorted = Object.entries(byCategory).sort((a, b) => b[1] - a[1]).slice(0, 8);

    const cd = sorted.map(([name, value], i) => ({
      name,
      value: total > 0 ? Math.round((value / total) * 100) : 0,
      color: PALETTE[i % PALETTE.length],
    }));

    const cc = Object.fromEntries(cd.map(d => [d.name, { label: d.name, color: d.color }]));

    return { chartData: cd, chartConfig: cc };
  }, [raw]);

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.42, duration: 0.35 }}>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Stock by Category</CardTitle>
          <CardDescription className="text-xs">Value distribution across categories</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {isLoading ? (
            <Skeleton className="h-[180px] w-full" />
          ) : chartData.length === 0 ? (
            <div className="h-[180px] flex items-center justify-center">
              <p className="text-xs text-muted-foreground">No inventory data</p>
            </div>
          ) : (
            <>
              <ChartContainer config={chartConfig} className="h-[180px] w-full">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={76}
                    paddingAngle={3}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {chartData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
                </PieChart>
              </ChartContainer>

              <div className="grid grid-cols-2 gap-1.5 mt-3">
                {chartData.map((d) => (
                  <div key={d.name} className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full shrink-0" style={{ background: d.color }} />
                    <span className="text-xs text-muted-foreground truncate">{d.name}</span>
                    <span className="text-xs font-medium ml-auto">{d.value}%</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
