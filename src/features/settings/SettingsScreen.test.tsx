import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider } from '@tanstack/react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { router } from '../../app/router';
import { useAppStore } from '../../app/app-store';
import { connectRememberedFtmsDevice } from '../bluetooth/ftms';
import { useLiveStore } from '../live/live-store';
import type * as FtmsModule from '../bluetooth/ftms';

vi.mock('../bluetooth/ftms', async (importOriginal) => {
  const actual = await importOriginal<typeof FtmsModule>();
  return {
    ...actual,
    connectRememberedFtmsDevice: vi.fn(),
  };
});

describe('SettingsScreen', () => {
  beforeEach(async () => {
    await router.navigate({ to: '/settings' });
    window.localStorage.clear();
    vi.restoreAllMocks();
    vi.mocked(connectRememberedFtmsDevice).mockResolvedValue({
      deviceId: 'device-1',
      deviceName: 'Blue treadmill',
      startWorkout: vi.fn(),
      stopWorkout: vi.fn(),
      writeSpeed: vi.fn(),
      disconnect: vi.fn(),
    });
    useAppStore.setState({
      screen: 'settings',
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

  it('shows saved treadmill metadata', async () => {
    window.localStorage.setItem(
      'walking-app-remembered-treadmill',
      JSON.stringify({ id: 'device-1', name: 'SW7130EA-0227', rememberedAt: new Date().toISOString() }),
    );

    render(<RouterProvider router={router} />);

    expect(await screen.findByRole('heading', { name: 'Настройки' })).toBeVisible();
    expect(screen.getByText('SW7130EA-0227')).toBeVisible();
  });

  it('forgets saved treadmill', async () => {
    window.localStorage.setItem(
      'walking-app-remembered-treadmill',
      JSON.stringify({ id: 'device-1', name: 'SW7130EA-0227', rememberedAt: new Date().toISOString() }),
    );
    const forget = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'bluetooth', {
      configurable: true,
      value: {
        getDevices: vi.fn().mockResolvedValue([{ id: 'device-1', name: 'SW7130EA-0227', forget }]),
      },
    });
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<RouterProvider router={router} />);

    await userEvent.click(await screen.findByRole('button', { name: 'Удалить сохранённую дорожку' }));

    await waitFor(() => {
      expect(window.localStorage.getItem('walking-app-remembered-treadmill')).toBeNull();
    });
    expect(forget).toHaveBeenCalledOnce();
    expect(screen.getByText('Сохранённой дорожки нет')).toBeVisible();
  });

  it('clears saved treadmill metadata even when browser forget fails', async () => {
    window.localStorage.setItem(
      'walking-app-remembered-treadmill',
      JSON.stringify({ id: 'device-1', name: 'SW7130EA-0227', rememberedAt: new Date().toISOString() }),
    );
    Object.defineProperty(navigator, 'bluetooth', {
      configurable: true,
      value: {
        getDevices: vi.fn().mockRejectedValue(new Error('permission lookup failed')),
      },
    });
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<RouterProvider router={router} />);

    await userEvent.click(await screen.findByRole('button', { name: 'Удалить сохранённую дорожку' }));

    await waitFor(() => {
      expect(window.localStorage.getItem('walking-app-remembered-treadmill')).toBeNull();
    });
    expect(screen.getByText('Сохранённой дорожки нет')).toBeVisible();
  });
});
