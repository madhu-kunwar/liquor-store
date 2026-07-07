import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

const KEYS = {
  all:   ["notifications"] as const,
  count: ["notifications", "count"] as const,
};

export function useNotifications(unreadOnly = false) {
  return useQuery({
    queryKey: [...KEYS.all, { unreadOnly }],
    queryFn: () => api.get("/notifications", { params: unreadOnly ? { unread: "true" } : {} }),
    refetchInterval: 30_000,
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: KEYS.count,
    queryFn: () => api.get("/notifications/unread-count"),
    refetchInterval: 30_000,
  });
}

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.patch(`/notifications/${id}/read`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.patch("/notifications/read-all", {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  });
}
