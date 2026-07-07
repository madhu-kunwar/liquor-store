"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Truck, CheckCheck, Package } from "lucide-react";
import Link from "next/link";
import { useAlerts } from "@/lib/hooks/use-alerts";

type AlertVariant = {
  id: string;
  currentStock: number;
  reorderPoint: number;
  unit: string;
  size?: string;
  product: {
    name: string;
    sku: string;
    category: { name: string };
    supplier?: { name: string } | null;
  };
};

function severity(v: AlertVariant) {
  if (v.currentStock === 0) return "critical";
  const ratio = v.currentStock / v.reorderPoint;
  if (ratio <= 0.25) return "high";
  if (ratio <= 0.6)  return "medium";
  return "low";
}

const severityConfig: Record<string, { label: string; color: string; border: string }> = {
  critical: { label: "Out of Stock", color: "text-red-400 bg-red-400/10 border-red-400/20",      border: "border-red-500/20" },
  high:     { label: "Critical",     color: "text-orange-400 bg-orange-400/10 border-orange-400/20", border: "border-orange-500/20" },
  medium:   { label: "Low Stock",    color: "text-amber-400 bg-amber-400/10 border-amber-400/20",  border: "border-amber-500/20" },
  low:      { label: "Watch",        color: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20", border: "" },
};

export default function AlertsPage() {
  const { data, isLoading } = useAlerts();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const allAlerts: AlertVariant[] = (data as AlertVariant[] | undefined) ?? [];
  const alerts = allAlerts.filter(a => !dismissed.has(a.id));

  const sev = (v: AlertVariant) => severity(v);
  const outOfStock  = alerts.filter(a => a.currentStock === 0).length;
  const critical    = alerts.filter(a => sev(a) === "high").length;
  const low         = alerts.filter(a => sev(a) === "medium").length;
  const watch       = alerts.filter(a => sev(a) === "low").length;

  return (
    <div className="space-y-5">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Alerts</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isLoading ? "Loading…" : `${alerts.length} item${alerts.length !== 1 ? "s" : ""} need attention`}
          </p>
        </div>
        <Button render={<Link href="/purchase-orders/new" />} nativeButton={false} size="sm" className="gap-1.5">
          <Truck size={14} /> Create Purchase Order
        </Button>
      </motion.div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Out of Stock", value: outOfStock, color: "text-red-400" },
          { label: "Critical Low", value: critical,   color: "text-orange-400" },
          { label: "Low Stock",    value: low,        color: "text-amber-500" },
          { label: "Watch List",   value: watch,      color: "text-yellow-400" },
        ].map((card, i) => (
          <motion.div key={card.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 + i * 0.06 }}>
            <Card className="p-4">
              {isLoading
                ? <Skeleton className="h-8 w-12 mb-1" />
                : <p className={`text-3xl font-bold ${card.color}`}>{card.value}</p>
              }
              <p className="text-xs text-muted-foreground mt-1">{card.label}</p>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Alert list */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="p-4"><Skeleton className="h-16 w-full" /></Card>
          ))}
        </div>
      ) : alerts.length === 0 ? (
        <Card className="p-12 text-center">
          <Package size={32} className="mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm font-medium">All stock levels are healthy</p>
          <p className="text-xs text-muted-foreground mt-1">No items below reorder point</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {alerts.map((alert, i) => {
            const s = sev(alert);
            const config = severityConfig[s];
            const stockPct = Math.min((alert.currentStock / alert.reorderPoint) * 100, 100);
            return (
              <motion.div key={alert.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.04 }}>
                <Card className={`p-4 ${config.border}`}>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <AlertTriangle size={16} className="text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-semibold">
                          {alert.product.name} {alert.size && `· ${alert.size}`}
                        </p>
                        <Badge variant="outline" className={`text-[10px] h-4 px-1.5 ${config.color}`}>
                          {config.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="font-mono">{alert.product.sku}</span>
                        <span>·</span>
                        <span>{alert.product.category.name}</span>
                        {alert.product.supplier && <><span>·</span><span>{alert.product.supplier.name}</span></>}
                      </div>
                      <div className="flex items-center gap-3 mt-2">
                        <div className="flex-1 max-w-xs">
                          <Progress value={stockPct} className="h-1.5" />
                        </div>
                        <span className="text-xs tabular-nums">
                          <span className={alert.currentStock === 0 ? "text-red-400 font-semibold" : "font-medium"}>
                            {alert.currentStock}
                          </span>
                          <span className="text-muted-foreground"> / {alert.reorderPoint} reorder point</span>
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button render={<Link href="/purchase-orders/new" />} nativeButton={false} size="sm" variant="outline" className="h-8 text-xs gap-1.5">
                        <Truck size={12} /> Create PO
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 text-xs gap-1.5 text-muted-foreground"
                        onClick={() => setDismissed(prev => new Set([...prev, alert.id]))}
                      >
                        <CheckCheck size={12} /> Dismiss
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
