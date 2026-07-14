import { useEffect, useMemo, useState } from "react";
import { useLeaves, useUpdateLeaveDate, useUsers } from "./api";
import type { Shift, LeaveRequest } from "./types";
import CalendarDayView from "./components/CalendarDayView";
import CalendarMonthView from "./components/CalendarMonthView";
import CalendarWeekView from "./components/CalendarWeekView";
import CreateLeaveModal from "./components/CreateLeaveModal";
import Header from "./components/Header";
import LeaveDetailModal from "./components/LeaveDetailModal";
import MyRequestsView from "./components/MyRequestsView";
import Sidebar from "./components/Sidebar";
import Login from "./components/Login";
import { useAppStore } from "./state";
import { addDays, monthGridRange, startOfWeek, toISODate } from "./utils/date";

// Wide fixed range so the "My Request" page sees every seeded/created leave
// regardless of which month the calendar happens to be showing.
const ALL_TIME_START = "1970-01-01";
const ALL_TIME_END = "2100-12-31";

export default function App() {
  const {
    view,
    setView,
    currentDate,
    setCurrentDate,
    goPrev,
    goNext,
    goToday,
    mode,
    setMode,
    actingUserId,
    setActingUserId,
    sidebarOpen,
    toggleSidebar,
    setSidebarOpen,
    sidebarCollapsed,
    toggleSidebarCollapsed,
    activeNav,
    setActiveNav,
    createModal,
    openCreateModal,
    closeCreateModal,
    detailLeave,
    openDetail,
    closeDetail,
    currentUser,
  } = useAppStore();

  const { data: users = [] } = useUsers();

  useEffect(() => {
    if (actingUserId === null && users.length > 0) {
      setActingUserId(users[0].id);
    }
  }, [users, actingUserId, setActingUserId]);

  const viewRange = useMemo(() => {
    if (view === "month") {
      const { start, end } = monthGridRange(currentDate);
      return { start, end };
    }
    if (view === "week") {
      const start = startOfWeek(currentDate);
      return { start, end: addDays(start, 6) };
    }
    return { start: currentDate, end: currentDate };
  }, [view, currentDate]);

  const startISO = toISODate(viewRange.start);
  const endISO = toISODate(viewRange.end);
  const { data: leaves = [], isLoading, isError } = useLeaves(startISO, endISO);

  const { data: allLeaves = [] } = useLeaves(ALL_TIME_START, ALL_TIME_END);
  const myLeaves = allLeaves.filter((l) => l.userId === actingUserId);

  const updateLeaveDate = useUpdateLeaveDate();

  const [rescheduleConfirm, setRescheduleConfirm] = useState<{
    leave: LeaveRequest;
    targetDate: string;
    targetShift?: Shift;
  } | null>(null);

  if (!currentUser) {
    return <Login />;
  }

  const handleSelectDay = (d: Date) => {
    setCurrentDate(d);
    setView("day");
  };

  const handleRescheduleLeave = (leave: LeaveRequest, date: string, shift?: Shift) => {
    setRescheduleConfirm({ leave, targetDate: date, targetShift: shift });
  };

  const handleConfirmReschedule = () => {
    if (!rescheduleConfirm) return;
    const { leave, targetDate, targetShift } = rescheduleConfirm;
    updateLeaveDate.mutate(
      { id: leave.id, date: targetDate, shift: targetShift },
      {
        onSuccess: () => {
          setRescheduleConfirm(null);
        },
        onError: (err) => {
          window.alert((err as Error).message || "Could not reschedule this request.");
          setRescheduleConfirm(null);
        },
      }
    );
  };

  const handleCancelReschedule = () => {
    setRescheduleConfirm(null);
  };

  return (
    <div className="app-shell-row">
      <Sidebar
        activeNav={activeNav}
        setActiveNav={setActiveNav}
        onAddRequest={() => openCreateModal(toISODate(currentDate))}
        mode={mode}
        setMode={setMode}
        users={users}
        actingUserId={actingUserId}
        setActingUserId={setActingUserId}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={toggleSidebarCollapsed}
      />

      <div className="app-main">
        {activeNav === "calendar" && (
          <>
            <Header
              view={view}
              setView={setView}
              currentDate={currentDate}
              goPrev={goPrev}
              goNext={goNext}
              goToday={goToday}
              onToggleSidebar={toggleSidebar}
              sidebarCollapsed={sidebarCollapsed}
              onAddRequest={() => openCreateModal(toISODate(currentDate))}
            />

            <main className="calendar-area">
              {isLoading && <div className="status-msg">Loading…</div>}
              {isError && <div className="status-msg form-error">Failed to load leave data.</div>}
              {!isLoading && !isError && view === "month" && (
                <CalendarMonthView
                  currentDate={currentDate}
                  leaves={leaves}
                  mode={mode}
                  onSelectDay={handleSelectDay}
                  onOpenDetail={openDetail}
                  onRescheduleLeave={handleRescheduleLeave}
                />
              )}
              {!isLoading && !isError && view === "week" && (
                <CalendarWeekView
                  currentDate={currentDate}
                  leaves={leaves}
                  mode={mode}
                  onOpenDetail={openDetail}
                  onCreate={(date, shift) => openCreateModal(date, shift)}
                  onRescheduleLeave={handleRescheduleLeave}
                />
              )}
              {!isLoading && !isError && view === "day" && (
                <CalendarDayView
                  currentDate={currentDate}
                  leaves={leaves}
                  mode={mode}
                  actingUserId={actingUserId}
                  onOpenDetail={openDetail}
                  onCreate={(date, shift) => openCreateModal(date, shift)}
                  onRescheduleLeave={handleRescheduleLeave}
                />
              )}
            </main>
          </>
        )}

        {activeNav === "myRequests" && (
          <>
            <header className="app-header">
              <div className="header-left">
                <button
                  type="button"
                  className="icon-btn hamburger-btn"
                  onClick={toggleSidebar}
                  aria-label="Toggle menu"
                >
                  ☰
                </button>
                <button
                  type="button"
                  className={`btn-primary header-add-request${sidebarCollapsed ? "" : " is-desktop-only-hidden"}`}
                  onClick={() => openCreateModal(toISODate(currentDate))}
                >
                  + Add Request
                </button>
              </div>
            </header>
            <main className="calendar-area">
              <MyRequestsView leaves={myLeaves} onOpenDetail={openDetail} />
            </main>
          </>
        )}
      </div>

      {createModal.open && (
        <CreateLeaveModal
          defaultDate={createModal.date}
          defaultShift={createModal.shift}
          users={users}
          actingUserId={actingUserId}
          onClose={closeCreateModal}
        />
      )}

      {detailLeave && (
        <LeaveDetailModal leave={detailLeave} mode={mode} actingUserId={actingUserId} onClose={closeDetail} />
      )}

      {rescheduleConfirm && (
        <div className="modal-scrim" onClick={handleCancelReschedule}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginBottom: "14px", fontWeight: 700 }}>Confirm Reschedule</h2>
            <div style={{ fontSize: "0.9rem", color: "var(--cal-ink-muted)", marginBottom: "20px", lineHeight: "1.5" }}>
              Are you sure you want to reschedule <strong>{rescheduleConfirm.leave.userName}</strong>'s leave request?
              <div style={{ marginTop: "12px", background: "var(--cal-outside-bg)", padding: "12px", borderRadius: "var(--radius-md)", border: "1px solid var(--cal-border)" }}>
                <div style={{ display: "grid", gridTemplateColumns: "80px 1fr", gap: "6px" }}>
                  <span><strong>From:</strong></span>
                  <span>{rescheduleConfirm.leave.date} ({rescheduleConfirm.leave.shift})</span>
                  <span><strong>To:</strong></span>
                  <span style={{ color: "var(--color-accent)", fontWeight: 600 }}>
                    {rescheduleConfirm.targetDate} ({rescheduleConfirm.targetShift || rescheduleConfirm.leave.shift})
                  </span>
                </div>
              </div>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={handleCancelReschedule}>
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleConfirmReschedule}
                disabled={updateLeaveDate.isPending}
              >
                {updateLeaveDate.isPending ? "Updating…" : "Confirm Reschedule"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
