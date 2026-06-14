import { render, screen } from '@testing-library/react';
import { RouterProvider } from '@tanstack/react-router';
import { beforeEach, describe, expect, it } from 'vitest';
import { useAppStore } from './app/app-store';
import { router } from './app/router';
import { db } from './db/app-db';
import { useLiveStore } from './features/live/live-store';

describe('App', () => {
  beforeEach(async () => {
    await router.navigate({ to: '/' });
    await db.workouts.clear();
    window.localStorage.clear();
    useAppStore.setState({
      screen: 'home',
      selectedWorkoutId: null,
      statsPeriod: 'week',
      toast: { message: '', visible: false },
    });
    useLiveStore.setState({
      isConnected: false,
      deviceName: null,
      isPaused: false,
      startedDate: null,
      startedAt: null,
      ftmsConnection: null,
      seconds: 0,
      speedKph: 0,
      maxSpeed: 0,
      km: 0,
      kcal: 0,
      steps: 0,
      inclinePercent: 0,
      hasStartedMoving: false,
      autoStopRequested: false,
    });
  });

  it('opens the live screen when an active workout was persisted before refresh', async () => {
    useLiveStore.setState({ isConnected: true, deviceName: 'Blue treadmill' });
    useLiveStore.getState().start();
    useLiveStore.getState().setTreadmillData({ speedKph: 6, distanceKm: 0.4, kcal: 38, elapsedSeconds: 278 });
    useLiveStore.setState({
      isConnected: false,
      deviceName: null,
      startedDate: null,
      startedAt: null,
      seconds: 0,
      speedKph: 0,
      maxSpeed: 0,
      km: 0,
      kcal: 0,
      steps: 0,
      inclinePercent: 0,
      hasStartedMoving: false,
      autoStopRequested: false,
    });

    render(<RouterProvider router={router} />);

    expect(await screen.findByText('Свободная тренировка')).toBeVisible();
    expect(screen.getByText('04:38')).toBeVisible();
    expect(screen.getByText('Blue treadmill')).toBeVisible();
  });
});
