import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../db/app-db';
import { useLiveStore } from './live-store';

describe('live-store', () => {
  beforeEach(async () => {
    await db.workouts.clear();
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
      autoStopRequested: false,
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

    expect(useLiveStore.getState().autoStopRequested).toBe(true);
  });
});
