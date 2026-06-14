import { useEffect } from 'react';
import { useAppStore } from './app/app-store';
import { migrateLegacyLocalStorageWorkouts } from './db/workout-repository';
import { HomeScreen } from './features/home/HomeScreen';
import { LiveScreen } from './features/live/LiveScreen';
import { StatsScreen } from './features/stats/StatsScreen';
import { HistoryScreen } from './features/workouts/HistoryScreen';
import { WorkoutDetailScreen } from './features/workouts/WorkoutDetailScreen';
import { TabBar } from './ui/TabBar';
import { Toast } from './ui/Toast';

export function App() {
  const screen = useAppStore((state) => state.screen);
  const showToast = useAppStore((state) => state.showToast);

  useEffect(() => {
    migrateLegacyLocalStorageWorkouts().catch((error) => {
      console.error(error);
      showToast('Не удалось перенести старые тренировки');
    });
  }, [showToast]);

  return (
    <div className="min-h-dvh bg-black text-white">
      {screen === 'home' && <HomeScreen />}
      {screen === 'live' && <LiveScreen />}
      {screen === 'stats' && <StatsScreen />}
      {screen === 'history' && <HistoryScreen />}
      {screen === 'detail' && <WorkoutDetailScreen />}
      <TabBar />
      <Toast />
    </div>
  );
}
