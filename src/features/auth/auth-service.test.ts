import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createAuthService } from './auth-service';

const client = {
  auth: {
    getSession: vi.fn(),
    signUp: vi.fn(),
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
    onAuthStateChange: vi.fn(),
  },
};

describe('auth service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads the current session', async () => {
    client.auth.getSession.mockResolvedValue({ data: { session: { user: { id: 'user-a', email: 'a@example.com' } } }, error: null });
    const service = createAuthService(client);

    await expect(service.loadSession()).resolves.toEqual({ userId: 'user-a', email: 'a@example.com' });
  });

  it('returns null when there is no current session', async () => {
    client.auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
    const service = createAuthService(client);

    await expect(service.loadSession()).resolves.toBeNull();
  });

  it('signs in with email and password', async () => {
    client.auth.signInWithPassword.mockResolvedValue({
      data: { session: { user: { id: 'user-a', email: 'a@example.com' } } },
      error: null,
    });
    const service = createAuthService(client);

    await expect(service.signIn('a@example.com', 'password123')).resolves.toEqual({ userId: 'user-a', email: 'a@example.com' });
    expect(client.auth.signInWithPassword).toHaveBeenCalledWith({ email: 'a@example.com', password: 'password123' });
  });

  it('signs up with email and password', async () => {
    client.auth.signUp.mockResolvedValue({
      data: { session: { user: { id: 'user-a', email: 'a@example.com' } } },
      error: null,
    });
    const service = createAuthService(client);

    await expect(service.signUp('a@example.com', 'password123')).resolves.toEqual({ userId: 'user-a', email: 'a@example.com' });
    expect(client.auth.signUp).toHaveBeenCalledWith({ email: 'a@example.com', password: 'password123' });
  });

  it('throws Supabase auth errors', async () => {
    client.auth.signInWithPassword.mockResolvedValue({
      data: { session: null },
      error: { message: 'Invalid login credentials' },
    });
    const service = createAuthService(client);

    await expect(service.signIn('a@example.com', 'wrong-password')).rejects.toThrow('Invalid login credentials');
  });
});
