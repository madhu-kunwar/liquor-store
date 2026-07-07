"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, Cell } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { useTopSellers } from "@/lib/hooks/use-reports";

const BAR_COLORS = ["#f59e0b", "#fb923c", "#fbbf24", "#f97316", "#f59e0b"];

const chartConfig = {
  sales: { label: "Units Sold", color: "#f59e0b" },
};

export function TopProductsChart() {
  const { data: sellersData, isLoading } = useTopSellers(undefined, undefined, 5);

  const chartData = useMemo(() => {
    const sellers = (sellersData as unknown as any[]) ?? [];
    return sellers.map((r: any) => ({
      name: r.product.length > 14 ? `${r.product.slice(0, 14)}…` : r.product,
      sales: r.qtySold,
    }));
  }, [sellersData]);

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.49, duration: 0.35 }}>
      <Card className="col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Top Products</CardTitle>
          <CardDescription className="text-xs">By units sold (all time)</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {isLoading ? (
            <Skeleton className="h-[200px] w-full" />
          ) : chartData.length === 0 ? (
            <div className="h-[200px] flex items-center justify-center">
              <p className="text-xs text-muted-foreground">No sales data yet</p>
            </div>
          ) : (
            <ChartContainer config={chartConfig} className="h-[200px] w-full">
              <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
                <CartesianGrid horizontal={false} stroke="rgba(255,255,255,0.06)" />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#71717a" }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" width={92} tick={{ fontSize: 11, fill: "#a1a1aa" }} axisLine={false} tickLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="sales" radius={[0, 4, 4, 0]} maxBarSize={18}>
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
