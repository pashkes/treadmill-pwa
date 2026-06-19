import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import type { AuthUser } from './auth-store';

type AuthResponse = {
  data: {
    session: Session | null;
  };
  error: {
    message: string;
  } | null;
};

type AuthSubscriptionResponse = {
  data: {
    subscription: {
      unsubscribe: () => void;
    };
  };
};

export type SupabaseAuthClient = {
  auth: {
    getSession: () => Promise<unknown>;
    signInWithPassword: (credentials: { email: string; password: string }) => Promise<unknown>;
    signUp: (credentials: { email: string; password: string }) => Promise<unknown>;
    signOut: () => Promise<{ error: { message: string } | null }>;
    onAuthStateChange: (callback: (event: AuthChangeEvent, session: Session | null) => void) => AuthSubscriptionResponse;
  };
};

function normalizeSession(session: Session | null): AuthUser | null {
  if (!session?.user) return null;
  return {
    userId: session.user.id,
    email: session.user.email ?? '',
  };
}

function unwrapAuthResponse(response: AuthResponse): AuthUser | null {
  if (response.error) throw new Error(response.error.message);
  return normalizeSession(response.data.session);
}

export function createAuthService(client: SupabaseAuthClient) {
  return {
    async loadSession(): Promise<AuthUser | null> {
      return unwrapAuthResponse((await client.auth.getSession()) as AuthResponse);
    },
    async signIn(email: string, password: string): Promise<AuthUser | null> {
      return unwrapAuthResponse((await client.auth.signInWithPassword({ email, password })) as AuthResponse);
    },
    async signUp(email: string, password: string): Promise<AuthUser | null> {
      return unwrapAuthResponse((await client.auth.signUp({ email, password })) as AuthResponse);
    },
    async signOut(): Promise<void> {
      const { error } = await client.auth.signOut();
      if (error) throw new Error(error.message);
    },
    onAuthStateChange(callback: (user: AuthUser | null) => void) {
      return client.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
        callback(normalizeSession(session));
      });
    },
  };
}
