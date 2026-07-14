import { useAppStore } from "../state";
import type { ActorMode, NavPage } from "../state";
import type { User } from "../types";

const NAV_ITEMS: { key: NavPage; label: string; icon: string }[] = [
  { key: "calendar", label: "Calendar", icon: "📅" },
  { key: "myRequests", label: "My Request", icon: "🗂️" },
];

export default function Sidebar({
  activeNav,
  setActiveNav,
  onAddRequest,
  mode,
  setMode,
  users,
  actingUserId,
  setActingUserId,
  open,
  onClose,
  collapsed,
  onToggleCollapse,
}: {
  activeNav: NavPage;
  setActiveNav: (p: NavPage) => void;
  onAddRequest: () => void;
  mode: ActorMode;
  setMode: (m: ActorMode) => void;
  users: User[];
  actingUserId: number | null;
  setActingUserId: (id: number) => void;
  open: boolean;
  onClose: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}) {
  const actingUser = users.find((u) => u.id === actingUserId);
  const { currentUser, setCurrentUser } = useAppStore();

  return (
    <>
      {open && <div className="sidebar-scrim" onClick={onClose} />}
      <aside className={`sidebar${open ? " is-open" : ""}${collapsed ? " is-collapsed" : ""}`}>
        <div className="sidebar-brand">
          <span className="brand-logo">📆</span>
          <div className="brand-text">
            <span className="brand-name">Leave Calendar</span>
            <span className="brand-subtitle">Team Portal</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <button
            type="button"
            className={`sidebar-nav-item${activeNav === "calendar" ? " is-active" : ""}`}
            onClick={() => {
              setActiveNav("calendar");
              onClose();
            }}
            title={NAV_ITEMS[0].label}
          >
            <span className="sidebar-nav-icon">{NAV_ITEMS[0].icon}</span>
            <span className="sidebar-nav-label">{NAV_ITEMS[0].label}</span>
          </button>

          <button
            type="button"
            className="sidebar-nav-item"
            onClick={() => {
              onAddRequest();
              onClose();
            }}
            title="Add Request"
          >
            <span className="sidebar-nav-icon">➕</span>
            <span className="sidebar-nav-label">Add Request</span>
          </button>

          <button
            type="button"
            className={`sidebar-nav-item${activeNav === "myRequests" ? " is-active" : ""}`}
            onClick={() => {
              setActiveNav("myRequests");
              onClose();
            }}
            title={NAV_ITEMS[1].label}
          >
            <span className="sidebar-nav-icon">{NAV_ITEMS[1].icon}</span>
            <span className="sidebar-nav-label">{NAV_ITEMS[1].label}</span>
          </button>
        </nav>

        <div className="sidebar-bottom">
          <div className="access-tier-card">
            <span className="access-tier-label">Access Mode</span>
            <div className="mode-switch sidebar-mode-switch" role="tablist" aria-label="Mode">
              <button
                type="button"
                className={mode === "requester" ? "is-active" : ""}
                onClick={() => setMode("requester")}
              >
                Requester
              </button>
              <button
                type="button"
                className={mode === "approver" ? "is-active" : ""}
                onClick={() => setMode("approver")}
              >
                Approver
              </button>
            </div>
          </div>

          <div className="acting-user-block">
            <span className="acting-user-avatar">{actingUser?.name.charAt(0) ?? "?"}</span>
            <div className="acting-user-info">
              <select
                className="acting-user-select"
                value={actingUserId ?? ""}
                onChange={(e) => setActingUserId(Number(e.target.value))}
                aria-label="Acting as"
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
              <span className="acting-user-role">{mode === "requester" ? "Requester" : "Approver"}</span>
            </div>
          </div>

          {currentUser && (
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "12px",
              borderTop: "1px solid var(--navy-border)",
              marginTop: "8px",
              background: "rgba(255, 255, 255, 0.03)",
              borderRadius: "var(--radius-md)",
            }}>
              {currentUser.picture ? (
                <img
                  src={currentUser.picture}
                  alt={currentUser.name}
                  style={{ width: "32px", height: "32px", borderRadius: "50%", objectFit: "cover" }}
                />
              ) : (
                <span className="acting-user-avatar" style={{ margin: 0 }}>
                  {currentUser.name.charAt(0)}
                </span>
              )}
              <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0, textAlign: "left" }}>
                <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--on-navy)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {currentUser.name}
                </span>
                <span style={{ fontSize: "0.75rem", color: "var(--on-navy-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {currentUser.email}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setCurrentUser(null)}
                title="Sign Out"
                style={{
                  background: "none",
                  border: "none",
                  color: "#ea4335",
                  cursor: "pointer",
                  fontSize: "1.1rem",
                  padding: "4px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "4px",
                }}
              >
                🚪
              </button>
            </div>
          )}
        </div>
      </aside>

      <button
        type="button"
        className="sidebar-collapse-btn"
        onClick={onToggleCollapse}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? "❯" : "❮"}
      </button>
    </>
  );
}
