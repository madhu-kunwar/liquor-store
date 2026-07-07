import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { MovementType } from "@/types";

const KEYS = {
  movements: (q?: Record<string, unknown>) => ["inventory", "movements", q] as const,
  summary:   () => ["inventory", "summary"] as const,
  ledger:    () => ["inventory", "ledger"] as const,
};

export function useStockMovements(query?: Record<string, unknown>, enabled = true) {
  return useQuery({
    queryKey: KEYS.movements(query),
    queryFn:  () => api.get("/inventory/movements", { params: query }),
    enabled,
  });
}

export function useInventorySummary() {
  return useQuery({ queryKey: KEYS.summary(), queryFn: () => api.get("/inventory/summary") });
}

export function useProductLedger() {
  return useQuery({ queryKey: KEYS.ledger(), queryFn: () => api.get("/inventory/ledger") });
}

export function useAdjustStock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { variantId: string; quantity: number; reason: string; type?: MovementType; date?: string }) =>
      api.post("/inventory/adjust", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventory"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      toast.success("Stock adjusted successfully");
    },
    onError: (e: any) => toast.error(e?.message || "Failed to adjust stock"),
  });
}

export function useStockIn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      variantId: string;
      quantity: number;
      supplierId?: string;
      invoiceNumber?: string;
      purchasePrice?: number;
      notes?: string;
      date?: string;
    }) => api.post("/inventory/stock-in", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventory"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      toast.success("Stock added successfully");
    },
    onError: (e: any) => toast.error(e?.message || "Failed to add stock"),
  });
}
