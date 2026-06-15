import { describe, expect, it, vi } from 'vitest';
import { FtmsConnectionError, connectFtms, connectRememberedFtmsDevice, parseTreadmillData } from './ftms';

function view(bytes: number[]): DataView {
  return new DataView(Uint8Array.from(bytes).buffer);
}

type BluetoothDeviceFixture = {
  device: BluetoothDevice;
  treadmillData: BluetoothRemoteGATTCharacteristic & { value?: DataView };
};

type BluetoothDeviceFixtureOptions = {
  startTreadmillNotifications?: () => Promise<BluetoothRemoteGATTCharacteristic>;
};

function createBluetoothDeviceFixture(
  id = 'device-1',
  name = 'Blue treadmill',
  options: BluetoothDeviceFixtureOptions = {},
): BluetoothDeviceFixture {
  const treadmillData = Object.assign(new EventTarget(), {
    startNotifications: () => options.startTreadmillNotifications?.() ?? Promise.resolve(treadmillData),
    stopNotifications: () => Promise.resolve(treadmillData),
    writeValueWithoutResponse: () => Promise.resolve(),
    value: undefined as DataView | undefined,
  }) satisfies BluetoothRemoteGATTCharacteristic & { value?: DataView };

  const controlPoint = Object.assign(new EventTarget(), {
    startNotifications: () => Promise.resolve(controlPoint),
    stopNotifications: () => Promise.resolve(controlPoint),
    writeValueWithoutResponse: () => Promise.resolve(),
  }) satisfies BluetoothRemoteGATTCharacteristic;

  const service: BluetoothRemoteGATTService = {
    getCharacteristic: (characteristic) =>
      Promise.resolve(characteristic === '00002ad9-0000-1000-8000-00805f9b34fb' ? controlPoint : treadmillData),
  };

  const server: BluetoothRemoteGATTServer = {
    connected: true,
    connect: () => Promise.resolve(server),
    disconnect: () => undefined,
    getPrimaryService: () => Promise.resolve(service),
  };

  const device = Object.assign(new EventTarget(), {
    id,
    name,
    gatt: server,
    forget: () => Promise.resolve(),
  }) satisfies BluetoothDevice;

  return { device, treadmillData };
}

function createBluetoothDevice(id = 'device-1', name = 'Blue treadmill'): BluetoothDevice {
  return createBluetoothDeviceFixture(id, name).device;
}

describe('parseTreadmillData', () => {
  it('parses speed and distance from the basic treadmill packet shape', () => {
    const data = parseTreadmillData(view([0x04, 0x00, 0x58, 0x02, 0xe8, 0x03, 0x00]));

    expect(data).toEqual({ speedKph: 6, distanceKm: 1 });
  });

  it('accounts for optional average speed before total distance', () => {
    const data = parseTreadmillData(view([0x06, 0x00, 0x58, 0x02, 0x20, 0x03, 0xd0, 0x07, 0x00]));

    expect(data).toEqual({ speedKph: 6, distanceKm: 2 });
  });

  it('parses elapsed time and calories when the treadmill reports them', () => {
    const data = parseTreadmillData(view([0x84, 0x04, 0x58, 0x02, 0xe8, 0x03, 0x00, 0x2a, 0x00, 0x00, 0x00, 0x00, 0x7d, 0x00]));

    expect(data).toEqual({ speedKph: 6, distanceKm: 1, kcal: 42, elapsedSeconds: 125 });
  });

  it('parses treadmill inclination when the packet includes angle data', () => {
    const data = parseTreadmillData(view([0x0c, 0x00, 0x58, 0x02, 0xe8, 0x03, 0x00, 0x1f, 0x00, 0x1f, 0x00]));

    expect(data).toEqual({ speedKph: 6, distanceKm: 1, inclinePercent: 3.1 });
  });

  it('omits speed when the treadmill packet does not include instantaneous speed', () => {
    const data = parseTreadmillData(view([0x01, 0x00]));

    expect(data).toEqual({});
  });
});

