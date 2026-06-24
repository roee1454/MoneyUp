import { create } from 'zustand';

interface SettingsState {
  showAdvancedScraper: boolean;
  setShowAdvancedScraper: (show: boolean) => void;
  isPathDialogOpen: boolean;
  setIsPathDialogOpen: (open: boolean) => void;
  isDetecting: boolean;
  setIsDetecting: (detecting: boolean) => void;
  isInstalling: boolean;
  setIsInstalling: (installing: boolean) => void;
  installProgress: number;
  setInstallProgress: (progress: number) => void;
  installLogs: string[];
  setInstallLogs: (logs: string[] | ((prev: string[]) => string[])) => void;
  availableBrowsers: any[];
  setAvailableBrowsers: (browsers: any[]) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  showAdvancedScraper: false,
  setShowAdvancedScraper: (show) => set({ showAdvancedScraper: show }),
  isPathDialogOpen: false,
  setIsPathDialogOpen: (open) => set({ isPathDialogOpen: open }),
  isDetecting: false,
  setIsDetecting: (detecting) => set({ isDetecting: detecting }),
  isInstalling: false,
  setIsInstalling: (installing) => set({ isInstalling: installing }),
  installProgress: 0,
  setInstallProgress: (progress) => set({ installProgress: progress }),
  installLogs: [],
  setInstallLogs: (logs) => set((state) => ({
    installLogs: typeof logs === 'function' ? logs(state.installLogs) : logs
  })),
  availableBrowsers: [],
  setAvailableBrowsers: (browsers) => set({ availableBrowsers: browsers }),
}));
