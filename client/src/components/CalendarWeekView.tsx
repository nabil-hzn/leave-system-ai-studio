import { Fragment, useState } from "react";
import { SHIFTS, type LeaveRequest, type Shift } from "../types";
import { useAppStore, type ActorMode } from "../state";
import { addDays, isSameDay, startOfWeek, toISODate, WEEKDAY_LABELS } from "../utils/date";
import LeaveChip from "./LeaveChip";

export default function CalendarWeekView({
  currentDate,
  leaves,
  mode,
  onOpenDetail,
  onCreate,
  onRescheduleLeave,
}: {
  currentDate: Date;
  leaves: LeaveRequest[];
  mode: ActorMode;
  onOpenDetail: (leave: LeaveRequest) => void;
  onCreate: (date: string, shift: (typeof SHIFTS)[number]["key"]) => void;
  onRescheduleLeave: (leave: LeaveRequest, date: string, shift?: Shift) => void;
}) {
  const { currentUser, actingUserId, draggedLeave, setDraggedLeave } = useAppStore();
  const canDrag = true;
  const start = startOfWeek(currentDate);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const today = new Date();

  const byDateShift = new Map<string, LeaveRequest[]>();
  for (const l of leaves) {
    const key = `${l.date}|${l.shift}`;
    const arr = byDateShift.get(key) ?? [];
    arr.push(l);
    byDateShift.set(key, arr);
  }

  return (
    <div className="week-view">
      <div className="week-grid">
        <div className="week-corner" />
        {days.map((day, i) => (
          <div key={toISODate(day)} className={`week-day-header${isSameDay(day, today) ? " is-today" : ""}`}>
            <div className="week-day-name">{WEEKDAY_LABELS[i]}</div>
            <div className="week-day-number">{day.getDate()}</div>
          </div>
        ))}

        {SHIFTS.map((shift) => (
          <Fragment key={shift.key}>
            <div className="week-shift-label">{shift.label}</div>
            {days.map((day) => {
              const iso = toISODate(day);
              const cellLeaves = byDateShift.get(`${iso}|${shift.key}`) ?? [];
              const cellKey = `${iso}-${shift.key}`;
              return (
                <div
                  key={cellKey}
                  className="week-cell"
                  onClick={() => onCreate(iso, shift.key)}
                  onDragOver={
                    canDrag
                      ? (e) => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = "move";
                        }
                      : undefined
                  }
                  onDragEnter={
                    canDrag
                      ? (e) => {
                          e.preventDefault();
                          e.currentTarget.classList.add("is-drag-over");
                        }
                      : undefined
                  }
                  onDragLeave={
                    canDrag
                      ? (e) => {
                          e.currentTarget.classList.remove("is-drag-over");
                        }
                      : undefined
                  }
                  onDrop={
                    canDrag
                      ? (e) => {
                          e.preventDefault();
                          e.currentTarget.classList.remove("is-drag-over");
                          const id = Number(e.dataTransfer.getData("text/plain"));
                          const storeDragged = useAppStore.getState().draggedLeave;
                          const dragged = storeDragged || draggedLeave || leaves.find((l) => l.id === id);
                          const isOwner = dragged && ((currentUser && dragged.userId === currentUser.id) || (actingUserId !== null && dragged.userId === actingUserId));
                          const canUserReschedule = mode === "approver" || isOwner;
                          if (dragged && dragged.status !== "approved" && canUserReschedule && (dragged.date !== iso || dragged.shift !== shift.key)) {
                            onRescheduleLeave(dragged, iso, shift.key);
                          }
                          setDraggedLeave(null);
                        }
                      : undefined
                  }
                >
                  {cellLeaves.map((l) => (
                    <LeaveChip
                      key={l.id}
                      leave={l}
                      onClick={() => onOpenDetail(l)}
                      showShift={false}
                      draggable={canDrag}
                    />
                  ))}
                </div>
              );
            })}
          </Fragment>
        ))}
      </div>
    </div>
  );
}
