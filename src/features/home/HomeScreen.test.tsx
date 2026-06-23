import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider } from '@tanstack/react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { router } from '../../app/router';
import { useAppStore } from '../../app/app-store';
import { db } from '../../db/app-db';
import { useLiveStore } from '../live/live-store';
import { connectFtms } from '../bluetooth/ftms';
import { todayString } from '../../domain/date-time';
import { createWorkoutSyncFields } from '../../domain/workout';

vi.mock('../bluetooth/ftms', () => ({
  connectFtms: vi.fn(),
}));

describe('HomeScreen', () => {
  beforeEach(async () => {
    await router.navigate({ to: '/' });
    await db.workouts.clear();
    window.localStorage.clear();
    useAppStore.setState({
      screen: 'home',
      statsPeriod: 'week',
      toast: { message: '', visible: false },
      locale: 'ru',
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
      restoredFromStorage: false,
      autoStopRequested: false,
    });
  });

  it('keeps GO disabled until the treadmill is connected', () => {
    render(<RouterProvider router={router} />);

    expect(screen.getByRole('button', { name: 'GO' })).toBeDisabled();
  });

  it('shows the summed metrics for all workouts saved today', async () => {
    const today = todayString();
    await db.workouts.bulkPut([
      {
        id: 1,
        ...createWorkoutSyncFields('2026-06-23T08:00:00.000Z'),
        date: today,
        time: '08:00',
        seconds: 600,
        km: 1.2,
        kcal: 100,
        min: 10,
        steps: 1200,
        maxSpeed: 6,
      },
      {
        id: 2,
        ...createWorkoutSyncFields('2026-06-23T20:00:00.000Z'),
        date: today,
        time: '20:00',
        seconds: 1200,
        km: 2.1,
        kcal: 201,
        min: 20,
        steps: 2333,
        maxSpeed: 7,
      },
    ]);

    render(<RouterProvider router={router} />);

    expect(await screen.findByText('301')).toBeInTheDocument();
    expect(screen.getByText('3.30')).toBeInTheDocument();
    expect(screen.getByText('3 533')).toBeInTheDocument();
  });

  it('keeps previous completed workouts in today totals after saving another workout', async () => {
    const today = todayString();
    await db.workouts.put({
      id: 1,
      ...createWorkoutSyncFields('2026-06-23T08:00:00.000Z'),
      date: today,
      time: '08:00',
      seconds: 600,
      km: 1.2,
      kcal: 100,
      min: 10,
      steps: 1200,
      maxSpeed: 6,
    });
    useLiveStore.setState({
      startedDate: today,
      startedAt: '20:00',
      seconds: 1200,
      km: 2.1,
      kcal: 201,
      steps: 2333,
      maxSpeed: 7,
      hasStartedMoving: true,
    });

    await useLiveStore.getState().stopAndSave();
    render(<RouterProvider router={router} />);

    expect(await screen.findByText('301')).toBeInTheDocument();
    expect(screen.getByText('3.30')).toBeInTheDocument();
    expect(screen.getByText('3 533')).toBeInTheDocument();
  });

  it('starts a live workout after the treadmill is connected', async () => {
    useLiveStore.getState().setConnection(true, 'Blue treadmill');
    useAppStore.getState().showToast('Blue treadmill');
    render(<RouterProvider router={router} />);

    await userEvent.click(screen.getByRole('button', { name: 'GO' }));

    expect(router.state.location.pathname).toBe('/live');
    expect(useLiveStore.getState().startedAt).not.toBeNull();
    expect(useAppStore.getState().toast.visible).toBe(false);
  });

  it('shows a generic connected toast instead of duplicating the treadmill model', async () => {
    vi.mocked(connectFtms).mockResolvedValue({
      deviceName: 'SW7130EA-0227',
      startWorkout: vi.fn(),
      stopWorkout: vi.fn(),
      writeSpeed: vi.fn(),
      disconnect: vi.fn(),
    });
    render(<RouterProvider router={router} />);

    await userEvent.click(screen.getByRole('button', { name: 'Подключить' }));

    expect(useLiveStore.getState().deviceName).toBe('SW7130EA-0227');
    expect(useAppStore.getState().toast).toEqual({ message: 'Подключено', visible: true });
  });
});
