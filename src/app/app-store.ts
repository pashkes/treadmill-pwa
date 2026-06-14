import { create } from 'zustand';
import type { StatsPeriod } from '../domain/stats';

export type ScreenName = 'home' | 'stats' | 'history' | 'detail' | 'live';

type ToastState = {
  message: string;
  visible: boolean;
};

type AppState = {
  screen: ScreenName;
  selectedWorkoutId: number | null;
  statsPeriod: StatsPeriod;
  toast: ToastState;
  showScreen: (screen: ScreenName) => void;
  showWorkoutDetail: (id: number) => void;
  setStatsPeriod: (period: StatsPeriod) => void;
  showToast: (message: string) => void;
  hideToast: () => void;
};

export const useAppStore = create<AppState>((set) => ({
  screen: 'home',
  selectedWorkoutId: null,
  statsPeriod: 'week',
  toast: { message: '', visible: false },
  showScreen: (screen) => set({ screen }),
  showWorkoutDetail: (id) => set({ selectedWorkoutId: id, screen: 'detail' }),
  setStatsPeriod: (statsPeriod) => set({ statsPeriod }),
  showToast: (message) => set({ toast: { message, visible: true } }),
  hideToast: () => set((state) => ({ toast: { ...state.toast, visible: false } })),
}));
