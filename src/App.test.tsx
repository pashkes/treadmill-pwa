import { render, screen } from '@testing-library/react';
import { RouterProvider } from '@tanstack/react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAppStore } from './app/app-store';
import { router } from './app/router';
import { db } from './db/app-db';
import { connectRememberedFtmsDevice } from './features/bluetooth/ftms';
import { useLiveStore } from './features/live/live-store';

vi.mock('./features/bluetooth/ftms', () => ({
  connectRememberedFtmsDevice: vi.fn(),
}));

describe('App', () => {
  beforeEach(async () => {
    await router.navigate({ to: '/' });
    await db.workouts.clear();
    window.localStorage.clear();
    vi.mocked(connectRememberedFtmsDevice).mockReset();
    useAppStore.setState({
      screen: 'home',
      statsPeriod: 'week',
      toast: { message: '', visible: false },
      locale: 'ru',
    });
    useLiveStore.setState({
      isConnected: false,
      deviceName: null,
      connectionStatus: 'disconnected',
      connectionError: null,
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

  function persistActiveWorkout() {
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
      restoredFromStorage: false,
      autoStopRequested: false,
    });
  }

  it('restores active workout data without forcing the live screen on refresh', async () => {
    persistActiveWorkout();

    render(<RouterProvider router={router} />);

    expect(await screen.findByText('Workout')).toBeVisible();
    expect(screen.getByRole('status')).toHaveTextContent('Тренировка восстановлена. Подключите дорожку заново');
    expect(router.state.location.pathname).toBe('/');
    expect(useLiveStore.getState().seconds).toBe(278);
    expect(useLiveStore.getState().deviceName).toBe('Blue treadmill');
  });

  it('translates the restored workout toast and keeps it away from the live header', async () => {
    useAppStore.setState({ locale: 'en' });
    persistActiveWorkout();

    render(<RouterProvider router={router} />);

    expect(await screen.findByText('Workout')).toBeVisible();
    expect(screen.getByRole('status')).toHaveTextContent('Workout restored. Reconnect treadmill');
    expect(screen.getByRole('status')).toHaveClass('bottom-[calc(env(safe-area-inset-bottom)+24px)]');
  });

  it('auto-connects a remembered treadmill on startup without redirecting', async () => {
    await router.navigate({ to: '/stats' });
    window.localStorage.setItem(
      'walking-app-remembered-treadmill',
      JSON.stringify({ id: 'device-1', name: 'Saved treadmill', rememberedAt: new Date().toISOString() }),
    );
    vi.mocked(connectRememberedFtmsDevice).mockResolvedValue({
      deviceId: 'device-1',
      deviceName: 'Blue treadmill',
      startWorkout: vi.fn(),
      stopWorkout: vi.fn(),
      writeSpeed: vi.fn(),
      disconnect: vi.fn(),
    });

    render(<RouterProvider router={router} />);

    expect(await screen.findByRole('heading', { name: 'Статистика' })).toBeVisible();
    expect(connectRememberedFtmsDevice).toHaveBeenCalledWith('device-1', expect.any(Function), expect.any(Function));
    expect(useLiveStore.getState().isConnected).toBe(true);
    expect(useLiveStore.getState().deviceName).toBe('Blue treadmill');
    expect(router.state.location.pathname).toBe('/stats');
  });

  it('disconnects a remembered treadmill connection that resolves after unmount', async () => {
    window.localStorage.setItem(
      'walking-app-remembered-treadmill',
      JSON.stringify({ id: 'device-1', name: 'Saved treadmill', rememberedAt: new Date().toISOString() }),
    );
    let resolveConnection: (connection: Awaited<ReturnType<typeof connectRememberedFtmsDevice>>) => void = () => undefined;
    vi.mocked(connectRememberedFtmsDevice).mockReturnValue(
      new Promise((resolve) => {
        resolveConnection = resolve;
      }),
    );
    const disconnect = vi.fn();

    const view = render(<RouterProvider router={router} />);
    view.unmount();
    resolveConnection({
      deviceId: 'device-1',
      deviceName: 'Blue treadmill',
      startWorkout: vi.fn(),
      stopWorkout: vi.fn(),
      writeSpeed: vi.fn(),
      disconnect,
    });

    await vi.waitFor(() => {
      expect(disconnect).toHaveBeenCalledOnce();
    });
  });
});
