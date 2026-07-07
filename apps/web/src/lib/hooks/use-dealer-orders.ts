import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";

const KEYS = {
  all:  ["dealer-orders"] as const,
  list: (q?: Record<string, unknown>) => [...KEYS.all, "list", q] as const,
  one:  (id: string)                  => [...KEYS.all, id] as const,
};

export function useDealerOrders(query?: Record<string, unknown>) {
  return useQuery({ queryKey: KEYS.list(query), queryFn: () => api.get("/dealer-orders", { params: query }) });
}

export function useDealerOrder(id: string) {
  return useQuery({ queryKey: KEYS.one(id), queryFn: () => api.get(`/dealer-orders/${id}`), enabled: !!id });
}

export function useCreateDealerOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: unknown) => api.post("/dealer-orders", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEYS.all }); toast.success("Dealer order created"); },
    onError: (e: any) => toast.error(e?.message || "Failed to create order"),
  });
}

export function useUpdateDealerOrder(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: unknown) => api.patch(`/dealer-orders/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEYS.all }); toast.success("Order updated"); },
    onError: (e: any) => toast.error(e?.message || "Failed to update order"),
  });
}

export function useConfirmDealerOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post(`/dealer-orders/${id}/confirm`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEYS.all }); toast.success("Order confirmed"); },
    onError: (e: any) => toast.error(e?.message || "Failed to confirm order"),
  });
}

export function useDispatchDealerOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post(`/dealer-orders/${id}/dispatch`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEYS.all }); qc.invalidateQueries({ queryKey: ["inventory"] }); toast.success("Order dispatched and stock deducted"); },
    onError: (e: any) => toast.error(e?.message || "Failed to dispatch order"),
  });
}

export function useDeliverDealerOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post(`/dealer-orders/${id}/deliver`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEYS.all }); toast.success("Order marked as delivered"); },
    onError: (e: any) => toast.error(e?.message || "Failed to update order"),
  });
}

export function useRecordDealerPayment(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { amount: number; notes?: string }) => api.post(`/dealer-orders/${id}/payment`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEYS.all }); toast.success("Payment recorded"); },
    onError: (e: any) => toast.error(e?.message || "Failed to record payment"),
  });
}

export function useCancelDealerOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post(`/dealer-orders/${id}/cancel`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEYS.all }); qc.invalidateQueries({ queryKey: ["inventory"] }); toast.success("Order cancelled"); },
    onError: (e: any) => toast.error(e?.message || "Failed to cancel order"),
  });
}
