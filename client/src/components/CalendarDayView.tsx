import { useState } from "react";
import { SHIFTS, type LeaveRequest, type Shift } from "../types";
import { useAppStore, type ActorMode } from "../state";
import { toISODate } from "../utils/date";
import LeaveChip from "./LeaveChip";

export default function CalendarDayView({
  currentDate,
  leaves,
  mode,
  actingUserId,
  onOpenDetail,
  onCreate,
  onRescheduleLeave,
}: {
  currentDate: Date;
  leaves: LeaveRequest[];
  mode: ActorMode;
  actingUserId: number | null;
  onOpenDetail: (leave: LeaveRequest) => void;
  onCreate: (date: string, shift: Shift) => void;
  onRescheduleLeave: (leave: LeaveRequest, date: string, shift?: Shift) => void;
}) {
  const [dragOverShift, setDragOverShift] = useState<Shift | null>(null);
  const { currentUser } = useAppStore();
  const canDrag = true;
  const iso = toISODate(currentDate);
  const byShift = new Map<Shift, LeaveRequest[]>();
  for (const l of leaves) {
    if (l.date !== iso) continue;
    const arr = byShift.get(l.shift) ?? [];
    arr.push(l);
    byShift.set(l.shift, arr);
  }

  return (
    <div className="day-view">
      {SHIFTS.map((shift) => {
        const shiftLeaves = byShift.get(shift.key) ?? [];
        const approvedCount = shiftLeaves.filter((l) => l.status === "approved").length;
        const alreadyRequested = shiftLeaves.some(
          (l) => l.userId === actingUserId && l.status !== "rejected"
        );
        return (
          <section
            key={shift.key}
            className={`day-shift-section${dragOverShift === shift.key ? " is-drag-over" : ""}`}
            onDragOver={
              canDrag
                ? (e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                    setDragOverShift(shift.key);
                  }
                : undefined
            }
            onDragLeave={canDrag ? () => setDragOverShift((cur) => (cur === shift.key ? null : cur)) : undefined}
            onDrop={
              canDrag
                ? (e) => {
                    e.preventDefault();
                    setDragOverShift(null);
                    const id = Number(e.dataTransfer.getData("text/plain"));
                    const dragged = leaves.find((l) => l.id === id);
                    if (dragged && dragged.shift !== shift.key) {
                      onRescheduleLeave(dragged, iso, shift.key);
                    }
                  }
                : undefined
            }
          >
            <header className="day-shift-header">
              <h3>{shift.label}</h3>
              <span className="day-shift-meta">{approvedCount}/1 approved slot filled</span>
              {approvedCount === 0 && !alreadyRequested && (
                <button type="button" className="btn-secondary" onClick={() => onCreate(iso, shift.key)}>
                  + Add leave
                </button>
              )}
            </header>
            <div className="day-shift-list">
              {shiftLeaves.length === 0 && <div className="day-shift-empty">No requests</div>}
              {shiftLeaves.map((l) => (
                <div key={l.id} className="day-leave-row" onClick={() => onOpenDetail(l)}>
                  <LeaveChip
                    leave={l}
                    onClick={() => onOpenDetail(l)}
                    showShift={false}
                    draggable={canDrag}
                  />
                  {l.reason && <span className="day-leave-reason">{l.reason}</span>}
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
