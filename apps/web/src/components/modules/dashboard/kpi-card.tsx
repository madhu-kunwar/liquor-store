"use client";

import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";
import { useEffect, useState } from "react";

interface KpiCardProps {
  title: string;
  value: string | number;
  prefix?: string;
  suffix?: string;
  change?: number;
  changeLabel?: string;
  icon: React.ReactNode;
  iconColor?: string;
  index?: number;
}

function useCountUp(target: number, duration = 1200) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const start = performance.now();
    const update = (time: number) => {
      const elapsed = time - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(update);
    };
    requestAnimationFrame(update);
  }, [target, duration]);
  return value;
}

export function KpiCard({ title, value, prefix, suffix, change, changeLabel, icon, iconColor = "text-primary", index = 0 }: KpiCardProps) {
  const numericValue = typeof value === "number" ? value : parseFloat(String(value).replace(/[^0-9.]/g, ""));
  const displayValue = isNaN(numericValue) ? value : undefined;
  const animatedValue = useCountUp(isNaN(numericValue) ? 0 : numericValue);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.35, ease: "easeOut" }}
    >
      <Card className="p-5 hover:border-primary/30 transition-colors group">
        <div className="flex items-start justify-between mb-4">
          <div className={cn("p-2 rounded-lg bg-primary/10", iconColor)}>
            {icon}
          </div>
          {change !== undefined && (
            <div className={cn("flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full",
              change >= 0 ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
            )}>
              {change >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
              {Math.abs(change)}%
            </div>
          )}
        </div>

        <div className="space-y-1">
          <p className="text-2xl font-bold tracking-tight tabular-nums">
            {prefix}{displayValue ?? animatedValue.toLocaleString()}{suffix}
          </p>
          <p className="text-xs text-muted-foreground">{title}</p>
          {changeLabel && (
            <p className="text-[11px] text-muted-foreground/60">{changeLabel}</p>
          )}
        </div>
      </Card>
    </motion.div>
  );
}
