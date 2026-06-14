import { useEffect } from 'react';

type ScreenWakeLockSentinel = EventTarget & {
  release(): Promise<void>;
};

type OptionalWakeLockNavigator = {
  wakeLock?: {
    request(type: 'screen'): Promise<ScreenWakeLockSentinel>;
  };
};

export function useScreenWakeLock(): void {
  useEffect(() => {
    let wakeLock: ScreenWakeLockSentinel | null = null;
    let hasWakeLock = false;
    let cancelled = false;

    async function requestWakeLock(): Promise<void> {
      const wakeLockApi = (navigator as unknown as OptionalWakeLockNavigator).wakeLock;
      if (hasWakeLock || !wakeLockApi || document.visibilityState !== 'visible') return;

      try {
        const sentinel = await wakeLockApi.request('screen');
        if (cancelled) {
          void sentinel.release();
          return;
        }
        hasWakeLock = true;
        sentinel.addEventListener('release', () => {
          if (wakeLock === sentinel) {
            wakeLock = null;
            hasWakeLock = false;
          }
        });
        wakeLock = sentinel;
      } catch {
        wakeLock = null;
        hasWakeLock = false;
      }
    }

    function handleVisibilityChange(): void {
      if (document.visibilityState === 'visible' && !cancelled) {
        void requestWakeLock();
      }
    }

    void requestWakeLock();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      void wakeLock?.release();
      wakeLock = null;
      hasWakeLock = false;
    };
  }, []);
}
