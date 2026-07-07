"use client";

import { Bell, Moon, Sun, User, LogOut, Settings, ChevronDown, Menu, CheckCheck } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { GlobalSearch } from "@/components/shared/global-search";
import { useRouter } from "next/navigation";
import { useUnreadCount, useNotifications, useMarkRead, useMarkAllRead } from "@/lib/hooks/use-notifications";

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const { data: countData } = useUnreadCount();
  const { data: notifData } = useNotifications();
  const markRead    = useMarkRead();
  const markAllRead = useMarkAllRead();

  const unreadCount   = (countData as unknown as number | undefined) ?? 0;
  const notifications = (notifData as unknown as any[]) ?? [];

  const handleLogout = () => {
    document.cookie = "access_token=; path=/; max-age=0";
    window.location.href = "/login";
  };

  return (
    <header className="flex h-14 items-center gap-3 border-b border-border bg-card/80 backdrop-blur-sm px-4 md:px-6 sticky top-0 z-10">
      {/* Hamburger — mobile only */}
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden h-8 w-8 text-muted-foreground hover:text-foreground shrink-0"
        onClick={onMenuClick}
      >
        <Menu size={18} />
      </Button>

      {/* Global Search */}
      <GlobalSearch />

      <div className="flex items-center gap-1 ml-auto shrink-0">
        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          <Sun size={15} className="rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon size={15} className="absolute rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </Button>

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8 relative text-muted-foreground hover:text-foreground" />}>
            <Bell size={15} />
            {unreadCount > 0 && (
              <Badge className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-0.5 text-[9px] font-bold bg-primary text-primary-foreground border-0 flex items-center justify-center">
                {unreadCount > 9 ? "9+" : unreadCount}
              </Badge>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <div className="flex items-center justify-between px-2 py-1.5">
              <DropdownMenuLabel className="p-0 text-sm">Notifications</DropdownMenuLabel>
              {unreadCount > 0 && (
                <Button variant="ghost" size="sm" className="h-6 text-xs gap-1 text-muted-foreground" onClick={() => markAllRead.mutate()}>
                  <CheckCheck size={11} /> Mark all read
                </Button>
              )}
            </div>
            <DropdownMenuSeparator />
            {notifications.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">No notifications</p>
            )}
            {notifications.slice(0, 8).map((n: any) => (
              <DropdownMenuItem
                key={n.id}
                className={`flex flex-col items-start gap-0.5 py-2 px-3 cursor-pointer ${!n.isRead ? "bg-primary/5" : ""}`}
                onClick={() => !n.isRead && markRead.mutate(n.id)}
              >
                <div className="flex items-center gap-2 w-full">
                  {!n.isRead && <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />}
                  <span className="text-xs font-medium">{n.title}</span>
                </div>
                <span className="text-[10px] text-muted-foreground pl-3.5">{n.message}</span>
                <span className="text-[9px] text-muted-foreground/60 pl-3.5">
                  {new Date(n.createdAt).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                </span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Separator orientation="vertical" className="h-5 mx-1 hidden sm:block" />

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" className="h-8 gap-1.5 px-2 text-muted-foreground hover:text-foreground" />}>
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-primary text-xs font-semibold">
              A
            </div>
            <span className="text-sm font-medium hidden sm:block">Admin</span>
            <ChevronDown size={12} className="hidden sm:block" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col gap-0.5">
                <p className="text-sm font-medium">Admin User</p>
                <p className="text-xs text-muted-foreground">admin@liquorerp.com</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 text-sm cursor-pointer">
              <User size={14} /> Profile
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2 text-sm cursor-pointer">
              <Settings size={14} /> Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="gap-2 text-sm text-destructive cursor-pointer focus:text-destructive"
              onClick={handleLogout}
            >
              <LogOut size={14} /> Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
