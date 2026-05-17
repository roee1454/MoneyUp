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
};

export const useAppStore = create<AppState>((set) => ({
  session: null,
  setSession: (session) => set({ session }),
}));
