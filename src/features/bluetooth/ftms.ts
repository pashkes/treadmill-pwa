export const FTMS_SERVICE = '00001826-0000-1000-8000-00805f9b34fb';
export const TREADMILL_DATA_CHARACTERISTIC = '00002acd-0000-1000-8000-00805f9b34fb';

export type TreadmillData = {
  speedKph?: number;
  distanceKm?: number;
};

export type FtmsConnection = {
  deviceName: string;
  writeSpeed: (speedKph: number) => Promise<void>;
  disconnect: () => void;
};

type GattCharacteristicEvent = Event & {
  target: EventTarget & {
    value?: DataView;
  };
};

function canRead(value: DataView, offset: number, bytes: number): boolean {
  return offset + bytes <= value.byteLength;
}

export function parseTreadmillData(value: DataView): TreadmillData {
  if (!canRead(value, 0, 2)) return {};

  const flags = value.getUint16(0, true);
  let offset = 2;
  const data: TreadmillData = {};

  if (!(flags & 0x0001) && canRead(value, offset, 2)) {
    data.speedKph = value.getUint16(offset, true) * 0.01;
    offset += 2;
  }

  if (flags & 0x0002) offset += 2; // average speed

  if ((flags & 0x0004) && canRead(value, offset, 3)) {
    data.distanceKm = (value.getUint8(offset) | (value.getUint8(offset + 1) << 8) | (value.getUint8(offset + 2) << 16)) / 1000;
  }

  return data;
}

export async function connectFtms(onData: (data: TreadmillData) => void, onDisconnect: () => void): Promise<FtmsConnection> {
  if (!navigator.bluetooth) {
    throw new Error('Нужен Chrome (Android / Desktop)');
  }

  const device = await navigator.bluetooth.requestDevice({
    filters: [{ services: [FTMS_SERVICE] }],
    optionalServices: [FTMS_SERVICE],
  });
  device.addEventListener('gattserverdisconnected', onDisconnect);

  const server = await device.gatt?.connect();
  if (!server) throw new Error('Не удалось подключиться к дорожке');

  const service = await server.getPrimaryService(FTMS_SERVICE);
  const treadmillData = await service.getCharacteristic(TREADMILL_DATA_CHARACTERISTIC);
  await treadmillData.startNotifications();
  treadmillData.addEventListener('characteristicvaluechanged', (event: Event) => {
    const value = (event as GattCharacteristicEvent).target.value;
    if (value) onData(parseTreadmillData(value));
  });

  return {
    deviceName: device.name || 'Дорожка',
    writeSpeed: async (speedKph: number) => {
      const buffer = new ArrayBuffer(3);
      const view = new DataView(buffer);
      view.setUint8(0, 0x02);
      view.setUint16(1, Math.round(speedKph * 100), true);
      await treadmillData.writeValueWithoutResponse(buffer);
    },
    disconnect: () => {
      try {
        void treadmillData.stopNotifications();
      } catch {
        // Ignore disconnect cleanup races.
      }
      if (device.gatt?.connected) device.gatt.disconnect();
      device.removeEventListener('gattserverdisconnected', onDisconnect);
    },
  };
}
