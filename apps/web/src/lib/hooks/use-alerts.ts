import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useAlerts() {
  return useQuery({
    queryKey: ["alerts", "low-stock"],
    queryFn: () => api.get("/alerts/low-stock"),
    refetchInterval: 60_000,
  });
}
