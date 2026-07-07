import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";

const KEYS = {
  all: ["sales"] as const,
  list: (q?: Record<string, unknown>) => [...KEYS.all, "list", q] as const,
  summary: () => [...KEYS.all, "summary"] as const,
};

export function useSales(query?: Record<string, unknown>) {
  return useQuery({ queryKey: KEYS.list(query), queryFn: () => api.get("/sales", { params: query }) });
}

export function useDailySummary() {
  return useQuery({ queryKey: KEYS.summary(), queryFn: () => api.get("/sales/daily-summary") });
}

export function useCreateSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      items: { variantId: string; quantity: number; unitPrice: number }[];
      paymentType: string;
      customerId?: string;
      supplierId?: string;
      discountAmount?: number;
      discountReason?: string;
      notes?: string;
    }) =>
      api.post("/sales", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
      qc.invalidateQueries({ queryKey: ["inventory"] });
      toast.success("Sale recorded successfully");
    },
    onError: (e: any) => toast.error(e?.message || "Failed to record sale"),
  });
}

export function useVoidSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      api.post(`/sales/${id}/void`, { reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
      qc.invalidateQueries({ queryKey: ["inventory"] });
      toast.success("Sale voided and stock reversed");
    },
    onError: (e: any) => toast.error(e?.message || "Failed to void sale"),
  });
}
