import type { StoreSlice, SyncSlice } from '../types';

const initialSyncState = {
  jobId: null,
  status: 'idle' as const,
  phase: null,
  serverProgress: 0,
  displayProgress: 0,
  message: '',
  source: null,
  error: null,
  cooldownBlockedUntil: null,
  cooldownRemainingMs: null,
  rangeStartDate: null,
  rangeEndDate: null,
  startedAt: null,
  updatedAt: null,
  visible: false,
  challenge: null,
  currentlySyncing: null,
};

export const createSyncSlice: StoreSlice<SyncSlice> = (set) => ({
  sync: initialSyncState,
  setSync: (patch) =>
    set((state) => ({
      sync: {
        ...state.sync,
        ...patch,
      },
    })),
  resetSync: () => set({ sync: initialSyncState }),
});
