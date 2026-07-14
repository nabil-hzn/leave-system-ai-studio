import { useState } from "react";
import { useDeleteLeave, useUpdateLeaveStatus, useUpdateLeaveDate } from "../api";
import { useAppStore, type ActorMode } from "../state";
import { SHIFTS, type ApprovalConflictError, type LeaveRequest, type Shift } from "../types";

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
};

export default function LeaveDetailModal({
  leave,
  mode,
  actingUserId,
  onClose,
}: {
  leave: LeaveRequest;
  mode: ActorMode;
  actingUserId: number | null;
  onClose: () => void;
}) {
  const updateStatus = useUpdateLeaveStatus();
  const deleteLeave = useDeleteLeave();
  const updateLeaveDate = useUpdateLeaveDate();
  const { currentUser } = useAppStore();
  const [remark, setRemark] = useState("");
  const [targetDate, setTargetDate] = useState(leave.date);
  const [targetShift, setTargetShift] = useState<Shift>(leave.shift);

  const conflictBody = (updateStatus.error as (Error & { body?: ApprovalConflictError }) | null)?.body;

  const isApproverOrAdmin = mode === "approver" || currentUser?.role === "admin" || currentUser?.role === "approver";
  const canModerate = mode === "approver" && leave.status === "pending";
  const canWithdraw = mode === "requester" && leave.status === "pending" && leave.userId === actingUserId;

  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Leave request</h2>
        <dl className="detail-grid">
          <dt>Requester</dt>
          <dd>{leave.userName}</dd>
          <dt>Date</dt>
          <dd>{leave.date}</dd>
          <dt>Shift</dt>
          <dd className="capitalize">{leave.shift}</dd>
          <dt>Status</dt>
          <dd>
            <span className={`status-badge status-${leave.status}`}>{STATUS_LABEL[leave.status]}</span>
          </dd>
          {leave.reason && (
            <>
              <dt>Reason</dt>
              <dd>{leave.reason}</dd>
            </>
          )}
          {leave.remark && (
            <>
              <dt>Remark</dt>
              <dd>{leave.remark}</dd>
            </>
          )}
        </dl>

        {conflictBody && (
          <div className="form-error">
            Cannot approve — {conflictBody.conflict.userName} already has an approved leave for this shift on this
            date.
          </div>
        )}
        {deleteLeave.isError && <div className="form-error">{(deleteLeave.error as Error).message}</div>}

        {canModerate && (
          <label>
            Remark (optional)
            <textarea value={remark} onChange={(e) => setRemark(e.target.value)} rows={2} />
          </label>
        )}

        {isApproverOrAdmin && (
          <div style={{ marginTop: "20px", paddingTop: "16px", borderTop: "1px dashed var(--cal-border)" }}>
            <h3 style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--cal-ink)", marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
              🔄 Reschedule Request
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
              <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "0.82rem", fontWeight: 500, color: "var(--cal-ink-muted)" }}>
                Date
                <input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  style={{ width: "100%", padding: "6px 10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--cal-border)", background: "var(--field-bg)", color: "var(--cal-ink)" }}
                />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "0.82rem", fontWeight: 500, color: "var(--cal-ink-muted)" }}>
                Shift
                <select
                  value={targetShift}
                  onChange={(e) => setTargetShift(e.target.value as Shift)}
                  style={{ width: "100%", padding: "6px 10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--cal-border)", background: "var(--field-bg)", color: "var(--cal-ink)" }}
                >
                  {SHIFTS.map((s) => (
                    <option key={s.key} value={s.key}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            
            {updateLeaveDate.isError && (
              <div className="form-error" style={{ marginBottom: "12px" }}>
                {updateLeaveDate.error.message}
              </div>
            )}
            {updateLeaveDate.isSuccess && (
              <div style={{ color: "var(--success-color)", fontSize: "0.85rem", marginBottom: "12px" }}>
                ✓ Successfully rescheduled!
              </div>
            )}

            <button
              type="button"
              className="btn-primary"
              style={{ width: "100%", padding: "8px" }}
              disabled={updateLeaveDate.isPending || (targetDate === leave.date && targetShift === leave.shift)}
              onClick={() => {
                updateLeaveDate.mutate(
                  { id: leave.id, date: targetDate, shift: targetShift },
                  {
                    onSuccess: () => {
                      setTimeout(() => {
                        onClose();
                      }, 1000);
                    }
                  }
                );
              }}
            >
              {updateLeaveDate.isPending ? "Rescheduling…" : "Reschedule Now"}
            </button>
          </div>
        )}

        <div className="modal-actions" style={{ marginTop: isApproverOrAdmin ? "16px" : "20px" }}>
          {canModerate && (
            <>
              <button
                type="button"
                className="btn-danger"
                disabled={updateStatus.isPending}
                onClick={() =>
                  updateStatus.mutate(
                    { id: leave.id, status: "rejected", remark: remark.trim() || null },
                    { onSuccess: onClose }
                  )
                }
              >
                Reject
              </button>
              <button
                type="button"
                className="btn-success"
                disabled={updateStatus.isPending}
                onClick={() =>
                  updateStatus.mutate(
                    { id: leave.id, status: "approved", remark: remark.trim() || null },
                    { onSuccess: onClose }
                  )
                }
              >
                Approve
              </button>
            </>
          )}
          {canWithdraw && (
            <button
              type="button"
              className="btn-danger"
              disabled={deleteLeave.isPending}
              onClick={() => deleteLeave.mutate(leave.id, { onSuccess: onClose })}
            >
              Withdraw
            </button>
          )}
          <button type="button" className="btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
