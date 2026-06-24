import type { StoreSlice, SessionSlice } from '../types';

export const createSessionSlice: StoreSlice<SessionSlice> = (set) => ({
  session: null,
  setSession: (session) => set({ session }),
});
