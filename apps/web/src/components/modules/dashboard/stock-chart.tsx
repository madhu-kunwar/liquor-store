"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Area, AreaChart, XAxis, YAxis, CartesianGrid } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { useStockMovements } from "@/lib/hooks/use-inventory";

const COLORS = { in: "#10b981", out: "#f59e0b" };

const chartConfig = {
  in:  { label: "Stock In",  color: COLORS.in },
  out: { label: "Stock Out", color: COLORS.out },
};

type Movement = { type: string; quantity: number; createdAt: string };

export function StockMovementChart() {
  const now = new Date();
  const dateFrom = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate()).toISOString().split("T")[0];
  const dateTo   = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString().split("T")[0];

  const { data: raw, isLoading } = useStockMovements({ dateFrom, dateTo, limit: 1000 });
  const movements: Movement[] = (raw as { data: Movement[] } | undefined)?.data ?? [];

  const chartData = useMemo(() => {
    const now = new Date();
    // Build 30 daily buckets
    const days = Array.from({ length: 30 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (29 - i));
      return {
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
        day: d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
        in: 0, out: 0,
      };
    });

    const dayMap: Record<string, typeof days[0]> = {};
    days.forEach(d => { dayMap[d.key] = d; });

    movements.forEach(m => {
      const d = new Date(m.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const bucket = dayMap[key];
      if (!bucket) return;
      if (m.quantity > 0) bucket.in  += m.quantity;
      else                bucket.out += Math.abs(m.quantity);
    });

    // Collapse to weekly buckets for cleaner chart (4-5 data points)
    const weeks: { day: string; in: number; out: number }[] = [];
    for (let i = 0; i < days.length; i += 7) {
      const slice = days.slice(i, i + 7);
      weeks.push({
        day: slice[0].day,
        in:  slice.reduce((s, d) => s + d.in, 0),
        out: slice.reduce((s, d) => s + d.out, 0),
      });
    }
    return weeks;
  }, [movements]);

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.35 }}>
      <Card className="col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Monthly Stock Movement</CardTitle>
          <CardDescription className="text-xs">Purchases vs sales — last 30 days (by week)</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {isLoading ? (
            <Skeleton className="h-[200px] w-full" />
          ) : (
            <ChartContainer config={chartConfig} className="h-[200px] w-full">
              <AreaChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradIn" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={COLORS.in}  stopOpacity={0.25} />
                    <stop offset="95%" stopColor={COLORS.in}  stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradOut" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={COLORS.out} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={COLORS.out} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#71717a" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#71717a" }} axisLine={false} tickLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area type="monotone" dataKey="in"  stroke={COLORS.in}  fill="url(#gradIn)"  strokeWidth={2} dot={false} />
                <Area type="monotone" dataKey="out" stroke={COLORS.out} fill="url(#gradOut)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
