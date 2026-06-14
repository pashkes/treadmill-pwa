import { useEffect } from 'react';
import { Outlet, useNavigate, useRouterState } from '@tanstack/react-router';
import { useAppStore } from './app/app-store';
import { migrateLegacyLocalStorageWorkouts } from './db/workout-repository';
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
  const showToast = useAppStore((state) => state.showToast);
  const showScreen = useAppStore((state) => state.showScreen);
  const restoreActiveWorkout = useLiveStore((state) => state.restoreActiveWorkout);
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  useEffect(() => {
    migrateLegacyLocalStorageWorkouts().catch((error) => {
      console.error(error);
      showToast('Не удалось перенести старые тренировки');
    });
  }, [showToast]);

  useEffect(() => {
    if (!restoreActiveWorkout()) return;
    showScreen('live');
    void navigate({ to: '/live' });
    showToast('Тренировка восстановлена. Подключите дорожку заново');
  }, [navigate, restoreActiveWorkout, showScreen, showToast]);

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
