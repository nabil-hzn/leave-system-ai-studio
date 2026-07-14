import { useState } from "react";
import { useDeleteLeave, useUpdateLeaveStatus } from "../api";
import type { ActorMode } from "../state";
import type { ApprovalConflictError, LeaveRequest } from "../types";

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
  const [remark, setRemark] = useState("");

  const conflictBody = (updateStatus.error as (Error & { body?: ApprovalConflictError }) | null)?.body;

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

        <div className="modal-actions">
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
