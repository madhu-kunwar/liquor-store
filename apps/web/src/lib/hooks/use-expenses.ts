import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";

const KEYS = {
  all:     ["expenses"] as const,
  list:    (q?: Record<string, unknown>) => [...KEYS.all, "list", q] as const,
  summary: (q?: Record<string, unknown>) => [...KEYS.all, "summary", q] as const,
};

export function useExpenses(params?: Record<string, unknown>) {
  return useQuery({ queryKey: KEYS.list(params), queryFn: () => api.get("/expenses", { params }) });
}

export function useExpenseSummary(dateFrom?: string, dateTo?: string) {
  return useQuery({
    queryKey: KEYS.summary({ dateFrom, dateTo }),
    queryFn: () => api.get("/expenses/summary", { params: { dateFrom, dateTo } }),
  });
}

export function useCreateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { category: string; amount: number; description?: string; date: string }) =>
      api.post("/expenses", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
      toast.success("Expense recorded");
    },
    onError: (e: any) => toast.error(e?.message || "Failed to record expense"),
  });
}

export function useDeleteExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/expenses/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
      toast.success("Expense deleted");
    },
    onError: (e: any) => toast.error(e?.message || "Failed to delete expense"),
  });
}
