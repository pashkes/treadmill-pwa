import { useMemo, useState } from 'react';
import { createAuthService, type SupabaseAuthClient } from '../auth/auth-service';
import { useAuthStore } from '../auth/auth-store';
import { isSupabaseConfigured, supabase } from '../auth/supabase-client';
import { useWorkoutSyncStore } from '../sync/sync-store';
import { useT } from '../../i18n';

export function AccountScreen() {
  const t = useT();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const user = useAuthStore((state) => state.user);
  const loading = useAuthStore((state) => state.loading);
  const error = useAuthStore((state) => state.error);
  const setUser = useAuthStore((state) => state.setUser);
  const setLoading = useAuthStore((state) => state.setLoading);
  const setError = useAuthStore((state) => state.setError);
  const syncStatus = useWorkoutSyncStore((state) => state.status);
  const pendingCount = useWorkoutSyncStore((state) => state.pendingCount);
  const syncError = useWorkoutSyncStore((state) => state.error);
  const authService = useMemo(() => (supabase ? createAuthService(supabase as unknown as SupabaseAuthClient) : null), []);

  async function runAuth(action: 'signIn' | 'signUp') {
    if (!authService) return;

    setLoading(true);
    setError(null);
    try {
      const nextUser = action === 'signIn' ? await authService.signIn(email, password) : await authService.signUp(email, password);
      if (!nextUser) {
        setError(t.account.authNoSession);
        return;
      }
      setUser(nextUser);
      setPassword('');
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : t.account.authFailed);
    } finally {
      setLoading(false);
    }
  }

  async function handleSignOut() {
    if (!authService) return;

    setLoading(true);
    setError(null);
    try {
      await authService.signOut();
      setUser(null);
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : t.account.authFailed);
    } finally {
      setLoading(false);
    }
  }

  const statusLabel =
    syncStatus === 'pending' ? t.account.sync.pending.replace('{count}', String(pendingCount)) : t.account.sync[syncStatus];

  return (
    <main className="min-h-dvh bg-black px-4 pb-28 pt-14 text-white">
      <section className="mx-auto max-w-[720px]">
        <h1 className="text-[28px] font-extrabold tracking-normal">{t.account.title}</h1>
        <p className="mt-2 text-sm font-semibold leading-relaxed text-neutral-400">{t.account.optional}</p>

        {!isSupabaseConfigured ? (
          <div className="mt-5 rounded-[18px] border border-[#F06A1D]/35 bg-[#F06A1D]/10 p-4 text-sm font-semibold text-[#F06A1D]">
            {t.account.unconfigured}
          </div>
        ) : null}

        <section className="mt-5 rounded-[20px] bg-neutral-900 p-4">
          {user ? (
            <div>
              <div className="text-xs font-bold uppercase tracking-[1px] text-neutral-500">{t.account.signedInAs}</div>
              <div className="mt-2 break-all text-lg font-extrabold">{user.email}</div>
              <div className="mt-4 rounded-[14px] bg-neutral-800 px-3 py-2.5">
                <div className="text-xs font-bold uppercase tracking-[1px] text-neutral-500">{t.account.sync.title}</div>
                <div className="mt-1 text-sm font-bold text-white">{statusLabel}</div>
                {syncError ? <div className="mt-1 text-xs font-semibold text-red-400">{syncError}</div> : null}
              </div>
              <button
                type="button"
                className="mt-4 w-full rounded-[16px] border border-neutral-700 bg-neutral-950 px-4 py-3 text-sm font-extrabold text-neutral-300 disabled:opacity-50"
                disabled={loading || !authService}
                onClick={() => void handleSignOut()}
              >
                {loading ? t.account.loading : t.account.signOut}
              </button>
            </div>
          ) : (
            <form className="space-y-3" onSubmit={(event) => event.preventDefault()}>
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[1px] text-neutral-500">{t.account.email}</span>
                <input
                  className="mt-1.5 w-full rounded-[14px] border border-neutral-800 bg-neutral-950 px-3 py-3 text-base font-semibold outline-none focus:border-[#5B5BF6]"
                  type="email"
                  autoComplete="email"
                  value={email}
                  disabled={!authService || loading}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </label>
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[1px] text-neutral-500">{t.account.password}</span>
                <input
                  className="mt-1.5 w-full rounded-[14px] border border-neutral-800 bg-neutral-950 px-3 py-3 text-base font-semibold outline-none focus:border-[#5B5BF6]"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  disabled={!authService || loading}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </label>
              {error ? <div className="rounded-[14px] bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-400">{error}</div> : null}
              <button
                type="button"
                className="w-full rounded-[16px] bg-[#5B5BF6] px-4 py-3 text-sm font-extrabold text-white disabled:opacity-50"
                disabled={!authService || loading || !email || !password}
                onClick={() => void runAuth('signIn')}
              >
                {loading ? t.account.loading : t.account.signIn}
              </button>
              <button
                type="button"
                className="w-full rounded-[16px] border border-neutral-700 bg-neutral-950 px-4 py-3 text-sm font-extrabold text-neutral-300 disabled:opacity-50"
                disabled={!authService || loading || !email || !password}
                onClick={() => void runAuth('signUp')}
              >
                {t.account.createAccount}
              </button>
            </form>
          )}
        </section>
      </section>
    </main>
  );
}
