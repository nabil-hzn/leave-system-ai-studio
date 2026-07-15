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
  users,
  actingUserId,
  setActingUserId,
  open,
  onClose,
  collapsed,
  onToggleCollapse,
  onSignOutClick,
}: {
  activeNav: NavPage;
  setActiveNav: (p: NavPage) => void;
  onAddRequest: () => void;
  mode: ActorMode;
  users: User[];
  actingUserId: number | null;
  setActingUserId: (id: number) => void;
  open: boolean;
  onClose: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onSignOutClick?: () => void;
}) {
  const { currentUser } = useAppStore();
  const actingUser = users.find((u) => u.id === actingUserId);


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

          {currentUser?.role === "admin" && (
            <button
              type="button"
              className={`sidebar-nav-item${activeNav === "accessControl" ? " is-active" : ""}`}
              onClick={() => {
                setActiveNav("accessControl");
                onClose();
              }}
              title="Access Control"
            >
              <span className="sidebar-nav-icon">🛡️</span>
              <span className="sidebar-nav-label">Access Control</span>
            </button>
          )}
        </nav>

        <div className="sidebar-bottom">
          <div className="acting-user-block">
            <span className="acting-user-avatar">{actingUser?.name.charAt(0) ?? "?"}</span>
            <div className="acting-user-info" style={{ display: collapsed ? "none" : "flex", flexDirection: "column", minWidth: 0 }}>
              <span className="acting-user-name-static" style={{ fontWeight: 600, fontSize: "0.88rem", color: "var(--on-navy)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={actingUser?.name}>
                {actingUser?.name ?? "Unknown"}
              </span>
              <span className="acting-user-role" style={{ textTransform: "capitalize" }}>{currentUser?.role ?? "Requestor"}</span>
            </div>
          </div>

          <button
            type="button"
            className="sidebar-nav-item"
            style={{ marginTop: "12px", border: "1px solid var(--navy-border)", background: "rgba(255, 255, 255, 0.03)" }}
            onClick={onSignOutClick}
            title="Sign Out"
          >
            <span className="sidebar-nav-icon">🚪</span>
            <span className="sidebar-nav-label">Sign Out</span>
          </button>
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
