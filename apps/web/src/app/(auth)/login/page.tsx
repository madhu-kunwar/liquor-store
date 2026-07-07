"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Wine, Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post("/auth/login", { email, password }) as any;
      // Set cookie client-side so Next.js middleware can read it across ports
      document.cookie = `access_token=${res.accessToken}; path=/; max-age=604800; SameSite=Lax`;
      toast.success(`Welcome back, ${res.user?.name ?? "User"}!`);
      router.push("/");
      router.refresh();
    } catch (err: any) {
      toast.error(err?.message || "Invalid credentials. Check email and password.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
        className="w-full max-w-sm px-4"
      >
        <div className="flex flex-col items-center mb-8">
          <motion.div
            initial={{ scale: 0, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 260, damping: 20 }}
            className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground mb-4 shadow-xl shadow-primary/25"
          >
            <Wine size={26} />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-center">
            <h1 className="text-2xl font-bold tracking-tight">LiquorERP</h1>
            <p className="text-sm text-muted-foreground mt-1">Inventory & Store Management</p>
          </motion.div>
        </div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <Card className="shadow-xl shadow-black/10">
            <CardHeader className="pb-4 text-center space-y-1">
              <CardTitle className="text-base font-semibold">Sign in to your account</CardTitle>
              <CardDescription className="text-xs">Enter your credentials below</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4 rounded-lg border border-dashed border-border bg-muted/40 px-3 py-2.5">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Demo credentials</p>
                <div className="flex items-center justify-between gap-2">
                  <div className="space-y-0.5 min-w-0">
                    <p className="text-xs font-mono truncate">admin@liquorerp.com</p>
                    <p className="text-xs font-mono text-muted-foreground">admin1234</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-[11px] shrink-0"
                    onClick={() => { setEmail("admin@liquorerp.com"); setPassword("admin1234"); }}
                  >
                    Use
                  </Button>
                </div>
              </div>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-medium">Email address</Label>
                  <Input id="email" type="email" className="text-sm h-9" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-xs font-medium">Password</Label>
                  <div className="relative">
                    <Input id="password" type={showPw ? "text" : "password"} className="text-sm h-9 pr-9" value={password} onChange={e => setPassword(e.target.value)} required />
                    <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                      {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
                <Button type="submit" className="w-full h-9 text-sm gap-2 mt-1" disabled={loading}>
                  {loading ? <><Loader2 size={14} className="animate-spin" /> Signing in...</> : "Sign in"}
                </Button>
              </form>
              <p className="mt-3 text-[11px] text-muted-foreground text-center">Contact your admin for credentials</p>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
}
