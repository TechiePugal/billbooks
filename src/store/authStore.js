import { create } from 'zustand';

export const useAuthStore = create((set) => ({
  user: null, // { uid, email, name, photoURL, shopId } — shopId always equals uid
  isInitializing: true,
  setUser: (user) => set({ user, isInitializing: false }),
  clearUser: () => set({ user: null, isInitializing: false })
}));
