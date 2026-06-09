import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

type Session = {
  userId: string;
  username: string;
  isAuthenticated: boolean;
  loginTime: string;
};

type AppState = {
  session: Session | null;
  setSession: (session: Session | null) => void;
  sync: {
    jobId: string | null;
    status: 'idle' | 'running' | 'reconnecting' | 'done' | 'failed';
    phase: string | null;
    serverProgress: number;
    displayProgress: number;
    message: string;
    source: 'initial' | 'manual' | null;
    error: string | null;
    cooldownBlockedUntil: string | null;
    cooldownRemainingMs: number | null;
    rangeStartDate: string | null;
    rangeEndDate: string | null;
    startedAt: string | null;
    updatedAt: string | null;
    visible: boolean;
    challenge: {
      type: string;
      message: string;
      bankId?: string;
    } | null;
    currentlySyncing: string | null;
  };
  dashboardRange: {
    startDate: string | null;
    endDate: string | null;
    committedStartDate: string | null;
    committedEndDate: string | null;
  };
  activeConversationId: string | null;
  setActiveConversationId: (id: string | null) => void;
  setSync: (patch: Partial<AppState['sync']>) => void;
  setDashboardRange: (range: Partial<AppState['dashboardRange']>) => void;
  resetSync: () => void;
};

export const useAppStore = create<AppState>()(
  subscribeWithSelector((set) => ({
    session: null,
    setSession: (session) => set({ session }),
    sync: {
      jobId: null,
      status: 'idle',
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
    },
    dashboardRange: {
      startDate: null,
      endDate: null,
      committedStartDate: null,
      committedEndDate: null,
    },
    activeConversationId: null,
    setActiveConversationId: (id) => set({ activeConversationId: id }),
    setSync: (patch) =>
      set((state) => ({
        sync: {
          ...state.sync,
          ...patch,
        },
      })),
    setDashboardRange: (range) =>
      set((state) => ({
        dashboardRange: {
          ...state.dashboardRange,
          ...range,
        },
      })),
    resetSync: () =>
      set({
        sync: {
          jobId: null,
          status: 'idle',
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
        },
      }),
  }))
);
