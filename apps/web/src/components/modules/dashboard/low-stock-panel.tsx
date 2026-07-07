"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useAlerts } from "@/lib/hooks/use-alerts";

type AlertVariant = {
  id: string;
  currentStock: number;
  reorderPoint: number;
  size?: string;
  unit: string;
  product: { name: string; sku: string };
};

export function LowStockPanel() {
  const { data, isLoading } = useAlerts();
  const alerts: AlertVariant[] = ((data as AlertVariant[] | undefined) ?? []).slice(0, 5);

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.56, duration: 0.35 }}>
      <Card className="border-primary/20">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle size={15} className="text-primary" />
            <CardTitle className="text-sm font-semibold">Low Stock Alerts</CardTitle>
            {!isLoading && (
              <Badge className="text-[10px] h-4 px-1.5 bg-primary/20 text-primary border-0">
                {(data as AlertVariant[] | undefined)?.length ?? 0}
              </Badge>
            )}
          </div>
          <Button render={<Link href="/alerts" />} nativeButton={false} variant="ghost" size="sm" className="h-7 text-xs gap-1 text-muted-foreground hover:text-primary">
            View all <ArrowRight size={11} />
          </Button>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-1.5 w-full" />
              </div>
            ))
          ) : alerts.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">All stock levels are healthy</p>
          ) : (
            alerts.map((item, i) => {
              const stockPct = Math.min((item.currentStock / item.reorderPoint) * 100, 100);
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + i * 0.05 }}
                  className="space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium leading-none">{item.product.name}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{item.product.sku} · {item.size ?? item.unit}</p>
                    </div>
                    <Badge
                      variant="outline"
                      className={item.currentStock === 0
                        ? "border-red-500/30 text-red-500 text-[10px] h-5"
                        : "border-amber-500/30 text-amber-500 text-[10px] h-5"}
                    >
                      {item.currentStock === 0 ? "Out of stock" : `${item.currentStock} left`}
                    </Badge>
                  </div>
                  <Progress value={stockPct} className="h-1" />
                </motion.div>
              );
            })
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
