import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '../auth/auth-store';
import { useWorkoutSync } from './use-workout-sync';

const mocks = vi.hoisted(() => ({
  authService: {
    loadSession: vi.fn(),
    onAuthStateChange: vi.fn(),
  },
  remoteApi: {},
  syncWorkouts: vi.fn(),
}));

vi.mock('../auth/supabase-client', () => ({
  isSupabaseConfigured: true,
  supabase: { from: vi.fn() },
}));

vi.mock('../auth/auth-service', () => ({
  createAuthService: vi.fn(() => mocks.authService),
}));

vi.mock('./supabase-workout-api', () => ({
  createSupabaseWorkoutApi: vi.fn(() => mocks.remoteApi),
}));

vi.mock('./workout-sync', () => ({
  syncWorkouts: mocks.syncWorkouts,
}));

describe('useWorkoutSync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
    useAuthStore.setState({ user: null, loading: true, error: null });
    mocks.authService.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });
    mocks.syncWorkouts.mockResolvedValue(undefined);
  });

  it('syncs on online events when signed in', async () => {
    mocks.authService.loadSession.mockResolvedValue({ userId: 'user-a', email: 'a@example.com' });
    const { unmount } = renderHook(() => useWorkoutSync());

    await waitFor(() => expect(mocks.syncWorkouts).toHaveBeenCalledWith({ userId: 'user-a', remote: mocks.remoteApi }));
    mocks.syncWorkouts.mockClear();

    window.dispatchEvent(new Event('online'));

    await waitFor(() => expect(mocks.syncWorkouts).toHaveBeenCalledWith({ userId: 'user-a', remote: mocks.remoteApi }));
    unmount();
  });

  it('does not sync on online events when signed out', async () => {
    mocks.authService.loadSession.mockResolvedValue(null);
    const { unmount } = renderHook(() => useWorkoutSync());

    await waitFor(() => expect(useAuthStore.getState().loading).toBe(false));
    window.dispatchEvent(new Event('online'));

    expect(mocks.syncWorkouts).not.toHaveBeenCalled();
    unmount();
  });
});
