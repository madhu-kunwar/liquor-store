import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";

const KEYS = {
  all:  ["categories"] as const,
  list: () => [...KEYS.all, "list"] as const,
};

export function useCategories() {
  return useQuery({ queryKey: KEYS.list(), queryFn: () => api.get("/categories") });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; slug: string; color?: string }) =>
      api.post("/categories", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEYS.all }); toast.success("Category created"); },
    onError: (e: any) => toast.error(e?.message || "Failed to create category"),
  });
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<{ name: string; color: string; slug: string }> }) =>
      api.patch(`/categories/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEYS.all }); toast.success("Category updated"); },
    onError: (e: any) => toast.error(e?.message || "Failed to update category"),
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/categories/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEYS.all }); toast.success("Category deleted"); },
    onError: (e: any) => toast.error(e?.message || "Failed to delete category"),
  });
}
