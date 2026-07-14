import type { ViewMode } from "../state";
import { addDays, MONTH_LABELS, startOfWeek, WEEKDAY_LABELS } from "../utils/date";

function formatLabel(view: ViewMode, currentDate: Date): string {
  if (view === "month") {
    return `${MONTH_LABELS[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
  }
  if (view === "day") {
    return `${WEEKDAY_LABELS[currentDate.getDay()]}, ${MONTH_LABELS[currentDate.getMonth()]} ${currentDate.getDate()}, ${currentDate.getFullYear()}`;
  }
  const start = startOfWeek(currentDate);
  const end = addDays(start, 6);
  if (start.getMonth() === end.getMonth()) {
    return `${MONTH_LABELS[start.getMonth()]} ${start.getDate()} – ${end.getDate()}, ${end.getFullYear()}`;
  }
  return `${MONTH_LABELS[start.getMonth()]} ${start.getDate()} – ${MONTH_LABELS[end.getMonth()]} ${end.getDate()}, ${end.getFullYear()}`;
}

const VIEW_OPTIONS: { key: ViewMode; label: string }[] = [
  { key: "month", label: "Month" },
  { key: "week", label: "Week" },
  { key: "day", label: "Day" },
];

export default function Header({
  view,
  setView,
  currentDate,
  goPrev,
  goNext,
  goToday,
  onToggleSidebar,
  sidebarCollapsed,
  onAddRequest,
}: {
  view: ViewMode;
  setView: (v: ViewMode) => void;
  currentDate: Date;
  goPrev: () => void;
  goNext: () => void;
  goToday: () => void;
  onToggleSidebar: () => void;
  sidebarCollapsed: boolean;
  onAddRequest: () => void;
}) {
  return (
    <header className="app-header">
      <div className="header-left">
        <button type="button" className="icon-btn hamburger-btn" onClick={onToggleSidebar} aria-label="Toggle menu">
          ☰
        </button>
        <button type="button" className="btn-secondary today-btn" onClick={goToday}>
          Today
        </button>
        <button type="button" className="icon-btn" onClick={goPrev} aria-label="Previous">
          ‹
        </button>
        <button type="button" className="icon-btn" onClick={goNext} aria-label="Next">
          ›
        </button>
        <button
          type="button"
          className={`btn-primary header-add-request${sidebarCollapsed ? "" : " is-desktop-only-hidden"}`}
          onClick={onAddRequest}
        >
          + Add Request
        </button>
      </div>

      <span className="header-label">{formatLabel(view, currentDate)}</span>

      <div className="view-switch" role="tablist" aria-label="Calendar view">
        {VIEW_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            type="button"
            className={view === opt.key ? "is-active" : ""}
            onClick={() => setView(opt.key)}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </header>
  );
}
