import type { LeaveRequest, LeaveStatus, Shift, User } from "./types";
import { addDays, toISODate } from "./utils/date";

/**
 * In-memory stand-in for the real API/database. Same shapes and same
 * approval-conflict rule as the server in server/src/routes/leaves.ts,
 * so swapping api.ts back to real fetch calls later is a drop-in change.
 */

export const MOCK_USERS: User[] = [
  { id: 1, name: "Alice Tan", role: "requester" },
  { id: 2, name: "Bob Rahman", role: "requester" },
  { id: 3, name: "Carol Lim", role: "requester" },
  { id: 4, name: "David Ong", role: "requester" },
];

let nextId = 1;
const today = new Date();

function seedLeave(
  userId: number,
  date: string,
  shift: Shift,
  status: LeaveStatus,
  reason: string,
  remark: string | null = null
): LeaveRequest {
  const user = MOCK_USERS.find((u) => u.id === userId)!;
  const now = new Date().toISOString();
  return {
    id: nextId++,
    userId,
    userName: user.name,
    date,
    shift,
    status,
    reason,
    remark,
    createdAt: now,
    updatedAt: now,
  };
}

export const MOCK_LEAVES: LeaveRequest[] = [
  seedLeave(1, toISODate(today), "morning", "approved", "Doctor appointment"),
  seedLeave(2, toISODate(today), "morning", "pending", "Family event"),
  seedLeave(3, toISODate(addDays(today, 1)), "afternoon", "pending", "Personal errand"),
  seedLeave(4, toISODate(addDays(today, 2)), "night", "approved", "Rest day"),
  seedLeave(1, toISODate(addDays(today, 3)), "afternoon", "rejected", "Overlaps with team meeting"),
  seedLeave(2, toISODate(addDays(today, 5)), "morning", "pending", "Travel"),
  seedLeave(3, toISODate(addDays(today, 5)), "morning", "pending", "Travel (backup)"),
  seedLeave(4, toISODate(addDays(today, -2)), "afternoon", "approved", "Medical"),
];

function conflictError(conflict: LeaveRequest): Error & { status: number; body: unknown } {
  const err = new Error("Another request for this date and shift is already approved") as Error & {
    status: number;
    body: unknown;
  };
  err.status = 409;
  err.body = { error: err.message, conflict };
  return err;
}

function duplicateError(existing: LeaveRequest): Error & { status: number; body: unknown } {
  const err = new Error("You already have a request for this shift on this date") as Error & {
    status: number;
    body: unknown;
  };
  err.status = 409;
  err.body = { error: err.message, conflict: existing };
  return err;
}

function notFoundError(): Error & { status: number } {
  const err = new Error("Not found") as Error & { status: number };
  err.status = 404;
  return err;
}

export function mockListUsers(): User[] {
  return MOCK_USERS;
}

export function mockListLeaves(startISO: string, endISO: string): LeaveRequest[] {
  return MOCK_LEAVES.filter((l) => l.date >= startISO && l.date <= endISO);
}

export function mockCreateLeave(input: { userId: number; date: string; shift: Shift; reason: string }): LeaveRequest {
  const user = MOCK_USERS.find((u) => u.id === input.userId);
  if (!user) throw new Error("Unknown userId");

  const duplicate = MOCK_LEAVES.find(
    (l) => l.userId === input.userId && l.date === input.date && l.shift === input.shift && l.status !== "rejected"
  );
  if (duplicate) throw duplicateError(duplicate);

  const conflict = MOCK_LEAVES.find(
    (l) => l.date === input.date && l.shift === input.shift && l.status === "approved"
  );
  if (conflict) throw conflictError(conflict);

  const now = new Date().toISOString();
  const leave: LeaveRequest = {
    id: nextId++,
    userId: input.userId,
    userName: user.name,
    date: input.date,
    shift: input.shift,
    status: "pending",
    reason: input.reason || null,
    remark: null,
    createdAt: now,
    updatedAt: now,
  };
  MOCK_LEAVES.push(leave);
  return leave;
}

export function mockUpdateStatus(id: number, status: LeaveStatus, remark?: string | null): LeaveRequest {
  const leave = MOCK_LEAVES.find((l) => l.id === id);
  if (!leave) throw notFoundError();

  if (status === "approved") {
    const conflict = MOCK_LEAVES.find(
      (l) => l.id !== id && l.date === leave.date && l.shift === leave.shift && l.status === "approved"
    );
    if (conflict) throw conflictError(conflict);
  }

  leave.status = status;
  leave.remark = remark ?? null;
  leave.updatedAt = new Date().toISOString();

  if (status === "approved") {
    for (const l of MOCK_LEAVES) {
      if (l.id !== id && l.date === leave.date && l.shift === leave.shift && l.status === "pending") {
        l.status = "rejected";
        l.updatedAt = new Date().toISOString();
      }
    }
  }

  return leave;
}

export function mockUpdateDate(id: number, date: string): LeaveRequest {
  const leave = MOCK_LEAVES.find((l) => l.id === id);
  if (!leave) throw notFoundError();
  if (leave.status === "approved") {
    const err = new Error("Approved requests cannot be rescheduled") as Error & { status: number };
    err.status = 400;
    throw err;
  }

  const duplicate = MOCK_LEAVES.find(
    (l) => l.id !== id && l.userId === leave.userId && l.date === date && l.shift === leave.shift && l.status !== "rejected"
  );
  if (duplicate) throw duplicateError(duplicate);

  leave.date = date;
  leave.updatedAt = new Date().toISOString();
  return leave;
}

export function mockDeleteLeave(id: number): void {
  const idx = MOCK_LEAVES.findIndex((l) => l.id === id);
  if (idx === -1) throw notFoundError();
  if (MOCK_LEAVES[idx].status !== "pending") {
    const err = new Error("Only pending requests can be withdrawn") as Error & { status: number };
    err.status = 400;
    throw err;
  }
  MOCK_LEAVES.splice(idx, 1);
}
