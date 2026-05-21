import { create } from 'zustand';

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
    rangeStartDate: string | null;
    rangeEndDate: string | null;
    startedAt: string | null;
    updatedAt: string | null;
    visible: boolean;
  };
  setSync: (patch: Partial<AppState['sync']>) => void;
  resetSync: () => void;
};

export const useAppStore = create<AppState>((set) => ({
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
    rangeStartDate: null,
    rangeEndDate: null,
    startedAt: null,
    updatedAt: null,
    visible: false,
  },
  setSync: (patch) =>
    set((state) => ({
      sync: {
        ...state.sync,
        ...patch,
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
        rangeStartDate: null,
        rangeEndDate: null,
        startedAt: null,
        updatedAt: null,
        visible: false,
      },
    }),
}));
