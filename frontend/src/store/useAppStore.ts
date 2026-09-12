import { create } from "zustand";

interface AppState {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  aiChatOpen: boolean;
  toggleAiChat: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  sidebarOpen: true,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  aiChatOpen: false,
  toggleAiChat: () => set((state) => ({ aiChatOpen: !state.aiChatOpen })),
}));
