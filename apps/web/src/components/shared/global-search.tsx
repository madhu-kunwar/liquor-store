"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CommandDialog, CommandEmpty, CommandGroup,
  CommandInput, CommandItem, CommandList, CommandSeparator,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard, Package, Boxes, Truck, Users2,
  ShoppingBag, BarChart3, Bell, Settings,
  Wine, Tag, Search, ArrowRight,
} from "lucide-react";
import { useProducts } from "@/lib/hooks/use-products";
import { useDebounce } from "@/lib/hooks/use-debounce";

const NAV_ITEMS = [
  { label: "Dashboard",       href: "/",                   icon: LayoutDashboard, group: "Pages" },
  { label: "Products",        href: "/products",            icon: Package,         group: "Pages" },
  { label: "Inventory",       href: "/inventory",           icon: Boxes,           group: "Pages" },
  { label: "Purchase Orders", href: "/purchase-orders",     icon: Truck,           group: "Pages" },
  { label: "Suppliers",       href: "/suppliers",           icon: Users2,          group: "Pages" },
  { label: "Sales",           href: "/sales",               icon: ShoppingBag,     group: "Pages" },
  { label: "Reports",         href: "/reports",             icon: BarChart3,       group: "Pages" },
  { label: "Alerts",          href: "/alerts",              icon: Bell,            group: "Pages" },
  { label: "Users",           href: "/settings/users",      icon: Settings,        group: "Settings" },
  { label: "Categories",      href: "/settings/categories", icon: Tag,             group: "Settings" },
];

type Product = {
  id: string;
  name: string;
  sku: string;
  brand: string;
  category?: { name: string };
};

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 300);
  const router = useRouter();

  const { data: productsRes } = useProducts(debouncedQuery.length > 1 ? { search: debouncedQuery, limit: 5 } : undefined);
  const products: Product[] = (productsRes as { data: Product[] } | undefined)?.data ?? [];

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || e.key === "/") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const navigate = (href: string) => {
    setOpen(false);
    setQuery("");
    router.push(href);
  };

  return (
    <>
      {/* Trigger bar */}
      <button
        onClick={() => setOpen(true)}
        className="flex flex-1 items-center gap-2 rounded-lg border border-border bg-background/60 px-3 py-1.5 max-w-sm cursor-pointer hover:border-primary/40 transition-colors text-left"
      >
        <Search size={13} className="text-muted-foreground shrink-0" />
        <span className="flex-1 text-sm text-muted-foreground">Search anything...</span>
        <kbd className="hidden sm:inline-flex h-5 items-center gap-0.5 rounded border border-border bg-muted px-1.5 font-mono text-[10px] text-muted-foreground">
          <span>⌘</span><span>K</span>
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={o => { setOpen(o); if (!o) setQuery(""); }}>
        <CommandInput
          placeholder="Search pages, products..."
          className="h-10 text-sm"
          value={query}
          onValueChange={setQuery}
        />
        <CommandList className="max-h-[420px]">
          <CommandEmpty>
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <Search size={24} className="text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No results found</p>
            </div>
          </CommandEmpty>

          {/* Navigation */}
          <CommandGroup heading="Pages">
            {NAV_ITEMS.filter((i) => i.group === "Pages").map((item) => {
              const Icon = item.icon;
              return (
                <CommandItem
                  key={item.href}
                  value={item.label}
                  onSelect={() => navigate(item.href)}
                  className="gap-3 py-2.5 cursor-pointer"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-md bg-muted">
                    <Icon size={14} className="text-muted-foreground" />
                  </div>
                  <span className="text-sm">{item.label}</span>
                  <ArrowRight size={12} className="ml-auto text-muted-foreground/40" />
                </CommandItem>
              );
            })}
          </CommandGroup>

          {products.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Products">
                {products.map((p) => (
                  <CommandItem
                    key={p.id}
                    value={`${p.name} ${p.sku} ${p.brand}`}
                    onSelect={() => navigate(`/products/${p.id}`)}
                    className="gap-3 py-2 cursor-pointer"
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10">
                      <Wine size={13} className="text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm leading-none">{p.name}</p>
                      <p className="text-[11px] font-mono text-muted-foreground mt-0.5">{p.sku}</p>
                    </div>
                    {p.category && (
                      <Badge variant="outline" className="text-[10px] h-4 px-1.5 shrink-0">{p.category.name}</Badge>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          <CommandSeparator />

          {/* Settings */}
          <CommandGroup heading="Settings">
            {NAV_ITEMS.filter((i) => i.group === "Settings").map((item) => {
              const Icon = item.icon;
              return (
                <CommandItem
                  key={item.href}
                  value={item.label}
                  onSelect={() => navigate(item.href)}
                  className="gap-3 py-2 cursor-pointer"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-md bg-muted">
                    <Icon size={14} className="text-muted-foreground" />
                  </div>
                  <span className="text-sm">{item.label}</span>
                  <ArrowRight size={12} className="ml-auto text-muted-foreground/40" />
                </CommandItem>
              );
            })}
          </CommandGroup>
        </CommandList>

        <div className="border-t border-border px-3 py-2 flex items-center gap-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1"><kbd className="rounded border border-border bg-muted px-1 font-mono">↑↓</kbd> navigate</span>
          <span className="flex items-center gap-1"><kbd className="rounded border border-border bg-muted px-1 font-mono">↵</kbd> open</span>
          <span className="flex items-center gap-1"><kbd className="rounded border border-border bg-muted px-1 font-mono">Esc</kbd> close</span>
        </div>
      </CommandDialog>
    </>
  );
}
