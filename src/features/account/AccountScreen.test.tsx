import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAppStore } from '../../app/app-store';
import { useAuthStore } from '../auth/auth-store';
import { useWorkoutSyncStore } from '../sync/sync-store';
import { AccountScreen } from './AccountScreen';

const mocks = vi.hoisted(() => ({
  configured: true,
  supabase: {},
  authService: {
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
  },
}));

vi.mock('../auth/supabase-client', () => ({
  get isSupabaseConfigured() {
    return mocks.configured;
  },
  get supabase() {
    return mocks.configured ? mocks.supabase : null;
  },
}));

vi.mock('../auth/auth-service', () => ({
  createAuthService: vi.fn(() => mocks.authService),
}));

describe('AccountScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.configured = true;
    useAppStore.setState({ locale: 'en' });
    useAuthStore.setState({ user: null, loading: false, error: null });
    useWorkoutSyncStore.setState({ status: 'synced', pendingCount: 0, error: null, localChangeVersion: 0 });
  });

  it('renders the signed-out email/password form', () => {
    render(<AccountScreen />);

    expect(screen.getByRole('heading', { name: 'Account' })).toBeVisible();
    expect(screen.getByLabelText('Email')).toBeVisible();
    expect(screen.getByLabelText('Password')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Create account' })).toBeVisible();
  });

  it('signs in with email and password', async () => {
    mocks.authService.signIn.mockResolvedValue({ userId: 'user-a', email: 'a@example.com' });
    render(<AccountScreen />);

    await userEvent.type(screen.getByLabelText('Email'), 'a@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'password123');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => expect(mocks.authService.signIn).toHaveBeenCalledWith('a@example.com', 'password123'));
    expect(useAuthStore.getState().user).toEqual({ userId: 'user-a', email: 'a@example.com' });
  });

  it('creates an account with email and password', async () => {
    mocks.authService.signUp.mockResolvedValue({ userId: 'user-a', email: 'a@example.com' });
    render(<AccountScreen />);

    await userEvent.type(screen.getByLabelText('Email'), 'a@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'password123');
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() => expect(mocks.authService.signUp).toHaveBeenCalledWith('a@example.com', 'password123'));
    expect(useAuthStore.getState().user).toEqual({ userId: 'user-a', email: 'a@example.com' });
  });

  it('shows signed-in account and signs out', async () => {
    mocks.authService.signOut.mockResolvedValue(undefined);
    useAuthStore.setState({ user: { userId: 'user-a', email: 'a@example.com' }, loading: false });
    render(<AccountScreen />);

    expect(screen.getByText('a@example.com')).toBeVisible();
    expect(screen.getByText('Synchronized')).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }));

    await waitFor(() => expect(mocks.authService.signOut).toHaveBeenCalled());
    expect(useAuthStore.getState().user).toBeNull();
  });

  it('shows pending sync status', () => {
    useAuthStore.setState({ user: { userId: 'user-a', email: 'a@example.com' }, loading: false });
    useWorkoutSyncStore.setState({ status: 'pending', pendingCount: 3 });

    render(<AccountScreen />);

    expect(screen.getByText('3 changes waiting')).toBeVisible();
  });

  it('shows cloud sync unconfigured state', () => {
    mocks.configured = false;

    render(<AccountScreen />);

    expect(screen.getByText('Cloud sync is not configured on this device.')).toBeVisible();
  });
});
