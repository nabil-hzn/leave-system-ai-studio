import type { LeaveRequest } from "../types";

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
};

export default function MyRequestsView({
  leaves,
  onOpenDetail,
}: {
  leaves: LeaveRequest[];
  onOpenDetail: (leave: LeaveRequest) => void;
}) {
  const sorted = leaves.slice().sort((a, b) => (b.date + b.shift).localeCompare(a.date + a.shift));

  return (
    <div className="my-requests-page">
      <h2 className="page-title">My Request</h2>
      {sorted.length === 0 && <div className="my-requests-empty">You haven't submitted any leave requests yet.</div>}
      <div className="request-list">
        {sorted.map((l) => (
          <button key={l.id} type="button" className="request-row" onClick={() => onOpenDetail(l)}>
            <span className={`legend-dot legend-${l.status}`} />
            <span className="request-row-date">{l.date}</span>
            <span className="request-row-shift capitalize">{l.shift}</span>
            <span className="request-row-reason">{l.reason}</span>
            <span className={`status-badge status-${l.status}`}>{STATUS_LABEL[l.status]}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
