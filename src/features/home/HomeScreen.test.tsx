import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider } from '@tanstack/react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { router } from '../../app/router';
import { useAppStore } from '../../app/app-store';
import { db } from '../../db/app-db';
import { useLiveStore } from '../live/live-store';

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

  it('keeps GO disabled until the treadmill is connected', () => {
    render(<RouterProvider router={router} />);

    expect(screen.getByRole('button', { name: 'GO' })).toBeDisabled();
  });

  it('starts a live workout after the treadmill is connected', async () => {
    useLiveStore.getState().setConnection(true, 'Blue treadmill');
    render(<RouterProvider router={router} />);

    await userEvent.click(screen.getByRole('button', { name: 'GO' }));

    expect(router.state.location.pathname).toBe('/live');
    expect(useLiveStore.getState().startedAt).not.toBeNull();
  });
});
