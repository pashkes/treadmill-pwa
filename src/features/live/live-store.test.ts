import { beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../../db/app-db';
import { useLiveStore } from './live-store';

describe('live-store', () => {
  beforeEach(async () => {
    await db.workouts.clear();
    useLiveStore.setState({
      isConnected: false,
      deviceName: null,
      connectionStatus: 'disconnected',
      connectionError: null,
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
      autoStopRequested: false,
      restoredFromStorage: false,
    });
    window.localStorage.clear();
  });

  it('saves workouts shorter than thirty seconds when they have elapsed time', async () => {
    useLiveStore.getState().setConnection(true, 'Blue treadmill');
    useLiveStore.getState().start();
    useLiveStore.getState().setTreadmillData({ speedKph: 1, elapsedSeconds: 1 });

    const saved = await useLiveStore.getState().stopAndSave();

    expect(saved?.seconds).toBe(1);
    expect(await db.workouts.count()).toBe(1);
  });

  it('saves workouts with recorded metrics even when elapsed time was not reported', async () => {
    useLiveStore.setState({
      startedDate: '2026-06-14',
      startedAt: '12:00',
      seconds: 0,
      km: 0.4,
      kcal: 38,
      steps: 512,
      maxSpeed: 6,
      hasStartedMoving: true,
    });

    const saved = await useLiveStore.getState().stopAndSave();

    expect(saved?.seconds).toBe(240);
    expect(saved?.min).toBe(4);
    expect(await db.workouts.count()).toBe(1);
  });

  it('ends an empty active workout without keeping live state stuck', async () => {
    useLiveStore.setState({
      isConnected: true,
      deviceName: 'Blue treadmill',
      startedDate: '2026-06-14',
      startedAt: '12:00',
      seconds: 0,
      speedKph: 0,
      maxSpeed: 0,
      km: 0,
      kcal: 0,
      steps: 0,
      hasStartedMoving: false,
    });

    const saved = await useLiveStore.getState().stopAndSave();

    expect(saved).toBeNull();
    expect(await db.workouts.count()).toBe(0);
    expect(useLiveStore.getState().startedAt).toBeNull();
    expect(useLiveStore.getState().startedDate).toBeNull();
    expect(useLiveStore.getState().hasStartedMoving).toBe(false);
  });

  it('does not start a workout before the treadmill is connected', () => {
    const started = useLiveStore.getState().start();

    expect(started).toBe(false);
    expect(useLiveStore.getState().startedAt).toBeNull();
    expect(useLiveStore.getState().seconds).toBe(0);
  });

  it('starts a workout when the treadmill is connected', () => {
    useLiveStore.getState().setConnection(true, 'Blue treadmill');

    const started = useLiveStore.getState().start();

    expect(started).toBe(true);
    expect(useLiveStore.getState().startedAt).not.toBeNull();
  });

  it('tracks Bluetooth connection status separately from workout persistence', () => {
    useLiveStore.getState().setConnectionStatus('connecting', null);
    expect(useLiveStore.getState().connectionStatus).toBe('connecting');

    useLiveStore.getState().setConnection(true, 'Blue treadmill');
    expect(useLiveStore.getState().connectionStatus).toBe('connected');
    expect(useLiveStore.getState().connectionError).toBeNull();

    useLiveStore.getState().setConnectionStatus('error', 'connectFailed');
    expect(useLiveStore.getState().connectionStatus).toBe('error');
    expect(useLiveStore.getState().connectionError).toBe('connectFailed');
    expect(useLiveStore.getState().isConnected).toBe(false);

    useLiveStore.getState().setConnection(false, null);
    expect(useLiveStore.getState().connectionStatus).toBe('disconnected');
    expect(useLiveStore.getState().connectionError).toBeNull();
  });

  it('continues a restored active workout without resetting metrics or sending start', () => {
    const startWorkout = vi.fn().mockResolvedValue(undefined);
    useLiveStore.setState({
      isConnected: true,
      deviceName: 'Blue treadmill',
      startedDate: '2026-06-15',
      startedAt: '12:00',
      ftmsConnection: {
        deviceId: 'blue-treadmill',
        deviceName: 'Blue treadmill',
        startWorkout,
        stopWorkout: vi.fn().mockResolvedValue(undefined),
        writeSpeed: vi.fn().mockResolvedValue(undefined),
        disconnect: vi.fn(),
      },
      seconds: 278,
      speedKph: 6,
      maxSpeed: 6,
      km: 0.4,
      kcal: 38,
      steps: 512,
      inclinePercent: 2,
      hasStartedMoving: true,
    });

    const started = useLiveStore.getState().start();

    expect(started).toBe(true);
    expect(startWorkout).not.toHaveBeenCalled();
    expect(useLiveStore.getState().seconds).toBe(278);
    expect(useLiveStore.getState().km).toBe(0.4);
    expect(useLiveStore.getState().kcal).toBe(38);
    expect(useLiveStore.getState().steps).toBe(512);
    expect(useLiveStore.getState().startedAt).toBe('12:00');
  });

  it('does not simulate live metrics on timer ticks', () => {
    useLiveStore.getState().setConnection(true, 'Blue treadmill');
    useLiveStore.getState().setTreadmillData({ speedKph: 6 });
    useLiveStore.getState().start();

    useLiveStore.getState().tick();

    expect(useLiveStore.getState().seconds).toBe(0);
    expect(useLiveStore.getState().km).toBe(0);
    expect(useLiveStore.getState().kcal).toBe(0);
    expect(useLiveStore.getState().steps).toBe(0);
  });

  it('advances elapsed time smoothly on timer ticks after the belt starts moving', () => {
    useLiveStore.getState().setConnection(true, 'Blue treadmill');
    useLiveStore.getState().start();
    useLiveStore.getState().setTreadmillData({ speedKph: 6, elapsedSeconds: 10 });
    const km = useLiveStore.getState().km;
    const steps = useLiveStore.getState().steps;

    useLiveStore.getState().tick();

    expect(useLiveStore.getState().seconds).toBe(11);
    expect(useLiveStore.getState().km).toBeCloseTo(km + 6 / 3600, 4);
    expect(useLiveStore.getState().steps).toBeGreaterThan(steps);
    expect(useLiveStore.getState().kcal).toBe(0);
  });

  it('does not advance elapsed time while paused', () => {
    useLiveStore.getState().setConnection(true, 'Blue treadmill');
    useLiveStore.getState().start();
    useLiveStore.getState().setTreadmillData({ speedKph: 6, elapsedSeconds: 10 });
    useLiveStore.getState().setTreadmillData({ speedKph: 0, elapsedSeconds: 11 });

    useLiveStore.getState().tick();

    expect(useLiveStore.getState().seconds).toBe(11);
  });

  it('saves workout date from start time instead of stop time', async () => {
    useLiveStore.setState({
      startedDate: '2026-06-13',
      startedAt: '23:59',
      seconds: 60,
      km: 0.1,
      kcal: 7,
      steps: 120,
      maxSpeed: 6,
    });

    const saved = await useLiveStore.getState().stopAndSave();

    expect(saved?.date).toBe('2026-06-13');
    expect(saved?.time).toBe('23:59');
  });

  it('uses treadmill-reported metrics when available', () => {
    useLiveStore.getState().setTreadmillData({ speedKph: 6, distanceKm: 1.25, kcal: 80, elapsedSeconds: 120, inclinePercent: 3 });

    expect(useLiveStore.getState().speedKph).toBe(6);
    expect(useLiveStore.getState().km).toBe(1.25);
    expect(useLiveStore.getState().kcal).toBe(80);
    expect(useLiveStore.getState().seconds).toBe(120);
    expect(useLiveStore.getState().steps).toBe(1600);
    expect(useLiveStore.getState().inclinePercent).toBe(3);
  });

  it('keeps previous values when a treadmill packet omits fields', () => {
    useLiveStore.getState().setTreadmillData({ speedKph: 6, distanceKm: 1.25, kcal: 80, elapsedSeconds: 120 });

    useLiveStore.getState().setTreadmillData({});

    expect(useLiveStore.getState().speedKph).toBe(6);
    expect(useLiveStore.getState().km).toBe(1.25);
    expect(useLiveStore.getState().kcal).toBe(80);
    expect(useLiveStore.getState().seconds).toBe(120);
  });

  it('persists active workout metrics for refresh recovery without persisting bluetooth connection', () => {
    useLiveStore.getState().setConnection(true, 'Blue treadmill');
    useLiveStore.getState().start();
    useLiveStore.getState().setTreadmillData({ speedKph: 6, distanceKm: 0.4, kcal: 38, elapsedSeconds: 278, inclinePercent: 2 });

    useLiveStore.setState({
      isConnected: false,
      deviceName: null,
      connectionStatus: 'disconnected',
      connectionError: null,
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
      autoStopRequested: false,
      restoredFromStorage: false,
    });

    const restored = useLiveStore.getState().restoreActiveWorkout();

    expect(restored).toBe(true);
    expect(useLiveStore.getState().isConnected).toBe(false);
    expect(useLiveStore.getState().deviceName).toBe('Blue treadmill');
    expect(useLiveStore.getState().seconds).toBe(278);
    expect(useLiveStore.getState().km).toBe(0.4);
    expect(useLiveStore.getState().kcal).toBe(38);
    expect(useLiveStore.getState().inclinePercent).toBe(2);
  });

  it('does not overwrite restored metrics with a stopped reset packet after reconnect', () => {
    useLiveStore.setState({
      isConnected: true,
      deviceName: 'Blue treadmill',
      startedDate: '2026-06-15',
      startedAt: '12:00',
      seconds: 1398,
      speedKph: 6,
      maxSpeed: 6,
      km: 2.3,
      kcal: 114,
      steps: 2947,
      inclinePercent: 2,
      hasStartedMoving: true,
      restoredFromStorage: true,
    });

    useLiveStore.getState().setTreadmillData({
      speedKph: 0,
      distanceKm: 0,
      kcal: 0,
      elapsedSeconds: 0,
      inclinePercent: 0,
    });

    expect(useLiveStore.getState().seconds).toBe(1398);
    expect(useLiveStore.getState().km).toBe(2.3);
    expect(useLiveStore.getState().kcal).toBe(114);
    expect(useLiveStore.getState().steps).toBe(2947);
    expect(useLiveStore.getState().inclinePercent).toBe(2);
    expect(useLiveStore.getState().speedKph).toBe(0);
    expect(useLiveStore.getState().isPaused).toBe(true);
  });

  it('accumulates distance from speed when the treadmill always reports distanceKm=0', () => {
    useLiveStore.getState().setConnection(true, 'Blue treadmill');
    useLiveStore.getState().start();
    // Treadmill sends distanceKm=0 (common firmware behaviour), elapsedSeconds counts up
    useLiveStore.getState().setTreadmillData({ speedKph: 3, distanceKm: 0, elapsedSeconds: 1 });
    useLiveStore.getState().setTreadmillData({ speedKph: 3, distanceKm: 0, elapsedSeconds: 2 });
    useLiveStore.getState().setTreadmillData({ speedKph: 3, distanceKm: 0, elapsedSeconds: 3 });

    // 3 seconds at 3 km/h = 3 * (3/3600) ≈ 0.0025 km
    expect(useLiveStore.getState().km).toBeCloseTo(0.0025, 4);
    expect(useLiveStore.getState().steps).toBeGreaterThan(0);
  });

  it('requests automatic stop after the treadmill reports zero speed following movement', () => {
    useLiveStore.getState().setConnection(true, 'Blue treadmill');
    useLiveStore.getState().start();

    useLiveStore.getState().setTreadmillData({ speedKph: 6, elapsedSeconds: 20 });
    useLiveStore.getState().setTreadmillData({ speedKph: 0, elapsedSeconds: 21 });

    expect(useLiveStore.getState().isPaused).toBe(true);
    expect(useLiveStore.getState().autoStopRequested).toBe(false);
  });

  it('resumes from treadmill data after a hardware pause', () => {
    useLiveStore.getState().setConnection(true, 'Blue treadmill');
    useLiveStore.getState().start();

    useLiveStore.getState().setTreadmillData({ speedKph: 6, elapsedSeconds: 20 });
    useLiveStore.getState().setTreadmillData({ speedKph: 0, elapsedSeconds: 21 });
    useLiveStore.getState().setTreadmillData({ speedKph: 6, elapsedSeconds: 22 });

    expect(useLiveStore.getState().isPaused).toBe(false);
    expect(useLiveStore.getState().seconds).toBe(22);
  });

  it('does not move elapsed time backwards from non-monotonic treadmill packets', () => {
    useLiveStore.getState().setConnection(true, 'Blue treadmill');
    useLiveStore.getState().start();

    useLiveStore.getState().setTreadmillData({ speedKph: 6, elapsedSeconds: 65 });
    useLiveStore.getState().setTreadmillData({ speedKph: 6, elapsedSeconds: 64 });

    expect(useLiveStore.getState().seconds).toBe(65);
  });

  it('does not add estimated distance from zero-speed pause packets', () => {
    useLiveStore.getState().setConnection(true, 'Blue treadmill');
    useLiveStore.getState().start();

    useLiveStore.getState().setTreadmillData({ speedKph: 6, distanceKm: 0, elapsedSeconds: 20 });
    const runningKm = useLiveStore.getState().km;
    useLiveStore.getState().setTreadmillData({ speedKph: 0, distanceKm: 0, elapsedSeconds: 40 });

    expect(useLiveStore.getState().km).toBe(runningKm);
  });

  it('saves a restored disconnected active workout and clears recovery storage', async () => {
    useLiveStore.getState().setConnection(true, 'Blue treadmill');
    useLiveStore.getState().start();
    useLiveStore.getState().setTreadmillData({ speedKph: 6, distanceKm: 0.4, kcal: 38, elapsedSeconds: 278 });

    useLiveStore.setState({
      isConnected: false,
      deviceName: null,
      connectionStatus: 'disconnected',
      connectionError: null,
      startedDate: null,
      startedAt: null,
      seconds: 0,
      speedKph: 0,
      maxSpeed: 0,
      km: 0,
      kcal: 0,
      steps: 0,
      inclinePercent: 0,
      hasStartedMoving: false,
      autoStopRequested: false,
      restoredFromStorage: false,
    });
    expect(useLiveStore.getState().restoreActiveWorkout()).toBe(true);

    const saved = await useLiveStore.getState().stopAndSave();

    expect(saved?.seconds).toBe(278);
    expect(await db.workouts.count()).toBe(1);
    expect(window.localStorage.getItem('walking-app-active-workout')).toBeNull();
  });
});
