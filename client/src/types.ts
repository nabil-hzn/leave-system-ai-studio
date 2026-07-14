export type Shift = "morning" | "afternoon" | "night";
export type LeaveStatus = "pending" | "approved" | "rejected";

export interface User {
  id: number;
  name: string;
  role: string;
  email?: string;
  picture?: string;
}

export interface LeaveRequest {
  id: number;
  userId: number;
  userName: string;
  date: string; // YYYY-MM-DD
  shift: Shift;
  status: LeaveStatus;
  reason: string | null;
  remark: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApprovalConflictError {
  error: string;
  conflict: LeaveRequest;
}

export const SHIFTS: { key: Shift; label: string }[] = [
  { key: "morning", label: "Morning" },
  { key: "afternoon", label: "Afternoon" },
  { key: "night", label: "Night" },
];
