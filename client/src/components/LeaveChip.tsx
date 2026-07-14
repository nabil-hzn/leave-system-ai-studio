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
  return (
    <button
      type="button"
      className={`chip chip-${leave.status}${draggable ? " chip-draggable" : ""}`}
      draggable={draggable}
      onDragStart={
        draggable
          ? (e) => {
              e.dataTransfer.setData("text/plain", String(leave.id));
              e.dataTransfer.effectAllowed = "move";
            }
          : undefined
      }
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      title={`${leave.userName} · ${leave.shift} · ${leave.status}${draggable ? " · drag to reschedule" : ""}`}
    >
      {showShift && <span className="chip-shift">{SHIFT_INITIAL[leave.shift]}</span>}
      <span className="chip-name">{leave.userName}</span>
    </button>
  );
}
