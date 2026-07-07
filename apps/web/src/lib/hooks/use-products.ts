import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import type { ProductFormValues } from "@/lib/validations/product";
import type { TableParams } from "@/components/shared/data-table";

const KEYS = {
  all:      ["products"] as const,
  list:     (q?: Record<string, unknown>) => [...KEYS.all, "list", q] as const,
  one:      (id: string) => [...KEYS.all, id] as const,
  lowStock: () => [...KEYS.all, "low-stock"] as const,
};

function cleanParams(p: Partial<TableParams> & Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (p.page)       out.page      = p.page;
  if (p.limit)      out.limit     = p.limit;
  if (p.search)     out.search    = p.search;
  if (p.sortBy)     { out.sortBy = p.sortBy; out.sortOrder = p.sortOrder ?? "asc"; }
  if (p.categoryId) out.categoryId = p.categoryId;
  if (p.supplierId) out.supplierId = p.supplierId;
  if (p.isActive !== undefined) out.isActive = p.isActive;
  return out;
}

export function useProducts(query?: Partial<TableParams> & Record<string, unknown>) {
  const q = cleanParams(query ?? {});
  return useQuery({ queryKey: KEYS.list(q), queryFn: () => api.get("/products", { params: q }) });
}

export function useProduct(id: string) {
  return useQuery({ queryKey: KEYS.one(id), queryFn: () => api.get(`/products/${id}`), enabled: !!id });
}

export function useLowStockProducts() {
  return useQuery({ queryKey: KEYS.lowStock(), queryFn: () => api.get("/products/low-stock") });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ProductFormValues) => api.post("/products", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEYS.all }); toast.success("Product created"); },
    onError: (e: any) => toast.error(e?.message || "Failed to create product"),
  });
}

export function useUpdateProduct(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<ProductFormValues>) => api.patch(`/products/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEYS.all }); toast.success("Product updated"); },
    onError: (e: any) => toast.error(e?.message || "Failed to update product"),
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/products/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEYS.all }); toast.success("Product deleted"); },
    onError: (e: any) => toast.error(e?.message || "Failed to delete product"),
  });
}

export function useUpdateVariant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ variantId, ...data }: { variantId: string; costPrice?: number; sellingPrice?: number; reorderPoint?: number; barcode?: string; isActive?: boolean; taxRate?: number; exciseDuty?: number }) =>
      api.patch(`/products/variants/${variantId}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEYS.all }); toast.success("Variant updated"); },
    onError: (e: any) => toast.error(e?.message || "Failed to update variant"),
  });
}

export function useProductByBarcode(barcode: string) {
  return useQuery({
    queryKey: [...KEYS.all, "barcode", barcode],
    queryFn: () => api.get(`/products/barcode/${encodeURIComponent(barcode)}`),
    enabled: !!barcode,
    retry: false,
  });
}

// useCategories moved to use-categories.ts
