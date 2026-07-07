"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Loader2, UserPlus } from "lucide-react";
import Link from "next/link";
import { useCreateCustomer } from "@/lib/hooks/use-customers";

type FormValues = {
  name: string;
  phone: string;
  email: string;
  address: string;
};

export default function NewCustomerPage() {
  const router = useRouter();
  const { mutateAsync: create, isPending } = useCreateCustomer();

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    defaultValues: { name: "", phone: "", email: "", address: "" },
  });

  const onSubmit = async (data: FormValues) => {
    await create({
      name: data.name,
      phone: data.phone || undefined,
      email: data.email || undefined,
      address: data.address || undefined,
    });
    router.push("/customers");
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
        <Button render={<Link href="/customers" />} nativeButton={false} variant="ghost" size="icon" className="h-8 w-8">
          <ArrowLeft size={16} />
        </Button>
        <div>
          <h1 className="text-xl font-bold tracking-tight">New Customer</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Add a customer to track purchase history</p>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2"><UserPlus size={14} /> Customer Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Full Name *</Label>
                <Input {...register("name", { required: true })} placeholder="e.g. Ram Bahadur" className="text-sm" />
                {errors.name && <p className="text-xs text-destructive">Name is required</p>}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Phone</Label>
                <Input {...register("phone")} placeholder="e.g. 9841XXXXXX" className="text-sm" type="tel" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Email</Label>
                <Input {...register("email")} placeholder="e.g. ram@example.com" className="text-sm" type="email" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Address</Label>
                <Textarea {...register("address")} placeholder="Street, City…" className="text-sm resize-none h-20" />
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <Button type="button" variant="outline" onClick={() => router.push("/customers")}>Cancel</Button>
                <Button type="submit" disabled={isPending} className="gap-2">
                  {isPending ? <><Loader2 size={14} className="animate-spin" /> Saving...</> : "Save Customer"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
