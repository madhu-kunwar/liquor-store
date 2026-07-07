import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";

const KEY = ["settings"] as const;

export function useSettings() {
  return useQuery({ queryKey: KEY, queryFn: () => api.get("/settings") });
}

export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, string>) => api.patch("/settings", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success("Settings saved");
    },
    onError: (e: any) => toast.error(e?.message || "Failed to save settings"),
  });
}
