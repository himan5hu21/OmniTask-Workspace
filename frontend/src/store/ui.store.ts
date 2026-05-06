import { create } from 'zustand';

interface UIState {
  isOrgSettingsOpen: boolean;
  openOrgSettings: () => void;
  closeOrgSettings: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  isOrgSettingsOpen: false,
  openOrgSettings: () => set({ isOrgSettingsOpen: true }),
  closeOrgSettings: () => set({ isOrgSettingsOpen: false }),
}));
