import { create } from 'zustand';
import { detectLocale } from '../i18n';
import type { SupportedLocale } from '../i18n';
import type { StatsPeriod } from '../domain/stats';

export type ScreenName = 'home' | 'stats' | 'history' | 'detail' | 'live';

type ToastState = {
  message: string;
  visible: boolean;
};

type AppState = {
  screen: ScreenName;
  statsPeriod: StatsPeriod;
  toast: ToastState;
  locale: SupportedLocale;
  showScreen: (screen: ScreenName) => void;
  setStatsPeriod: (period: StatsPeriod) => void;
  showToast: (message: string) => void;
  hideToast: () => void;
  setLocale: (locale: SupportedLocale) => void;
};

export const useAppStore = create<AppState>((set) => ({
  screen: 'home',
  statsPeriod: 'week',
  toast: { message: '', visible: false },
  locale: detectLocale(),
  showScreen: (screen) => set({ screen }),
  setStatsPeriod: (statsPeriod) => set({ statsPeriod }),
  showToast: (message) => set({ toast: { message, visible: true } }),
  hideToast: () => set((state) => ({ toast: { ...state.toast, visible: false } })),
  setLocale: (locale) => set({ locale }),
}));
