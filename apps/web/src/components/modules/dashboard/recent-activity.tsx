"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { ArrowDown, ArrowUp, RefreshCw, AlertCircle, RotateCcw } from "lucide-react";
import { useStockMovements } from "@/lib/hooks/use-inventory";

type Movement = {
  id: string;
  type: string;
  quantity: number;
  reason: string;
  createdAt: string;
  variant: {
    size?: string | null;
    unit: string;
    product: { name: string; sku: string };
  };
};

const TYPE_CFG: Record<string, { icon: React.ElementType; color: string; bg: string; label: string }> = {
  PURCHASE:   { icon: ArrowDown,   color: "text-emerald-500", bg: "bg-emerald-500/10", label: "Received" },
  SALE:       { icon: ArrowUp,     color: "text-primary",     bg: "bg-primary/10",     label: "Sold" },
  ADJUSTMENT: { icon: RefreshCw,   color: "text-blue-400",    bg: "bg-blue-400/10",    label: "Adjusted" },
  WASTAGE:    { icon: AlertCircle, color: "text-red-400",     bg: "bg-red-400/10",     label: "Wastage" },
  RETURN:     { icon: RotateCcw,   color: "text-purple-400",  bg: "bg-purple-400/10",  label: "Return" },
};

function relativeTime(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function activityLabel(m: Movement) {
  const product = `${m.variant.product.name}${m.variant.size ? ` ${m.variant.size}` : ""}`;
  const qty = Math.abs(m.quantity);
  switch (m.type) {
    case "PURCHASE":   return `Received ${qty} ${product}`;
    case "SALE":       return `Sold ${qty} ${product}`;
    case "ADJUSTMENT": return `Adjusted ${product} (${m.quantity > 0 ? "+" : ""}${m.quantity})`;
    case "WASTAGE":    return `Wastage: ${qty} ${product}`;
    case "RETURN":     return `Return: ${qty} ${product}`;
    default:           return `${m.type}: ${qty} ${product}`;
  }
}

export function RecentActivity() {
  const { data, isLoading } = useStockMovements({ limit: 10, page: 1 });
  const res = data as { data: Movement[] } | undefined;
  const movements = res?.data ?? [];

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.63, duration: 0.35 }}>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <ScrollArea className="h-[280px] pr-2">
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <Skeleton className="h-7 w-7 rounded-full shrink-0" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-3 w-48" />
                      <Skeleton className="h-2.5 w-24" />
                    </div>
                  </div>
                ))}
              </div>
            ) : movements.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">No recent activity</p>
            ) : (
              <div className="space-y-3">
                {movements.map((m, i) => {
                  const config = TYPE_CFG[m.type] ?? TYPE_CFG.ADJUSTMENT;
                  const Icon = config.icon;
                  return (
                    <motion.div
                      key={m.id}
                      initial={{ opacity: 0, x: 8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.65 + i * 0.04 }}
                      className="flex items-start gap-3"
                    >
                      <div className={cn("mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full", config.bg)}>
                        <Icon size={13} className={config.color} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium leading-snug truncate">{activityLabel(m)}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{config.label} · {relativeTime(m.createdAt)}</p>
                      </div>
                      <Badge variant="outline" className="text-[9px] h-4 px-1.5 shrink-0 font-mono">
                        {m.variant.product.sku.slice(0, 8)}
                      </Badge>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </motion.div>
  );
}
