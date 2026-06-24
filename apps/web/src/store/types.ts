import type { StateCreator } from 'zustand';

export type Session = {
  userId: string;
  username: string;
  isAuthenticated: boolean;
  loginTime: string;
};

export interface SessionSlice {
  session: Session | null;
  setSession: (session: Session | null) => void;
}

export interface SyncSlice {
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
  setSync: (patch: Partial<SyncSlice['sync']>) => void;
  resetSync: () => void;
}

export interface DashboardSlice {
  dashboardRange: {
    startDate: string | null;
    endDate: string | null;
    committedStartDate: string | null;
    committedEndDate: string | null;
  };
  activeConversationId: string | null;
  setActiveConversationId: (id: string | null) => void;
  setDashboardRange: (range: Partial<DashboardSlice['dashboardRange']>) => void;
}

export type CombinedState = SessionSlice & SyncSlice & DashboardSlice;

// Creator helper type for slice modules
export type StoreSlice<T> = StateCreator<CombinedState, [['zustand/subscribeWithSelector', never]], [], T>;
