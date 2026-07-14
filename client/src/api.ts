import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { LeaveStatus, Shift, User, LeaveRequest } from "./types";

export function useUsers() {
  return useQuery<User[]>({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await fetch("/api/users");
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to fetch users");
      }
      return res.json();
    },
  });
}

export function useLeaves(startISO: string, endISO: string) {
  return useQuery<LeaveRequest[]>({
    queryKey: ["leaves", startISO, endISO],
    queryFn: async () => {
      const res = await fetch(`/api/leaves?start=${startISO}&end=${endISO}`);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to fetch leave requests");
      }
      return res.json();
    },
  });
}

export function useCreateLeave() {
  const qc = useQueryClient();
  return useMutation<
    LeaveRequest,
    Error,
    { userId: number; date: string; shift: Shift; reason: string }
  >({
    mutationFn: async (input) => {
      const res = await fetch("/api/leaves", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create leave request");
      }
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["leaves"] }),
  });
}

export function useUpdateLeaveStatus() {
  const qc = useQueryClient();
  return useMutation<
    LeaveRequest,
    Error,
    { id: number; status: LeaveStatus; remark?: string | null }
  >({
    mutationFn: async ({ id, status, remark }) => {
      const res = await fetch(`/api/leaves/${id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status, remark }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update leave status");
      }
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["leaves"] }),
  });
}

export function useUpdateLeaveDate() {
  const qc = useQueryClient();
  return useMutation<
    LeaveRequest,
    Error,
    { id: number; date: string; shift?: Shift }
  >({
    mutationFn: async ({ id, date, shift }) => {
      const res = await fetch(`/api/leaves/${id}/date`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ date, shift }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to reschedule leave request");
      }
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["leaves"] }),
  });
}

export function useDeleteLeave() {
  const qc = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: async (id) => {
      const res = await fetch(`/api/leaves/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to withdraw leave request");
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["leaves"] }),
  });
}

