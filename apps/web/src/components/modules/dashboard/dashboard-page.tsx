"use client";

import { motion } from "framer-motion";
import { KpiCard } from "./kpi-card";
import { StockMovementChart } from "./stock-chart";
import { SalesByCategoryChart } from "./sales-chart";
import { TopProductsChart } from "./top-products";
import { LowStockPanel } from "./low-stock-panel";
import { RecentActivity } from "./recent-activity";
import { Package, Boxes, ShoppingCart, ShoppingBag, AlertTriangle, PackageX } from "lucide-react";
import { useInventorySummary } from "@/lib/hooks/use-inventory";
import { useDailySummary } from "@/lib/hooks/use-sales";

export function DashboardPage() {
  const { data: summaryData } = useInventorySummary();
  const { data: dailyData }   = useDailySummary();

  const summary = summaryData as {
    totalProducts: number; totalStock: number; totalValue: number;
    lowStockCount: number; outOfStockCount: number;
    todayPurchases: number; todayPurchaseQty: number;
  } | undefined;
  const daily = dailyData as { count: number; totalRevenue: number } | undefined;

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
        <h1 className="text-xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Welcome back. Here's what's happening today.</p>
      </motion.div>

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 md:gap-4">
        <KpiCard title="Total Products"    value={summary?.totalProducts ?? 0}    icon={<Package size={16} />}       index={0} />
        <KpiCard title="Total Stock"       value={summary?.totalStock ?? 0}        icon={<Boxes size={16} />}         index={1} />
        <KpiCard title="Today's Purchases" value={summary?.todayPurchaseQty ?? 0}  icon={<ShoppingCart size={16} />}  index={2} />
        <KpiCard title="Today's Sales"     value={daily?.count ?? 0}               icon={<ShoppingBag size={16} />}   index={3} />
        <KpiCard title="Low Stock"         value={summary?.lowStockCount ?? 0}      icon={<AlertTriangle size={16} />} iconColor="text-primary" index={4} />
        <KpiCard title="Out of Stock"      value={summary?.outOfStockCount ?? 0}    icon={<PackageX size={16} />}      iconColor="text-destructive" index={5} />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2"><StockMovementChart /></div>
        <SalesByCategoryChart />
      </div>

      {/* Second row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2"><TopProductsChart /></div>
        <RecentActivity />
      </div>

      <LowStockPanel />
    </div>
  );
}
