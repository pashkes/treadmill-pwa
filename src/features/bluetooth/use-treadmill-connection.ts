import { useCallback, useEffect, useRef } from 'react';
import { useAppStore } from '../../app/app-store';
import { useT } from '../../i18n';
import { useLiveStore } from '../live/live-store';
import { FtmsConnectionError, connectFtms, connectRememberedFtmsDevice, type FtmsConnectionErrorCode } from './ftms';
import { clearRememberedTreadmill, readRememberedTreadmill, rememberTreadmill } from './remembered-treadmill-storage';

type HomeMessages = ReturnType<typeof useT>['home'];

function connectionErrorMessage(home: HomeMessages, code: FtmsConnectionErrorCode): string {
  return code in home ? String(home[code as keyof HomeMessages]) : home.connectFailed;
}

export async function forgetRememberedTreadmill(): Promise<void> {
  await Promise.resolve();
  clearRememberedTreadmill();
}

export function useTreadmillConnection() {
  const t = useT();
  const showToast = useAppStore((state) => state.showToast);
  const isConnected = useLiveStore((state) => state.isConnected);
  const ftmsConnection = useLiveStore((state) => state.ftmsConnection);
  const setConnection = useLiveStore((state) => state.setConnection);
  const setConnectionStatus = useLiveStore((state) => state.setConnectionStatus);
  const setFtmsConnection = useLiveStore((state) => state.setFtmsConnection);
  const setTreadmillData = useLiveStore((state) => state.setTreadmillData);

  const cleanupDisconnected = useCallback(() => {
    setFtmsConnection(null);
    setConnection(false, null);
    showToast(t.home.disconnectedToast);
  }, [setConnection, setFtmsConnection, showToast, t]);

  const disconnect = useCallback(() => {
    ftmsConnection?.disconnect();
    cleanupDisconnected();
  }, [cleanupDisconnected, ftmsConnection]);

  const connect = useCallback(async () => {
    setConnectionStatus('connecting');

    try {
      const connection = await connectFtms(
        (data) => setTreadmillData(data),
        () => cleanupDisconnected(),
      );
      setFtmsConnection(connection);
      setConnection(true, connection.deviceName);
      if (connection.deviceId) {
        rememberTreadmill({ id: connection.deviceId, name: connection.deviceName });
      }
      showToast(t.home.connected);
    } catch (error) {
      setFtmsConnection(null);
      if (error instanceof FtmsConnectionError) {
        setConnectionStatus('error', error.code);
        showToast(connectionErrorMessage(t.home, error.code));
        return;
      }
      setConnectionStatus('error', 'connectFailed');
      showToast(t.home.connectFailed);
    }
  }, [cleanupDisconnected, setConnection, setConnectionStatus, setFtmsConnection, setTreadmillData, showToast, t]);

  const toggleConnection = useCallback(async () => {
    if (isConnected) {
      disconnect();
      return;
    }

    await connect();
  }, [connect, disconnect, isConnected]);

  return {
    connect,
    disconnect,
    toggleConnection,
  };
}

export function useAutoConnectTreadmill(): void {
  const t = useT();
  const attemptedRef = useRef(false);
  const showToast = useAppStore((state) => state.showToast);
  const setConnection = useLiveStore((state) => state.setConnection);
  const setConnectionStatus = useLiveStore((state) => state.setConnectionStatus);
  const setFtmsConnection = useLiveStore((state) => state.setFtmsConnection);
  const setTreadmillData = useLiveStore((state) => state.setTreadmillData);

  const cleanupDisconnected = useCallback(() => {
    setFtmsConnection(null);
    setConnection(false, null);
    showToast(t.home.disconnectedToast);
  }, [setConnection, setFtmsConnection, showToast, t]);

  useEffect(() => {
    if (attemptedRef.current) return;
    attemptedRef.current = true;

    const remembered = readRememberedTreadmill();
    if (!remembered) return;

    let cancelled = false;
    setConnectionStatus('connecting');

    connectRememberedFtmsDevice(
      remembered.id,
      (data) => setTreadmillData(data),
      () => cleanupDisconnected(),
    )
      .then((connection) => {
        if (cancelled) {
          connection.disconnect();
          return;
        }
        setFtmsConnection(connection);
        setConnection(true, connection.deviceName ?? remembered.name);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setFtmsConnection(null);
        if (error instanceof FtmsConnectionError) {
          setConnectionStatus('error', error.code);
          return;
        }
        setConnectionStatus('error', 'connectFailed');
      });

    return () => {
      cancelled = true;
    };
  }, [cleanupDisconnected, setConnection, setConnectionStatus, setFtmsConnection, setTreadmillData]);
}
