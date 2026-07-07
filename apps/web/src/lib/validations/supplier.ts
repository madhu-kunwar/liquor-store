import { z } from "zod";

export const supplierSchema = z.object({
  name: z.string().min(1, "Name is required"),
  contactPerson: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  gstNumber: z.string().optional(),
  avgLeadDays: z.coerce.number().min(1).max(365).default(3),
  notes: z.string().optional(),
});

export type SupplierFormValues = z.infer<typeof supplierSchema>;
