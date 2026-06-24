import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { CombinedState } from './types';
import { createSessionSlice } from './slices/sessionSlice';
import { createSyncSlice } from './slices/syncSlice';
import { createDashboardSlice } from './slices/dashboardSlice';

export const useAppStore = create<CombinedState>()(
  subscribeWithSelector((...a) => ({
    ...createSessionSlice(...a),
    ...createSyncSlice(...a),
    ...createDashboardSlice(...a),
  }))
);

export * from './types';
