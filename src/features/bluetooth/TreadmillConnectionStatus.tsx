import { Bluetooth, BluetoothConnected } from 'lucide-react';
import { useT } from '../../i18n';
import { useLiveStore } from '../live/live-store';

type TreadmillConnectionStatusProps = {
  compact?: boolean;
};

export function TreadmillConnectionStatus({ compact = false }: TreadmillConnectionStatusProps) {
  const t = useT();
  const connectionStatus = useLiveStore((state) => state.connectionStatus);
  const connectionError = useLiveStore((state) => state.connectionError);
  const deviceName = useLiveStore((state) => state.deviceName);

  const Icon = connectionStatus === 'connected' ? BluetoothConnected : Bluetooth;
  const label = connectionLabel(t.bluetooth, connectionStatus, connectionError, deviceName);

  return (
    <div className={`flex min-w-0 items-center ${compact ? 'gap-1.5 text-[11px]' : 'gap-2 text-sm'} font-semibold text-neutral-300`}>
      <span className={`shrink-0 rounded-full ${compact ? 'h-2 w-2' : 'h-2.5 w-2.5'} ${dotColor(connectionStatus)}`} />
      <Icon aria-hidden="true" className={`shrink-0 ${compact ? 'h-3.5 w-3.5' : 'h-4 w-4'}`} />
      <span className="truncate">{label}</span>
    </div>
  );
}

type BluetoothMessages = ReturnType<typeof useT>['bluetooth'];
type ConnectionStatus = ReturnType<typeof useLiveStore.getState>['connectionStatus'];
type ConnectionError = ReturnType<typeof useLiveStore.getState>['connectionError'];

function connectionLabel(
  bluetooth: BluetoothMessages,
  connectionStatus: ConnectionStatus,
  connectionError: ConnectionError,
  deviceName: string | null,
): string {
  if (connectionStatus === 'connected') return deviceName ?? bluetooth.connected;
  if (connectionStatus === 'connecting') return bluetooth.connecting;
  if (connectionStatus === 'error') {
    return connectionError && connectionError in bluetooth ? bluetooth[connectionError as keyof BluetoothMessages] : bluetooth.error;
  }
  return bluetooth.disconnected;
}

function dotColor(connectionStatus: ConnectionStatus): string {
  if (connectionStatus === 'connected') return 'bg-green-500 shadow-[0_0_8px_#30D158]';
  if (connectionStatus === 'connecting') return 'bg-[#5B8AF6] shadow-[0_0_8px_#5B8AF6]';
  if (connectionStatus === 'error') return 'bg-red-500';
  return 'bg-neutral-500';
}
