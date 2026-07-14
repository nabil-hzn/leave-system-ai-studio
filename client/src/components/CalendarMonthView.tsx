import { useState } from "react";
import { SHIFTS, type LeaveRequest, type LeaveStatus, type Shift } from "../types";
import { useAppStore, type ActorMode } from "../state";
import { addDays, isSameDay, monthGridRange, toISODate, WEEKDAY_LABELS } from "../utils/date";
import LeaveChip from "./LeaveChip";

const MAX_VISIBLE = 3;
const STATUS_ORDER = new Map<LeaveStatus, number>([
  ["approved", 0],
  ["pending", 1],
  ["rejected", 2],
]);

export default function CalendarMonthView({
  currentDate,
  leaves,
  mode,
  onSelectDay,
  onOpenDetail,
  onRescheduleLeave,
}: {
  currentDate: Date;
  leaves: LeaveRequest[];
  mode: ActorMode;
  onSelectDay: (d: Date) => void;
  onOpenDetail: (leave: LeaveRequest) => void;
  onRescheduleLeave: (leave: LeaveRequest, date: string, shift?: Shift) => void;
}) {
  const [dragOverIso, setDragOverIso] = useState<string | null>(null);
  const { currentUser } = useAppStore();
  const canDrag = true;
  const { start, end } = monthGridRange(currentDate);
  const dayCount = Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1;
  const days: Date[] = Array.from({ length: dayCount }, (_, i) => addDays(start, i));
  const today = new Date();

  const byDate = new Map<string, LeaveRequest[]>();
  for (const l of leaves) {
    const arr = byDate.get(l.date) ?? [];
    arr.push(l);
    byDate.set(l.date, arr);
  }
  const shiftOrder = new Map(SHIFTS.map((s, i) => [s.key, i]));

  return (
    <div className="month-view">
      <div className="month-weekday-row">
        {WEEKDAY_LABELS.map((w) => (
          <div key={w} className="month-weekday-cell">
            {w}
          </div>
        ))}
      </div>
      <div className="month-grid">
        {days.map((day) => {
          const iso = toISODate(day);
          const inMonth = day.getMonth() === currentDate.getMonth();
          const isToday = isSameDay(day, today);
          const dayLeaves = (byDate.get(iso) ?? []).slice().sort((a, b) => {
            const statusDiff = STATUS_ORDER.get(a.status)! - STATUS_ORDER.get(b.status)!;
            if (statusDiff !== 0) return statusDiff;
            return shiftOrder.get(a.shift)! - shiftOrder.get(b.shift)!;
          });
          const visible = dayLeaves.slice(0, MAX_VISIBLE);
          const overflow = dayLeaves.length - visible.length;

          return (
            <div
              key={iso}
              className={`month-day-cell${inMonth ? "" : " is-outside"}${dragOverIso === iso ? " is-drag-over" : ""}`}
              onClick={() => onSelectDay(day)}
              onDragOver={
                canDrag
                  ? (e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "move";
                      setDragOverIso(iso);
                    }
                  : undefined
              }
              onDragLeave={canDrag ? () => setDragOverIso((cur) => (cur === iso ? null : cur)) : undefined}
              onDrop={
                canDrag
                  ? (e) => {
                      e.preventDefault();
                      setDragOverIso(null);
                      const id = Number(e.dataTransfer.getData("text/plain"));
                      const dragged = leaves.find((l) => l.id === id);
                      if (dragged && dragged.date !== iso) onRescheduleLeave(dragged, iso);
                    }
                  : undefined
              }
            >
              <div className={`month-day-number${isToday ? " is-today" : ""}`}>{day.getDate()}</div>
              <div className="month-day-chips">
                {visible.map((l) => (
                  <LeaveChip
                    key={l.id}
                    leave={l}
                    onClick={() => onOpenDetail(l)}
                    draggable={canDrag}
                  />
                ))}
                {overflow > 0 && (
                  <button
                    type="button"
                    className="month-more-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectDay(day);
                    }}
                  >
                    +{overflow} more
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
