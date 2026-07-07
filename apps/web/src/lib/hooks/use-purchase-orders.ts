import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import type { POFormValues } from "@/lib/validations/purchase-order";

const KEYS = {
  all: ["purchase-orders"] as const,
  list: (status?: string) => [...KEYS.all, "list", status] as const,
  one: (id: string) => [...KEYS.all, id] as const,
};

export function usePurchaseOrders(status?: string) {
  return useQuery({ queryKey: KEYS.list(status), queryFn: () => api.get("/purchase-orders", { params: { status } }) });
}

export function usePurchaseOrder(id: string) {
  return useQuery({ queryKey: KEYS.one(id), queryFn: () => api.get(`/purchase-orders/${id}`), enabled: !!id });
}

export function useCreatePurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: POFormValues) => api.post("/purchase-orders", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEYS.all }); toast.success("Purchase order created"); },
    onError: (e: any) => toast.error(e?.message || "Failed to create PO"),
  });
}

export function useReceiveGoods(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (items: { poItemId: string; receivedQty: number }[]) =>
      api.post(`/purchase-orders/${id}/receive`, { items }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEYS.all }); toast.success("Goods received and stock updated"); },
    onError: (e: any) => toast.error(e?.message || "Failed to receive goods"),
  });
}

export function useCancelPO(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post(`/purchase-orders/${id}/cancel`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEYS.all }); toast.success("PO cancelled"); },
    onError: (e: any) => toast.error(e?.message || "Failed to cancel PO"),
  });
}

export function useCancelPurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post(`/purchase-orders/${id}/cancel`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEYS.all }); toast.success("PO cancelled"); },
    onError: (e: any) => toast.error(e?.message || "Failed to cancel PO"),
  });
}

export function useMarkAsSent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post(`/purchase-orders/${id}/send`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEYS.all }); toast.success("PO marked as sent"); },
    onError: (e: any) => toast.error(e?.message || "Failed to update PO"),
  });
}
