import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider } from '@tanstack/react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { router } from '../../app/router';
import { useAppStore } from '../../app/app-store';
import { db } from '../../db/app-db';
import { useLiveStore } from './live-store';

describe('LiveScreen', () => {
  beforeEach(async () => {
    await router.navigate({ to: '/live' });
    await db.workouts.clear();
    window.localStorage.clear();
    useAppStore.setState({
      screen: 'live',
      selectedWorkoutId: null,
      statsPeriod: 'week',
      toast: { message: '', visible: false },
      locale: 'ru',
    });
    useLiveStore.setState({
      isConnected: true,
      deviceName: 'SW / T30EA-0227',
      isPaused: false,
      startedDate: '2026-06-14',
      startedAt: '12:00',
      ftmsConnection: null,
      seconds: 278,
      speedKph: 6,
      maxSpeed: 6,
      km: 0.4,
      kcal: 38,
      steps: 512,
      inclinePercent: 2.5,
      hasStartedMoving: true,
      autoStopRequested: false,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows pace from elapsed time and distance instead of current speed', () => {
    render(<RouterProvider router={router} />);

    expect(screen.getByText(`11'35"`)).toBeVisible();
    expect(screen.getByText('2.5')).toBeVisible();
  });

  it('removes broken speed controls and confirms manual finish', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<RouterProvider router={router} />);

    expect(screen.queryByRole('button', { name: 'Уменьшить скорость' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Увеличить скорость' })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Завершить тренировку' }));

    expect(confirm).toHaveBeenCalledWith('Завершить и сохранить тренировку?');
    expect(await db.workouts.count()).toBe(0);
    expect(router.state.location.pathname).toBe('/live');
  });

  it('saves automatically when the treadmill stop event is received', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    useLiveStore.setState({ autoStopRequested: true });

    render(<RouterProvider router={router} />);

    await waitFor(async () => {
      expect(await db.workouts.count()).toBe(1);
    });
    expect(confirm).not.toHaveBeenCalled();
    expect(router.state.location.pathname).toBe('/');
  });
});
