import { z } from "zod";

export const variantSchema = z.object({
  unit: z.enum(["CASE", "PACK", "BOTTLE", "CAN", "KEG"]),
  size: z.string().optional(),
  barcode: z.string().optional(),
  costPrice: z.coerce.number().min(0, "Cost must be positive"),
  sellingPrice: z.coerce.number().min(0, "Selling price must be positive"),
  reorderPoint: z.coerce.number().min(0).default(10),
  unitsPerParent: z.coerce.number().optional(),
});

export const productSchema = z.object({
  name: z.string().min(1, "Name is required"),
  brand: z.string().min(1, "Brand is required"),
  sku: z.string().min(1, "SKU is required"),
  categoryId: z.string().min(1, "Category is required"),
  supplierId: z.string().optional(),
  description: z.string().optional(),
  imageUrl: z.string().url().optional().or(z.literal("")),
  variants: z.array(variantSchema).min(1, "At least one variant required"),
});

export type ProductFormValues = z.infer<typeof productSchema>;
