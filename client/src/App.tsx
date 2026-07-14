import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "./utils/firebase";
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
import LoginPage from "./components/LoginPage";
import AccessControlView from "./components/AccessControlView";
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
    setCurrentUser,
    authLoading,
    setAuthLoading,
  } = useAppStore();

  const { data: users = [] } = useUsers();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const response = await fetch("/api/users/sync", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              name: firebaseUser.displayName || firebaseUser.email?.split("@")[0],
            }),
          });
          if (response.ok) {
            const syncedUser = await response.json();
            setCurrentUser(syncedUser);
          } else {
            setCurrentUser(null);
            try {
              await auth.signOut();
            } catch (soErr) {
              console.error("Error signing out after sync failure on initial load:", soErr);
            }
          }
        } catch (err) {
          console.error("Error syncing authenticated user:", err);
          setCurrentUser(null);
        }
      } else {
        setCurrentUser(null);
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, [setCurrentUser, setAuthLoading]);

  useEffect(() => {
    if (currentUser) {
      const isApproverOrAdmin = currentUser.role === "admin" || currentUser.role === "approver";
      const targetMode = isApproverOrAdmin ? "approver" : "requester";
      if (mode !== targetMode) {
        setMode(targetMode);
      }
    }
  }, [currentUser, mode, setMode]);

  useEffect(() => {
    if (actingUserId === null && !currentUser && users.length > 0) {
      setActingUserId(users[0].id);
    }
  }, [users, actingUserId, setActingUserId, currentUser]);

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

  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);

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
          console.error("Reschedule failed:", (err as Error).message || "Could not reschedule this request.");
          setRescheduleConfirm(null);
        },
      }
    );
  };

  const handleCancelReschedule = () => {
    setRescheduleConfirm(null);
  };

  if (authLoading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", height: "100vh", background: "var(--page-bg)", color: "var(--cal-ink-muted)" }}>
        <div style={{ fontSize: "2.5rem", marginBottom: "12px", animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite" }}>📆</div>
        <div style={{ fontSize: "1.05rem", fontWeight: 600, color: "var(--cal-ink)" }}>Initializing Portal...</div>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginPage />;
  }

  return (
    <div className="app-shell-row">
      <Sidebar
        activeNav={activeNav}
        setActiveNav={setActiveNav}
        onAddRequest={() => openCreateModal(toISODate(currentDate))}
        mode={mode}
        users={users}
        actingUserId={actingUserId}
        setActingUserId={setActingUserId}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={toggleSidebarCollapsed}
        onSignOutClick={() => setShowSignOutConfirm(true)}
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

        {activeNav === "accessControl" && currentUser?.role === "admin" && (
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
              </div>
            </header>
            <main className="calendar-area">
              <AccessControlView />
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

      {showSignOutConfirm && (
        <div className="modal-scrim" onClick={() => setShowSignOutConfirm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginBottom: "14px", fontWeight: 700 }}>Confirm Sign Out</h2>
            <div style={{ fontSize: "0.95rem", color: "var(--cal-ink-muted)", marginBottom: "24px", lineHeight: "1.5" }}>
              Are you sure you want to sign out of the Leave Calendar portal?
            </div>
            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={() => setShowSignOutConfirm(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary animate-hover"
                style={{ background: "#ea4335", borderColor: "#ea4335" }}
                onClick={async () => {
                  try {
                    await signOut(auth);
                    setShowSignOutConfirm(false);
                  } catch (err) {
                    console.error("Error signing out:", err);
                  }
                }}
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
