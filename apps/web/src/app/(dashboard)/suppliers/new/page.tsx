"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { supplierSchema, type SupplierFormValues } from "@/lib/validations/supplier";
import { useCreateSupplier } from "@/lib/hooks/use-suppliers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Loader2, Users2 } from "lucide-react";
import Link from "next/link";

export default function NewSupplierPage() {
  const router = useRouter();
  const { mutate: create, isPending } = useCreateSupplier();
  const { register, handleSubmit, formState: { errors } } = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierSchema),
    defaultValues: { avgLeadDays: 3 },
  });

  const onSubmit = (data: SupplierFormValues) => {
    create(data, { onSuccess: () => router.push("/suppliers") });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
        <Button render={<Link href="/suppliers" />} nativeButton={false} variant="ghost" size="icon" className="h-8 w-8"><ArrowLeft size={16} /></Button>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Add Supplier</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Register a new supplier / vendor</p>
        </div>
      </motion.div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card>
            <CardHeader className="pb-4"><CardTitle className="text-sm font-semibold flex items-center gap-2"><Users2 size={14} /> Supplier Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Company Name *</Label>
                  <Input {...register("name")} placeholder="e.g. Premium Beverages Ltd" className="text-sm" />
                  {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Contact Person</Label>
                  <Input {...register("contactPerson")} placeholder="e.g. Raj Kumar" className="text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Email</Label>
                  <Input {...register("email")} type="email" placeholder="contact@supplier.com" className="text-sm" />
                  {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Phone</Label>
                  <Input {...register("phone")} placeholder="+91-9876543210" className="text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">PAN/VAT No.</Label>
                  <Input {...register("gstNumber")} placeholder="302456789" className="text-sm font-mono" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Avg Lead Days</Label>
                  <Input type="number" {...register("avgLeadDays")} min={1} max={365} className="text-sm" />
                  {errors.avgLeadDays && <p className="text-xs text-destructive">{errors.avgLeadDays.message}</p>}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Address</Label>
                <Textarea {...register("address")} placeholder="Full address..." className="text-sm resize-none h-20" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Notes</Label>
                <Textarea {...register("notes")} placeholder="Any additional notes..." className="text-sm resize-none h-16" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <div className="flex gap-3 justify-end pb-8">
          <Button render={<Link href="/suppliers" />} nativeButton={false} variant="outline">Cancel</Button>
          <Button type="submit" disabled={isPending} className="gap-2">
            {isPending ? <><Loader2 size={14} className="animate-spin" /> Saving...</> : "Create Supplier"}
          </Button>
        </div>
      </form>
    </div>
  );
}
