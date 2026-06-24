import type { StoreSlice, DashboardSlice } from '../types';

export const createDashboardSlice: StoreSlice<DashboardSlice> = (set) => ({
  dashboardRange: {
    startDate: null,
    endDate: null,
    committedStartDate: null,
    committedEndDate: null,
  },
  activeConversationId: null,
  setActiveConversationId: (id) => set({ activeConversationId: id }),
  setDashboardRange: (range) =>
    set((state) => ({
      dashboardRange: {
        ...state.dashboardRange,
        ...range,
      },
    })),
});
