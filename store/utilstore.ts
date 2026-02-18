import { create } from 'zustand';

interface UIState {
  isScrollEnabled: boolean;
  setScrollEnabled: (status: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  isScrollEnabled: true,
  setScrollEnabled: (status) => set({ isScrollEnabled: status }),
}));