import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useInventoryValuation() {
  return useQuery({ queryKey: ["reports", "valuation"], queryFn: () => api.get("/reports/inventory-valuation") });
}

export function useLowStockReport() {
  return useQuery({ queryKey: ["reports", "low-stock"], queryFn: () => api.get("/reports/low-stock") });
}

export function useDeadStockReport(days = 60) {
  return useQuery({ queryKey: ["reports", "dead-stock", days], queryFn: () => api.get(`/reports/dead-stock?days=${days}`) });
}

export function useSalesSummary(dateFrom: string, dateTo: string) {
  return useQuery({
    queryKey: ["reports", "sales-summary", dateFrom, dateTo],
    queryFn: () => api.get(`/reports/sales-summary?dateFrom=${dateFrom}&dateTo=${dateTo}`),
    enabled: !!(dateFrom && dateTo),
  });
}

export function useSalesAudit(dateFrom: string, dateTo: string) {
  return useQuery({
    queryKey: ["reports", "sales-audit", dateFrom, dateTo],
    queryFn: () => api.get(`/reports/sales-audit?dateFrom=${dateFrom}&dateTo=${dateTo}`),
    enabled: !!(dateFrom && dateTo),
  });
}

export function useTopSellers(dateFrom?: string, dateTo?: string, limit = 10) {
  return useQuery({
    queryKey: ["reports", "top-sellers", dateFrom, dateTo, limit],
    queryFn: () => api.get("/reports/top-sellers", { params: { dateFrom, dateTo, limit } }),
  });
}

export function useStockMovementsReport(dateFrom?: string, dateTo?: string) {
  return useQuery({
    queryKey: ["reports", "stock-movements", dateFrom, dateTo],
    queryFn: () => api.get("/reports/stock-movements", { params: { dateFrom, dateTo } }),
  });
}
