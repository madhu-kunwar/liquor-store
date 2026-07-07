import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import type { SupplierFormValues } from "@/lib/validations/supplier";
import type { TableParams } from "@/components/shared/data-table";

const KEYS = {
  all:  ["suppliers"] as const,
  list: (q?: Record<string, unknown>) => [...KEYS.all, "list", q] as const,
  one:  (id: string) => [...KEYS.all, id] as const,
};

function cleanParams(p: Partial<TableParams> & { isActive?: boolean }): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (p.page)                out.page      = p.page;
  if (p.limit)               out.limit     = p.limit;
  if (p.search)              out.search    = p.search;
  if (p.sortBy)              { out.sortBy = p.sortBy; out.sortOrder = p.sortOrder ?? "asc"; }
  if (p.isActive !== undefined) out.isActive = p.isActive;
  return out;
}

export function useSuppliers(params?: Partial<TableParams> & { isActive?: boolean }) {
  const q = cleanParams(params ?? {});
  return useQuery({
    queryKey: KEYS.list(q),
    queryFn: () => api.get("/suppliers", { params: q }),
  });
}

export function useSupplier(id: string) {
  return useQuery({
    queryKey: KEYS.one(id),
    queryFn: () => api.get(`/suppliers/${id}`),
    enabled: !!id,
  });
}

export function useCreateSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: SupplierFormValues) => api.post("/suppliers", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEYS.all }); toast.success("Supplier created"); },
    onError: (e: any) => toast.error(e?.message || "Failed to create supplier"),
  });
}

export function useUpdateSupplier(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<SupplierFormValues & { isActive: boolean }>) => api.patch(`/suppliers/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEYS.all }); toast.success("Supplier updated"); },
    onError: (e: any) => toast.error(e?.message || "Failed to update supplier"),
  });
}
