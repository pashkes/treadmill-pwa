# Remembered Treadmill Autoconnect Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remember the first manually selected FTMS treadmill, reconnect to it automatically when the app opens, show connection status, and provide a settings screen that can forget the saved device.

**Architecture:** Keep completed workout persistence unchanged. Store only remembered treadmill metadata in `localStorage`; actual Bluetooth permission remains controlled by the browser. Move connection orchestration out of `HomeScreen` into a Bluetooth feature hook/controller so App startup, Home controls, Live status, and Settings use one connection path.

**Tech Stack:** React, TypeScript, Zustand, TanStack Router, Web Bluetooth, Vitest, React Testing Library, Playwright.

---

## External API Constraints

- `navigator.bluetooth.requestDevice()` still requires a user gesture for the first device selection.
- `navigator.bluetooth.getDevices()` can return devices this origin is already allowed to access. It is experimental and not available in every browser.
- `BluetoothDevice.id` is the stable local identifier to match a remembered device.
- `BluetoothDevice.forget()` can revoke browser access where supported. The app must also clear its own local remembered-device metadata.

References:
- MDN `Bluetooth.getDevices()`: https://developer.mozilla.org/en-US/docs/Web/API/Bluetooth/getDevices
- MDN `BluetoothDevice`: https://developer.mozilla.org/en-US/docs/Web/API/BluetoothDevice
- Web Bluetooth draft: https://webbluetoothcg.github.io/web-bluetooth/

## File Structure

- Create `src/features/bluetooth/remembered-treadmill-storage.ts`: localStorage helper for `{ id, name, rememberedAt }`.
- Create `src/features/bluetooth/remembered-treadmill-storage.test.ts`: focused storage tests.
- Modify `src/vite-env.d.ts`: add `navigator.bluetooth.getDevices()`, `BluetoothDevice.id`, and optional `BluetoothDevice.forget()`.
- Modify `src/features/bluetooth/ftms.ts`: split prompted connection from device-based connection and add remembered-device connection.
- Modify `src/features/bluetooth/ftms.test.ts`: test missing Web Bluetooth, missing `getDevices`, no remembered device match, and device-based connection path.
- Modify `src/features/live/live-store.ts`: add runtime connection status fields.
- Modify `src/features/live/live-store.test.ts`: assert status transitions without persisting Bluetooth connection.
- Create `src/features/bluetooth/use-treadmill-connection.ts`: shared manual connect, auto connect, disconnect, and forget actions.
- Create `src/features/bluetooth/TreadmillConnectionStatus.tsx`: reusable status row/chip.
- Modify `src/App.tsx`: trigger one startup auto-connect attempt after active-workout restore logic; do not redirect.
- Modify `src/features/home/HomeScreen.tsx`: replace local `toggleConnect()` with the shared connection hook and status component.
- Modify `src/features/live/LiveScreen.tsx`: show compact connection status in the live header.
- Create `src/features/settings/SettingsScreen.tsx`: settings screen for saved treadmill and forget action.
- Create `src/features/settings/SettingsScreen.test.tsx`: route and forget behavior tests.
- Modify `src/app/app-store.ts`: add `settings` to `ScreenName`.
- Modify `src/app/router.tsx`: add `/settings` route.
- Modify `src/ui/TabBar.tsx`: add Settings tab with a `Settings` lucide icon.
- Modify `src/i18n/ru.ts`, `src/i18n/uk.ts`, `src/i18n/en.ts`: add nav, Bluetooth status, and settings strings.
- Modify `src/App.test.tsx`, `src/features/home/HomeScreen.test.tsx`, `tests/workout-flow.spec.ts`: cover startup reconnect and visible status.

## Behavior Decisions

- First successful manual connect saves the treadmill metadata under `walking-app-remembered-treadmill`.
- App startup attempts autoconnect once when remembered metadata exists and `navigator.bluetooth.getDevices` is available.
- If autoconnect fails because the device is unavailable, out of range, or `getDevices` is unsupported, the app stays usable and shows a disconnected/error status.
- If an active workout is restored after reload, App does not redirect. It restores workout data, shows the restore toast, and the same startup autoconnect attempt runs.
- Settings deletion clears app metadata and calls `device.forget()` for the matching browser-permitted device when the API exists.
- Connection status is visible on Home and Live. Settings shows both the saved device and current connection state.

---

### Task 1: Add Remembered Treadmill Storage

**Files:**
- Create: `src/features/bluetooth/remembered-treadmill-storage.ts`
- Create: `src/features/bluetooth/remembered-treadmill-storage.test.ts`

- [ ] **Step 1: Write the failing storage tests**

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearRememberedTreadmill,
  readRememberedTreadmill,
  rememberTreadmill,
  REMEMBERED_TREADMILL_KEY,
} from './remembered-treadmill-storage';

