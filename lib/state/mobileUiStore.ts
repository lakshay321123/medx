"use client";
import { create } from "zustand";

type SheetView = "main" | "mode" | "country";

type MobileUIState = {
  sidebarOpen: boolean;
  sheetOpen: boolean;
  sheetView: SheetView;
  openSidebar: () => void;
  closeSidebar: () => void;
  openSheet: (view?: SheetView) => void;
  closeSheet: () => void;
  setSheetView: (view: SheetView) => void;
};

export const useMobileUiStore = create<MobileUIState>((set) => ({
  sidebarOpen: false,
  sheetOpen: false,
  sheetView: "main",
  openSidebar: () => set({ sidebarOpen: true }),
  closeSidebar: () => set({ sidebarOpen: false }),
  openSheet: (view = "main") => set({ sheetOpen: true, sheetView: view }),
  closeSheet: () => set({ sheetOpen: false, sheetView: "main" }),
  setSheetView: (view) => set({ sheetView: view }),
}));
