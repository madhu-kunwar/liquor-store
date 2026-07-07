import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";

const KEYS = {
  all:  ["customers"] as const,
  list: (q?: Record<string, unknown>) => [...KEYS.all, "list", q] as const,
  one:  (id: string) => [...KEYS.all, "detail", id] as const,
};

export function useCustomers(params?: Record<string, unknown>) {
  return useQuery({ queryKey: KEYS.list(params), queryFn: () => api.get("/customers", { params }) });
}

export function useCustomer(id: string) {
  return useQuery({ queryKey: KEYS.one(id), queryFn: () => api.get(`/customers/${id}`), enabled: !!id });
}

export function useCreateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; phone?: string; email?: string; address?: string }) =>
      api.post("/customers", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
      toast.success("Customer created");
    },
    onError: (e: any) => toast.error(e?.message || "Failed to create customer"),
  });
}

export function useUpdateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; name?: string; phone?: string; email?: string; address?: string; isActive?: boolean }) =>
      api.patch(`/customers/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
      toast.success("Customer updated");
    },
    onError: (e: any) => toast.error(e?.message || "Failed to update customer"),
  });
}

export function useDeleteCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/customers/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
      toast.success("Customer deactivated");
    },
    onError: (e: any) => toast.error(e?.message || "Failed to deactivate customer"),
  });
}
