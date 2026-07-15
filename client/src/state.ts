import { create } from "zustand";
import { addDays } from "./utils/date";
import type { LeaveRequest, Shift } from "./types";

export type ViewMode = "month" | "week" | "day";
export type ActorMode = "requester" | "approver";
export type NavPage = "calendar" | "myRequests" | "accessControl";

interface AppState {
  view: ViewMode;
  currentDate: Date;
  mode: ActorMode;
  actingUserId: number | null;
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  activeNav: NavPage;
  createModal: { open: boolean; date?: string; shift?: Shift };
  detailLeave: LeaveRequest | null;
  currentUser: { id: number; name: string; email: string | null; role: string } | null;
  authLoading: boolean;
  draggedLeave: LeaveRequest | null;

  setView: (v: ViewMode) => void;
  setCurrentDate: (d: Date) => void;
  goToday: () => void;
  goPrev: () => void;
  goNext: () => void;
  setMode: (m: ActorMode) => void;
  setActingUserId: (id: number | null) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebarCollapsed: () => void;
  setActiveNav: (page: NavPage) => void;
  openCreateModal: (date?: string, shift?: Shift) => void;
  closeCreateModal: () => void;
  openDetail: (leave: LeaveRequest) => void;
  closeDetail: () => void;
  setCurrentUser: (user: { id: number; name: string; email: string | null; role: string } | null) => void;
  setAuthLoading: (loading: boolean) => void;
  setDraggedLeave: (leave: LeaveRequest | null) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  view: "month",
  currentDate: new Date(),
  mode: "requester",
  actingUserId: null,
  sidebarOpen: false,
  sidebarCollapsed: false,
  activeNav: "calendar",
  createModal: { open: false },
  detailLeave: null,
  currentUser: null,
  authLoading: true,
  draggedLeave: null,

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
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  toggleSidebarCollapsed: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setActiveNav: (activeNav) => set({ activeNav }),
  openCreateModal: (date, shift) => set({ createModal: { open: true, date, shift } }),
  closeCreateModal: () => set({ createModal: { open: false } }),
  openDetail: (detailLeave) => set({ detailLeave }),
  closeDetail: () => set({ detailLeave: null }),
  setCurrentUser: (currentUser) => set({ currentUser, actingUserId: currentUser ? currentUser.id : null }),
  setAuthLoading: (authLoading) => set({ authLoading }),
  setDraggedLeave: (draggedLeave) => set({ draggedLeave }),
}));
