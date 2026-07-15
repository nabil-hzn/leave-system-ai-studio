import { useAppStore } from "../state";
import type { LeaveRequest } from "../types";

const SHIFT_INITIAL: Record<string, string> = { morning: "M", afternoon: "A", night: "N" };

export default function LeaveChip({
  leave,
  onClick,
  showShift = true,
  draggable = false,
}: {
  leave: LeaveRequest;
  onClick: () => void;
  showShift?: boolean;
  draggable?: boolean;
}) {
  const { setDraggedLeave, currentUser, actingUserId, mode } = useAppStore();
  const isOwner = (currentUser && leave.userId === currentUser.id) || (actingUserId !== null && leave.userId === actingUserId);
  const canUserReschedule = mode === "approver" || isOwner;
  const isActuallyDraggable = draggable && leave.status !== "approved" && canUserReschedule;

  return (
    <div
      role="button"
      tabIndex={0}
      className={`chip chip-${leave.status}${isActuallyDraggable ? " chip-draggable" : ""}`}
      draggable={isActuallyDraggable}
      onDragStart={
        isActuallyDraggable
          ? (e) => {
              e.dataTransfer.setData("text/plain", String(leave.id));
              e.dataTransfer.effectAllowed = "move";
              setDraggedLeave(leave);
              e.currentTarget.classList.add("dragging");
              document.body.classList.add("dragging-active");
            }
          : undefined
      }
      onDragEnd={
        isActuallyDraggable
          ? (e) => {
              e.currentTarget.classList.remove("dragging");
              document.body.classList.remove("dragging-active");
              setTimeout(() => {
                setDraggedLeave(null);
              }, 100);
            }
          : undefined
      }
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          e.stopPropagation();
          onClick();
        }
      }}
      title={`${leave.userName} · ${leave.shift} · ${leave.status}${isActuallyDraggable ? " · drag to reschedule" : ""}`}
    >
      {showShift && <span className="chip-shift">{SHIFT_INITIAL[leave.shift]}</span>}
      <span className="chip-name">{leave.userName}</span>
    </div>
  );
}
