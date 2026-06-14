import { create } from 'zustand';
import { detectLocale } from '../i18n';
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
  locale: string;
  showScreen: (screen: ScreenName) => void;
  showWorkoutDetail: (id: number) => void;
  setStatsPeriod: (period: StatsPeriod) => void;
  showToast: (message: string) => void;
  hideToast: () => void;
  setLocale: (locale: string) => void;
};

export const useAppStore = create<AppState>((set) => ({
  screen: 'home',
  selectedWorkoutId: null,
  statsPeriod: 'week',
  toast: { message: '', visible: false },
  locale: detectLocale(),
  showScreen: (screen) => set({ screen }),
  showWorkoutDetail: (id) => set({ selectedWorkoutId: id, screen: 'detail' }),
  setStatsPeriod: (statsPeriod) => set({ statsPeriod }),
  showToast: (message) => set({ toast: { message, visible: true } }),
  hideToast: () => set((state) => ({ toast: { ...state.toast, visible: false } })),
  setLocale: (locale) => set({ locale }),
}));
