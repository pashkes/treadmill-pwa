/// <reference types="vite/client" />

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface WindowEventMap {
  beforeinstallprompt: BeforeInstallPromptEvent;
  appinstalled: Event;
}

interface Navigator {
  bluetooth?: {
    requestDevice(options: RequestDeviceOptions): Promise<BluetoothDevice>;
    getDevices?: () => Promise<BluetoothDevice[]>;
  };
}

type RequestDeviceOptions = {
  filters?: Array<{ services?: string[] }>;
  optionalServices?: string[];
};

type BluetoothDevice = EventTarget & {
  id: string;
  name?: string;
  gatt?: BluetoothRemoteGATTServer;
  forget?: () => Promise<void>;
};

type BluetoothRemoteGATTServer = {
  connected: boolean;
  connect(): Promise<BluetoothRemoteGATTServer>;
  disconnect(): void;
  getPrimaryService(service: string): Promise<BluetoothRemoteGATTService>;
};

type BluetoothRemoteGATTService = {
  getCharacteristic(characteristic: string): Promise<BluetoothRemoteGATTCharacteristic>;
};

type BluetoothRemoteGATTCharacteristic = EventTarget & {
  startNotifications(): Promise<BluetoothRemoteGATTCharacteristic>;
  stopNotifications(): Promise<BluetoothRemoteGATTCharacteristic>;
  writeValueWithoutResponse(value: BufferSource): Promise<void>;
};
