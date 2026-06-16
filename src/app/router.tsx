import { createRootRoute, createRoute, createRouter } from '@tanstack/react-router';
import { App } from '../App';
import { HomeScreen } from '../features/home/HomeScreen';
import { LiveScreen } from '../features/live/LiveScreen';
import { StatsScreen } from '../features/stats/StatsScreen';
import { HistoryScreen } from '../features/workouts/HistoryScreen';
import { WorkoutDetailScreen } from '../features/workouts/WorkoutDetailScreen';

const rootRoute = createRootRoute({
  component: App,
});

const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: HomeScreen,
});

const liveRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/live',
  component: LiveScreen,
});

const statsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/stats',
  component: StatsScreen,
});

const historyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/history',
  component: HistoryScreen,
});

const workoutDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/workouts/$workoutId',
  component: WorkoutDetailRoute,
});

function WorkoutDetailRoute() {
  const { workoutId } = workoutDetailRoute.useParams();

  return <WorkoutDetailScreen workoutId={Number(workoutId)} />;
}

const routeTree = rootRoute.addChildren([homeRoute, liveRoute, statsRoute, historyRoute, workoutDetailRoute]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
