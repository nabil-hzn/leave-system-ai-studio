import { create } from "zustand";
import { addDays } from "./utils/date";
import type { LeaveRequest, Shift, User } from "./types";

export type ViewMode = "month" | "week" | "day";
export type ActorMode = "requester" | "approver";
export type NavPage = "calendar" | "myRequests";

interface AppState {
  view: ViewMode;
  currentDate: Date;
  mode: ActorMode;
  actingUserId: number | null;
  currentUser: User | null;
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  activeNav: NavPage;
  createModal: { open: boolean; date?: string; shift?: Shift };
  detailLeave: LeaveRequest | null;

  setView: (v: ViewMode) => void;
  setCurrentDate: (d: Date) => void;
  goToday: () => void;
  goPrev: () => void;
  goNext: () => void;
  setMode: (m: ActorMode) => void;
  setActingUserId: (id: number | null) => void;
  setCurrentUser: (user: User | null) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebarCollapsed: () => void;
  setActiveNav: (page: NavPage) => void;
  openCreateModal: (date?: string, shift?: Shift) => void;
  closeCreateModal: () => void;
  openDetail: (leave: LeaveRequest) => void;
  closeDetail: () => void;
}

const getStoredUser = (): User | null => {
  try {
    const saved = localStorage.getItem("sso_user");
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
};

const initialUser = getStoredUser();

export const useAppStore = create<AppState>((set, get) => ({
  view: "month",
  currentDate: new Date(),
  mode: "requester",
  actingUserId: initialUser ? initialUser.id : null,
  currentUser: initialUser,
  sidebarOpen: false,
  sidebarCollapsed: false,
  activeNav: "calendar",
  createModal: { open: false },
  detailLeave: null,

  setView: (view) => set({ view }),
  setCurrentDate: (currentDate) => set({ currentDate }),
  goToday: () => set({ currentDate: new Date() }),
  goPrev: () => {
    const { view, currentDate } = get();
    const step = view === "month" ? -1 : view === "week" ? -7 : -1;
    if (view === "month") {
      set({ currentDate: new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1) });
    } else {
      set({ currentDate: addDays(currentDate, step) });
    }
  },
  goNext: () => {
    const { view, currentDate } = get();
    if (view === "month") {
      set({ currentDate: new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1) });
    } else {
      const step = view === "week" ? 7 : 1;
      set({ currentDate: addDays(currentDate, step) });
    }
  },
  setMode: (mode) => set({ mode }),
  setActingUserId: (actingUserId) => set({ actingUserId }),
  setCurrentUser: (currentUser) => {
    try {
      if (currentUser) {
        localStorage.setItem("sso_user", JSON.stringify(currentUser));
      } else {
        localStorage.removeItem("sso_user");
      }
    } catch (e) {
      console.error(e);
    }
    set({ currentUser, actingUserId: currentUser ? currentUser.id : null });
  },
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  toggleSidebarCollapsed: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setActiveNav: (activeNav) => set({ activeNav }),
  openCreateModal: (date, shift) => set({ createModal: { open: true, date, shift } }),
  closeCreateModal: () => set({ createModal: { open: false } }),
  openDetail: (detailLeave) => set({ detailLeave }),
  closeDetail: () => set({ detailLeave: null }),
}));
