import { z } from "zod";

export const poItemSchema = z.object({
  variantId: z.string().min(1, "Product variant required"),
  orderedQty: z.coerce.number().min(1, "Quantity must be at least 1"),
  unitCost: z.coerce.number().min(0, "Cost must be positive"),
});

export const purchaseOrderSchema = z.object({
  supplierId: z.string().min(1, "Supplier is required"),
  expectedDate: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(poItemSchema).min(1, "At least one item required"),
});

export type POFormValues = z.infer<typeof purchaseOrderSchema>;
