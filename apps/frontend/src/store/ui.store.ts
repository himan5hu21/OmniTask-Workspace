import { create } from 'zustand';

interface UIState {
  isOrgSettingsOpen: boolean;
  openOrgSettings: () => void;
  closeOrgSettings: () => void;
  isProfileSettingsOpen: boolean;
  openProfileSettings: () => void;
  closeProfileSettings: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  isOrgSettingsOpen: false,
  openOrgSettings: () => set({ isOrgSettingsOpen: true }),
  closeOrgSettings: () => set({ isOrgSettingsOpen: false }),
  isProfileSettingsOpen: false,
  openProfileSettings: () => set({ isProfileSettingsOpen: true }),
  closeProfileSettings: () => set({ isProfileSettingsOpen: false }),
}));
