import { useEffect } from 'react';
import { Outlet, useRouterState } from '@tanstack/react-router';
import { useAppStore } from './app/app-store';
import { useT } from './i18n';
import { TabBar } from './ui/TabBar';
import { Toast } from './ui/Toast';
import { useLiveStore } from './features/live/live-store';
import type { ScreenName } from './app/app-store';

function screenFromPath(pathname: string): ScreenName {
  if (pathname === '/live') return 'live';
  if (pathname === '/stats') return 'stats';
  if (pathname === '/history') return 'history';
  if (pathname.startsWith('/workouts/')) return 'detail';
  return 'home';
}

export function App() {
  const t = useT();
  const showToast = useAppStore((state) => state.showToast);
  const showScreen = useAppStore((state) => state.showScreen);
  const restoreActiveWorkout = useLiveStore((state) => state.restoreActiveWorkout);
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  useEffect(() => {
    if (!restoreActiveWorkout()) return;
    showToast(t.live.activeWorkoutRestored);
  }, [restoreActiveWorkout, showToast, t]);

  // One-way sync: URL → Zustand screen state. Navigation always goes through the router.
  useEffect(() => {
    showScreen(screenFromPath(pathname));
  }, [pathname, showScreen]);

  return (
    <div className="min-h-dvh bg-black text-white">
      <Outlet />
      <TabBar />
      <Toast />
    </div>
  );
}
