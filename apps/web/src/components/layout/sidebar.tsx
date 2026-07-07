"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import {
  LayoutDashboard, Package, Boxes, Truck, Users2,
  BarChart3, Bell, Settings, ChevronLeft, ChevronRight,
  Wine, ShoppingBag, X, ArrowDownToLine, ArrowUpFromLine, TableProperties, Users, Wallet, Store, History, ClipboardList,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useAlerts } from "@/lib/hooks/use-alerts";

const navItems = [
  { label: "Dashboard",       href: "/",                 icon: LayoutDashboard },
  { label: "Products",        href: "/products",          icon: Package },
  { label: "Stock Register",  href: "/stock-register",    icon: TableProperties },
  { label: "Stock In",        href: "/stock-in",          icon: ArrowDownToLine },
  { label: "Sales",           href: "/sales",             icon: ArrowUpFromLine },
  { label: "Current Stock",   href: "/inventory",         icon: Boxes },
  { label: "Dealer Orders",   href: "/dealer-orders",     icon: ClipboardList },
  { label: "Purchase Orders", href: "/purchase-orders",   icon: Truck },
  { label: "Suppliers",       href: "/suppliers",         icon: Users2 },
  { label: "Customers",       href: "/customers",         icon: Users },
];

const bottomItems = [
  { label: "Reports",   href: "/reports",         icon: BarChart3 },
  { label: "Expenses",  href: "/expenses",         icon: Wallet },
  { label: "Alerts",    href: "/alerts",           icon: Bell },
  { label: "Store Setup", href: "/settings/store",  icon: Store },
  { label: "Settings",   href: "/settings/users",  icon: Settings },
];

interface SidebarProps {
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export function Sidebar({ mobileOpen, onMobileClose }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const isActive = (href: string) => href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <>
      {/* Desktop sidebar */}
      <motion.aside
        animate={{ width: collapsed ? 64 : 240 }}
        transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
        className="relative hidden md:flex flex-col h-screen border-r border-border bg-card overflow-hidden shrink-0"
      >
        <SidebarLogo collapsed={collapsed} />
        <SidebarNav collapsed={collapsed} isActive={isActive} onNavigate={() => {}} />
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all z-30 shadow-sm"
        >
          {collapsed ? <ChevronRight size={11} /> : <ChevronLeft size={11} />}
        </button>
      </motion.aside>

      {/* Mobile Sheet sidebar */}
      <Sheet open={mobileOpen} onOpenChange={onMobileClose}>
        <SheetContent side="left" className="w-64 p-0 flex flex-col border-r border-border bg-card">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Wine size={16} />
              </div>
              <div>
                <p className="font-semibold text-sm leading-none">LiquorERP</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Store Management</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onMobileClose}>
              <X size={14} />
            </Button>
          </div>
          <SidebarNav collapsed={false} isActive={isActive} onNavigate={onMobileClose} />
        </SheetContent>
      </Sheet>
    </>
  );
}

function SidebarLogo({ collapsed }: { collapsed: boolean }) {
  return (
    <div className="flex h-14 items-center gap-3 border-b border-border px-4 overflow-hidden">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Wine size={16} />
      </div>
      <AnimatePresence mode="wait">
        {!collapsed && (
          <motion.div
            key="logo-text"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.15 }}
          >
            <p className="font-semibold text-sm leading-none whitespace-nowrap">LiquorERP</p>
            <p className="text-[10px] text-muted-foreground whitespace-nowrap mt-0.5">Store Management</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SidebarNav({
  collapsed,
  isActive,
  onNavigate,
}: {
  collapsed: boolean;
  isActive: (href: string) => boolean;
  onNavigate: () => void;
}) {
  const { data: alertsData } = useAlerts();
  const alertCount = (alertsData as unknown as unknown[])?.length ?? 0;

  return (
    <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
      <AnimatePresence mode="wait">
        {!collapsed && (
          <motion.p
            key="label-ops"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="px-2 mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60"
          >
            Operations
          </motion.p>
        )}
      </AnimatePresence>

      {navItems.map((item) => (
        <NavItem key={item.href} item={item} collapsed={collapsed} active={isActive(item.href)} onClick={onNavigate} />
      ))}

      <div className="pt-3 mt-3 border-t border-border/50 space-y-0.5">
        <AnimatePresence mode="wait">
          {!collapsed && (
            <motion.p
              key="label-analytics"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="px-2 mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60"
            >
              Analytics
            </motion.p>
          )}
        </AnimatePresence>
        {bottomItems.map((item) => (
          <NavItem
            key={item.href}
            item={{ ...item, badge: item.href === "/alerts" && alertCount > 0 ? alertCount : undefined }}
            collapsed={collapsed}
            active={isActive(item.href)}
            onClick={onNavigate}
          />
        ))}
      </div>
    </nav>
  );
}

function NavItem({
  item,
  collapsed,
  active,
  onClick,
}: {
  item: { label: string; href: string; icon: React.ElementType; badge?: number };
  collapsed: boolean;
  active: boolean;
  onClick: () => void;
}) {
  const Icon = item.icon;

  const content = (
    <Link
      href={item.href}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-md px-2 py-2 text-sm transition-all duration-150 relative group",
        active
          ? "bg-primary/10 text-primary font-medium"
          : "text-muted-foreground hover:bg-accent hover:text-foreground"
      )}
    >
      {active && (
        <motion.div
          layoutId="sidebar-active-indicator"
          className="absolute inset-0 rounded-md bg-primary/10"
          transition={{ duration: 0.15 }}
        />
      )}
      <Icon size={16} className="shrink-0 relative z-10" />
      <AnimatePresence>
        {!collapsed && (
          <motion.span
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
            className="whitespace-nowrap relative z-10 flex-1"
          >
            {item.label}
          </motion.span>
        )}
      </AnimatePresence>
      {!collapsed && item.badge && (
        <Badge className="h-4 px-1.5 text-[10px] bg-primary/20 text-primary border-0 relative z-10">
          {item.badge}
        </Badge>
      )}
    </Link>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger render={(props) => React.cloneElement(content, props)} />
        <TooltipContent side="right" className="flex items-center gap-2">
          {item.label}
          {item.badge && <Badge className="h-4 px-1.5 text-[10px]">{item.badge}</Badge>}
        </TooltipContent>
      </Tooltip>
    );
  }

  return content;
}
