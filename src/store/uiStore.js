import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const THEME_COLORS = ['green', 'blue', 'pink', 'red'];

export const useUiStore = create(
  persist(
    (set) => ({
      theme: 'light', // 'light' | 'dark'
      themeColor: 'green', // one of THEME_COLORS
      toggleTheme: () => set((s) => ({ theme: s.theme === 'light' ? 'dark' : 'light' })),
      setThemeColor: (color) => set({ themeColor: THEME_COLORS.includes(color) ? color : 'green' }),
      isPaymentModalOpen: false,
      openPaymentModal: () => set({ isPaymentModalOpen: true }),
      closePaymentModal: () => set({ isPaymentModalOpen: false })
    }),
    { name: 'foodbill-ui' }
  )
);
