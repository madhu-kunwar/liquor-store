import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";

const KEYS = { all: ["users"] as const };

export function useUsers() {
  return useQuery({ queryKey: KEYS.all, queryFn: () => api.get("/users") });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; email: string; password: string; role: string }) =>
      api.post("/users", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEYS.all }); toast.success("User created"); },
    onError: (e: any) => toast.error(e?.message || "Failed to create user"),
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { role?: string; isActive?: boolean; name?: string } }) =>
      api.patch(`/users/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEYS.all }); toast.success("User updated"); },
    onError: (e: any) => toast.error(e?.message || "Failed to update user"),
  });
}
