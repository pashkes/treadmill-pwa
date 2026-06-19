import { useCallback, useEffect, useMemo } from 'react';
import { syncStatusFromCounts } from '../../domain/sync';
import { createAuthService } from '../auth/auth-service';
import { useAuthStore } from '../auth/auth-store';
import { isSupabaseConfigured, supabase } from '../auth/supabase-client';
import { listWorkoutsForSync } from '../../db/workout-repository';
import { createSupabaseWorkoutApi, type SupabaseWorkoutClient } from './supabase-workout-api';
import { syncWorkouts } from './workout-sync';
import { useWorkoutSyncStore } from './sync-store';

export function useWorkoutSync(): void {
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const setAuthLoading = useAuthStore((state) => state.setLoading);
  const setAuthError = useAuthStore((state) => state.setError);
  const localChangeVersion = useWorkoutSyncStore((state) => state.localChangeVersion);
  const setSyncing = useWorkoutSyncStore((state) => state.setSyncing);
  const setSyncResult = useWorkoutSyncStore((state) => state.setResult);

  const authService = useMemo(() => (supabase ? createAuthService(supabase) : null), []);
  const remote = useMemo(() => (supabase ? createSupabaseWorkoutApi(supabase as unknown as SupabaseWorkoutClient) : null), []);

  const updateIdleStatus = useCallback(
    async (userId: string) => {
      const pending = await listWorkoutsForSync(userId);
      const errors = pending.filter((workout) => workout.syncStatus === 'error').length;
      setSyncResult(
        syncStatusFromCounts({ isOnline: navigator.onLine, isSyncing: false, pending: pending.length, errors }),
        pending.length,
      );
    },
    [setSyncResult],
  );

  const runSync = useCallback(
    async (userId: string | null | undefined) => {
      if (!isSupabaseConfigured || !remote || !userId) return;
      if (!navigator.onLine) {
        setSyncResult('offline', 0);
        return;
      }

      setSyncing();
      try {
        await syncWorkouts({ userId, remote });
        await updateIdleStatus(userId);
      } catch (error) {
        setSyncResult('error', 1, error instanceof Error ? error.message : 'Sync failed');
      }
    },
    [remote, setSyncResult, setSyncing, updateIdleStatus],
  );

  useEffect(() => {
    if (!isSupabaseConfigured || !authService) {
      setAuthLoading(false);
      return;
    }

    let cancelled = false;
    setAuthLoading(true);
    void authService
      .loadSession()
      .then((nextUser) => {
        if (cancelled) return;
        setUser(nextUser);
        setAuthError(null);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setAuthError(error instanceof Error ? error.message : 'Failed to load session');
      })
      .finally(() => {
        if (!cancelled) setAuthLoading(false);
      });

    const subscription = authService.onAuthStateChange((nextUser) => {
      setUser(nextUser);
      setAuthError(null);
      setAuthLoading(false);
    });

    return () => {
      cancelled = true;
      subscription.data.subscription.unsubscribe();
    };
  }, [authService, setAuthError, setAuthLoading, setUser]);

  useEffect(() => {
    void runSync(user?.userId);
  }, [localChangeVersion, runSync, user?.userId]);

  useEffect(() => {
    function handleOnline() {
      void runSync(user?.userId);
    }

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [runSync, user?.userId]);
}