describe('remembered treadmill storage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('stores and reads remembered treadmill metadata', () => {
    rememberTreadmill({ id: 'device-1', name: 'Blue treadmill' });

    expect(readRememberedTreadmill()).toMatchObject({
      id: 'device-1',
      name: 'Blue treadmill',
    });
    expect(readRememberedTreadmill()?.rememberedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('clears remembered treadmill metadata', () => {
    rememberTreadmill({ id: 'device-1', name: 'Blue treadmill' });

    clearRememberedTreadmill();

    expect(readRememberedTreadmill()).toBeNull();
    expect(window.localStorage.getItem(REMEMBERED_TREADMILL_KEY)).toBeNull();
  });

  it('drops invalid remembered treadmill data', () => {
    window.localStorage.setItem(REMEMBERED_TREADMILL_KEY, '{"name":"missing id"}');

    expect(readRememberedTreadmill()).toBeNull();
    expect(window.localStorage.getItem(REMEMBERED_TREADMILL_KEY)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/features/bluetooth/remembered-treadmill-storage.test.ts`

Expected: FAIL because `remembered-treadmill-storage.ts` does not exist.

- [ ] **Step 3: Implement storage helper**

```ts
export const REMEMBERED_TREADMILL_KEY = 'walking-app-remembered-treadmill';

export type RememberedTreadmill = {
  id: string;
  name: string | null;
  rememberedAt: string;
};

export function rememberTreadmill(device: { id: string; name?: string | null }): void {
  const payload: RememberedTreadmill = {
    id: device.id,
    name: device.name ?? null,
    rememberedAt: new Date().toISOString(),
  };
  window.localStorage.setItem(REMEMBERED_TREADMILL_KEY, JSON.stringify(payload));
}

export function readRememberedTreadmill(): RememberedTreadmill | null {
  const raw = window.localStorage.getItem(REMEMBERED_TREADMILL_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<RememberedTreadmill>;
    if (typeof parsed.id !== 'string' || !parsed.id) {
      clearRememberedTreadmill();
      return null;
    }
    return {
      id: parsed.id,
      name: typeof parsed.name === 'string' ? parsed.name : null,
      rememberedAt: typeof parsed.rememberedAt === 'string' ? parsed.rememberedAt : new Date().toISOString(),
    };
  } catch {
    clearRememberedTreadmill();
    return null;
  }
}

export function clearRememberedTreadmill(): void {
  window.localStorage.removeItem(REMEMBERED_TREADMILL_KEY);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/features/bluetooth/remembered-treadmill-storage.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/bluetooth/remembered-treadmill-storage.ts src/features/bluetooth/remembered-treadmill-storage.test.ts
git commit -m "Add remembered treadmill storage"
```

---

### Task 2: Add Device-Based FTMS Connection

**Files:**
- Modify: `src/vite-env.d.ts`
- Modify: `src/features/bluetooth/ftms.ts`
- Modify: `src/features/bluetooth/ftms.test.ts`

- [ ] **Step 1: Write failing FTMS tests**

Add these tests under `describe('connectFtms', ...)` or a new `describe('remembered FTMS connection', ...)` block:

```ts
import { connectRememberedFtmsDevice } from './ftms';

function createBluetoothDevice(id = 'device-1', name = 'Blue treadmill'): BluetoothDevice {
  const characteristic = new EventTarget() as BluetoothRemoteGATTCharacteristic;
  characteristic.startNotifications = async () => characteristic;
  characteristic.stopNotifications = async () => characteristic;
  characteristic.writeValueWithoutResponse = async () => undefined;

  const service: BluetoothRemoteGATTService = {
    getCharacteristic: async () => characteristic,
  };

  const server: BluetoothRemoteGATTServer = {
    connected: true,
    connect: async () => server,
    disconnect: () => undefined,
    getPrimaryService: async () => service,
  };

  return Object.assign(new EventTarget(), {
    id,
    name,
    gatt: server,
    forget: async () => undefined,
  }) as BluetoothDevice;
}

it('connects to a remembered browser-permitted FTMS device by id', async () => {
  const device = createBluetoothDevice();
  Object.defineProperty(navigator, 'bluetooth', {
    value: {
      getDevices: async () => [device],
      requestDevice: async () => device,
    },
    configurable: true,
  });

  const connection = await connectRememberedFtmsDevice('device-1', () => undefined, () => undefined);

  expect(connection.deviceId).toBe('device-1');
  expect(connection.deviceName).toBe('Blue treadmill');
});

it('throws savedDeviceUnavailable when getDevices is unavailable', async () => {
  Object.defineProperty(navigator, 'bluetooth', {
    value: {
      requestDevice: async () => createBluetoothDevice(),
    },
    configurable: true,
  });

  await expect(connectRememberedFtmsDevice('device-1', () => undefined, () => undefined)).rejects.toMatchObject({
    code: 'savedDeviceUnavailable',
  });
});

it('throws savedDeviceNotFound when the remembered device is not permitted anymore', async () => {
  Object.defineProperty(navigator, 'bluetooth', {
    value: {
      getDevices: async () => [createBluetoothDevice('other-device')],
      requestDevice: async () => createBluetoothDevice('other-device'),
    },
    configurable: true,
  });

  await expect(connectRememberedFtmsDevice('device-1', () => undefined, () => undefined)).rejects.toMatchObject({
    code: 'savedDeviceNotFound',
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- src/features/bluetooth/ftms.test.ts`

Expected: FAIL because `connectRememberedFtmsDevice`, `deviceId`, and new error codes do not exist.

- [ ] **Step 3: Extend Web Bluetooth ambient types**

Update `src/vite-env.d.ts`:

```ts
interface Navigator {
  bluetooth?: {
    requestDevice(options: RequestDeviceOptions): Promise<BluetoothDevice>;
    getDevices?: () => Promise<BluetoothDevice[]>;
  };
}

type BluetoothDevice = EventTarget & {
  id: string;
  name?: string;
  gatt?: BluetoothRemoteGATTServer;
  forget?: () => Promise<void>;
};
```

- [ ] **Step 4: Refactor FTMS connection internals**

Update `src/features/bluetooth/ftms.ts`:

```ts
export type FtmsConnection = {
  deviceId: string | null;
  deviceName: string | null;
  startWorkout: () => Promise<void>;
  stopWorkout: () => Promise<void>;
  writeSpeed: (speedKph: number) => Promise<void>;
  disconnect: () => void;
};

export type FtmsConnectionErrorCode = 'bluetoothUnsupported' | 'connectFailed' | 'savedDeviceUnavailable' | 'savedDeviceNotFound';

async function connectFtmsDevice(
  device: BluetoothDevice,
  onData: (data: TreadmillData) => void,
  onDisconnect: () => void,
): Promise<FtmsConnection> {
  device.addEventListener('gattserverdisconnected', onDisconnect);

  const server = await device.gatt?.connect();
  if (!server) throw new FtmsConnectionError('connectFailed');

  const service = await server.getPrimaryService(FTMS_SERVICE);
  const treadmillData = await service.getCharacteristic(TREADMILL_DATA_CHARACTERISTIC);
  await treadmillData.startNotifications();

  treadmillData.addEventListener('characteristicvaluechanged', (event: Event) => {
    const value = (event as GattCharacteristicEvent).target.value;
    if (!value) return;
    onData(parseTreadmillData(value));
  });

  let controlPoint: BluetoothRemoteGATTCharacteristic | null = null;
  try {
    controlPoint = await service.getCharacteristic(FITNESS_MACHINE_CONTROL_POINT);
    await controlPoint.startNotifications();
    await controlPoint.writeValueWithoutResponse(new Uint8Array([OP_REQUEST_CONTROL]));
  } catch (err) {
    console.warn('[FTMS] control point not available or Request Control failed:', err);
    controlPoint = null;
  }

  async function writeControlPoint(data: Uint8Array): Promise<void> {
    if (!controlPoint) return;
    try {
      await controlPoint.writeValueWithoutResponse(data.buffer as ArrayBuffer);
    } catch (err) {
      console.warn('[FTMS] writeControlPoint failed:', err);
    }
  }

  return {
    deviceId: device.id || null,
    deviceName: device.name || null,
    startWorkout: () => writeControlPoint(new Uint8Array([OP_START_RESUME])),
    stopWorkout: () => writeControlPoint(new Uint8Array([OP_STOP_PAUSE, 0x01])),
    writeSpeed: async (speedKph: number) => {
      const buffer = new ArrayBuffer(3);
      const view = new DataView(buffer);
      view.setUint8(0, 0x02);
      view.setUint16(1, Math.round(speedKph * 100), true);
      await writeControlPoint(new Uint8Array(buffer));
    },
    disconnect: () => {
      treadmillData.stopNotifications().catch(() => {});
      controlPoint?.stopNotifications().catch(() => {});
      if (device.gatt?.connected) device.gatt.disconnect();
      device.removeEventListener('gattserverdisconnected', onDisconnect);
    },
  };
}

export async function connectRememberedFtmsDevice(
  deviceId: string,
  onData: (data: TreadmillData) => void,
  onDisconnect: () => void,
): Promise<FtmsConnection> {
  if (!navigator.bluetooth) throw new FtmsConnectionError('bluetoothUnsupported');
  if (!navigator.bluetooth.getDevices) throw new FtmsConnectionError('savedDeviceUnavailable');

  const devices = await navigator.bluetooth.getDevices();
  const device = devices.find((candidate) => candidate.id === deviceId);
  if (!device) throw new FtmsConnectionError('savedDeviceNotFound');

  return connectFtmsDevice(device, onData, onDisconnect);
}
```

Keep `connectFtms()` as the prompted flow, but make it call `connectFtmsDevice(device, onData, onDisconnect)`.

- [ ] **Step 5: Run FTMS tests**

Run: `npm run test -- src/features/bluetooth/ftms.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/vite-env.d.ts src/features/bluetooth/ftms.ts src/features/bluetooth/ftms.test.ts
git commit -m "Support remembered FTMS device connections"
```

---

### Task 3: Track Runtime Connection Status

**Files:**
- Modify: `src/features/live/live-store.ts`
- Modify: `src/features/live/live-store.test.ts`
- Modify: tests that reset live store state

- [ ] **Step 1: Write failing live-store status test**

Add to `src/features/live/live-store.test.ts`:

```ts
it('tracks Bluetooth connection status separately from workout persistence', () => {
  useLiveStore.getState().setConnectionStatus('connecting', null);
  expect(useLiveStore.getState().connectionStatus).toBe('connecting');

  useLiveStore.getState().setConnection(true, 'Blue treadmill');
  expect(useLiveStore.getState().connectionStatus).toBe('connected');
  expect(useLiveStore.getState().connectionError).toBeNull();

  useLiveStore.getState().setConnection(false, null);
  expect(useLiveStore.getState().connectionStatus).toBe('disconnected');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/features/live/live-store.test.ts`

Expected: FAIL because `connectionStatus`, `connectionError`, and `setConnectionStatus` do not exist.

- [ ] **Step 3: Add status fields to live store**

In `src/features/live/live-store.ts`:

```ts
import type { FtmsConnection, FtmsConnectionErrorCode, TreadmillData } from '../bluetooth/ftms';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

type LiveState = {
  connectionStatus: ConnectionStatus;
  connectionError: FtmsConnectionErrorCode | null;
  setConnectionStatus: (connectionStatus: ConnectionStatus, connectionError?: FtmsConnectionErrorCode | null) => void;
  // existing fields stay here
};
```

Initial state:

```ts
connectionStatus: 'disconnected',
connectionError: null,
```

Actions:

```ts
setConnection: (isConnected, deviceName) =>
  set({
    isConnected,
    deviceName,
    connectionStatus: isConnected ? 'connected' : 'disconnected',
    connectionError: null,
  }),
setConnectionStatus: (connectionStatus, connectionError = null) => set({ connectionStatus, connectionError }),
```

Add `connectionStatus: 'disconnected'` and `connectionError: null` to all test reset states that call `useLiveStore.setState(...)`.

- [ ] **Step 4: Run live-store tests**

Run: `npm run test -- src/features/live/live-store.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/live/live-store.ts src/features/live/live-store.test.ts src/**/*.test.tsx src/**/*.test.ts
git commit -m "Track treadmill connection status"
```

---

### Task 4: Add Shared Treadmill Connection Hook

**Files:**
- Create: `src/features/bluetooth/use-treadmill-connection.ts`
- Modify: `src/features/home/HomeScreen.test.tsx`
- Modify: `src/App.test.tsx`

- [ ] **Step 1: Write failing Home test for remembering manual connection**

In `src/features/home/HomeScreen.test.tsx`, update the mocked connection to include `deviceId`, then add:

```ts
it('remembers the treadmill after a successful manual connection', async () => {
  vi.mocked(connectFtms).mockResolvedValue({
    deviceId: 'device-1',
    deviceName: 'SW7130EA-0227',
    startWorkout: vi.fn(),
    stopWorkout: vi.fn(),
    writeSpeed: vi.fn(),
    disconnect: vi.fn(),
  });

  render(<RouterProvider router={router} />);

  await userEvent.click(screen.getByRole('button', { name: 'Подключить' }));

  expect(JSON.parse(window.localStorage.getItem('walking-app-remembered-treadmill') ?? '{}')).toMatchObject({
    id: 'device-1',
    name: 'SW7130EA-0227',
  });
});
```

- [ ] **Step 2: Write failing App startup autoconnect test**

In `src/App.test.tsx`, mock `connectRememberedFtmsDevice` and add:

```ts
it('auto-connects a remembered treadmill on startup without redirecting', async () => {
  await router.navigate({ to: '/stats' });
  window.localStorage.setItem(
    'walking-app-remembered-treadmill',
    JSON.stringify({ id: 'device-1', name: 'Blue treadmill', rememberedAt: '2026-06-15T10:00:00.000Z' }),
  );
  vi.mocked(connectRememberedFtmsDevice).mockResolvedValue({
    deviceId: 'device-1',
    deviceName: 'Blue treadmill',
    startWorkout: vi.fn(),
    stopWorkout: vi.fn(),
    writeSpeed: vi.fn(),
    disconnect: vi.fn(),
  });

  render(<RouterProvider router={router} />);

  expect(await screen.findByText('Статистика')).toBeVisible();
  expect(connectRememberedFtmsDevice).toHaveBeenCalledWith('device-1', expect.any(Function), expect.any(Function));
  expect(useLiveStore.getState().isConnected).toBe(true);
  expect(useLiveStore.getState().deviceName).toBe('Blue treadmill');
  expect(router.state.location.pathname).toBe('/stats');
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run:

```bash
npm run test -- src/features/home/HomeScreen.test.tsx src/App.test.tsx
```

Expected: FAIL because Home does not remember devices and App does not autoconnect.

- [ ] **Step 4: Implement `useTreadmillConnection` and `useAutoConnectTreadmill`**

Create `src/features/bluetooth/use-treadmill-connection.ts`:

```ts
import { useCallback, useEffect, useRef } from 'react';
import { useAppStore } from '../../app/app-store';
import { useT } from '../../i18n';
import { useLiveStore } from '../live/live-store';
import { FtmsConnectionError, connectFtms, connectRememberedFtmsDevice } from './ftms';
import { clearRememberedTreadmill, readRememberedTreadmill, rememberTreadmill } from './remembered-treadmill-storage';

function useConnectionCallbacks() {
  const t = useT();
  const showToast = useAppStore((state) => state.showToast);
  const setConnection = useLiveStore((state) => state.setConnection);
  const setConnectionStatus = useLiveStore((state) => state.setConnectionStatus);
  const setFtmsConnection = useLiveStore((state) => state.setFtmsConnection);
  const setTreadmillData = useLiveStore((state) => state.setTreadmillData);

  const onData = useCallback((data) => setTreadmillData(data), [setTreadmillData]);
  const onDisconnect = useCallback(() => {
    setFtmsConnection(null);
    setConnection(false, null);
    showToast(t.home.disconnectedToast);
  }, [setConnection, setFtmsConnection, showToast, t]);

  return { onData, onDisconnect, setConnection, setConnectionStatus, setFtmsConnection, showToast, t };
}

export function useTreadmillConnection() {
  const { onData, onDisconnect, setConnection, setConnectionStatus, setFtmsConnection, showToast, t } = useConnectionCallbacks();
  const isConnected = useLiveStore((state) => state.isConnected);
  const ftmsConnection = useLiveStore((state) => state.ftmsConnection);

  const connectManually = useCallback(async () => {
    setConnectionStatus('connecting');
    try {
      const connection = await connectFtms(onData, onDisconnect);
      setFtmsConnection(connection);
      setConnection(true, connection.deviceName);
      if (connection.deviceId) rememberTreadmill({ id: connection.deviceId, name: connection.deviceName });
      showToast(t.home.connected);
    } catch (error) {
      setConnection(false, null);
      if (error instanceof FtmsConnectionError) {
        setConnectionStatus('error', error.code);
        showToast(t.home[error.code] ?? t.home.connectFailed);
        return;
      }
      setConnectionStatus('error', 'connectFailed');
      showToast(t.home.connectFailed);
    }
  }, [onData, onDisconnect, setConnection, setConnectionStatus, setFtmsConnection, showToast, t]);

  const disconnect = useCallback(() => {
    ftmsConnection?.disconnect();
    setFtmsConnection(null);
    setConnection(false, null);
    showToast(t.home.disconnectedToast);
  }, [ftmsConnection, setConnection, setFtmsConnection, showToast, t]);

  return {
    isConnected,
    connectManually,
    disconnect,
    toggleConnection: isConnected ? disconnect : connectManually,
  };
}

export function useAutoConnectTreadmill() {
  const attempted = useRef(false);
  const { onData, onDisconnect, setConnection, setConnectionStatus, setFtmsConnection } = useConnectionCallbacks();

  useEffect(() => {
    if (attempted.current) return;
    attempted.current = true;

    const remembered = readRememberedTreadmill();
    if (!remembered) return;

    setConnectionStatus('connecting');
    void connectRememberedFtmsDevice(remembered.id, onData, onDisconnect)
      .then((connection) => {
        setFtmsConnection(connection);
        setConnection(true, connection.deviceName ?? remembered.name);
      })
      .catch((error) => {
        if (error instanceof FtmsConnectionError) {
          setConnectionStatus('error', error.code);
          return;
        }
        setConnectionStatus('error', 'connectFailed');
      });
  }, [onData, onDisconnect, setConnection, setConnectionStatus, setFtmsConnection]);
}

export async function forgetRememberedTreadmill(): Promise<void> {
  const remembered = readRememberedTreadmill();
  clearRememberedTreadmill();
  if (!remembered || !navigator.bluetooth?.getDevices) return;

  const devices = await navigator.bluetooth.getDevices();
  const device = devices.find((candidate) => candidate.id === remembered.id);
  await device?.forget?.();
}
```

Use explicit parameter types for `data` when implementing so TypeScript remains strict.

- [ ] **Step 5: Wire App and Home**

In `src/App.tsx`, import and call:

```ts
import { useAutoConnectTreadmill } from './features/bluetooth/use-treadmill-connection';

export function App() {
  useAutoConnectTreadmill();
  // existing code remains
}
```

In `src/features/home/HomeScreen.tsx`, remove local `connectFtms` imports and local `toggleConnect()`. Use:

```ts
const { toggleConnection } = useTreadmillConnection();
```

Set the connect/disconnect button handler to:

```tsx
onClick={() => void toggleConnection()}
```

- [ ] **Step 6: Run focused tests**

Run:

```bash
npm run test -- src/features/home/HomeScreen.test.tsx src/App.test.tsx
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/features/bluetooth/use-treadmill-connection.ts src/App.tsx src/App.test.tsx src/features/home/HomeScreen.tsx src/features/home/HomeScreen.test.tsx
git commit -m "Auto-connect remembered treadmill on startup"
```

---

### Task 5: Add Connection Status UI

**Files:**
- Create: `src/features/bluetooth/TreadmillConnectionStatus.tsx`
- Modify: `src/features/home/HomeScreen.tsx`
- Modify: `src/features/live/LiveScreen.tsx`
- Modify: `src/i18n/ru.ts`
- Modify: `src/i18n/uk.ts`
- Modify: `src/i18n/en.ts`
- Add or modify component tests near Home and Live

- [ ] **Step 1: Add failing status UI tests**

In `src/features/home/HomeScreen.test.tsx`:

```ts
it('shows connection status while auto-connect is in progress', () => {
  useLiveStore.getState().setConnectionStatus('connecting');

  render(<RouterProvider router={router} />);

  expect(screen.getByText('Подключение...')).toBeVisible();
});
```

In `src/features/live/LiveScreen.test.tsx`:

```ts
it('shows disconnected treadmill status on the live screen', () => {
  useLiveStore.setState({
    startedDate: '2026-06-15',
    startedAt: '10:00',
    seconds: 65,
    km: 0.1,
    kcal: 5,
    connectionStatus: 'disconnected',
    isConnected: false,
    deviceName: null,
  });

  render(<RouterProvider router={router} />);

  expect(screen.getByText('Не подключено')).toBeVisible();
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
npm run test -- src/features/home/HomeScreen.test.tsx src/features/live/LiveScreen.test.tsx
```

Expected: FAIL because the status labels/component do not exist.

- [ ] **Step 3: Add i18n strings**

Add under a new `bluetooth` key in `en.ts`, then mirror in `ru.ts` and `uk.ts`:

```ts
bluetooth: {
  connected: 'Connected',
  connecting: 'Connecting...',
  disconnected: 'Not connected',
  error: 'Connection failed',
  savedDeviceUnavailable: 'Auto-connect is not supported in this browser',
  savedDeviceNotFound: 'Saved treadmill permission was removed',
},
```

Russian:

```ts
bluetooth: {
  connected: 'Подключено',
  connecting: 'Подключение...',
  disconnected: 'Не подключено',
  error: 'Ошибка подключения',
  savedDeviceUnavailable: 'Автоподключение не поддерживается в этом браузере',
  savedDeviceNotFound: 'Доступ к сохранённой дорожке удалён',
},
```

Ukrainian:

```ts
bluetooth: {
  connected: 'Підключено',
  connecting: 'Підключення...',
  disconnected: 'Не підключено',
  error: 'Помилка підключення',
  savedDeviceUnavailable: 'Автопідключення не підтримується в цьому браузері',
  savedDeviceNotFound: 'Доступ до збереженої доріжки видалено',
},
```

- [ ] **Step 4: Create status component**

Create `src/features/bluetooth/TreadmillConnectionStatus.tsx`:

```tsx
import { Bluetooth, BluetoothConnected } from 'lucide-react';
import { useLiveStore } from '../live/live-store';
import { useT } from '../../i18n';

export function TreadmillConnectionStatus({ compact = false }: { compact?: boolean }) {
  const t = useT();
  const connectionStatus = useLiveStore((state) => state.connectionStatus);
  const connectionError = useLiveStore((state) => state.connectionError);
  const deviceName = useLiveStore((state) => state.deviceName);

  const isConnected = connectionStatus === 'connected';
  const Icon = isConnected ? BluetoothConnected : Bluetooth;
  const label =
    connectionStatus === 'connected'
      ? (deviceName ?? t.bluetooth.connected)
      : connectionStatus === 'connecting'
        ? t.bluetooth.connecting
        : connectionStatus === 'error' && connectionError
          ? (t.bluetooth[connectionError] ?? t.bluetooth.error)
          : t.bluetooth.disconnected;

  return (
    <div className={`flex min-w-0 items-center gap-2 ${compact ? 'text-xs' : 'text-sm'} font-semibold`}>
      <span className={`h-2.5 w-2.5 rounded-full ${isConnected ? 'bg-green-500 shadow-[0_0_8px_#30D158]' : 'bg-red-500'}`} />
      <Icon size={compact ? 14 : 18} className={isConnected ? 'text-green-400' : 'text-neutral-500'} aria-hidden="true" />
      <span className="truncate">{label}</span>
    </div>
  );
}
```

- [ ] **Step 5: Use status on Home and Live**

In `HomeScreen`, replace the hand-built status row content with:

```tsx
<TreadmillConnectionStatus />
```

In `LiveScreen`, change the header center block to include:

```tsx
<TreadmillConnectionStatus compact />
```

Keep the header compact and do not add a second card.

- [ ] **Step 6: Run status UI tests**

Run:

```bash
npm run test -- src/features/home/HomeScreen.test.tsx src/features/live/LiveScreen.test.tsx
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/features/bluetooth/TreadmillConnectionStatus.tsx src/features/home/HomeScreen.tsx src/features/live/LiveScreen.tsx src/features/home/HomeScreen.test.tsx src/features/live/LiveScreen.test.tsx src/i18n/en.ts src/i18n/ru.ts src/i18n/uk.ts
git commit -m "Show treadmill connection status"
```

---

### Task 6: Add Settings Screen And Forget Action

**Files:**
- Create: `src/features/settings/SettingsScreen.tsx`
- Create: `src/features/settings/SettingsScreen.test.tsx`
- Modify: `src/app/app-store.ts`
- Modify: `src/app/router.tsx`
- Modify: `src/ui/TabBar.tsx`
- Modify: `src/i18n/ru.ts`
- Modify: `src/i18n/uk.ts`
- Modify: `src/i18n/en.ts`

- [ ] **Step 1: Write failing Settings screen tests**

Create `src/features/settings/SettingsScreen.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider } from '@tanstack/react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { router } from '../../app/router';
import { useAppStore } from '../../app/app-store';
import { useLiveStore } from '../live/live-store';

describe('SettingsScreen', () => {
  beforeEach(async () => {
    await router.navigate({ to: '/settings' });
    window.localStorage.clear();
    useAppStore.setState({
      screen: 'settings',
      statsPeriod: 'week',
      toast: { message: '', visible: false },
      locale: 'ru',
    });
    useLiveStore.setState({
      isConnected: false,
      deviceName: null,
      isPaused: false,
      startedDate: null,
      startedAt: null,
      ftmsConnection: null,
      seconds: 0,
      speedKph: 0,
      maxSpeed: 0,
      km: 0,
      kcal: 0,
      steps: 0,
      inclinePercent: 0,
      hasStartedMoving: false,
      restoredFromStorage: false,
      autoStopRequested: false,
      connectionStatus: 'disconnected',
      connectionError: null,
    });
  });

  it('shows saved treadmill metadata', async () => {
    window.localStorage.setItem(
      'walking-app-remembered-treadmill',
      JSON.stringify({ id: 'device-1', name: 'Blue treadmill', rememberedAt: '2026-06-15T10:00:00.000Z' }),
    );

    render(<RouterProvider router={router} />);

    expect(await screen.findByText('Настройки')).toBeVisible();
    expect(screen.getByText('Blue treadmill')).toBeVisible();
  });

  it('forgets the saved treadmill', async () => {
    const forget = vi.fn().mockResolvedValue(undefined);
    window.localStorage.setItem(
      'walking-app-remembered-treadmill',
      JSON.stringify({ id: 'device-1', name: 'Blue treadmill', rememberedAt: '2026-06-15T10:00:00.000Z' }),
    );
    Object.defineProperty(navigator, 'bluetooth', {
      value: {
        getDevices: async () => [{ id: 'device-1', name: 'Blue treadmill', forget }],
      },
      configurable: true,
    });

    render(<RouterProvider router={router} />);
    await userEvent.click(await screen.findByRole('button', { name: 'Удалить сохранённую дорожку' }));

    expect(window.localStorage.getItem('walking-app-remembered-treadmill')).toBeNull();
    expect(forget).toHaveBeenCalled();
    expect(screen.getByText('Сохранённой дорожки нет')).toBeVisible();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/features/settings/SettingsScreen.test.tsx`

Expected: FAIL because `/settings` and `SettingsScreen` do not exist.

- [ ] **Step 3: Add settings translations**

Add to all locale files:

```ts
settings: {
  title: 'Settings',
  savedTreadmill: 'Saved treadmill',
  noSavedTreadmill: 'No saved treadmill',
  forgetSavedTreadmill: 'Forget saved treadmill',
  forgetConfirm: 'Forget saved treadmill?',
  forgotten: 'Saved treadmill removed',
  currentStatus: 'Connection status',
},
```

Use Russian:

```ts
settings: {
  title: 'Настройки',
  savedTreadmill: 'Сохранённая дорожка',
  noSavedTreadmill: 'Сохранённой дорожки нет',
  forgetSavedTreadmill: 'Удалить сохранённую дорожку',
  forgetConfirm: 'Удалить сохранённую дорожку?',
  forgotten: 'Сохранённая дорожка удалена',
  currentStatus: 'Статус подключения',
},
```

Use Ukrainian:

```ts
settings: {
  title: 'Налаштування',
  savedTreadmill: 'Збережена доріжка',
  noSavedTreadmill: 'Збереженої доріжки немає',
  forgetSavedTreadmill: 'Видалити збережену доріжку',
  forgetConfirm: 'Видалити збережену доріжку?',
  forgotten: 'Збережену доріжку видалено',
  currentStatus: 'Статус підключення',
},
```

Add `nav.settings` in all locale files.

- [ ] **Step 4: Add route and tab**

In `src/app/app-store.ts`:

```ts
export type ScreenName = 'home' | 'stats' | 'history' | 'detail' | 'live' | 'settings';
```

In `src/App.tsx`, update `screenFromPath`:

```ts
if (pathname === '/settings') return 'settings';
```

In `src/app/router.tsx`, add:

```tsx
import { SettingsScreen } from '../features/settings/SettingsScreen';

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings',
  component: SettingsScreen,
});

const routeTree = rootRoute.addChildren([homeRoute, liveRoute, statsRoute, historyRoute, settingsRoute, workoutDetailRoute]);
```

In `src/ui/TabBar.tsx`, add:

```tsx
import { BarChart3, History, Home, Settings } from 'lucide-react';

{ screen: 'settings', label: t.nav.settings, Icon: Settings, path: '/settings' },
```

- [ ] **Step 5: Implement Settings screen**

Create `src/features/settings/SettingsScreen.tsx`:

```tsx
import { useState } from 'react';
import { useAppStore } from '../../app/app-store';
import { useT } from '../../i18n';
import { TreadmillConnectionStatus } from '../bluetooth/TreadmillConnectionStatus';
import { forgetRememberedTreadmill } from '../bluetooth/use-treadmill-connection';
import { readRememberedTreadmill } from '../bluetooth/remembered-treadmill-storage';

export function SettingsScreen() {
  const t = useT();
  const showToast = useAppStore((state) => state.showToast);
  const [remembered, setRemembered] = useState(() => readRememberedTreadmill());

  async function handleForget() {
    if (!window.confirm(t.settings.forgetConfirm)) return;

    await forgetRememberedTreadmill();
    setRemembered(null);
    showToast(t.settings.forgotten);
  }

  return (
    <main className="min-h-dvh pb-24">
      <header className="px-4 pt-14">
        <h1 className="text-[28px] font-extrabold tracking-normal">{t.settings.title}</h1>
      </header>

      <section className="mx-4 mt-4 rounded-[18px] bg-neutral-900 p-4">
        <div className="text-xs font-bold uppercase text-neutral-500">{t.settings.currentStatus}</div>
        <div className="mt-3">
          <TreadmillConnectionStatus />
        </div>
      </section>

      <section className="mx-4 mt-3 rounded-[18px] bg-neutral-900 p-4">
        <div className="text-xs font-bold uppercase text-neutral-500">{t.settings.savedTreadmill}</div>
        <div className="mt-3 text-base font-bold">{remembered?.name ?? t.settings.noSavedTreadmill}</div>
        {remembered ? (
          <button
            type="button"
            className="mt-4 w-full rounded-[14px] border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-400"
            onClick={() => void handleForget()}
          >
            {t.settings.forgetSavedTreadmill}
          </button>
        ) : null}
      </section>
    </main>
  );
}
```

- [ ] **Step 6: Run Settings tests**

Run:

```bash
npm run test -- src/features/settings/SettingsScreen.test.tsx
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/features/settings/SettingsScreen.tsx src/features/settings/SettingsScreen.test.tsx src/app/app-store.ts src/App.tsx src/app/router.tsx src/ui/TabBar.tsx src/i18n/en.ts src/i18n/ru.ts src/i18n/uk.ts
git commit -m "Add treadmill settings screen"
```

---

### Task 7: Update End-To-End Bluetooth Smoke Test

**Files:**
- Modify: `tests/workout-flow.spec.ts`

- [ ] **Step 1: Update Playwright Bluetooth mock**

In the existing `page.addInitScript`, add `id` and `forget()` to `device`, and add `getDevices()`:

```ts
const device = {
  id: 'test-treadmill',
  name: 'Test treadmill',
  addEventListener: () => undefined,
  removeEventListener: () => undefined,
  forget: async () => undefined,
  gatt: {
    connected: true,
    connect: async () => server,
    disconnect: () => undefined,
  },
};

Object.defineProperty(navigator, 'bluetooth', {
  value: {
    requestDevice: async () => device,
    getDevices: async () => [device],
  },
  configurable: true,
});
```

- [ ] **Step 2: Add reload autoconnect assertions**

After the manual connect assertion:

```ts
await expect(page.getByText('Test treadmill')).toBeVisible();
await page.reload();
await expect(page.getByText('Test treadmill')).toBeVisible();
await expect(page.getByRole('button', { name: 'GO' })).toBeEnabled();
```

- [ ] **Step 3: Add settings forget smoke assertions**

After history/detail assertions or in a separate smoke test:

```ts
await page.getByRole('button', { name: 'Настройки' }).click();
await expect(page.getByText('Test treadmill')).toBeVisible();
page.once('dialog', (dialog) => dialog.accept());
await page.getByRole('button', { name: 'Удалить сохранённую дорожку' }).click();
await expect(page.getByText('Сохранённой дорожки нет')).toBeVisible();
```

- [ ] **Step 4: Run E2E**

Run: `npm run test:e2e`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/workout-flow.spec.ts
git commit -m "Cover remembered treadmill autoconnect e2e"
```

---

### Task 8: Full Verification

**Files:**
- No new files unless verification exposes failures.

- [ ] **Step 1: Run unit tests**

Run: `npm run test`

Expected: PASS.

- [ ] **Step 2: Run lint**

Run: `npm run lint`

Expected: PASS.

- [ ] **Step 3: Run production build**

Run: `npm run build`

Expected: PASS.

- [ ] **Step 4: Run E2E**

Run: `npm run test:e2e`

Expected: PASS because this touches Bluetooth behavior, routing, and live workout recovery.

- [ ] **Step 5: Commit final fixes if verification required changes**

```bash
git add src tests
git commit -m "Stabilize remembered treadmill autoconnect"
```

Skip this commit if Task 8 did not require code changes.

---

## Self-Review

- Spec coverage: remembered first connection, startup autoconnect, settings deletion, and visible status are each mapped to tasks.
- Placeholder scan: no `TBD`, `TODO`, or unspecified test steps.
- Type consistency: `deviceId`, `connectionStatus`, `connectionError`, remembered `{ id, name, rememberedAt }`, and new FTMS error codes are consistent across tasks.
- Scope check: the plan does not change workout persistence, active workout localStorage, Dexie migration, or service worker behavior.
