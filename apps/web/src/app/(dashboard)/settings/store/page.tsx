"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Store, Receipt, Percent } from "lucide-react";
import { useSettings, useUpdateSettings } from "@/lib/hooks/use-settings";

export default function StoreSettingsPage() {
  const { data: rawSettings, isLoading } = useSettings();
  const updateSettings = useUpdateSettings();

  const settings = rawSettings as Record<string, string> | undefined;

  const [form, setForm] = useState({
    store_name:     "",
    store_address:  "",
    store_phone:    "",
    store_email:    "",
    pan_number:     "",
    vat_number:     "",
    vat_rate:       "13",
    currency:       "रू",
    receipt_footer: "",
  });

  useEffect(() => {
    if (settings) setForm(f => ({ ...f, ...settings }));
  }, [settings]);

  const set = (key: string, value: string) => setForm(f => ({ ...f, [key]: value }));

  const handleSave = () => updateSettings.mutate(form);

  if (isLoading) return <div className="text-sm text-muted-foreground p-4">Loading…</div>;

  return (
    <div className="max-w-2xl space-y-6">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-xl font-bold tracking-tight">Store Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Business info used on receipts and reports</p>
      </motion.div>

      {/* Store info */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2"><Store size={14} /> Business Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Store Name *</Label>
                <Input value={form.store_name} onChange={e => set("store_name", e.target.value)} className="text-sm" placeholder="My Liquor Store" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Phone</Label>
                <Input value={form.store_phone} onChange={e => set("store_phone", e.target.value)} className="text-sm" placeholder="+977 9841XXXXXX" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Email</Label>
                <Input value={form.store_email} onChange={e => set("store_email", e.target.value)} className="text-sm" type="email" placeholder="store@example.com" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">PAN Number</Label>
                <Input value={form.pan_number} onChange={e => set("pan_number", e.target.value)} className="text-sm font-mono" placeholder="123456789" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Address</Label>
              <Input value={form.store_address} onChange={e => set("store_address", e.target.value)} className="text-sm" placeholder="Street, City, District" />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Tax settings */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2"><Percent size={14} /> Tax & Currency</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">VAT Rate (%)</Label>
                <Input value={form.vat_rate} onChange={e => set("vat_rate", e.target.value)} className="text-sm" type="number" min={0} max={100} step="0.01" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">VAT Registration No.</Label>
                <Input value={form.vat_number} onChange={e => set("vat_number", e.target.value)} className="text-sm font-mono" placeholder="VAT-XXXXXXX" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Currency Symbol</Label>
                <Input value={form.currency} onChange={e => set("currency", e.target.value)} className="text-sm" placeholder="रू" />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Receipt */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2"><Receipt size={14} /> Receipt</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              <Label className="text-xs">Footer Message</Label>
              <Input value={form.receipt_footer} onChange={e => set("receipt_footer", e.target.value)} className="text-sm" placeholder="Thank you for your purchase!" />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <div className="flex justify-end pb-8">
        <Button onClick={handleSave} disabled={updateSettings.isPending} className="gap-2 min-w-32">
          {updateSettings.isPending ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : "Save Settings"}
        </Button>
      </div>
    </div>
  );
}
