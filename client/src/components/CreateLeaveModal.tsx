import { useState } from "react";
import { useCreateLeave } from "../api";
import { SHIFTS, type Shift, type User } from "../types";
import { toISODate } from "../utils/date";

export default function CreateLeaveModal({
  defaultDate,
  defaultShift,
  users,
  actingUserId,
  onClose,
}: {
  defaultDate?: string;
  defaultShift?: Shift;
  users: User[];
  actingUserId: number | null;
  onClose: () => void;
}) {
  const [userId, setUserId] = useState<number | null>(actingUserId);
  const [date, setDate] = useState(defaultDate ?? toISODate(new Date()));
  const [shift, setShift] = useState<Shift>(defaultShift ?? "morning");
  const [reason, setReason] = useState("");
  const createLeave = useCreateLeave();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    createLeave.mutate(
      { userId, date, shift, reason },
      { onSuccess: onClose }
    );
  };

  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>New leave request</h2>
        <form onSubmit={submit}>
          <label>
            Requester
            <div style={{
              padding: "8px 10px",
              border: "1px solid var(--cal-border)",
              borderRadius: "var(--radius-sm)",
              background: "var(--cal-outside-bg)",
              color: "var(--cal-ink)",
              fontWeight: 500,
              fontSize: "0.95rem"
            }}>
              {users.find((u) => u.id === userId)?.name ?? "Unknown"}
            </div>
          </label>

          <label>
            Date
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </label>

          <label>
            Shift
            <select value={shift} onChange={(e) => setShift(e.target.value as Shift)}>
              {SHIFTS.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Reason
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
          </label>

          {createLeave.isError && <div className="form-error">{(createLeave.error as Error).message}</div>}

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={createLeave.isPending}>
              {createLeave.isPending ? "Submitting…" : "Submit request"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