describe('connectFtms', () => {
  it('throws a typed error when Web Bluetooth is unavailable', async () => {
    Object.defineProperty(navigator, 'bluetooth', {
      value: undefined,
      configurable: true,
    });

    await expect(
      connectFtms(
        () => undefined,
        () => undefined,
      ),
    ).rejects.toMatchObject({
      code: 'bluetoothUnsupported',
    });
    await expect(
      connectFtms(
        () => undefined,
        () => undefined,
      ),
    ).rejects.toBeInstanceOf(FtmsConnectionError);
  });
});

describe('connectRememberedFtmsDevice', () => {
  it('connects to remembered browser-permitted device by id', async () => {
    const { device } = createBluetoothDeviceFixture('device-1', 'Blue treadmill');
    Object.defineProperty(navigator, 'bluetooth', {
      value: {
        getDevices: () => Promise.resolve([device]),
      },
      configurable: true,
    });

    const connection = await connectRememberedFtmsDevice('device-1', () => undefined, () => undefined);

    expect(connection.deviceId).toBe('device-1');
    expect(connection.deviceName).toBe('Blue treadmill');
  });

  it('removes treadmill data listener on disconnect', async () => {
    const { device, treadmillData } = createBluetoothDeviceFixture();
    const onData = vi.fn();
    Object.defineProperty(navigator, 'bluetooth', {
      value: {
        getDevices: () => Promise.resolve([device]),
      },
      configurable: true,
    });

    const connection = await connectRememberedFtmsDevice('device-1', onData, () => undefined);
    treadmillData.value = view([0x00, 0x00, 0x58, 0x02]);
    treadmillData.dispatchEvent(new Event('characteristicvaluechanged'));
    expect(onData).toHaveBeenCalledOnce();

    onData.mockClear();
    connection.disconnect();
    treadmillData.dispatchEvent(new Event('characteristicvaluechanged'));

    expect(onData).not.toHaveBeenCalled();
  });

  it('removes treadmill data listener on device disconnect', async () => {
    const { device, treadmillData } = createBluetoothDeviceFixture();
    const onData = vi.fn();
    const onDisconnect = vi.fn();
    Object.defineProperty(navigator, 'bluetooth', {
      value: {
        getDevices: () => Promise.resolve([device]),
      },
      configurable: true,
    });

    await connectRememberedFtmsDevice('device-1', onData, onDisconnect);
    treadmillData.value = view([0x00, 0x00, 0x58, 0x02]);
    treadmillData.dispatchEvent(new Event('characteristicvaluechanged'));
    expect(onData).toHaveBeenCalledOnce();

    onData.mockClear();
    device.dispatchEvent(new Event('gattserverdisconnected'));
    treadmillData.dispatchEvent(new Event('characteristicvaluechanged'));

    expect(onDisconnect).toHaveBeenCalledOnce();
    expect(onData).not.toHaveBeenCalled();
  });

  it('removes disconnect listener when setup fails', async () => {
    const startFailure = new Error('notification setup failed');
    const { device } = createBluetoothDeviceFixture('device-1', 'Blue treadmill', {
      startTreadmillNotifications: () => Promise.reject(startFailure),
    });
    const onDisconnect = vi.fn();
    Object.defineProperty(navigator, 'bluetooth', {
      value: {
        getDevices: () => Promise.resolve([device]),
      },
      configurable: true,
    });

    await expect(connectRememberedFtmsDevice('device-1', () => undefined, onDisconnect)).rejects.toBe(startFailure);

    device.dispatchEvent(new Event('gattserverdisconnected'));

    expect(onDisconnect).not.toHaveBeenCalled();
  });

  it('throws savedDeviceUnavailable when getDevices is unavailable', async () => {
    Object.defineProperty(navigator, 'bluetooth', {
      value: {},
      configurable: true,
    });

    await expect(connectRememberedFtmsDevice('device-1', () => undefined, () => undefined)).rejects.toMatchObject({
      code: 'savedDeviceUnavailable',
    });
  });

  it('throws savedDeviceNotFound when remembered device is not in getDevices()', async () => {
    Object.defineProperty(navigator, 'bluetooth', {
      value: {
        getDevices: () => Promise.resolve([createBluetoothDevice('other-device')]),
      },
      configurable: true,
    });

    await expect(connectRememberedFtmsDevice('device-1', () => undefined, () => undefined)).rejects.toMatchObject({
      code: 'savedDeviceNotFound',
    });
  });
});
